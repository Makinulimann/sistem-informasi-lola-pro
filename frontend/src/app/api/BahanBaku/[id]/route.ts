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

        const entity = await prisma.bahanBakus.findUnique({
            where: { Id: id }
        });

        if (!entity) return NextResponse.json({ message: 'Not Found' }, { status: 404 });

        const updated = await prisma.bahanBakus.update({
            where: { Id: id },
            data: {
                ProductSlug: body.productSlug || body.ProductSlug,
                PerusahaanId: body.perusahaanId || body.PerusahaanId || null,
                Tanggal: new Date(body.tanggal || body.Tanggal),
                Jenis: body.jenis || body.Jenis,
                NamaBahan: body.namaBahan || body.NamaBahan,
                Kuantum: body.kuantum !== undefined ? body.kuantum : body.Kuantum,
                Satuan: body.satuan || body.Satuan || 'Kg',
                Dokumen: body.dokumen || body.Dokumen || '',
                Keterangan: body.keterangan || body.Keterangan || ''
            }
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error('Error updating bahanbaku:', error);
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

        const entity = await prisma.bahanBakus.findUnique({
            where: { Id: id }
        });

        if (!entity) return NextResponse.json({ message: 'Not Found' }, { status: 404 });

        await prisma.bahanBakus.delete({
            where: { Id: id }
        });

        return new NextResponse(null, { status: 204 });
    } catch (error) {
        console.error('Error deleting bahanbaku:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
