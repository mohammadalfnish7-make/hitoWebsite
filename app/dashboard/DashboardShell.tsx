'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { DashboardSignOut } from './DashboardSignOut';

const navItems = [
    { label: 'Overview', href: '/dashboard', icon: '📊' },
    { label: 'Services', href: '/dashboard/services', icon: '🏥' },
    { label: 'Sub-Services', href: '/dashboard/sub-services', icon: '🔬' },
    { label: 'Doctors', href: '/dashboard/doctors', icon: '👨‍⚕️' },
    { label: 'Comments', href: '/dashboard/comments', icon: '💬' },
    { label: 'Deletion Requests', href: '/dashboard/deletion-requests', icon: '🗑️' },
    { label: 'Analytics', href: '/dashboard/analytics', icon: '📈' },
    { label: 'Translations', href: '/dashboard/translations', icon: '🌐' },
    { label: 'Audit Log', href: '/dashboard/audit-log', icon: '📋' },
];

export function DashboardShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isLogin = pathname === '/dashboard/login';

    if (isLogin) {
        return <>{children}</>;
    }

    return (
        <div className="dashboard-container">
            <aside className="dashboard-sidebar">
                <div className="sidebar-header">
                    <h2 className="sidebar-logo">Hito Admin</h2>
                </div>
                <nav className="sidebar-nav">
                    {navItems.map((item) => (
                        <Link key={item.href} href={item.href} className="sidebar-link">
                            <span className="sidebar-icon">{item.icon}</span>
                            <span>{item.label}</span>
                        </Link>
                    ))}
                </nav>
                <div className="sidebar-footer">
                    <DashboardSignOut />
                </div>
            </aside>
            <main className="dashboard-main">
                {children}
            </main>
            <style>{`
        .dashboard-container { display: flex; min-height: 100vh; background: var(--background); color: var(--foreground); }
        .dashboard-sidebar { width: 260px; background: linear-gradient(180deg, #0f172a 0%, #1e293b 100%); color: #e2e8f0; display: flex; flex-direction: column; position: fixed; top: 0; left: 0; height: 100vh; z-index: 50; box-shadow: 4px 0 24px rgba(0,0,0,0.15); }
        .sidebar-header { padding: 1.5rem; border-bottom: 1px solid rgba(255,255,255,0.08); }
        .sidebar-logo { font-size: 1.25rem; font-weight: 700; background: linear-gradient(135deg, #38bdf8 0%, #22d3ee 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; letter-spacing: -0.02em; }
        .sidebar-nav { flex: 1; padding: 0.75rem; overflow-y: auto; }
        .sidebar-link { display: flex; align-items: center; gap: 0.75rem; padding: 0.7rem 1rem; border-radius: 8px; font-size: 0.9rem; font-weight: 500; color: #94a3b8; transition: all 0.15s ease; text-decoration: none; margin-bottom: 2px; }
        .sidebar-link:hover { background: rgba(56, 189, 248, 0.1); color: #f1f5f9; }
        .sidebar-icon { font-size: 1.1rem; }
        .sidebar-footer { padding: 1rem 1.5rem; border-top: 1px solid rgba(255,255,255,0.08); }
        .btn-signout { width: 100%; padding: 0.6rem; border-radius: 8px; border: 1px solid rgba(255,255,255,0.15); background: transparent; color: #94a3b8; font-size: 0.85rem; cursor: pointer; transition: all 0.15s ease; }
        .btn-signout:hover { background: rgba(239, 68, 68, 0.15); color: #f87171; border-color: rgba(239, 68, 68, 0.3); }
        .dashboard-main { margin-left: 260px; flex: 1; padding: 2rem; min-height: 100vh; }
      `}</style>
        </div>
    );
}
