import { getDirection } from '@/shared/lib/i18n';
import { Footer } from '@/shared/components/layout/Footer';
import { Header } from '@/shared/components/layout/Header';

interface LocaleLayoutProps {
    children: React.ReactNode;
    params: Promise<{ locale: string }>;
}

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
    const { locale } = await params;
    const dir = getDirection(locale);

    return (
        <div dir={dir} lang={locale} style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#ffffff' }}>
            <Header locale={locale} />
            <div style={{ flex: 1 }}>{children}</div>
            <Footer locale={locale} />
        </div>
    );
}
