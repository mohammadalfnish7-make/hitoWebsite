'use client';

import { useEffect, useRef } from 'react';

interface ChatwootWidgetProps {
    token: string;
    locale: string;
    baseUrl: string;
    serviceSlug?: string;
    subServiceSlug?: string;
}

/**
 * SPA-safe Chatwoot widget.
 * - Injects script ONCE (checks for existing script tag)
 * - Resets on token change
 * - Polls for $chatwoot readiness (max 50 attempts = 5 seconds)
 * - Sets custom attributes for lead attribution
 */
export default function ChatwootWidget({
    token,
    locale,
    baseUrl,
    serviceSlug,
    subServiceSlug,
}: ChatwootWidgetProps) {
    const tokenRef = useRef(token);
    const retryRef = useRef(0);
    const MAX_RETRIES = 50;

    useEffect(() => {
        if (!token || !baseUrl) return;

        // Inject script once
        if (!document.getElementById('chatwoot-sdk')) {
            const script = document.createElement('script');
            script.id = 'chatwoot-sdk';
            script.src = `${baseUrl}/packs/js/sdk.js`;
            script.async = true;
            script.defer = true;
            script.onerror = () => {
                console.warn('[Chatwoot] Script load failed — using default token');
            };
            document.head.appendChild(script);
        }

        function initWidget() {
            const w = window as any;
            if (w.$chatwoot) {
                // Reset if token changed
                if (tokenRef.current !== token) {
                    w.$chatwoot.reset?.();
                    tokenRef.current = token;
                }
            }

            w.chatwootSettings = {
                hideMessageBubble: false,
                position: locale === 'ar' ? 'left' : 'right',
                locale,
                type: 'standard',
            };

            w.chatwootSDK?.run?.({
                websiteToken: token,
                baseUrl,
            });

            // Set custom attributes once ready
            retryRef.current = 0;
            function setAttrs() {
                if (w.$chatwoot?.setCustomAttributes) {
                    w.$chatwoot.setCustomAttributes({
                        service_slug: serviceSlug || 'none',
                        sub_service_slug: subServiceSlug || 'none',
                        patient_locale: locale,
                        entry_url: window.location.href,
                    });
                } else if (retryRef.current < MAX_RETRIES) {
                    retryRef.current++;
                    setTimeout(setAttrs, 100);
                }
            }
            setTimeout(setAttrs, 500);
        }

        // Wait for SDK to load
        if ((window as any).chatwootSDK) {
            initWidget();
        } else {
            const checkInterval = setInterval(() => {
                if ((window as any).chatwootSDK) {
                    clearInterval(checkInterval);
                    initWidget();
                }
            }, 200);

            // Cleanup
            const timeout = setTimeout(() => clearInterval(checkInterval), 10000);
            return () => {
                clearInterval(checkInterval);
                clearTimeout(timeout);
            };
        }
    }, [token, locale, baseUrl, serviceSlug, subServiceSlug]);

    return null; // This component renders nothing — it only manages the widget lifecycle
}
