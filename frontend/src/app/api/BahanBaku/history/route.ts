import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const productSlug = searchParams.get('productSlug');
        const namaBahan = searchParams.get('namaBahan');
        const tipe = searchParams.get('tipe');
        const bulan = searchParams.get('bulan');
        const tahun = searchParams.get('tahun');

        if (!namaBahan || !tipe) {
            return NextResponse.json({ message: 'namaBahan and tipe are required' }, { status: 400 });
        }

        const whereClause: any = {
            Tipe: tipe,
            NamaBahan: namaBahan
        };

        if (bulan || tahun) {
            const y = tahun ? parseInt(tahun, 10) : new Date().getFullYear();
            const m = bulan ? parseInt(bulan, 10) : 1;

            const start = new Date(Date.UTC(y, m - 1, 1));
            const end = new Date(Date.UTC(bulan ? y : y + 1, bulan ? m : 0, 1));

            whereClause.Tanggal = {
                gte: start,
                lt: end
            };
        }

        const list = await prisma.bahanBakus.findMany({
            where: whereClause,
            orderBy: { Tanggal: 'desc' }
        });

        return NextResponse.json(list);
    } catch (error) {
        console.error('Error fetching history:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
