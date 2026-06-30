export const dynamic = 'force-dynamic';
export const runtime = 'edge';

import { NextResponse } from 'next/server';

export async function POST() {
    try {
        const response = NextResponse.json({ success: true, message: 'Logged out successfully' });

        // Expire the cookie server-side
        response.cookies.set({
            name: 'sippro_token',
            value: '',
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            path: '/',
            expires: new Date(0), // Set expiration in the past to delete the cookie
        });

        return response;
    } catch (error) {
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
