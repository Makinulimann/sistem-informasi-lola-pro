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

        const utcOffset = 7 * 60 * 60 * 1000;
        const targetUtc = new Date(localDate.getTime() - utcOffset);

        const fields = body.fieldsToDelete || ['bs', 'ps', 'coa', 'pg'];

        // 1. Delete or clear produksis columns
        const { data: records } = await db.from<any>('produksis').select('*').eq('product_slug', productSlug).execute();
        const record = (records || []).find((r: any) => 
            r.produksi_tab_id === tabId && new Date(r.tanggal).getTime() === targetUtc.getTime()
        );

        if (record) {
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
                    const rDate = new Date(b.tanggal || b.Tanggal);
                    const isSameDate = rDate.getTime() === targetUtc.getTime();
                    
                    return ket && ket.toLowerCase().startsWith('produksi ') && ket.toLowerCase().includes(productLabelDdl.toLowerCase()) && isSameDate;
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
