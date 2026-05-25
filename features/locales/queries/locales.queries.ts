import { sql } from '@/shared/lib/db';
import type { Locale } from '../types';

/** Get all active locales ordered by display order. */
export async function getActiveLocales(): Promise<Locale[]> {
    const rows = await sql`
        SELECT code, name, is_rtl, is_active, "order", created_at
        FROM locales
        WHERE is_active = true
        ORDER BY "order" ASC, code ASC
    `;
    return rows as unknown as Locale[];
}

/** Get all locales (including inactive) ordered by display order. */
export async function getAllLocales(): Promise<Locale[]> {
    const rows = await sql`
        SELECT code, name, is_rtl, is_active, "order", created_at
        FROM locales
        ORDER BY "order" ASC, code ASC
    `;
    return rows as unknown as Locale[];
}
