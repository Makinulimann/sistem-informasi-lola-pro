export const dynamic = 'force-dynamic';
// Using Node.js runtime for Prisma compatibility
// Edge runtime now supported with Supabase!
export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';

export async function DELETE() {
    try {
        // Delete all ProductMaterials - fetch all and delete each
        const { data: allProductMaterials } = await db.from<any>('product_materials').select('*').execute();
        for (const pm of allProductMaterials || []) {
            await db.from<any>('product_materials').delete().eq('id', pm.Id);
        }

        // Delete all MasterItems - fetch all and delete each
        const { data: allMasterItems } = await db.from<any>('master_items').select('*').execute();
        for (const mi of allMasterItems || []) {
            await db.from<any>('master_items').delete().eq('id', mi.Id);
        }

        return new NextResponse(null, { status: 204 });
    } catch (error) {
        console.error('Error resetting materials:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
