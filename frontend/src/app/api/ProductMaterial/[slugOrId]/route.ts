export const dynamic = 'force-dynamic';
// Using Node.js runtime for Prisma compatibility
// Edge runtime now supported with Supabase!
export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';

// GET /{productSlug}
export async function GET(
    request: Request,
    { params }: { params: Promise<{ slugOrId: string }> }
) {
    try {
        const p = await params;
        const { searchParams } = new URL(request.url);
        const jenis = searchParams.get('jenis');

        // Fetch all product_materials and filter
        const { data: allMaterials } = await db.from<any>('product_materials').select('*').execute();
        const { data: allMasterItems } = await db.from<any>('master_items').select('*').execute();

        // Create master items lookup
        const masterItemsMap = new Map();
        (allMasterItems || []).forEach((m: any) => masterItemsMap.set(m.id || m.Id, m));

        // Filter by productSlug and optionally by jenis
        let filtered = (allMaterials || []).filter((pm: any) => (pm.product_slug || pm.ProductSlug) === p.slugOrId);
        if (jenis) {
            filtered = filtered.filter((pm: any) => (pm.jenis || pm.Jenis) === jenis);
        }

        // Sort by MasterItems.nama and format
        const formatted = filtered
            .map((pm: any) => {
                const masterItem = masterItemsMap.get(pm.master_item_id || pm.MasterItemId);
                return {
                    id: pm.id || pm.Id,
                    masterItemId: pm.master_item_id || pm.MasterItemId,
                    nama: masterItem?.nama || masterItem?.Nama || '',
                    jenis: pm.jenis || pm.Jenis,
                    satuan: masterItem?.satuan_default || masterItem?.SatuanDefault || ''
                };
            })
            .sort((a: any, b: any) => a.nama.localeCompare(b.nama));

        return NextResponse.json(formatted);
    } catch (error) {
        console.error('Error fetching product materials:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

// DELETE /{id}
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ slugOrId: string }> }
) {
    try {
        const p = await params;
        const id = parseInt(p.slugOrId, 10);

        if (isNaN(id)) {
            return NextResponse.json({ message: 'Invalid ID' }, { status: 400 });
        }

        const { data: pm } = await db.from<any>('product_materials').select('*').eq('id', id).single();

        if (!pm) return NextResponse.json({ message: 'Not Found' }, { status: 404 });

        const { error } = await db.from<any>('product_materials').delete().eq('id', id);

        if (error) {
            console.error('Error unassigning material:', error);
            return NextResponse.json({ message: 'Failed to delete' }, { status: 500 });
        }

        return new NextResponse(null, { status: 204 });
    } catch (error) {
        console.error('Error unassigning material:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
