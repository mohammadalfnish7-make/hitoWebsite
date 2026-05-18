export interface SubService {
    id: string;
    service_id: string;
    slug: string;
    name_en: string;
    name_ar?: string;
    description?: string;
    meta_title?: Record<string, string>;
    meta_description?: Record<string, string>;
    chatwoot_website_token?: string;
    main_image_url?: string;
    avg_cost_uae?: number;
    avg_cost_home_country?: number;
    cost_uae_currency?: string;
    cost_home_currency?: string;
    cost_notes?: Record<string, string>;
    cost_last_updated_at?: string;
    order: number;
    deleted_at?: string;
    created_at: string;
    updated_at: string;
}
