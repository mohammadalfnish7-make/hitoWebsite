'use client';

import { useState, useEffect } from 'react';

export default function AuditLogPage() {
    const [logs, setLogs] = useState<any[]>([]);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);

    async function fetchLogs() {
        setLoading(true);
        const res = await fetch(`/api/admin/audit-log?page=${page}`);
        const data = await res.json();
        setLogs(data.data || []);
        setLoading(false);
    }

    useEffect(() => { fetchLogs(); }, [page]);

    return (
        <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem' }}>Audit Log</h1>
            {loading ? <p>Loading...</p> : (
                <>
                    <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                            <thead>
                                <tr style={{ background: 'var(--muted)' }}>
                                    <th style={thStyle}>Time</th>
                                    <th style={thStyle}>Admin</th>
                                    <th style={thStyle}>Action</th>
                                    <th style={thStyle}>Entity</th>
                                    <th style={thStyle}>Details</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.map((l: any) => (
                                    <tr key={l.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                        <td style={tdStyle}>{new Date(l.created_at).toLocaleString()}</td>
                                        <td style={tdStyle}>{l.actor_email || l.actor_admin_id?.slice(0, 8)}</td>
                                        <td style={tdStyle}>
                                            <span style={{ padding: '0.15rem 0.5rem', borderRadius: '4px', background: getActionColor(l.action), fontSize: '0.8rem', fontWeight: 600 }}>
                                                {l.action}
                                            </span>
                                        </td>
                                        <td style={tdStyle}>{l.entity_type} ({l.entity_id?.slice(0, 8)}...)</td>
                                        <td style={tdStyle}>
                                            <code style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
                                                {JSON.stringify(l.metadata).slice(0, 100)}
                                            </code>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1rem' }}>
                        <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} style={paginationBtn}>← Prev</button>
                        <span style={{ padding: '0.5rem 1rem', color: 'var(--muted-foreground)' }}>Page {page}</span>
                        <button onClick={() => setPage(p => p + 1)} style={paginationBtn}>Next →</button>
                    </div>
                </>
            )}
        </div>
    );
}

function getActionColor(action: string): string {
    if (action.includes('approve')) return 'rgba(34,197,94,0.15)';
    if (action.includes('reject') || action.includes('delete')) return 'rgba(239,68,68,0.15)';
    if (action.includes('create')) return 'rgba(56,189,248,0.15)';
    return 'rgba(148,163,184,0.15)';
}

const thStyle: React.CSSProperties = { padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: 'var(--muted-foreground)', fontSize: '0.8rem', textTransform: 'uppercase' };
const tdStyle: React.CSSProperties = { padding: '0.75rem 1rem' };
const paginationBtn: React.CSSProperties = { padding: '0.5rem 1rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--muted-foreground)', cursor: 'pointer', fontSize: '0.85rem' };
