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

function PlusIcon() {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
    );
}

function TrashIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
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

/* ─── Mock Options ─── */

/* ─── Unit Families ─── */

const UNIT_FAMILIES: Record<string, string[]> = {
    Massa: ['Ton', 'Kg', 'Gram'],
    Volume: ['Liter', 'mL'],
    Panjang: ['Meter', 'cm', 'mm'],
    Lainnya: ['Pcs', 'Lusin', 'Karton', 'Drum', 'Sak', 'Zak', 'Box', 'Can']
};

const getUnitOptions = (baseUnit?: string) => {
    if (!baseUnit) return Object.values(UNIT_FAMILIES).flat();

    // Find which family the base unit belongs to (case-insensitive check)
    const entry = Object.entries(UNIT_FAMILIES).find(([_, units]) =>
        units.some(u => u.toLowerCase() === baseUnit.toLowerCase())
    );

    return entry ? entry[1] : Object.values(UNIT_FAMILIES).flat();
};

/* ─── Types ─── */

interface MaterialRow {
    id: string;
    name: string;
    quantum: string;
    satuan: string;
}

interface SuplaiModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: any) => void;
    productSlug: string;
    initialData?: any;
}

export function SuplaiModal({ isOpen, onClose, onSubmit, productSlug, initialData }: SuplaiModalProps) {
    const [date, setDate] = useState<Date | undefined>(undefined);
    const [bahanBakuList, setBahanBakuList] = useState<MaterialRow[]>([{ id: '1', name: '', quantum: '', satuan: 'Kg' }]);
    const [bahanPenolongList, setBahanPenolongList] = useState<MaterialRow[]>([{ id: '1', name: '', quantum: '', satuan: 'Pcs' }]);
    const [file, setFile] = useState<File | null>(null);
    const [keterangan, setKeterangan] = useState('');

    // Metadata state
    const [availableBaku, setAvailableBaku] = useState<ProductMaterial[]>([]);
    const [availablePenolong, setAvailablePenolong] = useState<ProductMaterial[]>([]);

    useEffect(() => {
        if (isOpen) {
            if (productSlug) {
                masterItemService.getProductMaterials(productSlug, 'Baku').then(setAvailableBaku);
                masterItemService.getProductMaterials(productSlug, 'Penolong').then(setAvailablePenolong);
            }

            if (initialData) {
                setDate(initialData.tanggal ? new Date(initialData.tanggal) : undefined);
                setKeterangan(initialData.keterangan || '');
                // Populate lists based on kind. Since existing data is single row per record, we populate accordingly.
                // However, the modal is designed for multiple items.
                // For editing single item (from table row), we might want to just show that item.
                if (initialData.jenis === 'Bahan Baku') {
                    setBahanBakuList([{ id: '1', name: initialData.namaBahan, quantum: initialData.kuantum.toString(), satuan: initialData.satuan || 'Kg' }]);
                    setBahanPenolongList([{ id: '1', name: '', quantum: '', satuan: 'Pcs' }]);
                } else if (initialData.jenis === 'Bahan Penolong') {
                    setBahanBakuList([{ id: '1', name: '', quantum: '', satuan: 'Kg' }]);
                    setBahanPenolongList([{ id: '1', name: initialData.namaBahan, quantum: initialData.kuantum.toString(), satuan: initialData.satuan || 'Pcs' }]);
                }
            } else {
                // Reset form
                setDate(undefined);
                setBahanBakuList([{ id: '1', name: '', quantum: '', satuan: 'Kg' }]);
                setBahanPenolongList([{ id: '1', name: '', quantum: '', satuan: 'Pcs' }]);
                setKeterangan('');
                setFile(null);
            }
        }
    }, [isOpen, productSlug, initialData]);

    if (!isOpen) return null;

    /* Handlers */

    const addBahanBaku = () => {
        setBahanBakuList([...bahanBakuList, { id: crypto.randomUUID(), name: '', quantum: '', satuan: 'Kg' }]);
    };

    const removeBahanBaku = (id: string) => {
        if (bahanBakuList.length > 1) {
            setBahanBakuList(bahanBakuList.filter((item) => item.id !== id));
        }
    };

    const updateBahanBaku = (id: string, field: keyof MaterialRow, value: string) => {
        setBahanBakuList(bahanBakuList.map((item) => {
            if (item.id === id) {
                const updated = { ...item, [field]: value };
                // If name changed, reset unit to default if possible, or keep existing if compatible?
                // For now just update. User will see updated options
                if (field === 'name') {
                    const mat = availableBaku.find(m => m.nama === value);
                    if (mat && mat.satuan) updated.satuan = mat.satuan;
                }
                return updated;
            }
            return item;
        }));
    };

    const addBahanPenolong = () => {
        setBahanPenolongList([...bahanPenolongList, { id: crypto.randomUUID(), name: '', quantum: '', satuan: 'Pcs' }]);
    };

    const removeBahanPenolong = (id: string) => {
        if (bahanPenolongList.length > 1) {
            setBahanPenolongList(bahanPenolongList.filter((item) => item.id !== id));
        }
    };

    const updateBahanPenolong = (id: string, field: keyof MaterialRow, value: string) => {
        setBahanPenolongList(bahanPenolongList.map((item) => {
            if (item.id === id) {
                const updated = { ...item, [field]: value };
                if (field === 'name') {
                    const mat = availablePenolong.find(m => m.nama === value);
                    if (mat && mat.satuan) updated.satuan = mat.satuan;
                }
                return updated;
            }
            return item;
        }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!date) {
            alert("Mohon pilih Tanggal Suplai terlebih dahulu.");
            return;
        }

        onSubmit({ date, bahanBakuList, bahanPenolongList, file, keterangan });
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            {/* Backdrop with blur */}
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className="relative w-full max-w-4xl bg-white rounded-xl shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
                    <h2 className="text-lg font-bold text-gray-800">Tambah Data Suplai</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-full transition-colors"
                    >
                        <XIcon />
                    </button>
                </div>

                {/* Scrollable Form Body */}
                <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                    <form id="suplai-form" onSubmit={handleSubmit} className="space-y-8">

                        {/* Tanggal */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Tanggal Suplai <span className="text-red-500">*</span>
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
                                        {date ? format(date, "PPP") : <span>Pilih tanggal</span>}
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

                        {/* Bahan Baku Section */}
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-sm font-bold text-gray-800">Bahan Baku</h3>
                            </div>
                            <div className="space-y-3">
                                {bahanBakuList.map((row) => {
                                    const selectedMaterial = availableBaku.find(m => m.nama === row.name);
                                    const unitOptions = getUnitOptions(selectedMaterial?.satuan);

                                    return (
                                        <div key={row.id} className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                                            <div className="flex-1 w-full">
                                                {availableBaku.length > 0 ? (
                                                    <select
                                                        value={row.name}
                                                        onChange={(e) => updateBahanBaku(row.id, 'name', e.target.value)}
                                                        className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                                                    >
                                                        <option value="" disabled>Pilih Bahan Baku</option>
                                                        {availableBaku.map((item) => (
                                                            <option key={item.id} value={item.nama}>{item.nama}</option>
                                                        ))}
                                                    </select>
                                                ) : (
                                                    <div className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 border-dashed rounded-lg text-sm text-gray-400 italic">
                                                        Belum ada bahan baku dikonfigurasi.
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex gap-3 w-full sm:w-auto">
                                                <div className="w-full sm:w-32">
                                                    <input
                                                        type="number"
                                                        placeholder="Kuantum"
                                                        value={row.quantum}
                                                        onChange={(e) => updateBahanBaku(row.id, 'quantum', e.target.value)}
                                                        className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                                                    />
                                                </div>
                                                <div className="w-full sm:w-28">
                                                    <select
                                                        value={row.satuan}
                                                        onChange={(e) => updateBahanBaku(row.id, 'satuan', e.target.value)}
                                                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all cursor-pointer"
                                                    >
                                                        {unitOptions.map((opt) => (
                                                            <option key={opt} value={opt}>{opt}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                            {bahanBakuList.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => removeBahanBaku(row.id)}
                                                    className="p-2.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                >
                                                    <TrashIcon />
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                            <button
                                type="button"
                                onClick={addBahanBaku}
                                className="mt-3 inline-flex items-center justify-center w-8 h-8 rounded-full bg-emerald-600 text-white hover:bg-emerald-700 transition-all shadow-sm hover:shadow-md"
                            >
                                <PlusIcon />
                            </button>
                        </div>

                        <div className="h-px bg-gray-100" />

                        {/* Bahan Penolong Section */}
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-sm font-bold text-gray-800">Bahan Penolong</h3>
                            </div>
                            <div className="space-y-3">
                                {bahanPenolongList.map((row) => {
                                    const selectedMaterial = availablePenolong.find(m => m.nama === row.name);
                                    const unitOptions = getUnitOptions(selectedMaterial?.satuan);

                                    return (
                                        <div key={row.id} className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                                            <div className="flex-1 w-full">
                                                {availablePenolong.length > 0 ? (
                                                    <select
                                                        value={row.name}
                                                        onChange={(e) => updateBahanPenolong(row.id, 'name', e.target.value)}
                                                        className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                                                    >
                                                        <option value="" disabled>Pilih Bahan Penolong</option>
                                                        {availablePenolong.map((item) => (
                                                            <option key={item.id} value={item.nama}>{item.nama}</option>
                                                        ))}
                                                    </select>
                                                ) : (
                                                    <div className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 border-dashed rounded-lg text-sm text-gray-400 italic">
                                                        Belum ada bahan penolong dikonfigurasi.
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex gap-3 w-full sm:w-auto">
                                                <div className="w-full sm:w-32">
                                                    <input
                                                        type="number"
                                                        placeholder="Kuantum"
                                                        value={row.quantum}
                                                        onChange={(e) => updateBahanPenolong(row.id, 'quantum', e.target.value)}
                                                        className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                                                    />
                                                </div>
                                                <div className="w-full sm:w-28">
                                                    <select
                                                        value={row.satuan}
                                                        onChange={(e) => updateBahanPenolong(row.id, 'satuan', e.target.value)}
                                                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all cursor-pointer"
                                                    >
                                                        {unitOptions.map((opt) => (
                                                            <option key={opt} value={opt}>{opt}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                            {bahanPenolongList.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => removeBahanPenolong(row.id)}
                                                    className="p-2.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                >
                                                    <TrashIcon />
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                            <button
                                type="button"
                                onClick={addBahanPenolong}
                                className="mt-3 inline-flex items-center justify-center w-8 h-8 rounded-full bg-emerald-600 text-white hover:bg-emerald-700 transition-all shadow-sm hover:shadow-md"
                            >
                                <PlusIcon />
                            </button>
                        </div>

                        <div className="h-px bg-gray-100" />

                        {/* Dokumen & Keterangan */}
                        <div className="grid grid-cols-1 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Dokumen <span className="text-gray-400 font-normal italic ml-1">(Optional)</span>
                                </label>
                                <div className="relative group">
                                    <input
                                        type="file"
                                        onChange={handleFileChange}
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

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
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
                        form="suplai-form"
                        className="px-6 py-2.5 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 focus:ring-4 focus:ring-emerald-600/20 transition-all shadow-sm hover:shadow-md active:scale-95"
                    >
                        Simpan Data
                    </button>
                </div>
            </div>
        </div>
    );
}
