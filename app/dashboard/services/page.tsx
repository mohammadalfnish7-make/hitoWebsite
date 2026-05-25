'use client';

import { useState, useEffect } from 'react';

// Chatwoot token format (alphanumeric + hyphens, 15–50 chars). Adjust if your instance differs.
const CHATWOOT_TOKEN_REGEX = /^[a-zA-Z0-9\-]{15,50}$/;

function validateChatwootToken(token: string): boolean {
    if (!token || token.trim() === '') return true; // empty = use default
    return CHATWOOT_TOKEN_REGEX.test(token.trim());
}

interface Service {
    id: string;
    slug: string;
    name_en: string;
    name_ar?: string;
    names?: Record<string, string>;
    description?: string;
    chatwoot_website_token?: string;
    order: number;
    deleted_at?: string;
}

export default function ServicesPage() {
    const [services, setServices] = useState<Service[]>([]);
    const [locales, setLocales] = useState<{code: string; name: string; is_rtl: boolean}[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ slug: '', name_en: '', name_ar: '', names: {} as Record<string, string>, description: '', chatwoot_website_token: '', order: 0 });
    const [editId, setEditId] = useState<string | null>(null);

    async function fetchData() {
        setLoading(true);
        const [servicesRes, localesRes] = await Promise.all([
            fetch('/api/admin/services'),
            fetch('/api/admin/locales')
        ]);
        if (servicesRes.ok) setServices(await servicesRes.json());
        if (localesRes.ok) {
            const allLocales = await localesRes.json();
            setLocales(allLocales.filter((l: any) => l.is_active));
        }
        setLoading(false);
    }

    useEffect(() => { fetchData(); }, []);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (form.chatwoot_website_token?.trim() && !validateChatwootToken(form.chatwoot_website_token)) {
            alert('Invalid Chatwoot token format. Use 15–50 alphanumeric characters or hyphens.');
            return;
        }
        
        // Ensure name_en and name_ar are correctly set from the names JSONB
        const payload = {
            ...form,
            name_en: form.names['en'] || form.name_en,
            name_ar: form.names['ar'] || form.name_ar,
        };

        const url = editId ? `/api/admin/services/${editId}` : '/api/admin/services';
        const method = editId ? 'PUT' : 'POST';
        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        if (res.ok) {
            setShowForm(false);
            setEditId(null);
            setForm({ slug: '', name_en: '', name_ar: '', names: {}, description: '', chatwoot_website_token: '', order: 0 });
            fetchData();
        } else {
            const err = await res.json();
            alert(err.error || 'Failed to save');
        }
    }

    async function handleDelete(id: string) {
        if (!confirm('Are you sure you want to soft-delete this service?')) return;
        const res = await fetch(`/api/admin/services/${id}`, { method: 'DELETE' });
        if (res.ok) {
            fetchData();
        } else {
            const err = await res.json();
            alert(err.error || 'Failed to delete');
        }
    }

    function startEdit(s: Service) {
        const initialNames = s.names || { en: s.name_en, ar: s.name_ar || '' };
        setForm({ 
            slug: s.slug, 
            name_en: s.name_en, 
            name_ar: s.name_ar || '', 
            names: initialNames,
            description: s.description || '', 
            chatwoot_website_token: s.chatwoot_website_token || '', 
            order: s.order 
        });
        setEditId(s.id);
        setShowForm(true);
    }

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Services</h1>
                <button onClick={() => { setShowForm(!showForm); setEditId(null); setForm({ slug: '', name_en: '', name_ar: '', names: {}, description: '', chatwoot_website_token: '', order: 0 }); }}
                    style={{ padding: '0.6rem 1.25rem', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #0ea5e9, #06b6d4)', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>
                    {showForm ? 'Cancel' : '+ Add Service'}
                </button>
            </div>

            {showForm && (
                <form onSubmit={handleSubmit} style={{ background: 'var(--muted)', borderRadius: '12px', padding: '1.5rem', border: '1px solid var(--border)', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>Slug</label>
                            <input value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} required style={inputStyle} placeholder="e.g. dental" />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>Order</label>
                            <input type="number" value={form.order} onChange={e => setForm({ ...form, order: parseInt(e.target.value) || 0 })} style={inputStyle} />
                        </div>
                        
                        {/* Dynamic Locale Names */}
                        {locales.map(loc => (
                            <div key={loc.code}>
                                <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>Name ({loc.code.toUpperCase()}){loc.code === 'en' ? ' *' : ''}</label>
                                <input 
                                    value={form.names[loc.code] || ''} 
                                    onChange={e => setForm({ ...form, names: { ...form.names, [loc.code]: e.target.value } })} 
                                    required={loc.code === 'en'} 
                                    style={inputStyle} 
                                    placeholder={`Name in ${loc.name}`} 
                                    dir={loc.is_rtl ? 'rtl' : 'ltr'} 
                                />
                            </div>
                        ))}
                        
                        <div style={{ gridColumn: 'span 2' }}>
                            <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>Description</label>
                            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} style={{ ...inputStyle, minHeight: '80px' }} />
                        </div>
                        <div style={{ gridColumn: 'span 2' }}>
                            <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>Chatwoot Token (optional)</label>
                            <input value={form.chatwoot_website_token} onChange={e => setForm({ ...form, chatwoot_website_token: e.target.value })} style={inputStyle} placeholder="Leave empty to use default" />
                        </div>
                    </div>
                    <button type="submit" style={{ marginTop: '1rem', padding: '0.6rem 2rem', borderRadius: '8px', border: 'none', background: '#22c55e', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>
                        {editId ? 'Update' : 'Create'}
                    </button>
                </form>
            )}

            {loading ? (
                <p style={{ color: 'var(--muted-foreground)' }}>Loading...</p>
            ) : (
                <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                        <thead>
                            <tr style={{ background: 'var(--muted)' }}>
                                <th style={thStyle}>Order</th>
                                <th style={thStyle}>Slug</th>
                                <th style={thStyle}>Name</th>
                                <th style={thStyle}>Languages</th>
                                <th style={thStyle}>Chatwoot</th>
                                <th style={thStyle}>Status</th>
                                <th style={thStyle}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {services.map(s => {
                                const namesObj = s.names || { en: s.name_en, ar: s.name_ar };
                                const translatedCount = Object.values(namesObj).filter(v => v).length;
                                return (
                                <tr key={s.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                    <td style={tdStyle}>{s.order}</td>
                                    <td style={tdStyle}><code style={{ fontSize: '0.8rem' }}>{s.slug}</code></td>
                                    <td style={tdStyle}>{s.names?.['en'] || s.name_en}</td>
                                    <td style={tdStyle}>
                                        <span style={{ fontSize: '0.75rem', background: 'var(--muted)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                                            {translatedCount} / {locales.length}
                                        </span>
                                    </td>
                                    <td style={tdStyle}>{s.chatwoot_website_token ? '✅' : '🔄 Default'}</td>
                                    <td style={tdStyle}>
                                        <span style={{ padding: '0.2rem 0.6rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600, background: s.deleted_at ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)', color: s.deleted_at ? '#f87171' : '#4ade80' }}>
                                            {s.deleted_at ? 'Deleted' : 'Active'}
                                        </span>
                                    </td>
                                    <td style={tdStyle}>
                                        <button onClick={() => startEdit(s)} style={actionBtn}>Edit</button>
                                        {!s.deleted_at && <button onClick={() => handleDelete(s.id)} style={{ ...actionBtn, color: '#f87171' }}>Delete</button>}
                                    </td>
                                </tr>
                            )})}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

const inputStyle: React.CSSProperties = {
    width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px',
    border: '1px solid var(--border)', background: 'var(--background)',
    color: 'var(--foreground)', fontSize: '0.9rem', outline: 'none',
};
const thStyle: React.CSSProperties = { padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: 'var(--muted-foreground)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' };
const tdStyle: React.CSSProperties = { padding: '0.75rem 1rem' };
const actionBtn: React.CSSProperties = { background: 'none', border: 'none', color: '#38bdf8', cursor: 'pointer', fontWeight: 500, fontSize: '0.85rem', marginRight: '0.5rem' };
