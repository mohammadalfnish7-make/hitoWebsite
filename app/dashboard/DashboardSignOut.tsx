'use client';

import { signOut } from 'next-auth/react';

export function DashboardSignOut() {
    return (
        <button
            type="button"
            className="btn-signout"
            onClick={() => signOut({ redirectTo: '/dashboard/login' })}
        >
            Sign Out
        </button>
    );
}
