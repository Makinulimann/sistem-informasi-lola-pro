export const dynamic = 'force-dynamic';
// Using Node.js runtime for Prisma compatibility
// Edge runtime now supported with Supabase!
export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';

export async function GET() {
    try {
        const { data: allMenus } = await db.from<any>('sidebar_menus').select('*').execute();

        const topLevel = (allMenus || []).filter((m: any) => (m.parent_id === null || m.ParentId === null));

        const categories: any[] = [];

        for (const top of topLevel) {
            const children = (allMenus || []).filter((m: any) => (m.parent_id || m.ParentId) === (top.id || top.Id));

            const hasProducts = children.some((c: any) => (allMenus || []).some((s: any) => (s.parent_id || s.ParentId) === (c.id || c.Id)));
            if (!hasProducts) continue;

            const grandchildren = children.flatMap((c: any) => (allMenus || []).filter((s: any) => (s.parent_id || s.ParentId) === (c.id || c.Id)));
            const firstGrandChild = grandchildren.find((m: any) => (m.href || m.Href) !== '#');

            let categorySlug = null;
            if (firstGrandChild) {
                const href = firstGrandChild.href || firstGrandChild.Href;
                const parts = href.split('/').filter((s: string) => s);
                if (parts.length >= 2) categorySlug = parts[1];
            }

            if (categorySlug) {
                categories.push({
                    slug: categorySlug,
                    label: top.label || top.Label,
                    icon: top.icon || top.Icon,
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
