'use client';

import { useState, useEffect } from 'react';

export default function DoctorsPage() {
    const [doctors, setDoctors] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ name_en: '', name_ar: '', specialty_en: '', specialty_ar: '', bio_en: '', image_url: '', experience_years: '' });

    async function fetchDoctors() {
        setLoading(true);
        const res = await fetch('/api/admin/doctors');
        setDoctors(await res.json());
        setLoading(false);
    }

    useEffect(() => { fetchDoctors(); }, []);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        const res = await fetch('/api/admin/doctors', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...form,
                experience_years: form.experience_years ? parseInt(form.experience_years) : undefined,
            }),
        });
        if (res.ok) {
            setShowForm(false);
            setForm({ name_en: '', name_ar: '', specialty_en: '', specialty_ar: '', bio_en: '', image_url: '', experience_years: '' });
            fetchDoctors();
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
                        <div>
                            <label style={labelStyle}>Name (EN) *</label>
                            <input value={form.name_en} onChange={e => setForm({ ...form, name_en: e.target.value })} required style={inputStyle} />
                        </div>
                        <div>
                            <label style={labelStyle}>Name (AR)</label>
                            <input value={form.name_ar} onChange={e => setForm({ ...form, name_ar: e.target.value })} style={inputStyle} dir="rtl" />
                        </div>
                        <div>
                            <label style={labelStyle}>Specialty (EN)</label>
                            <input value={form.specialty_en} onChange={e => setForm({ ...form, specialty_en: e.target.value })} style={inputStyle} />
                        </div>
                        <div>
                            <label style={labelStyle}>Specialty (AR)</label>
                            <input value={form.specialty_ar} onChange={e => setForm({ ...form, specialty_ar: e.target.value })} style={inputStyle} dir="rtl" />
                        </div>
                        <div>
                            <label style={labelStyle}>Image URL</label>
                            <input value={form.image_url} onChange={e => setForm({ ...form, image_url: e.target.value })} style={inputStyle} placeholder="https://..." />
                        </div>
                        <div>
                            <label style={labelStyle}>Experience (years)</label>
                            <input type="number" value={form.experience_years} onChange={e => setForm({ ...form, experience_years: e.target.value })} style={inputStyle} />
                        </div>
                        <div style={{ gridColumn: 'span 2' }}>
                            <label style={labelStyle}>Bio (EN)</label>
                            <textarea value={form.bio_en} onChange={e => setForm({ ...form, bio_en: e.target.value })} style={{ ...inputStyle, minHeight: '80px' }} />
                        </div>
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
                            <h3 style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{doc.name_en}</h3>
                            {doc.name_ar && <p style={{ fontSize: '0.85rem', color: 'var(--muted-foreground)', direction: 'rtl' }}>{doc.name_ar}</p>}
                            {doc.specialty_en && <p style={{ color: 'var(--primary)', fontSize: '0.85rem', marginTop: '0.5rem' }}>{doc.specialty_en}</p>}
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
