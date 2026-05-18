# Hito Health Tourism — Implementation Plan

**Stack:** Next.js (App Router) + Auth.js v5 + Postgres  
**Deployment:** This plan assumes **Docker/VPS** (docker-compose, Dockerfile). If you deploy to a managed platform (Vercel, Railway, Render, Supabase, etc.), use that platform's Postgres and Redis; replace docker-compose with the platform's build/deploy steps — the rest of the plan is unchanged.  
**Spec:** [website-architecture-services-chatwoot.md](website-architecture-services-chatwoot.md)

---

## Stack & Key Dependencies

| Layer | Choice | Notes |
|-------|--------|-------|
| Framework | Next.js (App Router), React, TypeScript | Use App Router for routes, server components, and API routes. |
| Auth | Auth.js v5 | One `middleware.ts` at project root handles all auth guards; no per-route auth checks. |
| Database | PostgreSQL (Docker or managed) | Use `postgres` driver (e.g. `postgres` npm package); **singleton client only** (§1.2). |
| Validation | Zod | Request/response and env validation. |
| Rate limiting | Redis (Docker) + `@upstash/ratelimit` | Works with self-hosted Redis; three **separate** limiters for comments, deletion request, track-view. |
| Images | Cloudinary (preferred) or imgproxy (Docker) + S3-compatible storage | Store only URLs in DB; resize/optimize via CDN. |
| Observability | Structured logs + health endpoint | For Docker/VPS: basic uptime/health check and error logging. |

---

## Project Folder Structure

Set this up in **Phase 1** before writing any logic. Every file has a predetermined home.

**Core principle: feature-based, not layer-based.** A single `components/` or `lib/` at the root causes everyone to touch the same folders and creates merge conflicts. Isolate by feature so each feature owns its components, hooks, API logic, types, and DB queries. Only truly shared code (singleton DB client, auth, rate limiters, generic UI) lives in `shared/`.

**What to avoid:** One big `components/` (Button, Table, Form), one big `lib/` with all queries — changes in one feature break others.

**What to do:** Each feature has `components/`, `queries/` (or `api/` for route logic), `types.ts`, and an `index.ts` that defines the feature’s public API. Route handlers in `app/api/` stay thin: validate → rate limit → call feature.

### Exact structure (feature-isolated)

```
hito-health/
├── features/
│   ├── services/
│   │   ├── components/           # ServiceCard, ServiceList, ServiceForm (dashboard)
│   │   ├── queries/
│   │   │   └── services.queries.ts   # ALL SQL for services
│   │   ├── types.ts
│   │   └── index.ts                  # public API of this feature
│   │
│   ├── sub-services/
│   │   ├── components/           # CostCalculator, Gallery, TimelineSteps, SubServiceForm
│   │   ├── queries/
│   │   │   └── sub-services.queries.ts
│   │   ├── types.ts
│   │   └── index.ts
│   │
│   ├── doctors/
│   │   ├── components/           # DoctorCard, DoctorForm
│   │   ├── queries/
│   │   │   └── doctors.queries.ts
│   │   ├── types.ts
│   │   └── index.ts
│   │
│   ├── comments/
│   │   ├── components/           # CommentList, CommentForm (honeypot), ModerationTable
│   │   ├── queries/
│   │   │   └── comments.queries.ts
│   │   ├── types.ts
│   │   └── index.ts
│   │
│   ├── translations/
│   │   ├── components/           # TranslationEditor, CompletenessBar (% meter)
│   │   ├── queries/
│   │   │   └── translations.queries.ts
│   │   ├── cache.ts               # unstable_cache + revalidateTag
│   │   ├── types.ts
│   │   └── index.ts
│   │
│   ├── analytics/
│   │   ├── components/           # AnalyticsTable
│   │   ├── queries/
│   │   │   └── analytics.queries.ts   # dual upsert logic for service_page_views
│   │   ├── types.ts
│   │   └── index.ts
│   │
│   ├── chatwoot/
│   │   ├── components/
│   │   │   └── ChatwootWidget.tsx    # SPA-safe widget
│   │   ├── token.ts                  # resolveToken() logic
│   │   └── index.ts
│   │
│   ├── deletion-requests/
│   │   ├── components/           # DeletionRequestForm, DeletionRequestTable
│   │   ├── queries/
│   │   │   └── deletion.queries.ts
│   │   ├── types.ts
│   │   └── index.ts
│   │
│   ├── search/
│   │   ├── queries/
│   │   │   └── search.queries.ts
│   │   ├── types.ts
│   │   └── index.ts
│   │
│   └── audit/
│       ├── queries/
│       │   └── audit.queries.ts      # write-only, append-only
│       ├── types.ts
│       └── index.ts
│
├── shared/
│   ├── components/
│   │   ├── ui/                   # Button, Input, Table, Badge
│   │   ├── layout/               # Header, Footer, Sidebar
│   │   └── seo/                  # HreflangTags, MetaTags
│   └── lib/
│       ├── db.ts                 # Singleton client ONLY — no queries
│       ├── auth.ts
│       ├── rate-limit.ts         # 3 limiters (comments, deletion, track-view)
│       └── i18n.ts               # locale helpers, RTL
│
├── app/
│   ├── [locale]/
│   │   ├── page.tsx
│   │   ├── services/[serviceSlug]/page.tsx
│   │   ├── services/[slug]/[subSlug]/page.tsx
│   │   ├── privacy/page.tsx
│   │   └── layout.tsx
│   ├── dashboard/                # each section imports from features/
│   │   └── (services, sub-services, doctors, comments, deletion-requests, analytics, audit, locales)
│   └── api/
│       ├── services/route.ts     # thin: validate → call feature query
│       ├── services/[serviceSlug]/route.ts
│       ├── services/[serviceSlug]/sub-services/[subServiceSlug]/route.ts
│       ├── comments/route.ts
│       ├── track-view/route.ts
│       ├── data-deletion-request/route.ts
│       ├── translations/route.ts
│       ├── search/route.ts
│       ├── health/route.ts
│       └── admin/**/route.ts     # auth required
│           └── audit-log/route.ts
│
├── migrations/
│   ├── 001_platform_core_schema.sql
│   ├── 002_doctors_and_cost_calculator.sql
│   └── 003_admin_audit_doctor_ordering_cost_metadata.sql
├── middleware.ts                # auth + locale; matcher only /dashboard, /api/admin
├── docker-compose.yml
├── Dockerfile
└── .env.local
```

