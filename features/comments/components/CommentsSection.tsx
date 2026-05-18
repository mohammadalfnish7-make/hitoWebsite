'use client';

import { useState, useEffect } from 'react';
import { CommentForm } from './CommentForm';

interface Comment {
    id: string;
    author_name: string;
    content: string;
    created_at: string;
}

interface CommentsSectionProps {
    serviceId: string;
    subServiceId?: string;
    locale: string;
    initialComments?: Comment[];
}

export function CommentsSection({ serviceId, subServiceId, locale, initialComments = [] }: CommentsSectionProps) {
    const [comments, setComments] = useState<Comment[]>(initialComments);
    const [loading, setLoading] = useState(false);

    async function fetchComments() {
        setLoading(true);
        try {
            const params = new URLSearchParams({ service_id: serviceId });
            if (subServiceId) params.set('sub_service_id', subServiceId);
            const res = await fetch(`/api/comments?${params}`);
            if (res.ok) {
                const data = await res.json();
                setComments(data);
            }
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        if (initialComments.length === 0) fetchComments();
    }, [serviceId, subServiceId]);

    const title = locale === 'ar' ? 'التعليقات' : 'Comments';
    const subtitle = locale === 'ar' ? 'سيظهر تعليقك بعد المراجعة.' : 'Your comment will appear after moderation.';

    return (
        <section style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid var(--border)' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem' }}>{title}</h2>
            <p style={{ color: 'var(--muted-foreground)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>{subtitle}</p>

            {comments.length > 0 && (
                <div style={{ marginBottom: '2rem' }}>
                    {comments.map((c) => (
                        <div
                            key={c.id}
                            style={{
                                padding: '1rem 1.25rem',
                                background: 'var(--muted)',
                                borderRadius: '12px',
                                border: '1px solid var(--border)',
                                marginBottom: '0.75rem',
                            }}
                        >
                            <p style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.25rem' }}>{c.author_name}</p>
                            <p style={{ fontSize: '0.9rem', color: 'var(--foreground)', lineHeight: 1.6 }}>{c.content}</p>
                            <p style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', marginTop: '0.5rem' }}>
                                {new Date(c.created_at).toLocaleDateString(locale === 'ar' ? 'ar' : 'en')}
                            </p>
                        </div>
                    ))}
                </div>
            )}

            {loading && comments.length === 0 && (
                <p style={{ color: 'var(--muted-foreground)', fontSize: '0.9rem' }}>Loading comments...</p>
            )}

            <div style={{ background: 'var(--muted)', borderRadius: '16px', padding: '1.5rem', border: '1px solid var(--border)' }}>
                <CommentForm
                    serviceId={serviceId}
                    subServiceId={subServiceId}
                    locale={locale}
                    onSuccess={fetchComments}
                />
            </div>
        </section>
    );
}
