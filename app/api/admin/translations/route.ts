import { NextResponse } from 'next/server';
import { z } from 'zod';
import { sql } from '@/shared/lib/db';
import { auth } from '@/shared/lib/auth';
import { revalidateTag } from 'next/cache';

/**
 * GET /api/admin/translations?locale=
 * Admin — list all translations for a locale (including unverified).
 */
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const locale = searchParams.get('locale');

        let rows;
        if (locale) {
            rows = await sql`
        SELECT * FROM translations
        WHERE locale = ${locale}
        ORDER BY key ASC
      `;
        } else {
            rows = await sql`
        SELECT * FROM translations
        ORDER BY locale ASC, key ASC
        LIMIT 500
      `;
        }
        return NextResponse.json(rows);
    } catch (err) {
        console.error('[GET /api/admin/translations]', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

const translationSchema = z.object({
    key: z.string().min(1).max(255),
    locale: z.string().min(2).max(5),
    value: z.string(),
    is_verified: z.boolean().optional(),
});

/**
 * POST /api/admin/translations — create or upsert a translation
 */
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const parsed = translationSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
        }

        const data = parsed.data;
        const [row] = await sql`
      INSERT INTO translations (id, key, locale, value, is_verified)
      VALUES (gen_random_uuid(), ${data.key}, ${data.locale}, ${data.value}, ${data.is_verified ?? false})
      ON CONFLICT (key, locale)
      DO UPDATE SET value = ${data.value}, is_verified = ${data.is_verified ?? false}
      RETURNING *
    `;

        // Invalidate translation cache for this locale (and global so admins can flush all)
        revalidateTag(`translations-${data.locale}`);
        revalidateTag('translations');

        return NextResponse.json(row, { status: 201 });
    } catch (err) {
        console.error('[POST /api/admin/translations]', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
