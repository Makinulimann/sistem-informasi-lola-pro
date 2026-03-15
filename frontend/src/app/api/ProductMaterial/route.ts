export const runtime = 'edge';

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: Request) {
    try {
        const body = await request.json();

        const productSlug = body.productSlug || body.ProductSlug;
        const masterItemId = body.masterItemId || body.MasterItemId;
        const jenis = body.jenis || body.Jenis;

        const exists = await prisma.productMaterials.findFirst({
            where: {
                ProductSlug: productSlug,
                MasterItemId: masterItemId,
                Jenis: jenis
            }
        });

        if (exists) {
            return NextResponse.json({ message: 'Material already assigned to this product as ' + body.Jenis }, { status: 400 });
        }

        const pm = await prisma.productMaterials.create({
            data: {
                ProductSlug: productSlug,
                MasterItemId: masterItemId,
                Jenis: jenis
            }
        });

        return NextResponse.json(pm);
    } catch (error) {
        console.error('Error assigning material:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
