export interface Doctor {
    id: string;
    name_en: string;
    name_ar?: string;
    specialty_en?: string;
    specialty_ar?: string;
    bio_en?: string;
    bio_ar?: string;
    image_url?: string;
    experience_years?: number;
    is_active: boolean;
    deleted_at?: string;
    created_at: string;
    display_order?: number;
    is_primary?: boolean;
}
