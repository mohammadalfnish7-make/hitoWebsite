import { sql } from '@/shared/lib/db';

/** Get all translations for a locale as a key-value map. */
export async function getTranslations(locale: string): Promise<Record<string, string>> {
    const rows = await sql`
    SELECT key, value
    FROM translations
    WHERE locale = ${locale}
    ORDER BY key
  `;

    const map: Record<string, string> = {};
    for (const row of rows) {
        map[row.key] = row.value;
    }
    return map;
}
