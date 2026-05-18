/**
 * i18n helpers — locale detection, RTL support, and translation utilities.
 */

export const DEFAULT_LOCALE = 'en';

export const RTL_LOCALES = new Set(['ar', 'he', 'fa', 'ur']);

/**
 * Check if a locale code represents a right-to-left language.
 */
export function isRtl(locale: string): boolean {
    return RTL_LOCALES.has(locale);
}

/**
 * Get the text direction for a locale.
 */
export function getDirection(locale: string): 'rtl' | 'ltr' {
    return isRtl(locale) ? 'rtl' : 'ltr';
}

/**
 * Supported locale codes. This is a runtime check;
 * the canonical list comes from the `locales` DB table.
 * This set is used for quick middleware validation.
 */
export const STATIC_LOCALES = ['en', 'ar'] as const;

/**
 * Extract locale from a URL pathname.
 * e.g. /ar/services/dental → 'ar'
 */
export function extractLocale(pathname: string): string {
    const segments = pathname.split('/').filter(Boolean);
    const firstSegment = segments[0]?.toLowerCase();

    if (firstSegment && firstSegment.length >= 2 && firstSegment.length <= 5) {
        return firstSegment;
    }

    return DEFAULT_LOCALE;
}

/**
 * Get a localized field value with fallback to default locale.
 * Works with JSONB fields like meta_title: { "en": "...", "ar": "..." }
 */
export function getLocalizedField(
    field: Record<string, string> | null | undefined,
    locale: string,
    fallbackLocale: string = DEFAULT_LOCALE
): string {
    if (!field) return '';
    return field[locale] || field[fallbackLocale] || '';
}

/**
 * Get display name for an entity that has name_en, name_ar, and optionally name_<locale>.
 * Use this for services, sub-services, doctors so that when you add a new language
 * (e.g. name_tr), existing code shows the right name without more changes.
 * Fallback order: name_<locale> → name_en.
 */
export function getLocalizedName(
    entity: { name_en: string; [key: string]: unknown },
    locale: string
): string {
    if (!entity?.name_en) return '';
    const key = `name_${locale}` as keyof typeof entity;
    const value = entity[key];
    if (typeof value === 'string' && value.trim()) return value;
    return entity.name_en;
}
