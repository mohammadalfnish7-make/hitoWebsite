'use client';

import { useState, useEffect } from 'react';

export default function DeletionRequestsPage() {
    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    async function fetchRequests() {
        setLoading(true);
        const res = await fetch('/api/admin/deletion-requests');
        setRequests(await res.json());
        setLoading(false);
    }

    useEffect(() => { fetchRequests(); }, []);

    async function handleAction(id: string, status: string) {
        const msg = status === 'completed'
            ? 'This will delete the user\'s data permanently. Are you sure?\n\nREMINDER: Also purge this user\'s data from Chatwoot (PDPL compliance).'
            : `Set status to "${status}"?`;
        if (!confirm(msg)) return;

        const res = await fetch('/api/admin/deletion-requests', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, status }),
        });
        if (res.ok) fetchRequests();
    }

    const statusColors: Record<string, { bg: string; color: string }> = {
        pending: { bg: 'rgba(251,146,60,0.15)', color: '#fb923c' },
        approved: { bg: 'rgba(56,189,248,0.15)', color: '#38bdf8' },
        rejected: { bg: 'rgba(239,68,68,0.15)', color: '#f87171' },
        completed: { bg: 'rgba(34,197,94,0.15)', color: '#4ade80' },
    };

    return (
        <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem' }}>Data Deletion Requests</h1>
            <div style={{ background: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.3)', borderRadius: '12px', padding: '1rem 1.25rem', marginBottom: '1.5rem', fontSize: '0.9rem', color: 'var(--foreground)' }}>
                <strong>PDPL / Chatwoot:</strong> When you approve and complete a deletion request, remember to manually purge the user&apos;s conversation data from Chatwoot (or use Chatwoot API) so that all of their personal data is removed.
            </div>
            {loading ? <p>Loading...</p> : requests.length === 0 ? (
                <p style={{ color: 'var(--muted-foreground)' }}>No deletion requests.</p>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {requests.map((r: any) => (
                        <div key={r.id} style={{ background: 'var(--muted)', borderRadius: '12px', padding: '1.25rem', border: '1px solid var(--border)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                                <div>
                                    <strong>{r.requester_email}</strong>
                                    {r.requester_name && <span style={{ marginLeft: '0.5rem', color: 'var(--muted-foreground)' }}>({r.requester_name})</span>}
                                </div>
                                <span style={{ padding: '0.2rem 0.6rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600, ...statusColors[r.status] }}>
                                    {r.status}
                                </span>
                            </div>
                            {r.reason && <p style={{ fontSize: '0.9rem', color: 'var(--muted-foreground)', marginBottom: '0.75rem' }}>{r.reason}</p>}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>
                                    Requested: {new Date(r.requested_at).toLocaleDateString()}
                                    {r.reviewer_email && ` · Reviewed by: ${r.reviewer_email}`}
                                </span>
                                {r.status === 'pending' && (
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button onClick={() => handleAction(r.id, 'approved')} style={{ padding: '0.4rem 1rem', borderRadius: '6px', border: 'none', background: '#0ea5e9', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: '0.8rem' }}>Approve</button>
                                        <button onClick={() => handleAction(r.id, 'rejected')} style={{ padding: '0.4rem 1rem', borderRadius: '6px', border: '1px solid #f87171', background: 'transparent', color: '#f87171', fontWeight: 600, cursor: 'pointer', fontSize: '0.8rem' }}>Reject</button>
                                    </div>
                                )}
                                {r.status === 'approved' && (
                                    <button onClick={() => handleAction(r.id, 'completed')} style={{ padding: '0.4rem 1rem', borderRadius: '6px', border: 'none', background: '#22c55e', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: '0.8rem' }}>Mark Completed</button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
