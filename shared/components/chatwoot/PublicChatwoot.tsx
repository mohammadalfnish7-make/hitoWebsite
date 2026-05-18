'use client';

import ChatwootWidget from '@/features/chatwoot/components/ChatwootWidget';

const BASE_URL = process.env.NEXT_PUBLIC_CHATWOOT_BASE_URL || '';
const DEFAULT_TOKEN = process.env.NEXT_PUBLIC_DEFAULT_WEBSITE_TOKEN || '';

interface PublicChatwootProps {
    locale: string;
    token?: string | null;
    serviceSlug?: string;
    subServiceSlug?: string;
}

/**
 * Renders Chatwoot widget on public pages. Use default token when no service/sub-service context.
 */
export function PublicChatwoot({ locale, token, serviceSlug, subServiceSlug }: PublicChatwootProps) {
    const resolvedToken = (token && token.trim() !== '') ? token : DEFAULT_TOKEN;
    if (!resolvedToken || !BASE_URL) return null;

    return (
        <ChatwootWidget
            token={resolvedToken}
            locale={locale}
            baseUrl={BASE_URL}
            serviceSlug={serviceSlug}
            subServiceSlug={subServiceSlug}
        />
    );
}
