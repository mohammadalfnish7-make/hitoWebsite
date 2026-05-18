'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { PublicChatwoot } from '@/shared/components/chatwoot/PublicChatwoot';

export default function PrivacyPage() {
    const params = useParams();
    const locale = (params?.locale as string) || 'en';
    const [form, setForm] = useState({ requester_email: '', requester_name: '', reason: '', website: '' });
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState('');

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        const res = await fetch('/api/data-deletion-request', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form),
        });
        const data = await res.json();
        if (res.ok) {
            setSubmitted(true);
        } else {
            setError(data.error || 'Something went wrong');
        }
    }

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
            <PublicChatwoot locale={locale} />
            <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '1.5rem' }}>
                {locale === 'ar' ? 'سياسة الخصوصية وحذف البيانات' : 'Privacy & Data Deletion'}
            </h1>

            <section style={{ marginBottom: '3rem', lineHeight: 1.8, color: 'var(--muted-foreground)' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--foreground)', marginBottom: '1rem' }}>
                    {locale === 'ar' ? 'كيف نتعامل مع بياناتك' : 'How We Handle Your Data'}
                </h2>
                <p>{locale === 'ar'
                    ? 'نحن نلتزم بقوانين حماية البيانات الشخصية (PDPL). بياناتك تُخزن بشكل آمن ولا تُشارك مع أطراف ثالثة دون موافقتك.'
                    : 'We comply with personal data protection laws (PDPL). Your data is stored securely and never shared with third parties without your consent.'
                }</p>
                <p style={{ marginTop: '1rem' }}>{locale === 'ar'
                    ? 'يمكنك طلب حذف بياناتك في أي وقت باستخدام النموذج أدناه. سنراجع طلبك ونعالجه خلال 30 يومًا.'
                    : 'You may request deletion of your data at any time using the form below. We will review and process your request within 30 days.'
                }</p>
            </section>

            <section style={{ background: 'var(--muted)', borderRadius: '16px', padding: '2rem', border: '1px solid var(--border)' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>
                    {locale === 'ar' ? 'طلب حذف البيانات' : 'Request Data Deletion'}
                </h2>

                {submitted ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: '#4ade80' }}>
                        <p style={{ fontSize: '1.1rem', fontWeight: 600 }}>✓ {locale === 'ar' ? 'تم إرسال طلبك بنجاح' : 'Your request has been submitted'}</p>
                        <p style={{ color: 'var(--muted-foreground)', marginTop: '0.5rem' }}>
                            {locale === 'ar' ? 'سنراجع طلبك ونتواصل معك قريبًا.' : 'We will review your request and contact you soon.'}
                        </p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit}>
                        {/* Honeypot */}
                        <div style={{ position: 'absolute', left: '-9999px' }}>
                            <input name="website" value={form.website} onChange={e => setForm({ ...form, website: e.target.value })} tabIndex={-1} autoComplete="off" />
                        </div>

                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>
                                {locale === 'ar' ? 'البريد الإلكتروني *' : 'Email *'}
                            </label>
                            <input type="email" value={form.requester_email} onChange={e => setForm({ ...form, requester_email: e.target.value })} required
                                style={{ width: '100%', padding: '0.7rem 1rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)', fontSize: '0.9rem' }} />
                        </div>
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>
                                {locale === 'ar' ? 'الاسم' : 'Name (optional)'}
                            </label>
                            <input value={form.requester_name} onChange={e => setForm({ ...form, requester_name: e.target.value })}
                                style={{ width: '100%', padding: '0.7rem 1rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)', fontSize: '0.9rem' }} />
                        </div>
                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>
                                {locale === 'ar' ? 'السبب' : 'Reason (optional)'}
                            </label>
                            <textarea value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })}
                                style={{ width: '100%', padding: '0.7rem 1rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)', fontSize: '0.9rem', minHeight: '80px' }} />
                        </div>

                        {error && <p style={{ color: '#f87171', marginBottom: '1rem', fontSize: '0.9rem' }}>{error}</p>}

                        <button type="submit" style={{ padding: '0.75rem 2rem', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #0ea5e9, #06b6d4)', color: '#fff', fontWeight: 600, fontSize: '0.95rem', cursor: 'pointer' }}>
                            {locale === 'ar' ? 'إرسال الطلب' : 'Submit Request'}
                        </button>
                    </form>
                )}
            </section>
        </div>
    );
}