### Three rules that reduce conflicts

**Rule 1 — Features never import from each other directly.**  
If one feature needs data from another, the API or page composes them (e.g. page fetches both), or the API layer joins. Do not `import { getDoctorById } from '@/features/doctors'` inside `features/comments`.

**Rule 2 — Route handlers are thin; all logic lives in features.**  
`app/api/comments/route.ts` only: rate limit → validate body → honeypot check → call `createComment()` from `@/features/comments`. No SQL or business logic in the route file. Example:

```ts
// app/api/comments/route.ts
import { createComment } from '@/features/comments'
import { commentsLimiter } from '@/shared/lib/rate-limit'

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown'
  const { success } = await commentsLimiter.limit(ip)
  if (!success) return Response.json({ error: 'Too many requests' }, { status: 429 })
  const body = await req.json()
  if (body.website) return Response.json({ ok: true })  // honeypot
  const result = await createComment(body)
  return Response.json(result)
}
```

**Rule 3 — Each feature’s `index.ts` is its public contract.**  
Export only what other code needs; internal files (e.g. `queries/comments.queries.ts`) are not imported from outside the feature. Change internals without breaking other features. Example:

```ts
// features/comments/index.ts
export { createComment, getVisibleComments } from './queries/comments.queries'
export { CommentForm, CommentList, ModerationTable } from './components/...'
export type { Comment, CreateCommentInput } from './types'
```

### Query files

Put **all SQL for a feature** in `features/<name>/queries/<name>.queries.ts`. Route handlers and components call functions from the feature’s `index.ts`, which in turn use these queries. Benefits: one place to fix or add index hints; route handlers stay stable when the query changes; queries can be unit-tested without HTTP.

### Independent work tracks

Split work by feature so tracks don’t overlap:

| Track | Touches only |
|-------|--------------|
| Services + Sub-services | `features/services/`, `features/sub-services/`, their app routes |
| Doctors + Cost calculator | `features/doctors/`, cost parts of `features/sub-services/` |
| Comments + Moderation | `features/comments/`, dashboard comments section |
| i18n + Translations | `features/translations/`, locale layout, hreflang in `shared/components/seo/` |
| Analytics + Chatwoot | `features/analytics/`, `features/chatwoot/` |
| Auth + Admin shell | `middleware.ts`, `shared/lib/auth.ts`, dashboard layout |

The only shared files across tracks are `shared/lib/db.ts`, `shared/lib/rate-limit.ts`, `middleware.ts`, and `shared/components/ui/` — and those rarely change after Phase 1.

---

## Phase Overview

| Phase | Focus | Depends on |
|-------|--------|------------|
| 1 | Project init, DB singleton, Auth, CI/CD & image CDN, ops readiness | — |
| 2 | Migrations (order, 001/002/003); reviewed_by FK from day one | 1 |
| 3 | Rate limiting, public + admin APIs, translation caching | 1, 2 |
| 4 | Dashboard (sections, translation completeness meter) | 3 |
| 5 | Public pages, RTL, i18n, hreflang, comment form + honeypot | 3 |
| 6 | Chatwoot token resolution, SPA-safe widget, lead attribution | 3, 5 |
| 7 | Seven non-negotiable blockers sign-off | 1–6 |
| 8 | Launch checklist, post-launch optimization | 7 |

---

## Phase 1 — Foundation

### 1.1 Initialize Project

