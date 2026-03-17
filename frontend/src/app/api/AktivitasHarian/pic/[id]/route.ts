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

        const { data: entity } = await db.from<any>('logbook_pics').select('*').eq('id', id).single();
        if (!entity) return NextResponse.json({ message: 'Not Found' }, { status: 404 });

        const oldName = entity.nama;
        const newName = body.nama || body.nama;

        // Cascade update: fetch all and update matching records
        if (oldName !== newName) {
            const { data: records } = await db.from<any>('aktivitas_harians').select('*').execute();

            for (const record of records || []) {
                if (record.Pic) {
                    const picList = record.Pic.split(', ').map((p: string) => p.trim());
                    let changed = false;
                    for (let i = 0; i < picList.length; i++) {
                        if (picList[i] === oldName) {
                            picList[i] = newName;
                            changed = true;
                        }
                    }
                    if (changed) {
                        await db.from<any>('aktivitas_harians').update({ Pic: picList.join(', ') }).eq('id', record.id);
                    }
                }
            }
        }

        const { data: updated, error } = await db.from<any>('logbook_pics').update({
            nama: newName,
            updated_at: new Date().toISOString()
        }).eq('id', id);

        if (error) {
            console.error('Error updating pic:', error);
            return NextResponse.json({ message: 'Failed to update' }, { status: 500 });
        }

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

        const { data: entity } = await db.from<any>('logbook_pics').select('*').eq('id', id).single();
        if (!entity) return NextResponse.json({ message: 'Not Found' }, { status: 404 });

        // Check if pic is used - fetch all and count
        const { data: activities } = await db.from<any>('aktivitas_harians').select('*').execute();
        const usedCount = (activities || []).filter((a: any) => 
            a.Pic && a.Pic.includes(entity.nama)
        ).length;

        if (usedCount > 0) {
            return NextResponse.json({ message: `PIC '${entity.nama}' tidak dapat dihapus karena digunakan di ${usedCount} data aktivitas.` }, { status: 409 });
        }

        const { error } = await db.from<any>('logbook_pics').delete().eq('id', id);

        if (error) {
            console.error('Error deleting pic:', error);
            return NextResponse.json({ message: 'Failed to delete' }, { status: 500 });
        }

        return new NextResponse(null, { status: 204 });
    } catch (error) {
        console.error('Error deleting pic:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
