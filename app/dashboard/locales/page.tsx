'use client';

import { useState, useEffect } from 'react';

interface Locale {
    code: string;
    name: string;
    is_rtl: boolean;
    is_active: boolean;
    order: number;
}

export default function LocalesPage() {
    const [locales, setLocales] = useState<Locale[]>([]);
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState<Partial<Locale>>({ code: '', name: '', is_rtl: false, is_active: true, order: 0 });
    const [isEditing, setIsEditing] = useState(false);
    const [error, setError] = useState('');

    async function fetchLocales() {
        setLoading(true);
        const res = await fetch('/api/admin/locales');
        if (res.ok) {
            setLocales(await res.json());
        }
        setLoading(false);
    }

    useEffect(() => { fetchLocales(); }, []);

    async function handleSave(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        
        const method = isEditing ? 'PUT' : 'POST';
        const url = isEditing ? `/api/admin/locales/${form.code}` : '/api/admin/locales';
        
        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form),
        });
        
        if (res.ok) {
            setForm({ code: '', name: '', is_rtl: false, is_active: true, order: 0 });
            setIsEditing(false);
            fetchLocales();
        } else {
            const data = await res.json();
            setError(data.error || 'Failed to save locale');
        }
    }

    function handleEdit(l: Locale) {
        setForm(l);
        setIsEditing(true);
    }

    return (
        <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem' }}>Language Management</h1>

            <div style={{ background: 'var(--muted)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border)', marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>{isEditing ? 'Edit Language' : 'Add New Language'}</h2>
                {error && <p style={{ color: '#ef4444', marginBottom: '1rem', fontSize: '0.9rem' }}>{error}</p>}
                <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <label style={labelStyle}>Locale Code (e.g., tr, fr, ru)</label>
                            <input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} disabled={isEditing} placeholder="tr" required pattern="[a-z]{2,3}(-[A-Z]{2})?" style={inputStyle} />
                            {isEditing && <p style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', marginTop: '0.25rem' }}>Code cannot be changed once created.</p>}
                        </div>
                        <div>
                            <label style={labelStyle}>Display Name (Native)</label>
                            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Türkçe" required style={inputStyle} />
                        </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', alignItems: 'center' }}>
                        <div>
                            <label style={labelStyle}>Display Order</label>
                            <input type="number" value={form.order} onChange={e => setForm({ ...form, order: parseInt(e.target.value) || 0 })} style={inputStyle} />
                        </div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                            <input type="checkbox" checked={form.is_rtl} onChange={e => setForm({ ...form, is_rtl: e.target.checked })} /> Right-to-Left (RTL)
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                            <input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} /> Active (Visible on site)
                        </label>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                        <button type="submit" style={{ padding: '0.6rem 1.25rem', borderRadius: '8px', border: 'none', background: '#0ea5e9', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>
                            {isEditing ? 'Save Changes' : 'Add Language'}
                        </button>
                        {isEditing && (
                            <button type="button" onClick={() => { setIsEditing(false); setForm({ code: '', name: '', is_rtl: false, is_active: true, order: 0 }); }} style={{ padding: '0.6rem 1.25rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--foreground)', cursor: 'pointer' }}>
                                Cancel
                            </button>
                        )}
                    </div>
                </form>
            </div>

            {loading ? <p>Loading...</p> : (
                <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                        <thead>
                            <tr style={{ background: 'var(--muted)', textAlign: 'left' }}>
                                <th style={thStyle}>Code</th>
                                <th style={thStyle}>Name</th>
                                <th style={thStyle}>Order</th>
                                <th style={thStyle}>RTL</th>
                                <th style={thStyle}>Status</th>
                                <th style={thStyle}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {locales.map(l => (
                                <tr key={l.code} style={{ borderBottom: '1px solid var(--border)' }}>
                                    <td style={tdStyle}><strong>{l.code}</strong></td>
                                    <td style={tdStyle}>{l.name}</td>
                                    <td style={tdStyle}>{l.order}</td>
                                    <td style={tdStyle}>{l.is_rtl ? 'Yes' : 'No'}</td>
                                    <td style={tdStyle}>
                                        <span style={{ padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, background: l.is_active ? 'rgba(34, 197, 94, 0.15)' : 'rgba(148, 163, 184, 0.15)', color: l.is_active ? '#22c55e' : '#94a3b8' }}>
                                            {l.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td style={tdStyle}>
                                        <button onClick={() => handleEdit(l)} style={{ padding: '0.4rem 0.8rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)', cursor: 'pointer', fontSize: '0.8rem' }}>
                                            Edit
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

const inputStyle: React.CSSProperties = { padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)', fontSize: '0.9rem', outline: 'none', width: '100%' };
const labelStyle: React.CSSProperties = { display: 'block', fontSize: '0.85rem', color: 'var(--muted-foreground)', marginBottom: '0.3rem' };
const thStyle: React.CSSProperties = { padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', fontSize: '0.8rem' };
const tdStyle: React.CSSProperties = { padding: '0.75rem 1rem' };
