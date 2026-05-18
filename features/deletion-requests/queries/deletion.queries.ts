import { sql } from '@/shared/lib/db';

export interface DeletionRequest {
    id: string;
    requester_email: string;
    requester_name?: string;
    reason?: string;
    status: 'pending' | 'approved' | 'rejected' | 'completed';
    requested_at: string;
    reviewed_at?: string;
    reviewed_by?: string;
    completed_at?: string;
}

/** Create a new data deletion request. */
export async function createDeletionRequest(data: {
    requester_email: string;
    requester_name?: string;
    reason?: string;
}): Promise<{ success: boolean; message: string }> {
    try {
        await sql`
      INSERT INTO data_deletion_requests (id, requester_email, requester_name, reason)
      VALUES (gen_random_uuid(), ${data.requester_email}, ${data.requester_name ?? null}, ${data.reason ?? null})
    `;
        return { success: true, message: 'Your data deletion request has been received. We will review and process it shortly.' };
    } catch (err: any) {
        // Handle unique constraint violation (23505) — duplicate pending request
        if (err?.code === '23505') {
            return {
                success: true,
                message: 'A request for this email is already under review. We will process it and notify you.',
            };
        }
        throw err;
    }
}
