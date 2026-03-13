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

        const requestedId = body.id !== undefined ? body.id : body.Id;
        if (id !== requestedId) {
            return NextResponse.json({ message: 'Bad Request' }, { status: 400 });
        }

        const existing = await prisma.sidebarMenus.findUnique({
            where: { Id: id }
        });

        if (!existing) {
            return NextResponse.json({ message: 'Not Found' }, { status: 404 });
        }

        const updated = await prisma.sidebarMenus.update({
            where: { Id: id },
            data: {
                Label: body.label || body.Label,
                Icon: body.icon !== undefined ? body.icon : body.Icon,
                Href: body.href !== undefined ? body.href : body.Href,
                ParentId: body.parentId !== undefined ? body.parentId : body.ParentId,
                Order: body.order !== undefined ? body.order : body.Order,
                IsActive: body.isActive ?? body.IsActive,
                RoleAccess: body.roleAccess || body.RoleAccess,
            }
        });

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

        const existing = await prisma.sidebarMenus.findUnique({
            where: { Id: id }
        });

        if (!existing) {
            return NextResponse.json({ message: 'Not Found' }, { status: 404 });
        }

        // Delete grandChildren then children (Cascading manually as per .NET logic)
        const children = await prisma.sidebarMenus.findMany({
            where: { ParentId: id }
        });

        for (const child of children) {
            await prisma.sidebarMenus.deleteMany({
                where: { ParentId: child.Id }
            });
            await prisma.sidebarMenus.delete({
                where: { Id: child.Id }
            });
        }

        // Delete self
        await prisma.sidebarMenus.delete({
            where: { Id: id }
        });

        return new NextResponse(null, { status: 204 });
    } catch (error) {
        console.error('Error deleting sidebar menu:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
