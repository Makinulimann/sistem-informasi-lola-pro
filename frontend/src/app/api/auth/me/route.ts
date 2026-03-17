export const dynamic = 'force-dynamic';
// Using Node.js runtime for Prisma compatibility
// Edge runtime now supported with Supabase!
export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

export async function GET(request: Request) {
    try {
        const authHeader = request.headers.get('Authorization');

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json(
                { message: 'Unauthorized' },
                { status: 401 }
            );
        }

        const token = authHeader.split(' ')[1];
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
