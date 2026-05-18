import { auth } from '@/shared/lib/auth';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { DEFAULT_LOCALE, STATIC_LOCALES, extractLocale } from '@/shared/lib/i18n';

/**
 * Middleware: auth guard + locale resolution.
 * 
 * Auth runs FIRST for protected routes (/dashboard, /api/admin).
 * Then locale resolution applies to all public routes.
 * 
 * Matcher is explicit and narrow — only admin routes are guarded.
 * Public endpoints (translations, comments, services) are NOT intercepted.
 */

export default auth((req) => {
    const { pathname } = req.nextUrl;

    // --- Redirect locale-prefixed dashboard to /dashboard (dashboard has no locale) ---
    const localePrefix = STATIC_LOCALES.join('|');
    const localeDashboardMatch = pathname.match(new RegExp(`^/(${localePrefix})/dashboard/?$`));
    if (localeDashboardMatch) {
        return NextResponse.redirect(new URL('/dashboard', req.url));
    }
    const localeDashboardDeep = pathname.match(new RegExp(`^/(${localePrefix})/dashboard/`));
    if (localeDashboardDeep) {
        const rest = pathname.replace(new RegExp(`^/(${localePrefix})/dashboard`), '/dashboard');
        return NextResponse.redirect(new URL(rest, req.url));
    }

    // --- Auth guard for admin routes (allow /dashboard/login without auth) ---
    if (pathname.startsWith('/dashboard') || pathname.startsWith('/api/admin')) {
        const isLoginPage = pathname === '/dashboard/login';
        if (!req.auth && !isLoginPage) {
            if (pathname.startsWith('/api/')) {
                return NextResponse.json(
                    { error: 'Unauthorized' },
                    { status: 401 }
                );
            }
            // Redirect to login for dashboard pages (not already on login)
            const loginUrl = new URL('/dashboard/login', req.url);
            loginUrl.searchParams.set('callbackUrl', pathname);
            return NextResponse.redirect(loginUrl);
        }
    }

    // --- Locale resolution for public pages ---
    if (!pathname.startsWith('/api/') && !pathname.startsWith('/dashboard')) {
        const locale = extractLocale(pathname);
        const hasLocale = STATIC_LOCALES.some(
            (l) => pathname.startsWith(`/${l}/`) || pathname === `/${l}`
        );

        // If no locale prefix, redirect to default locale
        if (!hasLocale && pathname === '/') {
            return NextResponse.redirect(new URL(`/${DEFAULT_LOCALE}`, req.url));
        }

        // Set locale header for downstream use
        const response = NextResponse.next();
        response.headers.set('x-locale', locale);
        return response;
    }

    return NextResponse.next();
});

export const config = {
    matcher: [
        /*
         * Match all paths except:
         * - _next/static (static files)
         * - _next/image (image optimization)
         * - favicon.ico
         * - public files (images, etc.)
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
};
