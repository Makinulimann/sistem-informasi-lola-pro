export const dynamic = 'force-dynamic';
// Using Node.js runtime for Prisma compatibility
// Edge runtime now supported with Supabase!
export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const slug = searchParams.get('slug');
        const bulan = searchParams.get('bulan');
        const tahun = searchParams.get('tahun');

        if (!slug) {
            return NextResponse.json({ message: 'Product slug required' }, { status: 400 });
        }

        // Build query based on filters
        let query = `rkaps?product_slug=eq.${encodeURIComponent(slug)}&select=*`;
        if (bulan) {
            query += `&bulan=eq.${parseInt(bulan)}`;
        }
        if (tahun) {
            query += `&tahun=eq.${parseInt(tahun)}`;
        }
        query += '&order=tahun.desc,bulan.desc';

        const result = await db.from<any>('rkaps').select('*').execute();

        // Filter manually since we can't do complex queries with the helper
        let filteredData = result.data || [];
        if (bulan) {
            filteredData = filteredData.filter((d: any) => d.bulan === parseInt(bulan));
        }
        if (tahun) {
            filteredData = filteredData.filter((d: any) => d.tahun === parseInt(tahun));
        }

        const mappedData = filteredData.map((d: any) => ({
            id: d.id,
            productSlug: d.product_slug,
            bulan: d.bulan,
            tahun: d.tahun,
            target: d.target,
        }));

        return NextResponse.json({
            message: 'Success',
            data: mappedData
        });
    } catch (error) {
        console.error('Error in GET /api/RKAP:', error);
        return NextResponse.json(
            { message: 'Internal Server Error' },
            { status: 500 }
        );
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { productSlug, bulan, tahun, target } = body;

        if (!productSlug || !bulan || !tahun || target === undefined) {
            return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
        }

        const insertData = {
            product_slug: productSlug,
            bulan: parseInt(bulan),
            tahun: parseInt(tahun),
            target: parseFloat(target)
        };

        const { data: created, error: insertError } = await db.from<any>('rkaps').insert(insertData);

        if (insertError) {
            console.error('Error creating RKAP:', insertError);
            return NextResponse.json({ message: 'Failed to create RKAP' }, { status: 500 });
        }

        return NextResponse.json({
            message: 'Successfully created RKAP data',
            data: {
                id: created?.id,
                productSlug: created?.product_slug,
                bulan: created?.bulan,
                tahun: created?.tahun,
                target: created?.target,
            }
        });
    } catch (error) {
        console.error('Error in POST /api/RKAP:', error);
        return NextResponse.json(
            { message: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
