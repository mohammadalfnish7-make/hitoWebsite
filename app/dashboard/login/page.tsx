'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';

export default function DashboardLogin() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const searchParams = useSearchParams();
    const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const result = await signIn('credentials', {
                email,
                password,
                redirect: false,
                callbackUrl,
            });

            if (result?.ok && result?.url) {
                window.location.href = result.url;
                return;
            }
            setError(result?.error === 'CredentialsSignin' ? 'Invalid email or password' : 'Sign in failed. Please try again.');
        } catch {
            setError('An error occurred. Please try again.');
        }
        setLoading(false);
    }

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
        }}>
            <div style={{
                width: '100%',
                maxWidth: '420px',
                background: 'rgba(30, 41, 59, 0.8)',
                backdropFilter: 'blur(20px)',
                borderRadius: '16px',
                padding: '2.5rem',
                border: '1px solid rgba(255,255,255,0.1)',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            }}>
                <h1 style={{
                    textAlign: 'center',
                    fontSize: '1.5rem',
                    fontWeight: 700,
                    marginBottom: '0.5rem',
                    background: 'linear-gradient(135deg, #38bdf8, #22d3ee)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                }}>Hito Admin</h1>
                <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem', marginBottom: '2rem' }}>
                    Sign in to manage your platform
                </p>

                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '1.25rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', color: '#94a3b8' }}>Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            style={{
                                width: '100%',
                                padding: '0.75rem 1rem',
                                borderRadius: '8px',
                                border: '1px solid rgba(255,255,255,0.15)',
                                background: 'rgba(15, 23, 42, 0.6)',
                                color: '#f1f5f9',
                                fontSize: '0.9rem',
                                outline: 'none',
                                transition: 'border-color 0.15s',
                            }}
                        />
                    </div>
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', color: '#94a3b8' }}>Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            style={{
                                width: '100%',
                                padding: '0.75rem 1rem',
                                borderRadius: '8px',
                                border: '1px solid rgba(255,255,255,0.15)',
                                background: 'rgba(15, 23, 42, 0.6)',
                                color: '#f1f5f9',
                                fontSize: '0.9rem',
                                outline: 'none',
                                transition: 'border-color 0.15s',
                            }}
                        />
                    </div>

                    {error && (
                        <p style={{ color: '#f87171', fontSize: '0.85rem', marginBottom: '1rem', textAlign: 'center' }}>{error}</p>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            width: '100%',
                            padding: '0.8rem',
                            borderRadius: '8px',
                            border: 'none',
                            background: 'linear-gradient(135deg, #0ea5e9, #06b6d4)',
                            color: '#fff',
                            fontSize: '0.95rem',
                            fontWeight: 600,
                            cursor: loading ? 'wait' : 'pointer',
                            opacity: loading ? 0.7 : 1,
                            transition: 'all 0.15s ease',
                        }}
                    >
                        {loading ? 'Signing in...' : 'Sign In'}
                    </button>
                </form>
            </div>
        </div>
    );
}
