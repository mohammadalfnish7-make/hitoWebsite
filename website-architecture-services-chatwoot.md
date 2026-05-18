# Website Architecture: Services, Sub-Services, Languages & Chatwoot Integration

**Project:** Hito Health Tourism  
**Purpose:** Define structure for services hierarchy, dynamic multi-language support, dashboard management, and per-service Chatwoot widget tokens.

**Status:** ✅ APPROVED FOR PRODUCTION — With 4 Critical Production Constraints (see §12)

---

## 1. Service & Sub-Service Hierarchy

### 1.1 Structure Overview

```
Service (Parent)
  └── Sub-Service (Child)
  └── Sub-Service (Child)
  └── ...

Example:
  Dental
    ├── Veneers
    ├── Implants
    ├── Teeth Whitening
    └── Orthodontics
  Cosmetic Surgery
    ├── Rhinoplasty
    ├── Liposuction
    └── Facelift
  Fertility
    ├── IVF
    ├── Egg Freezing
    └── IUI
```

### 1.2 Data Model

| Entity | Fields | Notes |
|--------|--------|-------|
| **Service** | `id`, `slug`, `name_en`, `name_ar`, `description`, `meta_title`, `meta_description`, `chatwoot_website_token`, `order`, `deleted_at`, `created_at` | Parent level; `meta_*` localized (JSONB). `deleted_at` for audit-ready soft delete. |
| **SubService** | `id`, `service_id`, `slug`, `name_en`, `name_ar`, `description`, `meta_title`, `meta_description`, `chatwoot_website_token`, `main_image_url`, **`avg_cost_uae`**, **`avg_cost_home_country`**, **`cost_uae_currency`**, **`cost_home_currency`**, **`cost_notes`**, **`cost_last_updated_at`**, `order`, `deleted_at`, `created_at` | Child; + **cost calculator** fields (optional). Currency columns (ISO 4217) and optional notes/last-updated so frontend doesn’t hardcode assumptions. See §20. |
| **SubServiceStep** | `id`, `sub_service_id`, `slug`, `title_en`, `title_ar`, `time_label`, `image_url`, `display_order`, `created_at` | One step in the sub-service timeline. Admin adds/edits. See §19. |
| **Doctor** | `id`, `name_en`, `name_ar`, `specialty_en`, `specialty_ar`, `bio_en`, `bio_ar`, `image_url`, `experience_years`, `is_active`, **`deleted_at`**, `created_at` | Doctor profile; **soft delete** via `deleted_at` (audit-ready; preserves historical link to procedures). Linked via **doctor_sub_services**. See §20. |
| **DoctorSubService** | `doctor_id`, `sub_service_id`, `display_order`, `is_primary` | Many-to-many: which doctors are linked to which sub-service (+ ordering + one optional “primary doctor” per sub-service). |
| **AdminUser** | `id`, `email`, `role`, `is_active`, `deleted_at`, `created_at` | Admin identity for audit (or map to Supabase `auth.users`). See §5.10. |
| **AuditLog** | `id`, `actor_admin_id`, `action`, `entity_type`, `entity_id`, `metadata`, `created_at` | Immutable audit trail for moderation and PDPL review actions. See §5.11. |
| **Comment** | `id`, `service_id` (required), `sub_service_id` (optional), `author_name`, `author_email`, `content`, `locale`, `is_visible`, `created_at` | Visitor comments; **visible only when `is_visible = true`**. `service_id` required to avoid orphans. See §14. |
| **DataDeletionRequest** | `id`, `requester_email`, `requester_name`, `reason`, `status`, `requested_at`, `reviewed_at`, `completed_at` | User requests to delete their data; **data is deleted only after admin approves**. See §15. |
| **ServicePageView** | `service_id`, `sub_service_id`, `view_date`, `view_count` | Aggregated page visits per service/sub-service per day for dashboard analytics. See §16. |

**Rule:** Every service AND every sub-service has its own `chatwoot_website_token` for a dedicated Chatwoot inbox. For dynamic languages beyond EN/AR, use `name_{locale}` columns or a `service_translations` table.

### 1.3 Canonical URLs & Fallback Routes

| Rule | Behavior |
|------|----------|
| **Canonical per locale** | Each page has one canonical URL: `https://domain.com/{locale}/services/{slug}/{sub-slug}` |
| **Content fallback** | If translation missing for locale (e.g. `/tr/services/dental/veneers` has no Turkish content) → **fallback to default locale content** (e.g. English), keep URL. Do **not** redirect; avoid SEO duplication and broken UX. |
| **Missing service** | If slug doesn't exist → 404. If `deleted_at IS NOT NULL` → 404 or redirect to services list. |

---

## 2. Chatwoot Widget Integration

### 2.1 Widget Script Template

```html
<script>
  (function(d,t) {
    var BASE_URL="https://hitouae.com";
    var g=d.createElement(t),s=d.getElementsByTagName(t)[0];
    g.src=BASE_URL+"/packs/js/sdk.js";
    g.async = true;
    s.parentNode.insertBefore(g,s);
    g.onload=function(){
      window.chatwootSDK.run({
        websiteToken: '{{WEBSITE_TOKEN}}',  /* Dynamic per page */
        baseUrl: BASE_URL
      })
    }
  })(document,"script");
</script>
```

### 2.2 Token Resolution Logic

| Page Type | Token Used | Example |
|-----------|------------|---------|
| Service page (no sub-service) | Service's `chatwoot_website_token` | `/{locale}/services/dental` → Dental token |
| Sub-service page | Sub-service's `chatwoot_website_token` | `/{locale}/services/dental/veneers` → Veneers token |
| Fallback / Home | Default global token | Site-wide inbox |

### 2.3 Fail-Safe Fallback (Critical)

**Rule:** Never lose a lead. If token is missing, invalid, or service disabled → use `DEFAULT_WEBSITE_TOKEN`.

```ts
// Token resolution logic (fail-safe)
const token =
  subService?.chatwoot_website_token ||
  service?.chatwoot_website_token ||
  DEFAULT_WEBSITE_TOKEN;

if (!token || token.trim() === '') {
  use DEFAULT_WEBSITE_TOKEN;  // Never leave widget empty
}
```

### 2.4 SPA Route Change — Critical (Next.js / Client-Side Navigation)

**Problem:** When navigating between pages (e.g. `/services/dental` → `/services/dental/veneers`), the Chatwoot script does **not** automatically destroy the previous instance. User stays connected to the **wrong inbox**. Also: appending a new `<script>` on every `useEffect` run causes **double widgets** on slow connections.

**Solution:**
1. **Don't append a new script tag on every token change.** Check if the script is already in the DOM (e.g. `document.querySelector('script[src*="sdk.js"]')`); only inject once.
2. **Reset before re-init:** When `websiteToken` changes, call `window.$chatwoot.reset?.()` only **after** verifying the widget is ready (poll for `window.$chatwoot` or use `chatwoot:ready` event if available).
3. **Track `scriptLoaded` ref** — don't run SDK until the script has loaded; avoid race where `reset()` runs before the previous instance exists.

```ts
// Safe pattern: inject script once; only reset + re-run when token changes and widget is ready
const scriptEl = document.querySelector('script[src*="sdk.js"]');
if (!scriptEl) { /* inject script once */ }
// After script loads: if (window.$chatwoot) { window.$chatwoot.reset?.(); }
// Then: window.chatwootSDK.run({ websiteToken, baseUrl })
```

### 2.5 Lead Attribution (CRM Context)

**Rule:** Push context into each Chatwoot conversation so every lead is attributed to service/sub-service for CRM analytics and ROI.

```js
// After SDK run — setCustomAttributes (Chatwoot API)
window.$chatwoot.setCustomAttributes({
  service_slug: 'dental',
  sub_service_slug: 'veneers',
  patient_locale: 'ar',
  entry_url: 'https://domain.com/ar/services/dental/veneers'
});
```

| Attribute | Purpose |
|-----------|---------|
| `service_slug` | Department-level attribution |
| `sub_service_slug` | Procedure-level attribution; `'none'` if service-only page |
| `patient_locale` | Language preference for follow-up |
| `entry_url` | Source page for analytics; **must include UTM params** (e.g. `utm_source`, `utm_medium`, `utm_campaign`) when present so campaigns can be attributed. |

