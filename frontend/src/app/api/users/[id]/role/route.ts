import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const p = await params;
        const body = await request.json();

        if (!body.Role) {
            return NextResponse.json({ message: 'Role is required' }, { status: 400 });
        }

        await prisma.users.update({
            where: { Id: p.id },
            data: {
                Role: body.Role,
                UpdatedAt: new Date()
            }
        });

        return NextResponse.json({ message: 'Peran pengguna berhasil diperbarui' });
    } catch (error: any) {
        console.error('Error updating user role:', error);
        return NextResponse.json({ message: error.message }, { status: 400 });
    }
}
