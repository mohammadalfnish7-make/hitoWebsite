'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useState, useCallback } from 'react';

interface HeaderProps {
    locale: string;
}

export function Header({ locale }: HeaderProps) {
    const router = useRouter();
    const pathname = usePathname();
    const [query, setQuery] = useState('');

    const handleSearch = useCallback(
        (e: React.FormEvent) => {
            e.preventDefault();
            const q = query.trim();
            if (q.length >= 2) {
                router.push(`/${locale}/search?q=${encodeURIComponent(q)}`);
            }
        },
        [locale, query, router]
    );

    const homeLabel = locale === 'ar' ? 'الرئيسية' : 'Home';
    const servicesLabel = locale === 'ar' ? 'الخدمات' : 'Services';
    const privacyLabel = locale === 'ar' ? 'الخصوصية' : 'Privacy';
    const searchPlaceholder = locale === 'ar' ? 'بحث خدمات، علاجات، أطباء...' : 'Search services, treatments, doctors...';

    return (
        <header
            style={{
                borderBottom: '1px solid var(--border)',
                background: 'var(--background)',
                padding: '0.75rem 1.5rem',
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1rem',
            }}
        >
            <Link
                href={`/${locale}`}
                style={{
                    fontSize: '1.25rem',
                    fontWeight: 700,
                    color: 'var(--foreground)',
                    textDecoration: 'none',
                    letterSpacing: '-0.02em',
                }}
            >
                Hito Health
            </Link>

            <nav style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
                <Link
                    href={`/${locale}`}
                    style={{
                        color: pathname === `/${locale}` ? 'var(--primary)' : 'var(--muted-foreground)',
                        textDecoration: 'none',
                        fontWeight: 500,
                        fontSize: '0.9rem',
                    }}
                >
                    {homeLabel}
                </Link>
                <Link
                    href={`/${locale}/services`}
                    style={{
                        color: pathname?.startsWith(`/${locale}/services`) ? 'var(--primary)' : 'var(--muted-foreground)',
                        textDecoration: 'none',
                        fontWeight: 500,
                        fontSize: '0.9rem',
                    }}
                >
                    {servicesLabel}
                </Link>
                <Link
                    href={`/${locale}/privacy`}
                    style={{
                        color: pathname === `/${locale}/privacy` ? 'var(--primary)' : 'var(--muted-foreground)',
                        textDecoration: 'none',
                        fontWeight: 500,
                        fontSize: '0.9rem',
                    }}
                >
                    {privacyLabel}
                </Link>

                <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.25rem' }}>
                    <input
                        type="search"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder={searchPlaceholder}
                        minLength={2}
                        aria-label={searchPlaceholder}
                        style={{
                            padding: '0.5rem 0.75rem',
                            borderRadius: '8px',
                            border: '1px solid var(--border)',
                            background: 'var(--muted)',
                            color: 'var(--foreground)',
                            fontSize: '0.9rem',
                            minWidth: '180px',
                            outline: 'none',
                        }}
                    />
                    <button
                        type="submit"
                        style={{
                            padding: '0.5rem 1rem',
                            borderRadius: '8px',
                            border: 'none',
                            background: 'var(--primary)',
                            color: 'var(--primary-foreground)',
                            fontWeight: 500,
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                        }}
                    >
                        {locale === 'ar' ? 'بحث' : 'Search'}
                    </button>
                </form>
            </nav>
        </header>
    );
}
