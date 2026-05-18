import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createComment, getVisibleComments } from '@/features/comments';
import { commentsLimiter } from '@/shared/lib/rate-limit';

const createCommentSchema = z.object({
    service_id: z.string().uuid(),
    sub_service_id: z.string().uuid().optional(),
    author_name: z.string().min(1).max(255),
    author_email: z.string().email(),
    content: z.string().min(1).max(5000),
    locale: z.string().min(2).max(5),
    website: z.string().optional(), // honeypot
});

/**
 * GET /api/comments?service_id=&sub_service_id=
 * Public — list visible comments for a service/sub-service.
 */
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const serviceId = searchParams.get('service_id');
        const subServiceId = searchParams.get('sub_service_id') || undefined;

        if (!serviceId) {
            return NextResponse.json({ error: 'service_id is required' }, { status: 400 });
        }

        const comments = await getVisibleComments(serviceId, subServiceId);
        return NextResponse.json(comments);
    } catch (err) {
        console.error('[GET /api/comments]', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

/**
 * POST /api/comments
 * Public — submit a new comment. Rate limited + honeypot.
 */
export async function POST(req: Request) {
    try {
        // Rate limit
        const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? 'unknown';
        const { success } = await commentsLimiter.limit(ip);
        if (!success) {
            return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
        }

        const body = await req.json();
        const parsed = createCommentSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
        }

        // Honeypot — if the hidden field is filled, silently succeed
        if (parsed.data.website) {
            return NextResponse.json({ ok: true, message: 'Thank you for your feedback!' });
        }

        const comment = await createComment({
            service_id: parsed.data.service_id,
            sub_service_id: parsed.data.sub_service_id,
            author_name: parsed.data.author_name,
            author_email: parsed.data.author_email,
            content: parsed.data.content,
            locale: parsed.data.locale,
        });

        return NextResponse.json({
            ok: true,
            message: 'Your comment has been submitted and will appear after moderation.',
            id: comment.id,
        });
    } catch (err) {
        console.error('[POST /api/comments]', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
