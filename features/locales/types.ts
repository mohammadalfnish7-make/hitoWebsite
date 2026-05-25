export interface Locale {
    code: string;
    name: string;
    is_rtl: boolean;
    is_active: boolean;
    order: number;
    created_at?: string;
}
