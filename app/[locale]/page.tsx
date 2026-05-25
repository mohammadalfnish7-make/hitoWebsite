import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { PublicChatwoot } from '@/shared/components/chatwoot/PublicChatwoot';
import { getCachedTranslations } from '@/features/translations';
import { getCachedLocales } from '@/features/locales';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://hitouae.com';

interface HomePageProps {
    params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: HomePageProps): Promise<Metadata> {
    const { locale } = await params;
    const locales = await getCachedLocales();
    const languages: Record<string, string> = {};
    for (const loc of locales) {
        languages[loc.code] = `${SITE_URL}/${loc.code}`;
    }
    const translations = await getCachedTranslations(locale);
    const title = translations['home.meta_title'] || 'Hito Health Tourism — Premium Health Tourism in the UAE';
    const description = translations['home.meta_desc'] || 'World-class dental, cosmetic surgery, fertility treatments and more in Dubai, UAE. Trusted by thousands of international patients.';

    return {
        title,
        description,
        alternates: { canonical: `${SITE_URL}/${locale}`, languages },
    };
}

/* ──────────────────────────── images (Unsplash) ──────────────────────────── */

const IMAGES = {
    hero: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1920&q=80&auto=format',
    dental: 'https://images.unsplash.com/photo-1606811841689-23dfddce3e95?w=800&q=80&auto=format',
    cosmetic: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=800&q=80&auto=format',
    fertility: 'https://images.unsplash.com/photo-1631815588090-d4bfec5b1ccb?w=800&q=80&auto=format',
    ortho: 'https://images.unsplash.com/photo-1666214280557-f1b5022eb634?w=800&q=80&auto=format',
    whyUs: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=1200&q=80&auto=format',
    cta: 'https://images.unsplash.com/photo-1518684079-3c830dcef090?w=1920&q=80&auto=format',
};

/* ──────────────────────────── component ──────────────────────────── */

