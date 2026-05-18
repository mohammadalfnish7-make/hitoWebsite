import { Ratelimit } from '@upstash/ratelimit';
import Redis from 'ioredis';

/**
 * Three separate rate limiters — one per public POST endpoint.
 * Using ioredis for self-hosted Redis (Docker).
 * 
 * @upstash/ratelimit works with any Redis-compatible client
 * via the custom `redis` adapter.
 */

const redisUrl = process.env.REDIS_URL || 'redis://redis:6379';

const globalForRedis = globalThis as typeof globalThis & {
    redis: Redis | undefined;
};

export const redis = globalForRedis.redis ?? new Redis(redisUrl, {
    maxRetriesPerRequest: 3,
    retryStrategy(times: number) {
        if (times > 3) return null;       // Stop retrying after 3 attempts
        return Math.min(times * 200, 2000); // Exponential backoff
    },
    enableOfflineQueue: false,          // Fail fast if Redis is down
});

if (process.env.NODE_ENV !== 'production') {
    globalForRedis.redis = redis;
}

/**
 * Custom Redis adapter for @upstash/ratelimit using ioredis.
 * @upstash/ratelimit calls both eval and evalsha; ioredis supports both.
 */
const redisAdapter = {
    eval: async (script: string, keys: string[], args: (string | number)[]) => {
        return redis.eval(script, keys.length, ...keys, ...args);
    },
    evalsha: async (sha: string, keys: string[], args: (string | number)[]) => {
        return redis.evalsha(sha, keys.length, ...keys, ...args);
    },
};

// --- Comments: 5 requests per 10 minutes per IP ---
export const commentsLimiter = new Ratelimit({
    redis: redisAdapter as any,
    limiter: Ratelimit.slidingWindow(5, '10 m'),
    prefix: 'hito:rl:comments',
    analytics: false,
});

// --- Data Deletion Requests: 2 requests per hour per IP ---
export const deletionLimiter = new Ratelimit({
    redis: redisAdapter as any,
    limiter: Ratelimit.slidingWindow(2, '1 h'),
    prefix: 'hito:rl:deletion',
    analytics: false,
});

// --- Track View (Analytics): 60 requests per minute per IP ---
export const trackViewLimiter = new Ratelimit({
    redis: redisAdapter as any,
    limiter: Ratelimit.slidingWindow(60, '1 m'),
    prefix: 'hito:rl:trackview',
    analytics: false,
});
