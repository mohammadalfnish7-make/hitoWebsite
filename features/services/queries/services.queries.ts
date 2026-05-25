import { sql } from '@/shared/lib/db';
import type { Service } from '../types';

/**
 * All SQL for the services feature lives here.
 * Route handlers and components call functions from the feature's index.ts.
 */

/** List all active services, ordered. */
export async function getServices(): Promise<Service[]> {
    const rows = await sql`
    SELECT id, slug, name_en, name_ar, names, description,
           meta_title, meta_description,
           chatwoot_website_token, "order",
           created_at, updated_at
    FROM services
    WHERE deleted_at IS NULL
    ORDER BY "order" ASC, created_at ASC
  `;
    return rows as unknown as Service[];
}

/** Get a single service by slug. Returns null if not found or soft-deleted. */
export async function getServiceBySlug(slug: string): Promise<Service | null> {
    const [row] = await sql`
    SELECT id, slug, name_en, name_ar, names, description,
           meta_title, meta_description,
           chatwoot_website_token, "order",
           created_at, updated_at
    FROM services
    WHERE slug = ${slug}
      AND deleted_at IS NULL
  `;
    return (row as unknown as Service) ?? null;
}

/** Create a new service. */
export async function createService(data: {
    slug: string;
    name_en: string;
    name_ar?: string;
    names?: Record<string, string>;
    description?: string;
    meta_title?: Record<string, string>;
    meta_description?: Record<string, string>;
    chatwoot_website_token?: string;
    order?: number;
}): Promise<Service> {
    const [row] = await sql`
    INSERT INTO services (id, slug, name_en, name_ar, names, description, meta_title, meta_description, chatwoot_website_token, "order")
    VALUES (gen_random_uuid(), ${data.slug}, ${data.name_en}, ${data.name_ar ?? null}, ${data.names ? JSON.stringify(data.names) : null},
            ${data.description ?? null}, ${JSON.stringify(data.meta_title ?? {})},
            ${JSON.stringify(data.meta_description ?? {})},
            ${data.chatwoot_website_token ?? null}, ${data.order ?? 0})
    RETURNING *
  `;
    return row as unknown as Service;
}

/** Soft-delete a service. */
export async function softDeleteService(id: string): Promise<void> {
    await sql`
    UPDATE services SET deleted_at = NOW() WHERE id = ${id}
  `;
}
