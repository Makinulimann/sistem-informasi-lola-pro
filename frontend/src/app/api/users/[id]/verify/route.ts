import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const p = await params;
        await prisma.users.update({
            where: { Id: p.id },
            data: {
                IsVerified: true,
                UpdatedAt: new Date()
            }
        });

        return NextResponse.json({ message: 'Pengguna berhasil diverifikasi' });
    } catch (error: any) {
        console.error('Error verifying user:', error);
        return NextResponse.json({ message: error.message }, { status: 400 });
    }
}
