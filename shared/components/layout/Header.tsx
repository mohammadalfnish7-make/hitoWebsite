'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useState, useCallback, useRef, useEffect } from 'react';

interface HeaderProps {
    locale: string;
    translations: Record<string, string>;
    activeLocales: { code: string; name: string; is_rtl: boolean }[];
}

export function Header({ locale, translations, activeLocales }: HeaderProps) {
    const router = useRouter();
    const pathname = usePathname();
    const [query, setQuery] = useState('');
    const [langOpen, setLangOpen] = useState(false);
    const langRef = useRef<HTMLDivElement>(null);

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

    // Close lang dropdown on outside click
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (langRef.current && !langRef.current.contains(event.target as Node)) {
                setLangOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const t = (key: string, fallback: string) => translations[key] || fallback;

    const homeLabel = t('header.home', 'Home');
    const servicesLabel = t('header.services', 'Services');
    const privacyLabel = t('header.privacy', 'Privacy');
    const searchPlaceholder = t('header.search_placeholder', 'Search services, treatments, doctors...');
    const searchButton = t('header.search_button', 'Search');

    const currentLocaleObj = activeLocales.find((l) => l.code === locale);

    // Swap the locale prefix in the pathname
    const switchLanguage = (newLocale: string) => {
        if (newLocale === locale) return;
        const segments = pathname.split('/');
        // Assuming first segment after leading slash is the locale, e.g., /en/something
        if (segments[1] && activeLocales.some(l => l.code === segments[1])) {
            segments[1] = newLocale;
            router.push(segments.join('/'));
        } else {
            router.push(`/${newLocale}`);
        }
        setLangOpen(false);
    };

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
                position: 'sticky',
                top: 0,
                zIndex: 40,
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
                        {searchButton}
                    </button>
                </form>

                {/* Language Switcher */}
                <div style={{ position: 'relative' }} ref={langRef}>
                    <button
                        onClick={() => setLangOpen(!langOpen)}
                        style={{
                            padding: '0.5rem 1rem',
                            borderRadius: '8px',
                            border: '1px solid var(--border)',
                            background: 'var(--background)',
                            color: 'var(--foreground)',
                            fontWeight: 500,
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                        }}
                    >
                        🌍 {currentLocaleObj?.name || locale.toUpperCase()} ▾
                    </button>
                    {langOpen && (
                        <div
                            style={{
                                position: 'absolute',
                                top: '100%',
                                right: 0,
                                marginTop: '0.5rem',
                                background: 'var(--background)',
                                border: '1px solid var(--border)',
                                borderRadius: '8px',
                                padding: '0.5rem 0',
                                minWidth: '150px',
                                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                                zIndex: 50,
                            }}
                        >
                            {activeLocales.map((l) => (
                                <button
                                    key={l.code}
                                    onClick={() => switchLanguage(l.code)}
                                    style={{
                                        display: 'block',
                                        width: '100%',
                                        textAlign: 'left',
                                        padding: '0.5rem 1rem',
                                        background: l.code === locale ? 'rgba(56, 189, 248, 0.1)' : 'transparent',
                                        color: l.code === locale ? 'var(--primary)' : 'var(--foreground)',
                                        border: 'none',
                                        cursor: 'pointer',
                                        fontSize: '0.9rem',
                                        fontWeight: l.code === locale ? 600 : 400,
                                    }}
                                >
                                    {l.name}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </nav>
        </header>
    );
}
