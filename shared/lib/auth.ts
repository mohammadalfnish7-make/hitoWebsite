import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { sql } from '@/shared/lib/db';
import { z } from 'zod';

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
    providers: [
        Credentials({
            name: 'credentials',
            credentials: {
                email: { label: 'Email', type: 'email' },
                password: { label: 'Password', type: 'password' },
            },
            async authorize(credentials) {
                const parsed = loginSchema.safeParse(credentials);
                if (!parsed.success) return null;

                const { email } = parsed.data;

                // Query admin_users table
                let [admin] = await sql`
          SELECT id, email, role
          FROM admin_users
          WHERE email = ${email}
            AND is_active = true
            AND deleted_at IS NULL
        `;

                // Dev: ensure default admin exists (migration seed only runs on fresh DB init)
                if (!admin && process.env.NODE_ENV === 'development' && email === 'admin@hito.local') {
                    await sql`
            INSERT INTO admin_users (id, email, role, is_active)
            VALUES ('00000000-0000-0000-0000-000000000001', 'admin@hito.local', 'admin', true)
            ON CONFLICT (email) DO NOTHING
          `;
                    [admin] = await sql`
            SELECT id, email, role
            FROM admin_users
            WHERE email = ${email}
              AND is_active = true
              AND deleted_at IS NULL
          `;
                }

                if (!admin) return null;

                // Dev-only: accept fixed password when no password column exists yet.
                // In production, add password_hash to admin_users and verify with bcrypt/argon2.
                const password = parsed.data.password;
                if (process.env.NODE_ENV === 'development') {
                    const devPassword = process.env.DEV_ADMIN_PASSWORD || 'admin123';
                    if (password !== devPassword) return null;
                } else {
                    // Production: no login until password_hash column + bcrypt/argon2 is added
                    return null;
                }

                return {
                    id: admin.id,
                    email: admin.email,
                    role: admin.role,
                };
            },
        }),
    ],
    pages: {
        signIn: '/dashboard/login',
    },
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.role = (user as { role?: string }).role;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.id as string;
                (session.user as { role?: string }).role = token.role as string;
            }
            return session;
        },
    },
    session: {
        strategy: 'jwt',
    },
});
