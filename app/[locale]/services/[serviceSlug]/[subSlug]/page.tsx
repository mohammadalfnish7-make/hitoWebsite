import { getServiceBySlug } from '@/features/services';
import { getSubServiceBySlug } from '@/features/sub-services';
import { getDoctorsBySubService } from '@/features/doctors';
import { getVisibleComments, CommentsSection } from '@/features/comments';
import { TrackPageView } from '@/features/analytics';
import { getLocalizedField } from '@/shared/lib/i18n';
import { resolveToken } from '@/features/chatwoot';
import { PublicChatwoot } from '@/shared/components/chatwoot/PublicChatwoot';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { getCachedLocales } from '@/features/locales';
import { getCachedTranslations } from '@/features/translations';

interface Props {
    params: Promise<{ locale: string; serviceSlug: string; subSlug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { locale, serviceSlug, subSlug } = await params;
    const service = await getServiceBySlug(serviceSlug);
    if (!service) return { title: 'Not Found' };
    const subService = await getSubServiceBySlug(service.id, subSlug);
    if (!subService) return { title: 'Not Found' };

    const locales = await getCachedLocales();
    const languages: Record<string, string> = {};
    for (const loc of locales) {
        languages[loc.code] = `/${loc.code}/services/${serviceSlug}/${subSlug}`;
    }

    return {
        title: getLocalizedField(subService.meta_title, locale) || getLocalizedField(subService.names, locale),
        description: getLocalizedField(subService.meta_description, locale) || subService.description || '',
        alternates: { languages },
    };
}

export default async function SubServiceDetailPage({ params }: Props) {
    const { locale, serviceSlug, subSlug } = await params;
    const service = await getServiceBySlug(serviceSlug);
    if (!service) notFound();
    const subService = await getSubServiceBySlug(service.id, subSlug);
    if (!subService) notFound();

    const doctors = await getDoctorsBySubService(subService.id);
    const initialComments = await getVisibleComments(service.id, subService.id);
    const chatwootToken = resolveToken(subService.chatwoot_website_token, service.chatwoot_website_token);
    
    const translations = await getCachedTranslations(locale);
    const t = (key: string, fallback: string) => translations[key] || fallback;

    const name = getLocalizedField(subService.names, locale);
    const serviceName = getLocalizedField(service.names, locale);

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
            <TrackPageView serviceId={service.id} subServiceId={subService.id} />
            {/* Breadcrumb */}
            <nav style={{ marginBottom: '2rem', fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>
                <Link href={`/${locale}`} style={{ color: 'var(--primary)' }}>{t('breadcrumb.home', 'Home')}</Link>
                {' / '}
                <Link href={`/${locale}/services`} style={{ color: 'var(--primary)' }}>{t('breadcrumb.services', 'Services')}</Link>
                {' / '}
                <Link href={`/${locale}/services/${serviceSlug}`} style={{ color: 'var(--primary)' }}>{serviceName}</Link>
                {' / '}
                <span>{name}</span>
            </nav>

            <h1 style={{ fontSize: '2.5rem', fontWeight: 700, marginBottom: '1rem' }}>{name}</h1>

            {/* Hero image */}
            {subService.main_image_url && (
                <div style={{ width: '100%', height: '400px', borderRadius: '16px', marginBottom: '2rem', background: `url(${subService.main_image_url}) center/cover`, boxShadow: '0 8px 30px rgba(0,0,0,0.12)' }} />
            )}

            {subService.description && (
                <p style={{ fontSize: '1.1rem', color: 'var(--muted-foreground)', lineHeight: 1.7, maxWidth: '800px', marginBottom: '2.5rem' }}>
                    {subService.description}
                </p>
            )}

            {/* Cost block */}
            {subService.avg_cost_uae && (
                <section style={{ background: 'var(--muted)', borderRadius: '16px', padding: '2rem', border: '1px solid var(--border)', marginBottom: '2.5rem' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>
                        {t('subservice.cost_estimate', 'Cost Estimate')}
                    </h2>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                        <div>
                            <p style={{ color: 'var(--muted-foreground)', fontSize: '0.85rem', marginBottom: '0.3rem' }}>
                                {t('subservice.in_uae', 'In UAE')}
                            </p>
                            <p style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--primary)' }}>
                                {subService.avg_cost_uae} {subService.cost_uae_currency || 'AED'}
                            </p>
                        </div>
                        {subService.avg_cost_home_country && (
                            <div>
                                <p style={{ color: 'var(--muted-foreground)', fontSize: '0.85rem', marginBottom: '0.3rem' }}>
                                    {t('subservice.in_your_country', 'In Your Country')}
                                </p>
                                <p style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--muted-foreground)' }}>
                                    {subService.avg_cost_home_country} {subService.cost_home_currency || 'USD'}
                                </p>
                            </div>
                        )}
                    </div>
                    {subService.cost_notes && (
                        <p style={{ fontSize: '0.85rem', color: 'var(--muted-foreground)', marginTop: '1rem', fontStyle: 'italic' }}>
                            {getLocalizedField(subService.cost_notes, locale)}
                        </p>
                    )}
                    {subService.cost_last_updated_at && (
                        <p style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', marginTop: '0.5rem' }}>
                            {t('subservice.last_updated', 'Last updated:')} {new Date(subService.cost_last_updated_at).toLocaleDateString(locale, { month: 'long', year: 'numeric' })}
                        </p>
                    )}
                </section>
            )}

            {/* Doctors */}
            {doctors.length > 0 && (
                <section style={{ marginBottom: '2.5rem' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>
                        {t('subservice.our_doctors', 'Our Doctors')}
                    </h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1.25rem' }}>
                        {doctors.map((doc: any) => (
                            <div key={doc.id} style={{ background: 'var(--muted)', borderRadius: '12px', padding: '1.5rem', border: '1px solid var(--border)', textAlign: 'center' }}>
                                {doc.image_url && (
                                    <div style={{ width: '80px', height: '80px', borderRadius: '50%', margin: '0 auto 1rem', background: `url(${doc.image_url}) center/cover`, border: '3px solid var(--primary)' }} />
                                )}
                                <h3 style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
                                    {getLocalizedField(doc.names, locale)}
                                </h3>
                                <p style={{ color: 'var(--muted-foreground)', fontSize: '0.85rem' }}>
                                    {getLocalizedField(doc.specialties, locale)}
                                </p>
                                {doc.is_primary && (
                                    <span style={{ display: 'inline-block', marginTop: '0.5rem', padding: '0.15rem 0.5rem', borderRadius: '4px', background: 'rgba(56,189,248,0.15)', color: '#38bdf8', fontSize: '0.75rem', fontWeight: 600 }}>
                                        {t('subservice.lead_doctor', 'Lead Doctor')}
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                </section>
            )}

            <CommentsSection
                serviceId={service.id}
                subServiceId={subService.id}
                locale={locale}
                initialComments={initialComments}
            />

            <PublicChatwoot
                locale={locale}
                token={chatwootToken}
                serviceSlug={serviceSlug}
                subServiceSlug={subSlug}
            />
        </div>
    );
}
