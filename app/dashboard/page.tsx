import { sql } from '@/shared/lib/db';

export default async function DashboardPage() {
    const [serviceCount] = await sql`SELECT COUNT(*) as count FROM services WHERE deleted_at IS NULL`;
    const [subServiceCount] = await sql`SELECT COUNT(*) as count FROM sub_services WHERE deleted_at IS NULL`;
    const [doctorCount] = await sql`SELECT COUNT(*) as count FROM doctors WHERE deleted_at IS NULL`;
    const [pendingComments] = await sql`SELECT COUNT(*) as count FROM comments WHERE is_visible = false`;
    const [pendingDeletions] = await sql`SELECT COUNT(*) as count FROM data_deletion_requests WHERE status = 'pending'`;
    const [todayViews] = await sql`SELECT COALESCE(SUM(view_count), 0) as total FROM service_page_views WHERE view_date = CURRENT_DATE`;

    const stats = [
        { label: 'Services', value: Number(serviceCount?.count ?? 0), icon: '🏥', color: '#38bdf8' },
        { label: 'Sub-Services', value: Number(subServiceCount?.count ?? 0), icon: '🔬', color: '#22d3ee' },
        { label: 'Doctors', value: Number(doctorCount?.count ?? 0), icon: '👨‍⚕️', color: '#a78bfa' },
        { label: 'Pending Comments', value: Number(pendingComments?.count ?? 0), icon: '💬', color: '#fb923c' },
        { label: 'Deletion Requests', value: Number(pendingDeletions?.count ?? 0), icon: '🗑️', color: '#f87171' },
        { label: 'Views Today', value: Number(todayViews?.total ?? 0), icon: '📈', color: '#4ade80' },
    ];

    return (
        <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '2rem' }}>Dashboard Overview</h1>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1.25rem' }}>
                {stats.map((stat) => (
                    <div
                        key={stat.label}
                        style={{
                            background: 'var(--muted)',
                            borderRadius: '12px',
                            padding: '1.5rem',
                            border: '1px solid var(--border)',
                            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                            <span style={{ fontSize: '1.5rem' }}>{stat.icon}</span>
                            <span style={{ fontSize: '2rem', fontWeight: 700, color: stat.color }}>{stat.value}</span>
                        </div>
                        <p style={{ color: 'var(--muted-foreground)', fontSize: '0.85rem', fontWeight: 500 }}>{stat.label}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}
