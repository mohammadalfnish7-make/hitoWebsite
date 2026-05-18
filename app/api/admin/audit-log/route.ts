import { NextResponse } from 'next/server';
import { sql } from '@/shared/lib/db';

/**
 * GET /api/admin/audit-log?entity_type=&actor_id=&from=&to=&page=
 * Admin — read-only, paginated audit log viewer (PDPL compliance).
 */
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const entityType = searchParams.get('entity_type');
        const actorId = searchParams.get('actor_id');
        const from = searchParams.get('from');
        const to = searchParams.get('to');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = 50;
        const offset = (page - 1) * limit;

        let rows;
        if (entityType && from && to) {
            rows = await sql`
        SELECT al.*, au.email as actor_email
        FROM audit_log al
        LEFT JOIN admin_users au ON au.id = al.actor_admin_id
        WHERE al.entity_type = ${entityType}
          AND al.created_at >= ${from}::timestamptz
          AND al.created_at <= ${to}::timestamptz
        ORDER BY al.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
        } else if (actorId) {
            rows = await sql`
        SELECT al.*, au.email as actor_email
        FROM audit_log al
        LEFT JOIN admin_users au ON au.id = al.actor_admin_id
        WHERE al.actor_admin_id = ${actorId}
        ORDER BY al.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
        } else {
            rows = await sql`
        SELECT al.*, au.email as actor_email
        FROM audit_log al
        LEFT JOIN admin_users au ON au.id = al.actor_admin_id
        ORDER BY al.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
        }

        return NextResponse.json({ data: rows, page, limit });
    } catch (err) {
        console.error('[GET /api/admin/audit-log]', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
