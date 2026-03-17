export const dynamic = 'force-dynamic';
// Using Node.js runtime for Prisma compatibility
// Edge runtime now supported with Supabase!
export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';

export async function GET() {
    try {
        const result = await db.from<any>('users').select('id,email,full_name,no_induk,role,is_verified,created_at,updated_at').execute();

        if (result.error) {
            console.error('Error fetching users:', result.error);
            return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
        }

        // Map snake_case to camelCase for frontend compatibility
        const users = (result.data || []).map((user: any) => ({
            id: user.id,
            email: user.email,
            fullName: user.full_name,
            noInduk: user.no_induk,
            role: user.role,
            isVerified: user.is_verified,
            createdAt: user.created_at,
            updatedAt: user.updated_at
        }));

        return NextResponse.json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
