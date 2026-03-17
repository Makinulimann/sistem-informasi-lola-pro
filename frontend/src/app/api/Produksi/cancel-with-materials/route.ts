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

        // 1. Reset produksi BS to 0
        const { data: records } = await db.from<any>('produksis').select('*').eq('product_slug', productSlug).execute();
        const record = (records || []).find((r: any) => 
            r.produksi_tab_id === tabId && new Date(r.tanggal).getTime() === targetUtc.getTime()
        );

        if (record) {
            await db.from<any>('produksis').update({
                bs: 0,
                updated_at: new Date().toISOString()
            }).eq('id', record.id);
        }

        // 2. Delete related Mutasi records for that product + date
        const { data: relatedBahanBaku } = await db.from<any>('bahan_bakus').select('*').eq('product_slug', productSlug).execute();

        const toDeleteIds = (relatedBahanBaku || [])
            .filter((b: any) => b.Keterangan && b.Keterangan.toLowerCase().startsWith('produksi '))
            .map((b: any) => b.Id);

        for (const id of toDeleteIds) {
            await db.from<any>('bahan_bakus').delete().eq('id', id);
        }

        return NextResponse.json({
            success: true,
            deletedMutasiCount: toDeleteIds.length
        });
    } catch (error) {
        console.error('Error canceling produksi with materials:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
