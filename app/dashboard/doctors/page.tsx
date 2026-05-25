'use client';

import { useState, useEffect } from 'react';

export default function DoctorsPage() {
    const [doctors, setDoctors] = useState<any[]>([]);
    const [locales, setLocales] = useState<{code: string; name: string; is_rtl: boolean}[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ 
        name_en: '', name_ar: '', names: {} as Record<string, string>,
        specialty_en: '', specialty_ar: '', specialties: {} as Record<string, string>,
        bio_en: '', bios: {} as Record<string, string>, 
        image_url: '', experience_years: '' 
    });

    async function fetchData() {
        setLoading(true);
        const [docsRes, locsRes] = await Promise.all([
            fetch('/api/admin/doctors'),
            fetch('/api/admin/locales')
        ]);
        if (docsRes.ok) setDoctors(await docsRes.json());
        if (locsRes.ok) {
            const data = await locsRes.json();
            setLocales(data.filter((l: any) => l.is_active));
        }
        setLoading(false);
    }

    useEffect(() => { fetchData(); }, []);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        
        const payload = {
            ...form,
            name_en: form.names['en'] || form.name_en,
            name_ar: form.names['ar'] || form.name_ar,
            specialty_en: form.specialties['en'] || form.specialty_en,
            specialty_ar: form.specialties['ar'] || form.specialty_ar,
            bio_en: form.bios['en'] || form.bio_en,
            experience_years: form.experience_years ? parseInt(form.experience_years) : undefined,
        };
        
        const res = await fetch('/api/admin/doctors', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        if (res.ok) {
            setShowForm(false);
            setForm({ 
                name_en: '', name_ar: '', names: {}, 
                specialty_en: '', specialty_ar: '', specialties: {}, 
                bio_en: '', bios: {}, 
                image_url: '', experience_years: '' 
            });
            fetchData();
        } else {
            const err = await res.json();
            alert(err.error || 'Failed to save');
        }
    }

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Doctors</h1>
                <button onClick={() => setShowForm(!showForm)}
                    style={{ padding: '0.6rem 1.25rem', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #0ea5e9, #06b6d4)', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>
                    {showForm ? 'Cancel' : '+ Add Doctor'}
                </button>
            </div>

            {showForm && (
                <form onSubmit={handleSubmit} style={{ background: 'var(--muted)', borderRadius: '12px', padding: '1.5rem', border: '1px solid var(--border)', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        {/* Dynamic Locale Names */}
                        {locales.map(loc => (
                            <div key={`name-${loc.code}`}>
                                <label style={labelStyle}>Name ({loc.code.toUpperCase()}){loc.code === 'en' ? ' *' : ''}</label>
                                <input 
                                    value={form.names[loc.code] || ''} 
                                    onChange={e => setForm({ ...form, names: { ...form.names, [loc.code]: e.target.value } })} 
                                    required={loc.code === 'en'} 
                                    style={inputStyle} 
                                    dir={loc.is_rtl ? 'rtl' : 'ltr'} 
                                />
                            </div>
                        ))}
                        
                        {/* Dynamic Locale Specialties */}
                        {locales.map(loc => (
                            <div key={`specialty-${loc.code}`}>
                                <label style={labelStyle}>Specialty ({loc.code.toUpperCase()})</label>
                                <input 
                                    value={form.specialties[loc.code] || ''} 
                                    onChange={e => setForm({ ...form, specialties: { ...form.specialties, [loc.code]: e.target.value } })} 
                                    style={inputStyle} 
                                    dir={loc.is_rtl ? 'rtl' : 'ltr'} 
                                />
                            </div>
                        ))}
                        
                        <div>
                            <label style={labelStyle}>Image URL</label>
                            <input value={form.image_url} onChange={e => setForm({ ...form, image_url: e.target.value })} style={inputStyle} placeholder="https://..." />
                        </div>
                        <div>
                            <label style={labelStyle}>Experience (years)</label>
                            <input type="number" value={form.experience_years} onChange={e => setForm({ ...form, experience_years: e.target.value })} style={inputStyle} />
                        </div>
                        
                        {/* Dynamic Locale Bios */}
                        {locales.map(loc => (
                            <div key={`bio-${loc.code}`} style={{ gridColumn: 'span 2' }}>
                                <label style={labelStyle}>Bio ({loc.code.toUpperCase()})</label>
                                <textarea 
                                    value={form.bios[loc.code] || ''} 
                                    onChange={e => setForm({ ...form, bios: { ...form.bios, [loc.code]: e.target.value } })} 
                                    style={{ ...inputStyle, minHeight: '80px' }} 
                                    dir={loc.is_rtl ? 'rtl' : 'ltr'} 
                                />
                            </div>
                        ))}
                    </div>
                    <button type="submit" style={{ marginTop: '1rem', padding: '0.6rem 2rem', borderRadius: '8px', border: 'none', background: '#22c55e', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>
                        Create
                    </button>
                </form>
            )}

            {loading ? <p>Loading...</p> : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
                    {doctors.map((doc: any) => (
                        <div key={doc.id} style={{ background: 'var(--muted)', borderRadius: '12px', padding: '1.5rem', border: '1px solid var(--border)', textAlign: 'center' }}>
                            {doc.image_url ? (
                                <div style={{ width: '80px', height: '80px', borderRadius: '50%', margin: '0 auto 1rem', background: `url(${doc.image_url}) center/cover`, border: '3px solid var(--primary)' }} />
                            ) : (
                                <div style={{ width: '80px', height: '80px', borderRadius: '50%', margin: '0 auto 1rem', background: 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>👨‍⚕️</div>
                            )}
                            <h3 style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{doc.names?.['en'] || doc.name_en}</h3>
                            {doc.names && Object.entries(doc.names).filter(([k,v]) => k !== 'en' && v).map(([k,v]) => (
                                <p key={k} style={{ fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>{v as string}</p>
                            ))}
                            <p style={{ color: 'var(--primary)', fontSize: '0.85rem', marginTop: '0.5rem' }}>{doc.specialties?.['en'] || doc.specialty_en}</p>
                            {doc.experience_years && <p style={{ color: 'var(--muted-foreground)', fontSize: '0.8rem' }}>{doc.experience_years} years experience</p>}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

const inputStyle: React.CSSProperties = { width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)', fontSize: '0.9rem', outline: 'none' };
const labelStyle: React.CSSProperties = { display: 'block', marginBottom: '0.3rem', fontSize: '0.85rem', color: 'var(--muted-foreground)' };
