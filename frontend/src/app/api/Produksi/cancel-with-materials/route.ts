export const dynamic = 'force-dynamic';
// Using Node.js runtime for Prisma compatibility
// Edge runtime now supported with Supabase!
export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';

export async function POST(request: Request) {
    try {
        const body = await request.json();

        const productSlug = body.productSlug || body.ProductSlug;
        const tabId = body.tabId !== undefined ? body.tabId : body.TabId;
        const tanggalValid = body.tanggal || body.Tanggal;

        if (!productSlug || tabId === undefined) {
            return NextResponse.json({ message: 'Invalid request.' }, { status: 400 });
        }

        const localDate = new Date(tanggalValid);
        if (isNaN(localDate.getTime())) {
            return NextResponse.json({ message: 'Invalid date format.' }, { status: 400 });
        }

        const dateStr = tanggalValid.includes('T') ? tanggalValid.split('T')[0] : tanggalValid;

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

        const fields = body.fieldsToDelete || ['bs', 'ps', 'coa', 'pg'];
        const reqId = body.id || body.Id || body.produksiId;

        // 1. Delete or clear produksis columns
        const { data: records } = await db.from<any>('produksis').select('*').eq('product_slug', productSlug).execute();
        const recordsToProcess = (records || []).filter((r: any) => {
            if (reqId && Number(r.id) === Number(reqId)) return true;
            if (r.produksi_tab_id !== tabId) return false;
            return isSameDate(r.tanggal, dateStr);
        });

        for (const record of recordsToProcess) {
            const updates: any = {};
            if (fields.includes('bs')) updates.bs = 0;
            if (fields.includes('ps')) { updates.ps = 0; updates.ps_batch_kode = ''; }
            if (fields.includes('coa')) { updates.coa = 0; updates.coa_batch_kode = ''; }
            if (fields.includes('pg')) updates.pg = 0;
            
            const finalBs = fields.includes('bs') ? 0 : record.bs;
            const finalPs = fields.includes('ps') ? 0 : record.ps;
            const finalCoa = fields.includes('coa') ? 0 : record.coa;
            const finalPg = fields.includes('pg') ? 0 : record.pg;
            
            if (finalBs === 0 && finalPs === 0 && finalCoa === 0 && finalPg === 0) {
                await db.from<any>('produksis').delete().eq('id', record.id);
            } else {
                updates.kumulatif = 0;
                updates.stok_akhir = 0;
                await db.from<any>('produksis').update(updates).eq('id', record.id);
            }
        }

        // 2. Delete related Mutasi records ONLY if 'bs' is included
        let deletedMutasiCount = 0;
        if (fields.includes('bs')) {
            const { data: relatedBahanBaku } = await db.from<any>('bahan_bakus').select('*').eq('product_slug', productSlug).execute();

            const productLabelDdl = body.productFullName || body.ProductFullName || productSlug;
            const toDeleteIds = (relatedBahanBaku || [])
                .filter((b: any) => {
                    const ket = b.keterangan || b.Keterangan;
                    return ket && ket.toLowerCase().startsWith('produksi ') && ket.toLowerCase().includes(productLabelDdl.toLowerCase()) && isSameDate(b.tanggal || b.Tanggal, dateStr);
                })
                .map((b: any) => b.id || b.Id);

            for (const id of toDeleteIds) {
                await db.from<any>('bahan_bakus').delete().eq('id', id);
            }
            deletedMutasiCount = toDeleteIds.length;
        }

        return NextResponse.json({
            success: true,
            deletedMutasiCount: deletedMutasiCount
        });
    } catch (error) {
        console.error('Error canceling produksi with materials:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
