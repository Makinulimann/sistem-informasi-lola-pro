export const runtime = 'edge';

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const productSlug = searchParams.get('productSlug');
        const perusahaanId = searchParams.get('perusahaanId');
        const bulan = searchParams.get('bulan');
        const tahun = searchParams.get('tahun');

        if (!productSlug) {
            return NextResponse.json({ message: 'productSlug is required' }, { status: 400 });
        }

        const whereClause: any = { ProductSlug: productSlug };
        if (perusahaanId) whereClause.PerusahaanId = parseInt(perusahaanId, 10);

        if (bulan || tahun) {
            const y = tahun ? parseInt(tahun, 10) : new Date().getFullYear();
            const m = bulan ? parseInt(bulan, 10) : 1;

            const start = new Date(Date.UTC(y, m - 1, 1));
            const end = new Date(Date.UTC(bulan ? y : y + 1, bulan ? m : 0, 1));

            whereClause.Tanggal = { gte: start, lt: end };
        }

        const list = await prisma.balanceStoks.findMany({
            where: whereClause,
            include: {
                BalanceStokDetails: {
                    include: { Materials: true }
                }
            },
            orderBy: { Tanggal: 'asc' }
        });

        const formatted = list.map(b => ({
            Id: b.Id,
            Tanggal: b.Tanggal,
            Produksi: b.Produksi,
            Details: b.BalanceStokDetails.map(d => ({
                MaterialId: d.MaterialId,
                MaterialNama: d.Materials?.Nama || '',
                Out: d.Out,
                In: d.In,
                StokAkhir: d.StokAkhir
            }))
        }));

        return NextResponse.json(formatted);
    } catch (error) {
        console.error('Error fetching balance:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