export default async function HomePage({ params }: HomePageProps) {
    const { locale } = await params;
    const translations = await getCachedTranslations(locale);
    const t = (key: string, fallback: string) => translations[key] || fallback;

    return (
        <>
            <PublicChatwoot locale={locale} />
            <main>
                {/* ═══════════ HERO ═══════════ */}
                <section style={styles.hero}>
                    <Image
                        src={IMAGES.hero}
                        alt="Dubai skyline"
                        fill
                        priority
                        style={{ objectFit: 'cover', objectPosition: 'center 40%' }}
                        sizes="100vw"
                    />
                    <div style={styles.heroOverlay} />
                    <div style={styles.heroContent}>
                        <span style={styles.heroBadge}>
                            {t('home.hero_badge', '🏥 Welcome to the UAE')}
                        </span>
                        <h1 style={styles.heroTitle}>
                            {t('home.hero_title', 'Your Health Journey Starts in Dubai')}
                        </h1>
                        <p style={styles.heroSub}>
                            {t('home.hero_sub', 'World-class medical treatments with personalized care in the heart of the UAE')}
                        </p>
                        <div style={styles.heroButtons}>
                            <Link href={`/${locale}/services`} style={styles.btnPrimary}>
                                {t('home.hero_btn_primary', 'Explore Our Services')}
                            </Link>
                            <Link href={`/${locale}/privacy`} style={styles.btnOutline}>
                                {t('home.hero_btn_outline', 'Learn More')}
                            </Link>
                        </div>
                    </div>
                </section>

                {/* ═══════════ STATS BAR ═══════════ */}
                <section style={styles.statsBar}>
                    {[
                        { num: '10,000+', label: t('home.stat1', 'Happy Patients') },
                        { num: '50+', label: t('home.stat2', 'Specialist Doctors') },
                        { num: '15+', label: t('home.stat3', 'Years of Experience') },
                        { num: '98%', label: t('home.stat4', 'Patient Satisfaction') },
                    ].map((s) => (
                        <div key={s.label} style={styles.statItem}>
                            <span style={styles.statNum}>{s.num}</span>
                            <span style={styles.statLabel}>{s.label}</span>
                        </div>
                    ))}
                </section>

                {/* ═══════════ SERVICES ═══════════ */}
                <section style={styles.section}>
                    <h2 style={styles.sectionTitle}>
                        {t('home.services_title', 'Our Medical Services')}
                    </h2>
                    <p style={styles.sectionSub}>
                        {t('home.services_sub', 'A comprehensive range of treatments delivered to the highest international standards')}
                    </p>
                    <div style={styles.servicesGrid}>
                        {[
                            {
                                img: IMAGES.dental,
                                title: t('home.service1_title', 'Dental Care'),
                                desc: t('home.service1_desc', 'Hollywood smile, implants, orthodontics & advanced treatments'),
                                icon: '🦷',
                            },
                            {
                                img: IMAGES.cosmetic,
                                title: t('home.service2_title', 'Cosmetic Surgery'),
                                desc: t('home.service2_desc', 'Latest techniques with natural, stunning results'),
                                icon: '✨',
                            },
                            {
                                img: IMAGES.fertility,
                                title: t('home.service3_title', 'Fertility Treatments'),
                                desc: t('home.service3_desc', 'Comprehensive fertility solutions with top success rates'),
                                icon: '💫',
                            },
                            {
                                img: IMAGES.ortho,
                                title: t('home.service4_title', 'Orthopedic Surgery'),
                                desc: t('home.service4_desc', 'Joint replacements & advanced sports medicine'),
                                icon: '🦴',
                            },
                        ].map((svc) => (
                            <Link
                                href={`/${locale}/services`}
                                key={svc.title}
                                style={styles.serviceCard}
                            >
                                <div style={styles.serviceImgWrap}>
                                    <Image
                                        src={svc.img}
                                        alt={svc.title}
                                        fill
                                        style={{ objectFit: 'cover' }}
                                        sizes="(max-width:768px) 100vw, 25vw"
                                    />
                                    <div style={styles.serviceImgOverlay} />
                                    <span style={styles.serviceIcon}>{svc.icon}</span>
                                </div>
                                <div style={styles.serviceBody}>
                                    <h3 style={styles.serviceTitle}>{svc.title}</h3>
                                    <p style={styles.serviceDesc}>{svc.desc}</p>
                                </div>
                            </Link>
                        ))}
                    </div>
                </section>

                {/* ═══════════ WHY CHOOSE US ═══════════ */}
                <section style={styles.whySection}>
                    <div style={styles.whyGrid}>
                        <div style={styles.whyImgWrap}>
                            <Image
                                src={IMAGES.whyUs}
                                alt="Luxury hotel in Dubai"
                                fill
                                style={{ objectFit: 'cover', borderRadius: '1.5rem' }}
                                sizes="(max-width:768px) 100vw, 50vw"
                            />
                        </div>
                        <div style={styles.whyContent}>
                            <h2 style={styles.sectionTitle}>
                                {t('home.why_title', 'Why Choose Dubai for Treatment?')}
                            </h2>
                            <div style={styles.featuresList}>
                                {[
                                    {
                                        icon: '🌟',
                                        title: t('home.why1_title', 'Internationally Accredited Doctors'),
                                        desc: t('home.why1_desc', 'Our team consists of top doctors certified by global institutions'),
                                    },
                                    {
                                        icon: '💰',
                                        title: t('home.why2_title', 'Competitive Pricing'),
                                        desc: t('home.why2_desc', 'Save up to 60% compared to Western countries with the same quality'),
                                    },
                                    {
                                        icon: '🏨',
                                        title: t('home.why3_title', 'All-Inclusive Packages'),
                                        desc: t('home.why3_desc', 'Luxury hotel stays, transfers, and post-treatment follow-ups'),
                                    },
                                    {
                                        icon: '🌍',
                                        title: t('home.why4_title', 'Multilingual Support'),
                                        desc: t('home.why4_desc', '24/7 support team in multiple languages'),
                                    },
                                ].map((f) => (
                                    <div key={f.title} style={styles.featureItem}>
                                        <span style={styles.featureIcon}>{f.icon}</span>
                                        <div>
                                            <h4 style={styles.featureTitle}>{f.title}</h4>
                                            <p style={styles.featureDesc}>{f.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                {/* ═══════════ CTA ═══════════ */}
                <section style={styles.ctaSection}>
                    <Image
                        src={IMAGES.cta}
                        alt="Dubai at night"
                        fill
                        style={{ objectFit: 'cover' }}
                        sizes="100vw"
                    />
                    <div style={styles.ctaOverlay} />
                    <div style={styles.ctaContent}>
                        <h2 style={styles.ctaTitle}>
                            {t('home.cta_title', 'Ready to Start Your Health Journey?')}
                        </h2>
                        <p style={styles.ctaSub}>
                            {t('home.cta_sub', 'Contact us today for a free consultation and a personalized treatment plan')}
                        </p>
                        <Link href={`/${locale}/services`} style={styles.ctaBtn}>
                            {t('home.cta_btn', 'Book Your Free Consultation')}
                        </Link>
                    </div>
                </section>
            </main>
        </>
    );
}

/* ──────────────────────────── styles ──────────────────────────── */

const styles: Record<string, React.CSSProperties> = {
    /* HERO */
    hero: {
        position: 'relative',
        height: '92vh',
        minHeight: '560px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    heroOverlay: {
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(180deg, rgba(0,20,40,0.55) 0%, rgba(0,20,40,0.78) 100%)',
        zIndex: 1,
    },
    heroContent: {
        position: 'relative',
        zIndex: 2,
        textAlign: 'center',
        maxWidth: '800px',
        padding: '0 1.5rem',
    },
    heroBadge: {
        display: 'inline-block',
        background: 'rgba(255,255,255,0.15)',
        backdropFilter: 'blur(8px)',
        borderRadius: '100px',
        padding: '0.5rem 1.25rem',
        fontSize: '0.95rem',
        fontWeight: 600,
        color: '#fff',
        marginBottom: '1.5rem',
        border: '1px solid rgba(255,255,255,0.2)',
    },
    heroTitle: {
        fontSize: 'clamp(2rem, 5vw, 3.5rem)',
        fontWeight: 800,
        color: '#fff',
        lineHeight: 1.15,
        marginBottom: '1.25rem',
        letterSpacing: '-0.02em',
    },
    heroSub: {
        fontSize: 'clamp(1rem, 2.2vw, 1.3rem)',
        color: 'rgba(255,255,255,0.85)',
        lineHeight: 1.6,
        marginBottom: '2rem',
    },
    heroButtons: {
        display: 'flex',
        gap: '1rem',
        justifyContent: 'center',
        flexWrap: 'wrap' as const,
    },
    btnPrimary: {
        display: 'inline-block',
        padding: '0.9rem 2rem',
        borderRadius: '12px',
        background: 'linear-gradient(135deg, #0ea5e9, #06b6d4)',
        color: '#fff',
        fontWeight: 700,
        fontSize: '1.05rem',
        textDecoration: 'none',
        boxShadow: '0 4px 20px rgba(14,165,233,0.4)',
        transition: 'transform 0.2s, box-shadow 0.2s',
    },
    btnOutline: {
        display: 'inline-block',
        padding: '0.9rem 2rem',
        borderRadius: '12px',
        background: 'rgba(255,255,255,0.1)',
        border: '2px solid rgba(255,255,255,0.4)',
        color: '#fff',
        fontWeight: 600,
        fontSize: '1.05rem',
        textDecoration: 'none',
        backdropFilter: 'blur(4px)',
    },

    /* STATS */
    statsBar: {
        display: 'flex',
        flexWrap: 'wrap' as const,
        justifyContent: 'center',
        gap: '2rem',
        padding: '2.5rem 1.5rem',
        background: 'linear-gradient(135deg, #0c4a6e, #0e7490)',
    },
    statItem: {
        display: 'flex',
        flexDirection: 'column' as const,
        alignItems: 'center',
        minWidth: '140px',
    },
    statNum: {
        fontSize: '2rem',
        fontWeight: 800,
        color: '#fff',
    },
    statLabel: {
        fontSize: '0.9rem',
        color: 'rgba(255,255,255,0.75)',
        marginTop: '0.25rem',
    },

    /* SECTION */
    section: {
        padding: '5rem 1.5rem',
        maxWidth: '1200px',
        margin: '0 auto',
    },
    sectionTitle: {
        fontSize: 'clamp(1.5rem, 3vw, 2.25rem)',
        fontWeight: 800,
        color: '#0f172a',
        textAlign: 'center' as const,
        marginBottom: '0.75rem',
    },
    sectionSub: {
        fontSize: '1.1rem',
        color: '#64748b',
        textAlign: 'center' as const,
        maxWidth: '600px',
        margin: '0 auto 3rem',
        lineHeight: 1.6,
    },

    /* SERVICE CARDS */
    servicesGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: '1.5rem',
    },
    serviceCard: {
        borderRadius: '1.25rem',
        overflow: 'hidden',
        background: '#fff',
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
        textDecoration: 'none',
        color: 'inherit',
        transition: 'transform 0.25s, box-shadow 0.25s',
    },
    serviceImgWrap: {
        position: 'relative' as const,
        width: '100%',
        height: '200px',
        overflow: 'hidden',
    },
    serviceImgOverlay: {
        position: 'absolute' as const,
        inset: 0,
        background: 'linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.35) 100%)',
        zIndex: 1,
    },
    serviceIcon: {
        position: 'absolute' as const,
        bottom: '12px',
        right: '12px',
        fontSize: '2rem',
        zIndex: 2,
        filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
    },
    serviceBody: {
        padding: '1.25rem',
    },
    serviceTitle: {
        fontSize: '1.15rem',
        fontWeight: 700,
        color: '#0f172a',
        marginBottom: '0.5rem',
    },
    serviceDesc: {
        fontSize: '0.92rem',
        color: '#64748b',
        lineHeight: 1.55,
    },

    /* WHY CHOOSE US */
    whySection: {
        padding: '5rem 1.5rem',
        background: '#f8fafc',
    },
    whyGrid: {
        maxWidth: '1200px',
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
        gap: '3rem',
        alignItems: 'center',
    },
    whyImgWrap: {
        position: 'relative' as const,
        width: '100%',
        height: '460px',
        borderRadius: '1.5rem',
        overflow: 'hidden',
        boxShadow: '0 8px 40px rgba(0,0,0,0.12)',
    },
    whyContent: {
        padding: '0',
    },
    featuresList: {
        display: 'flex',
        flexDirection: 'column' as const,
        gap: '1.5rem',
        marginTop: '2rem',
    },
    featureItem: {
        display: 'flex',
        gap: '1rem',
        alignItems: 'flex-start',
    },
    featureIcon: {
        fontSize: '1.75rem',
        flexShrink: 0,
        marginTop: '2px',
    },
    featureTitle: {
        fontSize: '1.05rem',
        fontWeight: 700,
        color: '#0f172a',
        marginBottom: '0.25rem',
    },
    featureDesc: {
        fontSize: '0.92rem',
        color: '#64748b',
        lineHeight: 1.55,
    },

    /* CTA */
    ctaSection: {
        position: 'relative' as const,
        padding: '6rem 1.5rem',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '400px',
    },
    ctaOverlay: {
        position: 'absolute' as const,
        inset: 0,
        background: 'linear-gradient(135deg, rgba(14,165,233,0.88), rgba(6,182,212,0.88))',
        zIndex: 1,
    },
    ctaContent: {
        position: 'relative' as const,
        zIndex: 2,
        textAlign: 'center' as const,
        maxWidth: '700px',
    },
    ctaTitle: {
        fontSize: 'clamp(1.5rem, 3.5vw, 2.5rem)',
        fontWeight: 800,
        color: '#fff',
        marginBottom: '1rem',
    },
    ctaSub: {
        fontSize: '1.1rem',
        color: 'rgba(255,255,255,0.88)',
        lineHeight: 1.6,
        marginBottom: '2rem',
    },
    ctaBtn: {
        display: 'inline-block',
        padding: '1rem 2.5rem',
        borderRadius: '14px',
        background: '#fff',
        color: '#0c4a6e',
        fontWeight: 700,
        fontSize: '1.1rem',
        textDecoration: 'none',
        boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
    },
};
