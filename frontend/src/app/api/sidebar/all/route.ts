import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
    try {
        const menus = await prisma.sidebarMenus.findMany({
            orderBy: [
                { ParentId: 'asc' },
                { Order: 'asc' }
            ]
        });
        return NextResponse.json(menus);
    } catch (error) {
        console.error('Error fetching all sidebar menus:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
