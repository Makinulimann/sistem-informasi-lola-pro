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
            return NextResponse.json({ message: 'productSlug is required' }, { status: 400 });
        }

        // Use db helper with proper chaining
        const result = await db.from<any>('materials').select('*').eq('product_slug', productSlug).execute();
        
        if (result.error) {
            console.error('Error fetching materials:', result.error);
            return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
        }

        return NextResponse.json(result.data || []);
    } catch (error) {
        console.error('Error fetching materials:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();

        const productSlug = body.productSlug || body.ProductSlug;
        
        // Get max order
        const existingResult = await db.from<any>('materials').select('order').eq('product_slug', productSlug).order('order', { ascending: false }).execute();
        
        const maxOrder = existingResult.data && existingResult.data.length > 0 ? existingResult.data[0].order : 0;

        const insertData = {
            product_slug: productSlug,
            nama: body.nama || body.Nama,
            jenis: body.jenis || body.Jenis,
            order: maxOrder + 1,
            is_active: body.isActive ?? body.IsActive ?? true
        };

        const insertResult = await db.from<any>('materials').insert(insertData);

        if (insertResult.error) {
            console.error('Error creating material:', insertResult.error);
            return NextResponse.json({ message: 'Failed to create material' }, { status: 500 });
        }

        return NextResponse.json(insertResult.data, { status: 201 });
    } catch (error) {
        console.error('Error creating material:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
