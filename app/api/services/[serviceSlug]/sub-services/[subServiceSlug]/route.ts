import { NextResponse } from 'next/server';
import { getServiceBySlug } from '@/features/services';
import { getSubServiceBySlug } from '@/features/sub-services';

/**
 * GET /api/services/[serviceSlug]/sub-services/[subServiceSlug]
 * Public — get a sub-service by its parent service slug + its own slug.
 */
export async function GET(
    _req: Request,
    { params }: { params: Promise<{ serviceSlug: string; subServiceSlug: string }> }
) {
    try {
        const { serviceSlug, subServiceSlug } = await params;
        const service = await getServiceBySlug(serviceSlug);
        if (!service) {
            return NextResponse.json({ error: 'Service not found' }, { status: 404 });
        }
        const subService = await getSubServiceBySlug(service.id, subServiceSlug);
        if (!subService) {
            return NextResponse.json({ error: 'Sub-service not found' }, { status: 404 });
        }
        return NextResponse.json(subService);
    } catch (err) {
        console.error('[GET /api/services/:slug/sub-services/:subSlug]', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
