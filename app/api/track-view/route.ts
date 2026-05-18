import { NextResponse } from 'next/server';
import { z } from 'zod';
import { trackView } from '@/features/analytics';
import { trackViewLimiter, getRedis } from '@/shared/lib/rate-limit';
import { cookies } from 'next/headers';
import { randomUUID } from 'crypto';

const trackViewSchema = z.object({
    service_id: z.string().uuid(),
    sub_service_id: z.string().uuid().optional(),
});

const SESSION_COOKIE = 'hito_sid';
const SESSION_TTL = 86400; // 24 hours in seconds

/**
 * POST /api/track-view
 * Public — record a page view. Rate limited + session dedup.
 */
export async function POST(req: Request) {
    try {
        const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? 'unknown';
        const { success } = await trackViewLimiter.limit(ip);
        if (!success) {
            return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
        }

        const body = await req.json();
        const parsed = trackViewSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
        }

        const { service_id, sub_service_id } = parsed.data;

        // Session-based dedup
        const cookieStore = await cookies();
        let sessionId = cookieStore.get(SESSION_COOKIE)?.value;
        let isNewSession = false;

        if (!sessionId) {
            sessionId = randomUUID();
            isNewSession = true;
        }

        const today = new Date().toISOString().split('T')[0];
        const dedupKey = `hito:dedup:${sessionId}:${service_id}:${sub_service_id || 'null'}:${today}`;

        // SET NX — only increment if this is a new visit for this session+page+day
        const redis = getRedis();
        if (redis.status !== 'ready') await redis.connect();
        const wasSet = await redis.set(dedupKey, '1', 'EX', SESSION_TTL, 'NX');

        if (wasSet) {
            await trackView(service_id, sub_service_id);
        }

        const response = NextResponse.json({ ok: true });

        // Set session cookie if new
        if (isNewSession) {
            response.cookies.set(SESSION_COOKIE, sessionId, {
                httpOnly: true,
                sameSite: 'lax',
                secure: process.env.NODE_ENV === 'production',
                maxAge: SESSION_TTL,
                path: '/',
            });
        }

        return response;
    } catch (err) {
        console.error('[POST /api/track-view]', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
