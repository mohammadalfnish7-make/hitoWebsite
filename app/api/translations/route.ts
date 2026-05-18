import { NextResponse } from 'next/server';
import { getCachedTranslations } from '@/features/translations';

/**
 * GET /api/translations?locale=en
 * Public — fetch cached translations for a locale.
 */
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const locale = searchParams.get('locale') || 'en';

        const translations = await getCachedTranslations(locale);
        return NextResponse.json(translations);
    } catch (err) {
        console.error('[GET /api/translations]', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
