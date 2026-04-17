'use client';

import { useState, useEffect } from 'react';
import { AppModal } from '@/components/ui/app-modal';
import { AppButton } from '@/components/ui/app-button';
import { masterItemService, ProductMaterial } from '@/lib/masterItemService';
import { CalendarIcon, UploadIcon } from 'lucide-react';

/* ─── Unit Families ─── */

const UNIT_FAMILIES: Record<string, string[]> = {
    Massa: ['Ton', 'Kg', 'Gram'],
    Volume: ['Liter', 'mL'],
    Panjang: ['Meter', 'cm', 'mm'],
    Lainnya: ['Pcs', 'Lusin', 'Karton', 'Drum', 'Sak', 'Zak', 'Box', 'Can']
};

const getUnitOptions = (baseUnit?: string) => {
    if (!baseUnit) return Object.values(UNIT_FAMILIES).flat();
    const entry = Object.entries(UNIT_FAMILIES).find(([_, units]) =>
        units.some(u => u.toLowerCase() === baseUnit.toLowerCase())
    );
    return entry ? entry[1] : Object.values(UNIT_FAMILIES).flat();
};

/* ─── Types ─── */

interface MutasiModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: any) => void;
    productSlug: string;
    initialData?: any;
}

/* ─── Field Label ─── */

function Label({ children, required, optional }: { children: React.ReactNode; required?: boolean; optional?: boolean }) {
    return (
        <label className="block text-base font-semibold text-gray-800 mb-1.5">
            {children}
            {required && <span className="text-red-500 ml-0.5">*</span>}
            {optional && <span className="text-gray-400 font-normal italic ml-1">(Optional)</span>}
        </label>
    );
}

/* ─── Shared input classes ─── */
const inputCls = 'w-full px-4 py-2.5 bg-white border border-gray-200 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all';
const selectCls = inputCls + ' appearance-none cursor-pointer';

