export const runtime = 'edge';

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const slug = searchParams.get('slug');
        const bulan = searchParams.get('bulan');
        const tahun = searchParams.get('tahun');

        if (!slug) {
            return NextResponse.json({ message: 'Product slug required' }, { status: 400 });
        }

        const whereClause: any = { ProductSlug: slug };
        if (bulan) whereClause.Bulan = parseInt(bulan);
        if (tahun) whereClause.Tahun = parseInt(tahun);

        const data = await prisma.rkaps.findMany({
            where: whereClause,
            orderBy: [{ Tahun: 'desc' }, { Bulan: 'desc' }],
        });

        const mappedData = data.map(d => ({
            id: d.Id,
            productSlug: d.ProductSlug,
            bulan: d.Bulan,
            tahun: d.Tahun,
            target: d.Target,
        }));

        return NextResponse.json({
            message: 'Success',
            data: mappedData
        });
    } catch (error) {
        console.error('Error in GET /api/RKAP:', error);
        return NextResponse.json(
            { message: 'Internal Server Error' },
            { status: 500 }
        );
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { productSlug, bulan, tahun, target } = body;

        if (!productSlug || !bulan || !tahun || target === undefined) {
            return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
        }

        const created = await prisma.rkaps.create({
            data: {
                ProductSlug: productSlug,
                Bulan: parseInt(bulan),
                Tahun: parseInt(tahun),
                Target: parseFloat(target),
            }
        });

        return NextResponse.json({
            message: 'Successfully created RKAP data',
            data: {
                id: created.Id,
                productSlug: created.ProductSlug,
                bulan: created.Bulan,
                tahun: created.Tahun,
                target: created.Target,
            }
        });
    } catch (error) {
        console.error('Error in POST /api/RKAP:', error);
        return NextResponse.json(
            { message: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
