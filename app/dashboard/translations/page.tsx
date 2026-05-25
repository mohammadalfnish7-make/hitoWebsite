'use client';

import { useState, useEffect } from 'react';

const DEFAULT_LOCALE = 'en';

export default function TranslationsPage() {
    const [translations, setTranslations] = useState<any[]>([]);
    const [enKeys, setEnKeys] = useState<Set<string>>(new Set());
    const [locale, setLocale] = useState('en');
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState({ key: '', value: '', is_verified: false });

    const [locales, setLocales] = useState<{code: string; name: string}[]>([]);

    async function fetchLocales() {
        const res = await fetch('/api/admin/locales');
        if (res.ok) {
            const data = await res.json();
            setLocales(data);
        }
    }

    async function fetchTranslations() {
        setLoading(true);
        const [locRes, enRes] = await Promise.all([
            fetch(`/api/admin/translations?locale=${locale}`),
            locale !== DEFAULT_LOCALE ? fetch(`/api/admin/translations?locale=${DEFAULT_LOCALE}`) : Promise.resolve(null),
        ]);
        const data = await locRes.json();
        setTranslations(data);
        if (enRes?.ok) {
            const enData = await enRes.json();
            setEnKeys(new Set(enData.map((t: any) => t.key)));
        } else {
            setEnKeys(new Set(data.map((t: any) => t.key)));
        }
        setLoading(false);
    }

    useEffect(() => { 
        fetchLocales();
        fetchTranslations(); 
    }, [locale]);

    async function handleSave(e: React.FormEvent) {
        e.preventDefault();
        const res = await fetch('/api/admin/translations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...form, locale }),
        });
        if (res.ok) {
            setForm({ key: '', value: '', is_verified: false });
            fetchTranslations();
        }
    }

    const totalKeys = translations.length;
    const verifiedKeys = translations.filter((t: any) => t.is_verified).length;
    // Completeness vs English baseline: % of EN keys that exist in this locale and are verified
    const baselineSize = enKeys.size;
    const completedAgainstEn = locale === DEFAULT_LOCALE
        ? verifiedKeys
        : translations.filter((t: any) => enKeys.has(t.key) && t.is_verified).length;
    const completenessAgainstEn = baselineSize > 0 ? Math.round((completedAgainstEn / baselineSize) * 100) : (totalKeys > 0 ? Math.round((verifiedKeys / totalKeys) * 100) : 0);
    const completeness = completenessAgainstEn;

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Translations</h1>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {locales.map(l => (
                        <button key={l.code} onClick={() => setLocale(l.code)}
                            style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid var(--border)', background: locale === l.code ? '#0ea5e9' : 'transparent', color: locale === l.code ? '#fff' : 'var(--muted-foreground)', cursor: 'pointer' }}>
                            {l.code.toUpperCase()} - {l.name}
                        </button>
                    ))}
                </div>
            </div>

            {/* Completeness Meter — vs EN baseline */}
            <div style={{ background: 'var(--muted)', borderRadius: '12px', padding: '1.25rem', border: '1px solid var(--border)', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ fontWeight: 600 }}>
                        Translation Completeness ({locale.toUpperCase()}) {locale !== DEFAULT_LOCALE && <span style={{ fontWeight: 400, color: 'var(--muted-foreground)', fontSize: '0.85rem' }}>— vs EN baseline</span>}
                    </span>
                    <span style={{ fontWeight: 700, color: completeness === 100 ? '#4ade80' : completeness > 70 ? '#fb923c' : '#f87171' }}>
                        {completeness}%
                    </span>
                </div>
                <div style={{ width: '100%', height: '8px', borderRadius: '4px', background: 'var(--border)', overflow: 'hidden' }}>
                    <div style={{ width: `${completeness}%`, height: '100%', borderRadius: '4px', background: completeness === 100 ? '#4ade80' : completeness > 70 ? '#fb923c' : '#f87171', transition: 'width 0.3s ease' }} />
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)', marginTop: '0.5rem' }}>
                    {locale === DEFAULT_LOCALE ? `${verifiedKeys}/${totalKeys} keys verified` : `${completedAgainstEn}/${baselineSize} EN keys translated and verified`}
                </p>
            </div>

            {/* Add/Edit form */}
            <form onSubmit={handleSave} style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <input value={form.key} onChange={e => setForm({ ...form, key: e.target.value })} placeholder="translation.key" required style={inputStyle} />
                <input value={form.value} onChange={e => setForm({ ...form, value: e.target.value })} placeholder="Translation value" required style={{ ...inputStyle, flex: 2 }} />
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.85rem', color: 'var(--muted-foreground)', whiteSpace: 'nowrap' }}>
                    <input type="checkbox" checked={form.is_verified} onChange={e => setForm({ ...form, is_verified: e.target.checked })} /> Verified
                </label>
                <button type="submit" style={{ padding: '0.6rem 1.25rem', borderRadius: '8px', border: 'none', background: '#22c55e', color: '#fff', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    Save
                </button>
            </form>

            {/* Translation table */}
            {loading ? <p>Loading...</p> : (
                <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                        <thead>
                            <tr style={{ background: 'var(--muted)' }}>
                                <th style={thStyle}>Key</th>
                                <th style={thStyle}>Value</th>
                                <th style={thStyle}>Verified</th>
                            </tr>
                        </thead>
                        <tbody>
                            {translations.map((t: any) => (
                                <tr key={t.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                    <td style={tdStyle}><code style={{ fontSize: '0.8rem' }}>{t.key}</code></td>
                                    <td style={tdStyle}>{t.value}</td>
                                    <td style={tdStyle}>{t.is_verified ? '✅' : '⬜'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

const inputStyle: React.CSSProperties = { padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)', fontSize: '0.9rem', outline: 'none', flex: 1 };
const thStyle: React.CSSProperties = { padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: 'var(--muted-foreground)', fontSize: '0.8rem', textTransform: 'uppercase' };
const tdStyle: React.CSSProperties = { padding: '0.75rem 1rem' };
