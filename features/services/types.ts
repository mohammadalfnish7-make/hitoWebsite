export interface Service {
    id: string;
    slug: string;
    name_en: string;
    name_ar?: string;
    names?: Record<string, string>;
    description?: string;
    meta_title?: Record<string, string>;
    meta_description?: Record<string, string>;
    chatwoot_website_token?: string;
    order: number;
    deleted_at?: string;
    created_at: string;
    updated_at: string;
}
