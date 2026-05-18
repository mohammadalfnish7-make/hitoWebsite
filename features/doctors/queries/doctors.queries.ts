import { sql } from '@/shared/lib/db';
import type { Doctor } from '../types';

/** List all active doctors. */
export async function getDoctors(): Promise<Doctor[]> {
    const rows = await sql`
    SELECT id, name_en, name_ar, specialty_en, specialty_ar,
           bio_en, bio_ar, image_url, experience_years, is_active, created_at
    FROM doctors
    WHERE deleted_at IS NULL AND is_active = true
    ORDER BY name_en ASC
  `;
    return rows as unknown as Doctor[];
}

/** Get doctors linked to a sub-service (through active sub-services only). */
export async function getDoctorsBySubService(subServiceId: string): Promise<Doctor[]> {
    const rows = await sql`
    SELECT d.id, d.name_en, d.name_ar, d.specialty_en, d.specialty_ar,
           d.bio_en, d.bio_ar, d.image_url, d.experience_years, d.is_active,
           d.created_at, dss.display_order, dss.is_primary
    FROM doctors d
    JOIN doctor_sub_services dss ON dss.doctor_id = d.id
    JOIN sub_services ss ON ss.id = dss.sub_service_id
    WHERE dss.sub_service_id = ${subServiceId}
      AND d.deleted_at IS NULL
      AND d.is_active = true
      AND ss.deleted_at IS NULL
    ORDER BY dss.display_order ASC
  `;
    return rows as unknown as Doctor[];
}
