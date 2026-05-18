import { NextResponse } from 'next/server';
import { z } from 'zod';
import { sql } from '@/shared/lib/db';
import { auth } from '@/shared/lib/auth';
import { writeAuditLog } from '@/features/audit';

/**
 * GET /api/admin/comments — list all comments (for moderation)
 */
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const serviceId = searchParams.get('service_id');
        const status = searchParams.get('status'); // 'pending' | 'approved' | 'all'

        let rows;
        if (serviceId && status === 'pending') {
            rows = await sql`
        SELECT c.*, s.name_en as service_name, ss.name_en as sub_service_name
        FROM comments c
        LEFT JOIN services s ON s.id = c.service_id
        LEFT JOIN sub_services ss ON ss.id = c.sub_service_id
        WHERE c.service_id = ${serviceId} AND c.is_visible = false
        ORDER BY c.created_at DESC
      `;
        } else if (serviceId) {
            rows = await sql`
        SELECT c.*, s.name_en as service_name, ss.name_en as sub_service_name
        FROM comments c
        LEFT JOIN services s ON s.id = c.service_id
        LEFT JOIN sub_services ss ON ss.id = c.sub_service_id
        WHERE c.service_id = ${serviceId}
        ORDER BY c.created_at DESC
      `;
        } else if (status === 'pending') {
            rows = await sql`
        SELECT c.*, s.name_en as service_name, ss.name_en as sub_service_name
        FROM comments c
        LEFT JOIN services s ON s.id = c.service_id
        LEFT JOIN sub_services ss ON ss.id = c.sub_service_id
        WHERE c.is_visible = false
        ORDER BY c.created_at DESC
      `;
        } else {
            rows = await sql`
        SELECT c.*, s.name_en as service_name, ss.name_en as sub_service_name
        FROM comments c
        LEFT JOIN services s ON s.id = c.service_id
        LEFT JOIN sub_services ss ON ss.id = c.sub_service_id
        ORDER BY c.created_at DESC
        LIMIT 200
      `;
        }

        return NextResponse.json(rows);
    } catch (err) {
        console.error('[GET /api/admin/comments]', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

/**
 * PUT /api/admin/comments — approve/reject a comment
 */
export async function PUT(req: Request) {
    try {
        const session = await auth();
        const body = await req.json();
        const { id, is_visible } = body;

        if (!id || typeof is_visible !== 'boolean') {
            return NextResponse.json({ error: 'id and is_visible (boolean) are required' }, { status: 400 });
        }

        const [row] = await sql`
      UPDATE comments SET is_visible = ${is_visible} WHERE id = ${id} RETURNING *
    `;

        if (!row) {
            return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
        }

        await writeAuditLog({
            actor_admin_id: session?.user?.id || 'unknown',
            action: is_visible ? 'comment.approve' : 'comment.reject',
            entity_type: 'comment',
            entity_id: id,
            metadata: { admin_email: session?.user?.email, author_name: row.author_name },
        });

        return NextResponse.json(row);
    } catch (err) {
        console.error('[PUT /api/admin/comments]', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
