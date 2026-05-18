import { sql } from '@/shared/lib/db';

export interface SearchResult {
    type: 'service' | 'sub_service' | 'doctor';
    id: string;
    slug: string;
    name_en: string;
    name_ar?: string;
    parent_slug?: string;
}

/** Lightweight search across services, sub-services, and doctors using pg_trgm. */
export async function searchAll(query: string): Promise<SearchResult[]> {
    const pattern = `%${query}%`;

    const services = await sql`
    SELECT 'service' as type, id, slug, name_en, name_ar, NULL as parent_slug
    FROM services
    WHERE deleted_at IS NULL
      AND (name_en ILIKE ${pattern} OR name_ar ILIKE ${pattern})
    LIMIT 10
  `;

    const subServices = await sql`
    SELECT 'sub_service' as type, ss.id, ss.slug, ss.name_en, ss.name_ar, s.slug as parent_slug
    FROM sub_services ss
    JOIN services s ON s.id = ss.service_id
    WHERE ss.deleted_at IS NULL AND s.deleted_at IS NULL
      AND (ss.name_en ILIKE ${pattern} OR ss.name_ar ILIKE ${pattern})
    LIMIT 10
  `;

    const doctors = await sql`
    SELECT 'doctor' as type, id, '' as slug, name_en, name_ar, NULL as parent_slug
    FROM doctors
    WHERE deleted_at IS NULL AND is_active = true
      AND (name_en ILIKE ${pattern} OR name_ar ILIKE ${pattern}
           OR specialty_en ILIKE ${pattern} OR specialty_ar ILIKE ${pattern})
    LIMIT 10
  `;

    return [...services, ...subServices, ...doctors] as unknown as SearchResult[];
}
