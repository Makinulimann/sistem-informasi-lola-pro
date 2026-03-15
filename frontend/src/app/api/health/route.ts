import { NextResponse } from 'next/server';

export async function GET() {
    return NextResponse.json({
        status: 'ok',
        service: 'sippro-api',
        timestamp: new Date().toISOString()
    });
}
