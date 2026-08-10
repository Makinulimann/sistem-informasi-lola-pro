'use client';

import React, { useState, useMemo } from 'react';
import {
    X,
    MoreVertical,
    Clock,
    ChevronRight,
    ChevronDown,
    Edit2,
    Trash2,
    RotateCcw,
    Check,
    Tag,
    Bookmark
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AppButton } from '@/components/ui/app-button';
import { AppModal } from '@/components/ui/app-modal';
import { type ReportVersionDraft } from '@/lib/reportDraftService';

interface VersionHistoryDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    versions: ReportVersionDraft[];
    activeVersionId: string | null;
    onRestoreVersion: (version: ReportVersionDraft) => void;
    onRenameVersion: (id: string, newName: string) => void;
    onDeleteVersion: (id: string) => void;
    userName: string;
}

export function VersionHistoryDrawer({
    isOpen,
    onClose,
    versions,
    activeVersionId,
    onRestoreVersion,
    onRenameVersion,
    onDeleteVersion,
    userName
}: VersionHistoryDrawerProps) {
    const [filterType, setFilterType] = useState<'all' | 'named'>('all');
    
    // Modal states for Rename & Delete confirm
    const [renamingVersion, setRenamingVersion] = useState<ReportVersionDraft | null>(null);
    const [renameInput, setRenameInput] = useState('');
    const [deletingVersion, setDeletingVersion] = useState<ReportVersionDraft | null>(null);

    // Group versions by Month (e.g. "Agustus 2026", "Juli 2026"...)
    const groupedVersions = useMemo(() => {
        const filtered = versions.filter(v => filterType === 'all' || v.isNamed);

        const groups: { monthLabel: string; items: ReportVersionDraft[] }[] = [];
        const map = new Map<string, ReportVersionDraft[]>();

        filtered.forEach(item => {
            const d = new Date(item.createdAt);
            const monthLabel = d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
            if (!map.has(monthLabel)) {
                map.set(monthLabel, []);
                groups.push({ monthLabel, items: map.get(monthLabel)! });
            }
            map.get(monthLabel)!.push(item);
        });

        return groups;
    }, [versions, filterType]);

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop for mobile */}
            <div 
                className="fixed inset-0 bg-black/20 backdrop-blur-xs z-40 lg:hidden"
                onClick={onClose}
            />

            {/* Google Docs Style Side Panel */}
            <div className="fixed top-0 right-0 z-40 h-screen w-80 sm:w-96 bg-slate-50 border-l border-slate-200 shadow-2xl flex flex-col transition-all duration-300 animate-in slide-in-from-right">
                
                {/* Panel Header */}
                <div className="p-4 border-b border-slate-200 bg-white flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Clock className="w-5 h-5 text-slate-700" />
                        <h2 className="text-lg font-bold text-slate-900">Histori versi</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Filter Dropdown */}
                <div className="p-4 border-b border-slate-200 bg-white">
                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value as 'all' | 'named')}
                        className="w-full bg-slate-50 border border-slate-300 text-sm font-medium text-slate-700 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all cursor-pointer"
                    >
                        <option value="all">Semua versi</option>
                        <option value="named">Versi bernama</option>
                    </select>
                </div>

                {/* Version List Scrollable Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                    {groupedVersions.length === 0 ? (
                        <div className="py-16 text-center text-slate-400 space-y-2">
                            <Clock className="w-10 h-10 mx-auto stroke-1 text-slate-300" />
                            <p className="text-sm font-medium">Belum ada versi draft tersimpan</p>
                            <p className="text-xs text-slate-400">Klik "Simpan Draft" pada toolbar untuk menyimpan versi baru.</p>
                        </div>
                    ) : (
                        groupedVersions.map(group => (
                            <div key={group.monthLabel} className="space-y-3">
                                {/* Month Header */}
                                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">
                                    {group.monthLabel}
                                </h3>

                                {/* Version Items */}
                                <div className="space-y-2">
                                    {group.items.map(item => {
                                        const isCurrentActive = item.id === activeVersionId;
                                        const dateObj = new Date(item.createdAt);
                                        const formattedTime = dateObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace(':', '.');
                                        const formattedDate = dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'long' });

                                        return (
                                            <div
                                                key={item.id}
                                                className={`group relative p-3.5 rounded-xl border transition-all duration-150 ${
                                                    isCurrentActive
                                                        ? 'bg-white border-emerald-500 ring-2 ring-emerald-500/20 shadow-sm'
                                                        : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-xs'
                                                }`}
                                            >
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="flex-1 min-w-0">
                                                        {/* Version Title */}
                                                        <div className="flex items-center gap-2">
                                                            <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                                                            <span className="font-bold text-sm text-slate-900 truncate">
                                                                {item.name}
                                                            </span>
                                                        </div>

                                                        {/* Badge "Versi sekarang" if active */}
                                                        {isCurrentActive && (
                                                            <div className="mt-1 ml-6 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                                                <Check className="w-3 h-3" />
                                                                <span>Versi sekarang</span>
                                                            </div>
                                                        )}

                                                        {/* Author Info */}
                                                        <div className="mt-2 ml-6 flex items-center gap-1.5 text-xs text-slate-500">
                                                            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                                                            <span className="truncate">{item.createdBy || userName || 'User'}</span>
                                                        </div>
                                                    </div>

                                                    {/* Kebab Dropdown Menu */}
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <button
                                                                className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 outline-none transition-colors"
                                                                title="Opsi versi"
                                                            >
                                                                <MoreVertical className="w-4 h-4" />
                                                            </button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="w-44">
                                                            <DropdownMenuItem
                                                                onClick={() => onRestoreVersion(item)}
                                                                className="cursor-pointer text-slate-700 font-medium"
                                                            >
                                                                <RotateCcw className="w-4 h-4 mr-2 text-emerald-600" />
                                                                <span>Terapkan versi ini</span>
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                onClick={() => {
                                                                    setRenamingVersion(item);
                                                                    setRenameInput(item.name);
                                                                }}
                                                                className="cursor-pointer text-slate-700 font-medium"
                                                            >
                                                                <Edit2 className="w-4 h-4 mr-2 text-blue-600" />
                                                                <span>Ubah nama</span>
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem
                                                                onClick={() => setDeletingVersion(item)}
                                                                className="cursor-pointer text-red-600 font-medium focus:text-red-600 focus:bg-red-50"
                                                            >
                                                                <Trash2 className="w-4 h-4 mr-2" />
                                                                <span>Hapus versi</span>
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Modal Edit Nama Versi */}
            {renamingVersion && (
                <AppModal
                    isOpen={!!renamingVersion}
                    onClose={() => setRenamingVersion(null)}
                    title="Ubah Nama Versi"
                    footer={
                        <>
                            <AppButton variant="secondary" onClick={() => setRenamingVersion(null)}>
                                Batal
                            </AppButton>
                            <AppButton
                                variant="primary"
                                onClick={() => {
                                    if (renameInput.trim()) {
                                        onRenameVersion(renamingVersion.id, renameInput.trim());
                                        setRenamingVersion(null);
                                    }
                                }}
                            >
                                Simpan
                            </AppButton>
                        </>
                    }
                >
                    <div className="space-y-3">
                        <label className="text-sm font-medium text-slate-700">Nama Versi</label>
                        <input
                            type="text"
                            value={renameInput}
                            onChange={(e) => setRenameInput(e.target.value)}
                            placeholder="Contoh: Draft Final RKO Agustus"
                            className="w-full h-10 border border-slate-300 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                            autoFocus
                        />
                    </div>
                </AppModal>
            )}

            {/* Modal Konfirmasi Hapus Versi */}
            {deletingVersion && (
                <AppModal
                    isOpen={!!deletingVersion}
                    onClose={() => setDeletingVersion(null)}
                    title="Hapus Versi Draft"
                    footer={
                        <>
                            <AppButton variant="secondary" onClick={() => setDeletingVersion(null)}>
                                Batal
                            </AppButton>
                            <AppButton
                                variant="danger"
                                onClick={() => {
                                    onDeleteVersion(deletingVersion.id);
                                    setDeletingVersion(null);
                                }}
                            >
                                Ya, Hapus Versi
                            </AppButton>
                        </>
                    }
                >
                    <p className="text-sm text-slate-600">
                        Apakah Anda yakin ingin menghapus versi draft <span className="font-bold text-slate-800">"{deletingVersion.name}"</span>? Tindakan ini tidak dapat dibatalkan.
                    </p>
                </AppModal>
            )}
        </>
    );
}

