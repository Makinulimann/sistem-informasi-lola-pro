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

        const entity = await prisma.materials.findUnique({
            where: { Id: id }
        });

        if (!entity) return NextResponse.json({ message: 'Not Found' }, { status: 404 });

        const updated = await prisma.materials.update({
            where: { Id: id },
            data: { Nama: body.Nama }
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error('Error updating material:', error);
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

        const entity = await prisma.materials.findUnique({
            where: { Id: id }
        });

        if (!entity) return NextResponse.json({ message: 'Not Found' }, { status: 404 });

        await prisma.materials.update({
            where: { Id: id },
            data: { IsActive: false }
        });

        return new NextResponse(null, { status: 204 });
    } catch (error) {
        console.error('Error deleting material:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
