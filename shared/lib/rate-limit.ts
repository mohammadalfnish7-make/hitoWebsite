import { Ratelimit } from '@upstash/ratelimit';
import Redis from 'ioredis';

/**
 * Three separate rate limiters — one per public POST endpoint.
 * Using ioredis for self-hosted Redis (Docker).
 *
 * Redis is lazy-initialized so `next build` does not require db/redis
 * (e.g. Coolify Docker image build runs without compose network).
 */

const redisUrl = process.env.REDIS_URL || 'redis://redis:6379';

const globalForRedis = globalThis as typeof globalThis & {
    redis: Redis | undefined;
};

function createRedisClient(): Redis {
    const client = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        retryStrategy(times: number) {
            if (times > 3) return null;
            return Math.min(times * 200, 2000);
        },
        enableOfflineQueue: false,
        lazyConnect: true,
    });
    client.on('error', () => {
        // Avoid unhandled error events when Redis is unavailable at build time
    });
    return client;
}

/** Lazy Redis client — connects on first use, not at import time. */
export function getRedis(): Redis {
    if (!globalForRedis.redis) {
        globalForRedis.redis = createRedisClient();
    }
    return globalForRedis.redis;
}

/**
 * Custom Redis adapter for @upstash/ratelimit using ioredis.
 */
function getRedisAdapter() {
    return {
        eval: async (script: string, keys: string[], args: (string | number)[]) => {
            const redis = getRedis();
            await redis.connect().catch(() => undefined);
            return redis.eval(script, keys.length, ...keys, ...args);
        },
        evalsha: async (sha: string, keys: string[], args: (string | number)[]) => {
            const redis = getRedis();
            await redis.connect().catch(() => undefined);
            return redis.evalsha(sha, keys.length, ...keys, ...args);
        },
    };
}

let _commentsLimiter: Ratelimit | undefined;
let _deletionLimiter: Ratelimit | undefined;
let _trackViewLimiter: Ratelimit | undefined;

function getCommentsLimiter() {
    if (!_commentsLimiter) {
        _commentsLimiter = new Ratelimit({
            redis: getRedisAdapter() as any,
            limiter: Ratelimit.slidingWindow(5, '10 m'),
            prefix: 'hito:rl:comments',
            analytics: false,
        });
    }
    return _commentsLimiter;
}

function getDeletionLimiter() {
    if (!_deletionLimiter) {
        _deletionLimiter = new Ratelimit({
            redis: getRedisAdapter() as any,
            limiter: Ratelimit.slidingWindow(2, '1 h'),
            prefix: 'hito:rl:deletion',
            analytics: false,
        });
    }
    return _deletionLimiter;
}

function getTrackViewLimiter() {
    if (!_trackViewLimiter) {
        _trackViewLimiter = new Ratelimit({
            redis: getRedisAdapter() as any,
            limiter: Ratelimit.slidingWindow(60, '1 m'),
            prefix: 'hito:rl:trackview',
            analytics: false,
        });
    }
    return _trackViewLimiter;
}

/** @deprecated Use getRedis() — kept for health/track-view routes */
export const redis = {
    ping: async () => {
        const client = getRedis();
        if (client.status !== 'ready') {
            await client.connect();
        }
        return client.ping();
    },
    set: async (...args: Parameters<Redis['set']>) => {
        const client = getRedis();
        if (client.status !== 'ready') {
            await client.connect();
        }
        return client.set(...args);
    },
} as Pick<Redis, 'ping' | 'set'>;

export const commentsLimiter = {
    limit: (identifier: string) => getCommentsLimiter().limit(identifier),
};

export const deletionLimiter = {
    limit: (identifier: string) => getDeletionLimiter().limit(identifier),
};

export const trackViewLimiter = {
    limit: (identifier: string) => getTrackViewLimiter().limit(identifier),
};