- Create Next.js project with TypeScript, ESLint, and app router.
- **Set up feature-based folder structure** (see "Project Folder Structure" above): create `features/` (services, sub-services, doctors, comments, translations, analytics, chatwoot, deletion-requests, audit) with empty `components/`, `queries/`, `types.ts`, `index.ts` per feature; create `shared/components/ui`, `shared/components/layout`, `shared/components/seo`, `shared/lib` with placeholder `db.ts`, `auth.ts`, `rate-limit.ts`, `i18n.ts`. ~2 hours; saves merge conflicts and untangling later.
- Add Docker setup:
  - `docker-compose.yml`: services `web` (Next.js), `db` (postgres:16), `redis` (rate limiting + optional analytics dedup). Optional: `nginx` for reverse proxy.
  - `.env.local` (and `.env.example`) with placeholders for `DATABASE_URL`, `DATABASE_ADMIN_URL`, `REDIS_URL`, `AUTH_SECRET`, `NEXT_PUBLIC_CHATWOOT_BASE_URL`, `NEXT_PUBLIC_DEFAULT_WEBSITE_TOKEN`, etc.
- **Note: All `NEXT_PUBLIC_` environment variables are visible in the client bundle — never put secrets here. `NEXT_PUBLIC_DEFAULT_WEBSITE_TOKEN` is intentionally public for the Chatwoot widget.**
- Decide image pipeline: Cloudinary (simplest) or self-hosted imgproxy + S3-compatible storage; document in README.

### 1.2 Database Connection (Critical Singleton)

**Rule:** Do NOT create a new `postgres()` instance per route handler. App Router creates many short-lived functions — without a singleton you will exhaust PostgreSQL connections under real traffic.

- Implement a single shared client in `shared/lib/db.ts` (e.g. cached `globalThis` or module-level singleton). Feature `queries/*.queries.ts` files import this client and run SQL; no queries live in `shared/lib/db.ts`.
- Use **only** `DATABASE_URL` in the app (see §1.5). Connection pooling: with a long-lived Node process (Docker/VPS), default pool size is fine; if you later use serverless, consider connection pooling (e.g. PgBouncer) and document.

### 1.3 Auth Setup (Auth.js v5)

- One `middleware.ts` at the project root handles **all** auth guards.
- Protect `/dashboard`, `/api/admin/*` (or equivalent) by checking session; redirect unauthenticated users or return 401 for API.
- **Matcher must be explicit** — if the matcher is too broad (e.g. `matcher: ['/:path*']`), middleware will intercept `/api/translations`, `/api/comments`, etc. and can return 401 to public visitors. Use a narrow matcher so only admin routes are guarded:
  ```ts
  matcher: ['/dashboard/:path*', '/api/admin/:path*']
  ```
- **Execution order: auth check runs first (for protected routes), then locale resolution applies to all routes.** This prevents redirect loops or silent auth bypasses when locale detection runs before auth.
- **Test:** Verify that unauthenticated visitors can call `GET /api/translations`, `GET /api/services`, `POST /api/comments`, etc. without 401. This is a subtle bug that only appears when a real visitor hits the site.
- No need to repeat auth checks in each route handler; middleware is the single gate.

### 1.4 Optional: Fully Dynamic Languages Strategy
- **Decision point:** The current schema uses `name_en` and `name_ar` columns per service. This is fast but adding Turkish requires a schema migration (`ALTER TABLE services ADD COLUMN name_tr VARCHAR(255)`).
- **If planned to expand heavily (5+ languages):** Replace `name_*` columns with a `service_translations` table (locale, service_id, name, description, meta). This adds JOIN complexity but prevents schema changes.
- **Default path:** Stick to `name_*` columns and document that adding new languages requires a trivial DB migration for adding the column, while everything else (UI strings) remains fully dynamic via the dashboard.

### 1.5 CI/CD & Image CDN

- **Docker/VPS:** Document build and run (e.g. `docker build`, `docker-compose up`). Optional: GitHub Actions to build image and deploy to VPS (SSH + docker pull/restart).
- **Migration Safety:** If CI/CD pipelines ever handle migrations, implement a human approval gate (e.g. GitHub Environments with required reviewers). Never run schema changes automatically — `DATABASE_ADMIN_URL` should only be used manually by trusted developers. Consider using a migration tool like `node-pg-migrate` or `flyway` with version locking to prevent concurrent schema modifications.
- **Images:** Configure Cloudinary or imgproxy; enforce max size and format (e.g. WebP) on upload in dashboard; store only final URLs in DB.

### 1.5 Database Least-Privilege Users (Run Once as Superuser)

Create two PostgreSQL users so the app never uses a superuser. Run this once (e.g. as `postgres` or cloud admin) after creating the database `hito_health`.

**Critical order:** Run the **ALTER DEFAULT PRIVILEGES** block **before** you run any migration as `hito_admin`. Default privileges apply only to objects that `hito_admin` creates *after* the command is run. If you run migrations first, tables created by `hito_admin` will not automatically grant to `hito_app` unless you set default privileges beforehand.

