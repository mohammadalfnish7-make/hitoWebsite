-- ============================================================
-- Hito Health Tourism — Platform Core Schema
-- Migration: 001_platform_core_schema.sql
-- Run as: hito_admin (DDL user)
-- PostgreSQL 16+ (gen_random_uuid() is built-in, no extension needed)
-- ============================================================

-- Enable pg_trgm for search (GIN trigram indexes)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================
-- 1. Locales (dynamic languages)
-- ============================================================
CREATE TABLE IF NOT EXISTS locales (
  code VARCHAR(5) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  is_rtl BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  "order" INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 2. Translations (UI strings per locale)
-- ============================================================
CREATE TABLE IF NOT EXISTS translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(255) NOT NULL,
  locale VARCHAR(5) NOT NULL REFERENCES locales(code) ON DELETE CASCADE,
  value TEXT NOT NULL,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(key, locale)
);

-- Composite index for sub-50ms lookups at 10K+ keys
CREATE INDEX IF NOT EXISTS idx_translations_locale_key ON translations(locale, key);

-- ============================================================
-- 3. Services
-- ============================================================
CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(100) UNIQUE NOT NULL,
  name_en VARCHAR(255) NOT NULL,
  name_ar VARCHAR(255),
  description TEXT,
  meta_title JSONB,
  meta_description JSONB,
  chatwoot_website_token VARCHAR(100),
  "order" INT DEFAULT 0,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigram index for search
CREATE INDEX IF NOT EXISTS idx_services_name_en_trgm ON services USING GIN (name_en gin_trgm_ops);

-- ============================================================
-- 4. Sub-Services
-- ============================================================
CREATE TABLE IF NOT EXISTS sub_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  slug VARCHAR(100) NOT NULL,
  name_en VARCHAR(255) NOT NULL,
  name_ar VARCHAR(255),
  description TEXT,
  meta_title JSONB,
  meta_description JSONB,
  chatwoot_website_token VARCHAR(100),
  main_image_url TEXT,
  avg_cost_uae NUMERIC(12,2),
  avg_cost_home_country NUMERIC(12,2),
  cost_uae_currency VARCHAR(3) DEFAULT 'AED',
  cost_home_currency VARCHAR(3),
  cost_notes JSONB,
  cost_last_updated_at TIMESTAMPTZ,
  "order" INT DEFAULT 0,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(service_id, slug)
);

-- Trigram index for search
CREATE INDEX IF NOT EXISTS idx_sub_services_name_en_trgm ON sub_services USING GIN (name_en gin_trgm_ops);