Implementation: Pass `serviceSlug`, `subServiceSlug`, `locale` to `ChatwootWidget`; build `entry_url` from `window.location.href` (or equivalent) so UTM parameters are preserved; call `setCustomAttributes` after SDK loads (§6.3).

---


## 3. Dynamic Multi-Language (i18n)

### 3.1 Overview

Languages are added **dynamically** via the dashboard—no code changes or redeploy needed.

| Approach | Storage | Add new language |
|----------|---------|------------------|
| **Dynamic** | Database (locales + translations) | Dashboard → Add locale → Add translations |
| Static | JSON files in code | Edit files + redeploy |

### 3.2 URL Structure with Locale

```
/{locale}                    → Home (e.g. /en, /ar, /tr)
/{locale}/services           → Services list
/{locale}/services/dental     → Dental service
/{locale}/services/dental/veneers → Veneers sub-service
```

### 3.3 Locale Resolution

| Source | Use for |
|--------|---------|
| `locales` table | Supported languages; `code` (en, ar, tr), `is_rtl`, `is_active` |
| `translations` table | UI strings per locale (nav, buttons, labels, etc.) |
| `services.name_*`, `sub_services.name_*` | Service/sub-service names (or extend with `name_tr`, etc.) |

### 3.4 RTL Support

For `locale === 'ar'`: set `<html dir="rtl" lang="ar">`. Other locales use `dir="ltr"`.

### 3.5 API for Translations

```
GET /api/translations?locale=ar
→ { "nav.services": "خدماتنا", "nav.contact": "تواصل", ... }
```

Frontend fetches at runtime; can cache per locale.

### 3.6 Slug Strategy (SEO & Backlinks)

| Approach | Recommendation |
|----------|----------------|
| **Service/sub-service slugs** | **Keep stable across all locales** (e.g. `dental`, `veneers`). Same URL path in all languages. |
| **Display names** | Localize via `name_en`, `name_ar`, `name_tr`, etc. or `translations` table. |
| **URL structure** | `/{locale}/services/dental/veneers` — locale changes; slug does not. |

**Why:** Prevents broken backlinks, SEO chaos, and URL duplication across locales.

### 3.7 hreflang Tags (SEO Mandatory)

**Rule:** For every page with locale variants, include `hreflang` so Google does not treat them as duplicates.

```html
<!-- Example: /en/services/dental page -->
<link rel="alternate" hreflang="en" href="https://domain.com/en/services/dental" />
<link rel="alternate" hreflang="ar" href="https://domain.com/ar/services/dental" />
<link rel="alternate" hreflang="tr" href="https://domain.com/tr/services/dental" />
<link rel="alternate" hreflang="x-default" href="https://domain.com/en/services/dental" />
```

**Non-optional** in medical tourism SEO.

---

## 4. Dashboard Requirements

### 4.0 Admin Authentication

All dashboard and admin API routes (e.g. approve comment, accept/reject deletion request, edit service/sub-service, manage translations, view analytics) **must be protected**. Unauthenticated requests must receive **401 Unauthorized**. Implement once and reuse: e.g. all routes under `/api/admin/*` require a valid session or API token; middleware or a shared auth check rejects requests without it. The document specifies *what* the dashboard does; securing *how* admin routes are accessed is required before any dashboard endpoint is exposed.

### 4.1 Locale & Translation Management

| Action | Dashboard UI | Required Fields |
|--------|--------------|-----------------|
| Add Locale | Form | Code (en, ar, tr), Name, RTL (boolean), Active |
| Edit Locale | Form | Same as above |
| Add/Edit Translation | Form or bulk import | Key, Locale, Value, **is_verified** (optional) |
| Delete Locale | Soft delete | `is_active = false` |

**Flow:** Add locale → Add translations for that locale. No redeploy needed. Use `is_verified` to track translation completeness and warn before publishing incomplete locales.

### 4.2 Service Management

| Action | Dashboard UI | Required Fields |
|--------|--------------|-----------------|
| Add Service | Form | Name (per locale), Slug, Description, **meta_title**, **meta_description** (per locale), **Chatwoot Website Token**, Order |
| Edit Service | Form | Same as above |
| Add Sub-Service | Form (under parent) | Parent Service, Name (per locale), Slug, Description, **meta_title**, **meta_description** (per locale), **Chatwoot Website Token**, **Main Image URL**, Order |
| Edit Sub-Service | Form | Same as above |
| Manage Sub-Service Gallery | Gallery UI (list + upload) | Add/edit/delete images in `sub_service_images` (image URL, localized alt text, hero flag, order) |
| Manage Sub-Service Timeline Steps | Timeline UI (list + add/edit) | Per sub-service: add/edit/delete steps with **title** (EN/AR), **slug**, **time** (e.g. "Day 1", "2 weeks"), **image** (URL). Order by `display_order`. |
| Manage Doctors | CRUD + link to sub-services | Add/edit doctors (name, specialty, bio, image, experience). Link doctors to sub-services via **doctor_sub_services** (many-to-many). See §20. |
| Cost calculator (sub-service) | Optional fields on sub-service form | **avg_cost_uae**, **avg_cost_home_country**, **cost_uae_currency** (default AED), **cost_home_currency** (ISO 4217) for correct display for UK/EU/RU etc. See §20. |
| Delete | Soft delete (audit-ready) | Set `deleted_at = NOW()` |

### 4.3 Chatwoot Token Workflow

When adding a **new** service or sub-service:

1. **Create inbox in Chatwoot** (Settings → Inboxes → Add Inbox → Website)
2. **Copy the Website Token** from Chatwoot
3. **Add/Edit** the service or sub-service in the dashboard
4. **Paste the token** in the `chatwoot_website_token` field
5. **Save** – the widget will use this token on the corresponding page(s)

### 4.4 Dashboard Checklist (New Service)

- [ ] Create service/sub-service in Chatwoot (new Website inbox)
- [ ] Copy `websiteToken` from Chatwoot
- [ ] Add service or sub-service in dashboard
- [ ] Enter `chatwoot_website_token`
- [ ] Add slug, names (per locale), description
- [ ] Publish (`deleted_at` remains NULL)

### 4.5 Dashboard Checklist (New Language)

- [ ] Locales → Add Locale (code, name, RTL)
- [ ] Translations → Add or import strings for the new locale
- [ ] Services/Sub-services → Add `name_{locale}` if using column-per-locale, or add translation rows
- [ ] Verify site at `/{new_locale}/...`

### 4.6 Preview & Validation (Before Publishing)

**Before publishing any service/sub-service or new locale:**

| Check | Purpose |
|-------|---------|
| Preview page per locale | Ensure no half-translated medical pages |
| Translation completeness | Verify `is_verified` or warn if keys missing (§4.7 meter) |
| Chatwoot widget token | Confirm token is set, valid format (§4.14), and widget loads |
| SEO meta | `meta_title`, `meta_description` present per locale |
| hreflang tags | Alternate links for all locales (§3.7) |
| Medical disclaimer | Present per locale (compliance) |

This prevents misrouted medical leads and compliance risks.

### 4.7 Translation Completeness Meter

**Before publishing a locale**, show:

```
Arabic Translation Completeness: 82%
⚠ 14 missing keys — [View List]
```

- Compute: `(verified_or_filled_keys / total_keys) * 100`
- Block or warn if completeness < 100% for medical pages
- Prevents half-translated medical pages

### 4.9 Comment Moderation

| Action | Dashboard UI | Behavior |
|--------|--------------|----------|
| List comments | Table/filter | All comments; filter by pending / approved / rejected, by service/sub-service |
| Approve | Toggle or action | Set `is_visible = true` → comment appears on site immediately |
| Reject / Hide | Toggle or action | Set `is_visible = false` → comment removed from public list |
| Delete | Soft or hard delete | Optional `deleted_at` on comments for audit |

**Rule:** Only comments with `is_visible = true` are returned by the public API and shown on the page. New submissions are stored with `is_visible = false` until approved.

### 4.11 Data Deletion Requests (Privacy)

