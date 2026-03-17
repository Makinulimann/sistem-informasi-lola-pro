export const dynamic = 'force-dynamic';
// Using Node.js runtime for Prisma compatibility
// Edge runtime now supported with Supabase!
export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';

export async function GET() {
    try {
        const { data: menus } = await db.from<any>('sidebar_menus').select('*').execute();
        
        // Sort by ParentId then Order
        const sortedMenus = (menus || []).sort((a: any, b: any) => {
            if (a.parent_id === b.parent_id) {
                return a.order - b.order;
            }
            return (a.parent_id || 0) - (b.parent_id || 0);
        });
        
        return NextResponse.json(sortedMenus);
    } catch (error) {
        console.error('Error fetching all sidebar menus:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
