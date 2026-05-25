/**
 * i18n helpers — locale detection and translation utilities.
 */
import { getCachedLocales } from '@/features/locales';

export const DEFAULT_LOCALE = 'en';

/**
 * Check if a locale code represents a right-to-left language.
 */
export async function isRtl(locale: string): Promise<boolean> {
    const locales = await getCachedLocales();
    const found = locales.find((l) => l.code === locale);
    return found?.is_rtl ?? false;
}

/**
 * Get the text direction for a locale.
 */
export async function getDirection(locale: string): Promise<'rtl' | 'ltr'> {
    return (await isRtl(locale)) ? 'rtl' : 'ltr';
}

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
 * Works with JSONB fields like names: { "en": "...", "ar": "..." }
 */
export function getLocalizedField(
    field: Record<string, string> | null | undefined,
    locale: string,
    fallbackLocale: string = DEFAULT_LOCALE
): string {
    if (!field) return '';
    return field[locale] || field[fallbackLocale] || Object.values(field)[0] || '';
}
