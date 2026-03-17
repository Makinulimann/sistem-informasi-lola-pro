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

        const { data: updated, error } = await db.from<any>('maintenances').update({
            product_slug: body.productSlug || body.ProductSlug,
            equipment: body.equipment || body.Equipment || '',
            area: body.area || body.Area || '',
            tanggal: body.tanggal || body.Tanggal || new Date().toISOString(),
            kegiatan: body.kegiatan || body.Kegiatan || '',
            keterangan: body.keterangan || body.Keterangan || '',
            updated_at: new Date().toISOString()
        }).eq('id', id);

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
