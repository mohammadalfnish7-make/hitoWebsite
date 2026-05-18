'use client';

import { useState } from 'react';

interface CommentFormProps {
    serviceId: string;
    subServiceId?: string;
    locale: string;
    onSuccess?: () => void;
}

export function CommentForm({ serviceId, subServiceId, locale, onSuccess }: CommentFormProps) {
    const [authorName, setAuthorName] = useState('');
    const [authorEmail, setAuthorEmail] = useState('');
    const [content, setContent] = useState('');
    const [website, setWebsite] = useState(''); // honeypot
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res = await fetch('/api/comments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    service_id: serviceId,
                    sub_service_id: subServiceId || undefined,
                    author_name: authorName,
                    author_email: authorEmail,
                    content,
                    locale,
                    website: website || undefined,
                }),
            });
            const data = await res.json();
            if (res.ok) {
                setSubmitted(true);
                setAuthorName('');
                setAuthorEmail('');
                setContent('');
                onSuccess?.();
            } else {
                setError(data.error || (data.details ? 'Invalid input' : 'Something went wrong'));
            }
        } catch {
            setError('Something went wrong. Please try again.');
        }
        setLoading(false);
    }

    if (submitted) {
        return (
            <div style={{ padding: '1.5rem', background: 'rgba(34, 197, 94, 0.1)', borderRadius: '12px', border: '1px solid rgba(34, 197, 94, 0.3)', color: 'var(--foreground)' }}>
                <p style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
                    {locale === 'ar' ? 'شكراً لك' : 'Thank you'}
                </p>
                <p style={{ fontSize: '0.9rem', color: 'var(--muted-foreground)' }}>
                    {locale === 'ar'
                        ? 'تم إرسال تعليقك وسيظهر بعد المراجعة.'
                        : 'Your comment has been submitted and will appear after moderation.'}
                </p>
            </div>
        );
    }

    const label = (en: string, ar: string) => (locale === 'ar' ? ar : en);
    const inputStyle: React.CSSProperties = {
        width: '100%',
        padding: '0.7rem 1rem',
        borderRadius: '8px',
        border: '1px solid var(--border)',
        background: 'var(--background)',
        color: 'var(--foreground)',
        fontSize: '0.9rem',
    };

    return (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Honeypot — hidden from users */}
            <div style={{ position: 'absolute', left: '-9999px', opacity: 0, pointerEvents: 'none' }} aria-hidden="true">
                <label htmlFor="comment-website">{label('Website', 'الموقع')}</label>
                <input
                    id="comment-website"
                    name="website"
                    type="text"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    tabIndex={-1}
                    autoComplete="off"
                />
            </div>

            <div>
                <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>
                    {label('Name', 'الاسم')} *
                </label>
                <input
                    required
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    style={inputStyle}
                    maxLength={255}
                />
            </div>
            <div>
                <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>
                    {label('Email', 'البريد الإلكتروني')} *
                </label>
                <input
                    type="email"
                    required
                    value={authorEmail}
                    onChange={(e) => setAuthorEmail(e.target.value)}
                    style={inputStyle}
                />
            </div>
            <div>
                <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>
                    {label('Comment', 'التعليق')} *
                </label>
                <textarea
                    required
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    style={{ ...inputStyle, minHeight: '100px', resize: 'vertical' }}
                    maxLength={5000}
                />
            </div>
            {error && <p style={{ color: '#f87171', fontSize: '0.9rem' }}>{error}</p>}
            <button
                type="submit"
                disabled={loading}
                style={{
                    padding: '0.75rem 1.5rem',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #0ea5e9, #06b6d4)',
                    color: '#fff',
                    fontWeight: 600,
                    cursor: loading ? 'wait' : 'pointer',
                    opacity: loading ? 0.8 : 1,
                }}
            >
                {loading ? (locale === 'ar' ? 'جاري الإرسال...' : 'Submitting...') : (locale === 'ar' ? 'إرسال التعليق' : 'Submit Comment')}
            </button>
        </form>
    );
}
