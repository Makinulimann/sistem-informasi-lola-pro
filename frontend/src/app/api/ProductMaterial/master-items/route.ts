export const dynamic = 'force-dynamic';
// Using Node.js runtime for Prisma compatibility
// Edge runtime now supported with Supabase!
export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const search = searchParams.get('search');
        const scopeProductSlug = searchParams.get('scopeProductSlug');

        // Fetch all and filter in JavaScript
        const { data: allItems } = await db.from<any>('master_items').select('*').execute();

        let filtered = (allItems || []).filter((item: any) => (item.is_active === true || item.IsActive === true));

        if (scopeProductSlug) {
            filtered = filtered.filter((item: any) => {
                const itemScope = item.scope_product_slug || item.ScopeProductSlug;
                return itemScope === null || itemScope === scopeProductSlug;
            });
        } else {
            filtered = filtered.filter((item: any) => (item.scope_product_slug === null || item.ScopeProductSlug === null));
        }

        if (search) {
            const searchLower = search.toLowerCase();
            filtered = filtered.filter((item: any) => {
                const itemNama = item.nama || item.Nama;
                return itemNama && itemNama.toLowerCase().includes(searchLower);
            });
        }

        // Sort - nulls first for ScopeProductSlug, then by Nama
        filtered.sort((a: any, b: any) => {
            const aScope = a.scope_product_slug || a.ScopeProductSlug;
            const bScope = b.scope_product_slug || b.ScopeProductSlug;
            const aNama = a.nama || a.Nama || '';
            const bNama = b.nama || b.Nama || '';

            if (aScope === null && bScope !== null) return -1;
            if (aScope !== null && bScope === null) return 1;
            return aNama.localeCompare(bNama);
        });

        // Take 50
        const items = filtered.slice(0, 50);

        return NextResponse.json(items);
    } catch (error) {
        console.error('Error fetching master items:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();

        const nama = body.nama || body.Nama;
        const scopeProductSlug = body.scopeProductSlug || body.ScopeProductSlug || null;

        // Check for existing
        const { data: allItemsCheck } = await db.from<any>('master_items').select('*').execute();
        const existing = (allItemsCheck || []).filter((item: any) =>
            (item.nama || item.Nama || '').toLowerCase() === nama.toLowerCase()
        );

        if (existing && existing.length > 0) {
            return NextResponse.json({ message: 'Item with this name already exists available for this product.' }, { status: 400 });
        }

        const { data: item, error } = await db.from<any>('master_items').insert({
            nama: nama,
            kategori: body.kategori || body.Kategori,
            satuan_default: body.satuanDefault || body.SatuanDefault || 'Kg',
            scope_product_slug: scopeProductSlug,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        });

        if (error) {
            console.error('Error creating master item:', error);
            return NextResponse.json({ message: 'Failed to create' }, { status: 500 });
        }

        return NextResponse.json(item, { status: 201 });
    } catch (error) {
        console.error('Error creating master item:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
