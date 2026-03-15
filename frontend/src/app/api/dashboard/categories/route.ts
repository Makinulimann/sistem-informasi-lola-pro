import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
    try {
        const allMenus = await prisma.sidebarMenus.findMany({
            where: { IsActive: true },
            orderBy: { Order: 'asc' }
        });

        const topLevel = allMenus.filter(m => m.ParentId === null);

        // In Prisma, we might not have a direct children mapping populated if not included, but we have all flat records.
        const categories: any[] = [];

        for (const top of topLevel) {
            const children = allMenus.filter(m => m.ParentId === top.Id);

            const hasProducts = children.some(c => allMenus.some(s => s.ParentId === c.Id));
            if (!hasProducts) continue;

            const grandchildren = children.flatMap(c => allMenus.filter(s => s.ParentId === c.Id));
            const firstGrandChild = grandchildren.find(m => m.Href !== '#');

            let categorySlug = null;
            if (firstGrandChild) {
                // e.g., "/dashboard/phonska/phonska-1" => [ "dashboard", "phonska", "phonska-1" ]
                const parts = firstGrandChild.Href.split('/').filter(s => s);
                if (parts.length >= 2) categorySlug = parts[1];
            }

            if (categorySlug) {
                categories.push({
                    slug: categorySlug,
                    label: top.Label,
                    icon: top.Icon,
                    productCount: children.length
                });
            }
        }

        return NextResponse.json(categories);
    } catch (error) {
        console.error('Error fetching categories:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
