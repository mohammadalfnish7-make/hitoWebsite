import { NextResponse } from 'next/server';
import { getServiceBySlug } from '@/features/services';

/**
 * GET /api/services/[serviceSlug]
 * Public — get a single service by slug.
 */
export async function GET(
    _req: Request,
    { params }: { params: Promise<{ serviceSlug: string }> }
) {
    try {
        const { serviceSlug } = await params;
        const service = await getServiceBySlug(serviceSlug);
        if (!service) {
            return NextResponse.json({ error: 'Service not found' }, { status: 404 });
        }
        return NextResponse.json(service);
    } catch (err) {
        console.error('[GET /api/services/:slug]', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
