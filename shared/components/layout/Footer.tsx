import Link from 'next/link';

interface FooterProps {
    locale: string;
    translations: Record<string, string>;
}

export function Footer({ locale, translations }: FooterProps) {
    const t = (key: string, fallback: string) => translations[key] || fallback;

    const privacyLabel = t('footer.privacy', 'Privacy & Data Deletion');
    const homeLabel = t('footer.home', 'Home');
    const servicesLabel = t('footer.services', 'Services');
    const copyrightLabel = t('footer.copyright', 'All rights reserved.');

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
                © {new Date().getFullYear()} Hito Health Tourism. {copyrightLabel}
            </p>
        </footer>
    );
}
