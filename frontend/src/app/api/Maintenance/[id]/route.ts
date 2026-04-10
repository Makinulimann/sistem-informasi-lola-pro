export const dynamic = 'force-dynamic';
// Using Node.js runtime for Prisma compatibility
// Edge runtime now supported with Supabase!
export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const p = await params;
        const id = parseInt(p.id, 10);
        const { data: entity } = await db.from<any>('maintenances').select('*').eq('id', id).single();

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

        const { data: entity } = await db.from<any>('maintenances').select('*').eq('id', id).single();
        if (!entity) return NextResponse.json({ message: 'Not Found' }, { status: 404 });

        const updateData = {
            product_slug: body.product_slug || body.productSlug || body.ProductSlug,
            kode: body.kode || body.Kode || body.equipment || body.Equipment || '',
            nama: body.nama || body.Nama || body.area || body.Area || '',
            deskripsi: body.deskripsi || body.Deskripsi || body.kegiatan || body.Kegiatan || '',
            prioritas: body.prioritas || body.Prioritas || 'Normal',
            status: body.status || body.Status || 'Open',
            keperluan: body.keperluan || body.Keperluan || body.keterangan || body.Keterangan || '',
            tanggal_dibutuhkan: body.tanggal_dibutuhkan || body.TanggalDibutuhkan || body.tanggal || body.Tanggal || new Date().toISOString(),
            dokumentasi: body.dokumentasi || body.Dokumentasi || null,
            updated_at: new Date().toISOString()
        };

        const { data: updated, error } = await db.from<any>('maintenances').update(updateData).eq('id', id);

        if (error) {
            console.error('Error updating maintenance:', error);
            return NextResponse.json({ message: 'Failed to update' }, { status: 500 });
        }

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

        const { data: entity } = await db.from<any>('maintenances').select('*').eq('id', id).single();
        if (!entity) return NextResponse.json({ message: 'Not Found' }, { status: 404 });

        const { error } = await db.from<any>('maintenances').delete().eq('id', id);

        if (error) {
            console.error('Error deleting maintenance:', error);
            return NextResponse.json({ message: 'Failed to delete' }, { status: 500 });
        }

        return new NextResponse(null, { status: 204 });
    } catch (error) {
        console.error('Error deleting maintenance:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
