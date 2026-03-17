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

        const requestedId = body.id !== undefined ? body.id : body.Id;
        if (id !== requestedId) {
            return NextResponse.json({ message: 'Bad Request' }, { status: 400 });
        }

        const { data: existing, error: fetchError } = await db.from<any>('sidebar_menus').select('*').eq('id', id).single();

        if (fetchError || !existing) {
            return NextResponse.json({ message: 'Not Found' }, { status: 404 });
        }

        const updateData: any = {};
        if (body.label !== undefined || body.Label !== undefined) updateData.label = body.label || body.Label;
        if (body.icon !== undefined || body.Icon !== undefined) updateData.icon = body.icon || body.Icon;
        if (body.href !== undefined || body.Href !== undefined) updateData.href = body.href || body.Href;
        if (body.parentId !== undefined || body.ParentId !== undefined) updateData.parent_id = body.parentId || body.ParentId;
        if (body.order !== undefined || body.Order !== undefined) updateData.order = body.order || body.Order;
        if (body.isActive !== undefined || body.IsActive !== undefined) updateData.is_active = body.isActive ?? body.IsActive;
        if (body.roleAccess !== undefined || body.RoleAccess !== undefined) updateData.role_access = body.roleAccess || body.RoleAccess;

        const { data: updated, error: updateError } = await db.from<any>('sidebar_menus').update(updateData).eq('id', id);

        if (updateError) {
            console.error('Error updating menu:', updateError);
            return NextResponse.json({ message: 'Failed to update' }, { status: 500 });
        }

        return NextResponse.json(updated);
    } catch (error) {
        console.error('Error updating sidebar menu:', error);
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

        const { data: existing, error: fetchError } = await db.from<any>('sidebar_menus').select('*').eq('id', id).single();

        if (fetchError || !existing) {
            return NextResponse.json({ message: 'Not Found' }, { status: 404 });
        }

        // Delete children first (Cascading manually)
        const { data: children } = await db.from<any>('sidebar_menus').select('*').eq('parent_id', id).execute();
        
        if (children && children.length > 0) {
            for (const child of children) {
                // Delete grandchildren first
                const { data: grandchildren } = await db.from<any>('sidebar_menus').select('*').eq('parent_id', child.id).execute();
                if (grandchildren && grandchildren.length > 0) {
                    for (const grandchild of grandchildren) {
                        await db.from<any>('sidebar_menus').delete().eq('id', grandchild.id);
                    }
                }
                // Delete child
                await db.from<any>('sidebar_menus').delete().eq('id', child.id);
            }
        }

        // Delete self
        const { error: deleteError } = await db.from<any>('sidebar_menus').delete().eq('id', id);

        if (deleteError) {
            console.error('Error deleting menu:', deleteError);
            return NextResponse.json({ message: 'Failed to delete' }, { status: 500 });
        }

        return new NextResponse(null, { status: 204 });
    } catch (error) {
        console.error('Error deleting sidebar menu:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
