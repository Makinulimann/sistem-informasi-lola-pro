'use client';

import { useState, useRef, useEffect, type FormEvent } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

/* ─── Icons ─── */

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

function UserIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
        </svg>
    );
}

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

function BadgeIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M7 7h10" /><path d="M7 12h10" /><path d="M7 17h6" />
        </svg>
    );
}



function CheckIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
        </svg>
    );
}

import { api, auth, ApiError } from '@/lib/api';
import { AppButton } from '@/components/ui/app-button';
import { AppInput } from '@/components/ui/app-input';

export default function RegisterPage() {
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [fullName, setFullName] = useState('');
    const [noInduk, setNoInduk] = useState('');
    const [email, setEmail] = useState('');

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [agree, setAgree] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        // Check if already logged in
        if (auth.isAuthenticated()) {
            router.replace('/dashboard');
            return;
        }
    }, []);

    /* ─── Password strength ─── */

    const getPasswordStrength = (pw: string): { level: number; label: string; color: string } => {
        if (pw.length === 0) return { level: 0, label: '', color: '' };
        let score = 0;
        if (pw.length >= 8) score++;
        if (/[A-Z]/.test(pw)) score++;
        if (/[0-9]/.test(pw)) score++;
        if (/[^A-Za-z0-9]/.test(pw)) score++;
        if (score <= 1) return { level: 1, label: 'Lemah', color: 'bg-red-400' };
        if (score === 2) return { level: 2, label: 'Sedang', color: 'bg-amber-400' };
        if (score === 3) return { level: 3, label: 'Kuat', color: 'bg-emerald-400' };
        return { level: 4, label: 'Sangat Kuat', color: 'bg-emerald-600' };
    };

    const strength = getPasswordStrength(password);

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setError('Password tidak cocok!');
            return;
        }
        setIsLoading(true);
        setError(null);
        setSuccess(null);

        try {
            await api.post('/auth/register', {
                fullName,
                noInduk,
                email,
                password,
                confirmPassword
            });

            setSuccess('Registrasi berhasil. Akun Anda sedang menunggu verifikasi Admin.');

            // Clear form
            setFullName('');
            setNoInduk('');
            setEmail('');
            setPassword('');
            setConfirmPassword('');

        } catch (err) {
            if (err instanceof ApiError) {
                setError(err.message);
            } else {
                setError('Terjadi kesalahan saat registrasi.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col lg:flex-row bg-gray-50">

            {/* ── Left Panel ── */}
            <div
                className="relative w-full lg:w-[50%] xl:w-[55%] min-h-[200px] lg:min-h-screen overflow-hidden"
            >
                <Image
                    src="/images/bg-petro.jpeg"
                    alt="PT Petrokimia Gresik"
                    fill
                    priority
                    className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                {/* Branding */}
                <div
                    className="absolute bottom-8 left-8 lg:bottom-12 lg:left-12 z-10"
                >
                    <div className="flex items-center gap-3 mb-3">
                        <h1 className="text-white text-2xl lg:text-3xl font-bold tracking-tight">SIPPro</h1>
                    </div>
                    <p className="text-white/70 text-sm lg:text-base max-w-xs leading-relaxed">
                        Sistem Informasi Pengelolaan Produk
                    </p>
                </div>
            </div>

            {/* ── Right Panel: Register Form ── */}
            <div
                className="flex-1 flex items-center justify-center px-6 py-8 lg:px-10 lg:py-0 overflow-y-auto"
            >
                <div className="w-full max-w-md space-y-6 py-8">

                    {/* Logos */}
                    <div className="flex items-center justify-center gap-4 flex-wrap">
                        <Image src="/images/danantara.png" alt="Danantara Indonesia" width={110} height={35} className="object-contain h-8 w-auto" />
                        <span className="hidden sm:block w-px h-7 bg-gray-200" />
                        <Image src="/images/logo-PG.png" alt="Petrokimia Gresik" width={110} height={35} className="object-contain h-8 w-auto" />
                        <span className="hidden sm:block w-px h-7 bg-gray-200" />
                        <Image src="/images/logo-pi.png" alt="Pupuk Indonesia" width={110} height={35} className="object-contain h-8 w-auto" />
                    </div>

                    {/* Heading */}
                    <div className="text-center">
                        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
                            Buat Akun Baru
                        </h2>
                        <p className="mt-1.5 text-sm text-gray-500">
                            Daftar untuk mulai menggunakan SIPPro
                        </p>
                    </div>

                    {error && (
                        <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm animate-in fade-in slide-in-from-top-2 duration-300 mb-4">
                            <div className="flex items-center gap-2">
                                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                {error}
                            </div>
                        </div>
                    )}

                    {success && (
                        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 text-sm animate-in fade-in slide-in-from-top-2 duration-300 mb-4">
                            <div className="flex items-center gap-2">
                                <CheckIcon />
                                {success}
                            </div>
                        </div>
                    )}

                    {/* Form */}
                    <form className="space-y-4" onSubmit={handleSubmit}>

                        {/* Full Name */}
                        <AppInput
                            id="fullName"
                            label="Nama Lengkap"
                            placeholder="Masukkan nama lengkap"
                            icon={<UserIcon />}
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            required
                        />

                        {/* No. Induk */}
                        <AppInput
                            id="noInduk"
                            label="No. Induk"
                            placeholder="No. Induk Karyawan"
                            icon={<BadgeIcon />}
                            value={noInduk}
                            onChange={(e) => setNoInduk(e.target.value)}
                            required
                        />

                        {/* Email */}
                        <AppInput
                            id="regEmail"
                            type="email"
                            label="Email"
                            placeholder="email@company.com"
                            icon={<MailIcon />}
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />

                        {/* Password */}
                        <div>
                            <AppInput
                                id="regPassword"
                                type={showPassword ? 'text' : 'password'}
                                label="Kata Sandi"
                                placeholder="Minimal 8 karakter"
                                icon={<LockIcon />}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={8}
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
                            {/* Strength indicator */}
                            {password.length > 0 && (
                                <div className="mt-2 space-y-1">
                                    <div className="flex gap-1">
                                        {[1, 2, 3, 4].map((i) => (
                                            <div
                                                key={i}
                                                className={`h-1 flex-1 rounded-full transition-colors duration-300 ${i <= strength.level ? strength.color : 'bg-gray-200'}`}
                                            />
                                        ))}
                                    </div>
                                    <p className={`text-xs ${strength.level <= 1 ? 'text-red-500' : strength.level === 2 ? 'text-amber-500' : 'text-emerald-600'}`}>
                                        {strength.label}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Confirm Password */}
                        <AppInput
                            id="confirmPassword"
                            type={showConfirmPassword ? 'text' : 'password'}
                            label="Konfirmasi Kata Sandi"
                            placeholder="Ketik ulang kata sandi"
                            icon={<LockIcon />}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            error={confirmPassword && confirmPassword !== password ? 'Kata sandi tidak cocok' : undefined}
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

                        {/* Terms */}
                        <label className="flex items-start gap-2.5 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={agree}
                                onChange={(e) => setAgree(e.target.checked)}
                                className="mt-0.5 w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500/30 transition-colors cursor-pointer"
                                required
                            />
                            <span className="text-sm text-gray-600 leading-snug">
                                Saya menyetujui{' '}
                                <Link href="#" className="text-emerald-600 font-medium hover:text-emerald-700 transition-colors">
                                    Syarat & Ketentuan
                                </Link>{' '}
                                serta{' '}
                                <Link href="#" className="text-emerald-600 font-medium hover:text-emerald-700 transition-colors">
                                    Kebijakan Privasi
                                </Link>
                            </span>
                        </label>

                        {/* Register Button */}
                        <AppButton
                            type="submit"
                            disabled={!agree}
                            loading={isLoading}
                            className="w-full py-3 shadow-emerald-500/25 hover:shadow-emerald-500/40"
                        >
                            Buat Akun
                        </AppButton>

                        {/* Login link */}
                        <p className="text-center text-sm text-gray-500">
                            Sudah punya akun?{' '}
                            <Link
                                href="/"
                                className="font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
                            >
                                Masuk
                            </Link>
                        </p>
                    </form>

                    {/* Footer */}
                    <div className="text-center pt-3 border-t border-gray-100">
                        <p className="text-xs text-gray-400">
                            © {new Date().getFullYear()} SIPPro — PT Petrokimia Gresik. Hak Cipta Dilindungi.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
