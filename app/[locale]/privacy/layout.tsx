import type { Metadata } from 'next';
import { getCachedLocales } from '@/features/locales';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://hitouae.com';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    const locales = await getCachedLocales();
    const languages: Record<string, string> = {};
    for (const loc of locales) {
        languages[loc.code] = `${SITE_URL}/${loc.code}/privacy`;
    }
    return {
        title: 'Privacy & Data Deletion — Hito Health Tourism',
        description: 'Privacy policy and data deletion request. We comply with PDPL.',
        alternates: { canonical: `${SITE_URL}/${locale}/privacy`, languages },
    };
}

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
