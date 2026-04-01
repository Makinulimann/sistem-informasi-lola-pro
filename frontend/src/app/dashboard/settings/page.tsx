'use client';

import { Settings } from 'lucide-react';
import Link from 'next/link';

export default function SettingsPlaceholderPage() {
    return (
        <div className="flex-1 space-y-8 p-4 md:p-8 animate-in fade-in zoom-in-95 duration-300">
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
                    Pengaturan Akun
                </h1>
                <p className="text-gray-500 mt-2 text-base">
                    Kelola preferensi keamanan dan informasi profil Anda.
                </p>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 max-w-2xl mx-auto mt-12 text-center">
                <div className="w-20 h-20 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-emerald-100 shadow-sm">
                    <Settings className="w-10 h-10 text-emerald-600 animate-[spin_4s_linear_infinite]" />
                </div>
                
                <h2 className="text-2xl font-bold text-gray-900 mb-3">
                    Sedang Dalam Pengembangan
                </h2>
                
                <p className="text-gray-500 text-base leading-relaxed mb-8 max-w-md mx-auto">
                    Halaman pengaturan pengguna sedang dalam tahap pengembangan. Fitur penggantian sandi dan manajemen profil akan segera hadir di sini.
                </p>

                <Link 
                    href="/dashboard" 
                    className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 hover:shadow-md transition-all active:scale-[0.98]"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="19" y1="12" x2="5" y2="12" />
                        <polyline points="12 19 5 12 12 5" />
                    </svg>
                    Kembali ke Dashboard
                </Link>
            </div>
        </div>
    );
}
