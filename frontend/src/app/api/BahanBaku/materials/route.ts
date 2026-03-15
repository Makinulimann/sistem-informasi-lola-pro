export const runtime = 'edge';

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const productSlug = searchParams.get('productSlug');

        if (!productSlug) {
            return NextResponse.json({ message: 'productSlug is required' }, { status: 400 });
        }

        const list = await prisma.materials.findMany({
            where: {
                ProductSlug: productSlug,
                IsActive: true
            },
            orderBy: { Order: 'asc' }
        });

        return NextResponse.json(list);
    } catch (error) {
        console.error('Error fetching materials:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();

        const productSlug = body.productSlug || body.ProductSlug;
        const aggregate = await prisma.materials.aggregate({
            where: { ProductSlug: productSlug },
            _max: { Order: true }
        });

        const maxOrder = aggregate._max.Order || 0;

        const entity = await prisma.materials.create({
            data: {
                ProductSlug: productSlug,
                Nama: body.nama || body.Nama,
                Order: maxOrder + 1,
                IsActive: body.isActive ?? body.IsActive ?? true
            }
        });

        return NextResponse.json(entity, { status: 201 });
    } catch (error) {
        console.error('Error creating material:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
