import { searchAll } from '@/features/search';
import { PublicChatwoot } from '@/shared/components/chatwoot/PublicChatwoot';
import Link from 'next/link';
import type { Metadata } from 'next';
import { STATIC_LOCALES } from '@/shared/lib/i18n';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://hitouae.com';

interface Props {
    params: Promise<{ locale: string }>;
    searchParams: Promise<{ q?: string }>;
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
    const { locale } = await params;
    const { q } = await searchParams;
    const languages: Record<string, string> = {};
    for (const loc of STATIC_LOCALES) {
        languages[loc] = q ? `${SITE_URL}/${loc}/search?q=${encodeURIComponent(q)}` : `${SITE_URL}/${loc}/search`;
    }
    return {
        title: q ? `Search: ${q} — Hito Health Tourism` : 'Search — Hito Health Tourism',
        description: 'Search our health tourism services, treatments, and doctors.',
        alternates: { canonical: q ? `${SITE_URL}/${locale}/search?q=${encodeURIComponent(q)}` : `${SITE_URL}/${locale}/search`, languages },
    };
}

export default async function SearchPage({ params, searchParams }: Props) {
    const { locale } = await params;
    const { q } = await searchParams;
    const query = (q || '').trim();

    const results = query.length >= 2 ? await searchAll(query) : [];
    const title = locale === 'ar' ? 'نتائج البحث' : 'Search Results';
    const noQuery = locale === 'ar' ? 'أدخل كلمة بحث (حرفين على الأقل)' : 'Enter a search term (at least 2 characters)';
    const noResults = locale === 'ar' ? 'لا توجد نتائج' : 'No results found';
    const serviceLabel = locale === 'ar' ? 'خدمة' : 'Service';
    const subServiceLabel = locale === 'ar' ? 'علاج' : 'Treatment';
    const doctorLabel = locale === 'ar' ? 'طبيب' : 'Doctor';

    function getResultUrl(r: { type: string; slug: string; parent_slug?: string | null }) {
        if (r.type === 'service') return `/${locale}/services/${r.slug}`;
        if (r.type === 'sub_service' && r.parent_slug) return `/${locale}/services/${r.parent_slug}/${r.slug}`;
        return null;
    }

    function displayName(r: { name_en: string; name_ar?: string | null }) {
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
                        {locale === 'ar'
                            ? `عرض ${results.length} نتيجة لـ `
                            : `Showing ${results.length} results for `}
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
