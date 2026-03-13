import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const p = await params;
        const id = parseInt(p.id, 10);
        const body = await request.json();

        const tab = await prisma.produksiTabs.findUnique({
            where: { Id: id }
        });

        if (!tab) return NextResponse.json({ message: 'Not Found' }, { status: 404 });

        const updated = await prisma.produksiTabs.update({
            where: { Id: id },
            data: { Nama: (body.nama || body.Nama).trim() }
        });

        return NextResponse.json({ Id: updated.Id, Nama: updated.Nama, Order: updated.Order });
    } catch (error) {
        console.error('Error renaming tab:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const p = await params;
        const id = parseInt(p.id, 10);

        const tab = await prisma.produksiTabs.findUnique({
            where: { Id: id }
        });

        if (!tab) return NextResponse.json({ message: 'Not Found' }, { status: 404 });

        // Cascading delete is actually handled by Prisma (onDelete: Cascade) but manual is safer
        await prisma.produksis.deleteMany({
            where: { ProduksiTabId: id }
        });

        await prisma.produksiTabs.delete({
            where: { Id: id }
        });

        return new NextResponse(null, { status: 204 });
    } catch (error) {
        console.error('Error deleting tab:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
