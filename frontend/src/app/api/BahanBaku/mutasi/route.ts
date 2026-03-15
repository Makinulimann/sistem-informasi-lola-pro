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

        const configuredMaterials = await prisma.productMaterials.findMany({
            where: { ProductSlug: productSlug },
            include: { MasterItems: true }
        });
        const configuredNames = configuredMaterials.map(pm => pm.MasterItems.Nama);

        const whereClause: any = {
            Tipe: 'Mutasi',
            NamaBahan: { in: configuredNames }
        };

        if (perusahaanId) whereClause.PerusahaanId = parseInt(perusahaanId, 10);

        // Dates in Postgres are Timestamptz.
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
        console.error('Error fetching mutasi:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const entity = await prisma.bahanBakus.create({
            data: {
                Tipe: 'Mutasi',
                ProductSlug: body.productSlug || body.ProductSlug,
                PerusahaanId: body.perusahaanId || body.PerusahaanId || null,
                Tanggal: new Date(body.tanggal || body.Tanggal),
                Jenis: body.jenis || body.Jenis,
                NamaBahan: body.namaBahan || body.NamaBahan,
                Kuantum: body.kuantum !== undefined ? body.kuantum : body.Kuantum,
                Satuan: body.satuan || body.Satuan || 'Kg',
                Dokumen: body.dokumen || body.Dokumen || '',
                Keterangan: body.keterangan || body.Keterangan || ''
            }
        });

        return NextResponse.json(entity, { status: 201 });
    } catch (error) {
        console.error('Error creating mutasi:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
