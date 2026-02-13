'use client';

import { useState, useEffect } from 'react';
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { masterItemService, ProductMaterial } from "@/lib/masterItemService";

/* ─── Icons ─── */

function XIcon() {
    return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
    );
}

function CalendarIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
    );
}

function UploadIcon() {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
    );
}

/* ─── Options ─── */

const JENIS_OPTIONS = ['Bahan Baku', 'Bahan Penolong'];
const SATUAN_OPTIONS = ['Kg', 'Ton', 'Liter', 'Pcs', 'Zak', 'Box', 'Can'];

/* ─── Types ─── */

interface MutasiModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: any) => void;
    productSlug: string;
}

export function MutasiModal({ isOpen, onClose, onSubmit, productSlug }: MutasiModalProps) {
    const [date, setDate] = useState<Date | undefined>(undefined);
    const [jenis, setJenis] = useState('');
    const [namaBahan, setNamaBahan] = useState('');
    const [quantum, setQuantum] = useState('');
    const [satuan, setSatuan] = useState('Kg');
    const [file, setFile] = useState<File | null>(null);
    const [keterangan, setKeterangan] = useState('');

    // Metadata
    const [availableBaku, setAvailableBaku] = useState<ProductMaterial[]>([]);
    const [availablePenolong, setAvailablePenolong] = useState<ProductMaterial[]>([]);

    useEffect(() => {
        if (isOpen && productSlug) {
            masterItemService.getProductMaterials(productSlug, 'Baku').then(setAvailableBaku);
            masterItemService.getProductMaterials(productSlug, 'Penolong').then(setAvailablePenolong);
        }
    }, [isOpen, productSlug]);

    if (!isOpen) return null;

    const availableBahan = jenis === 'Bahan Baku' ? availableBaku :
        jenis === 'Bahan Penolong' ? availablePenolong : [];

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleJenisChange = (value: string) => {
        setJenis(value);
        setNamaBahan(''); // Reset nama bahan when jenis changes
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit({ date, jenis, namaBahan, quantum, satuan, file, keterangan });
        // Reset form
        setDate(undefined);
        setJenis('');
        setNamaBahan('');
        setQuantum('');
        setSatuan('Kg');
        setFile(null);
        setKeterangan('');
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
                    <h2 className="text-lg font-bold text-gray-800">Tambah Data Mutasi</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-full transition-colors"
                    >
                        <XIcon />
                    </button>
                </div>

                {/* Scrollable Form Body */}
                <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                    <form id="mutasi-form" onSubmit={handleSubmit} className="space-y-5">

                        {/* Tanggal */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                Tanggal <span className="text-red-500">*</span>
                            </label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant={"outline"}
                                        className={cn(
                                            "w-full justify-start text-left font-normal border-gray-300 h-11 hover:bg-white hover:text-gray-900",
                                            !date && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon />
                                        {date ? format(date, "dd/MM/yyyy") : <span>dd/mm/yyyy</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={date}
                                        onSelect={setDate}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>

                        {/* Jenis */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                Jenis <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={jenis}
                                onChange={(e) => handleJenisChange(e.target.value)}
                                required
                                className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all appearance-none cursor-pointer"
                            >
                                <option value="" disabled>Pilih</option>
                                <option value="Bahan Baku">Bahan Baku</option>
                                <option value="Bahan Penolong">Bahan Penolong</option>
                            </select>
                        </div>

                        {/* Nama Bahan */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                Nama Bahan <span className="text-red-500">*</span>
                            </label>
                            {availableBahan.length > 0 ? (
                                <select
                                    value={namaBahan}
                                    onChange={(e) => setNamaBahan(e.target.value)}
                                    required
                                    disabled={!jenis}
                                    className={cn(
                                        "w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all appearance-none cursor-pointer",
                                        !jenis && "bg-gray-50 text-gray-400 cursor-not-allowed"
                                    )}
                                >
                                    <option value="" disabled>Pilih</option>
                                    {availableBahan.map((item) => (
                                        <option key={item.id} value={item.nama}>{item.nama}</option>
                                    ))}
                                </select>
                            ) : (
                                <div className={cn(
                                    "w-full px-4 py-2.5 bg-gray-50 border border-gray-200 border-dashed rounded-lg text-sm text-gray-400 italic",
                                    !jenis && "bg-gray-50"
                                )}>
                                    {!jenis ? 'Pilih jenis terlebih dahulu' : 'Belum ada material dikonfigurasi'}
                                </div>
                            )}
                        </div>

                        {/* Kuantum + Satuan */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                Kuantum <span className="text-red-500">*</span>
                            </label>
                            <div className="flex gap-3">
                                <div className="flex-1">
                                    <input
                                        type="number"
                                        step="any"
                                        value={quantum}
                                        onChange={(e) => setQuantum(e.target.value)}
                                        required
                                        placeholder="Masukkan jumlah"
                                        className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                                    />
                                </div>
                                <div className="w-28">
                                    <select
                                        value={satuan}
                                        onChange={(e) => setSatuan(e.target.value)}
                                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all cursor-pointer"
                                    >
                                        {SATUAN_OPTIONS.map((opt) => (
                                            <option key={opt} value={opt}>{opt}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Dokumen */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                Dokumen <span className="text-red-500">*</span>
                            </label>
                            <div className="relative group">
                                <input
                                    type="file"
                                    onChange={handleFileChange}
                                    required
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                />
                                <div className="flex items-center px-4 py-2.5 bg-white border border-gray-300 rounded-lg hover:border-emerald-500 hover:ring-1 hover:ring-emerald-500 transition-all h-11">
                                    <span className="inline-flex items-center px-3 py-1 bg-gray-100 text-xs font-medium text-gray-600 rounded border border-gray-200 mr-3 group-hover:bg-emerald-50 group-hover:text-emerald-700 group-hover:border-emerald-200 transition-colors">
                                        Choose File
                                    </span>
                                    <span className="text-sm text-gray-500 truncate flex-1">
                                        {file ? file.name : 'No file chosen'}
                                    </span>
                                    <UploadIcon />
                                </div>
                            </div>
                        </div>

                        {/* Keterangan */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                Keterangan
                            </label>
                            <textarea
                                value={keterangan}
                                onChange={(e) => setKeterangan(e.target.value)}
                                rows={3}
                                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all resize-none"
                                placeholder="Tambahkan catatan jika diperlukan..."
                            />
                        </div>

                    </form>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3 shrink-0 rounded-b-xl">
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-all shadow-sm"
                    >
                        Batal
                    </button>
                    <button
                        type="submit"
                        form="mutasi-form"
                        className="px-6 py-2.5 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 focus:ring-4 focus:ring-emerald-600/20 transition-all shadow-sm hover:shadow-md active:scale-95"
                    >
                        Simpan Data
                    </button>
                </div>
            </div>
        </div>
    );
}
