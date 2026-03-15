export const runtime = 'edge';

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function DELETE() {
    try {
        // Delete all ProductMaterials
        await prisma.productMaterials.deleteMany();

        // Delete all MasterItems
        await prisma.masterItems.deleteMany();

        return new NextResponse(null, { status: 204 });
    } catch (error) {
        console.error('Error resetting materials:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
