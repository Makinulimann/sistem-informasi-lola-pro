import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
    try {
        const params = await context.params;
        const id = parseInt(params.id, 10);
        if (isNaN(id)) {
            return NextResponse.json({ message: 'Invalid ID format' }, { status: 400 });
        }

        const body = await request.json();

        const updateData: any = {};
        if (body.tanggalSampling) {
            const date = new Date(body.tanggalSampling);
            updateData.TanggalSampling = date;
            updateData.Bulan = date.getMonth() + 1;
            updateData.Tahun = date.getFullYear();
        }
        if (body.noBAPC) updateData.NoBAPC = body.noBAPC;
        if (body.kuantum !== undefined) updateData.Kuantum = parseFloat(body.kuantum);
        if (body.lembaga) updateData.Lembaga = body.lembaga;
        if (body.hasilAnalisa) updateData.HasilAnalisa = body.hasilAnalisa;
        if (body.tanggalAnalisa !== undefined) {
            updateData.TanggalAnalisa = body.tanggalAnalisa ? new Date(body.tanggalAnalisa) : null;
        }

        const updatedAnalisa = await prisma.analisas.update({
            where: { Id: id },
            data: updateData,
        });

        return NextResponse.json({ success: true, data: { id: updatedAnalisa.Id } });
    } catch (error) {
        console.error('Error updating analisa:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
    try {
        const params = await context.params;
        const id = parseInt(params.id, 10);
        if (isNaN(id)) {
            return NextResponse.json({ message: 'Invalid ID format' }, { status: 400 });
        }

        await prisma.analisas.delete({
            where: { Id: id }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting analisa:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