```sql
-- 1. Application user — what the app connects with at runtime (least privilege)
CREATE USER hito_app WITH PASSWORD 'strong-password-here';

GRANT CONNECT ON DATABASE hito_health TO hito_app;
GRANT USAGE ON SCHEMA public TO hito_app;
-- Note: on a fresh DB this grants on 0 tables (none exist yet).
-- The ALTER DEFAULT PRIVILEGES block below is what actually matters —
-- it ensures every table hito_admin creates in future auto-grants to hito_app.
-- Keep this line anyway for the case where you re-run setup on a DB that already has tables.
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO hito_app;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO hito_app;

-- 2. Admin/DDL user — for schema changes only (migrations, manual DDL)
CREATE USER hito_admin WITH PASSWORD 'different-strong-password';
GRANT ALL PRIVILEGES ON DATABASE hito_health TO hito_admin;
GRANT ALL PRIVILEGES ON SCHEMA public TO hito_admin;

-- 3. BEFORE running any migration as hito_admin: set default privileges so that
--    tables/sequences created by hito_admin in the future auto-grant to hito_app.
ALTER DEFAULT PRIVILEGES FOR ROLE hito_admin IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO hito_app;
ALTER DEFAULT PRIVILEGES FOR ROLE hito_admin IN SCHEMA public
  GRANT USAGE ON SEQUENCES TO hito_app;
```

Then run migrations (001, then 002/003 if needed) **as** `hito_admin` (using `DATABASE_ADMIN_URL`).

**Two connection strings in `.env.local`:**

| Variable | Used by | Purpose |
|----------|--------|---------|
| `DATABASE_URL` | Next.js app only | Runtime: `postgresql://hito_app:...@host:5432/hito_health` — least privilege (no DROP, no ALTER, no CREATE). |
| `DATABASE_ADMIN_URL` | You manually (psql, TablePlus, DBeaver, or migration runner) | Schema changes only; never used by the app. |

**Rule:** `shared/lib/db.ts` uses **only** `DATABASE_URL`. When running migrations or doing DDL, connect with `DATABASE_ADMIN_URL` (or your DB client as `hito_admin`).

### 1.6 Operational Readiness (Spec §22)

- **Health check:** Expose `GET /api/health` that checks **both** DB and Redis and returns per-component status. If Redis is down, all three rate limiters fail (app may crash or become unprotected). Return shape, e.g.:
  ```json
  { "db": "ok", "redis": "ok", "status": "healthy" }
  ```
  On failure, return 503 and indicate which component failed. Use for Docker/orchestrator liveness and monitoring.
- **Backups:** Document and automate daily DB backups with retention (e.g. 14–30 days); test restore at least once before launch.
- **Migrations:** Keep migrations in git; document rollback/forward strategy (e.g. no destructive 001; fix forward with 002/003).
- **Monitoring:** Alert on 429 spikes (rate-limit hits) and on API error rates for comment, deletion-request, and track-view endpoints; validate admin form inputs (tokens, slugs, currency codes) in dashboard.

---

## Phase 2 — Migrations

### 2.1 Migration Execution Order

Run migrations in order to satisfy foreign key dependencies. **Decision flow:**

- **Fresh database:** Run only `001_platform_core_schema.sql` (creates all core tables, indexes, seed locales). Then, if you need doctors/cost/audit in the same DB from day one, 001 already includes them; no 002/003 needed for a new install.
- **Existing database** (created before doctors/cost): Run `002_doctors_and_cost_calculator.sql` (adds doctors, doctor_sub_services, cost columns; safe IF NOT EXISTS / conditional ALTER).
- **Existing database** (created before admin_users/audit_log or doctor ordering/cost metadata): Run `003_admin_audit_doctor_ordering_cost_metadata.sql`.

**Table creation order** inside 001 (for reference): locales → translations → services → sub_services → sub_service_images → sub_service_steps → doctors → doctor_sub_services → admin_users → audit_log → comments → data_deletion_requests → service_page_views → seed data.

### 2.2 UUIDs — No Extension Needed

