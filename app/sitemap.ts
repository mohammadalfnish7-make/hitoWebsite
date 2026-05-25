import { sql } from '@/shared/lib/db';
import type { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://hitouae.com';

/** Do not prerender at build time — DB is not available during Docker image build. */
export const dynamic = 'force-dynamic';

/**
 * Dynamic sitemap generation.
 * Generates locale-aware URLs for all active services and sub-services.
 * Uses updated_at for lastmod to help Google prioritize recrawling.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const entries: MetadataRoute.Sitemap = [];

    // Fetch active locales directly from DB for sitemap
    const locales = await sql`SELECT code FROM locales WHERE is_active = true`;
    const localeCodes = locales.map(l => l.code);

    // Home pages per locale
    for (const locale of localeCodes) {
        entries.push({
            url: `${SITE_URL}/${locale}`,
            lastModified: new Date(),
            changeFrequency: 'weekly',
            priority: 1.0,
        });

        entries.push({
            url: `${SITE_URL}/${locale}/services`,
            lastModified: new Date(),
            changeFrequency: 'weekly',
            priority: 0.9,
        });

        entries.push({
            url: `${SITE_URL}/${locale}/privacy`,
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 0.3,
        });
    }

    // Services
    const services = await sql`
    SELECT slug, updated_at FROM services WHERE deleted_at IS NULL
  `;

    for (const service of services) {
        for (const locale of localeCodes) {
            entries.push({
                url: `${SITE_URL}/${locale}/services/${service.slug}`,
                lastModified: new Date(service.updated_at),
                changeFrequency: 'weekly',
                priority: 0.8,
            });
        }
    }

    // Sub-services
    const subServices = await sql`
    SELECT ss.slug as sub_slug, s.slug as service_slug, ss.updated_at
    FROM sub_services ss
    JOIN services s ON s.id = ss.service_id
    WHERE ss.deleted_at IS NULL AND s.deleted_at IS NULL
  `;

    for (const sub of subServices) {
        for (const locale of localeCodes) {
            entries.push({
                url: `${SITE_URL}/${locale}/services/${sub.service_slug}/${sub.sub_slug}`,
                lastModified: new Date(sub.updated_at),
                changeFrequency: 'weekly',
                priority: 0.7,
            });
        }
    }

    return entries;
}
