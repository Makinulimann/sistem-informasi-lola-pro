export const dynamic = 'force-dynamic';
// Using Node.js runtime for Prisma compatibility
// Edge runtime now supported with Supabase!
export const runtime = 'edge';
import { NextResponse } from 'next/server';

export async function GET() {
    return NextResponse.json({
        name: 'SIPPro',
        apiVersion: 'v1'
    });
}
