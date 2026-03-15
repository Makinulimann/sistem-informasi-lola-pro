export const runtime = 'edge';

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
    try {
        const users = await prisma.users.findMany({
            select: {
                Id: true,
                Email: true,
                FullName: true,
                NoInduk: true,
                Role: true,
                IsVerified: true,
                CreatedAt: true,
                UpdatedAt: true
            }
        });

        return NextResponse.json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
