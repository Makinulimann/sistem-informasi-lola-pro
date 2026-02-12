'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import {
    CheckCircle2,
    XCircle,
    MoreHorizontal,
    Shield,
    User,
    ShieldAlert
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface UserDto {
    id: string;
    fullName: string;
    email: string;
    noInduk: string;
    role: string;
    isVerified: boolean;
    createdAt: string;
}

export default function UsersPage() {
    const [users, setUsers] = useState<UserDto[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchUsers = async () => {
        try {
            setIsLoading(true);
            const data = await api.get<UserDto[]>('/users');
            setUsers(data);
        } catch (err: any) {
            setError(err.message || 'Gagal mengambil data pengguna');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleVerify = async (id: string) => {
        try {
            await api.post(`/users/${id}/verify`, {});
            // Optimistic update
            setUsers(users.map(u => u.id === id ? { ...u, isVerified: true } : u));
        } catch (err: any) {
            alert('Gagal memverifikasi pengguna: ' + err.message);
        }
    };

    const handleRoleUpdate = async (id: string, newRole: string) => {
        try {
            await api.put(`/users/${id}/role`, { role: newRole });
            // Optimistic update
            setUsers(users.map(u => u.id === id ? { ...u, role: newRole } : u));
        } catch (err: any) {
            alert('Gagal memperbarui peran: ' + err.message);
        }
    };

    if (isLoading) {
        return (
            <div className="flex bg-gray-50 items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6 bg-red-50 text-red-600 rounded-lg">
                Error: {error}
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Manajemen Pengguna</h1>
                    <p className="text-gray-500 mt-1">Kelola pengguna, peran, dan status verifikasi.</p>
                </div>
                <div className="bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm text-sm text-gray-600">
                    Total Pengguna: <span className="font-semibold text-emerald-600">{users.length}</span>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50/50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-4 font-semibold text-gray-700">Info Pengguna</th>
                                <th className="px-6 py-4 font-semibold text-gray-700">Status</th>
                                <th className="px-6 py-4 font-semibold text-gray-700">Peran</th>
                                <th className="px-6 py-4 font-semibold text-gray-700 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {users.map((user) => (
                                <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-semibold text-sm">
                                                {user.fullName.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-900">{user.fullName}</p>
                                                <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                                                    <span>{user.email}</span>
                                                    <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                                                    <span>{user.noInduk}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {user.isVerified ? (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                                Terverifikasi
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-100">
                                                <ShieldAlert className="w-3.5 h-3.5" />
                                                Menunggu
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border
                                            ${user.role === 'Admin'
                                                ? 'bg-purple-50 text-purple-700 border-purple-100'
                                                : user.role === 'None'
                                                    ? 'bg-gray-100 text-gray-600 border-gray-200'
                                                    : 'bg-blue-50 text-blue-700 border-blue-100'
                                            }`}>
                                            {user.role === 'Admin' ? <Shield className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                                            {user.role === 'None' ? '-' : user.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger className="outline-none">
                                                <div className="p-2 hover:bg-gray-100 rounded-md transition-colors text-gray-400 hover:text-gray-600 cursor-pointer">
                                                    <MoreHorizontal className="w-4 h-4" />
                                                </div>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-56">
                                                <DropdownMenuLabel>Kelola Pengguna</DropdownMenuLabel>
                                                <DropdownMenuSeparator />
                                                {!user.isVerified && (
                                                    <DropdownMenuItem onClick={() => handleVerify(user.id)} className="text-emerald-600 focus:text-emerald-700 focus:bg-emerald-50 cursor-pointer">
                                                        <CheckCircle2 className="mr-2 h-4 w-4" />
                                                        Verifikasi Pengguna
                                                    </DropdownMenuItem>
                                                )}

                                                <DropdownMenuLabel className="text-xs font-normal text-gray-500 mt-2">Atur Peran</DropdownMenuLabel>
                                                {['Admin', 'VP', 'KPP', 'KP', 'KNP'].map((role) => (
                                                    <DropdownMenuItem
                                                        key={role}
                                                        onClick={() => handleRoleUpdate(user.id, role)}
                                                        className={`cursor-pointer ${user.role === role ? 'bg-gray-50 font-medium' : ''}`}
                                                    >
                                                        <Shield className="mr-2 h-3 w-3 opacity-70" />
                                                        {role}
                                                    </DropdownMenuItem>
                                                ))}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
