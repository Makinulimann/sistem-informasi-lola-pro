export const dynamic = 'force-dynamic';
export const runtime = 'edge';

import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';

// We use 'perencanaan_material_configs' or 'bill_of_materials' which are confirmed tables in Supabase Postgres
const DRAFT_MASTER_ID = 999999;

export async function GET() {
    try {
        // Try reading from perencanaan_material_configs (master_item_id = 999999)
        const { data, error } = await db
            .from<any>('perencanaan_material_configs')
            .select('*')
            .eq('master_item_id', DRAFT_MASTER_ID)
            .single();

        if (error || !data) {
            // Fallback try bill_of_materials with product_slug = 'sipp_report_draft_versions_v1'
            const { data: bomData, error: bomErr } = await db
                .from<any>('bill_of_materials')
                .select('*')
                .eq('product_slug', 'sipp_report_draft_versions_v1')
                .execute();

            if (bomErr || !bomData || bomData.length === 0) {
                return NextResponse.json({ versions: [], activeVersionId: null });
            }

            const row = bomData[0];
            const rawText = row.variant_name || '';
            let parsed = { versions: [], activeVersionId: null };
            try {
                parsed = JSON.parse(rawText);
            } catch (e) {}

            return NextResponse.json(parsed);
        }

        const rawJson = data.custom_deps;
        let parsedData = { versions: [], activeVersionId: null };
        try {
            parsedData = typeof rawJson === 'string' ? JSON.parse(rawJson) : rawJson || { versions: [], activeVersionId: null };
        } catch (e) {
            console.error('Error parsing draft versions JSON:', e);
        }

        return NextResponse.json(parsedData);
    } catch (err: any) {
        console.error('Error fetching report draft versions:', err);
        return NextResponse.json({ versions: [], activeVersionId: null });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const versions = Array.isArray(body) ? body : (body.versions || []);
        const activeVersionId = body.activeVersionId || null;

        const stringifiedData = JSON.stringify({
            versions,
            activeVersionId,
            updatedAt: new Date().toISOString()
        });

        // 1. Try saving to perencanaan_material_configs
        const payload = {
            master_item_id: DRAFT_MASTER_ID,
            stok_existing: 0,
            satuan: 'JSON',
            custom_deps: stringifiedData,
            updated_at: new Date().toISOString()
        };

        const { data: existing } = await db
            .from<any>('perencanaan_material_configs')
            .select('*')
            .eq('master_item_id', DRAFT_MASTER_ID)
            .single();

        let saveSuccess = false;

        if (existing) {
            const { error: updateErr } = await db
                .from<any>('perencanaan_material_configs')
                .update(payload)
                .eq('master_item_id', DRAFT_MASTER_ID);
            if (!updateErr) saveSuccess = true;
        } else {
            const { error: insertErr } = await db
                .from<any>('perencanaan_material_configs')
                .insert(payload);
            if (!insertErr) saveSuccess = true;
        }

        // 2. Backup save to bill_of_materials if first table failed
        if (!saveSuccess) {
            const bomSlug = 'sipp_report_draft_versions_v1';
            const { data: existingBom } = await db
                .from<any>('bill_of_materials')
                .select('*')
                .eq('product_slug', bomSlug)
                .execute();

            if (existingBom && existingBom.length > 0) {
                await db
                    .from<any>('bill_of_materials')
                    .update({
                        variant_name: stringifiedData,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', existingBom[0].id);
            } else {
                await db
                    .from<any>('bill_of_materials')
                    .insert({
                        product_slug: bomSlug,
                        produksi_tab_id: 999999,
                        base_quantity: 1,
                        material_id: -1,
                        material_quantity: 0,
                        variant_name: stringifiedData,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    });
            }
        }

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error('Error saving report draft versions to DB:', err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