export function MutasiModal({ isOpen, onClose, onSubmit, productSlug, initialData }: MutasiModalProps) {
    const [date, setDate] = useState('');
    const [jenis, setJenis] = useState('');
    const [namaBahan, setNamaBahan] = useState('');
    const [quantum, setQuantum] = useState('');
    const [satuan, setSatuan] = useState('Kg');
    const [file, setFile] = useState<File | null>(null);
    const [keterangan, setKeterangan] = useState('');

    const [availableBaku, setAvailableBaku] = useState<ProductMaterial[]>([]);
    const [availablePenolong, setAvailablePenolong] = useState<ProductMaterial[]>([]);

    useEffect(() => {
        if (isOpen) {
            if (productSlug) {
                masterItemService.getProductMaterials(productSlug, 'Baku').then(setAvailableBaku);
                masterItemService.getProductMaterials(productSlug, 'Penolong').then(setAvailablePenolong);
            }
            if (initialData) {
                setDate(initialData.tanggal ? initialData.tanggal.substring(0, 10) : '');
                setJenis(initialData.jenis || '');
                setNamaBahan(initialData.namaBahan || '');
                setQuantum(initialData.kuantum?.toString() || '');
                setSatuan(initialData.satuan || 'Kg');
                setKeterangan(initialData.keterangan || '');
                setFile(null);
            } else {
                setDate('');
                setJenis('');
                setNamaBahan('');
                setQuantum('');
                setSatuan('Kg');
                setFile(null);
                setKeterangan('');
            }
        }
    }, [isOpen, productSlug, initialData]);

    const availableBahan = jenis === 'Bahan Baku' ? availableBaku :
        jenis === 'Bahan Penolong' ? availablePenolong : [];
    const selectedMaterial = availableBahan.find(m => m.nama === namaBahan);
    const unitOptions = getUnitOptions(selectedMaterial?.satuan);

    const handleJenisChange = (value: string) => {
        setJenis(value);
        setNamaBahan('');
    };

    const handleNamaBahanChange = (value: string) => {
        setNamaBahan(value);
        const mat = availableBahan.find(m => m.nama === value);
        if (mat?.satuan) setSatuan(mat.satuan);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) setFile(e.target.files[0]);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!date) {
            alert('Mohon pilih Tanggal Data Mutasi terlebih dahulu.');
            return;
        }
        onSubmit({ date: new Date(date), jenis, namaBahan, quantum, satuan, file, keterangan });
        onClose();
    };

    const footer = (
        <>
            <AppButton type="button" variant="secondary" onClick={onClose}>Batal</AppButton>
            <AppButton type="submit" form="mutasi-form" variant="primary">Simpan Data</AppButton>
        </>
    );

    return (
        <AppModal
            isOpen={isOpen}
            onClose={onClose}
            title={initialData ? 'Edit Data Mutasi' : 'Tambah Data Mutasi'}
            footer={footer}
        >
            <form id="mutasi-form" onSubmit={handleSubmit} className="space-y-5">

                {/* Tanggal */}
                <div>
                    <Label required>Tanggal</Label>
                    <div className="relative">
                        <CalendarIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            required
                            className={inputCls + ' pl-10'}
                        />
                    </div>
                </div>

                {/* Jenis */}
                <div>
                    <Label required>Jenis</Label>
                    <select
                        value={jenis}
                        onChange={(e) => handleJenisChange(e.target.value)}
                        required
                        className={selectCls}
                    >
                        <option value="" disabled>Pilih</option>
                        <option value="Bahan Baku">Bahan Baku</option>
                        <option value="Bahan Penolong">Bahan Penolong</option>
                    </select>
                </div>

                {/* Nama Bahan */}
                <div>
                    <Label required>Nama Bahan</Label>
                    {availableBahan.length > 0 ? (
                        <select
                            value={namaBahan}
                            onChange={(e) => handleNamaBahanChange(e.target.value)}
                            required
                            disabled={!jenis}
                            className={selectCls + (!jenis ? ' bg-gray-50 text-gray-400 cursor-not-allowed' : '')}
                        >
                            <option value="" disabled>Pilih</option>
                            {availableBahan.map((item) => (
                                <option key={item.id} value={item.nama}>{item.nama}</option>
                            ))}
                        </select>
                    ) : (
                        <div className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 border-dashed text-sm text-gray-400 italic">
                            {!jenis ? 'Pilih jenis terlebih dahulu' : 'Belum ada material dikonfigurasi'}
                        </div>
                    )}
                </div>

                {/* Kuantum + Satuan */}
                <div>
                    <Label required>Kuantum</Label>
                    <div className="flex gap-3">
                        <input
                            type="number"
                            step="any"
                            value={quantum}
                            onChange={(e) => setQuantum(e.target.value)}
                            required
                            placeholder="Masukkan jumlah"
                            className={inputCls.replace('w-full', 'flex-[3]')}
                        />
                        <select
                            value={satuan}
                            onChange={(e) => setSatuan(e.target.value)}
                            className={selectCls.replace('w-full', 'flex-1') + ' min-w-[100px]'}
                        >
                            {unitOptions.map((opt) => (
                                <option key={opt} value={opt}>{opt}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Dokumen */}
                <div>
                    <Label optional>Dokumen</Label>
                    <div className="relative group">
                        <input
                            type="file"
                            onChange={handleFileChange}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        <div className="flex items-center px-4 py-2.5 bg-white border border-gray-200 hover:border-emerald-500 hover:ring-1 hover:ring-emerald-500 transition-all h-11">
                            <span className="inline-flex items-center px-3 py-1 bg-gray-100 text-xs font-medium text-gray-600 border border-gray-200 mr-3 group-hover:bg-emerald-50 group-hover:text-emerald-700 group-hover:border-emerald-200 transition-colors">
                                Choose File
                            </span>
                            <span className="text-sm text-gray-500 truncate flex-1">
                                {file ? file.name : (initialData?.dokumen || 'No file chosen')}
                            </span>
                            <UploadIcon className="size-5 text-gray-400" />
                        </div>
                    </div>
                </div>

                {/* Keterangan */}
                <div>
                    <Label>Keterangan</Label>
                    <textarea
                        value={keterangan}
                        onChange={(e) => setKeterangan(e.target.value)}
                        rows={3}
                        className="w-full px-4 py-3 bg-white border border-gray-200 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all resize-none"
                        placeholder="Tambahkan catatan jika diperlukan..."
                    />
                </div>

            </form>
        </AppModal>
    );
}
