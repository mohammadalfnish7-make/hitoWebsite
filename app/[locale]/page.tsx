import type { Metadata } from 'next';
import { STATIC_LOCALES } from '@/shared/lib/i18n';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://hitouae.com';

interface HomePageProps {
    params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: HomePageProps): Promise<Metadata> {
    const { locale } = await params;
    const languages: Record<string, string> = {};
    for (const loc of STATIC_LOCALES) {
        languages[loc] = `${SITE_URL}/${loc}`;
    }
    return {
        title: 'Hito Health Tourism — Premium Health Tourism in the UAE',
        description: 'Premium health tourism services in the UAE. Dental, cosmetic surgery, fertility and more.',
        alternates: { canonical: `${SITE_URL}/${locale}`, languages },
    };
}

import { PublicChatwoot } from '@/shared/components/chatwoot/PublicChatwoot';

export default async function HomePage({ params }: HomePageProps) {
    const { locale } = await params;

    return (
        <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', background: '#ffffff', color: '#171717' }}>
            <PublicChatwoot locale={locale} />
            <h1 style={{ fontSize: '2.5rem', fontWeight: 700, marginBottom: '1rem' }}>
                Hito Health Tourism
            </h1>
            <p style={{ fontSize: '1.25rem', color: 'var(--muted-foreground)', textAlign: 'center', maxWidth: '600px' }}>
                Premium health tourism services in the UAE. Dental, cosmetic surgery, fertility and more.
            </p>
            <p style={{ marginTop: '1rem', color: 'var(--muted-foreground)' }}>
                Locale: <strong>{locale}</strong>
            </p>
        </main>
    );
}
