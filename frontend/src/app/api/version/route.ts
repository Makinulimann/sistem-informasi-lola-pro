import { NextResponse } from 'next/server';

export async function GET() {
    return NextResponse.json({
        name: 'SIPPro',
        apiVersion: 'v1'
    });
}
