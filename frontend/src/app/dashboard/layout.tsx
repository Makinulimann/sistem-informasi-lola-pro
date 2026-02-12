'use client';

import { useState } from 'react';
import { Sidebar, DashboardHeader } from '@/components/dashboard/Sidebar';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [mobileOpen, setMobileOpen] = useState(false);

    return (
        <div className="flex h-screen overflow-hidden bg-gray-50">
            <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <DashboardHeader onMenuToggle={() => setMobileOpen((prev) => !prev)} />
                <main className="flex-1 overflow-y-auto p-6">
                    {children}
                </main>
            </div>
        </div>
    );
}
