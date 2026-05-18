import { NextResponse } from 'next/server';
import { z } from 'zod';
import { sql } from '@/shared/lib/db';
import { auth } from '@/shared/lib/auth';
import { writeAuditLog } from '@/features/audit';

const createServiceSchema = z.object({
    slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
    name_en: z.string().min(1).max(255),
    name_ar: z.string().max(255).optional(),
    description: z.string().optional(),
    meta_title: z.record(z.string()).optional(),
    meta_description: z.record(z.string()).optional(),
    chatwoot_website_token: z.string().max(100).optional(),
    order: z.number().int().min(0).optional(),
});

const updateServiceSchema = createServiceSchema.partial();

/**
 * GET /api/admin/services — list all services (including soft-deleted for admin)
 */
export async function GET() {
    try {
        const rows = await sql`
      SELECT id, slug, name_en, name_ar, description,
             meta_title, meta_description, chatwoot_website_token,
             "order", deleted_at, created_at, updated_at
      FROM services
      ORDER BY "order" ASC, created_at ASC
    `;
        return NextResponse.json(rows);
    } catch (err) {
        console.error('[GET /api/admin/services]', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

/**
 * POST /api/admin/services — create a new service
 */
export async function POST(req: Request) {
    try {
        const session = await auth();
        const body = await req.json();
        const parsed = createServiceSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
        }

        const data = parsed.data;
        const [row] = await sql`
      INSERT INTO services (id, slug, name_en, name_ar, description, meta_title, meta_description, chatwoot_website_token, "order")
      VALUES (gen_random_uuid(), ${data.slug}, ${data.name_en}, ${data.name_ar ?? null},
              ${data.description ?? null}, ${JSON.stringify(data.meta_title ?? {})},
              ${JSON.stringify(data.meta_description ?? {})},
              ${data.chatwoot_website_token ?? null}, ${data.order ?? 0})
      RETURNING *
    `;

        await writeAuditLog({
            actor_admin_id: session?.user?.id || 'unknown',
            action: 'service.create',
            entity_type: 'service',
            entity_id: row.id,
            metadata: { name_en: data.name_en, slug: data.slug, admin_email: session?.user?.email },
        });

        return NextResponse.json(row, { status: 201 });
    } catch (err: any) {
        if (err?.code === '23505') {
            return NextResponse.json({ error: 'A service with this slug already exists' }, { status: 409 });
        }
        console.error('[POST /api/admin/services]', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
