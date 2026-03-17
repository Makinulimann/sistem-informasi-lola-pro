export const dynamic = 'force-dynamic';
// Using Node.js runtime for Prisma compatibility
// Edge runtime now supported with Supabase!
export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const p = await params;
        const id = parseInt(p.id, 10);
        const body = await request.json();

        const { data: entity, error: fetchError } = await db.from<any>('bahan_bakus').select('*').eq('id', id).single();

        if (!entity) return NextResponse.json({ message: 'Not Found' }, { status: 404 });

        const { data: updated, error: updateError } = await db.from<any>('bahan_bakus').update({
            product_slug: body.productSlug || body.ProductSlug,
            perusahaan_id: body.perusahaanId || body.PerusahaanId || null,
            tanggal: body.tanggal || body.Tanggal,
            jenis: body.jenis || body.Jenis,
            nama_bahan: body.namaBahan || body.NamaBahan,
            kuantum: body.kuantum !== undefined ? body.kuantum : body.Kuantum,
            satuan: body.satuan || body.Satuan || 'Kg',
            dokumen: body.dokumen || body.Dokumen || '',
            keterangan: body.keterangan || body.Keterangan || ''
        }).eq('id', id);

        if (updateError) {
            console.error('Error updating bahanbaku:', updateError);
            return NextResponse.json({ message: 'Failed to update' }, { status: 500 });
        }

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

        const { data: entity, error: fetchError } = await db.from<any>('bahan_bakus').select('*').eq('id', id).single();

        if (!entity) return NextResponse.json({ message: 'Not Found' }, { status: 404 });

        const { error: deleteError } = await db.from<any>('bahan_bakus').delete().eq('id', id);

        if (deleteError) {
            console.error('Error deleting bahanbaku:', deleteError);
            return NextResponse.json({ message: 'Failed to delete' }, { status: 500 });
        }

        return new NextResponse(null, { status: 204 });
    } catch (error) {
        console.error('Error deleting bahanbaku:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
