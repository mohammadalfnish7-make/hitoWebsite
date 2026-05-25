import { searchAll } from '@/features/search';
import { PublicChatwoot } from '@/shared/components/chatwoot/PublicChatwoot';
import Link from 'next/link';
import type { Metadata } from 'next';
import { getCachedLocales } from '@/features/locales';
import { getCachedTranslations } from '@/features/translations';
import { getLocalizedField } from '@/shared/lib/i18n';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://hitouae.com';

interface Props {
    params: Promise<{ locale: string }>;
    searchParams: Promise<{ q?: string }>;
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
    const { locale } = await params;
    const { q } = await searchParams;
    const locales = await getCachedLocales();
    const languages: Record<string, string> = {};
    for (const loc of locales) {
        languages[loc.code] = q ? `${SITE_URL}/${loc.code}/search?q=${encodeURIComponent(q)}` : `${SITE_URL}/${loc.code}/search`;
    }
    const translations = await getCachedTranslations(locale);

    return {
        title: q ? `${translations['search.title'] || 'Search'}: ${q} — Hito Health Tourism` : `${translations['search.title'] || 'Search'} — Hito Health Tourism`,
        description: translations['search.desc'] || 'Search our health tourism services, treatments, and doctors.',
        alternates: { canonical: q ? `${SITE_URL}/${locale}/search?q=${encodeURIComponent(q)}` : `${SITE_URL}/${locale}/search`, languages },
    };
}

export default async function SearchPage({ params, searchParams }: Props) {
    const { locale } = await params;
    const { q } = await searchParams;
    const query = (q || '').trim();

    const results = query.length >= 2 ? await searchAll(query) : [];
    
    const translations = await getCachedTranslations(locale);
    const t = (key: string, fallback: string) => translations[key] || fallback;

    const title = t('search.results_title', 'Search Results');
    const noQuery = t('search.no_query', 'Enter a search term (at least 2 characters)');
    const noResults = t('search.no_results', 'No results found');
    const serviceLabel = t('search.service_label', 'Service');
    const subServiceLabel = t('search.subservice_label', 'Treatment');
    const doctorLabel = t('search.doctor_label', 'Doctor');

    function getResultUrl(r: { type: string; slug: string; parent_slug?: string | null }) {
        if (r.type === 'service') return `/${locale}/services/${r.slug}`;
        if (r.type === 'sub_service' && r.parent_slug) return `/${locale}/services/${r.parent_slug}/${r.slug}`;
        return null;
    }

    // searchAll might still return name_en and name_ar depending on its implementation.
    // If we update searchAll to return names JSONB, this should use getLocalizedField.
    // Assuming searchAll returns raw rows from views or tables, we might have to adapt it.
    function displayName(r: any) {
        if (r.names) return getLocalizedField(r.names, locale);
        // Fallback for older searchAll implementation
        return locale === 'ar' && r.name_ar ? r.name_ar : r.name_en;
    }

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
            <PublicChatwoot locale={locale} />
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '1rem' }}>{title}</h1>

            {!query && <p style={{ color: 'var(--muted-foreground)' }}>{noQuery}</p>}

            {query.length > 0 && query.length < 2 && (
                <p style={{ color: 'var(--muted-foreground)' }}>{noQuery}</p>
            )}

            {query.length >= 2 && (
                <>
                    <p style={{ color: 'var(--muted-foreground)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                        {t('search.showing_results', 'Showing')} {results.length} {t('search.results_for', 'results for')}
                        &quot;<strong>{query}</strong>&quot;
                    </p>

                    {results.length === 0 ? (
                        <p style={{ color: 'var(--muted-foreground)' }}>{noResults}</p>
                    ) : (
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {results.map((r) => {
                                const url = getResultUrl(r);
                                const typeLabel = r.type === 'service' ? serviceLabel : r.type === 'sub_service' ? subServiceLabel : doctorLabel;
                                return (
                                    <li
                                        key={`${r.type}-${r.id}`}
                                        style={{
                                            padding: '1rem 1.25rem',
                                            background: 'var(--muted)',
                                            borderRadius: '12px',
                                            border: '1px solid var(--border)',
                                        }}
                                    >
                                        <span
                                            style={{
                                                display: 'inline-block',
                                                fontSize: '0.7rem',
                                                fontWeight: 600,
                                                textTransform: 'uppercase',
                                                color: 'var(--muted-foreground)',
                                                marginBottom: '0.25rem',
                                            }}
                                        >
                                            {typeLabel}
                                        </span>
                                        {url ? (
                                            <Link
                                                href={url}
                                                style={{
                                                    display: 'block',
                                                    fontSize: '1.05rem',
                                                    fontWeight: 600,
                                                    color: 'var(--primary)',
                                                    textDecoration: 'none',
                                                }}
                                            >
                                                {displayName(r)}
                                            </Link>
                                        ) : (
                                            <span style={{ display: 'block', fontSize: '1.05rem', fontWeight: 600 }}>
                                                {displayName(r)}
                                            </span>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </>
            )}
        </div>
    );
}
