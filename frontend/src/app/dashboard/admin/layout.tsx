'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const data = await api.get<{ role: string }>('/auth/me');
                if (data.role !== 'Admin' && data.role !== 'admin') {
                    router.replace('/dashboard');
                } else {
                    setIsAuthorized(true);
                }
            } catch (error) {
                router.replace('/');
            }
        };
        checkAuth();
    }, [router]);

    if (isAuthorized === null) {
        return <div className="p-8 flex justify-center text-gray-500">Memeriksa hak akses...</div>;
    }

    return <>{children}</>;
}
