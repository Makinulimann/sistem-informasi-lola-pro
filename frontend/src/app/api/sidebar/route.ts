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

        // Map fields to camelCase and handle name mapping
        const mappedMenus = (menus || []).map((m: any) => {
            let labelVal = m.label || m.Label;
            if (labelVal === 'Phonska Oca') {
                labelVal = 'Phonska Oca Plus';
            }
            return {
                id: m.id,
                label: labelVal,
                icon: m.icon || '',
                href: m.href || '#',
                parentId: m.parent_id !== undefined ? m.parent_id : m.ParentId !== undefined ? m.ParentId : null,
                order: m.order !== undefined ? m.order : m.Order || 1,
                isActive: m.is_active !== undefined ? m.is_active : m.IsActive ?? true,
                roleAccess: m.role_access !== undefined ? m.role_access : m.RoleAccess || 'All',
                imageUrl: m.image_url !== undefined ? m.image_url : m.ImageUrl || null,
                jenis: m.jenis !== undefined ? m.jenis : m.Jenis || null,
                satuan: m.satuan !== undefined ? m.satuan : m.Satuan || null,
            };
        });

        // Build Hierarchy function internally
        const buildHierarchy = (allMenus: any[], parentId: number | null): any[] => {
            return allMenus
                .filter(m => m.parentId === parentId)
                .sort((a, b) => a.order - b.order)
                .map(m => ({
                    ...m,
                    children: buildHierarchy(allMenus, m.id)
                }));
        };

        const hierarchy = buildHierarchy(mappedMenus, null);
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
        const childrenArr = body.Children || body.children;
        if (childrenArr && Array.isArray(childrenArr)) {
            // Create with children
            const parentData = {
                label: body.label || body.Label,
                icon: body.icon || body.Icon || '',
                href: body.href || body.Href || '#',
                parent_id: body.parentId || body.ParentId || null,
                order: body.order !== undefined ? body.order : body.Order || 1,
                is_active: body.isActive ?? body.IsActive ?? true,
                role_access: body.roleAccess || body.RoleAccess || 'All',
                image_url: body.imageUrl || body.ImageUrl || null,
                jenis: body.jenis || body.Jenis || null,
                satuan: body.satuan || body.Satuan || null,
            };
            
            const { data: parent, error: parentError } = await db.from<any>('sidebar_menus').insert(parentData);

            if (parentError) {
                console.error('Error creating parent menu:', parentError);
                return NextResponse.json({ message: 'Failed to create menu' }, { status: 500 });
            }

            if (childrenArr.length > 0) {
                let order = 1;
                const childrenData = childrenArr.map((child: any) => ({
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

            // Auto-initialize default production tab for the new product
            let slug = '';
            for (const child of childrenArr) {
                const href = child.href || child.Href || '';
                if (href.startsWith('/dashboard/produk-pengembangan/')) {
                    const parts = href.split('/').filter(Boolean);
                    if (parts.length >= 3) {
                        slug = parts[2];
                        break;
                    }
                }
            }

            if (slug) {
                try {
                    const isCair = parentData.satuan
                        ? ['liter', 'ml', 'kl', 'l', 'lt'].includes(parentData.satuan.toLowerCase())
                        : false;
                    const defaultTabName = parentData.jenis || (isCair ? 'Cair' : 'Padat');

                    // Check if a tab already exists
                    const { data: existingTabs } = await db.from<any>('produksi_tabs').select('id').eq('product_slug', slug).execute();
                    if (!existingTabs || existingTabs.length === 0) {
                        const { data: allTabs } = await db.from<any>('produksi_tabs').select('id').order('id', { ascending: false }).execute();
                        const maxId = allTabs && allTabs.length > 0 ? allTabs[0].id : 0;

                        await db.from<any>('produksi_tabs').insert({
                            id: maxId + 1,
                            product_slug: slug,
                            nama: defaultTabName,
                            order: 1
                        });
                        console.log(`Initialized default production tab "${defaultTabName}" for product "${slug}"`);
                    }
                } catch (tabErr) {
                    console.error('Failed to auto-create default production tab:', tabErr);
                }
            }

            return NextResponse.json(parent ? {
                id: parent.id,
                label: parent.label,
                icon: parent.icon,
                href: parent.href,
                parentId: parent.parent_id,
                order: parent.order,
                isActive: parent.is_active,
                roleAccess: parent.role_access,
                imageUrl: parent.image_url,
                jenis: parent.jenis,
                satuan: parent.satuan,
            } : null);
        } else {
            // Standard create
            const menuData = {
                label: body.label || body.Label,
                icon: body.icon || body.Icon || '',
                href: body.href || body.Href || '#',
                parent_id: body.parentId || body.ParentId || null,
                order: body.order !== undefined ? body.order : body.Order || 1,
                is_active: body.isActive ?? body.IsActive ?? true,
                role_access: body.roleAccess || body.RoleAccess || 'All',
                image_url: body.imageUrl || body.ImageUrl || null,
                jenis: body.jenis || body.Jenis || null,
                satuan: body.satuan || body.Satuan || null,
            };
            
            const { data: menu, error } = await db.from<any>('sidebar_menus').insert(menuData);
            
            if (error) {
                console.error('Error creating menu:', error);
                return NextResponse.json({ message: 'Failed to create menu' }, { status: 500 });
            }
            
            return NextResponse.json(menu ? {
                id: menu.id,
                label: menu.label,
                icon: menu.icon,
                href: menu.href,
                parentId: menu.parent_id,
                order: menu.order,
                isActive: menu.is_active,
                roleAccess: menu.role_access,
                imageUrl: menu.image_url,
                jenis: menu.jenis,
                satuan: menu.satuan,
            } : null);
        }
    } catch (error) {
        console.error('Error creating sidebar menu:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
