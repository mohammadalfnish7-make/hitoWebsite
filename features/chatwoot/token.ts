/**
 * Chatwoot token resolution — fail-safe, never lose a lead.
 * 
 * Resolution order:
 *   sub_service.chatwoot_website_token
 *   → service.chatwoot_website_token
 *   → DEFAULT_WEBSITE_TOKEN
 */

const DEFAULT_WEBSITE_TOKEN = process.env.NEXT_PUBLIC_DEFAULT_WEBSITE_TOKEN || '';

export function resolveToken(
    subServiceToken?: string | null,
    serviceToken?: string | null
): string {
    const token = subServiceToken || serviceToken || DEFAULT_WEBSITE_TOKEN;
    if (!token || token.trim() === '') {
        return DEFAULT_WEBSITE_TOKEN;
    }
    return token;
}
