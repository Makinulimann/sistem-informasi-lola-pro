export const dynamic = 'force-dynamic';
export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

const imagekitPrivateKey = process.env.IMAGEKIT_PRIVATE_KEY || '';

export async function POST(request: NextRequest) {
    try {
        // 1. Verify User Session
        let token = request.headers.get('Authorization')?.split(' ')[1];
        if (!token) {
            token = request.cookies.get('sippro_token')?.value;
        }

        if (!token) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const decoded = await verifyToken(token);
        if (!decoded) {
            return NextResponse.json({ message: 'Unauthorized: Sesi tidak valid' }, { status: 401 });
        }

        // 2. Parse Multipart Form Data
        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ message: 'Tidak ada file gambar yang diunggah.' }, { status: 400 });
        }

        // 3. Size Validation: Max 5MB
        const MAX_SIZE = 5 * 1024 * 1024; // 5MB
        if (file.size > MAX_SIZE) {
            return NextResponse.json({ message: 'Ukuran file foto profil melebihi batas 5MB.' }, { status: 400 });
        }

        // 4. File Type Validation
        if (!file.type.startsWith('image/')) {
            return NextResponse.json({ message: 'Format file harus berupa gambar.' }, { status: 400 });
        }

        // 5. Configuration check
        if (!imagekitPrivateKey) {
            return NextResponse.json({ message: 'Konfigurasi ImageKit privat tidak ditemukan di server.' }, { status: 500 });
        }

        // 6. Setup ImageKit Upload request (passing binary file directly)
        const ikFormData = new FormData();
        ikFormData.append('file', file);
        ikFormData.append('fileName', `${decoded.sub}_avatar_${Date.now()}.${file.name.split('.').pop() || 'png'}`);
        ikFormData.append('useUniqueFileName', 'true');
        ikFormData.append('folder', '/sippro_avatars');

        // Create Basic Auth Header (privateKey:emptyPassword)
        const authString = btoa(`${imagekitPrivateKey}:`);

        const ikResponse = await fetch('https://upload.imagekit.io/api/v1/files/upload', {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${authString}`,
            },
            body: ikFormData,
        });

        const ikResult = await ikResponse.json();

        if (!ikResponse.ok) {
            console.error('ImageKit Upload Error:', ikResult);
            const errMsg = ikResult.message || 'Gagal mengunggah gambar ke server CDN ImageKit.';
            return NextResponse.json({ message: errMsg }, { status: 502 });
        }

        // Return the secure URL from ImageKit
        return NextResponse.json({
            url: ikResult.url,
            fileId: ikResult.fileId,
        });

    } catch (error: any) {
        console.error('Upload Profile Photo Error:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
