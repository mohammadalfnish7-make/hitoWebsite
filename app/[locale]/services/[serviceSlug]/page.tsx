import { getServiceBySlug } from '@/features/services';
import { getSubServicesByServiceId } from '@/features/sub-services';
import { getVisibleComments } from '@/features/comments';
import { CommentsSection } from '@/features/comments';
import { TrackPageView } from '@/features/analytics';
import { resolveToken } from '@/features/chatwoot';
import { PublicChatwoot } from '@/shared/components/chatwoot/PublicChatwoot';
import { getLocalizedField } from '@/shared/lib/i18n';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { getCachedTranslations } from '@/features/translations';
import { getCachedLocales } from '@/features/locales';

interface Props {
    params: Promise<{ locale: string; serviceSlug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { locale, serviceSlug } = await params;
    const service = await getServiceBySlug(serviceSlug);
    if (!service) return { title: 'Not Found' };

    const locales = await getCachedLocales();
    const languages: Record<string, string> = {};
    for (const loc of locales) {
        languages[loc.code] = `/${loc.code}/services/${serviceSlug}`;
    }

    return {
        title: getLocalizedField(service.meta_title, locale) || getLocalizedField(service.names, locale),
        description: getLocalizedField(service.meta_description, locale) || service.description || '',
        alternates: { languages },
    };
}

export default async function ServiceDetailPage({ params }: Props) {
    const { locale, serviceSlug } = await params;
    const service = await getServiceBySlug(serviceSlug);
    if (!service) notFound();

    const subServices = await getSubServicesByServiceId(service.id);
    const initialComments = await getVisibleComments(service.id, undefined);
    const translations = await getCachedTranslations(locale);
    const t = (key: string, fallback: string) => translations[key] || fallback;

    const name = getLocalizedField(service.names, locale);
    const chatwootToken = resolveToken(undefined, service.chatwoot_website_token);

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
            <TrackPageView serviceId={service.id} />
            <PublicChatwoot locale={locale} token={chatwootToken} serviceSlug={serviceSlug} />
            {/* Breadcrumb */}
            <nav style={{ marginBottom: '2rem', fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>
                <Link href={`/${locale}`} style={{ color: 'var(--primary)' }}>{t('breadcrumb.home', 'Home')}</Link>
                {' / '}
                <Link href={`/${locale}/services`} style={{ color: 'var(--primary)' }}>{t('breadcrumb.services', 'Services')}</Link>
                {' / '}
                <span>{name}</span>
            </nav>

            <h1 style={{ fontSize: '2.5rem', fontWeight: 700, marginBottom: '1rem' }}>{name}</h1>
            {service.description && (
                <p style={{ fontSize: '1.1rem', color: 'var(--muted-foreground)', lineHeight: 1.7, maxWidth: '800px', marginBottom: '3rem' }}>
                    {service.description}
                </p>
            )}

            {/* Sub-services */}
            {subServices.length > 0 && (
                <section>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1.5rem' }}>
                        {t('service.available_treatments', 'Available Treatments')}
                    </h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' }}>
                        {subServices.map(sub => (
                            <Link
                                key={sub.id}
                                href={`/${locale}/services/${serviceSlug}/${sub.slug}`}
                                style={{
                                    display: 'block',
                                    background: 'var(--muted)',
                                    borderRadius: '16px',
                                    overflow: 'hidden',
                                    border: '1px solid var(--border)',
                                    textDecoration: 'none',
                                    color: 'inherit',
                                    transition: 'all 0.2s ease',
                                }}
                            >
                                {sub.main_image_url && (
                                    <div style={{ width: '100%', height: '180px', background: `url(${sub.main_image_url}) center/cover` }} />
                                )}
                                <div style={{ padding: '1.5rem' }}>
                                    <h3 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                                        {getLocalizedField(sub.names, locale)}
                                    </h3>
                                    {sub.avg_cost_uae && (
                                        <p style={{ color: 'var(--primary)', fontWeight: 600, fontSize: '0.9rem' }}>
                                            {t('service.from', 'From')} {sub.avg_cost_uae} {sub.cost_uae_currency || 'AED'}
                                        </p>
                                    )}
                                </div>
                            </Link>
                        ))}
                    </div>
                </section>
            )}

            <CommentsSection
                serviceId={service.id}
                locale={locale}
                initialComments={initialComments}
            />
        </div>
    );
}
