import { NextResponse } from 'next/server';
import { sql } from '@/shared/lib/db';
import { redis } from '@/shared/lib/rate-limit';

/**
 * GET /api/health
 * 
 * Health check endpoint that verifies both DB and Redis connectivity.
 * Returns per-component status. Used by Docker healthcheck and monitoring.
 */
export async function GET() {
    const status: Record<string, string> = {
        db: 'unknown',
        redis: 'unknown',
        status: 'healthy',
    };

    // Check PostgreSQL
    try {
        await sql`SELECT 1`;
        status.db = 'ok';
    } catch (err) {
        status.db = 'error';
        status.status = 'unhealthy';
    }

    // Check Redis
    try {
        const pong = await redis.ping();
        status.redis = pong === 'PONG' ? 'ok' : 'error';
    } catch (err) {
        status.redis = 'error';
        status.status = 'unhealthy';
    }

    const httpStatus = status.status === 'healthy' ? 200 : 503;

    return NextResponse.json(status, { status: httpStatus });
}
