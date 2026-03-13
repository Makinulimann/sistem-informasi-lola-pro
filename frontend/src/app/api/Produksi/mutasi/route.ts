import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

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

        const relatedMutasi = await prisma.bahanBakus.findMany({
            where: {
                ProductSlug: productSlug,
                Tipe: 'Mutasi',
                Tanggal: targetUtc
            }
        });

        const mutasi = relatedMutasi
            .filter(b => b.Keterangan?.toLowerCase().startsWith('produksi '))
            .map(b => ({
                NamaBahan: b.NamaBahan,
                Kuantum: b.Kuantum,
                Satuan: b.Satuan,
                Jenis: b.Jenis
            }));

        return NextResponse.json(mutasi);
    } catch (error) {
        console.error('Error fetching mutasi for produksi:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
