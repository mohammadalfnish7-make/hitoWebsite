import { unstable_cache } from 'next/cache';
import { getActiveLocales } from './queries/locales.queries';

/**
 * Cached active locales fetcher.
 * Invalidate on admin update: revalidateTag('locales').
 */
export function getCachedLocales() {
    return unstable_cache(
        () => getActiveLocales(),
        ['locales'],
        {
            tags: ['locales'],
            revalidate: 3600, // 1 hour
        }
    )();
}
