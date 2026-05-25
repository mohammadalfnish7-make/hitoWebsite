import { getDirection } from '@/shared/lib/i18n';
import { Footer } from '@/shared/components/layout/Footer';
import { Header } from '@/shared/components/layout/Header';
import { getCachedTranslations } from '@/features/translations';
import { getCachedLocales } from '@/features/locales';

interface LocaleLayoutProps {
    children: React.ReactNode;
    params: Promise<{ locale: string }>;
}

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
    const { locale } = await params;
    const dir = await getDirection(locale);
    const translations = await getCachedTranslations(locale);
    const locales = await getCachedLocales();

    return (
        <div dir={dir} lang={locale} style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#ffffff' }}>
            <Header locale={locale} translations={translations} activeLocales={locales} />
            <div style={{ flex: 1 }}>{children}</div>
            <Footer locale={locale} translations={translations} />
        </div>
    );
}
