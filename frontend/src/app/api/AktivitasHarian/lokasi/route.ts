export const dynamic = 'force-dynamic';
// Using Node.js runtime for Prisma compatibility
// Edge runtime now supported with Supabase!
export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';

export async function GET() {
    try {
        const { data: list } = await db.from<any>('logbook_lokasis').select('*').execute();
        return NextResponse.json(list || []);
    } catch (error) {
        console.error('Error fetching lokasi:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { data: entity, error } = await db.from<any>('logbook_lokasis').insert({
            nama: body.nama || body.nama,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        });

        if (error) {
            console.error('Error creating lokasi:', error);
            return NextResponse.json({ message: 'Failed to create' }, { status: 500 });
        }

        return NextResponse.json(entity, { status: 201 });
    } catch (error) {
        console.error('Error creating lokasi:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
