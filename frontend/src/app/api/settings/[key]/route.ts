export const dynamic = 'force-dynamic';
// Using Node.js runtime for Prisma compatibility
// Edge runtime now supported with Supabase!
export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ key: string }> }
) {
    try {
        const p = await params;
        const { data: setting } = await db.from<any>('app_settings').select('*').eq('key', p.key).single();

        if (!setting) {
            return NextResponse.json({ message: `Setting '${p.key}' not found.` }, { status: 404 });
        }

        return NextResponse.json(setting);
    } catch (error) {
        console.error('Error fetching setting:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
