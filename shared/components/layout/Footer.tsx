import Link from 'next/link';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || '';

interface FooterProps {
    locale: string;
}

export function Footer({ locale }: FooterProps) {
    const isRtl = locale === 'ar';
    const privacyLabel = locale === 'ar' ? 'سياسة الخصوصية وحذف البيانات' : 'Privacy & Data Deletion';
    const homeLabel = locale === 'ar' ? 'الرئيسية' : 'Home';
    const servicesLabel = locale === 'ar' ? 'الخدمات' : 'Services';

    return (
        <footer
            style={{
                marginTop: 'auto',
                padding: '2rem 1.5rem',
                borderTop: '1px solid var(--border)',
                background: 'var(--muted)',
                textAlign: 'center',
                fontSize: '0.9rem',
                color: 'var(--muted-foreground)',
            }}
        >
            <nav style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
                <Link href={`/${locale}`} style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 500 }}>
                    {homeLabel}
                </Link>
                <Link href={`/${locale}/services`} style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 500 }}>
                    {servicesLabel}
                </Link>
                <Link href={`/${locale}/privacy`} style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 500 }}>
                    {privacyLabel}
                </Link>
            </nav>
            <p style={{ margin: 0 }}>
                © {new Date().getFullYear()} Hito Health Tourism. {locale === 'ar' ? 'جميع الحقوق محفوظة.' : 'All rights reserved.'}
            </p>
        </footer>
    );
}
