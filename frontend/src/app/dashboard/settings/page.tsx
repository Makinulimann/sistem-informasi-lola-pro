'use client';

import { useState, useEffect, useRef } from 'react';
import { Settings, User, Mail, Lock, Shield, Camera, Info, Save, Key } from 'lucide-react';
import { useToast } from '@/components/ui/toast';
import { AppInput } from '@/components/ui/app-input';
import { AppButton } from '@/components/ui/app-button';
import { api } from '@/lib/api';

interface UserProfile {
    id: string;
    email: string;
    fullName: string;
    noInduk: string;
    role: string;
    photoUrl: string | null;
}

export default function SettingsPage() {
    const { success, error, warning } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Profile States
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [photoUrl, setPhotoUrl] = useState<string | null>(null);
    
    // UI States
    const [loadingData, setLoadingData] = useState(true);
    const [updatingProfile, setUpdatingProfile] = useState(false);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [updatingPassword, setUpdatingPassword] = useState(false);

    // Password States
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // Load user data on mount
    const fetchProfile = async () => {
        try {
            setLoadingData(true);
            const data = await api.get<UserProfile>('/users/profile');
            setProfile(data);
            setFullName(data.fullName);
            setEmail(data.email);
            setPhotoUrl(data.photoUrl);
        } catch (err: any) {
            error('Gagal Memuat Profil', err.message || 'Terjadi kesalahan saat memuat data profil.');
        } finally {
            setLoadingData(false);
        }
    };

    useEffect(() => {
        fetchProfile();
    }, []);

    // Handle profile update submit
    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!fullName.trim() || !email.trim()) {
            warning('Input Tidak Valid', 'Nama Lengkap dan Email tidak boleh kosong.');
            return;
        }

        try {
            setUpdatingProfile(true);
            await api.put('/users/profile', {
                fullName,
                email,
                photoUrl
            });
            success('Profil Diperbarui', 'Informasi profil Anda berhasil diperbarui.');
            
            // Refresh sidebar/header state by triggering custom event or reloading page data
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new Event('profile-updated'));
            }
        } catch (err: any) {
            error('Gagal Memperbarui Profil', err.message || 'Terjadi kesalahan saat menyimpan perubahan.');
        } finally {
            setUpdatingProfile(false);
        }
    };

    // Handle Profile Picture Click & Selection
    const triggerFileSelect = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // 1. Size Validation: Max 5MB
        const MAX_SIZE = 5 * 1024 * 1024; // 5 Megabytes
        if (file.size > MAX_SIZE) {
            warning('Batas Ukuran File', 'Ukuran foto profil tidak boleh melebihi 5MB.');
            // Clear input
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        // 2. MIME Type Validation
        if (!file.type.startsWith('image/')) {
            warning('Format Tidak Valid', 'File harus berupa gambar (JPG, PNG, WEBP).');
            return;
        }

        try {
            setUploadingPhoto(true);
            
            // Create form data
            const formData = new FormData();
            formData.append('file', file);

            // Upload image to ImageKit via server-side endpoint
            const res = await fetch('/api/users/profile/upload', {
                method: 'POST',
                body: formData
            });

            const result = await res.json();

            if (!res.ok) {
                throw new Error(result.message || 'Gagal mengunggah foto.');
            }

            // Set new photo URL
            const uploadedUrl = result.url;
            setPhotoUrl(uploadedUrl);

            // Immediately save to user database so it doesn't get lost
            await api.put('/users/profile', {
                fullName: fullName || profile?.fullName,
                email: email || profile?.email,
                photoUrl: uploadedUrl
            });

            success('Foto Profil Diperbarui', 'Foto profil baru Anda berhasil diunggah.');
            
            // Refresh sidebar/header state
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new Event('profile-updated'));
            }

        } catch (err: any) {
            error('Unggah Gagal', err.message || 'Gagal mengunggah foto profil.');
        } finally {
            setUploadingPhoto(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    // Handle password update submit
    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!oldPassword || !newPassword || !confirmPassword) {
            warning('Input Kosong', 'Semua kolom kata sandi wajib diisi.');
            return;
        }

        if (newPassword.length < 8) {
            warning('Kata Sandi Lemah', 'Kata sandi baru minimal harus 8 karakter.');
            return;
        }

        if (newPassword !== confirmPassword) {
            warning('Tidak Cocok', 'Konfirmasi kata sandi baru tidak sesuai.');
            return;
        }

        try {
            setUpdatingPassword(true);
            await api.patch('/users/profile', {
                oldPassword,
                newPassword
            });

            success('Kata Sandi Diperbarui', 'Kata sandi Anda berhasil diperbarui.');
            
            // Reset fields
            setOldPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err: any) {
            error('Gagal Mengubah Sandi', err.message || 'Kata sandi lama salah atau terjadi kesalahan.');
        } finally {
            setUpdatingPassword(false);
        }
    };

    if (loadingData) {
        return (
            <div className="flex-1 space-y-8 p-4 md:p-8 flex items-center justify-center min-h-[400px]">
                <div className="flex flex-col items-center gap-3">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600" />
                    <p className="text-sm text-gray-500 font-medium">Memuat pengaturan akun...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 space-y-8 p-4 md:p-8 animate-in fade-in zoom-in-95 duration-300">
            {/* Header */}
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
                    Pengaturan Akun
                </h1>
                <p className="text-gray-500 mt-2 text-base">
                    Kelola preferensi keamanan, data diri, dan foto profil Anda.
                </p>
            </div>

            {/* Main content grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Left column: Avatar Uploader */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white rounded-2xl border border-gray-150 shadow-sm p-6 flex flex-col items-center text-center">
                        <h2 className="text-sm font-semibold text-gray-800 self-start mb-4 uppercase tracking-wider">
                            Foto Profil
                        </h2>

                        <div className="relative group cursor-pointer mb-5" onClick={triggerFileSelect}>
                            {/* Avatar Container */}
                            <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-100 border-4 border-white shadow-md ring-2 ring-emerald-500/20 flex items-center justify-center relative">
                                {uploadingPhoto ? (
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-10">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
                                    </div>
                                ) : null}

                                {photoUrl ? (
                                    <img 
                                        src={photoUrl} 
                                        alt="Foto Profil" 
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-3xl font-bold">
                                        {profile?.fullName.charAt(0) || 'U'}
                                    </div>
                                )}
                            </div>

                            {/* Camera Hover overlay */}
                            <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                <Camera className="w-6 h-6 text-white" />
                            </div>
                        </div>

                        {/* File input (hidden) */}
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            accept="image/*" 
                            className="hidden" 
                            onChange={handleFileChange}
                        />

                        <AppButton 
                            variant="secondary" 
                            size="sm" 
                            onClick={triggerFileSelect} 
                            loading={uploadingPhoto}
                            className="rounded-xl"
                        >
                            <Camera className="w-4 h-4 mr-1.5" />
                            Ganti Foto
                        </AppButton>

                        {/* Helper info */}
                        <div className="mt-6 flex items-start gap-2 bg-emerald-50/50 p-3 rounded-xl border border-emerald-100/50 text-left">
                            <Info className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                            <p className="text-[11px] text-emerald-800 leading-normal">
                                Unggah foto profil dalam format JPG, PNG, atau WEBP. Batas ukuran file maksimum adalah <strong>5MB</strong>. Gambar akan disimpan secara aman di ImageKit CDN.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Right column: Settings Form */}
                <div className="lg:col-span-2 space-y-6">
                    
                    {/* Card 1: Profil Info */}
                    <div className="bg-white rounded-2xl border border-gray-150 shadow-sm p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100">
                                <User className="w-4.5 h-4.5" />
                            </div>
                            <div>
                                <h2 className="text-base font-semibold text-gray-900">Informasi Pribadi</h2>
                                <p className="text-xs text-gray-400">Sesuaikan info dasar akun Anda</p>
                            </div>
                        </div>

                        <form onSubmit={handleUpdateProfile} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <AppInput 
                                    id="fullName"
                                    label="Nama Lengkap"
                                    placeholder="Nama Lengkap Anda"
                                    icon={<User className="w-4.5 h-4.5" />}
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    required
                                />

                                <AppInput 
                                    id="email"
                                    type="email"
                                    label="Alamat Email"
                                    placeholder="email@company.com"
                                    icon={<Mail className="w-4.5 h-4.5" />}
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <AppInput 
                                    id="noInduk"
                                    label="Nomor Induk Karyawan"
                                    value={profile?.noInduk || ''}
                                    icon={<Shield className="w-4.5 h-4.5" />}
                                    disabled
                                    className="bg-gray-50 border-gray-200 cursor-not-allowed text-gray-500 font-medium"
                                />

                                <AppInput 
                                    id="role"
                                    label="Hak Akses / Role"
                                    value={profile?.role || ''}
                                    icon={<Shield className="w-4.5 h-4.5" />}
                                    disabled
                                    className="bg-gray-50 border-gray-200 cursor-not-allowed text-gray-500 font-medium"
                                />
                            </div>

                            <div className="flex justify-end pt-3 border-t border-gray-50">
                                <AppButton 
                                    type="submit" 
                                    loading={updatingProfile}
                                    className="rounded-xl shadow-sm hover:shadow"
                                >
                                    <Save className="w-4 h-4 mr-1.5" />
                                    Simpan Profil
                                </AppButton>
                            </div>
                        </form>
                    </div>

                    {/* Card 2: Password Update */}
                    <div className="bg-white rounded-2xl border border-gray-150 shadow-sm p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100">
                                <Key className="w-4.5 h-4.5" />
                            </div>
                            <div>
                                <h2 className="text-base font-semibold text-gray-900">Ubah Kata Sandi</h2>
                                <p className="text-xs text-gray-400">Perbarui kata sandi untuk keamanan berkala</p>
                            </div>
                        </div>

                        <form onSubmit={handleUpdatePassword} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <AppInput 
                                    id="oldPassword"
                                    type="password"
                                    label="Kata Sandi Lama"
                                    placeholder="••••••••"
                                    icon={<Lock className="w-4.5 h-4.5" />}
                                    value={oldPassword}
                                    onChange={(e) => setOldPassword(e.target.value)}
                                    required
                                />

                                <AppInput 
                                    id="newPassword"
                                    type="password"
                                    label="Kata Sandi Baru"
                                    placeholder="••••••••"
                                    icon={<Lock className="w-4.5 h-4.5" />}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    required
                                />

                                <AppInput 
                                    id="confirmPassword"
                                    type="password"
                                    label="Konfirmasi Sandi Baru"
                                    placeholder="••••••••"
                                    icon={<Lock className="w-4.5 h-4.5" />}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="flex justify-end pt-3 border-t border-gray-50">
                                <AppButton 
                                    type="submit" 
                                    loading={updatingPassword}
                                    className="rounded-xl shadow-sm hover:shadow"
                                >
                                    <Save className="w-4 h-4 mr-1.5" />
                                    Perbarui Sandi
                                </AppButton>
                            </div>
                        </form>
                    </div>

                </div>

            </div>
        </div>
    );
}
