import { sql } from '@/shared/lib/db';
import type { SubService } from '../types';

/** List all active sub-services for a given service. */
export async function getSubServicesByServiceId(serviceId: string): Promise<SubService[]> {
    const rows = await sql`
    SELECT id, service_id, slug, name_en, name_ar, description,
           meta_title, meta_description, chatwoot_website_token,
           main_image_url, avg_cost_uae, avg_cost_home_country,
           cost_uae_currency, cost_home_currency, cost_notes,
           cost_last_updated_at, "order", created_at, updated_at
    FROM sub_services
    WHERE service_id = ${serviceId}
      AND deleted_at IS NULL
    ORDER BY "order" ASC, created_at ASC
  `;
    return rows as unknown as SubService[];
}

/** Get a single sub-service by its slug within a service. */
export async function getSubServiceBySlug(
    serviceId: string,
    slug: string
): Promise<SubService | null> {
    const [row] = await sql`
    SELECT id, service_id, slug, name_en, name_ar, description,
           meta_title, meta_description, chatwoot_website_token,
           main_image_url, avg_cost_uae, avg_cost_home_country,
           cost_uae_currency, cost_home_currency, cost_notes,
           cost_last_updated_at, "order", created_at, updated_at
    FROM sub_services
    WHERE service_id = ${serviceId}
      AND slug = ${slug}
      AND deleted_at IS NULL
  `;
    return (row as unknown as SubService) ?? null;
}
