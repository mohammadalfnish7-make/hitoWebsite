'use client';

import { useEffect } from 'react';

/**
 * Calls POST /api/track-view when the service or sub-service page is viewed.
 * Runs once per mount so analytics reflect real page views.
 */
export function TrackPageView({
    serviceId,
    subServiceId,
}: {
    serviceId: string;
    subServiceId?: string;
}) {
    useEffect(() => {
        const body: { service_id: string; sub_service_id?: string } = { service_id: serviceId };
        if (subServiceId) body.sub_service_id = subServiceId;

        fetch('/api/track-view', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        }).catch(() => {
            // Fire-and-forget; don't affect UX
        });
    }, [serviceId, subServiceId]);

    return null;
}
