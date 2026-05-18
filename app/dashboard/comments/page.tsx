'use client';

import { useState, useEffect } from 'react';

export default function CommentsPage() {
    const [comments, setComments] = useState<any[]>([]);
    const [filter, setFilter] = useState('pending');
    const [loading, setLoading] = useState(true);

    async function fetchComments() {
        setLoading(true);
        const url = filter === 'pending' ? '/api/admin/comments?status=pending' : '/api/admin/comments';
        const res = await fetch(url);
        setComments(await res.json());
        setLoading(false);
    }

    useEffect(() => { fetchComments(); }, [filter]);

    async function handleModerate(id: string, is_visible: boolean) {
        const res = await fetch('/api/admin/comments', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, is_visible }),
        });
        if (res.ok) fetchComments();
    }

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Comments Moderation</h1>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {['pending', 'all'].map(f => (
                        <button key={f} onClick={() => setFilter(f)}
                            style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid var(--border)', background: filter === f ? '#0ea5e9' : 'transparent', color: filter === f ? '#fff' : 'var(--muted-foreground)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500 }}>
                            {f === 'pending' ? '⏳ Pending' : '📋 All'}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? <p>Loading...</p> : comments.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted-foreground)' }}>
                    <p style={{ fontSize: '1.1rem' }}>No {filter} comments</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {comments.map((c: any) => (
                        <div key={c.id} style={{ background: 'var(--muted)', borderRadius: '12px', padding: '1.25rem', border: '1px solid var(--border)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                                <div>
                                    <strong>{c.author_name}</strong>
                                    <span style={{ color: 'var(--muted-foreground)', fontSize: '0.8rem', marginLeft: '0.75rem' }}>{c.author_email}</span>
                                </div>
                                <span style={{ padding: '0.2rem 0.6rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600, background: c.is_visible ? 'rgba(34,197,94,0.15)' : 'rgba(251,146,60,0.15)', color: c.is_visible ? '#4ade80' : '#fb923c' }}>
                                    {c.is_visible ? 'Approved' : 'Pending'}
                                </span>
                            </div>
                            <p style={{ fontSize: '0.9rem', marginBottom: '0.75rem', lineHeight: 1.5 }}>{c.content}</p>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ color: 'var(--muted-foreground)', fontSize: '0.8rem' }}>
                                    {c.service_name} {c.sub_service_name ? `→ ${c.sub_service_name}` : ''} · {c.locale} · {new Date(c.created_at).toLocaleDateString()}
                                </span>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    {!c.is_visible && (
                                        <button onClick={() => handleModerate(c.id, true)}
                                            style={{ padding: '0.4rem 1rem', borderRadius: '6px', border: 'none', background: '#22c55e', color: '#fff', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>
                                            ✓ Approve
                                        </button>
                                    )}
                                    {c.is_visible && (
                                        <button onClick={() => handleModerate(c.id, false)}
                                            style={{ padding: '0.4rem 1rem', borderRadius: '6px', border: '1px solid #f87171', background: 'transparent', color: '#f87171', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>
                                            ✗ Reject
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
