import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const token = request.cookies.get('sippro_token')?.value;
    const { pathname } = request.nextUrl;

    // Public routes (no auth required)
    const publicRoutes = ['/', '/register', '/forgot-password'];

    // Static assets and API routes (let them pass)
    if (
        pathname.startsWith('/_next') ||
        pathname.startsWith('/api') || // Backend API calls or Next.js API routes
        pathname.startsWith('/images') ||
        pathname === '/favicon.ico'
    ) {
        return NextResponse.next();
    }

    // If user has token and tries to access login/register, redirect to dashboard
    if (token && publicRoutes.includes(pathname)) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    // If user has NO token and tries to access protected route, redirect to login
    if (!token && !publicRoutes.includes(pathname)) {
        const loginUrl = new URL('/', request.url);
        // loginUrl.searchParams.set('callbackUrl', pathname); // Optional: remember where they were going
        return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!api|_next/static|_next/image|favicon.ico).*)',
    ],
};
