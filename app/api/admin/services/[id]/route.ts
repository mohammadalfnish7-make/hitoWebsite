import { NextResponse } from 'next/server';
import { z } from 'zod';
import { sql } from '@/shared/lib/db';
import { auth } from '@/shared/lib/auth';
import { writeAuditLog } from '@/features/audit';

const updateServiceSchema = z.object({
    slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/).optional(),
    name_en: z.string().min(1).max(255).optional(),
    name_ar: z.string().max(255).optional(),
    description: z.string().optional(),
    meta_title: z.record(z.string()).optional(),
    meta_description: z.record(z.string()).optional(),
    chatwoot_website_token: z.string().max(100).optional(),
    order: z.number().int().min(0).optional(),
});

/**
 * GET /api/admin/services/[id] — get a single service by ID
 */
export async function GET(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const [row] = await sql`SELECT * FROM services WHERE id = ${id}`;
        if (!row) {
            return NextResponse.json({ error: 'Service not found' }, { status: 404 });
        }
        return NextResponse.json(row);
    } catch (err) {
        console.error('[GET /api/admin/services/:id]', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

/**
 * PUT /api/admin/services/[id] — update a service
 */
export async function PUT(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const session = await auth();
        const body = await req.json();
        const parsed = updateServiceSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
        }

        const data = parsed.data;

        // Build dynamic update
        const sets: string[] = [];
        const values: any[] = [];

        if (data.slug !== undefined) { sets.push('slug'); values.push(data.slug); }
        if (data.name_en !== undefined) { sets.push('name_en'); values.push(data.name_en); }
        if (data.name_ar !== undefined) { sets.push('name_ar'); values.push(data.name_ar); }
        if (data.description !== undefined) { sets.push('description'); values.push(data.description); }
        if (data.meta_title !== undefined) { sets.push('meta_title'); values.push(JSON.stringify(data.meta_title)); }
        if (data.meta_description !== undefined) { sets.push('meta_description'); values.push(JSON.stringify(data.meta_description)); }
        if (data.chatwoot_website_token !== undefined) { sets.push('chatwoot_website_token'); values.push(data.chatwoot_website_token); }
        if (data.order !== undefined) { sets.push('"order"'); values.push(data.order); }

        if (sets.length === 0) {
            return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
        }

        // Use a simple parameterized update (the postgres lib handles it)
        const [row] = await sql`
      UPDATE services
      SET slug = COALESCE(${data.slug ?? null}, slug),
          name_en = COALESCE(${data.name_en ?? null}, name_en),
          name_ar = COALESCE(${data.name_ar ?? null}, name_ar),
          description = COALESCE(${data.description ?? null}, description),
          meta_title = COALESCE(${data.meta_title ? JSON.stringify(data.meta_title) : null}::jsonb, meta_title),
          meta_description = COALESCE(${data.meta_description ? JSON.stringify(data.meta_description) : null}::jsonb, meta_description),
          chatwoot_website_token = COALESCE(${data.chatwoot_website_token ?? null}, chatwoot_website_token),
          "order" = COALESCE(${data.order ?? null}, "order")
      WHERE id = ${id}
      RETURNING *
    `;

        if (!row) {
            return NextResponse.json({ error: 'Service not found' }, { status: 404 });
        }

        await writeAuditLog({
            actor_admin_id: session?.user?.id || 'unknown',
            action: 'service.update',
            entity_type: 'service',
            entity_id: id,
            metadata: { changes: data, admin_email: session?.user?.email },
        });

        return NextResponse.json(row);
    } catch (err) {
        console.error('[PUT /api/admin/services/:id]', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

/**
 * DELETE /api/admin/services/[id] — soft-delete a service
 */
export async function DELETE(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const session = await auth();

        // Check for comments before soft-deleting
        const [commentCount] = await sql`
      SELECT COUNT(*) as count FROM comments WHERE service_id = ${id}
    `;
        if (parseInt(commentCount.count) > 0) {
            return NextResponse.json(
                { error: `This service has ${commentCount.count} comment(s). Please review/delete comments before removing the service.` },
                { status: 409 }
            );
        }

        const [row] = await sql`
      UPDATE services SET deleted_at = NOW() WHERE id = ${id} AND deleted_at IS NULL RETURNING id
    `;

        if (!row) {
            return NextResponse.json({ error: 'Service not found or already deleted' }, { status: 404 });
        }

        await writeAuditLog({
            actor_admin_id: session?.user?.id || 'unknown',
            action: 'service.soft_delete',
            entity_type: 'service',
            entity_id: id,
            metadata: { admin_email: session?.user?.email },
        });

        return NextResponse.json({ ok: true, message: 'Service soft-deleted' });
    } catch (err) {
        console.error('[DELETE /api/admin/services/:id]', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