Migrations use `gen_random_uuid()`. This function has been **built into PostgreSQL core since v13**. With `postgres:16` (per this plan's Docker stack), no extension is required. Do not add `CREATE EXTENSION pgcrypto` — it is unnecessary and can confuse maintainers.

### 2.3 Key SQL Snippets

**Two partial unique indexes (`service_page_views`):**  
PostgreSQL does not treat NULL as equal in a unique constraint, so one `UNIQUE(service_id, sub_service_id, view_date)` would allow duplicate rows for service-only views (`sub_service_id IS NULL`). Use two partial indexes:

```sql
CREATE UNIQUE INDEX idx_spv_unique_service_only
  ON service_page_views (service_id, view_date)
  WHERE sub_service_id IS NULL;

CREATE UNIQUE INDEX idx_spv_unique_sub_service
  ON service_page_views (service_id, sub_service_id, view_date)
  WHERE sub_service_id IS NOT NULL;
```

**Dual upsert logic for analytics:**  
Use two separate statements (each `ON CONFLICT` targets one index):

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

### 2.4 Migration Tasks

- [ ] Create DB and run user setup (§1.5) once — **including ALTER DEFAULT PRIVILEGES before any migration**.
- [ ] Run `001_platform_core_schema.sql` (fresh DB) or `002`/`003` as needed for existing DBs, **as** `hito_admin`.
- [ ] Ensure `data_deletion_requests.reviewed_by` is **UUID REFERENCES admin_users(id)** from day one in the schema (no string placeholder); required for PDPL audit. If 001 uses a string, fix it before first deploy.
- [ ] Verify tables and indexes: `service_page_views` partial indexes; `translations(locale, key)` composite index; **`idx_doctor_sub_services_one_primary`** on `doctor_sub_services(sub_service_id) WHERE is_primary = true` (spec §5.6c — prevents two doctors marked primary for same sub-service).
- [ ] **Add `CREATE EXTENSION IF NOT EXISTS pg_trgm` and GIN trigram indexes on searchable name columns (e.g. `services.name_en`, `sub_services.name_en`, `doctors.name_en`) in 001_platform_core_schema.sql.** Required for Phase 5 search to avoid full table scans on go-live.
- [ ] **Add updated_at triggers in 001_platform_core_schema.sql unconditionally** (required for sitemap lastmod — all content created before Phase 5 must have auto-updating timestamps):

```sql
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_services_updated_at
  BEFORE UPDATE ON services
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_sub_services_updated_at
  BEFORE UPDATE ON sub_services
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

- [ ] **Ensure audit_log.actor_admin_id uses ON DELETE RESTRICT (not SET NULL) for PDPL compliance**, **and** store admin email/name in metadata JSONB as snapshot at write time. This provides both enforcement (prevents admin deletion if they have audit entries) and permanent human-readable attribution even if admin accounts are migrated.

- [ ] **Add partial unique index on data_deletion_requests to prevent duplicate pending requests**: `CREATE UNIQUE INDEX idx_deletion_pending_email ON data_deletion_requests(requester_email) WHERE status = 'pending';` This prevents spam while **explicitly allowing the same email to submit a new request after a previous one has been completed (status = 'completed')**.

- [ ] **Note: `sub_services` cascades from `services` on hard delete; `comments` uses RESTRICT.** This chain means hard-deleting a service with sub-services that have comments will fail — by design, to force soft deletes and preserve data integrity.

---

## Phase 3 — API Layer

### 3.1 Rate Limiting Setup (Hard Blocker)

Set up rate limiting in `shared/lib/rate-limit.ts` **before** writing any public POST handler. Three endpoints need **three different limiters** — do not share one limiter across all three.

| Endpoint | Limiter (example) | Return |
|----------|--------------------|--------|
| `POST /api/comments` | 5 requests per 10 minutes per identifier (e.g. IP) | 429 when exceeded |
| `POST /api/data-deletion-request` | 2 requests per hour per identifier | 429 when exceeded |
| `POST /api/track-view` | 60 requests per minute per identifier | 429 when exceeded |

Use a stable identifier (e.g. IP or hashed IP+user-agent). Implement with `@upstash/ratelimit` (or equivalent) and Redis from `docker-compose`. **Verify that `@upstash/ratelimit` is configured to handle Redis connection failures gracefully (e.g. fail open) so your health checks don't bring down the main API if Redis latency spikes.**

**Session-based dedup for track-view (recommended):** To prevent refresh loops inflating analytics (spec §6.8), implement per-session dedup so the same visitor does not increment the same page more than once per day (or per session). Define: (1) **Cookie name** e.g. `hito_sid` (Server-side generated, SameSite=Lax, Secure: process.env.NODE_ENV === 'production', configurable TTL e.g. 24h); (2) **Redis key** e.g. `hito:dedup:{session_id}:{service_id}:{sub_service_id|null}:{date}`; (3) Before upserting into `service_page_views`, check/set this key (e.g. SET NX with 24h TTL); only increment if key was not set. Add this to Phase 3 API tasks (§3.5). **When calling `POST /api/track-view` from the frontend, use `fetch` with `credentials: 'include'` to send the cookie.**

### 3.2 Public API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/translations?locale=` | Fetch translations for locale (cached; invalidate on admin update). |
| GET | `/api/services` | List active services (and sub-services). |
| GET | `/api/services/[serviceSlug]` | Service detail — **slug only** (no `[id]`); match spec URLs `/{locale}/services/dental`. |
| GET | `/api/services/[serviceSlug]/sub-services/[subServiceSlug]` | Sub-service detail by slug. |
| GET | `/api/comments?service_id=&sub_service_id=` | List **visible** comments only. |
| POST | `/api/comments` | Submit comment (body: author_name, author_email **(z.string().email() format validation)**, content, service_id, sub_service_id?, locale). Honeypot field: reject if filled. Rate limited. |
| POST | `/api/data-deletion-request` | Submit deletion request (email, name?, reason?). Honeypot; rate limited. **Handle unique constraint violation (23505 error) gracefully: catch and return 200 with message "A request for this email is already under review. We will process it and notify you." (matches honeypot pattern - silent success, no information leakage).** |
| POST | `/api/track-view` | Record page view (service_id, sub_service_id?). Rate limited; optional session dedup. |
| GET | `/api/search?q=` | Lightweight search across services, sub-services, and doctors by name. |

### 3.3 Admin API Endpoints (All Require Auth via middleware.ts)

All under e.g. `/api/admin/*` or `/dashboard/api/*`. Middleware returns 401 if not authenticated.

- Services: CRUD (list, create, update, soft-delete).
- Sub-services: CRUD under a service; gallery (sub_service_images); timeline steps (sub_service_steps); cost fields (avg_cost_uae, avg_cost_home_country, cost_uae_currency, cost_home_currency, cost_notes, cost_last_updated_at).
- Doctors: CRUD; link to sub-services (doctor_sub_services: display_order, is_primary).
- Comments: list pending/visible; approve/reject (set `is_visible`); **write to audit_log** (required for PDPL compliance).
- Data deletion requests: list; approve/reject/complete; **write to audit_log** (required for PDPL compliance).
- Analytics: query service_page_views (by service, sub_service, date range).
- Locales & translations: CRUD; revalidate translation cache on update.
- Audit log: GET `/api/admin/audit-log?entity_type=&actor_id=&from=&to=` (read-only; paginated)

### 3.4 Translation Caching (App Router Pattern)

- **Fetch:** Use Next.js `unstable_cache` with key including `locale`; TTL e.g. 5–60 minutes. In Next.js 14+ the function is still **named** `unstable_cache` in the codebase (import stays `import { unstable_cache } from 'next/cache'`); only the behavior is stable — do not expect a renamed API.
- **Invalidation:** When admin updates a translation, call `revalidateTag(\`translations-${locale}\`)` (or equivalent) so the next request gets fresh data. See spec §18 Fix 8.

### 3.5 API Tasks

- [ ] Implement `shared/lib/rate-limit.ts` with three separate limiters.
- [ ] Implement public endpoints with validation (Zod), rate limits, and honeypot for comments and deletion request; **slug-based** service/sub-service routes only.
- [ ] Implement **track-view session dedup**: cookie `hito_sid`, Redis key `hito:dedup:{session_id}:{page_key}:{date}`; only increment when key is newly set.
- [ ] Implement admin endpoints with auth enforced by middleware only; use `DATABASE_URL` (hito_app) only.
- [ ] Add translation cache + invalidation on admin translation save.

---

## Phase 4 — Dashboard

### 4.1 Dashboard Sections

- **Services:** List, add, edit, soft-delete; meta_title/meta_description per locale; Chatwoot token. **Before soft-deleting a service, check if it has any comments and either warn the admin or prevent the deletion (application-level check, since RESTRICT only applies to hard deletes).**
- **Sub-services:** Same under parent; main image; gallery (sub_service_images); timeline steps (sub_service_steps); cost calculator fields — **cost_notes** is JSONB (localized disclaimers `{"en":"...", "ar":"..."}`): use a **language tab or locale switcher** (same UI pattern as meta_title/meta_description), not a single text input; add an explicit task for this in §4.3. Chatwoot token.
- **Doctors:** CRUD; link to sub-services with display_order and optional is_primary. **Handle constraint violations gracefully when setting a second doctor as primary: perform a pre-check (SELECT) or detect the DB unique constraint error and show user-friendly message like 'This sub-service already has a primary doctor. Set [current primary name] as primary instead?'**
- **Comments:** List; filter by service/sub_service; approve/reject (is_visible).
- **Deletion requests:** List; review; approve (then perform deletion and set status completed) or reject.
- **Analytics:** Page views per service/sub_service; date range filter.
- **Audit log:** Read-only list of `audit_log` (who approved/rejected what, when; entity type and id). Required for PDPL compliance — admins must be able to see moderation and deletion-review actions. Spec §5.11.
- **Locales & translations:** Add locale; add/edit translations; translation completeness meter (§4.2). *Note: Locale CRUD (the `locales` table) lives inside `features/translations/` — no separate folder needed.*

### 4.2 Translation Completeness Meter (Spec §4.7)

- Show before publishing any locale. Block or warn if &lt; 100% for medical pages (e.g. service/sub-service names and descriptions). Use `is_verified` and key coverage to compute percentage; display in dashboard. **For JSONB fields like `cost_notes`, the logic must recursively check that each locale sub-key contains non-empty content (e.g. `{"en": ""}` should be considered incomplete), not just that the field exists.** **Completeness is measured against the English (or default locale) key set as the canonical baseline** — a locale is complete when it has translations for all keys that exist in English, not just all keys that exist in any locale.

### 4.3 Dashboard Tasks

- [ ] Build layout and nav for dashboard (auth-guarded).
- [ ] Implement each section (services, sub-services, doctors, comments, deletion requests, analytics, **audit log viewer**, locales).
- [ ] **cost_notes:** Sub-service form must have per-locale input for `cost_notes` (language tab or switcher), not a single text field.
- [ ] Add translation completeness meter and gate/warning for incomplete locales.

---

## Phase 5 — Public Frontend

### 5.1 Pages to Build

- Home: `/[locale]` or `/[locale]/page.tsx`.
- Services list: `/[locale]/services`.
- Service detail: `/[locale]/services/[serviceSlug]`.
- Sub-service detail: `/[locale]/services/[serviceSlug]/[subServiceSlug]` (with timeline steps, gallery, doctors, cost block if configured). **Cost block:** when cost fields exist, show **cost_last_updated_at** (e.g. "Last updated: March 2025") for trust; spec §20.2.
- Privacy + data deletion request: `/[locale]/privacy` (linked from footer on every page).

### 5.2 RTL Implementation (Definition of Done)

- Use logical CSS (e.g. `ms-4` instead of `ml-4` in Tailwind) so switching to Arabic (or other RTL locale) flips layout correctly.
- Set `dir="rtl"` on document or root when locale is RTL.
- Verify all public pages and dashboard (if localized) in Arabic with no broken alignment.

### 5.3 i18n Runtime Pattern

- URLs: `/{locale}/...` with locale from segment or middleware.
- Load translations via GET `/api/translations?locale=...` (cached).
- Fallback: if translation missing for a key, show default locale content; keep URL (no redirect). See spec §1.3, §3.

### 5.4 hreflang Tags (SEO — Non-Optional)

For every public page that has alternate locales, output:

```html
<link rel="alternate" hreflang="en" href="https://domain.com/en/..." />
<link rel="alternate" hreflang="ar" href="https://domain.com/ar/..." />
```

Include the current page and all other supported locales. Spec §3.7.

### 5.5 Comment Form (with Honeypot)

- Fields: author name, email, content; hidden honeypot (e.g. `website`) — if filled, return 200 and do not persist.
- Submit to `POST /api/comments` with service_id, optional sub_service_id, locale.
- Show confirmation message; explain that the comment will appear after moderation.

### 5.6 Public Frontend Tasks

- [ ] Implement all public pages with locale and RTL.
- [ ] Add hreflang to layout or per-page metadata.
- [ ] Implement comment form with honeypot; data deletion request form (with honeypot).
- [ ] Ensure privacy/deletion page linked from footer on every page.
- [ ] **Sitemap and robots.txt (spec §21):** Generate dynamic sitemaps. A single `sitemap.xml` with 3 locales × many services × sub-services can hit thousands of URLs — use a **sitemap index** (e.g. one sitemap per locale: `sitemap-en.xml`, `sitemap-ar.xml`) and reference them from `sitemap.xml`. Include **`lastmod`** from `updated_at` on services and sub_services so Google can prioritize recrawling updated content. Add `robots.txt` (allow public; disallow `/dashboard`, `/api/admin/*`). Required for medical tourism SEO from day one — do not defer to post-launch.
- [ ] On cost block: display `cost_last_updated_at` when present (e.g. "Last updated: March 2025").
- [ ] **Lightweight search (v1 scope, spec §21.3):** One public search endpoint (e.g. `GET /api/search?q=`) and one search box; search services, sub-services, and doctors by name/specialty (e.g. SQL `ILIKE`). Requires **pg_trgm** extension and GIN trigram indexes on searchable name columns (see Phase 2 migration tasks). v2 = full-text or external search; document as post-launch if needed.

---

## Phase 6 — Chatwoot

### 6.1 Token Resolution (Fail-Safe — Never Lose a Lead)

Resolve token in this order: `sub_service.chatwoot_website_token` → `service.chatwoot_website_token` → `DEFAULT_WEBSITE_TOKEN`. If the resolved value is missing or empty string, use `DEFAULT_WEBSITE_TOKEN`. Spec §2.3.

### 6.2 ChatwootWidget Component (SPA-Safe)

- Inject script **once** (check for existing script tag); do not append on every route change. **Add `g.onerror = () => { /* load DEFAULT_WEBSITE_TOKEN fallback or log error */ }` to handle script load failures and prevent silent lead loss.**
- On token or route change: call `window.$chatwoot.reset?.()` only when widget is ready. **Default to polling every 100ms for up to 5 seconds unless the team confirms their Chatwoot version supports the `chatwoot:ready` event (cleaner but not available in all versions).** After polling timeout or event, re-run SDK with new token. **Note: The spec §6.3 code example shows an infinite `setTimeout(setAttrs, 100)` loop — treat this as pseudocode; actual implementation must include a max retry count to prevent infinite polling.**
- After SDK run: set lead attribution via `setCustomAttributes`: service_slug, sub_service_slug, patient_locale, entry_url (use `window.location.href` so UTM params are preserved). Spec §2.4, §2.5, §6.3.

### 6.3 Chatwoot Tasks

- [ ] **Verify** self-hosted Chatwoot version for `chatwoot:ready` support; implement event listener if available, else polling (with max retry count).
- [ ] Implement ChatwootWidget with single script inject and reset-on-token-change.
- [ ] Pass token from server (from service/sub-service or default) and locale/entry_url for attribution.
- [ ] Smoke test: navigate service → sub-service and confirm widget shows correct inbox and no double widget.
- [ ] **PDPL Chatwoot Deletion**: Add a note or feature in the dashboard Data Deletion request flow to remind admins to manually purge the user's data from Chatwoot, or trigger a webhook to Chatwoot's API to delete the conversational data.

---

## Phase 7 — Production Blockers

### 7.1 The 7 Non-Negotiable Blockers (Spec §12)

Every item below must be signed off before launch. No exceptions.

| # | Blocker | Implementation |
|---|---------|----------------|
| 1 | Destroy Chatwoot instance on route change | §2.4, §6.3 — SPA-safe widget. |
| 2 | Add hreflang tags | §3.7 — All locale alternates on public pages. |
| 3 | Composite index `translations(locale, key)` | §5.2 — Sub-50ms translation API. |
| 4 | Localized meta_title, meta_description | §5.3, §5.4 — Per locale. |
| 5 | Rate limiting on public POST (comments, deletion, track-view) | §17.3, §18 Fix 2 — Three limiters; 429 when exceeded. |
| 6 | Partial unique indexes for service_page_views | §5.9 — No single UNIQUE on (service_id, sub_service_id, view_date); use two partial indexes. |
| 7 | Admin authentication | §4.0 — All dashboard/admin routes 401 when unauthenticated. |

### 7.2 Additional Hardening Tasks

- Soft delete only (deleted_at); no hard delete for services/sub_services. Spec §17.2.
- Token format validation in dashboard (regex §4.14); reject invalid tokens.
- Privacy: data deletion request reachable from footer; processing only after admin approval. Spec §15, §17.2.

---

## Phase 8 — Launch and Post-Launch

### 8.1 Launch Day Checklist

- All 7 production blockers cleared (Phase 7 sign-off).
- Smoke test: create service in dashboard → visit page → Chatwoot widget fires with correct inbox.
- Smoke test: submit comment → not visible on site → approve in dashboard → appears immediately.
- Smoke test: submit deletion request → approve in admin → data deleted → status = completed.
- Verify page views incrementing in analytics (visit service page, check dashboard).
- Arabic locale live: RTL layout correct on all pages.
- DEFAULT_WEBSITE_TOKEN fires on home + services list + privacy page.
- All admin routes return 401 without authentication.
- Docker deploy: health check and DB/Redis connectivity verified.

### 8.2 Post-Launch Optimization Tasks

- Analytics: optional batching of track-view via Redis and flush to DB every 5 min (spec §17.1).
- Search: v2 full-text or external search if needed (v1 ILIKE is in Phase 5).
- Performance: image optimization pipeline (WebP, lazy load); perf budget for LCP/CLS.

---

## Risk Register

| Risk | Impact | Mitigation |
|------|--------|------------|
| Rate-limit bypass or misconfiguration | Spam, inflated analytics, abuse | Three separate limiters; test 429 responses; monitor 429s and error rates. |
| Analytics inflation | Wrong business metrics | Rate limit track-view; optional session dedup; consider Redis batching. |
| Token misconfiguration | Wrong Chatwoot inbox or broken widget | Validate token format in dashboard; fail-safe to DEFAULT_WEBSITE_TOKEN. |
| Translation incompleteness | Half-translated medical pages | Translation completeness meter; block or warn before publishing locale. |
| Image bloat | Slow pages, poor SEO | Max size and format on upload; CDN resize/WebP; lazy load. |
| Admin auth drift | Unauthorized access to dashboard | Single middleware; no bypass; 401 for unauthenticated admin requests. |
| PDPL/audit | Compliance failure | Audit log for moderation and deletion actions; reviewed_by and audit_log; soft deletes. |

---

## Appendix A — Dependency Map

Each phase has hard dependencies. Starting a phase before its dependency is complete will cause rework.

```mermaid
flowchart LR
  P1[Phase 1]
  P2[Phase 2]
  P3[Phase 3]
  P4[Phase 4]
  P5[Phase 5]
  P6[Phase 6]
  P7[Phase 7]
  P8[Phase 8]
  P1 --> P2
  P2 --> P3
  P3 --> P4
  P3 --> P5
  P3 --> P6
  P4 --> P7
  P5 --> P7
  P6 --> P7
  P7 --> P8
```

---

## Appendix B — Migration File Index

| File | Purpose | When to run |
|------|---------|-------------|
| `001_platform_core_schema.sql` | Full core schema (locales, translations, services, sub_services, images, steps, doctors, doctor_sub_services, admin_users, audit_log, comments, data_deletion_requests, service_page_views, seed locales). Must include: `data_deletion_requests.reviewed_by` as **UUID REFERENCES admin_users(id)** (not string); `idx_doctor_sub_services_one_primary` on `doctor_sub_services(sub_service_id) WHERE is_primary = true`. **audit_log.actor_admin_id should use ON DELETE RESTRICT (not SET NULL) for PDPL compliance, and store admin email/name in metadata JSONB as snapshot at write time.** | Fresh DB. |
| `002_doctors_and_cost_calculator.sql` | Add doctors, doctor_sub_services, cost and currency columns on sub_services; conditional ALTERs. | Existing DB created before these features. |
| `003_admin_audit_doctor_ordering_cost_metadata.sql` | Add admin_users, audit_log; doctor_sub_services ordering/primary; cost_notes, cost_last_updated_at; conditional. | Existing DB missing these. |

---

## Appendix C — Spec Section Reference

| Topic | Spec reference |
|-------|----------------|
| Service/sub-service hierarchy, data model | §1 |
| Chatwoot token resolution, SPA, lead attribution | §2 |
| i18n, URLs, hreflang | §3 |
| Dashboard, auth, token workflow | §4 |
| DB schema (tables, indexes) | §5 |
| Frontend (pages, widget, comments, deletion, analytics) | §6 |
| Critical production constraints (7 blockers) | §12 |
| Visitor comments | §14 |
| Data deletion requests | §15 |
| Visit analytics | §16 |
| Rate limiting, edge cases | §17 |
| Implementation fixes (partial indexes, rate limits, etc.) | §18 |
| Timeline steps | §19 |
| Doctors & cost calculator | §20 |
| SEO (sitemap, robots, search) | §21 |
| Operational readiness | §22 |
