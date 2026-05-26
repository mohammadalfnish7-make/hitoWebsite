import { getServices } from '@/features/services';
import { getLocalizedField } from '@/shared/lib/i18n';
import { PublicChatwoot } from '@/shared/components/chatwoot/PublicChatwoot';
import Link from 'next/link';
import type { Metadata } from 'next';
import { getCachedLocales } from '@/features/locales';
import { getCachedTranslations } from '@/features/translations';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://hitouae.com';

interface Props {
    params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { locale } = await params;
    const locales = await getCachedLocales();
    const languages: Record<string, string> = {};
    for (const loc of locales) {
        languages[loc.code] = `${SITE_URL}/${loc.code}/services`;
    }
    const translations = await getCachedTranslations(locale);

    return {
        title: translations['services.meta_title'] || 'Our Services — Hito Health Tourism',
        description: translations['services.meta_desc'] || 'Explore our premium health tourism services in the UAE.',
        alternates: { canonical: `${SITE_URL}/${locale}/services`, languages },
    };
}

export default async function ServicesListPage({ params }: Props) {
    const { locale } = await params;
    const services = await getServices();
    const translations = await getCachedTranslations(locale);
    const t = (key: string, fallback: string) => translations[key] || fallback;

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
            <PublicChatwoot locale={locale} />
            <h1 style={{ fontSize: '2.5rem', fontWeight: 700, marginBottom: '0.5rem', textAlign: 'start' }}>
                {t('services.title', 'Our Services')}
            </h1>
            <p style={{ textAlign: 'start', color: 'var(--muted-foreground)', marginBottom: '3rem', fontSize: '1.1rem' }}>
                {t('services.subtitle', 'Discover our premium health tourism services in the UAE')}
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.5rem' }}>
                {services.map((service) => (
                    <Link
                        key={service.id}
                        href={`/${locale}/services/${service.slug}`}
                        style={{
                            display: 'block',
                            background: 'var(--muted)',
                            borderRadius: '16px',
                            padding: '2rem',
                            border: '1px solid var(--border)',
                            textDecoration: 'none',
                            color: 'inherit',
                            transition: 'all 0.2s ease',
                        }}
                    >
                        <h2 style={{ fontSize: '1.35rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                            {getLocalizedField(service.names, locale) || (locale === 'ar' ? service.name_ar || service.name_en : service.name_en || service.name_ar)}
                        </h2>
                        {service.description && (
                            <p style={{ color: 'var(--muted-foreground)', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '1rem' }}>
                                {service.description.slice(0, 150)}{service.description.length > 150 ? '...' : ''}
                            </p>
                        )}
                        <span style={{
                            color: 'var(--primary)',
                            fontSize: '0.9rem',
                            fontWeight: 500,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem'
                        }}>
                            {t('services.learn_more', 'Learn more')} →
                        </span>
                    </Link>
                ))}
            </div>

            {services.length === 0 && (
                <p style={{ textAlign: 'center', color: 'var(--muted-foreground)', padding: '3rem' }}>
                    {t('services.empty', 'No services available yet.')}
                </p>
            )}
        </div>
    );
}
