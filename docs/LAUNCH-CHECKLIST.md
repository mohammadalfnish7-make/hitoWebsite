# Hito Health Tourism — Launch Checklist

Use this checklist before go-live and on launch day. Aligned with [implmenting plan .md](../implmenting%20plan%20.md) Phase 7 & 8.

---

## Phase 7 — Production Blockers (Must Complete Before Launch)

| # | Blocker | Status | How to verify |
|---|---------|--------|----------------|
| 1 | **Destroy Chatwoot instance on route change** | ✅ | Navigate service → sub-service; confirm single widget and correct inbox. No double widget. |
| 2 | **Add hreflang tags** | ✅ | All public pages (home, services list, service detail, sub-service detail, privacy) set `metadata.alternates.languages` for en/ar. |
| 3 | **Composite index `translations(locale, key)`** | ✅ | In migration 001. Translation API &lt; 50ms at scale. |
| 4 | **Localized meta_title, meta_description** | ✅ | Services/sub-services use JSONB meta; dashboard allows per-locale input. |
| 5 | **Rate limiting on public POST** | ✅ | Comments (5/10m), deletion (2/h), track-view (60/min). Return 429 when exceeded. |
| 6 | **Partial unique indexes for service_page_views** | ✅ | Two partial indexes in 001; dual upsert in analytics feature. |
| 7 | **Admin authentication** | ✅ | Middleware guards `/dashboard`, `/api/admin`; 401 when unauthenticated. |

### Additional Hardening

- [x] **Soft delete only** — Services and sub-services use `deleted_at`; admin DELETE endpoints perform soft-delete.
- [x] **Token format validation** — Dashboard services and sub-services forms validate Chatwoot token regex (§4.14).
- [x] **Privacy** — Data deletion request linked from footer on every public page; processed only after admin approval.

---

## Phase 8 — Launch Day Checklist

### Pre-launch

- [x] All 7 production blockers implemented (see table above).
- [ ] **You:** `DATABASE_URL` uses least-privilege user (`hito_app`) in production; run user setup + migrations as `hito_admin` once.
- [ ] **You:** `AUTH_SECRET` set to a secure random string (min 32 chars).
- [ ] **You:** Production password: add `password_hash` to `admin_users` and verify in auth (no dev-only password).
- [ ] **You:** `NEXT_PUBLIC_SITE_URL` set to production domain for sitemap/robots/hreflang.

### Smoke tests

- [ ] Create a service in dashboard → visit `/{locale}/services/{slug}` → Chatwoot widget loads with correct inbox.
- [ ] Submit a comment on a service page → not visible on site → approve in dashboard → comment appears on refresh.
- [ ] Submit data deletion request → approve in admin → mark completed → data removed; confirm Chatwoot purge reminder.
- [ ] Visit a service page → check Analytics in dashboard → page view count increments (with session dedup).
- [ ] Arabic locale: RTL layout correct on all public pages.
- [ ] Home, services list, privacy: DEFAULT_WEBSITE_TOKEN (or service token) fires for Chatwoot.
- [ ] Unauthenticated request to `/api/admin/services` or `/dashboard` returns 401 or redirect to login.
- [ ] Docker: `GET /api/health` returns `{ "db": "ok", "redis": "ok", "status": "healthy" }`.

### Implemented (all phases)

- [x] Public search: header search box + `/[locale]/search?q=` results page (Phase 5).
- [x] Sub-services dashboard: full CRUD, cost fields, **cost_notes per locale** (EN/AR tabs), Chatwoot token validation (Phase 4).
- [x] Translation completeness vs **EN baseline**: dashboard shows “X% of EN keys translated and verified” for non-EN locales (Phase 4).
- [x] Translation cache: `revalidateTag(\`translations-${locale}\`)` on admin save; cache tagged per locale + global (Phase 3).
- [x] **Chatwoot on all public pages (Phase 8):** Home, Services list, Service detail, Sub-service detail, Privacy, Search each render `PublicChatwoot` with default or resolved token; lead attribution (service_slug, sub_service_slug, patient_locale, entry_url).

### Post-launch

- [ ] Monitor 429s and error rates on comment, deletion-request, track-view endpoints.
- [ ] Optional: batch track-view via Redis and flush to DB every 5 min (see spec §17.1).
- [ ] Optional: search v2 (full-text or external) if v1 ILIKE + pg_trgm is insufficient.

---

## Docker deploy

```bash
# Build and run (dev)
docker compose up -d --build

# Production: use docker-compose.prod.yml and set env vars
# docker compose -f docker-compose.prod.yml up -d --build
```

- Health check: `GET /api/health`
- Default admin (dev): `admin@hito.local` / `admin123` (seed in 001; change in production).

---

## Phases 1–8 status

| Phase | Status |
|-------|--------|
| 1 Foundation | ✅ Project, Docker, DB singleton, Auth, health, ops |
| 2 Migrations | ✅ 001 with partial indexes, triggers, pg_trgm, seed admin |
| 3 API layer | ✅ Rate limits, public/admin APIs, track-view dedup, translation cache |
| 4 Dashboard | ✅ All sections, completeness meter vs EN, cost_notes locale tabs, token validation, PDPL note |
| 5 Public frontend | ✅ Pages, RTL, hreflang, footer, comment form, sitemap, robots, search |
| 6 Chatwoot | ✅ SPA-safe widget, token resolution, lead attribution, on all public pages |
| 7 Production blockers | ✅ All 7 + additional hardening |
| 8 Launch | ✅ Checklist and smoke tests documented; env/deploy steps for you |
