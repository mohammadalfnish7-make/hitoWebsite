import { NextResponse } from 'next/server';
import { sql } from '@/shared/lib/db';
import { auth } from '@/shared/lib/auth';
import { writeAuditLog } from '@/features/audit';

/**
 * GET /api/admin/deletion-requests
 */
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const status = searchParams.get('status');

        let rows;
        if (status) {
            rows = await sql`
        SELECT dr.*, au.email as reviewer_email
        FROM data_deletion_requests dr
        LEFT JOIN admin_users au ON au.id = dr.reviewed_by
        WHERE dr.status = ${status}
        ORDER BY dr.requested_at DESC
      `;
        } else {
            rows = await sql`
        SELECT dr.*, au.email as reviewer_email
        FROM data_deletion_requests dr
        LEFT JOIN admin_users au ON au.id = dr.reviewed_by
        ORDER BY dr.requested_at DESC
      `;
        }

        return NextResponse.json(rows);
    } catch (err) {
        console.error('[GET /api/admin/deletion-requests]', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

/**
 * PUT /api/admin/deletion-requests — approve/reject/complete a request
 */
export async function PUT(req: Request) {
    try {
        const session = await auth();
        const body = await req.json();
        const { id, status, internal_notes } = body;

        if (!id || !['approved', 'rejected', 'completed'].includes(status)) {
            return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
        }

        const updateFields: Record<string, any> = {
            status,
            reviewed_at: new Date().toISOString(),
            reviewed_by: session?.user?.id,
        };

        if (status === 'completed') {
            // Actually perform deletion — remove user's comments by email
            const [request] = await sql`SELECT * FROM data_deletion_requests WHERE id = ${id}`;
            if (request) {
                await sql`DELETE FROM comments WHERE author_email = ${request.requester_email}`;
            }
        }

        const [row] = await sql`
      UPDATE data_deletion_requests
      SET status = ${status},
          reviewed_at = NOW(),
          reviewed_by = ${session?.user?.id || null},
          completed_at = ${status === 'completed' ? sql`NOW()` : sql`completed_at`},
          internal_notes = COALESCE(${internal_notes || null}, internal_notes)
      WHERE id = ${id}
      RETURNING *
    `;

        if (!row) {
            return NextResponse.json({ error: 'Request not found' }, { status: 404 });
        }

        await writeAuditLog({
            actor_admin_id: session?.user?.id || 'unknown',
            action: `deletion.${status}`,
            entity_type: 'data_deletion_request',
            entity_id: id,
            metadata: {
                admin_email: session?.user?.email,
                requester_email: row.requester_email,
                chatwoot_reminder: status === 'completed'
                    ? 'REMINDER: Also purge this user\'s data from Chatwoot (PDPL compliance)'
                    : undefined,
            },
        });

        return NextResponse.json(row);
    } catch (err) {
        console.error('[PUT /api/admin/deletion-requests]', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
