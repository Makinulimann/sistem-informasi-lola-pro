import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from './lib/auth';

export default async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Allow OPTIONS request for CORS preflight
    if (request.method === 'OPTIONS') {
        return NextResponse.next();
    }

    // Handle API routes
    if (pathname.startsWith('/api')) {
        // Public API routes
        const publicApiRoutes = [
            '/api/auth/login',
            '/api/auth/register',
            '/api/auth/logout',
            '/api/health',
            '/api/version'
        ];
        if (publicApiRoutes.includes(pathname)) {
            return NextResponse.next();
        }

        // Verify token for protected API routes
        let token = request.headers.get('Authorization')?.split(' ')[1];
        if (!token) {
            token = request.cookies.get('sippro_token')?.value;
        }

        if (!token) {
            return NextResponse.json({ message: 'Unauthorized: Missing token' }, { status: 401 });
        }

        const decoded = await verifyToken(token);
        if (!decoded) {
            return NextResponse.json({ message: 'Unauthorized: Invalid or expired token' }, { status: 401 });
        }

        return NextResponse.next();
    }

    // Handle page routes
    const token = request.cookies.get('sippro_token')?.value;
    const publicRoutes = ['/', '/register', '/forgot-password'];

    // If user has token and tries to access login/register, redirect to dashboard
    if (token && publicRoutes.includes(pathname)) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    // If user has NO token and tries to access protected route, redirect to login
    if (!token && !publicRoutes.includes(pathname)) {
        const loginUrl = new URL('/', request.url);
        return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!_next/static|_next/image|favicon.ico).*)',
    ],
};
