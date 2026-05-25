import { NextResponse } from 'next/server';
import { z } from 'zod';
import { sql } from '@/shared/lib/db';
import { auth } from '@/shared/lib/auth';
import { writeAuditLog } from '@/features/audit';

const createDoctorSchema = z.object({
    name_en: z.string().min(1).max(255),
    name_ar: z.string().max(255).optional(),
    names: z.record(z.string()).optional(),
    specialty_en: z.string().max(255).optional(),
    specialty_ar: z.string().max(255).optional(),
    specialties: z.record(z.string()).optional(),
    bio_en: z.string().optional(),
    bio_ar: z.string().optional(),
    bios: z.record(z.string()).optional(),
    image_url: z.string().url().optional(),
    experience_years: z.number().int().min(0).optional(),
});

const linkDoctorSchema = z.object({
    doctor_id: z.string().uuid(),
    sub_service_id: z.string().uuid(),
    display_order: z.number().int().min(0).optional(),
    is_primary: z.boolean().optional(),
});

/**
 * GET /api/admin/doctors
 */
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const subServiceId = searchParams.get('sub_service_id');

        let rows;
        if (subServiceId) {
            rows = await sql`
        SELECT d.*, dss.display_order, dss.is_primary, dss.sub_service_id
        FROM doctors d
        JOIN doctor_sub_services dss ON dss.doctor_id = d.id
        WHERE dss.sub_service_id = ${subServiceId} AND d.deleted_at IS NULL
        ORDER BY dss.display_order ASC
      `;
        } else {
            rows = await sql`
        SELECT * FROM doctors WHERE deleted_at IS NULL ORDER BY name_en ASC
      `;
        }
        return NextResponse.json(rows);
    } catch (err) {
        console.error('[GET /api/admin/doctors]', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

/**
 * POST /api/admin/doctors — create a doctor
 */
export async function POST(req: Request) {
    try {
        const session = await auth();
        const body = await req.json();
        const parsed = createDoctorSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
        }

        const data = parsed.data;
        const [row] = await sql`
      INSERT INTO doctors (id, name_en, name_ar, names, specialty_en, specialty_ar, specialties, bio_en, bio_ar, bios, image_url, experience_years)
      VALUES (gen_random_uuid(), ${data.name_en}, ${data.name_ar ?? null}, ${data.names ? JSON.stringify(data.names) : null},
              ${data.specialty_en ?? null}, ${data.specialty_ar ?? null}, ${data.specialties ? JSON.stringify(data.specialties) : null},
              ${data.bio_en ?? null}, ${data.bio_ar ?? null}, ${data.bios ? JSON.stringify(data.bios) : null},
              ${data.image_url ?? null}, ${data.experience_years ?? null})
      RETURNING *
    `;

        await writeAuditLog({
            actor_admin_id: session?.user?.id || 'unknown',
            action: 'doctor.create',
            entity_type: 'doctor',
            entity_id: row.id,
            metadata: { name_en: data.name_en, admin_email: session?.user?.email },
        });

        return NextResponse.json(row, { status: 201 });
    } catch (err) {
        console.error('[POST /api/admin/doctors]', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

/**
 * PUT /api/admin/doctors — link doctor to sub-service
 */
export async function PUT(req: Request) {
    try {
        const session = await auth();
        const body = await req.json();
        const parsed = linkDoctorSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
        }

        const data = parsed.data;

        // Pre-check for primary constraint
        if (data.is_primary) {
            const [existing] = await sql`
        SELECT d.name_en FROM doctor_sub_services dss
        JOIN doctors d ON d.id = dss.doctor_id
        WHERE dss.sub_service_id = ${data.sub_service_id} AND dss.is_primary = true
      `;
            if (existing) {
                return NextResponse.json({
                    error: `This sub-service already has a primary doctor: ${existing.name_en}. Remove them as primary first.`,
                }, { status: 409 });
            }
        }

        const [row] = await sql`
      INSERT INTO doctor_sub_services (doctor_id, sub_service_id, display_order, is_primary)
      VALUES (${data.doctor_id}, ${data.sub_service_id}, ${data.display_order ?? 0}, ${data.is_primary ?? false})
      ON CONFLICT (doctor_id, sub_service_id)
      DO UPDATE SET display_order = ${data.display_order ?? 0}, is_primary = ${data.is_primary ?? false}
      RETURNING *
    `;

        return NextResponse.json(row);
    } catch (err: any) {
        if (err?.code === '23505') {
            return NextResponse.json({ error: 'This sub-service already has a primary doctor' }, { status: 409 });
        }
        console.error('[PUT /api/admin/doctors]', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
