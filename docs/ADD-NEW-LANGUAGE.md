# How to Add a New Language

Follow these steps to add a new locale (e.g. Turkish `tr`) to the Hito Health Tourism site.

---

## What happens to existing services and sub-services?

**Nothing breaks.** Existing services and sub-services keep working as before.

When you add a new language (e.g. Turkish):

1. **New locale URLs work right away**  
   After you add the locale to the DB and to `STATIC_LOCALES`, URLs like `/tr/services` and `/tr/services/dental/venner` work. All existing pages are reachable in the new locale.

2. **Names (service, sub-service, doctor)**  
   The app today only has columns for English and Arabic (`name_en`, `name_ar`). For any **other** locale (e.g. `tr`), the app falls back to **English** (`name_en`) until you:
   - Add a column for the new language (e.g. `name_tr`) via a migration, and
   - Update the app to use it (e.g. a helper that picks `name_tr` when locale is `tr`), and
   - Optionally fill in the new name in the dashboard for each service/sub-service/doctor.

   So: **old services and sub-services keep showing; they just show in English** on the new locale until you add and fill the new name column. You can do that gradually (e.g. only for some services at first).

3. **JSONB fields (meta_title, meta_description, cost_notes)**  
   These already support any locale key. The app uses `getLocalizedField(field, locale)` which falls back to **English** if the key for the new locale is missing. So:
   - Existing data does not need to change.
   - On `/tr/...`, if you have not added `"tr"` to the JSONB, the site shows the **English** value.
   - When you are ready, you can add `"tr": "..."` in the dashboard per service/sub-service; no migration needed.

**Summary:** Add the new language → existing content is still there and visible in the new locale in English (or in the new language where you have filled it). You can translate and add names over time; nothing is required upfront for old content.

---

## 1. Register the locale in the database

Insert a row into the `locales` table so the system knows the language exists:

```sql
INSERT INTO locales (code, name, is_rtl, is_active, "order")
VALUES ('tr', 'Türkçe', false, true, 3)
ON CONFLICT (code) DO NOTHING;
```

- **code**: Short locale code (e.g. `tr`, `fr`, `de`). Use 2–5 characters.
- **name**: Display name in that language (e.g. "Türkçe", "French").
- **is_rtl**: `true` for right-to-left (e.g. Arabic, Persian); `false` for LTR.
- **is_active**: `true` to show in UI and sitemap.
- **order**: Sort order (e.g. 3 for third language).

You can run this via psql, TablePlus, DBeaver, or any Postgres client connected to your app database.

---

## 2. Update app config (required)

The app uses a **static list** of locale codes for routing and sitemaps. You must add the new code in **one place**:

**File: `shared/lib/i18n.ts`**

- Add the new code to **`STATIC_LOCALES`**:

  ```ts
  export const STATIC_LOCALES = ['en', 'ar', 'tr'] as const;
  ```

- If the language is **RTL**, add it to **`RTL_LOCALES`**:

  ```ts
  export const RTL_LOCALES = new Set(['ar', 'he', 'fa', 'ur', 'tr']);  // add only if RTL
  ```

After this, URLs like `/tr`, `/tr/services`, `/tr/privacy` will work and the sitemap will include the new locale.

---

## 3. Dashboard: Translations tab

**File: `app/dashboard/translations/page.tsx`**

The Translations page has a locale switcher. Add the new code to the list of buttons, e.g.:

```tsx
{['en', 'ar', 'tr'].map(l => (
```

Then in the dashboard go to **Translations**, switch to the new locale, and add (or copy from EN) keys/values so the UI shows in that language.

---

## 4. (Optional) Service/sub-service/doctor names in the new language

Content names (services, sub-services, doctors) use **per-language columns**: `name_en`, `name_ar`, etc. To show names in the new language you need a **schema migration** that adds a column for the new locale.

Example for Turkish:

```sql
-- Run as hito_admin / with migration privileges
ALTER TABLE services       ADD COLUMN IF NOT EXISTS name_tr VARCHAR(255);
ALTER TABLE sub_services  ADD COLUMN IF NOT EXISTS name_tr VARCHAR(255);
ALTER TABLE doctors       ADD COLUMN IF NOT EXISTS name_tr VARCHAR(255);
-- Optional: GIN index for search (if you use name_tr in search)
-- CREATE INDEX IF NOT EXISTS idx_services_name_tr_gin ON services USING gin(name_tr gin_trgm_ops);
```

Then:

- Use **`getLocalizedName(entity, locale)`** from `shared/lib/i18n.ts` in pages that show service/sub-service/doctor names. It returns `name_<locale>` when present, otherwise `name_en`, so once the column and data exist, the new language will show without further code changes.
- In **Dashboard → Services / Sub-Services / Doctors**, update the forms to show a field (or tab) for the new language and save into `name_tr`. If the form already uses a generic “localized name” pattern (e.g. JSONB or keyed by locale), add the new key there instead.
- **Meta and JSONB fields** (`meta_title`, `meta_description`, `cost_notes`, etc.) already support any locale key (e.g. `"tr": "..."`), so no schema change is needed for those; just fill them in the dashboard.

---

## 5. Middleware (dashboard redirect)

**File: `middleware.ts`**

The redirect that sends `/en/dashboard` to `/dashboard` is driven by `STATIC_LOCALES`. Once you add the new locale in step 2, no change is needed here; `/tr/dashboard` will redirect to `/dashboard` automatically.

---

## Checklist

| Step | Action |
|------|--------|
| 1 | Insert new row into `locales` table |
| 2 | Add locale code to `STATIC_LOCALES` in `shared/lib/i18n.ts` |
| 2b | If RTL, add to `RTL_LOCALES` in `shared/lib/i18n.ts` |
| 3 | Add locale to the Translations page locale switcher in `app/dashboard/translations/page.tsx` |
| 4 | (Optional) Run migration adding `name_<locale>` columns; update dashboard forms to edit them |
| 5 | No change needed; middleware uses `STATIC_LOCALES` |

After deployment, the new language will be available at `/{locale}/...` (e.g. `/tr/services`) and in the sitemap. Use the Translations dashboard to complete UI strings for the new locale.
