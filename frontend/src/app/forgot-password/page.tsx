'use client';

import Link from 'next/link';

export default function ForgotPasswordPage() {
    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-gray-100">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                    </svg>
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Sedang Dalam Pengembangan</h1>
                <p className="text-gray-500 mb-8">
                    Fitur Lupa Kata Sandi saat ini masih dalam tahap pengembangan. Silakan hubungi Administrator jika Anda tidak dapat mengingat sandi Anda.
                </p>
                <Link 
                    href="/" 
                    className="inline-flex items-center justify-center w-full px-4 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-colors"
                >
                    Kembali ke halaman Login
                </Link>
            </div>
        </div>
    );
}
