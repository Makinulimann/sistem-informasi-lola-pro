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

        const item = await prisma.masterItems.findUnique({
            where: { Id: id }
        });

        if (!item) return NextResponse.json({ message: 'Not Found' }, { status: 404 });

        const nama = body.nama || body.Nama;
        if (nama !== item.Nama) {
            const existing = await prisma.masterItems.findFirst({
                where: {
                    Nama: nama,
                    OR: [
                        { ScopeProductSlug: null },
                        { ScopeProductSlug: item.ScopeProductSlug }
                    ]
                }
            });
            if (existing) {
                return NextResponse.json({ message: 'Item with this name already exists.' }, { status: 400 });
            }
        }

        const updated = await prisma.masterItems.update({
            where: { Id: id },
            data: {
                Nama: nama,
                SatuanDefault: body.satuanDefault !== undefined ? body.satuanDefault : body.SatuanDefault
            }
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error('Error updating master item:', error);
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

        const item = await prisma.masterItems.findUnique({
            where: { Id: id }
        });
        if (!item) return NextResponse.json({ message: 'Not Found' }, { status: 404 });

        await prisma.masterItems.delete({
            where: { Id: id }
        });

        return new NextResponse(null, { status: 204 });
    } catch (error) {
        console.error('Error deleting master item:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