| Action | Dashboard UI | Behavior |
|--------|--------------|----------|
| List requests | Table/filter | All deletion requests; filter by status: pending / approved / rejected / completed |
| Review | Detail view | See requester email, name, reason, requested_at |
| Accept (approve) | Action | Set `status = 'approved'`; **execute deletion** (delete or anonymize that user’s data: comments by email, any stored leads); then set `status = 'completed'`, set `completed_at` |
| Reject | Action | Set `status = 'rejected'`; optional internal note; user’s data is not deleted |
| Audit | Log | Store `reviewed_at`, `reviewed_by` (admin) for compliance |

**Rule:** Data is **only deleted after admin review and acceptance**. Rejected requests leave data unchanged.

### 4.13 Visit Analytics (Service & Sub-Service)

| Action | Dashboard UI | Behavior |
|--------|--------------|----------|
| View by service | Table or list | For each service: total visits (all time or date range); optional breakdown by sub-service. |
| View by sub-service | Table or list | For each sub-service: total visits; parent service name. |
| Filter by date | Date range picker | Show visits in selected period (e.g. last 7 days, last 30 days, custom). |
| Export / measure | Optional | Export totals or time-series for analysis (e.g. CSV, charts). |

**Purpose:** See how much each service and sub-service is visited so you can analyze and measure performance (e.g. which procedures get most interest).

### 4.14 Token Validation (Before Save)

Validate Chatwoot token format before saving to avoid misconfiguration (e.g. admin pasting a full URL):

```ts
// Chatwoot tokens: alphanumeric, sometimes hyphens; ~15–50 chars. Test against your self-hosted instance.
const TOKEN_REGEX = /^[a-zA-Z0-9\-]{15,50}$/;
if (token && !TOKEN_REGEX.test(token)) {
  return error('Invalid Chatwoot token format');
}
```

**Note:** Test against your actual Chatwoot token format before enforcing. Some versions use hyphens; don't block valid tokens.

---

## 5. Database Schema (Reference)

### 5.1 Locales Table (Dynamic Languages)

```sql
CREATE TABLE locales (
  code VARCHAR(5) PRIMARY KEY,   -- 'en', 'ar', 'tr', 'de'
  name VARCHAR(100) NOT NULL,    -- 'English', 'العربية'
  is_rtl BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  "order" INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 5.2 Translations Table (UI Strings per Locale)

```sql
CREATE TABLE translations (
  id UUID PRIMARY KEY,
  key VARCHAR(255) NOT NULL,     -- 'nav.services', 'services.dental'
  locale VARCHAR(5) REFERENCES locales(code) ON DELETE CASCADE,
  value TEXT NOT NULL,
  is_verified BOOLEAN DEFAULT false,  -- Admin verification; enables completeness tracking
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(key, locale)
);

