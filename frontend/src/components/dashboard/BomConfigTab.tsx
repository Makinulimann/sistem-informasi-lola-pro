'use client';

import { useState, useEffect, useMemo } from 'react';
import { getBOM, saveBOM, type BOMVariant } from '@/lib/produksiService';
import { api } from '@/lib/api';
import { AppButton } from '@/components/ui/app-button';
import { AppInput } from '@/components/ui/app-input';
import { AppSelect } from '@/components/ui/app-select';
import { AppSearchBar } from '@/components/ui/app-search-bar';

interface ProductMaterial {
    id: number;
    masterItemId: number;
    nama: string;
    jenis: string;
    satuan: string;
}

interface BomConfigTabProps {
    productSlug: string;
    tabId: number;
    productName: string;
    variantName: string;
    baseUnit: string;
}

export function BomConfigTab({
    productSlug,
    tabId,
    productName,
    variantName,
    baseUnit
}: BomConfigTabProps) {
    const [materials, setMaterials] = useState<ProductMaterial[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    
    const [baseQuantity, setBaseQuantity] = useState<string>('1000');
    // Standard BOM quantities keyed by masterItemId
    const [quantities, setQuantities] = useState<Record<number, string>>({});
    
    // Sub-product packaging variants (e.g. "Kemasan 1Kg", "Kemasan 2Kg", "Kemasan 10Kg")
    const [activeVariantName, setActiveVariantName] = useState<string>('default'); // 'default' = BOM Utama / Standar
    const [variantsList, setVariantsList] = useState<string[]>([]);
    const [variantQuantities, setVariantQuantities] = useState<Record<string, Record<number, string>>>({});

    // Filter & Sort State
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [sortBy, setSortBy] = useState<string>('nama-asc');

    // Add Variant Modal
    const [isAddVariantOpen, setIsAddVariantOpen] = useState(false);
    const [newVariantNameInput, setNewVariantNameInput] = useState('');

    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Load materials and current BOM config
    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            setErrorMessage(null);
            setSuccessMessage(null);
            const storageKey = `sippro_bom_variants_${productSlug}_${tabId}`;
            try {
                // 1. Fetch materials assigned to this product
                const materialsData = await api.get<ProductMaterial[]>(`/ProductMaterial/${productSlug}`);
                setMaterials(materialsData);

                // 2. Fetch current BOM config
                const bomConfig = await getBOM(productSlug, tabId);
                if (bomConfig) {
                    setBaseQuantity(String(bomConfig.baseQuantity || '1000'));
                    
                    const qtyMap: Record<number, string> = {};
                    bomConfig.items.forEach(item => {
                        qtyMap[item.materialId] = String(item.quantity || '');
                    });
                    setQuantities(qtyMap);

                    const vQuantities: Record<string, Record<number, string>> = {};
                    const vNamesList: string[] = [];

                    // 1. Read cached variants from localStorage first
                    try {
                        const cached = localStorage.getItem(storageKey);
                        if (cached) {
                            const parsed = JSON.parse(cached);
                            if (Array.isArray(parsed.variantsList)) {
                                parsed.variantsList.forEach((name: string) => {
                                    if (name && !vNamesList.includes(name)) vNamesList.push(name);
                                });
                            }
                            if (parsed.variantQuantities) {
                                Object.assign(vQuantities, parsed.variantQuantities);
                            }
                        }
                    } catch {}

                    // 2. Merge variants returned from DB
                    if (bomConfig.variants && Array.isArray(bomConfig.variants)) {
                        bomConfig.variants.forEach(v => {
                            if (v.name && !vNamesList.includes(v.name)) {
                                vNamesList.push(v.name);
                            }
                            if (v.name) {
                                const itemMap: Record<number, string> = vQuantities[v.name] || {};
                                (v.items || []).forEach(item => {
                                    itemMap[item.materialId] = String(item.quantity || '');
                                });
                                vQuantities[v.name] = itemMap;
                            }
                        });
                    }

                    // Save merged cache back to localStorage
                    try {
                        localStorage.setItem(storageKey, JSON.stringify({ variantsList: vNamesList, variantQuantities: vQuantities }));
                    } catch {}

                    setVariantsList(vNamesList);
                    setVariantQuantities(vQuantities);
                }
            } catch (err: any) {
                console.error('Failed to load BOM configuration:', err);
                setErrorMessage('Gagal memuat konfigurasi BOM.');
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [productSlug, tabId]);

    const handleQuantityChange = (masterItemId: number, value: string) => {
        if (activeVariantName === 'default') {
            setQuantities(prev => ({
                ...prev,
                [masterItemId]: value
            }));
        } else {
            setVariantQuantities(prev => {
                const updated = {
                    ...prev,
                    [activeVariantName]: {
                        ...(prev[activeVariantName] || {}),
                        [masterItemId]: value
                    }
                };
                const storageKey = `sippro_bom_variants_${productSlug}_${tabId}`;
                try {
                    localStorage.setItem(storageKey, JSON.stringify({ variantsList, variantQuantities: updated }));
                } catch {}
                return updated;
            });
        }
    };

    const handleAddVariant = () => {
        const trimmed = newVariantNameInput.trim();
        if (!trimmed) return;
        if (!variantsList.includes(trimmed)) {
            const updated = [...variantsList, trimmed];
            setVariantsList(updated);
            setActiveVariantName(trimmed);
            const storageKey = `sippro_bom_variants_${productSlug}_${tabId}`;
            try {
                localStorage.setItem(storageKey, JSON.stringify({ variantsList: updated, variantQuantities }));
            } catch {}
        }
        setNewVariantNameInput('');
        setIsAddVariantOpen(false);
    };

    const handleDeleteVariant = (vName: string) => {
        const updatedList = variantsList.filter(v => v !== vName);
        setVariantsList(updatedList);
        
        const updatedQty = { ...variantQuantities };
        delete updatedQty[vName];
        setVariantQuantities(updatedQty);

        if (activeVariantName === vName) {
            setActiveVariantName('default');
        }

        const storageKey = `sippro_bom_variants_${productSlug}_${tabId}`;
        try {
            localStorage.setItem(storageKey, JSON.stringify({ variantsList: updatedList, variantQuantities: updatedQty }));
        } catch {}
    };

    const handleSave = async () => {
        setSaving(true);
        setErrorMessage(null);
        setSuccessMessage(null);

        const parsedBaseQty = parseFloat(baseQuantity);
        if (isNaN(parsedBaseQty) || parsedBaseQty <= 0) {
            setErrorMessage('Jumlah produksi dasar harus lebih dari 0.');
            setSaving(false);
            return;
        }

        try {
            const items = materials.map(mat => {
                const qtyStr = quantities[mat.masterItemId] || '0';
                return {
                    materialId: mat.masterItemId,
                    quantity: parseFloat(qtyStr) || 0
                };
            });

            const variantsPayload: BOMVariant[] = variantsList.map(vName => {
                const vMap = variantQuantities[vName] || {};
                const vItems = materials
                    .map(mat => ({
                        materialId: mat.masterItemId,
                        quantity: parseFloat(vMap[mat.masterItemId] || '0') || 0
                    }))
                    .filter(i => i.quantity > 0);

                return {
                    name: vName,
                    items: vItems
                };
            });

            await saveBOM({
                productSlug,
                tabId,
                baseQuantity: parsedBaseQty,
                items,
                variants: variantsPayload
            });

            const storageKey = `sippro_bom_variants_${productSlug}_${tabId}`;
            try {
                localStorage.setItem(storageKey, JSON.stringify({ variantsList, variantQuantities }));
            } catch {}

            setSuccessMessage('Konfigurasi BOM berhasil disimpan.');
        } catch (err: any) {
            console.error('Failed to save BOM:', err);
            setErrorMessage(err.message || 'Gagal menyimpan konfigurasi BOM.');
        } finally {
            setSaving(false);
        }
    };

    // Filter and Sort Materials
    const filteredAndSortedMaterials = useMemo(() => {
        let list = [...materials];

        // Search
        if (search) {
            const q = search.toLowerCase();
            list = list.filter(m => m.nama.toLowerCase().includes(q));
        }

        // Category Filter
        if (categoryFilter === 'baku') {
            list = list.filter(m => m.jenis.toLowerCase().includes('baku'));
        } else if (categoryFilter === 'penolong') {
            list = list.filter(m => m.jenis.toLowerCase().includes('penolong'));
        }

        // Sort
        list.sort((a, b) => {
            if (sortBy === 'nama-asc') return a.nama.localeCompare(b.nama);
            if (sortBy === 'nama-desc') return b.nama.localeCompare(a.nama);
            if (sortBy === 'kategori-baku') {
                const isABaku = a.jenis.toLowerCase().includes('baku') ? 0 : 1;
                const isBBaku = b.jenis.toLowerCase().includes('baku') ? 0 : 1;
                if (isABaku !== isBBaku) return isABaku - isBBaku;
                return a.nama.localeCompare(b.nama);
            }
            if (sortBy === 'kategori-penolong') {
                const isAPen = a.jenis.toLowerCase().includes('penolong') ? 0 : 1;
                const isBPen = b.jenis.toLowerCase().includes('penolong') ? 0 : 1;
                if (isAPen !== isBPen) return isAPen - isBPen;
                return a.nama.localeCompare(b.nama);
            }
            return 0;
        });

        return list;
    }, [materials, search, categoryFilter, sortBy]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
                <span className="ml-3 text-gray-500 text-sm">Memuat data BOM...</span>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            <div className="border-b border-gray-100 pb-4">
                <h3 className="text-lg font-bold text-gray-900">Bill of Material (BOM)</h3>
                <p className="text-sm text-gray-500 mt-1">
                    Konfigurasi kebutuhan bahan dasar & varian kemasan sub-produk
                </p>
            </div>

            {/* Error or Success Alert */}
            {errorMessage && (
                <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
                    {errorMessage}
                </div>
            )}
            {successMessage && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-lg">
                    {successMessage}
                </div>
            )}

            {/* Base Quantity Input */}
            <div className="max-w-xs">
                <AppInput
                    label="Jumlah Produksi Dasar"
                    type="number"
                    value={baseQuantity}
                    onChange={e => setBaseQuantity(e.target.value)}
                    rightElement={<span className="text-gray-400 text-xs font-semibold pr-2">{baseUnit}</span>}
                    placeholder="1000"
                    className="font-mono font-semibold"
                />
            </div>

            {/* ─── Sub-Product / Kemasan Variant Switcher Tabs ─── */}
            <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">Konfigurasi Varian Kemasan Sub-Produk</label>
                <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 pb-3">
                    <button
                        type="button"
                        onClick={() => setActiveVariantName('default')}
                        className={`px-4 py-2 text-sm font-semibold transition-all cursor-pointer ${
                            activeVariantName === 'default'
                                ? 'bg-emerald-600 text-white shadow-sm'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                        BOM Utama / Standar
                    </button>

                    {variantsList.map(vName => (
                        <div
                            key={vName}
                            className={`inline-flex items-center gap-1 px-3 py-2 text-sm font-semibold transition-all ${
                                activeVariantName === vName
                                    ? 'bg-amber-600 text-white shadow-sm'
                                    : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                            }`}
                        >
                            <button
                                type="button"
                                onClick={() => setActiveVariantName(vName)}
                                className="cursor-pointer"
                            >
                                {vName}
                            </button>
                            <button
                                type="button"
                                onClick={() => handleDeleteVariant(vName)}
                                className="ml-1 text-xs opacity-70 hover:opacity-100 hover:text-red-500"
                                title="Hapus varian kemasan ini"
                            >
                                ✕
                            </button>
                        </div>
                    ))}

                    <button
                        type="button"
                        onClick={() => setIsAddVariantOpen(true)}
                        className="px-3 py-2 text-sm font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 cursor-pointer flex items-center gap-1 transition-all"
                    >
                        + Tambah Kemasan
                    </button>
                </div>
                <p className="text-xs text-gray-500">
                    {activeVariantName === 'default'
                        ? 'Pengaturan BOM standar untuk seluruh kebutuhan bahan baku & penolong dasar.'
                        : `Mengatur khusus kebutuhan bahan penolong / kemasan untuk varian "${activeVariantName}".`}
                </p>
            </div>

            {/* ─── Sort & Filter Controls ─── */}
            <div className="bg-gray-50/70 p-4 border border-gray-200 rounded-lg space-y-3 md:space-y-0 md:flex md:items-center md:justify-between md:gap-4">
                <div className="flex flex-wrap items-center gap-3">
                    <AppSelect
                        prefixLabel="Kategori:"
                        value={categoryFilter}
                        onChange={e => setCategoryFilter(e.target.value)}
                        options={[
                            { label: 'Semua Kategori', value: 'all' },
                            { label: 'Bahan Baku', value: 'baku' },
                            { label: 'Bahan Penolong', value: 'penolong' },
                        ]}
                    />
                    <AppSelect
                        prefixLabel="Urutkan:"
                        value={sortBy}
                        onChange={e => setSortBy(e.target.value)}
                        options={[
                            { label: 'Nama (A-Z)', value: 'nama-asc' },
                            { label: 'Nama (Z-A)', value: 'nama-desc' },
                            { label: 'Kategori (Bahan Baku Dahulu)', value: 'kategori-baku' },
                            { label: 'Kategori (Bahan Penolong Dahulu)', value: 'kategori-penolong' },
                        ]}
                    />
                </div>
                <AppSearchBar
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Cari bahan..."
                    containerClassName="w-full md:w-64"
                />
            </div>

            {/* Materials List Table */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-gray-800">
                        Daftar Kebutuhan Bahan ({activeVariantName === 'default' ? 'BOM Standar' : activeVariantName})
                    </h4>
                    <span className="text-xs text-gray-500 font-mono">
                        Menampilkan {filteredAndSortedMaterials.length} dari {materials.length} item
                    </span>
                </div>

                {materials.length === 0 ? (
                    <div className="p-12 text-center text-gray-400 border border-dashed rounded-lg">
                        Belum ada material yang ditugaskan untuk produk ini.
                        Silakan atur di tab Konfigurasi Bahan terlebih dahulu.
                    </div>
                ) : (
                    <div className="overflow-x-auto border border-gray-200 rounded-lg">
                        <table className="w-full text-sm border-collapse">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200">
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200">Nama Bahan</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200 w-48">Kategori</th>
                                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200 w-28">Satuan</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider w-48">Kuantitas BOM</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 bg-white">
                                {filteredAndSortedMaterials.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="p-8 text-center text-gray-400 text-sm">
                                            Tidak ada bahan yang cocok dengan pencarian / filter.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredAndSortedMaterials.map(mat => {
                                        const isBaku = mat.jenis.toLowerCase().includes('baku');
                                        const isVariantView = activeVariantName !== 'default';

                                        // Read active quantity depending on standard vs variant view
                                        const currentVal = isVariantView
                                            ? (variantQuantities[activeVariantName]?.[mat.masterItemId] || '')
                                            : (quantities[mat.masterItemId] || '');

                                        return (
                                            <tr key={mat.id} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-4 py-3 border-r border-gray-200 font-medium text-gray-800">
                                                    {mat.nama}
                                                </td>
                                                <td className="px-4 py-3 border-r border-gray-200">
                                                    <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full border ${isBaku ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
                                                        {isBaku ? 'Bahan Baku' : 'Bahan Penolong'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-center text-xs text-gray-500 font-semibold border-r border-gray-200">
                                                    {mat.satuan}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {isVariantView && isBaku ? (
                                                        <div className="text-right text-xs text-gray-400 italic">
                                                            (Mengikuti BOM Standar)
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center justify-end gap-2 max-w-[160px] ml-auto">
                                                            <input
                                                                type="number"
                                                                step="any"
                                                                value={currentVal}
                                                                onChange={e => handleQuantityChange(mat.masterItemId, e.target.value)}
                                                                className="w-full text-right px-3 py-1.5 border border-gray-200 text-sm font-mono focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded"
                                                                placeholder="0"
                                                            />
                                                            <span className="text-gray-500 text-xs font-semibold w-12 text-left">
                                                                {mat.satuan}
                                                            </span>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Save Button */}
            <div className="pt-2">
                <AppButton
                    onClick={handleSave}
                    loading={saving}
                    disabled={materials.length === 0}
                    variant="primary"
                    className="shadow-sm shadow-emerald-500/10 hover:shadow-emerald-500/20 px-6 py-2.5 text-sm"
                >
                    Simpan Konfigurasi
                </AppButton>
            </div>

            {/* Modal Add Sub-Product Variant */}
            {isAddVariantOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 animate-in fade-in zoom-in-95 duration-200 space-y-4">
                        <h4 className="text-lg font-bold text-gray-900">Tambah Varian Kemasan</h4>
                        <p className="text-xs text-gray-500">
                            Masukkan nama varian kemasan sub-produk (contoh: Kemasan 1Kg, Kemasan 5Kg, Box 10L).
                        </p>
                        <AppInput
                            label="Nama Kemasan / Sub-Produk"
                            value={newVariantNameInput}
                            onChange={e => setNewVariantNameInput(e.target.value)}
                            placeholder="Contoh: Kemasan 1Kg"
                            autoFocus
                        />
                        <div className="flex justify-end gap-2 pt-2">
                            <AppButton variant="secondary" onClick={() => setIsAddVariantOpen(false)}>
                                Batal
                            </AppButton>
                            <AppButton variant="primary" onClick={handleAddVariant}>
                                Tambah
                            </AppButton>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