-- ============================================================
-- 5. Sub-Service Images (Gallery)
-- ============================================================
CREATE TABLE IF NOT EXISTS sub_service_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sub_service_id UUID NOT NULL REFERENCES sub_services(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  alt_text JSONB,
  display_order INT DEFAULT 0,
  is_hero_image BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sub_service_images_sub_service
  ON sub_service_images(sub_service_id, display_order);

-- Enforce one hero per sub-service
CREATE UNIQUE INDEX IF NOT EXISTS idx_sub_service_images_one_hero
  ON sub_service_images(sub_service_id) WHERE is_hero_image = true;

-- ============================================================
-- 6. Sub-Service Timeline Steps
-- ============================================================
CREATE TABLE IF NOT EXISTS sub_service_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sub_service_id UUID NOT NULL REFERENCES sub_services(id) ON DELETE CASCADE,
  slug VARCHAR(255) NOT NULL,
  title_en VARCHAR(255),
  title_ar VARCHAR(255),
  time_label VARCHAR(100),
  image_url TEXT,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(sub_service_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_sub_service_steps_sub_service
  ON sub_service_steps(sub_service_id, display_order);

-- ============================================================
-- 7. Doctors
-- ============================================================
CREATE TABLE IF NOT EXISTS doctors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_en VARCHAR(255) NOT NULL,
  name_ar VARCHAR(255),
  specialty_en VARCHAR(255),
  specialty_ar VARCHAR(255),
  bio_en TEXT,
  bio_ar TEXT,
  image_url TEXT,
  experience_years INT,
  is_active BOOLEAN DEFAULT true,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigram index for search
CREATE INDEX IF NOT EXISTS idx_doctors_name_en_trgm ON doctors USING GIN (name_en gin_trgm_ops);

-- ============================================================
-- 8. Doctor ↔ Sub-Service (many-to-many)
-- ============================================================
CREATE TABLE IF NOT EXISTS doctor_sub_services (
  doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  sub_service_id UUID NOT NULL REFERENCES sub_services(id) ON DELETE CASCADE,
  display_order INT NOT NULL DEFAULT 0,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (doctor_id, sub_service_id)
);

CREATE INDEX IF NOT EXISTS idx_doctor_sub_services_sub_service
  ON doctor_sub_services(sub_service_id);

CREATE INDEX IF NOT EXISTS idx_doctor_sub_services_sub_service_order
  ON doctor_sub_services(sub_service_id, display_order);

-- Enforce at most one primary doctor per sub-service
CREATE UNIQUE INDEX IF NOT EXISTS idx_doctor_sub_services_one_primary
  ON doctor_sub_services(sub_service_id) WHERE is_primary = true;

-- ============================================================
-- 9. Admin Users (audit identity)
-- ============================================================
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  role VARCHAR(50) NOT NULL DEFAULT 'admin',
  is_active BOOLEAN NOT NULL DEFAULT true,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_users_active
  ON admin_users(is_active) WHERE deleted_at IS NULL;

-- ============================================================
-- 10. Audit Log (immutable)
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_admin_id UUID REFERENCES admin_users(id) ON DELETE RESTRICT,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor ON audit_log(actor_admin_id, created_at);

-- ============================================================
-- 11. Comments
-- ============================================================
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
  sub_service_id UUID REFERENCES sub_services(id) ON DELETE RESTRICT,
  author_name VARCHAR(255) NOT NULL,
  author_email VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  locale VARCHAR(5) NOT NULL,
  is_visible BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comments_visible_entity
  ON comments(service_id, sub_service_id, is_visible)
  WHERE is_visible = true;

-- ============================================================
-- 12. Data Deletion Requests
-- ============================================================
CREATE TABLE IF NOT EXISTS data_deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_email VARCHAR(255) NOT NULL,
  requester_name VARCHAR(255),
  reason TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  completed_at TIMESTAMPTZ,
  internal_notes TEXT,
  CHECK (status IN ('pending', 'approved', 'rejected', 'completed'))
);

CREATE INDEX IF NOT EXISTS idx_data_deletion_requests_status ON data_deletion_requests(status);
CREATE INDEX IF NOT EXISTS idx_data_deletion_requests_email ON data_deletion_requests(requester_email);

-- Prevent duplicate pending requests for the same email
CREATE UNIQUE INDEX IF NOT EXISTS idx_deletion_pending_email
  ON data_deletion_requests(requester_email) WHERE status = 'pending';

-- ============================================================
-- 13. Service Page Views (Analytics)
-- ============================================================
CREATE TABLE IF NOT EXISTS service_page_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  sub_service_id UUID REFERENCES sub_services(id) ON DELETE CASCADE,
  view_date DATE NOT NULL,
  view_count INT NOT NULL DEFAULT 0
);

-- Partial unique indexes (fix for PostgreSQL NULL uniqueness)
CREATE UNIQUE INDEX IF NOT EXISTS idx_spv_unique_service_only
  ON service_page_views (service_id, view_date)
  WHERE sub_service_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_spv_unique_sub_service
  ON service_page_views (service_id, sub_service_id, view_date)
  WHERE sub_service_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_service_page_views_date ON service_page_views(view_date);
CREATE INDEX IF NOT EXISTS idx_service_page_views_service ON service_page_views(service_id);

-- ============================================================
-- 14. updated_at Triggers (for sitemap lastmod)
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_services_updated_at ON services;
CREATE TRIGGER trg_services_updated_at
  BEFORE UPDATE ON services
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_sub_services_updated_at ON sub_services;
CREATE TRIGGER trg_sub_services_updated_at
  BEFORE UPDATE ON sub_services
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_translations_updated_at ON translations;
CREATE TRIGGER trg_translations_updated_at
  BEFORE UPDATE ON translations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- 15. Seed Data — Default Locales
-- ============================================================
INSERT INTO locales (code, name, is_rtl, is_active, "order") VALUES
  ('en', 'English', false, true, 1),
  ('ar', 'العربية', true, true, 2)
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- 16. Seed Data — Default Admin (for development)
-- ============================================================
-- Log in with email admin@hito.local and password admin123 (or DEV_ADMIN_PASSWORD).
INSERT INTO admin_users (id, email, role, is_active)
VALUES ('00000000-0000-0000-0000-000000000001', 'admin@hito.local', 'admin', true)
ON CONFLICT (email) DO NOTHING;

-- ============================================================
-- Done. Schema ready for hito_app runtime usage.
-- ============================================================