/* Modal Simpan Draft Versi Baru */
interface SaveDraftModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (customName?: string) => void;
}

export function SaveDraftModal({ isOpen, onClose, onSave }: SaveDraftModalProps) {
    const [draftName, setDraftName] = useState('');

    if (!isOpen) return null;

    return (
        <AppModal
            isOpen={isOpen}
            onClose={onClose}
            title="Simpan Draft Laporan"
            footer={
                <>
                    <AppButton variant="secondary" onClick={onClose}>
                        Batal
                    </AppButton>
                    <AppButton
                        variant="primary"
                        onClick={() => {
                            onSave(draftName.trim() || undefined);
                            setDraftName('');
                            onClose();
                        }}
                    >
                        Simpan Versi
                    </AppButton>
                </>
            }
        >
            <div className="space-y-4">
                <p className="text-sm text-slate-600">
                    Simpan kondisi form dan isi laporan saat ini ke dalam histori versi.
                </p>
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Nama Versi (Opsional)</label>
                    <input
                        type="text"
                        value={draftName}
                        onChange={(e) => setDraftName(e.target.value)}
                        placeholder="Contoh: Revisi RKO Agustus (Biarkan kosong untuk default)"
                        className="w-full h-10 border border-slate-300 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                        autoFocus
                    />
                </div>
            </div>
        </AppModal>
    );
}
