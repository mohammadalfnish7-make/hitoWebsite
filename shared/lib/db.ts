import postgres from 'postgres';

/**
 * Database singleton client.
 * 
 * CRITICAL: Do NOT create a new postgres() instance per route handler.
 * App Router creates many short-lived functions — without a singleton
 * you will exhaust PostgreSQL connections under real traffic.
 * 
 * Feature query files (e.g. features/services/queries/services.queries.ts)
 * import this client. No queries live in this file.
 */

const globalForDb = globalThis as typeof globalThis & {
    sql: ReturnType<typeof postgres> | undefined;
};

function createClient() {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
        throw new Error(
            'DATABASE_URL is not set. Check your .env.local file.'
        );
    }

    return postgres(connectionString, {
        max: 10,               // Max connections in pool
        idle_timeout: 20,      // Close idle connections after 20s
        connect_timeout: 10,   // Timeout on initial connect
    });
}

export const sql = globalForDb.sql ?? createClient();

if (process.env.NODE_ENV !== 'production') {
    globalForDb.sql = sql;
}
