'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/api';
import { jwtDecode } from 'jwt-decode';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

    useEffect(() => {
        const token = auth.getToken();
        if (!token) {
            router.replace('/');
            return;
        }

        try {
            const decoded: any = jwtDecode(token);
            if (decoded.role !== 'Admin' && decoded.role !== 'admin') {
                router.replace('/dashboard');
            } else {
                setIsAuthorized(true);
            }
        } catch (error) {
            console.error('Failed to decode token:', error);
            router.replace('/');
        }
    }, [router]);

    if (isAuthorized === null) {
        return <div className="p-8 flex justify-center text-gray-500">Memeriksa hak akses...</div>;
    }

    return <>{children}</>;
}
