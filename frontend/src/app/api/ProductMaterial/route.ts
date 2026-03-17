export const dynamic = 'force-dynamic';
// Using Node.js runtime for Prisma compatibility
// Edge runtime now supported with Supabase!
export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';

export async function POST(request: Request) {
    try {
        const body = await request.json();

        const productSlug = body.productSlug || body.ProductSlug;
        const masterItemId = body.masterItemId || body.MasterItemId;
        const jenis = body.jenis || body.Jenis;

        // Check if exists - get all for this product and filter manually
        const { data: allMaterials, error: checkError } = await db.from<any>('product_materials').select('*').eq('product_slug', productSlug).execute();

        if (checkError) {
            console.error('Error checking material:', checkError);
            return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
        }

        const exists = (allMaterials || []).filter((m: any) => m.master_item_id === masterItemId);

        if (exists.length > 0) {
            return NextResponse.json({ message: 'Material already assigned to this product as ' + jenis }, { status: 400 });
        }

        const insertData = {
            product_slug: productSlug,
            master_item_id: masterItemId,
            jenis: jenis,
        };

        const { data: pm, error: insertError } = await db.from<any>('product_materials').insert(insertData);

        if (insertError) {
            console.error('Error assigning material:', insertError);
            return NextResponse.json({ message: 'Failed to assign material' }, { status: 500 });
        }

        return NextResponse.json(pm);
    } catch (error) {
        console.error('Error assigning material:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
