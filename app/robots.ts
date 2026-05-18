import type { MetadataRoute } from 'next';

/**
 * robots.txt — allow public, disallow admin routes.
 */
export default function robots(): MetadataRoute.Robots {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://hitouae.com';

    return {
        rules: [
            {
                userAgent: '*',
                allow: '/',
                disallow: ['/dashboard/', '/api/admin/'],
            },
        ],
        sitemap: `${siteUrl}/sitemap.xml`,
    };
}
