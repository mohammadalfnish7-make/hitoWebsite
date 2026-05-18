import { NextResponse } from 'next/server';
import { getServices } from '@/features/services';

/**
 * GET /api/services
 * Public — list all active services with their sub-services count.
 */
export async function GET() {
    try {
        const services = await getServices();
        return NextResponse.json(services);
    } catch (err) {
        console.error('[GET /api/services]', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
