'use client';

import { useState, useEffect } from 'react';

const CHATWOOT_TOKEN_REGEX = /^[a-zA-Z0-9\-]{15,50}$/;
function validateChatwootToken(token: string) {
    if (!token || token.trim() === '') return true;
    return CHATWOOT_TOKEN_REGEX.test(token.trim());
}

export default function SubServicesPage() {
    const [services, setServices] = useState<any[]>([]);
    const [locales, setLocales] = useState<{code: string; name: string; is_rtl: boolean}[]>([]);
    const [selectedServiceId, setSelectedServiceId] = useState('');
    const [subServices, setSubServices] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [costNotesTab, setCostNotesTab] = useState('en');
    
    const [form, setForm] = useState({
        slug: '',
        name_en: '',
        name_ar: '',
        names: {} as Record<string, string>,
        description: '',
        main_image_url: '',
        chatwoot_website_token: '',
        order: 0,
        avg_cost_uae: '' as string | number,
        avg_cost_home_country: '' as string | number,
        cost_uae_currency: 'AED',
        cost_home_currency: '',
        cost_notes: {} as Record<string, string>,
    });

    useEffect(() => {
        Promise.all([
            fetch('/api/admin/services').then((r) => r.json()),
            fetch('/api/admin/locales').then((r) => r.json()),
        ]).then(([servicesData, localesData]) => {
            const active = servicesData.filter((s: any) => !s.deleted_at);
            setServices(active);
            if (active.length > 0 && !selectedServiceId) setSelectedServiceId(active[0].id);
            setLocales(localesData.filter((l: any) => l.is_active));
        });
    }, []);

    useEffect(() => {
        if (!selectedServiceId) return;
        setLoading(true);
        fetch(`/api/admin/sub-services?service_id=${selectedServiceId}`)
            .then((r) => r.json())
            .then((data) => {
                setSubServices(data);
                setLoading(false);
            });
    }, [selectedServiceId]);

    function resetForm() {
        setForm({
            slug: '',
            name_en: '',
            name_ar: '',
            names: {},
            description: '',
            main_image_url: '',
            chatwoot_website_token: '',
            order: subServices.length,
            avg_cost_uae: '',
            avg_cost_home_country: '',
            cost_uae_currency: 'AED',
            cost_home_currency: '',
            cost_notes: {},
        });
        setEditId(null);
        setShowForm(false);
        setCostNotesTab('en');
    }

    function startEdit(ss: any) {
        const costNotes = typeof ss.cost_notes === 'object' && ss.cost_notes ? ss.cost_notes : {};
        const initialNames = ss.names || { en: ss.name_en, ar: ss.name_ar || '' };
        setForm({
            slug: ss.slug,
            name_en: ss.name_en,
            name_ar: ss.name_ar || '',
            names: initialNames,
            description: ss.description || '',
            main_image_url: ss.main_image_url || '',
            chatwoot_website_token: ss.chatwoot_website_token || '',
            order: ss.order ?? 0,
            avg_cost_uae: ss.avg_cost_uae ?? '',
            avg_cost_home_country: ss.avg_cost_home_country ?? '',
            cost_uae_currency: ss.cost_uae_currency || 'AED',
            cost_home_currency: ss.cost_home_currency || '',
            cost_notes: costNotes,
        });
        setEditId(ss.id);
        setShowForm(true);
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (form.chatwoot_website_token?.trim() && !validateChatwootToken(form.chatwoot_website_token)) {
            alert('Invalid Chatwoot token format. Use 15–50 alphanumeric characters or hyphens.');
            return;
        }
        
        const payload = {
            service_id: selectedServiceId,
            slug: form.slug,
            name_en: form.names['en'] || form.name_en,
            name_ar: form.names['ar'] || form.name_ar,
            names: form.names,
            description: form.description || null,
            main_image_url: form.main_image_url || null,
            chatwoot_website_token: form.chatwoot_website_token || null,
            order: Number(form.order) || 0,
            avg_cost_uae: form.avg_cost_uae === '' ? null : Number(form.avg_cost_uae),
            avg_cost_home_country: form.avg_cost_home_country === '' ? null : Number(form.avg_cost_home_country),
            cost_uae_currency: form.cost_uae_currency || null,
            cost_home_currency: form.cost_home_currency || null,
            cost_notes: form.cost_notes,
            cost_last_updated_at: (form.avg_cost_uae || form.avg_cost_home_country) ? new Date().toISOString() : null,
        };

        if (editId) {
            const { service_id: _, ...rest } = payload;
            const res = await fetch(`/api/admin/sub-services/${editId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(rest),
            });
            if (res.ok) {
                resetForm();
                if (selectedServiceId) fetch(`/api/admin/sub-services?service_id=${selectedServiceId}`).then((r) => r.json()).then(setSubServices);
            } else {
                const err = await res.json();
                alert(err.error || 'Update failed');
            }
        } else {
            const res = await fetch('/api/admin/sub-services', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (res.ok) {
                resetForm();
                if (selectedServiceId) fetch(`/api/admin/sub-services?service_id=${selectedServiceId}`).then((r) => r.json()).then(setSubServices);
            } else {
                const err = await res.json();
                alert(err.error || 'Create failed');
            }
        }
    }

    async function handleDelete(id: string) {
        if (!confirm('Soft-delete this sub-service?')) return;
        const res = await fetch(`/api/admin/sub-services/${id}`, { method: 'DELETE' });
        if (res.ok) {
            if (selectedServiceId) fetch(`/api/admin/sub-services?service_id=${selectedServiceId}`).then((r) => r.json()).then(setSubServices);
        } else alert('Delete failed');
    }

    const inputStyle: React.CSSProperties = {
        width: '100%',
        padding: '0.6rem 0.8rem',
        borderRadius: '8px',
        border: '1px solid var(--border)',
        background: 'var(--background)',
        color: 'var(--foreground)',
        fontSize: '0.9rem',
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Sub-Services</h1>
                <button
                    onClick={() => {
                        setShowForm(true);
                        setEditId(null);
                        setForm({
                            slug: '',
                            name_en: '',
                            name_ar: '',
                            names: {},
                            description: '',
                            main_image_url: '',
                            chatwoot_website_token: '',
                            order: subServices.length,
                            avg_cost_uae: '',
                            avg_cost_home_country: '',
                            cost_uae_currency: 'AED',
                            cost_home_currency: '',
                            cost_notes: {},
                        });
                    }}
                    style={{
                        padding: '0.6rem 1.25rem',
                        borderRadius: '8px',
                        border: 'none',
                        background: 'linear-gradient(135deg, #0ea5e9, #06b6d4)',
                        color: '#fff',
                        fontWeight: 600,
                        cursor: 'pointer',
                    }}
                >
                    + Add Sub-Service
                </button>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>Parent Service</label>
                <select
                    value={selectedServiceId}
                    onChange={(e) => setSelectedServiceId(e.target.value)}
                    style={{ ...inputStyle, minWidth: '300px', width: 'auto' }}
                >
                    {services.map((s) => (
                        <option key={s.id} value={s.id}>{s.name_en}</option>
                    ))}
                </select>
            </div>

            {showForm && (
                <form onSubmit={handleSubmit} style={{ background: 'var(--muted)', borderRadius: '12px', padding: '1.5rem', border: '1px solid var(--border)', marginBottom: '1.5rem' }}>
                    <h3 style={{ marginBottom: '1rem', fontWeight: 600 }}>{editId ? 'Edit' : 'New'} Sub-Service</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>Slug *</label>
                            <input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} required pattern="[a-z0-9-]+" style={inputStyle} placeholder="e.g. veneers" />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>Order</label>
                            <input type="number" value={form.order} onChange={(e) => setForm({ ...form, order: parseInt(e.target.value, 10) || 0 })} style={inputStyle} />
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
                            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} style={{ ...inputStyle, minHeight: '80px' }} />
                        </div>
                        <div style={{ gridColumn: 'span 2' }}>
                            <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>Main image URL</label>
                            <input value={form.main_image_url} onChange={(e) => setForm({ ...form, main_image_url: e.target.value })} type="url" style={inputStyle} placeholder="https://..." />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>Avg cost (UAE)</label>
                            <input type="number" step="0.01" value={form.avg_cost_uae} onChange={(e) => setForm({ ...form, avg_cost_uae: e.target.value })} style={inputStyle} />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>Cost UAE currency</label>
                            <input value={form.cost_uae_currency} onChange={(e) => setForm({ ...form, cost_uae_currency: e.target.value })} style={inputStyle} placeholder="AED" maxLength={3} />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>Avg cost (home country)</label>
                            <input type="number" step="0.01" value={form.avg_cost_home_country} onChange={(e) => setForm({ ...form, avg_cost_home_country: e.target.value })} style={inputStyle} />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>Cost home currency</label>
                            <input value={form.cost_home_currency} onChange={(e) => setForm({ ...form, cost_home_currency: e.target.value })} style={inputStyle} placeholder="USD" maxLength={3} />
                        </div>
                        
                        <div style={{ gridColumn: 'span 2' }}>
                            <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>Cost notes (per locale)</label>
                            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                                {locales.map((loc) => (
                                    <button
                                        key={loc.code}
                                        type="button"
                                        onClick={() => setCostNotesTab(loc.code)}
                                        style={{
                                            padding: '0.4rem 0.8rem',
                                            borderRadius: '6px',
                                            border: costNotesTab === loc.code ? '2px solid #0ea5e9' : '1px solid var(--border)',
                                            background: costNotesTab === loc.code ? 'rgba(14,165,233,0.1)' : 'transparent',
                                            cursor: 'pointer',
                                            fontWeight: 500,
                                        }}
                                    >
                                        {loc.code.toUpperCase()}
                                    </button>
                                ))}
                            </div>
                            <textarea
                                value={form.cost_notes[costNotesTab] || ''}
                                onChange={(e) => setForm({ ...form, cost_notes: { ...form.cost_notes, [costNotesTab]: e.target.value } })}
                                style={{ ...inputStyle, minHeight: '70px' }}
                                placeholder={`Notes in ${costNotesTab}`}
                                dir={locales.find(l => l.code === costNotesTab)?.is_rtl ? 'rtl' : 'ltr'}
                            />
                        </div>
                        <div style={{ gridColumn: 'span 2' }}>
                            <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>Chatwoot token</label>
                            <input value={form.chatwoot_website_token} onChange={(e) => setForm({ ...form, chatwoot_website_token: e.target.value })} style={inputStyle} placeholder="Optional" />
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                        <button type="submit" style={{ padding: '0.6rem 1.5rem', borderRadius: '8px', border: 'none', background: '#22c55e', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>
                            {editId ? 'Update' : 'Create'}
                        </button>
                        <button type="button" onClick={resetForm} style={{ padding: '0.6rem 1.5rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer' }}>
                            Cancel
                        </button>
                    </div>
                </form>
            )}

            {loading ? (
                <p>Loading...</p>
            ) : subServices.length === 0 ? (
                <p style={{ color: 'var(--muted-foreground)' }}>No sub-services for this service yet.</p>
            ) : (
                <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                        <thead>
                            <tr style={{ background: 'var(--muted)' }}>
                                <th style={thStyle}>Order</th>
                                <th style={thStyle}>Slug</th>
                                <th style={thStyle}>Name</th>
                                <th style={thStyle}>Languages</th>
                                <th style={thStyle}>Cost (UAE)</th>
                                <th style={thStyle}>Image</th>
                                <th style={thStyle}>Chatwoot</th>
                                <th style={thStyle}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {subServices.filter((ss: any) => !ss.deleted_at).map((ss: any) => {
                                const namesObj = ss.names || { en: ss.name_en, ar: ss.name_ar };
                                const translatedCount = Object.values(namesObj).filter(v => v).length;
                                return (
                                <tr key={ss.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                    <td style={tdStyle}>{ss.order}</td>
                                    <td style={tdStyle}><code>{ss.slug}</code></td>
                                    <td style={tdStyle}>{ss.names?.['en'] || ss.name_en}</td>
                                    <td style={tdStyle}>
                                        <span style={{ fontSize: '0.75rem', background: 'var(--muted)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                                            {translatedCount} / {locales.length}
                                        </span>
                                    </td>
                                    <td style={tdStyle}>{ss.avg_cost_uae ? `${ss.avg_cost_uae} ${ss.cost_uae_currency || 'AED'}` : '—'}</td>
                                    <td style={tdStyle}>{ss.main_image_url ? '🖼️' : '—'}</td>
                                    <td style={tdStyle}>{ss.chatwoot_website_token ? '✅' : '🔄'}</td>
                                    <td style={tdStyle}>
                                        <button type="button" onClick={() => startEdit(ss)} style={{ background: 'none', border: 'none', color: '#38bdf8', cursor: 'pointer', fontWeight: 500, marginRight: '0.5rem' }}>Edit</button>
                                        <button type="button" onClick={() => handleDelete(ss.id)} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontWeight: 500 }}>Delete</button>
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

const thStyle: React.CSSProperties = { padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: 'var(--muted-foreground)', fontSize: '0.8rem', textTransform: 'uppercase' };
const tdStyle: React.CSSProperties = { padding: '0.75rem 1rem' };
