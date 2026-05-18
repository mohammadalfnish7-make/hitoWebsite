import { unstable_cache } from 'next/cache';
import { getTranslations } from './queries/translations.queries';

/**
 * Cached translation fetcher per locale.
 * Invalidate on admin update: revalidateTag(`translations-${locale}`) and optionally revalidateTag('translations').
 */
export function getCachedTranslations(locale: string) {
    return unstable_cache(
        () => getTranslations(locale),
        ['translations', locale],
        {
            tags: [`translations-${locale}`, 'translations'],
            revalidate: 3600,
        }
    )();
}
