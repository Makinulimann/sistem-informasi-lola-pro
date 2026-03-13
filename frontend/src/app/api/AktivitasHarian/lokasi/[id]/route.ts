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

        const entity = await prisma.logbookLokasis.findUnique({ where: { Id: id } });
        if (!entity) return NextResponse.json({ message: 'Not Found' }, { status: 404 });

        const oldName = entity.Nama;
        const newName = body.nama || body.Nama;

        // Cascade update
        if (oldName !== newName) {
            await prisma.aktivitasHarians.updateMany({
                where: { Lokasi: oldName },
                data: { Lokasi: newName }
            });
        }

        const updated = await prisma.logbookLokasis.update({
            where: { Id: id },
            data: { Nama: newName }
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error('Error updating lokasi:', error);
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

        const entity = await prisma.logbookLokasis.findUnique({ where: { Id: id } });
        if (!entity) return NextResponse.json({ message: 'Not Found' }, { status: 404 });

        const usedCount = await prisma.aktivitasHarians.count({
            where: { Lokasi: entity.Nama }
        });

        if (usedCount > 0) {
            return NextResponse.json({ message: `Lokasi '${entity.Nama}' tidak dapat dihapus karena digunakan di ${usedCount} data aktivitas.` }, { status: 409 });
        }

        await prisma.logbookLokasis.update({
            where: { Id: id },
            data: { IsActive: false }
        });

        return new NextResponse(null, { status: 204 });
    } catch (error) {
        console.error('Error deleting lokasi:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
