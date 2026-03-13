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

        const entity = await prisma.logbookPics.findUnique({ where: { Id: id } });
        if (!entity) return NextResponse.json({ message: 'Not Found' }, { status: 404 });

        const oldName = entity.Nama;
        const newName = body.nama || body.Nama;

        // Cascade update: more complex because it could be comma-separated
        if (oldName !== newName) {
            const records = await prisma.aktivitasHarians.findMany({
                where: { Pic: { contains: oldName } }
            });

            for (const record of records) {
                if (record.Pic) {
                    const picList = record.Pic.split(', ').map(p => p.trim());
                    let changed = false;
                    for (let i = 0; i < picList.length; i++) {
                        if (picList[i] === oldName) {
                            picList[i] = newName;
                            changed = true;
                        }
                    }
                    if (changed) {
                        await prisma.aktivitasHarians.update({
                            where: { Id: record.Id },
                            data: { Pic: picList.join(', ') }
                        });
                    }
                }
            }
        }

        const updated = await prisma.logbookPics.update({
            where: { Id: id },
            data: { Nama: newName }
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error('Error updating pic:', error);
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

        const entity = await prisma.logbookPics.findUnique({ where: { Id: id } });
        if (!entity) return NextResponse.json({ message: 'Not Found' }, { status: 404 });

        const usedCount = await prisma.aktivitasHarians.count({
            where: { Pic: { contains: entity.Nama } }
        });

        if (usedCount > 0) {
            return NextResponse.json({ message: `PIC '${entity.Nama}' tidak dapat dihapus karena digunakan di ${usedCount} data aktivitas.` }, { status: 409 });
        }

        await prisma.logbookPics.update({
            where: { Id: id },
            data: { IsActive: false }
        });

        return new NextResponse(null, { status: 204 });
    } catch (error) {
        console.error('Error deleting pic:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
