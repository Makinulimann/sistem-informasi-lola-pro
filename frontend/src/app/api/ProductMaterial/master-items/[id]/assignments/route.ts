export const dynamic = 'force-dynamic';
// Using Node.js runtime for Prisma compatibility
// Edge runtime now supported with Supabase!
export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const p = await params;
        const id = parseInt(p.id, 10);

        // Fetch all and filter
        const { data: allAssignments } = await db.from<any>('product_materials').select('*').execute();
        const assignments = (allAssignments || []).filter((a: any) => (a.master_item_id || a.MasterItemId) === id);
        const formattedAssignments = assignments.map((a: any) => ({
            id: a.id || a.Id,
            productSlug: a.product_slug || a.ProductSlug,
            masterItemId: a.master_item_id || a.MasterItemId,
            jenis: a.jenis || a.Jenis
        }));

        return NextResponse.json(formattedAssignments);
    } catch (error) {
        console.error('Error fetching assignments:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
