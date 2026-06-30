export const dynamic = 'force-dynamic';
export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { db } from '@/lib/supabase';

export async function GET(request: NextRequest) {
    try {
        let token = request.headers.get('Authorization')?.split(' ')[1];
        if (!token) {
            token = request.cookies.get('sippro_token')?.value;
        }

        if (!token) {
            return NextResponse.json(
                { message: 'Unauthorized' },
                { status: 401 }
            );
        }

        const decoded = await verifyToken(token);

        if (!decoded) {
            return NextResponse.json(
                { message: 'Token invalid or expired' },
                { status: 401 }
            );
        }

        // Query real-time database state to get latest info & photo_url
        const userResult = await db.from<any>('users')
            .select('id,email,full_name,no_induk,role,photo_url')
            .eq('id', decoded.sub)
            .single();

        if (!userResult.error && userResult.data) {
            const user = userResult.data;
            return NextResponse.json({
                id: user.id,
                email: user.email,
                fullName: user.full_name,
                noInduk: user.no_induk,
                role: user.role,
                photoUrl: user.photo_url || null
            });
        }

        // Fallback to JWT token claims if database query fails or user is missing
        return NextResponse.json({
            id: decoded.sub,
            email: decoded.email,
            fullName: decoded.name,
            role: decoded.role,
            noInduk: '',
            photoUrl: null
        });

    } catch (error: any) {
        console.error('Auth Me Error:', error);
        return NextResponse.json(
            { message: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
