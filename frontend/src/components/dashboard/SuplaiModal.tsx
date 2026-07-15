'use client';

import { useState, useEffect, useMemo } from 'react';
import { AppModal } from '@/components/ui/app-modal';
import { AppButton } from '@/components/ui/app-button';
import { masterItemService, ProductMaterial } from '@/lib/masterItemService';
import { CalendarIcon, UploadIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

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

interface SuplaiModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: any) => void;
    products: { label: string; slug: string }[];
    initialData?: any;
}

interface ProductMaterialsGroup {
    productSlug: string;
    productName: string;
    baku: ProductMaterial[];
    penolong: ProductMaterial[];
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

/* ─── Shared input class ─── */
const inputCls = 'w-full px-4 py-2.5 bg-white border border-gray-200 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all';
const selectCls = inputCls + ' appearance-none cursor-pointer';

/* ─── Custom Searchable Select ─── */
interface SearchableSelectProps {
    value: string;
    onChange: (value: string) => void;
    options: string[];
    placeholder: string;
    disabled?: boolean;
}

function SearchableSelect({ value, onChange, options, placeholder, disabled }: SearchableSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');

    const filteredOptions = useMemo(() => {
        if (!search) return options.slice(0, 10); // Show only first 10 initially to avoid clutter
        return options.filter(opt => opt.toLowerCase().includes(search.toLowerCase()));
    }, [options, search]);

    useEffect(() => {
        if (!isOpen) return;
        const handleOutsideClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (!target.closest('.searchable-select-container')) {
                setIsOpen(false);
            }
        };
        document.addEventListener('click', handleOutsideClick);
        return () => document.removeEventListener('click', handleOutsideClick);
    }, [isOpen]);

