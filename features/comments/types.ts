export interface Comment {
    id: string;
    service_id: string;
    sub_service_id?: string;
    author_name: string;
    author_email?: string;
    content: string;
    locale: string;
    is_visible?: boolean;
    created_at: string;
}

export interface CreateCommentInput {
    service_id: string;
    sub_service_id?: string;
    author_name: string;
    author_email: string;
    content: string;
    locale: string;
}
