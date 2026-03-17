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

        const { data: entity } = await db.from<any>('logbook_lokasis').select('*').eq('id', id).single();
        if (!entity) return NextResponse.json({ message: 'Not Found' }, { status: 404 });

        const oldName = entity.nama;
        const newName = body.nama || body.nama;

        // Cascade update - fetch all and update matching records
        if (oldName !== newName) {
            const { data: activities } = await db.from<any>('aktivitas_harians').select('*').execute();
            const toUpdate = (activities || []).filter((a: any) => a.Lokasi === oldName);
            
            for (const activity of toUpdate) {
                await db.from<any>('aktivitas_harians').update({ Lokasi: newName }).eq('id', activity.id);
            }
        }

        const { data: updated, error } = await db.from<any>('logbook_lokasis').update({
            nama: newName,
            updated_at: new Date().toISOString()
        }).eq('id', id);

        if (error) {
            console.error('Error updating lokasi:', error);
            return NextResponse.json({ message: 'Failed to update' }, { status: 500 });
        }

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

        const { data: entity } = await db.from<any>('logbook_lokasis').select('*').eq('id', id).single();
        if (!entity) return NextResponse.json({ message: 'Not Found' }, { status: 404 });

        // Check if lokasi is used - fetch all and count
        const { data: activities } = await db.from<any>('aktivitas_harians').select('*').execute();
        const usedCount = (activities || []).filter((a: any) => a.Lokasi === entity.nama).length;

        if (usedCount > 0) {
            return NextResponse.json({ message: `Lokasi '${entity.nama}' tidak dapat dihapus karena digunakan di ${usedCount} data aktivitas.` }, { status: 409 });
        }

        const { error } = await db.from<any>('logbook_lokasis').delete().eq('id', id);

        if (error) {
            console.error('Error deleting lokasi:', error);
            return NextResponse.json({ message: 'Failed to delete' }, { status: 500 });
        }

        return new NextResponse(null, { status: 204 });
    } catch (error) {
        console.error('Error deleting lokasi:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
