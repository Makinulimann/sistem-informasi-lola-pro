export const runtime = 'edge';

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const productSlug = searchParams.get('productSlug');
        const bulanStr = searchParams.get('bulan');
        const tahunStr = searchParams.get('tahun');

        if (!productSlug) {
            return NextResponse.json({ message: 'productSlug is required.' }, { status: 400 });
        }

        let whereClause: any = { ProductSlug: productSlug };

        if (bulanStr) {
            whereClause.Bulan = parseInt(bulanStr, 10);
        }

        if (tahunStr) {
            whereClause.Tahun = parseInt(tahunStr, 10);
        }

        const data = await prisma.analisas.findMany({
            where: whereClause,
            orderBy: { TanggalSampling: 'asc' },
        });

        // Convert the property names to match the frontend expectations
        const formattedData = data.map(item => ({
            id: item.Id,
            productSlug: item.ProductSlug,
            bulan: item.Bulan,
            tahun: item.Tahun,
            tanggalSampling: item.TanggalSampling,
            noBAPC: item.NoBAPC,
            kuantum: item.Kuantum,
            lembaga: item.Lembaga,
            hasilAnalisa: item.HasilAnalisa,
            tanggalAnalisa: item.TanggalAnalisa
        }));

        return NextResponse.json({ data: formattedData });
    } catch (error) {
        console.error('Error fetching analisa:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();

        if (!body.productSlug || !body.tanggalSampling || !body.noBAPC || !body.kuantum || !body.lembaga || !body.hasilAnalisa) {
             return NextResponse.json({ message: 'Missing required fields.' }, { status: 400 });
        }

        const date = new Date(body.tanggalSampling);
        const bulan = date.getMonth() + 1;
        const tahun = date.getFullYear();

        const newAnalisa = await prisma.analisas.create({
            data: {
                ProductSlug: body.productSlug,
                Bulan: bulan,
                Tahun: tahun,
                TanggalSampling: date,
                NoBAPC: body.noBAPC,
                Kuantum: parseFloat(body.kuantum),
                Lembaga: body.lembaga,
                HasilAnalisa: body.hasilAnalisa,
                TanggalAnalisa: body.tanggalAnalisa ? new Date(body.tanggalAnalisa) : null,
            }
        });

        return NextResponse.json({ success: true, data: { id: newAnalisa.Id } });
    } catch (error) {
        console.error('Error creating analisa:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
