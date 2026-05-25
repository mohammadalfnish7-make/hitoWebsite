import { NextResponse } from 'next/server';
import { z } from 'zod';
import { sql } from '@/shared/lib/db';
import { auth } from '@/shared/lib/auth';
import { writeAuditLog } from '@/features/audit';
import { revalidateTag } from 'next/cache';

const createLocaleSchema = z.object({
    code: z.string().min(2).max(5).regex(/^[a-z]{2,3}(-[A-Z]{2})?$/),
    name: z.string().min(1).max(100),
    is_rtl: z.boolean().default(false),
    is_active: z.boolean().default(true),
    order: z.number().int().min(0).default(0),
});

export async function GET() {
    try {
        const rows = await sql`
            SELECT code, name, is_rtl, is_active, "order", created_at
            FROM locales
            ORDER BY "order" ASC, code ASC
        `;
        return NextResponse.json(rows);
    } catch (err) {
        console.error('[GET /api/admin/locales]', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await auth();
        const body = await req.json();
        const parsed = createLocaleSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
        }

        const data = parsed.data;
        const [row] = await sql`
            INSERT INTO locales (code, name, is_rtl, is_active, "order")
            VALUES (${data.code}, ${data.name}, ${data.is_rtl}, ${data.is_active}, ${data.order})
            RETURNING *
        `;

        await writeAuditLog({
            actor_admin_id: session?.user?.id || 'unknown',
            action: 'locale.create',
            entity_type: 'locale',
            entity_id: undefined,
            metadata: { code: data.code, name: data.name, admin_email: session?.user?.email },
        });

        revalidateTag('locales');

        return NextResponse.json(row, { status: 201 });
    } catch (err: any) {
        if (err?.code === '23505') {
            return NextResponse.json({ error: 'A locale with this code already exists' }, { status: 409 });
        }
        console.error('[POST /api/admin/locales]', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
