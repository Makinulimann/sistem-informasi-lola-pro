export const dynamic = 'force-dynamic';
export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

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

        // Return user details expected by Sidebar.tsx
        return NextResponse.json({
            fullName: decoded.name, // In login route, we mapped user.FullName to 'name' in payload
            role: decoded.role,
            email: decoded.email,
            id: decoded.sub
        });

    } catch (error: any) {
        console.error('Auth Me Error:', error);
        return NextResponse.json(
            { message: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
