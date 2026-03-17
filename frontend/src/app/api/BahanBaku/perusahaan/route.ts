export const dynamic = 'force-dynamic';
// Using Node.js runtime for Prisma compatibility
// Edge runtime now supported with Supabase!
export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';

export async function GET() {
    try {
        const { data: list, error } = await db.from<any>('perusahaans').select('*').execute();
        
        if (error) {
            console.error('Error fetching perusahaan:', error);
            return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
        }
        
        return NextResponse.json(list || []);
    } catch (error) {
        console.error('Error fetching perusahaan:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        
        const insertData = {
            nama: body.nama || body.Nama,
            kode: body.kode || body.Kode || '',
            alamat: body.alamat || body.Alamat || '',
            telepon: body.telepon || body.Telepon || '',
            is_active: body.isActive ?? body.IsActive ?? true
        };
        
        const { data: entity, error } = await db.from<any>('perusahaans').insert(insertData);

        if (error) {
            console.error('Error creating perusahaan:', error);
            return NextResponse.json({ message: 'Failed to create' }, { status: 500 });
        }
        
        return NextResponse.json(entity, { status: 201 });
    } catch (error) {
        console.error('Error creating perusahaan:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
