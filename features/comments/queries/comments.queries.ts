import { sql } from '@/shared/lib/db';
import type { Comment, CreateCommentInput } from '../types';

/** Get visible comments for a service/sub-service. */
export async function getVisibleComments(
    serviceId: string,
    subServiceId?: string
): Promise<Comment[]> {
    if (subServiceId) {
        const rows = await sql`
      SELECT id, service_id, sub_service_id, author_name, content, locale, created_at
      FROM comments
      WHERE service_id = ${serviceId}
        AND sub_service_id = ${subServiceId}
        AND is_visible = true
      ORDER BY created_at DESC
    `;
        return rows as unknown as Comment[];
    }

    const rows = await sql`
    SELECT id, service_id, sub_service_id, author_name, content, locale, created_at
    FROM comments
    WHERE service_id = ${serviceId}
      AND is_visible = true
    ORDER BY created_at DESC
  `;
    return rows as unknown as Comment[];
}

/** Create a new comment (is_visible = false by default). */
export async function createComment(input: CreateCommentInput): Promise<Comment> {
    const [row] = await sql`
    INSERT INTO comments (id, service_id, sub_service_id, author_name, author_email, content, locale)
    VALUES (gen_random_uuid(), ${input.service_id}, ${input.sub_service_id ?? null},
            ${input.author_name}, ${input.author_email}, ${input.content}, ${input.locale})
    RETURNING id, service_id, sub_service_id, author_name, content, locale, created_at
  `;
    return row as unknown as Comment;
}
