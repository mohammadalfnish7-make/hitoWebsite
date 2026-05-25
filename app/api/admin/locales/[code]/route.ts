import { NextResponse } from 'next/server';
import { z } from 'zod';
import { sql } from '@/shared/lib/db';
import { auth } from '@/shared/lib/auth';
import { writeAuditLog } from '@/features/audit';
import { revalidateTag } from 'next/cache';

const updateLocaleSchema = z.object({
    name: z.string().min(1).max(100).optional(),
    is_rtl: z.boolean().optional(),
    is_active: z.boolean().optional(),
    order: z.number().int().min(0).optional(),
});

interface RouteProps {
    params: Promise<{ code: string }>;
}

export async function PUT(req: Request, { params }: RouteProps) {
    try {
        const { code } = await params;
        const session = await auth();
        const body = await req.json();
        const parsed = updateLocaleSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
        }

        const data = parsed.data;
        
        const updates: string[] = [];
        const values: any[] = [];
        let i = 1;

        if (data.name !== undefined) {
            updates.push(`name = $${i++}`);
            values.push(data.name);
        }
        if (data.is_rtl !== undefined) {
            updates.push(`is_rtl = $${i++}`);
            values.push(data.is_rtl);
        }
        if (data.is_active !== undefined) {
            updates.push(`is_active = $${i++}`);
            values.push(data.is_active);
        }
        if (data.order !== undefined) {
            updates.push(`"order" = $${i++}`);
            values.push(data.order);
        }

        if (updates.length === 0) {
            return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
        }

        values.push(code);

        const query = `
            UPDATE locales 
            SET ${updates.join(', ')} 
            WHERE code = $${i} 
            RETURNING *
        `;

        const rows = await sql.unsafe(query, values as any);

        if (rows.length === 0) {
            return NextResponse.json({ error: 'Locale not found' }, { status: 404 });
        }

        await writeAuditLog({
            actor_admin_id: session?.user?.id || 'unknown',
            action: 'locale.update',
            entity_type: 'locale',
            entity_id: null,
            metadata: { code, updates: data, admin_email: session?.user?.email },
        });

        revalidateTag('locales');

        return NextResponse.json(rows[0]);
    } catch (err) {
        console.error('[PUT /api/admin/locales/[code]]', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
