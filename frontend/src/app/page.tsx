'use client';

import { useState, useRef, useEffect, type FormEvent } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import gsap from 'gsap';

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

import { api, auth, ApiError } from '@/lib/api'; // Added this via replacement logic

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Refs for GSAP
  const containerRef = useRef<HTMLDivElement>(null);
  const leftPanelRef = useRef<HTMLDivElement>(null);
  const rightPanelRef = useRef<HTMLDivElement>(null);
  const logosRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const brandingRef = useRef<HTMLDivElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check if already logged in
    if (auth.isAuthenticated()) {
      router.replace('/dashboard');
      return;
    }

    // Load saved email if exists
    const savedEmail = localStorage.getItem('sippro_saved_email');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      // Left panel slides in
      tl.fromTo(leftPanelRef.current,
        { x: -80, opacity: 0 },
        { x: 0, opacity: 1, duration: 1 }
      );

      // Branding text fades up
      tl.fromTo(brandingRef.current,
        { y: 40, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8 },
        '-=0.4'
      );

      // Right panel fades in
      tl.fromTo(rightPanelRef.current,
        { x: 60, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.8 },
        '-=0.6'
      );

      // Logos stagger in
      if (logosRef.current) {
        tl.fromTo(logosRef.current.children,
          { y: -20, opacity: 0, scale: 0.9 },
          { y: 0, opacity: 1, scale: 1, duration: 0.5, stagger: 0.12 },
          '-=0.4'
        );
      }

      // Heading
      tl.fromTo(headingRef.current,
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5 },
        '-=0.3'
      );

      // Form fields stagger in
      if (formRef.current) {
        tl.fromTo(formRef.current.children,
          { y: 25, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.4, stagger: 0.08 },
          '-=0.2'
        );
      }
    }, containerRef);

    return () => ctx.revert();
  }, []);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const res = await api.post<{ accessToken: string; user: any }>('/auth/login', {
        email,
        password,
        rememberMe
      });

      // Save or remove email from localStorage based on Remember Me
      if (rememberMe) {
        localStorage.setItem('sippro_saved_email', email);
      } else {
        localStorage.removeItem('sippro_saved_email');
      }

      auth.setToken(res.accessToken, rememberMe);
      router.push('/dashboard');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Terjadi kesalahan saat login.');
      }

      // Shake animation for error
      if (formRef.current) {
        gsap.fromTo(formRef.current,
          { x: -5 },
          {
            x: 5, duration: 0.1, repeat: 3, yoyo: true, ease: 'power1.inOut', onComplete: () => {
              gsap.to(formRef.current, { x: 0, duration: 0.1 });
            }
          }
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div ref={containerRef} className="min-h-screen flex flex-col lg:flex-row bg-gray-50">

      {/* ── Left Panel: Background Image ── */}
      <div
        ref={leftPanelRef}
        className="relative w-full lg:w-[55%] xl:w-[60%] min-h-[240px] lg:min-h-screen overflow-hidden"
        style={{ opacity: 0 }}
      >
        <Image
          src="/images/bg-petro.jpeg"
          alt="PT Petrokimia Gresik"
          fill
          priority
          className="object-cover"
        />
        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-gray-50/10 to-transparent hidden lg:block" />

        {/* Branding */}
        <div
          ref={brandingRef}
          className="absolute bottom-8 left-8 lg:bottom-12 lg:left-12 z-10"
          style={{ opacity: 0 }}
        >
          <div className="flex items-center gap-3 mb-3">
            <div>
              <h1 className="text-white text-2xl lg:text-3xl font-bold tracking-tight">
                SIPPro
              </h1>
            </div>
          </div>
          <p className="text-white/70 text-sm lg:text-base max-w-xs leading-relaxed">
            Sistem Informasi Pengelolaan Produk
          </p>
          <div className="mt-4 flex items-center gap-2">
            <span className="inline-block w-8 h-0.5 bg-emerald-400/60 rounded-full" />
            <span className="text-white/50 text-xs">PT Petrokimia Gresik</span>
          </div>
        </div>
      </div>

      {/* ── Right Panel: Login Form ── */}
      <div
        ref={rightPanelRef}
        className="flex-1 flex items-center justify-center px-6 py-10 lg:px-12 lg:py-0"
        style={{ opacity: 0 }}
      >
        <div className="w-full max-w-md space-y-8">

          {/* Logos */}
          <div ref={logosRef} className="flex items-center justify-center gap-4 flex-wrap">
            <Image
              src="/images/danantara.png"
              alt="Danantara Indonesia"
              width={120}
              height={38}
              className="object-contain h-9 w-auto"
            />
            <span className="hidden sm:block w-px h-8 bg-gray-200" />
            <Image
              src="/images/logo-PG.png"
              alt="Petrokimia Gresik"
              width={120}
              height={38}
              className="object-contain h-9 w-auto"
            />
            <span className="hidden sm:block w-px h-8 bg-gray-200" />
            <Image
              src="/images/logo-pi.png"
              alt="Pupuk Indonesia"
              width={120}
              height={38}
              className="object-contain h-9 w-auto"
            />
          </div>

          {/* Heading */}
          <div className="text-center">
            <h2 ref={headingRef} className="text-2xl font-bold text-gray-900 tracking-tight" style={{ opacity: 0 }}>
              Masuk ke Akun Anda
            </h2>
            <p className="mt-2 text-sm text-gray-500">
              Masuk untuk mengelola data produk Anda
            </p>
          </div>

          {error && (
            <div ref={errorRef} className="p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                {error}
              </div>
            </div>
          )}

          {/* Form */}
          <form ref={formRef} className="space-y-5" onSubmit={handleSubmit}>
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                Email / Nomor Induk
              </label>
              <div className="relative group">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors group-focus-within:text-emerald-500">
                  <MailIcon />
                </span>
                <input
                  id="email"
                  type="text"
                  className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all shadow-sm hover:border-gray-300"
                  placeholder="Masukkan email atau no. induk"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="username"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                Kata Sandi
              </label>
              <div className="relative group">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors group-focus-within:text-emerald-500">
                  <LockIcon />
                </span>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className="w-full pl-11 pr-12 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all shadow-sm hover:border-gray-300"
                  placeholder="Masukkan kata sandi"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-0.5"
                  onClick={() => setShowPassword(prev => !prev)}
                  aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                >
                  {showPassword ? <EyeOpenIcon /> : <EyeClosedIcon />}
                </button>
              </div>
            </div>

            {/* Remember + Forgot */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500/30 transition-colors cursor-pointer"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span className="text-sm text-gray-600">Ingat Saya</span>
              </label>
              <Link
                href="/forgot-password"
                className="text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
              >
                Lupa Kata Sandi?
              </Link>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="relative w-full py-3 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-semibold rounded-xl hover:from-emerald-700 hover:to-emerald-600 focus:ring-4 focus:ring-emerald-600/20 transition-all shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed overflow-hidden"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Sedang Masuk...
                </span>
              ) : (
                'Masuk'
              )}
            </button>

            {/* Register Link */}
            <p className="text-center text-sm text-gray-500">
              Belum punya akun?{' '}
              <Link
                href="/register"
                className="font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
              >
                Daftar di sini
              </Link>
            </p>
          </form>

          {/* Footer */}
          <div className="text-center pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-400">
              © {new Date().getFullYear()} SIPPro — PT Petrokimia Gresik. Hak Cipta Dilindungi.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
