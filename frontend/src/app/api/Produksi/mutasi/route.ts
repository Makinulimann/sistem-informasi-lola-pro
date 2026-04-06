export const dynamic = 'force-dynamic';
// Using Node.js runtime for Prisma compatibility
// Edge runtime now supported with Supabase!
export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const productSlug = searchParams.get('productSlug');
        const tanggal = searchParams.get('tanggal');

        if (!productSlug) {
            return NextResponse.json({ message: 'productSlug is required.' }, { status: 400 });
        }

        if (!tanggal) {
            return NextResponse.json({ message: 'tanggal is required.' }, { status: 400 });
        }

        const localDate = new Date(tanggal);
        if (isNaN(localDate.getTime())) {
            return NextResponse.json({ message: 'Invalid date format.' }, { status: 400 });
        }

        const utcOffset = 7 * 60 * 60 * 1000;
        const targetUtc = new Date(localDate.getTime() - utcOffset);

        const { data: relatedMutasi } = await db.from<any>('bahan_bakus').select('*').eq('product_slug', productSlug).execute();

        const mutasi = (relatedMutasi || [])
            .filter((b: any) => {
                const ket = b.keterangan || b.Keterangan || '';
                const rDateStr = b.tanggal || b.Tanggal;
                const rDate = rDateStr ? new Date(rDateStr) : null;
                const isSameDate = rDate && rDate.getTime() === targetUtc.getTime();
                return ket.toLowerCase().startsWith('produksi ') && isSameDate;
            })
            .map((b: any) => ({
                NamaBahan: b.nama_bahan || b.NamaBahan,
                Kuantum: b.kuantum || b.Kuantum,
                Satuan: b.satuan || b.Satuan,
                Jenis: b.jenis || b.Jenis
            }));

        return NextResponse.json(mutasi);
    } catch (error) {
        console.error('Error fetching mutasi for produksi:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
