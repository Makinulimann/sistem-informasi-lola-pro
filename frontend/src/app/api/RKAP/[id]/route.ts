import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const rkapId = parseInt(id);

        if (isNaN(rkapId)) {
            return NextResponse.json({ message: 'Invalid ID' }, { status: 400 });
        }

        const body = await request.json();
        const { productSlug, bulan, tahun, target } = body;

        const updated = await prisma.rkaps.update({
            where: { Id: rkapId },
            data: {
                ProductSlug: productSlug,
                Bulan: parseInt(bulan),
                Tahun: parseInt(tahun),
                Target: parseFloat(target),
            }
        });

        return NextResponse.json({
            message: 'Successfully updated RKAP data',
            data: {
                id: updated.Id,
                productSlug: updated.ProductSlug,
                bulan: updated.Bulan,
                tahun: updated.Tahun,
                target: updated.Target,
            }
        });
    } catch (error) {
        console.error('Error in PUT /api/RKAP/[id]:', error);
        return NextResponse.json(
            { message: 'Internal Server Error' },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const rkapId = parseInt(id);

        if (isNaN(rkapId)) {
            return NextResponse.json({ message: 'Invalid ID' }, { status: 400 });
        }

        await prisma.rkaps.delete({
            where: { Id: rkapId }
        });

        return NextResponse.json({
            message: 'Successfully deleted RKAP data'
        });
    } catch (error) {
        console.error('Error in DELETE /api/RKAP/[id]:', error);
        return NextResponse.json(
            { message: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
