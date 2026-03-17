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
        const { id } = await params;
        const rkapId = parseInt(id);

        if (isNaN(rkapId)) {
            return NextResponse.json({ message: 'Invalid ID' }, { status: 400 });
        }

        const body = await request.json();
        const { productSlug, bulan, tahun, target } = body;

        const updateData: any = {};
        if (productSlug !== undefined) updateData.product_slug = productSlug;
        if (bulan !== undefined) updateData.bulan = parseInt(bulan);
        if (tahun !== undefined) updateData.tahun = parseInt(tahun);
        if (target !== undefined) updateData.target = parseFloat(target);

        const { data: updated, error } = await db.from<any>('rkaps').update(updateData).eq('id', rkapId);

        if (error) {
            console.error('Error updating RKAP:', error);
            return NextResponse.json({ message: 'Failed to update' }, { status: 500 });
        }

        return NextResponse.json({
            message: 'Successfully updated RKAP data',
            data: {
                id: updated?.id,
                productSlug: updated?.product_slug,
                bulan: updated?.bulan,
                tahun: updated?.tahun,
                target: updated?.target,
            }
        });
    } catch (error) {
        console.error('Error in PUT /api/RKAP/[id]:', error);
        return NextResponse.json(
            { message: 'Internal Server Error' },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const rkapId = parseInt(id);

        if (isNaN(rkapId)) {
            return NextResponse.json({ message: 'Invalid ID' }, { status: 400 });
        }

        const { error } = await db.from('rkaps').delete().eq('id', rkapId);

        if (error) {
            console.error('Error deleting RKAP:', error);
            return NextResponse.json({ message: 'Failed to delete' }, { status: 500 });
        }

        return NextResponse.json({
            message: 'Successfully deleted RKAP data'
        });
    } catch (error) {
        console.error('Error in DELETE /api/RKAP/[id]:', error);
        return NextResponse.json(
            { message: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
