# Phase Implementation Audit

Audit of [implmenting plan .md](../implmenting%20plan%20.md) against the codebase.  
**Date:** 2025-03-07

---

## Phase 1 — Foundation ✅

| Item | Status | Notes |
|------|--------|-------|
| Next.js App Router, TypeScript, ESLint | ✅ | package.json |
| Feature-based folder structure | ✅ | features/, shared/ |
| Docker (web, db, redis) | ✅ | docker-compose.yml |
| DB singleton | ✅ | shared/lib/db.ts |
| Auth.js v5, middleware | ✅ | middleware.ts, shared/lib/auth.ts |
| Narrow matcher (dashboard, api/admin) | ✅ | Auth guards only admin routes |
| Health check (DB + Redis) | ✅ | GET /api/health |
| .env.example | ✅ | Placeholders documented |

---

## Phase 2 — Migrations ✅

| Item | Status | Notes |
|------|--------|-------|
| 001_platform_core_schema.sql | ✅ | All tables |
| reviewed_by UUID FK | ✅ | data_deletion_requests |
| Partial indexes service_page_views | ✅ | idx_spv_unique_service_only, idx_spv_unique_sub_service |
| translations(locale, key) composite index | ✅ | idx_translations_locale_key |
| idx_doctor_sub_services_one_primary | ✅ | Migration 001 |
| pg_trgm + GIN trigram indexes | ✅ | services, sub_services, doctors name_en |
| updated_at triggers | ✅ | services, sub_services, translations |
| audit_log ON DELETE RESTRICT | ✅ | actor_admin_id |
| idx_deletion_pending_email | ✅ | Partial unique on pending |
| sub_service_images, sub_service_steps tables | ✅ | Schema present |
| Seed admin user | ✅ | admin@hito.local |

---

## Phase 3 — API Layer ✅ (1 gap)

| Item | Status | Notes |
|------|--------|-------|
| Three rate limiters | ✅ | comments, deletion, track-view |
| Public endpoints (translations, services, comments, etc.) | ✅ | All present |
| POST /api/comments honeypot | ✅ | website field |
| POST /api/data-deletion-request 23505 handling | ✅ | Graceful 200 |
| track-view session dedup (cookie hito_sid, Redis) | ✅ | route.ts |
| Admin endpoints | ✅ | services, sub-services, doctors, comments, etc. |
| Translation cache + revalidateTag | ✅ | features/translations/cache.ts |
| **Frontend calls track-view** | ❌ | **Gap:** Service/sub-service pages never call POST /api/track-view. Analytics will not increment. |

---

## Phase 4 — Dashboard ⚠️ (gaps)

| Item | Status | Notes |
|------|--------|-------|
| Services CRUD, soft-delete | ✅ | |
| Comment check before soft-delete | ✅ | Admin API blocks if comments exist |
| **meta_title, meta_description per locale (services)** | ❌ | **Gap:** API supports it; dashboard form has no inputs. |
| Sub-services CRUD, cost_notes locale tabs | ✅ | |
| **Gallery (sub_service_images) UI** | ❌ | **Gap:** No dashboard UI to add/edit gallery images. Tables exist. |
| **Timeline steps (sub_service_steps) UI** | ❌ | **Gap:** No dashboard UI for steps. Tables exist. |
| Doctors CRUD, primary constraint handling | ✅ | API handles 23505 |
| Comments approve/reject, audit_log | ✅ | |
| Deletion requests, audit_log, PDPL note | ✅ | |
| Analytics, audit log viewer | ✅ | |
| Translations, completeness vs EN | ✅ | |
| Token validation (Chatwoot regex) | ✅ | Services + sub-services forms |

---

## Phase 5 — Public Frontend ⚠️ (gaps)

| Item | Status | Notes |
|------|--------|-------|
| Home, services list, service detail, sub-service detail | ✅ | |
| Privacy + deletion form | ✅ | |
| RTL (dir on layout) | ✅ | [locale] layout |
| hreflang (metadata.alternates) | ✅ | All public pages |
| Comment form + honeypot | ✅ | CommentsSection |
| Footer with privacy link | ✅ | |
| Sitemap, robots.txt | ✅ | app/sitemap.ts, app/robots.ts |
| cost_last_updated_at on cost block | ✅ | Sub-service page |
| Search box + results page | ✅ | Header, /search |
| **Gallery on sub-service page** | ❌ | **Gap:** Only main_image_url shown. sub_service_images not fetched/displayed. |
| **Timeline steps on sub-service page** | ❌ | **Gap:** sub_service_steps not fetched/displayed. |

---

## Phase 6 — Chatwoot ✅

| Item | Status | Notes |
|------|--------|-------|
| Token resolution (sub → service → default) | ✅ | features/chatwoot/token.ts |
| SPA-safe widget (single inject, reset on token change) | ✅ | ChatwootWidget |
| Max retry for setCustomAttributes | ✅ | 50 retries |
| Lead attribution (service_slug, etc.) | ✅ | setCustomAttributes |
| Widget on home, services list, privacy | ✅ | PublicChatwoot |
| Widget on service/sub-service detail | ✅ | With resolved token |
| PDPL Chatwoot deletion note | ✅ | Deletion requests dashboard |

---

## Phase 7 — Production Blockers ✅

| # | Blocker | Status |
|---|---------|--------|
| 1 | Destroy Chatwoot on route change | ✅ |
| 2 | hreflang tags | ✅ |
| 3 | translations(locale, key) index | ✅ |
| 4 | Localized meta | ✅ Schema; ⚠️ Services form missing inputs |
| 5 | Rate limiting | ✅ |
| 6 | Partial indexes analytics | ✅ |
| 7 | Admin auth | ✅ |
| Soft delete only | ✅ | |
| Token validation | ✅ | |
| Privacy link | ✅ | |

---

## Phase 8 — Launch ✅

| Item | Status |
|------|--------|
| Launch checklist doc | ✅ docs/LAUNCH-CHECKLIST.md |
| Smoke tests documented | ✅ |

---

## Summary: Gaps to Fix

| Priority | Gap | Phase | Effort |
|----------|-----|-------|--------|
| **High** | Frontend never calls POST /api/track-view — analytics never increment | 3 | Add TrackView client component on service/sub-service pages |
| **Medium** | meta_title, meta_description per locale in services dashboard form | 4 | Add EN/AR inputs to form; API already supports |
| **Medium** | Gallery (sub_service_images) — no dashboard UI, not shown on sub-service page | 4, 5 | Queries + dashboard form + public display |
| **Medium** | Timeline steps (sub_service_steps) — no dashboard UI, not shown on sub-service page | 4, 5 | Queries + dashboard form + public display |
| Low | Sitemap index (sitemap-en.xml, sitemap-ar.xml) for scale | 5 | Optional; single sitemap OK for small scale |

---

## Recommendation

1. **Fix track-view first** — Without it, analytics are non-functional.
2. Add meta_title/meta_description inputs to services dashboard (API ready).
3. Gallery and timeline steps can be added as a follow-up; schema exists.
