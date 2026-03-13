import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
    try {
        const menus = await prisma.sidebarMenus.findMany({
            where: { IsActive: true },
            orderBy: { Order: 'asc' }
        });

        // Build Hierarchy function internally
        const buildHierarchy = (allMenus: any[], parentId: number | null): any[] => {
            return allMenus
                .filter(m => m.ParentId === parentId)
                .sort((a, b) => a.Order - b.Order)
                .map(m => ({
                    ...m,
                    Children: buildHierarchy(allMenus, m.Id)
                }));
        };

        const hierarchy = buildHierarchy(menus, null);
        return NextResponse.json(hierarchy);
    } catch (error) {
        console.error('Error fetching sidebar:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();

        // Check if it's "create-with-children" shape
        if (body.Children && Array.isArray(body.Children)) {
            // Create with children
            const parent = await prisma.sidebarMenus.create({
                data: {
                    Label: body.label || body.Label,
                    Icon: body.icon || body.Icon || '',
                    Href: body.href || body.Href || '#',
                    ParentId: body.parentId || body.ParentId || null,
                    Order: body.order !== undefined ? body.order : body.Order,
                    IsActive: body.isActive ?? body.IsActive ?? true,
                    RoleAccess: body.roleAccess || body.RoleAccess || 'All'
                }
            });

            if (body.Children.length > 0) {
                let order = 1;
                const childrenData = (body.children || body.Children).map((child: any) => ({
                    Label: child.label || child.Label,
                    Icon: child.icon || child.Icon || '',
                    Href: child.href || child.Href || '#',
                    ParentId: parent.Id,
                    Order: order++,
                    IsActive: child.isActive ?? child.IsActive ?? true,
                    RoleAccess: parent.RoleAccess
                }));

                await prisma.sidebarMenus.createMany({
                    data: childrenData
                });
            }
            return NextResponse.json(parent);
        } else {
            // Standard create
            const menu = await prisma.sidebarMenus.create({
                data: {
                    Label: body.label || body.Label,
                    Icon: body.icon || body.Icon || '',
                    Href: body.href || body.Href || '#',
                    ParentId: body.parentId || body.ParentId || null,
                    Order: body.order !== undefined ? body.order : body.Order,
                    IsActive: body.isActive ?? body.IsActive ?? true,
                    RoleAccess: body.roleAccess || body.RoleAccess || 'All'
                }
            });
            return NextResponse.json(menu);
        }
    } catch (error) {
        console.error('Error creating sidebar menu:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
