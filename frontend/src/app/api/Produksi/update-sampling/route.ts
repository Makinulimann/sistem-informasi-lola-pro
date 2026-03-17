export const dynamic = 'force-dynamic';
// Using Node.js runtime for Prisma compatibility
// Edge runtime now supported with Supabase!
export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { productSlug, tabId, tanggal, batchKode, ps } = body;

        // Basic validation
        if (!productSlug || !tabId || !tanggal || !batchKode) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const localDate = new Date(tanggal);
        if (isNaN(localDate.getTime())) {
            return NextResponse.json({ message: 'Invalid date format.' }, { status: 400 });
        }

        // Find the ProduksiTab based on productSlug and tabId
        const { data: tabs } = await db.from<any>('produksi_tabs').select('*').eq('product_slug', productSlug).execute();
        const tab = (tabs || []).find((t: any) => t.id === tabId);

        if (!tab) {
            return NextResponse.json({ message: 'ProduksiTab not found.' }, { status: 404 });
        }

        // Fetch the target batch
        const { data: allProduksi } = await db.from<any>('produksis').select('*').execute();
        const targetBatch = (allProduksi || []).find((p: any) => 
            p.produksi_tab_id === tabId && p.batch_kode === batchKode && p.bs > 0
        );

        if (!targetBatch) {
            return NextResponse.json({ error: `Kode Batch ${batchKode} tidak ditemukan atau belum ada produksi (BS).` }, { status: 404 });
        }

        if (ps < 0) {
            return NextResponse.json({ error: 'Nilai sampling tidak boleh negatif' }, { status: 400 });
        }

        const utcOffset = 7 * 60 * 60 * 1000;
        const targetUtcDate = new Date(localDate.getTime() - utcOffset);

        // Find or create record for the current date
        const existingRecords = (allProduksi || []).filter((p: any) => 
            p.produksi_tab_id === tabId
        );
        
        let existingRecord = existingRecords.find((p: any) => {
            const pDate = new Date(p.tanggal);
            return pDate.getTime() === targetUtcDate.getTime();
        });

        if (existingRecord) {
            const { error: updateError } = await db.from<any>('produksis').update({
                ps: ps,
                ps_batch_kode: batchKode
            }).eq('id', existingRecord.id);

            if (updateError) {
                console.error('Error updating sampling:', updateError);
                return NextResponse.json({ message: 'Failed to update' }, { status: 500 });
            }
        } else {
            const { error: insertError } = await db.from<any>('produksis').insert({
                product_slug: productSlug,
                produksi_tab_id: tabId,
                tanggal: targetUtcDate.toISOString(),
                bs: 0,
                ps: ps,
                coa: 0,
                pg: 0,
                kumulatif: 0,
                stok_akhir: 0,
                batch_kode: '',
                ps_batch_kode: batchKode,
                coa_batch_kode: '',
                keterangan: ''
            });

            if (insertError) {
                console.error('Error inserting sampling:', insertError);
                return NextResponse.json({ message: 'Failed to insert' }, { status: 500 });
            }
        }

        return NextResponse.json({
            success: true,
            batchKode: batchKode,
            ps: ps
        });
    } catch (error) {
        console.error('Error updating sampling:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
