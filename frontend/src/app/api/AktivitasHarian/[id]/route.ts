import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const p = await params;
        const id = parseInt(p.id, 10);
        const entity = await prisma.aktivitasHarians.findUnique({ where: { Id: id } });

        if (!entity) return NextResponse.json({ message: 'Not Found' }, { status: 404 });

        return NextResponse.json(entity);
    } catch (error) {
        console.error('Error fetching aktivitas harian by id:', error);
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

        const entity = await prisma.aktivitasHarians.findUnique({ where: { Id: id } });
        if (!entity) return NextResponse.json({ message: 'Not Found' }, { status: 404 });

        const updated = await prisma.aktivitasHarians.update({
            where: { Id: id },
            data: {
                Tanggal: new Date(body.tanggal || body.Tanggal),
                Pic: body.pic || body.Pic,
                Lokasi: body.lokasi || body.Lokasi,
                Deskripsi: body.deskripsi || body.Deskripsi,
                Dokumentasi: body.dokumentasi || body.Dokumentasi || ''
            }
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error('Error updating aktivitas harian:', error);
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

        const entity = await prisma.aktivitasHarians.findUnique({ where: { Id: id } });
        if (!entity) return NextResponse.json({ message: 'Not Found' }, { status: 404 });

        await prisma.aktivitasHarians.delete({ where: { Id: id } });

        return new NextResponse(null, { status: 204 });
    } catch (error) {
        console.error('Error deleting aktivitas harian:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
