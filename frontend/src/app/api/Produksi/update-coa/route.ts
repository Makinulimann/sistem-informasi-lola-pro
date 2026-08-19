export const dynamic = 'force-dynamic';
// Using Node.js runtime for Prisma compatibility
// Edge runtime now supported with Supabase!
export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { productSlug, tabId, tanggal, batchKode, variantName, coa } = body;

        if (!productSlug || tabId === undefined || !tanggal || !batchKode) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const localDate = new Date(tanggal);
        if (isNaN(localDate.getTime())) {
            return NextResponse.json({ error: 'Invalid date format.' }, { status: 400 });
        }

        // Find the ProduksiTab
        const { data: tabs } = await db.from<any>('produksi_tabs').select('*').eq('product_slug', productSlug).execute();
        const tab = (tabs || []).find((t: any) => t.id === tabId);

        if (!tab) {
            return NextResponse.json({ error: 'ProduksiTab not found.' }, { status: 404 });
        }

        const extractVariantTag = (ket: string): string => {
            const m = (ket || '').match(/\[Varian:\s*([^-\]]+)/i);
            return m ? m[1].trim().toLowerCase() : '';
        };

        const reqVariant = (variantName || '').trim().toLowerCase();

        if (coa < 0) {
            return NextResponse.json({ error: 'Nilai COA tidak boleh negatif' }, { status: 400 });
        }

        const utcOffset = 7 * 60 * 60 * 1000;
        const targetUtcDate = new Date(localDate.getTime() - utcOffset);

        const extractYmd = (val: any): string => {
            if (!val) return '';
            if (typeof val === 'string') {
                const clean = val.split('T')[0].split(' ')[0];
                const parts = clean.split('-');
                if (parts.length === 3 && parts[0].length === 4) return clean;
            }
            const d = new Date(val);
            if (isNaN(d.getTime())) return '';
            return d.toISOString().split('T')[0];
        };

        const isSameDate = (d1: any, d2: any): boolean => {
            const y1 = extractYmd(d1);
            const y2 = extractYmd(d2);
            if (y1 && y2 && y1 === y2) return true;
            
            const d1Obj = new Date(d1);
            const d2Obj = new Date(d2);
            if (!isNaN(d1Obj.getTime()) && !isNaN(d2Obj.getTime())) {
                const local1 = new Date(d1Obj.getTime() + 7 * 3600000).toISOString().split('T')[0];
                const local2 = new Date(d2Obj.getTime() + 7 * 3600000).toISOString().split('T')[0];
                return local1 === local2 || local1 === y2 || y1 === local2;
            }
            return false;
        };

        // Fetch target batch filtered by tab
        const { data: allProduksi } = await db.from<any>('produksis').select('*').eq('produksi_tab_id', tabId).execute();

        // 1. First priority: match exact row date and batch/variant
        let existingRecord = (allProduksi || []).find((p: any) => {
            if (!isSameDate(p.tanggal, tanggal)) return false;
            const rowVar = extractVariantTag(p.keterangan || '');
            if (reqVariant && rowVar && rowVar !== reqVariant) return false;
            if (batchKode && (p.batch_kode || p.ps_batch_kode)) {
                const b = (p.batch_kode || p.ps_batch_kode).toLowerCase();
                return b === batchKode.toLowerCase();
            }
            return true;
        });

        // 2. Second priority: match exact row date
        if (!existingRecord) {
            existingRecord = (allProduksi || []).find((p: any) => isSameDate(p.tanggal, tanggal));
        }

        // 3. Fallback: match target batch with ps > 0
        if (!existingRecord) {
            existingRecord = (allProduksi || []).find((p: any) => {
                const isSameBatch = (p.batch_kode && p.batch_kode.toLowerCase() === batchKode.toLowerCase()) || (p.ps_batch_kode && p.ps_batch_kode.toLowerCase() === batchKode.toLowerCase());
                const rowVar = extractVariantTag(p.keterangan || '');
                if (reqVariant) {
                    return isSameBatch && rowVar === reqVariant && Number(p.ps || 0) > 0;
                }
                return isSameBatch && Number(p.ps || 0) > 0;
            });
        }

        if (existingRecord) {
            const { error: updateError } = await db.from<any>('produksis').update({
                coa: coa,
                coa_batch_kode: batchKode
            }).eq('id', existingRecord.id);

            if (updateError) {
                console.error('Error updating COA:', updateError);
                return NextResponse.json({ message: 'Failed to update' }, { status: 500 });
            }
        } else {
            const { error: insertError } = await db.from<any>('produksis').insert({
                product_slug: productSlug,
                produksi_tab_id: tabId,
                tanggal: targetUtcDate.toISOString(),
                bs: 0,
                ps: 0,
                coa: coa,
                pg: 0,
                kumulatif: 0,
                stok_akhir: 0,
                batch_kode: '',
                ps_batch_kode: '',
                coa_batch_kode: batchKode,
                keterangan: ''
            });

            if (insertError) {
                console.error('Error inserting COA:', insertError);
                return NextResponse.json({ message: 'Failed to insert' }, { status: 500 });
            }
        }

        return NextResponse.json({
            success: true,
            batchKode: batchKode,
            coa: coa
        });
    } catch (error) {
        console.error('Error updating COA:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
