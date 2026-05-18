'use client';

import { useState, useEffect } from 'react';

export default function AnalyticsPage() {
    const [stats, setStats] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/admin/analytics')
            .then(r => r.json())
            .then(d => { setStats(d); setLoading(false); });
    }, []);

    return (
        <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem' }}>Analytics</h1>
            {loading ? <p>Loading...</p> : (
                <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                        <thead>
                            <tr style={{ background: 'var(--muted)' }}>
                                <th style={thStyle}>Service</th>
                                <th style={thStyle}>Slug</th>
                                <th style={thStyle}>Total Views</th>
                                <th style={thStyle}>Last View</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stats.map((s: any) => (
                                <tr key={s.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                    <td style={tdStyle}>{s.name_en}</td>
                                    <td style={tdStyle}><code>{s.slug}</code></td>
                                    <td style={tdStyle}>
                                        <span style={{ fontWeight: 700, color: '#38bdf8' }}>{s.total_views || 0}</span>
                                    </td>
                                    <td style={tdStyle}>{s.last_view_date ? new Date(s.last_view_date).toLocaleDateString() : '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

const thStyle: React.CSSProperties = { padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: 'var(--muted-foreground)', fontSize: '0.8rem', textTransform: 'uppercase' };
const tdStyle: React.CSSProperties = { padding: '0.75rem 1rem' };
