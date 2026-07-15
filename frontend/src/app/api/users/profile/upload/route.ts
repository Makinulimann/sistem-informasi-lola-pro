export const dynamic = 'force-dynamic';
export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

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
        const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || '';
        const apiKey = process.env.CLOUDINARY_API_KEY || '';
        const apiSecret = process.env.CLOUDINARY_API_SECRET || '';

        if (!cloudName || !apiKey || !apiSecret) {
            return NextResponse.json({ message: 'Konfigurasi Cloudinary tidak lengkap di server.' }, { status: 500 });
        }

        // 6. Setup Cloudinary Signed Upload
        const timestamp = Math.round(Date.now() / 1000).toString();
        const folder = 'sippro_avatars';
        const publicId = `${decoded.sub}_avatar_${Date.now()}`;

        const paramsToSign = {
            folder,
            public_id: publicId,
            timestamp,
        };

        const sortedKeys = Object.keys(paramsToSign).sort() as Array<keyof typeof paramsToSign>;
        const signatureString = sortedKeys.map(key => `${key}=${paramsToSign[key]}`).join('&') + apiSecret;

        // Generate SHA-1 Hash using Web Crypto API for Edge runtime compatibility
        const encoder = new TextEncoder();
        const dataBuffer = encoder.encode(signatureString);
        const hashBuffer = await crypto.subtle.digest('SHA-1', dataBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const signature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        const cloudinaryFormData = new FormData();
        cloudinaryFormData.append('file', file);
        cloudinaryFormData.append('api_key', apiKey);
        cloudinaryFormData.append('timestamp', timestamp);
        cloudinaryFormData.append('folder', folder);
        cloudinaryFormData.append('public_id', publicId);
        cloudinaryFormData.append('signature', signature);

        const cloudinaryResponse = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
            method: 'POST',
            body: cloudinaryFormData,
        });

        const cloudinaryResult = await cloudinaryResponse.json();

        if (!cloudinaryResponse.ok) {
            console.error('Cloudinary Upload Error:', cloudinaryResult);
            const errMsg = cloudinaryResult.error?.message || 'Gagal mengunggah gambar ke server CDN Cloudinary.';
            return NextResponse.json({ message: errMsg }, { status: 502 });
        }

        // Return the secure URL from Cloudinary
        return NextResponse.json({
            url: cloudinaryResult.secure_url,
            fileId: cloudinaryResult.public_id,
        });

    } catch (error: any) {
        console.error('Upload Profile Photo Error:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
