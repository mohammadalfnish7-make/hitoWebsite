export interface Doctor {
    id: string;
    name_en: string;
    name_ar?: string;
    names?: Record<string, string>;
    specialty_en?: string;
    specialty_ar?: string;
    specialties?: Record<string, string>;
    bio_en?: string;
    bio_ar?: string;
    bios?: Record<string, string>;
    image_url?: string;
    experience_years?: number;
    is_active: boolean;
    deleted_at?: string;
    created_at: string;
    display_order?: number;
    is_primary?: boolean;
}
