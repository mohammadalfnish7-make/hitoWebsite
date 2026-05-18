import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createDeletionRequest } from '@/features/deletion-requests';
import { deletionLimiter } from '@/shared/lib/rate-limit';

const deletionRequestSchema = z.object({
    requester_email: z.string().email(),
    requester_name: z.string().max(255).optional(),
    reason: z.string().max(2000).optional(),
    website: z.string().optional(), // honeypot
});

/**
 * POST /api/data-deletion-request
 * Public — submit a data deletion request. Rate limited + honeypot.
 */
export async function POST(req: Request) {
    try {
        const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? 'unknown';
        const { success } = await deletionLimiter.limit(ip);
        if (!success) {
            return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
        }

        const body = await req.json();
        const parsed = deletionRequestSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
        }

        // Honeypot
        if (parsed.data.website) {
            return NextResponse.json({ ok: true, message: 'Your request has been received.' });
        }

        const result = await createDeletionRequest({
            requester_email: parsed.data.requester_email,
            requester_name: parsed.data.requester_name,
            reason: parsed.data.reason,
        });

        return NextResponse.json(result);
    } catch (err) {
        console.error('[POST /api/data-deletion-request]', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