-- Composite index: optimizes SELECT * FROM translations WHERE locale = 'ar' AND key = '...'
-- Target: sub-50ms even with 10,000+ keys
CREATE INDEX idx_translations_locale_key ON translations(locale, key);
```

**`is_verified`** — Use for: admin warnings when content is partially translated; safer production releases; translation completeness reporting.

**Index:** `idx_translations_locale_key` — Composite index for `(locale, key)` lookups. Keeps translation API sub-50ms at scale (10K+ keys).

### 5.3 Services Table

```sql
CREATE TABLE services (
  id UUID PRIMARY KEY,
  slug VARCHAR(100) UNIQUE NOT NULL,
  name_en VARCHAR(255) NOT NULL,
  name_ar VARCHAR(255),
  description TEXT,
  meta_title JSONB,        -- {"en": "...", "ar": "...", "tr": "..."}
  meta_description JSONB,  -- {"en": "...", "ar": "...", "tr": "..."}
  chatwoot_website_token VARCHAR(100),  -- Nullable: use DEFAULT_WEBSITE_TOKEN when null
  "order" INT DEFAULT 0,
  deleted_at TIMESTAMPTZ,   -- Audit-ready soft delete; NULL = active
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**`meta_title`, `meta_description`** — Medical tourism is SEO-heavy. Meta must be localized per language.

**`deleted_at`** — Audit-ready soft delete. Use `WHERE deleted_at IS NULL` for active records. Enables recovery and business auditing.

**`updated_at` DB Triggers** — A PostgreSQL trigger must automatically update the `updated_at` column on modification for `services` and `sub_services`. This ensures the XML sitemap `<lastmod>` tag is always accurate for SEO without relying on the application layer.

### 5.4 Sub-Services Table

```sql
CREATE TABLE sub_services (
  id UUID PRIMARY KEY,
  service_id UUID REFERENCES services(id) ON DELETE CASCADE,
  slug VARCHAR(100) NOT NULL,
  name_en VARCHAR(255) NOT NULL,
  name_ar VARCHAR(255),
  description TEXT,
  meta_title JSONB,        -- {"en": "...", "ar": "...", "tr": "..."}
  meta_description JSONB,  -- {"en": "...", "ar": "...", "tr": "..."}
  chatwoot_website_token VARCHAR(100),  -- Nullable: fallback to service or DEFAULT
  main_image_url TEXT,     -- Featured image for lists/cards
  avg_cost_uae NUMERIC(12,2),        -- Optional: indicative cost in UAE for cost calculator
  avg_cost_home_country NUMERIC(12,2), -- Optional: indicative cost in "home country" for comparison
  cost_uae_currency VARCHAR(3) DEFAULT 'AED',   -- ISO 4217; frontend uses for symbol/label
  cost_home_currency VARCHAR(3),               -- ISO 4217 (e.g. USD, GBP, EUR); avoid hardcoding
  cost_notes JSONB,                 -- Optional localized notes/disclaimer: {"en":"...", "ar":"..."}
  cost_last_updated_at TIMESTAMPTZ, -- Optional: when these cost numbers were last verified
  "order" INT DEFAULT 0,
  deleted_at TIMESTAMPTZ,   -- Audit-ready soft delete; NULL = active
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(service_id, slug)
);
```

**Cost calculator:** Cost fields are optional. Store currency in `cost_uae_currency` (default `'AED'`) and `cost_home_currency` (e.g. `'USD'`, `'GBP'`, `'EUR'`) so the frontend can show the correct symbol for patients from multiple countries; avoid hardcoding "USD". Use `cost_notes` for localized disclaimers/assumptions, and `cost_last_updated_at` to show freshness (trust).

### 5.6 Sub-Service Images (Gallery)

```sql
CREATE TABLE sub_service_images (
  id UUID PRIMARY KEY,
  sub_service_id UUID REFERENCES sub_services(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,                 -- Stored in S3/Supabase/Cloudinary (not DB)
  alt_text JSONB,                          -- {"en": "...", "ar": "..."}
  display_order INT DEFAULT 0,
  is_hero_image BOOLEAN DEFAULT false,     -- Main image used in lists if set
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sub_service_images_sub_service
  ON sub_service_images(sub_service_id, display_order);

-- Enforce one hero per sub_service (app-level enforcement breaks under concurrency)
CREATE UNIQUE INDEX idx_sub_service_images_one_hero
  ON sub_service_images(sub_service_id) WHERE is_hero_image = true;
```

**Rules:**
- Store only **URLs** in `image_url`; actual binary files live in object storage.
- At most one `is_hero_image = true` per `sub_service_id` — enforced by partial unique index above.
- Use `main_image_url` as a quick fallback if gallery is empty.

### 5.6b Sub-Service Timeline Steps Table

Each sub-service can have a **timeline of steps** (e.g. "Consultation" → "Treatment" → "Follow-up"). Admin adds each step with title, slug, time label, and image.

```sql
CREATE TABLE sub_service_steps (
  id UUID PRIMARY KEY,
  sub_service_id UUID NOT NULL REFERENCES sub_services(id) ON DELETE CASCADE,
  slug VARCHAR(255) NOT NULL,
  title_en VARCHAR(255),
  title_ar VARCHAR(255),
  time_label VARCHAR(100),   -- e.g. "Day 1", "Week 2", "2–3 hours"
  image_url TEXT,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(sub_service_id, slug)
);

CREATE INDEX idx_sub_service_steps_sub_service
  ON sub_service_steps(sub_service_id, display_order);
```

**Rules:**
- `slug` unique per sub-service (for deep links or anchor IDs).
- `time_label` is free text (e.g. "Day 1", "2 weeks", "1 hour").
- `image_url` stored like gallery images (CDN or relative path).
- Order steps by `display_order` for the public timeline.

### 5.6c Doctors Table & Doctor–Sub-Service Link

Link doctors to sub-services (many-to-many) so each procedure can show specialist profiles and build trust.

```sql
CREATE TABLE doctors (
  id UUID PRIMARY KEY,
  name_en VARCHAR(255) NOT NULL,
  name_ar VARCHAR(255),
  specialty_en VARCHAR(255),
  specialty_ar VARCHAR(255),
  bio_en TEXT,
  bio_ar TEXT,
  image_url TEXT,
  experience_years INT,
  is_active BOOLEAN DEFAULT true,
  deleted_at TIMESTAMPTZ,   -- Audit-ready soft delete; NULL = active (matches rest of schema)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Many-to-many: which doctors are linked to which sub-service
CREATE TABLE doctor_sub_services (
  doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  sub_service_id UUID NOT NULL REFERENCES sub_services(id) ON DELETE CASCADE,
  display_order INT NOT NULL DEFAULT 0,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (doctor_id, sub_service_id)
);

CREATE INDEX idx_doctor_sub_services_sub_service ON doctor_sub_services(sub_service_id);

CREATE INDEX idx_doctor_sub_services_sub_service_order
  ON doctor_sub_services(sub_service_id, display_order);

-- Enforce at most one primary doctor per sub-service
CREATE UNIQUE INDEX idx_doctor_sub_services_one_primary
  ON doctor_sub_services(sub_service_id) WHERE is_primary = true;
```

**Rules:**
- Admin adds/edits doctors and assigns them to one or more sub-services. Use **soft delete** for doctors: set `deleted_at = NOW()` when a doctor leaves; do not hard-delete, so historical association with procedures is preserved.
- **Public doctor query:** The join table does not cascade when a sub-service is soft-deleted (`deleted_at` on `sub_services`). So when listing doctors for a sub-service (or "doctors for this procedure"), **always filter via active sub-services:** e.g. join `doctor_sub_services` → `sub_services` and `WHERE sub_services.deleted_at IS NULL`. Otherwise you may surface doctors for retired procedures.

### 5.7 Visitor Comments Table

```sql
CREATE TABLE comments (
  id UUID PRIMARY KEY,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
  sub_service_id UUID REFERENCES sub_services(id) ON DELETE RESTRICT,
  author_name VARCHAR(255) NOT NULL,
  author_email VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  locale VARCHAR(5) NOT NULL,
  is_visible BOOLEAN DEFAULT false,   -- Only true after moderation
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Public API: only visible comments
CREATE INDEX idx_comments_visible_entity
  ON comments(service_id, sub_service_id, is_visible)
  WHERE is_visible = true;
```

**Rules:**
- `service_id` is **required** (avoids orphaned comments); `sub_service_id` is optional.
- `ON DELETE RESTRICT` — hard-deleting a service/sub-service will fail if comments exist; forces soft delete and protects audit trail.
- New comments are stored with `is_visible = false`. No one sees them until an admin sets `is_visible = true`.
- Public list endpoint must filter: `WHERE is_visible = true`.

### 5.8 Data Deletion Requests Table

```sql
CREATE TABLE data_deletion_requests (
  id UUID PRIMARY KEY,
  requester_email VARCHAR(255) NOT NULL,
  requester_name VARCHAR(255),
  reason TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending | approved | rejected | completed
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES admin_users(id) ON DELETE SET NULL, -- Admin identifier (PDPL audit)
  completed_at TIMESTAMPTZ,
  internal_notes TEXT,        -- Admin-only (e.g. rejection reason)
  CHECK (status IN ('pending', 'approved', 'rejected', 'completed'))
);

CREATE INDEX idx_data_deletion_requests_status ON data_deletion_requests(status);
CREATE INDEX idx_data_deletion_requests_email ON data_deletion_requests(requester_email);
```

**Rules:**
- `reviewed_by` — for strict UAE PDPL audit compliance, this is a foreign key to `admin_users(id)`.
- User submits request → row created with `status = 'pending'`.
- Admin approves → run deletion (e.g. delete/anonymize comments and any records keyed by `requester_email`), then set `status = 'completed'`, `completed_at = NOW()`.
- Admin rejects → set `status = 'rejected'`; no data is deleted.
- Keep the request row for audit (who asked, when, outcome).

### 5.9 Service Page Views (Visit Analytics)

**PostgreSQL NULL uniqueness:** `UNIQUE(service_id, sub_service_id, view_date)` fails when `sub_service_id IS NULL` — PostgreSQL treats NULL ≠ NULL, so duplicate rows for the same service/day would be allowed. Use **partial unique indexes** instead:

```sql
CREATE TABLE service_page_views (
  id UUID PRIMARY KEY,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  sub_service_id UUID REFERENCES sub_services(id) ON DELETE CASCADE,
  view_date DATE NOT NULL,
  view_count INT NOT NULL DEFAULT 0
);

-- Partial indexes: one covers service-only (sub_service_id NULL), one covers sub-service
CREATE UNIQUE INDEX idx_spv_unique_service_only
  ON service_page_views (service_id, view_date)
  WHERE sub_service_id IS NULL;

CREATE UNIQUE INDEX idx_spv_unique_sub_service
  ON service_page_views (service_id, sub_service_id, view_date)
  WHERE sub_service_id IS NOT NULL;

CREATE INDEX idx_service_page_views_date ON service_page_views(view_date);
CREATE INDEX idx_service_page_views_service ON service_page_views(service_id);
```

**Rules:**
- **Service-only page** (e.g. `/services/dental`): one row per day with `service_id` set, `sub_service_id = NULL`. Upsert uses `idx_spv_unique_service_only`.
- **Sub-service page** (e.g. `/services/dental/veneers`): one row per day with both set. Upsert uses `idx_spv_unique_sub_service`.
- On record: `INSERT ... ON CONFLICT` must target the correct partial index (use separate upsert logic for NULL vs non-NULL `sub_service_id`).
- Dashboard aggregates: sum `view_count` by service, or by sub-service, with optional filter by `view_date` range.

### 5.10 Admin Users (Audit identity)

If you already have an auth provider (e.g. Supabase Auth), you can map admins to `auth.users`. Otherwise create an `admin_users` table so every review action is attributable.

```sql
CREATE TABLE admin_users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  role VARCHAR(50) NOT NULL DEFAULT 'admin', -- admin | editor | moderator
  is_active BOOLEAN NOT NULL DEFAULT true,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_admin_users_active ON admin_users(is_active) WHERE deleted_at IS NULL;
```

### 5.11 Audit Log (Immutable)

Record moderation and PDPL-relevant actions (comment approve/reject, deletion approve/reject/complete, content publish/unpublish, etc.). This is critical for medical compliance and internal accountability.

```sql
CREATE TABLE audit_log (
  id UUID PRIMARY KEY,
  actor_admin_id UUID REFERENCES admin_users(id) ON DELETE RESTRICT,
  action VARCHAR(100) NOT NULL,          -- e.g. 'comment.approve', 'deletion.approve'
  entity_type VARCHAR(50) NOT NULL,      -- 'comment' | 'data_deletion_request' | 'service' | 'sub_service'
  entity_id UUID,                        -- id of the affected row (nullable when not applicable)
  metadata JSONB,                        -- details: before/after, reason, request context, snapshot of admin email/name
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_log_actor ON audit_log(actor_admin_id, created_at);

**Rules:**
- `actor_admin_id` uses `ON DELETE RESTRICT` (not `SET NULL`) to prevent admin account deletion from erasing the audit trail of who approved actions.
- Store the admin's email and name as a snapshot inside the `metadata` JSONB at the time of the action, guaranteeing permanent attribution.
```

### 5.12 Future Expansion: Multi-Country

For multi-country deployments (e.g. Hito UAE, Hito Turkey):

```sql
ALTER TABLE services ADD COLUMN country_code VARCHAR(2);  -- 'AE', 'TR'
ALTER TABLE sub_services ADD COLUMN country_code VARCHAR(2);
```

---

## 6. Frontend Implementation Notes

### 6.1 Page → Token Mapping

```
URL                                    → Token Source
/{locale}                              → Default/global token
/{locale}/services                     → Default/global token
/{locale}/services/dental               → services.chatwoot_website_token (Dental)
/{locale}/services/dental/veneers       → sub_services.chatwoot_website_token (Veneers)
/{locale}/services/cosmetic-surgery     → services.chatwoot_website_token
/{locale}/services/.../rhinoplasty      → sub_services.chatwoot_website_token
```

### 6.2 Translations Fetch (Dynamic i18n)

```ts
// Fetch translations at runtime
async function getTranslations(locale: string) {
  const res = await fetch(`/api/translations?locale=${locale}`);
  return res.json();  // { "nav.services": "...", "services.dental": "..." }
}
```

### 6.3 Widget Injection (React/Next.js Example) — With SPA Reset

**Critical (§2.4):** Do **not** append a new `<script>` on every `useEffect` run — that causes double widgets on slow connections. Inject the script **once**; only reset and re-run SDK when the token changes.

```jsx
// ChatwootWidget.jsx — see §2.4 for safe script injection pattern
export function ChatwootWidget({ websiteToken, serviceSlug, subServiceSlug, locale }) {
  const BASE_URL = "https://hitouae.com";
  const token = websiteToken || DEFAULT_WEBSITE_TOKEN;

  useEffect(() => {
    if (!token || typeof window === 'undefined') return;

    const runSDK = () => {
      if (window.$chatwoot) window.$chatwoot.reset?.();
      window.chatwootSDK?.run({ websiteToken: token, baseUrl: BASE_URL });
      // setCustomAttributes: $chatwoot may not be ready immediately after run()
      // Poll for readiness or use chatwoot:ready event if your Chatwoot version supports it
      const setAttrs = () => {
        if (window.$chatwoot?.setCustomAttributes) {
          window.$chatwoot.setCustomAttributes({
            service_slug: serviceSlug || 'none',
            sub_service_slug: subServiceSlug || 'none',
            patient_locale: locale || 'en',
            entry_url: window.location.href
          });
          return;
        }
        setTimeout(setAttrs, 100);  // Poll until ready
      };
      setTimeout(setAttrs, 200);
    };

    const existing = document.querySelector('script[src*="sdk.js"]');
    if (existing) {
      runSDK();
      return () => { if (window.$chatwoot) window.$chatwoot.reset?.(); };
    }
    const g = document.createElement("script");
    g.src = `${BASE_URL}/packs/js/sdk.js`;
    g.async = true;
    document.head.appendChild(g);
    g.onload = runSDK;
    return () => { if (window.$chatwoot) window.$chatwoot.reset?.(); };
  }, [token, serviceSlug, subServiceSlug, locale]);
  return null;
}
```

```jsx
// Page: /services/[serviceSlug]/[subServiceSlug] — with fail-safe + lead attribution
const token = subService?.chatwoot_website_token ?? service?.chatwoot_website_token ?? DEFAULT_WEBSITE_TOKEN;
<ChatwootWidget
  websiteToken={token || DEFAULT_WEBSITE_TOKEN}
  serviceSlug={serviceSlug}
  subServiceSlug={subServiceSlug}
  locale={locale}
/>
```

### 6.4 SSG/Static Sites

If using static generation, fetch services/sub-services and translations at build or runtime and pass the token to the layout component based on the current route.

### 6.5 Images & Gallery Rendering

- **Lists / cards**: Use `sub_services.main_image_url` if present, otherwise the `is_hero_image = true` record from `sub_service_images`.
- **Detail page**: Load full gallery from `sub_service_images` (ordered by `display_order`) and pass localized `alt_text[locale]` to the image component.
- **Next.js**: Use `<Image />` for optimization and a simple lightbox component for full-screen viewing.
- **Fallback**: If no gallery and no `main_image_url`, show a generic specialty image per service.

### 6.5b Sub-Service Timeline (Steps)

- **Where**: On the sub-service detail page (e.g. `/{locale}/services/dental/veneers`), show a **timeline** of steps below the main content.
- **Data**: Fetch `sub_service_steps` for the sub-service, ordered by `display_order`. Each step: `title_en`/`title_ar` (by locale), `time_label`, `image_url`, `slug` (e.g. for anchor or deep link).
- **Display**: Render as a vertical or horizontal timeline (e.g. "Step 1 — Consultation — Day 1" with image). Use step slug for optional anchor links.

### 6.6 Visitor Comments (Public Page)

- **Where**: Comments section on service and/or sub-service pages (e.g. `/en/services/dental`, `/en/services/dental/veneers`). One comments block per page; scope by `service_id` and optionally `sub_service_id`.
- **Submit**: Form (author name, email, content); POST to API; store with `is_visible = false`. Show immediate confirmation: e.g. “Thank you. Your comment will appear after moderation.”
- **Display**: List only comments where `is_visible = true`. Fetch via API, e.g. `GET /api/comments?service_id=...&sub_service_id=...` (returns only visible). New approved comments appear as soon as the page is refreshed or list is refetched.
- **Rule**: Never return or render non-visible comments to visitors. Dashboard alone can see and approve/reject.

### 6.7 Data Privacy & Deletion Request (Public)

- **Where**: Dedicated page (e.g. `/{locale}/privacy` or `/{locale}/data-deletion-request`), linked from footer and Privacy Notice.
- **Content**: Short explanation of what data is collected (e.g. comments: name, email, content; contact form if any); link to full Privacy Notice; **form to request deletion** (email, optional name, optional reason).
- **Submit**: POST to API → create row in `data_deletion_requests` with `status = 'pending'`. Show confirmation: e.g. “We received your request. We will review it and process it within X days.”
- **No self-serve deletion**: Data is **only** deleted after admin reviews and accepts the request in the dashboard (§4.11, §15).

### 6.8 Recording Page Visits (Analytics)

- **When**: On load of a service page (`/{locale}/services/{serviceSlug}`) or sub-service page (`/{locale}/services/{serviceSlug}/{subServiceSlug}`).
- **How**: Call backend to record one view (e.g. `POST /api/track-view` with `service_id`, `sub_service_id` optional) or increment in server-side render. Backend upserts into `service_page_views` for today’s date (increment `view_count`).
- **Dedup (recommended)**: Prevent refresh loops inflating analytics by deduping **per session**. Example approach: generate a `session_id` cookie and send it with `track-view`; backend keeps a short-lived key (e.g. Redis) for `(session_id, page_key, day)` and only increments once per day (or once per X minutes).
- **Privacy**: No need to store visitor identity; if you use cookies for deduplication, disclose it in the Privacy Notice and avoid storing raw IPs long-term.

---

## 7. Example Data

| Service | Sub-Service | Slug | Chatwoot Token (Example) |
|---------|-------------|------|-------------------------|
| Dental | — | dental | `TRgSprUk6FYb9y3Ucnkzu8Sn` |
| Dental | Veneers | veneers | `XXXXX_VENEERS_TOKEN_XXXXX` |
| Dental | Implants | implants | `XXXXX_IMPLANTS_TOKEN_XXXXX` |
| Cosmetic Surgery | — | cosmetic-surgery | `XXXXX_COSMETIC_TOKEN_XXXXX` |
| Cosmetic Surgery | Rhinoplasty | rhinoplasty | `XXXXX_RHINOPLASTY_TOKEN_XXXXX` |

---

## 8. Configuration Constants

| Constant | Value | Purpose |
|----------|-------|---------|
| `CHATWOOT_BASE_URL` | `https://hitouae.com` | Self-hosted Chatwoot instance |
| `DEFAULT_WEBSITE_TOKEN` | (fallback) | Used for `/`, `/contact`, pages without service context |

---

## 9. Admin Checklist: Adding a New Service/Sub-Service

1. **In Chatwoot:**
   - Settings → Inboxes → Add Inbox → Website
   - Enter name (e.g. "Dental - Veneers")
   - Add domain(s) if needed
   - Copy **Website Token**

2. **In Dashboard:**
   - Services → Add Service (or Add Sub-Service under parent)
   - Fill: Name, Slug, Description
   - Paste **Chatwoot Website Token**
   - Save

3. **Preview & Validate** (§4.6):
   - Preview page per locale
   - Check translation completeness, Chatwoot token, SEO meta, disclaimer

4. **Verify:**
   - Visit the new page
   - Confirm widget loads with correct inbox
   - Test a message reaches the right team/inbox

---

## 10. Strategic Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| **Medical compliance** | Medical disclaimer per locale; consent forms; no medical advice in chat |
| **Region-specific terminology** | Use `translations` for localized medical terms; review with native speakers |
| **Over-fragmentation of Chatwoot inboxes** | For low-volume sub-services, **group into shared inbox** (same token for related sub-services). Reduce inbox count while keeping lead attribution via custom attributes or tags. |
| **Half-translated pages** | Preview & validation (§4.6); `is_verified` on translations; translation completeness meter (§4.7) |
| **Silent lead loss** | Fail-safe token fallback (§2.3); `DEFAULT_WEBSITE_TOKEN` always used when token missing |
| **Token misconfiguration** | Validate token format with regex before save (§4.14); reject invalid tokens |
| **SPA wrong inbox** | Destroy Chatwoot instance on route change (§2.4, §6.3) |
| **Multi-country expansion** | Add `country_code` to services/sub_services (§5.12) when scaling |
| **Data privacy / right to erasure** | Privacy Notice; deletion request form; admin review; delete only after accept (§15) |

---

## 11. Summary

| Item | Rule |
|------|------|
| Hierarchy | Service → Sub-Services (one level) |
| Token per entity | Each service AND sub-service has `chatwoot_website_token` (nullable; fallback to DEFAULT) |
| Token source | Create inbox in Chatwoot first, then paste token in dashboard |
| **Fail-safe** | If token missing → use `DEFAULT_WEBSITE_TOKEN` (no lead loss) |
| Dashboard | Must have `chatwoot_website_token` field when adding/editing services and sub-services |
| **Languages** | Dynamic via `locales` + `translations`; add via dashboard, no redeploy |
| **URL structure** | `/{locale}/services/...`; slugs stable across locales |
| **RTL** | Set `dir="rtl"` for Arabic and other RTL locales |
| **Content fallback** | Missing translation → show default locale content, keep URL |
| **Preview before publish** | Translation completeness, Chatwoot token, SEO meta, medical disclaimer |
| **Visitor comments** | Stored in DB with `is_visible`; only visible comments shown; moderation in dashboard (§14) |
| **Data privacy** | User can request data deletion; data deleted **only after admin review and accept** (§15) |
| **Visit analytics** | Dashboard shows visit counts per service and sub-service; record views in `service_page_views` (§16) |
| **Sub-service timeline** | Each sub-service can have steps (title, slug, time, image); admin adds/edits; shown on sub-service page (§19) |
| **Doctors** | `doctors` table + `doctor_sub_services` (many-to-many) with ordering (`display_order`) + optional one primary doctor (`is_primary`); show on sub-service page (§20) |
| **Cost calculator** | Optional cost fields + currencies (ISO 4217) + notes/last-updated (`cost_notes`, `cost_last_updated_at`) on `sub_services` (§20) |
| **Admin audit** | Use `admin_users` + immutable `audit_log` for moderation and PDPL review actions (§5.10–§5.11) |
| **Analytics hygiene** | Rate limit `POST /api/track-view` and dedupe per-session to avoid inflated analytics (§6.8, §17.3, §18 Fix 2) |
| **SEO ops** | Generate `sitemap.xml` + `robots.txt` (localized URLs, hreflang aware) (§21) |

**Migrations:** Full schema in `migrations/001_platform_core_schema.sql`.

- If the DB was created before doctors/cost fields existed, run `migrations/002_doctors_and_cost_calculator.sql`.
- If the DB was created before **admin_users / audit_log**, doctor-link ordering/primary, or the new cost metadata fields, run `migrations/003_admin_audit_doctor_ordering_cost_metadata.sql`.

---

## 12. Critical Production Constraints (Must-Have)

| # | Constraint | Location |
|---|------------|----------|
| 1 | **Destroy Chatwoot instance on route change** | §2.4, §6.3 — Prevents wrong inbox on SPA navigation |
| 2 | **Add hreflang tags** | §3.7 — Non-optional for medical tourism SEO |
| 3 | **Composite index `translations(locale, key)`** | §5.2 — Sub-50ms translation API at scale |
| 4 | **Localized meta_title, meta_description** | §5.3, §5.4 — Medical tourism is SEO-heavy |
| 5 | **Rate limiting on public POST endpoints** | §17.3, §18 Fix 2 — `POST /api/comments`, `POST /api/data-deletion-request`, **and `POST /api/track-view`** (e.g. 60/min per IP); by IP or CAPTCHA. **Hard blocker before go-live.** |
| 6 | **Partial unique indexes for `service_page_views`** | §5.9 — `UNIQUE(service_id, sub_service_id, view_date)` fails when `sub_service_id IS NULL`; use partial indexes. |
| 7 | **Admin authentication** | §4.0 — All dashboard/admin routes require a valid session or token; unauthenticated requests return 401. |

**Verdict:** Architecture is production-grade. These seven items are non-negotiable before go-live.

---

## 13. Post-Launch Optimization (Enterprise-Grade Addendum)

| Item | Description | Location |
|------|-------------|----------|
| **Composite index** | `idx_translations_locale_key` for sub-50ms translation API at 10K+ keys | §5.2 |
| **Lead attribution** | `setCustomAttributes` — service_slug, sub_service_slug, patient_locale, entry_url | §2.5, §6.3 |
| **Audit-ready deletion** | `deleted_at` timestamp on services/sub_services for recovery and business auditing | §5.3, §5.4 |

**Classification:** This document defines the **Modular Medical Tourism Platform Core** — a system specification, not a simple website.

---

## 14. Visitor Comments

### 14.1 Purpose

Allow visitors to leave comments on service/sub-service pages. Comments are stored in the database and **only appear on the site after moderation** (`is_visible = true`).

### 14.2 Visibility Rule

| State | Who can see |
|-------|-------------|
| `is_visible = false` (default for new) | Only dashboard admins; not shown on public site or in public API |
| `is_visible = true` | All visitors; comment appears in the list immediately (on next load/refresh) |

So: “when it is storing in the database no one can see it if it not visible” — only visible comments are ever returned to the front end or shown on the page.

### 14.3 Visitor Flow

1. Visitor fills form (name, email, message) on a service or sub-service page.
2. On submit: POST to API → save to `comments` with `is_visible = false`.
3. Show confirmation: e.g. “Thank you. Your comment will be reviewed and published shortly.”
4. Approved comments show in the same list; newly approved ones show as soon as the list is refetched or the page is reloaded.

### 14.4 Dashboard (Moderation)

- View all comments (pending, approved, rejected).
- Approve → set `is_visible = true` (comment becomes visible on the site).
- Reject / hide → set `is_visible = false` (comment disappears from the site).
- Optional: add `deleted_at` for soft delete and audit.

### 14.5 API Contract

| Endpoint | Who | Returns |
|----------|-----|--------|
| `POST /api/comments` | Visitor | Creates comment with `is_visible = false`; returns success + optional “pending” message |
| `GET /api/comments?service_id=...&sub_service_id=...` | Public | Only rows where `is_visible = true` (and matching entity) |

No endpoint should expose non-visible comments to unauthenticated or public users.

---

## 15. Data Privacy & Deletion Requests

### 15.1 Data Privacy Principles

- **Transparency**: Publish a Privacy Notice (e.g. on `/privacy`) describing what personal data is collected (e.g. comment author name/email, contact form, Chatwoot conversations if applicable), why, how long it is kept, and who to contact.
- **UAE PDPL**: Align with UAE Personal Data Protection Law (retention, lawful basis, rights to access/erasure).
- **Minimization**: Collect only what is needed for the service (e.g. comments, inquiries).

### 15.2 What Data Is Held (Platform)

| Data | Where stored | Used for |
|------|--------------|----------|
| Comment author name, email, content | `comments` | Display (when visible), moderation |
| Data deletion requests | `data_deletion_requests` | Audit, review, execute deletion |
| Chatwoot conversations | Chatwoot (external) | Support; handle per Chatwoot & your Privacy Notice |

When a deletion request is **accepted**, delete or anonymize that person’s data in your systems (e.g. all `comments` where `author_email` = requester email; optionally anonymize rather than hard-delete for audit).

### 15.3 User-Initiated Deletion Request Flow

1. **User**: Visits privacy/deletion page, fills form (email required; name, reason optional), submits.
2. **System**: Creates `data_deletion_requests` row with `status = 'pending'`. Sends confirmation message to user (e.g. “Request received; we will review within X days”).
3. **Admin**: Sees pending request in dashboard (§4.11). Reviews identity/legitimacy if needed.
4. **Admin accepts**:  
   - Execute deletion: e.g. delete or anonymize all `comments` (and any other records) tied to `requester_email`.  
   - Update request: `status = 'completed'`, `completed_at = NOW()`, `reviewed_at`, `reviewed_by`.  
   - Optionally notify user that their data has been deleted.
5. **Admin rejects**: Set `status = 'rejected'`, optional `internal_notes`. No data is deleted. Optionally notify user with a generic message.

**Rule:** Data is **never** deleted automatically; it is deleted **only after admin review and explicit acceptance** of the request.

### 15.4 API Contract

| Endpoint | Who | Behavior |
|----------|-----|----------|
| `POST /api/data-deletion-request` | User | Body: `{ email, name?, reason? }`. Creates row with `status = 'pending'`. Returns success + confirmation message. |
| Dashboard (internal) | Admin only | List/approve/reject requests; on approve, backend runs deletion then sets `status = 'completed'`. |

### 15.5 Retention of Request Records

Keep `data_deletion_requests` rows for compliance and audit (who requested, when, whether approved/rejected/completed). Do not expose this table to the public; only admins see it.

---

## 16. Service & Sub-Service Visit Analytics

### 16.1 Purpose

Track how many times each service and sub-service page is visited so you can analyze and measure which offerings get the most interest.

### 16.2 What Is Recorded

- **Service page** (e.g. `/en/services/dental`): one view counted for that service (row with `service_id`, `sub_service_id = NULL`, `view_date = today`).
- **Sub-service page** (e.g. `/en/services/dental/veneers`): one view counted for that sub-service (row with `service_id`, `sub_service_id`, `view_date = today`).
- Stored as **daily aggregates** in `service_page_views` (view_date, view_count) to keep storage small and queries fast.

### 16.3 Dashboard (Analytics)

- **Per service**: Total visits (all time or date range); optionally list sub-services under it with their own totals.
- **Per sub-service**: Total visits; which service it belongs to.
- **Date filter**: Last 7 days, last 30 days, custom range — sum `view_count` for the selected period.
- **Use**: Compare which services/sub-services are most visited; inform content, SEO, or commercial focus.

### 16.4 Recording a Visit

- Frontend: when a service or sub-service page loads, call an endpoint (e.g. `POST /api/track-view`) with `service_id` and optionally `sub_service_id`, or record server-side on page render.
- **Backend:** Do **not** use a single `ON CONFLICT (service_id, sub_service_id, view_date)` — that constraint is invalid when `sub_service_id IS NULL` (PostgreSQL NULL uniqueness). Use the **two separate partial-index upserts** from §18 Fix 1: one for service-only pages (`sub_service_id` NULL, conflict on `(service_id, view_date) WHERE sub_service_id IS NULL`), one for sub-service pages (conflict on `(service_id, sub_service_id, view_date) WHERE sub_service_id IS NOT NULL`).
- No need to store visitor identity for this metric; one count per page load (or per session if you deduplicate).

---

## 17. Strategic Validation — Safety Nets & Definition of Done

### 17.1 Minor Risks & Required Safety Nets

| Risk | Problem | Mitigation |
|------|---------|------------|
| **Race conditions in analytics (§5.9)** | High traffic can cause DB contention when many users increment `view_count` at once. | Use **atomic UPSERT** only: `INSERT ... ON CONFLICT (...) DO UPDATE SET view_count = service_page_views.view_count + 1`. Optionally batch updates via a background worker (e.g. Redis) every 1–5 minutes instead of per click. |
| **Asset handling (§5.6)** | Absolute URLs in DB can cause Mixed Content (HTTP vs HTTPS). | Store **relative paths** or use a dedicated **Image CDN** (Cloudinary/Imgix) for URLs; normalize to HTTPS in app or CDN config. |
| **Chatwoot "ghosting" (§2.4)** | Appending a new script on every token change causes double widgets; `reset()` may run before script loads. | Use a **loading state**: don’t call `reset()` or inject until `window.$chatwoot` (or script load) is ready; verify widget is ready before calling methods. |

### 17.2 Critical Production Check — "Final 4" (Definition of Done)

| # | Check | Rule |
|---|-------|------|
| 1 | **No direct deletion** | Use `deleted_at` (soft delete) everywhere for services/sub_services (§5.3, §5.4). Never hard-delete live content; historical data matters for medical tourism. |
| 2 | **RTL/LTR layout mirroring** | Use logical CSS properties (e.g. `ms-4` instead of `ml-4` in Tailwind) so switching locale to Arabic doesn’t break layout. |
| 3 | **Privacy linkage** | Data Deletion Request (§6.7) **must** be reachable from the **footer on every page** (Google/Apple transparency and store requirements). |
| 4 | **Token format validation** | Enforce alphanumeric check (§4.14) so admins cannot paste a full URL into the Chatwoot token field (would break the widget). |

### 17.3 Edge Cases (Engineering Implementation)

Before coding, ensure these implementation details are in place:

| Edge case | Risk | Fix |
|-----------|------|-----|
| **Translation API caching** | `GET /api/translations?locale=ar` on every page load can over-tax the DB. | Cache heavily (Next.js `unstable_cache`, ISR, or Redis). Specify TTL (e.g. 5–60 min). **Invalidate cache** when an admin updates a translation in the dashboard, otherwise changes won't appear until TTL expires. |
| **Analytics DB locks (§5.9)** | Many concurrent users hitting the same service page can cause row-level write locks on the upsert. | For early/moderate traffic, atomic UPSERT is fine. If traffic spikes, move increments to a memory store (e.g. Redis) and flush to PostgreSQL every 5 minutes. |
| **Image optimization** | Admins uploading raw 5MB+ images will hurt site speed and SEO. | Enforce size limits on the dashboard upload endpoint, and/or route uploads through an image CDN (Cloudinary, AWS Serverless Image Handler) that resizes/optimizes before saving the URL. |
| **Rate limiting (hard blocker)** | `POST /api/comments`, `POST /api/data-deletion-request`, and **`POST /api/track-view`** are unauthenticated; bots can flood moderation, deletion table, or **inflate analytics**. | Add rate limiting: comments (e.g. 5/10 min), deletion (e.g. 2/hour), **track-view (e.g. 60/min per IP)**. **Required before go-live.** See §18 Fix 2. |

---

## 18. Implementation Checklist — Concrete Fixes (Priority Order)

Execute these before go-live. Effort and must-have status below.

### Fix 1: NULL uniqueness in analytics (Hard blocker) — ~15 min

**If table already exists**, drop the broken constraint then add partial indexes:

```sql
ALTER TABLE service_page_views
  DROP CONSTRAINT IF EXISTS service_page_views_service_id_sub_service_id_view_date_key;

CREATE UNIQUE INDEX idx_spv_service_only
  ON service_page_views (service_id, view_date)
  WHERE sub_service_id IS NULL;

CREATE UNIQUE INDEX idx_spv_sub_service
  ON service_page_views (service_id, sub_service_id, view_date)
  WHERE sub_service_id IS NOT NULL;
```

**Upsert logic** — use two separate statements (PostgreSQL `ON CONFLICT` must target one index):

- **Service-only page:**  
  `INSERT INTO service_page_views (id, service_id, sub_service_id, view_date, view_count)  
  VALUES (gen_random_uuid(), $1, NULL, CURRENT_DATE, 1)  
  ON CONFLICT (service_id, view_date) WHERE sub_service_id IS NULL  
  DO UPDATE SET view_count = service_page_views.view_count + 1`

- **Sub-service page:**  
  `INSERT INTO service_page_views (id, service_id, sub_service_id, view_date, view_count)  
  VALUES (gen_random_uuid(), $1, $2, CURRENT_DATE, 1)  
  ON CONFLICT (service_id, sub_service_id, view_date) WHERE sub_service_id IS NOT NULL  
  DO UPDATE SET view_count = service_page_views.view_count + 1`

### Fix 2: Rate limiting on public endpoints (Hard blocker) — ~30 min

- **Comments:** `POST /api/comments` — e.g. **5 requests per 10 minutes per IP** (`Ratelimit.slidingWindow(5, '10 m')`).
- **Data deletion:** `POST /api/data-deletion-request` — use a **stricter limit** (deletion is low-frequency): e.g. **2 requests per hour per IP** (`Ratelimit.slidingWindow(2, '1 h')`). Do not copy-paste the comments limit; spell this out in code so the deletion endpoint has its own limiter.
- **Track-view (analytics):** `POST /api/track-view` — **must** be rate-limited or a single script can hit every service page in a loop and inflate analytics. Use a **light cap**, e.g. **60 requests per minute per IP** (`Ratelimit.slidingWindow(60, '1 m')`). Return 429 when exceeded.
- Return 429 when limit exceeded; apply limiters in the respective route handlers.
- **Honeypot:** Add a hidden form field (e.g. `name="website"`, `tabIndex={-1}`, hidden via CSS) to comment and data-deletion forms. In the API, if the field is filled, return 200 with no side effect (silent reject for bots).

### Fix 3: Comment table — `service_id` required — ~5 min

- Schema: `service_id NOT NULL`; no CHECK. If table exists:  
  `ALTER TABLE comments DROP CONSTRAINT IF EXISTS comments_check;`  
  `ALTER TABLE comments ALTER COLUMN service_id SET NOT NULL;`

### Fix 4: Comments — ON DELETE RESTRICT — ~10 min

- Replace CASCADE with RESTRICT on `comments.service_id` and `comments.sub_service_id` so hard-deleting a service/sub-service fails when comments exist.

### Fix 5: Chatwoot script injection (no double widget) — ~30 min

- Inject script **once** (e.g. check `document.getElementById('chatwoot-sdk')`). Use `chatwoot:ready` event if available; otherwise poll for `window.$chatwoot` before calling `setCustomAttributes`. See §6.3 and §2.4.

### Fix 6: Hero image uniqueness at DB level — ~5 min

- `CREATE UNIQUE INDEX idx_sub_service_images_hero ON sub_service_images (sub_service_id) WHERE is_hero_image = true;`  
  (Already in migration §5.6; ensure applied.)

### Fix 7: `reviewed_by` as FK — ~10 min (before PDPL audit)

- When `admin_users` (or `auth.users`) exists:  
  `ALTER TABLE data_deletion_requests ADD COLUMN reviewed_by UUID REFERENCES admin_users(id) ON DELETE SET NULL;`  
  (Or reference `auth.users(id)` if using Supabase Auth.)

### Fix 8: Translation cache invalidation — ~20 min (post-launch ok)

- When saving a translation in the dashboard, call `revalidateTag(\`translations-${locale}\`)` (Next.js). Use `unstable_cache(..., { tags: [\`translations-${locale}\`], revalidate: 3600 })` in the translations API so cache is busted on save.

### Priority summary

| Fix | Effort | Must before launch |
|-----|--------|--------------------|
| 1. NULL unique index (analytics) | 15 min | Yes |
| 2. Rate limiting + honeypot | 30 min | Yes |
| 3. Comment `service_id` NOT NULL | 5 min | Yes |
| 4. ON DELETE RESTRICT (comments) | 10 min | Recommended |
| 5. Chatwoot script injection | 30 min | Recommended |
| 6. Hero image DB index | 5 min | Recommended |
| 7. `reviewed_by` FK | 10 min | Before PDPL audit |
| 8. Translation cache invalidation | 20 min | Post-launch ok |

---

## 19. Sub-Service Timeline (Steps)

### 19.1 Purpose

For each sub-service (e.g. Veneers, IVF), the admin can define a **timeline of steps** (e.g. Consultation → Preparation → Treatment → Follow-up). Each step has a **title**, **slug**, **time** label, and **image**. This gives patients a clear “what happens when” and builds trust.

### 19.2 Admin Workflow

- When adding or editing a **sub-service**, the dashboard shows a **Timeline / Steps** section.
- **Add step**: Enter title (EN, AR), slug (unique per sub-service), time label (e.g. "Day 1", "Week 2", "2–3 hours"), and image (upload or URL). Set order (e.g. 1, 2, 3).
- **Edit / reorder / delete** steps. All of this is done by the admin; no public submission.

### 19.3 Public Display

- On the sub-service page, render the steps in order as a timeline (vertical or horizontal). Show localized title, time label, and image per step. Use slug for anchor links if needed (e.g. `#consultation`).

---

## 20. Doctors & Cost Calculator (Business Add-ons)

### 20.1 Doctors (Trust Building)

- **Doctors table:** Stores doctor profiles (name EN/AR, specialty, bio, image, experience years), with **soft delete** (`deleted_at`) for audit and historical procedure association. Admin manages doctors and links them to sub-services via **doctor_sub_services** (many-to-many).
- **Dashboard:** CRUD for doctors; when editing a sub-service, assign one or more doctors. When editing a doctor, assign one or more sub-services. When listing doctors for a sub-service, filter through **active sub-services only** (`sub_services.deleted_at IS NULL`) so doctors for retired procedures are not shown (§5.6c).
- **Frontend:** On each sub-service page, list linked doctors (photo, name, specialty, short bio, experience). Use **WebP** for images and **lazy loading** (e.g. Next.js `<Image loading="lazy" />`); see §6.5 for image rendering.

### 20.2 Cost Calculator (Indicative Comparison)

- **No separate table:** Add optional fields on `sub_services`: **avg_cost_uae**, **avg_cost_home_country**, plus **currency metadata** (`cost_uae_currency` default `AED`, `cost_home_currency` ISO 4217), and optional **`cost_notes`** + **`cost_last_updated_at`**.
- **Frontend:** Show an indicative comparison using the stored currency codes (no hardcoding): “Average in UAE: X {cost_uae_currency}” vs “Average in [home country]: Y {cost_home_currency}”. Display `cost_notes[locale]` and/or “Last updated” from `cost_last_updated_at` to improve trust. Optional: simple calculator (e.g. “Estimated savings”).
- **Performance:** Images (gallery, doctors, steps) — use **WebP** and **Lazy Loading** site-wide to keep load times low (§6.5).

---

## 21. SEO Ops: Sitemap, Robots, and Search

### 21.1 `sitemap.xml` (dynamic)

- Generate a sitemap that includes:
  - `/{locale}/services`
  - `/{locale}/services/{serviceSlug}`
  - `/{locale}/services/{serviceSlug}/{subServiceSlug}`
- Ensure the sitemap includes **all active** content only (filter `deleted_at IS NULL`).
- If you generate per-locale sitemaps (recommended), also generate a sitemap index.

### 21.2 `robots.txt`

- Allow crawling of public pages; disallow dashboard routes (e.g. `/admin`, `/dashboard`, `/api/admin/*`).

### 21.3 Lightweight search (optional, high value)

- Provide a simple public search to help patients find procedures/doctors quickly:
  - Search services/sub-services by localized names/keywords.
  - Search doctors by name/specialty and link to their related sub-services.
- Implementation options:
  - V1 / Early stage: Add `pg_trgm` extension and use GIN trigram indexes on searchable name columns (e.g., `ILIKE '%query%'`) to prevent full table scans.
  - Scale: add Postgres full-text search or external search later.

---

## 22. Operational Readiness (Production)

- **Backups**: daily automated DB backups + retention (e.g. 14–30 days). Test restore monthly.
- **Migrations**: store migrations in git; run in CI/CD with a pre-deploy step; keep a rollback plan (or forward-fix plan) documented.
- **Constraints & validation**: enforce strict validation on admin inputs (tokens, slugs, currency ISO 4217). Add DB constraints gradually once data is clean.
- **Monitoring**: alert on spikes in `POST /api/track-view` 429s (bot traffic) and on error rates in comment/deletion endpoints.
