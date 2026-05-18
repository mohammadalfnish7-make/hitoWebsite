import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { sql } from '@/shared/lib/db';
import { z } from 'zod';

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
});

const DEFAULT_ADMIN_EMAIL = 'admin@hito.local';

function getConfiguredAdminPassword(): string | undefined {
    if (process.env.NODE_ENV === 'development') {
        return process.env.DEV_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || 'admin123';
    }
    return process.env.ADMIN_PASSWORD || process.env.DEV_ADMIN_PASSWORD;
}

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

                // Ensure default admin exists (seed may not run on Coolify DB init)
                if (!admin && email === DEFAULT_ADMIN_EMAIL) {
                    await sql`
            INSERT INTO admin_users (id, email, role, is_active)
            VALUES ('00000000-0000-0000-0000-000000000001', ${DEFAULT_ADMIN_EMAIL}, 'admin', true)
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

                const expectedPassword = getConfiguredAdminPassword();
                if (!expectedPassword) {
                    console.error(
                        '[auth] ADMIN_PASSWORD is not set. Add it in Coolify environment variables.'
                    );
                    return null;
                }

                const password = parsed.data.password;
                if (password !== expectedPassword) return null;

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
