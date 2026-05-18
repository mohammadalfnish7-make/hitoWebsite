import { sql } from '@/shared/lib/db';

export interface AuditEntry {
    actor_admin_id: string;
    action: string;
    entity_type: string;
    entity_id?: string;
    metadata?: Record<string, unknown>;
}

/** Append-only audit log entry. */
export async function writeAuditLog(entry: AuditEntry): Promise<void> {
    await sql`
    INSERT INTO audit_log (id, actor_admin_id, action, entity_type, entity_id, metadata)
    VALUES (gen_random_uuid(), ${entry.actor_admin_id}, ${entry.action},
            ${entry.entity_type}, ${entry.entity_id ?? null},
            ${JSON.stringify(entry.metadata ?? {})})
  `;
}
