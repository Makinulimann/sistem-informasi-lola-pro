'use client';

import { useState, type FormEvent, Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AppButton } from '@/components/ui/app-button';
import { AppInput } from '@/components/ui/app-input';

/* ─── Icons ─── */
function MailIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
            <rect x="2" y="4" width="20" height="16" rx="2" />
            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
        </svg>
    );
}

function LockIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
            <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
    );
}

function CheckCircleIcon() {
    return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
    );
}

function EyeOpenIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
        </svg>
    );
}

function EyeClosedIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
            <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
            <line x1="1" y1="1" x2="23" y2="23" />
            <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
        </svg>
    );
}

function ForgotPasswordContent() {
    const searchParams = useSearchParams();
    
    const token = searchParams.get('token');
    
    const [email, setEmail] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isEmailSent, setIsEmailSent] = useState(false);
    const [isResetSuccess, setIsResetSuccess] = useState(false);

    const handleSendResetLink = async (e: FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        setMessage(null);

        try {
            const res = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Gagal mengirim email reset.');

            setIsEmailSent(true);
            setMessage(data.message);
        } catch (err: any) {
            setError(err.message || 'Terjadi kesalahan saat mengirim link reset.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleResetPassword = async (e: FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            setError('Konfirmasi password tidak cocok.');
            return;
        }
        setIsLoading(true);
        setError(null);
        setMessage(null);

        try {
            const res = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, newPassword, confirmPassword }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Gagal mereset kata sandi.');

            setIsResetSuccess(true);
            setMessage(data.message);
        } catch (err: any) {
            setError(err.message || 'Terjadi kesalahan saat mereset kata sandi.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border border-gray-100 space-y-6">
            {/* Logos */}
            <div className="flex items-center justify-center gap-4 flex-wrap mb-2">
                <Image
                    src="/images/logo-PG.webp"
                    alt="Petrokimia Gresik"
                    width={90}
                    height={30}
                    className="object-contain h-7 w-auto"
                />
                <span className="w-px h-6 bg-gray-200" />
                <Image
                    src="/images/logo-pi.webp"
                    alt="Pupuk Indonesia"
                    width={90}
                    height={30}
                    className="object-contain h-7 w-auto"
                />
            </div>

            {/* Header Content */}
            <div className="text-center">
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                    {token ? 'Reset Kata Sandi' : 'Lupa Kata Sandi?'}
                </h1>
                <p className="mt-2 text-sm text-gray-500 leading-relaxed">
                    {token
                        ? 'Silakan masukkan kata sandi baru Anda untuk akun SIPP.'
                        : 'Masukkan alamat email Anda yang terdaftar untuk menerima tautan pemulihan.'}
                </p>
            </div>

            {/* Success and Error Alerts */}
            {error && (
                <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm">
                    <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        {error}
                    </div>
                </div>
            )}

            {message && !error && (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-800 text-sm">
                    <div className="flex items-start gap-2.5">
                        <div className="mt-0.5 shrink-0">
                            <CheckCircleIcon />
                        </div>
                        <p className="leading-relaxed">{message}</p>
                    </div>
                </div>
            )}

            {/* States */}
            {isResetSuccess ? (
                <div className="space-y-4">
                    <Link
                        href="/"
                        className="inline-flex items-center justify-center w-full px-4 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-500/20"
                    >
                        Masuk ke Aplikasi
                    </Link>
                </div>
            ) : isEmailSent ? (
                <div className="space-y-4 pt-2">
                    <button
                        onClick={() => setIsEmailSent(false)}
                        className="text-sm font-semibold text-emerald-600 hover:text-emerald-700 transition-colors block text-center w-full"
                    >
                        Kirim ulang atau gunakan email lain
                    </button>
                    <Link
                        href="/"
                        className="inline-flex items-center justify-center w-full px-4 py-3 bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200 transition-colors"
                    >
                        Kembali ke halaman Login
                    </Link>
                </div>
            ) : token ? (
                /* Form Reset Password (Step 3) */
                <form className="space-y-5" onSubmit={handleResetPassword}>
                    <AppInput
                        id="newPassword"
                        type={showPassword ? 'text' : 'password'}
                        label="Kata Sandi Baru"
                        placeholder="Masukkan kata sandi baru"
                        icon={<LockIcon />}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        rightElement={
                            <button
                                type="button"
                                className="text-gray-400 hover:text-gray-600 transition-colors p-0.5"
                                onClick={() => setShowPassword(prev => !prev)}
                            >
                                {showPassword ? <EyeOpenIcon /> : <EyeClosedIcon />}
                            </button>
                        }
                    />

                    <AppInput
                        id="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        label="Konfirmasi Kata Sandi"
                        placeholder="Ulangi kata sandi baru"
                        icon={<LockIcon />}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        rightElement={
                            <button
                                type="button"
                                className="text-gray-400 hover:text-gray-600 transition-colors p-0.5"
                                onClick={() => setShowConfirmPassword(prev => !prev)}
                            >
                                {showConfirmPassword ? <EyeOpenIcon /> : <EyeClosedIcon />}
                            </button>
                        }
                    />

                    <AppButton
                        type="submit"
                        loading={isLoading}
                        className="w-full py-3 shadow-emerald-500/25 hover:shadow-emerald-500/40"
                    >
                        Simpan Kata Sandi
                    </AppButton>
                </form>
            ) : (
                /* Form Request Link (Step 1) */
                <form className="space-y-5" onSubmit={handleSendResetLink}>
                    <AppInput
                        id="email"
                        type="email"
                        label="Email Terdaftar"
                        placeholder="Contoh: user@petrokimia-gresik.com"
                        icon={<MailIcon />}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />

                    <AppButton
                        type="submit"
                        loading={isLoading}
                        className="w-full py-3 shadow-emerald-500/25 hover:shadow-emerald-500/40"
                    >
                        Kirim Link Reset
                    </AppButton>

                    <Link
                        href="/"
                        className="inline-flex items-center justify-center w-full px-4 py-3 bg-gray-50 border border-gray-200 text-gray-700 hover:bg-gray-100 rounded-xl font-semibold transition-colors block text-center"
                    >
                        Kembali ke Login
                    </Link>
                </form>
            )}

            {/* Footer */}
            <div className="text-center pt-4 border-t border-gray-100 text-xs text-gray-400">
                © {new Date().getFullYear()} SIPP — PT Petrokimia Gresik. Hak Cipta Dilindungi.
            </div>
        </div>
    );
}

export default function ForgotPasswordPage() {
    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <Suspense fallback={
                <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border border-gray-100 flex flex-col items-center justify-center min-h-[300px]">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mb-4"></div>
                    <span className="text-gray-500 text-sm">Memuat halaman...</span>
                </div>
            }>
                <ForgotPasswordContent />
            </Suspense>
        </div>
    );
}
