export const runtime = 'edge';

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const productSlug = searchParams.get('productSlug');

        if (!productSlug) {
            return NextResponse.json({ message: 'productSlug is required.' }, { status: 400 });
        }

        const tabs = await prisma.produksiTabs.findMany({
            where: { ProductSlug: productSlug },
            orderBy: { Order: 'asc' },
            select: { Id: true, Nama: true, Order: true }
        });

        return NextResponse.json(tabs);
    } catch (error) {
        console.error('Error fetching tabs:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();

        const productSlug = body.productSlug || body.ProductSlug;
        const nama = body.nama || body.Nama;

        if (!productSlug || !nama) {
            return NextResponse.json({ message: 'ProductSlug dan Nama wajib diisi.' }, { status: 400 });
        }

        const aggregate = await prisma.produksiTabs.aggregate({
            where: { ProductSlug: productSlug },
            _max: { Order: true }
        });

        const maxOrder = aggregate._max.Order || 0;

        const tab = await prisma.produksiTabs.create({
            data: {
                ProductSlug: productSlug,
                Nama: nama.trim(),
                Order: maxOrder + 1
            }
        });

        return NextResponse.json({ Id: tab.Id, Nama: tab.Nama, Order: tab.Order });
    } catch (error) {
        console.error('Error creating tab:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
