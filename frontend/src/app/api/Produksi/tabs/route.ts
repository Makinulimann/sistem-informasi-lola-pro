export const dynamic = 'force-dynamic';
// Using Node.js runtime for Prisma compatibility
// Edge runtime now supported with Supabase!
export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const productSlug = searchParams.get('productSlug');

        if (!productSlug) {
            return NextResponse.json({ message: 'productSlug is required.' }, { status: 400 });
        }

        const { data: tabs, error } = await db.from<any>('produksi_tabs').select('*').eq('product_slug', productSlug).execute();

        if (error) {
            console.error('Error fetching tabs:', error);
            return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
        }

        return NextResponse.json(tabs || []);
    } catch (error) {
        console.error('Error fetching tabs:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();

        const productSlug = body.productSlug || body.ProductSlug;
        const nama = body.nama || body.Nama;

        if (!productSlug || !nama) {
            return NextResponse.json({ message: 'ProductSlug dan Nama wajib diisi.' }, { status: 400 });
        }

        // Get max order
        const { data: existing } = await db.from<any>('produksi_tabs').select('order').eq('product_slug', productSlug).order('order', { ascending: false }).execute();
        
        const maxOrder = existing && existing.length > 0 ? existing[0].order : 0;

        const insertData = {
            product_slug: productSlug,
            nama: nama,
            order: maxOrder + 1
        };

        const { data: tab, error } = await db.from<any>('produksi_tabs').insert(insertData);

        if (error) {
            console.error('Error creating tab:', error);
            return NextResponse.json({ message: 'Failed to create tab' }, { status: 500 });
        }

        return NextResponse.json({ Id: tab?.id, Nama: tab?.nama, Order: tab?.order });
    } catch (error) {
        console.error('Error creating tab:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
