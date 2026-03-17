export const dynamic = 'force-dynamic';
// Using Node.js runtime for Prisma compatibility
// Edge runtime now supported with Supabase!
export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';

export async function GET() {
    try {
        const { data: menus, error } = await db.from<any>('sidebar_menus').select('*').eq('is_active', true).execute();

        if (error) {
            console.error('Error fetching sidebar:', error);
            return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
        }

        // Sort by order ascending
        const sortedMenus = (menus || []).sort((a: any, b: any) => a.order - b.order);

        // Build Hierarchy function internally
        const buildHierarchy = (allMenus: any[], parentId: number | null): any[] => {
            return allMenus
                .filter(m => m.parent_id === parentId)
                .sort((a, b) => a.order - b.order)
                .map(m => ({
                    ...m,
                    Children: buildHierarchy(allMenus, m.id)
                }));
        };

        const hierarchy = buildHierarchy(sortedMenus, null);
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
            const parentData = {
                label: body.label || body.Label,
                icon: body.icon || body.Icon || '',
                href: body.href || body.Href || '#',
                parent_id: body.parentId || body.ParentId || null,
                order: body.order !== undefined ? body.order : body.Order || 1,
                is_active: body.isActive ?? body.IsActive ?? true,
                role_access: body.roleAccess || body.RoleAccess || 'All'
            };
            
            const { data: parent, error: parentError } = await db.from<any>('sidebar_menus').insert(parentData);

            if (parentError) {
                console.error('Error creating parent menu:', parentError);
                return NextResponse.json({ message: 'Failed to create menu' }, { status: 500 });
            }

            if (body.Children.length > 0) {
                let order = 1;
                const childrenData = (body.children || body.Children).map((child: any) => ({
                    label: child.label || child.Label,
                    icon: child.icon || child.Icon || '',
                    href: child.href || child.Href || '#',
                    parent_id: parent?.id,
                    order: order++,
                    is_active: child.isActive ?? child.IsActive ?? true,
                    role_access: parentData.role_access
                }));

                // Insert children one by one (Supabase REST doesn't have createMany)
                for (const childData of childrenData) {
                    await db.from<any>('sidebar_menus').insert(childData);
                }
            }
            return NextResponse.json(parent);
        } else {
            // Standard create
            const menuData = {
                label: body.label || body.Label,
                icon: body.icon || body.Icon || '',
                href: body.href || body.Href || '#',
                parent_id: body.parentId || body.ParentId || null,
                order: body.order !== undefined ? body.order : body.Order || 1,
                is_active: body.isActive ?? body.IsActive ?? true,
                role_access: body.roleAccess || body.RoleAccess || 'All'
            };
            
            const { data: menu, error } = await db.from<any>('sidebar_menus').insert(menuData);
            
            if (error) {
                console.error('Error creating menu:', error);
                return NextResponse.json({ message: 'Failed to create menu' }, { status: 500 });
            }
            
            return NextResponse.json(menu);
        }
    } catch (error) {
        console.error('Error creating sidebar menu:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
