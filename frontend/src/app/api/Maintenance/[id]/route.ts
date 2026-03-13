import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const p = await params;
        const id = parseInt(p.id, 10);
        const entity = await prisma.maintenances.findUnique({ where: { Id: id } });

        if (!entity) return NextResponse.json({ message: 'Not Found' }, { status: 404 });

        return NextResponse.json(entity);
    } catch (error) {
        console.error('Error fetching maintenance by id:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const p = await params;
        const id = parseInt(p.id, 10);
        const body = await request.json();

        const entity = await prisma.maintenances.findUnique({ where: { Id: id } });
        if (!entity) return NextResponse.json({ message: 'Not Found' }, { status: 404 });

        const updated = await prisma.maintenances.update({
            where: { Id: id },
            data: {
                Tanggal: new Date(body.tanggal || body.Tanggal),
                Equipment: body.equipment || body.Equipment,
                Area: body.area || body.Area,
                Kegiatan: body.kegiatan || body.Kegiatan,
                Keterangan: body.keterangan || body.Keterangan || '',
                Dokumentasi: body.dokumentasi || body.Dokumentasi || ''
            }
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error('Error updating maintenance:', error);
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

        const entity = await prisma.maintenances.findUnique({ where: { Id: id } });
        if (!entity) return NextResponse.json({ message: 'Not Found' }, { status: 404 });

        await prisma.maintenances.delete({ where: { Id: id } });

        return new NextResponse(null, { status: 204 });
    } catch (error) {
        console.error('Error deleting maintenance:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
