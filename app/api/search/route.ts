import { NextResponse } from 'next/server';
import { searchAll } from '@/features/search';

/**
 * GET /api/search?q=dental
 * Public — lightweight search across services, sub-services, and doctors.
 */
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const q = searchParams.get('q')?.trim();

        if (!q || q.length < 2) {
            return NextResponse.json({ error: 'Query must be at least 2 characters' }, { status: 400 });
        }

        if (q.length > 200) {
            return NextResponse.json({ error: 'Query too long' }, { status: 400 });
        }

        const results = await searchAll(q);
        return NextResponse.json(results);
    } catch (err) {
        console.error('[GET /api/search]', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
