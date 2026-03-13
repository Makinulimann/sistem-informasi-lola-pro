import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ key: string }> }
) {
    try {
        const p = await params;
        const setting = await prisma.app_settings.findUnique({
            where: { key: p.key }
        });

        if (!setting) {
            return NextResponse.json({ message: `Setting '${p.key}' not found.` }, { status: 404 });
        }

        return NextResponse.json(setting);
    } catch (error) {
        console.error('Error fetching setting:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
