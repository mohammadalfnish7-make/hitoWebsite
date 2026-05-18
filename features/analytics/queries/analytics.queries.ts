import { sql } from '@/shared/lib/db';

/**
 * Dual upsert for service_page_views.
 * Uses two separate statements targeting partial indexes.
 */
export async function trackView(serviceId: string, subServiceId?: string): Promise<void> {
    if (subServiceId) {
        // Sub-service page: conflict on (service_id, sub_service_id, view_date) WHERE sub_service_id IS NOT NULL
        await sql`
      INSERT INTO service_page_views (id, service_id, sub_service_id, view_date, view_count)
      VALUES (gen_random_uuid(), ${serviceId}, ${subServiceId}, CURRENT_DATE, 1)
      ON CONFLICT (service_id, sub_service_id, view_date) WHERE sub_service_id IS NOT NULL
      DO UPDATE SET view_count = service_page_views.view_count + 1
    `;
    } else {
        // Service-only page: conflict on (service_id, view_date) WHERE sub_service_id IS NULL
        await sql`
      INSERT INTO service_page_views (id, service_id, sub_service_id, view_date, view_count)
      VALUES (gen_random_uuid(), ${serviceId}, NULL, CURRENT_DATE, 1)
      ON CONFLICT (service_id, view_date) WHERE sub_service_id IS NULL
      DO UPDATE SET view_count = service_page_views.view_count + 1
    `;
    }
}
