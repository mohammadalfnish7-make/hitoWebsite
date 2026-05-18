import { NextResponse } from 'next/server';
import { z } from 'zod';
import { sql } from '@/shared/lib/db';
import { auth } from '@/shared/lib/auth';
import { writeAuditLog } from '@/features/audit';

const updateSubServiceSchema = z.object({
    slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
    name_en: z.string().min(1).max(255),
    name_ar: z.string().max(255).optional().nullable(),
    description: z.string().optional().nullable(),
    meta_title: z.record(z.string()).optional().nullable(),
    meta_description: z.record(z.string()).optional().nullable(),
    chatwoot_website_token: z.string().max(100).optional().nullable(),
    main_image_url: z.string().url().optional().nullable(),
    avg_cost_uae: z.number().positive().optional().nullable(),
    avg_cost_home_country: z.number().positive().optional().nullable(),
    cost_uae_currency: z.string().length(3).optional().nullable(),
    cost_home_currency: z.string().length(3).optional().nullable(),
    cost_notes: z.record(z.string()).optional().nullable(),
    cost_last_updated_at: z.string().optional().nullable(),
    order: z.number().int().min(0),
});

/**
 * PUT /api/admin/sub-services/[id]
 */
export async function PUT(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await auth();
        const { id } = await params;
        const body = await req.json();
        const parsed = updateSubServiceSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
        }
        const d = parsed.data;

        const [row] = await sql`
      UPDATE sub_services SET
        slug = ${d.slug},
        name_en = ${d.name_en},
        name_ar = ${d.name_ar ?? null},
        description = ${d.description ?? null},
        meta_title = ${d.meta_title ? JSON.stringify(d.meta_title) : null},
        meta_description = ${d.meta_description ? JSON.stringify(d.meta_description) : null},
        chatwoot_website_token = ${d.chatwoot_website_token ?? null},
        main_image_url = ${d.main_image_url ?? null},
        avg_cost_uae = ${d.avg_cost_uae ?? null},
        avg_cost_home_country = ${d.avg_cost_home_country ?? null},
        cost_uae_currency = ${d.cost_uae_currency ?? null},
        cost_home_currency = ${d.cost_home_currency ?? null},
        cost_notes = ${d.cost_notes ? JSON.stringify(d.cost_notes) : null},
        cost_last_updated_at = ${d.cost_last_updated_at ?? null},
        "order" = ${d.order}
      WHERE id = ${id}
      RETURNING *
    `;
        if (!row) {
            return NextResponse.json({ error: 'Sub-service not found' }, { status: 404 });
        }

        const session = await auth();
        await writeAuditLog({
            actor_admin_id: session?.user?.id || 'unknown',
            action: 'sub_service.update',
            entity_type: 'sub_service',
            entity_id: id,
            metadata: { admin_email: session?.user?.email },
        });

        return NextResponse.json(row);
    } catch (err: any) {
        if (err?.code === '23505') {
            return NextResponse.json({ error: 'A sub-service with this slug already exists for this service' }, { status: 409 });
        }
        console.error('[PUT /api/admin/sub-services/:id]', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

/**
 * DELETE /api/admin/sub-services/[id] — soft-delete
 */
export async function DELETE(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await auth();
        const { id } = await params;

        const [row] = await sql`
      UPDATE sub_services SET deleted_at = NOW() WHERE id = ${id} RETURNING *
    `;
        if (!row) {
            return NextResponse.json({ error: 'Sub-service not found' }, { status: 404 });
        }

        const session = await auth();
        await writeAuditLog({
            actor_admin_id: session?.user?.id || 'unknown',
            action: 'sub_service.delete',
            entity_type: 'sub_service',
            entity_id: id,
            metadata: { admin_email: session?.user?.email },
        });

        return NextResponse.json({ ok: true });
    } catch (err) {
        console.error('[DELETE /api/admin/sub-services/:id]', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