    return (
        <div className="relative searchable-select-container w-full">
            <button
                type="button"
                disabled={disabled}
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "w-full px-4 py-2.5 bg-white border border-gray-200 text-sm text-left text-gray-700 flex items-center justify-between transition-all focus:outline-none",
                    disabled ? "bg-gray-50 text-gray-400 cursor-not-allowed" : "cursor-pointer hover:border-gray-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/40"
                )}
            >
                <span className={cn(!value && "text-gray-400")}>
                    {value || placeholder}
                </span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                    <polyline points="6 9 12 15 18 9" />
                </svg>
            </button>

            {isOpen && (
                <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 shadow-xl rounded-lg z-50 p-2 space-y-2">
                    <input
                        type="text"
                        autoFocus
                        placeholder="Ketik untuk mencari..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full px-3 py-1.5 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all"
                    />
                    <div className="max-h-60 overflow-y-auto divide-y divide-gray-50">
                        {filteredOptions.length === 0 ? (
                            <div className="px-3 py-2 text-xs text-gray-400 italic">
                                Tidak ada hasil pencarian
                            </div>
                        ) : (
                            filteredOptions.map((opt) => (
                                <button
                                    key={opt}
                                    type="button"
                                    onClick={() => {
                                        onChange(opt);
                                        setSearch('');
                                        setIsOpen(false);
                                    }}
                                    className={cn(
                                        "w-full text-left px-3 py-2 text-sm hover:bg-emerald-50 hover:text-emerald-700 transition-colors cursor-pointer",
                                        value === opt ? "bg-emerald-50 text-emerald-700 font-medium" : "text-gray-700"
                                    )}
                                >
                                    {opt}
                                </button>
                            ))
                        )}
                        {!search && options.length > 10 && (
                            <div className="px-3 py-1.5 text-[10px] text-gray-400 border-t border-gray-100 text-center">
                                Menampilkan 10 dari {options.length} bahan. Ketik untuk mencari lainnya...
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export function SuplaiModal({ isOpen, onClose, onSubmit, products, initialData }: SuplaiModalProps) {
    const [date, setDate] = useState('');
    const [jenis, setJenis] = useState('');
    const [namaBahan, setNamaBahan] = useState('');
    const [selectedProductSlug, setSelectedProductSlug] = useState('');
    const [quantum, setQuantum] = useState('');
    const [satuan, setSatuan] = useState('Kg');
    const [file, setFile] = useState<File | null>(null);
    const [keterangan, setKeterangan] = useState('');

    const [allProductMaterials, setAllProductMaterials] = useState<ProductMaterialsGroup[]>([]);
    const [isLoadingMaterials, setIsLoadingMaterials] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setIsLoadingMaterials(true);
            Promise.all(
                products.map(async (prod) => {
                    const [baku, penolong] = await Promise.all([
                        masterItemService.getProductMaterials(prod.slug, 'Baku'),
                        masterItemService.getProductMaterials(prod.slug, 'Penolong')
                    ]);
                    return {
                        productSlug: prod.slug,
                        productName: prod.label,
                        baku,
                        penolong
                    };
                })
            ).then((res) => {
                setAllProductMaterials(res);
                setIsLoadingMaterials(false);
            }).catch(err => {
                console.error('Failed to load materials config:', err);
                setIsLoadingMaterials(false);
            });

            if (initialData) {
                setDate(initialData.tanggal ? initialData.tanggal.substring(0, 10) : '');
                setJenis(initialData.jenis || '');
                setNamaBahan(initialData.namaBahan || '');
                setSelectedProductSlug(initialData.productSlug || '');
                setQuantum(initialData.kuantum?.toString() || '');
                setSatuan(initialData.satuan || 'Kg');
                setKeterangan(initialData.keterangan || '');
                setFile(null);
            } else {
                const today = new Date();
                const yyyy = today.getFullYear();
                const mm = String(today.getMonth() + 1).padStart(2, '0');
                const dd = String(today.getDate()).padStart(2, '0');
                setDate(`${yyyy}-${mm}-${dd}`);
                setJenis('');
                setNamaBahan('');
                setSelectedProductSlug('');
                setQuantum('');
                setSatuan('Kg');
                setFile(null);
                setKeterangan('');
            }
        }
    }, [isOpen, initialData, products]);

    // 1. Get unique material names based on selected jenis
    const availableBahanNames = useMemo(() => {
        if (!jenis) return [];
        
        // If editing, only show the configured material for that specific product
        if (initialData) {
            const pm = allProductMaterials.find(p => p.productSlug === initialData.productSlug);
            if (pm) {
                const list = jenis === 'Bahan Baku' ? pm.baku :
                             jenis === 'Bahan Penolong' ? pm.penolong : [];
                return list.map(item => item.nama).sort();
            }
        }

        // Add mode: collect unique names from all products
        const names = new Set<string>();
        allProductMaterials.forEach(pm => {
            const list = jenis === 'Bahan Baku' ? pm.baku :
                         jenis === 'Bahan Penolong' ? pm.penolong : [];
            list.forEach(item => names.add(item.nama));
        });
        return Array.from(names).sort();
    }, [allProductMaterials, jenis, initialData]);

    // Find the default unit of the selected material
    const selectedMaterialDefaultUnit = useMemo(() => {
        if (!namaBahan || !selectedProductSlug) return undefined;
        const pm = allProductMaterials.find(p => p.productSlug === selectedProductSlug);
        if (pm) {
            const list = jenis === 'Bahan Baku' ? pm.baku :
                         jenis === 'Bahan Penolong' ? pm.penolong : [];
            const item = list.find(m => m.nama === namaBahan);
            return item?.satuan;
        }
        return undefined;
    }, [allProductMaterials, jenis, namaBahan, selectedProductSlug]);

    const unitOptions = getUnitOptions(selectedMaterialDefaultUnit);

    const handleJenisChange = (value: string) => {
        setJenis(value);
        setNamaBahan('');
        setSelectedProductSlug('');
    };

    const handleNamaBahanChange = (value: string) => {
        setNamaBahan(value);
        
        // Find which product slug is associated with this material
        const matched: string[] = [];
        allProductMaterials.forEach(pm => {
            const list = jenis === 'Bahan Baku' ? pm.baku :
                         jenis === 'Bahan Penolong' ? pm.penolong : [];
            if (list.some(item => item.nama === value)) {
                matched.push(pm.productSlug);
            }
        });

        // Automatically determine productSlug behind the scenes (use first match, or fallback to first product)
        const defaultProductSlug = matched[0] || (products[0]?.slug || '');
        setSelectedProductSlug(defaultProductSlug);

        // Find the unit in that matching product material
        const pm = allProductMaterials.find(p => p.productSlug === defaultProductSlug);
        if (pm) {
            const list = jenis === 'Bahan Baku' ? pm.baku :
                         jenis === 'Bahan Penolong' ? pm.penolong : [];
            const mat = list.find(m => m.nama === value);
            if (mat?.satuan) setSatuan(mat.satuan);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) setFile(e.target.files[0]);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!date) {
            alert('Mohon pilih Tanggal Data Suplai terlebih dahulu.');
            return;
        }
        
        // Ensure productSlug is set before sending (use fallback if empty)
        const finalProductSlug = selectedProductSlug || (products[0]?.slug || '');

        onSubmit({ 
            date: new Date(date), 
            jenis, 
            namaBahan, 
            quantum, 
            satuan, 
            file, 
            keterangan,
            productSlug: finalProductSlug 
        });
        onClose();
    };

    const footer = (
        <>
            <AppButton type="button" variant="secondary" onClick={onClose}>Batal</AppButton>
            <AppButton type="submit" form="suplai-form" variant="primary" disabled={isLoadingMaterials}>Simpan Data</AppButton>
        </>
    );

    return (
        <AppModal
            isOpen={isOpen}
            onClose={onClose}
            title={initialData ? 'Edit Data Suplai' : 'Tambah Data Suplai'}
            footer={footer}
        >
            {isLoadingMaterials ? (
                <div className="flex items-center justify-center py-16">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
                </div>
            ) : (
                <form id="suplai-form" onSubmit={handleSubmit} className="space-y-5">
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
                            disabled={!!initialData}
                            className={selectCls + (initialData ? ' bg-gray-50 text-gray-400 cursor-not-allowed' : '')}
                        >
                            <option value="" disabled>Pilih</option>
                            <option value="Bahan Baku">Bahan Baku</option>
                            <option value="Bahan Penolong">Bahan Penolong</option>
                        </select>
                    </div>

                    {/* Nama Bahan (Searchable Select) */}
                    <div>
                        <Label required>Nama Bahan</Label>
                        {jenis ? (
                            <SearchableSelect
                                value={namaBahan}
                                onChange={handleNamaBahanChange}
                                options={availableBahanNames}
                                placeholder="Pilih atau cari bahan..."
                                disabled={!!initialData}
                            />
                        ) : (
                            <div className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 border-dashed text-sm text-gray-400 italic">
                                Pilih jenis terlebih dahulu
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
            )}
        </AppModal>
    );
}
