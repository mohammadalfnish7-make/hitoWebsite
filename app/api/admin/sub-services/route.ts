import { NextResponse } from 'next/server';
import { z } from 'zod';
import { sql } from '@/shared/lib/db';
import { auth } from '@/shared/lib/auth';
import { writeAuditLog } from '@/features/audit';

const createSubServiceSchema = z.object({
    slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
    name_en: z.string().min(1).max(255),
    name_ar: z.string().max(255).optional(),
    names: z.record(z.string()).optional(),
    description: z.string().optional(),
    meta_title: z.record(z.string()).optional(),
    meta_description: z.record(z.string()).optional(),
    chatwoot_website_token: z.string().max(100).optional(),
    main_image_url: z.string().url().optional(),
    avg_cost_uae: z.number().positive().optional(),
    avg_cost_home_country: z.number().positive().optional(),
    cost_uae_currency: z.string().length(3).optional(),
    cost_home_currency: z.string().length(3).optional(),
    cost_notes: z.record(z.string()).optional(),
    order: z.number().int().min(0).optional(),
});

/**
 * GET /api/admin/sub-services?service_id=...
 */
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const serviceId = searchParams.get('service_id');

        if (!serviceId) {
            return NextResponse.json({ error: 'service_id is required' }, { status: 400 });
        }

        const rows = await sql`
      SELECT * FROM sub_services
      WHERE service_id = ${serviceId}
      ORDER BY "order" ASC, created_at ASC
    `;
        return NextResponse.json(rows);
    } catch (err) {
        console.error('[GET /api/admin/sub-services]', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

/**
 * POST /api/admin/sub-services
 */
export async function POST(req: Request) {
    try {
        const session = await auth();
        const body = await req.json();
        const { service_id, ...rest } = body;

        if (!service_id) {
            return NextResponse.json({ error: 'service_id is required' }, { status: 400 });
        }

        const parsed = createSubServiceSchema.safeParse(rest);
        if (!parsed.success) {
            return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
        }

        const data = parsed.data;
        const [row] = await sql`
      INSERT INTO sub_services (id, service_id, slug, name_en, name_ar, names, description,
        meta_title, meta_description, chatwoot_website_token, main_image_url,
        avg_cost_uae, avg_cost_home_country, cost_uae_currency, cost_home_currency,
        cost_notes, "order")
      VALUES (gen_random_uuid(), ${service_id}, ${data.slug}, ${data.name_en},
        ${data.name_ar ?? null}, ${data.names ? JSON.stringify(data.names) : null}, ${data.description ?? null},
        ${data.meta_title ? JSON.stringify(data.meta_title) : null},
        ${data.meta_description ? JSON.stringify(data.meta_description) : null},
        ${data.chatwoot_website_token ?? null}, ${data.main_image_url ?? null},
        ${data.avg_cost_uae ?? null}, ${data.avg_cost_home_country ?? null},
        ${data.cost_uae_currency ?? 'AED'}, ${data.cost_home_currency ?? null},
        ${data.cost_notes ? JSON.stringify(data.cost_notes) : null},
        ${data.order ?? 0})
      RETURNING *
    `;

        await writeAuditLog({
            actor_admin_id: session?.user?.id || 'unknown',
            action: 'sub_service.create',
            entity_type: 'sub_service',
            entity_id: row.id,
            metadata: { name_en: data.name_en, slug: data.slug, service_id, admin_email: session?.user?.email },
        });

        return NextResponse.json(row, { status: 201 });
    } catch (err: any) {
        if (err?.code === '23505') {
            return NextResponse.json({ error: 'A sub-service with this slug already exists for this service' }, { status: 409 });
        }
        console.error('[POST /api/admin/sub-services]', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
