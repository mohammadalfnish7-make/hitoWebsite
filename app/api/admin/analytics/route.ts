import { NextResponse } from 'next/server';
import { sql } from '@/shared/lib/db';

/**
 * GET /api/admin/analytics?service_id=&from=&to=
 * Admin — query page views by service, sub-service, and date range.
 */
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const serviceId = searchParams.get('service_id');
        const from = searchParams.get('from');
        const to = searchParams.get('to');

        let rows;
        if (serviceId && from && to) {
            rows = await sql`
        SELECT spv.*, s.name_en as service_name, ss.name_en as sub_service_name
        FROM service_page_views spv
        LEFT JOIN services s ON s.id = spv.service_id
        LEFT JOIN sub_services ss ON ss.id = spv.sub_service_id
        WHERE spv.service_id = ${serviceId}
          AND spv.view_date >= ${from}::date
          AND spv.view_date <= ${to}::date
        ORDER BY spv.view_date DESC
      `;
        } else if (serviceId) {
            rows = await sql`
        SELECT spv.*, s.name_en as service_name, ss.name_en as sub_service_name
        FROM service_page_views spv
        LEFT JOIN services s ON s.id = spv.service_id
        LEFT JOIN sub_services ss ON ss.id = spv.sub_service_id
        WHERE spv.service_id = ${serviceId}
        ORDER BY spv.view_date DESC
        LIMIT 90
      `;
        } else {
            // Summary: total views per service
            rows = await sql`
        SELECT s.id, s.name_en, s.slug,
               SUM(spv.view_count)::int as total_views,
               MAX(spv.view_date) as last_view_date
        FROM services s
        LEFT JOIN service_page_views spv ON spv.service_id = s.id
        WHERE s.deleted_at IS NULL
        GROUP BY s.id, s.name_en, s.slug
        ORDER BY total_views DESC NULLS LAST
      `;
        }

        return NextResponse.json(rows);
    } catch (err) {
        console.error('[GET /api/admin/analytics]', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
