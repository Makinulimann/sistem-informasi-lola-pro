import { useState, useEffect, useCallback } from 'react';
import { masterItemService, MasterItem, ProductMaterial } from '@/lib/masterItemService';
import { sidebarService, SidebarMenu } from '@/lib/sidebarService';
import { PlusIcon, XIcon as LucideXIcon, InfoIcon, CheckIcon } from 'lucide-react';

// Icons
function XIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
    );
}

function Plus() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
    );
}

interface ConfigurationTabProps {
    productSlug: string;
}

export function ConfigurationTab({ productSlug }: ConfigurationTabProps) {
    const [bakuList, setBakuList] = useState<ProductMaterial[]>([]);
    const [penolongList, setPenolongList] = useState<ProductMaterial[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const fetchMaterials = useCallback(async () => {
        setIsLoading(true);
        try {
            const [baku, penolong] = await Promise.all([
                masterItemService.getProductMaterials(productSlug, 'Baku'),
                masterItemService.getProductMaterials(productSlug, 'Penolong')
            ]);
            setBakuList(baku);
            setPenolongList(penolong);
        } catch (error) {
            console.error('Failed to fetch product materials:', error);
        } finally {
            setIsLoading(false);
        }
    }, [productSlug]);

    useEffect(() => {
        fetchMaterials();
    }, [fetchMaterials]);

    const handleUnassign = async (id: number) => {
        if (!confirm('Hapus material ini dari produk?')) return;
        try {
            await masterItemService.unassignMaterial(id);
            fetchMaterials();
        } catch (error) {
            console.error('Failed to unassign material:', error);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <MaterialSection
                title="Bahan Baku"
                description="Komponen utama untuk produksi (contoh: Dolomite, Gambut)."
                items={bakuList}
                jenis="Baku"
                productSlug={productSlug}
                onUpdate={fetchMaterials}
                onRemove={handleUnassign}
                colorClass="bg-emerald-500"
            />

            <div className="border-t border-gray-100 my-6"></div>

            <MaterialSection
                title="Bahan Penolong"
                description="Bahan pelengkap dan kemasan (contoh: Botol, Stiker)."
                items={penolongList}
                jenis="Penolong"
                productSlug={productSlug}
                onUpdate={fetchMaterials}
                onRemove={handleUnassign}
                colorClass="bg-amber-500"
            />
        </div>
    );
}

interface MaterialSectionProps {
    title: string;
    description: string;
    items: ProductMaterial[];
    jenis: 'Baku' | 'Penolong';
    productSlug: string;
    onUpdate: () => void;
    onRemove: (id: number) => void;
    colorClass: string;
}

function MaterialSection({ title, description, items, jenis, productSlug, onUpdate, onRemove, colorClass }: MaterialSectionProps) {
    const [isAdding, setIsAdding] = useState(false);
    const [search, setSearch] = useState('');
    const [searchResults, setSearchResults] = useState<MasterItem[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showCreate, setShowCreate] = useState(false);

    // Create Modal State
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [createName, setCreateName] = useState('');
    const [createUnit, setCreateUnit] = useState('');
    const [availableProducts, setAvailableProducts] = useState<{ label: string, slug: string }[]>([]);
    const [selectedProductSlugs, setSelectedProductSlugs] = useState<string[]>([]);
    const [isCreating, setIsCreating] = useState(false);

    // Fetch available products for scope selection
    useEffect(() => {
        const loadProducts = async () => {
            try {
                // Get all sidebar menus to find products
                const menus = await sidebarService.getAll();

                const products: { label: string, slug: string }[] = [];
                let currentL1Parent: SidebarMenu | undefined;

                // 1. Find the L1 parent of the current productSlug
                const searchSlug = productSlug.replace(/-/g, ''); // Normalize: remove hyphens for looser matching if needed

                for (const l1 of menus) {
                    if (l1.children) {
                        for (const l2 of l1.children) {
                            const bb = l2.children?.find(c => c.label === 'Bahan Baku');
                            // Check if this L2 matches the current productSlug 
                            // We check both exact match and hyphen-removed match to be safe
                            if (bb && bb.href) {
                                const hrefSlug = bb.href.split('/').slice(-2)[0]; // get local slug
                                if (hrefSlug === productSlug || hrefSlug.replace(/-/g, '') === searchSlug) {
                                    currentL1Parent = l1;
                                    break;
                                }
                            }
                        }
                    }
                    if (currentL1Parent) break;
                }

                // 2. If parent found, collect only its children (siblings of current product)
                if (currentL1Parent && currentL1Parent.children) {
                    currentL1Parent.children.forEach(l2 => {
                        const bahanBakuChild = l2.children?.find(l3 => l3.label === 'Bahan Baku');
                        if (bahanBakuChild && bahanBakuChild.href) {
                            const parts = bahanBakuChild.href.split('/');
                            const slug = parts[parts.length - 2];
                            if (slug) {
                                products.push({
                                    label: l2.label,
                                    slug: slug
                                });
                            }
                        }
                    });
                }

                setAvailableProducts(products);

                const currentCanonical = products.find(p => p.slug === productSlug || p.slug.replace(/-/g, '') === productSlug.replace(/-/g, ''));
                if (currentCanonical) {
                    setSelectedProductSlugs(prev => {
                        if (prev.length === 1 && (prev[0] === productSlug || prev[0].replace(/-/g, '') === productSlug.replace(/-/g, ''))) {
                            return [currentCanonical.slug];
                        }
                        return prev;
                    });
                }
            } catch (e) {
                console.error('Failed to load products for scope:', e);
            }
        };
        loadProducts();
    }, [productSlug]);

    useEffect(() => {
        const timer = setTimeout(async () => {
            if (search.trim().length >= 1) {
                try {
                    const results = await masterItemService.searchMasterItems(search, productSlug);
                    setSearchResults(results);
                    const exactMatch = results.some(r => r.nama.toLowerCase() === search.toLowerCase());
                    setShowCreate(!exactMatch && search.length >= 2);
                } catch (error) {
                    console.error(error);
                } finally {
                    setIsSearching(false);
                }
            } else {
                if (search === '') {
                } else {
                    setSearchResults([]);
                    setShowCreate(false);
                }
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [search, productSlug]);

    const handleSelect = async (item: MasterItem) => {
        try {
            await masterItemService.assignMaterial(productSlug, item.id, jenis);
            onUpdate();
            setIsAdding(false);
            setSearch('');
            setSearchResults([]); // Clear results
        } catch (error) {
            alert('Gagal menambahkan material: ' + error);
        }
    };

    const openCreateModal = () => {
        setCreateName(search);
        setCreateUnit('');
        const currentCanonical = availableProducts.find(p => p.slug === productSlug || p.slug.replace(/-/g, '') === productSlug.replace(/-/g, ''));
        setSelectedProductSlugs([currentCanonical ? currentCanonical.slug : productSlug]);
        setIsCreateOpen(true);
    };

    const toggleProductSelection = (slug: string) => {
        setSelectedProductSlugs(prev => {
            if (prev.includes(slug)) {
                return prev.filter(s => s !== slug);
            } else {
                return [...prev, slug];
            }
        });
    };

    const handleCreateSubmit = async () => {
        if (!createName.trim()) return;
        if (selectedProductSlugs.length === 0) {
            alert('Pilih minimal satu produk.');
            return;
        }

        setIsCreating(true);
        try {
            let scopeSlug: string | null = null;
            if (selectedProductSlugs.length === 1) {
                scopeSlug = selectedProductSlugs[0];
            }
            const newItem = await masterItemService.createMasterItem(createName, createUnit, scopeSlug);
            await Promise.all(selectedProductSlugs.map(slug =>
                masterItemService.assignMaterial(slug, newItem.id, jenis)
            ));

            setIsCreateOpen(false);
            onUpdate();
            setIsAdding(false);
            setSearch('');
        } catch (error) {
            console.error('Failed to create item:', error);
            const errMsg = (error as any).response?.data || (error as any).message || 'Unknown error';
            alert('Gagal membuat material baru: ' + errMsg);
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 relative overflow-hidden">
            <div className={`absolute top-0 left-0 w-1.5 h-full ${colorClass} opacity-80`}></div>

            <div className="flex flex-col sm:flex-row justify-between items-start mb-6 gap-4">
                <div>
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        {title}
                        <span className="bg-gray-100 text-gray-600 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-gray-200">
                            {items.length}
                        </span>
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">{description}</p>
                </div>

                {jenis === 'Baku' && (
                    <button
                        onClick={async () => {
                            if (confirm('PERINGATAN: Tindakan ini akan MENGHAPUS SEMUA DATA MATERIAL (Baku & Penolong) dari seluruh sistem.\n\nApakah Anda yakin ingin melanjutkan?')) {
                                if (confirm('Data yang dihapus tidak dapat dikembalikan. Yakin hapus semua?')) {
                                    try {
                                        await masterItemService.resetData();
                                        alert('Semua data material berhasil dihapus.');
                                        window.location.reload(); // Reload to refresh everything
                                    } catch (e) {
                                        alert('Gagal me-reset data: ' + e);
                                    }
                                }
                            }
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 text-xs font-medium rounded-lg hover:bg-red-100 border border-red-100 transition-colors"
                        title="Hapus SEMUA data material di sistem"
                    >
                        Reset Data
                    </button>
                )}
            </div>

            <div className="mb-8 p-1 bg-white rounded-xl shadow-lg border border-gray-100 ring-1 ring-black/5 animate-in slide-in-from-top-4 duration-300 relative z-10 w-full max-w-lg">
                <div className="relative">
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onFocus={async () => {
                            if (!search) {
                                const results = await masterItemService.searchMasterItems('', productSlug);
                                setSearchResults(results);
                            }
                        }}
                        placeholder={`Cari atau buat ${jenis.toLowerCase()} baru...`}
                        className="w-full pl-4 pr-10 py-3 bg-transparent text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none"
                    />
                    {isSearching ? (
                        <div className="absolute right-3 top-3">
                            <div className="animate-spin h-5 w-5 border-2 border-emerald-500 border-t-transparent rounded-full"></div>
                        </div>
                    ) : (
                        <div className="absolute right-3 top-3 text-gray-400">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                        </div>
                    )}
                </div>

                {(search.length >= 1 || searchResults.length > 0) && (
                    <div className="border-t border-gray-100 max-h-60 overflow-y-auto">
                        {!isSearching && searchResults.length > 0 && (
                            <div className="py-2">
                                <div className="px-3 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                    {search ? 'Hasil Pencarian' : 'Rekomendasi Material'}
                                </div>
                                {searchResults.map(item => (
                                    <button
                                        key={item.id}
                                        onClick={() => handleSelect(item)}
                                        className="w-full text-left px-4 py-2.5 hover:bg-emerald-50 text-sm text-gray-700 flex justify-between items-center group transition-colors"
                                    >
                                        <div className="flex flex-col">
                                            <span className="font-medium text-gray-900">
                                                {item.nama}
                                                {item.scopeProductSlug && <span className="ml-2 text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded border border-gray-200">Spesifik</span>}
                                            </span>
                                            {item.satuanDefault && <span className="text-xs text-gray-500">{item.satuanDefault}</span>}
                                        </div>
                                        <span className="text-xs font-medium text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                            Pilih <PlusIcon size={12} />
                                        </span>
                                    </button>
                                ))}
                            </div>
                        )}

                        {!isSearching && searchResults.length === 0 && search.length >= 2 && (
                            <div className="px-4 py-8 text-center">
                                <div className="mx-auto w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                                    <svg className="text-gray-400" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                                </div>
                                <p className="text-sm text-gray-500 mb-1">Material tidak ditemukan</p>
                                <p className="text-xs text-gray-400">Pastikan ejaan benar atau buat baru.</p>
                            </div>
                        )}

                        {!isSearching && search.length >= 1 && (
                            <div className="bg-emerald-50/50 border-t border-emerald-100 p-2">
                                <button
                                    onClick={openCreateModal}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-emerald-200 shadow-sm text-emerald-700 text-sm font-medium rounded-lg hover:bg-emerald-50 hover:border-emerald-300 transition-all"
                                >
                                    <PlusIcon size={16} />
                                    Buat Material Baru: <span className="font-bold">"{search}"</span>
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {items.length === 0 ? (
                    <div className="col-span-full py-12 text-center border-2 border-dashed border-gray-100 rounded-xl bg-gray-50/50">
                        <div className={`mx-auto w-10 h-10 rounded-full flex items-center justify-center mb-3 ${jenis === 'Baku' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                            <InfoIcon size={20} />
                        </div>
                        <p className="text-sm font-medium text-gray-600">Belum ada {jenis.toLowerCase()} dikonfigurasi</p>
                        <p className="text-xs text-gray-400 mt-1">Tambahkan dari master data atau buat baru.</p>
                    </div>
                ) : (
                    items.map(item => (
                        <div key={item.id} className="relative group p-4 bg-white border border-gray-200 rounded-xl hover:border-emerald-400 hover:shadow-sm transition-all">
                            <div className="flex justify-between items-start">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className={`w-2 h-2 rounded-full ${colorClass}`}></div>
                                        <h4 className="font-medium text-gray-900 truncate" title={item.nama}>{item.nama}</h4>
                                    </div>
                                    {item.satuan && (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                                            {item.satuan}
                                        </span>
                                    )}
                                </div>
                                <button
                                    onClick={() => onRemove(item.masterItemId)}
                                    className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all p-1"
                                    title="Hapus material ini dari SEMUA produk"
                                >
                                    <XIcon />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {isCreateOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-gray-900">Buat Material Baru</h3>
                            <button
                                onClick={() => setIsCreateOpen(false)}
                                className="text-gray-400 hover:text-gray-500 transition-colors"
                            >
                                <LucideXIcon className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-5 overflow-y-auto flex-1 pr-1">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Nama Material</label>
                                <input
                                    value={createName}
                                    onChange={e => setCreateName(e.target.value)}
                                    className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                                    placeholder="Contoh: Dolomite"
                                    autoFocus
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 block">
                                    Produk yang Menggunakan
                                    <span className="ml-1 text-xs font-normal text-gray-500">(Pilih produk yang akan menggunakan material ini)</span>
                                </label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 border border-gray-200 rounded-lg p-3 max-h-48 overflow-y-auto bg-gray-50/50">
                                    {availableProducts.length === 0 ? (
                                        <div className="col-span-full text-center text-sm text-gray-400 py-4">
                                            Tidak ada produk lain dalam kategori ini.
                                        </div>
                                    ) : (
                                        availableProducts.map(prod => {
                                            const isSelected = selectedProductSlugs.includes(prod.slug);
                                            return (
                                                <div
                                                    key={prod.slug}
                                                    onClick={() => toggleProductSelection(prod.slug)}
                                                    className={`cursor-pointer flex items-center p-2 rounded-md border transition-all ${isSelected
                                                        ? 'bg-emerald-50 border-emerald-200 shadow-sm'
                                                        : 'bg-white border-gray-100 hover:border-gray-300'
                                                        }`}
                                                >
                                                    <div className={`w-4 h-4 rounded border flex items-center justify-center mr-3 transition-colors ${isSelected ? 'bg-emerald-500 border-emerald-500' : 'bg-white border-gray-300'
                                                        }`}>
                                                        {isSelected && <CheckIcon size={12} className="text-white" />}
                                                    </div>
                                                    <span className={`text-sm ${isSelected ? 'font-medium text-gray-900' : 'text-gray-600'}`}>
                                                        {prod.label}
                                                    </span>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                    <span className="text-gray-500">Material hanya akan tersedia untuk produk yang dipilih.</span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Satuan Default <span className="text-gray-400 font-normal">(Opsional)</span></label>
                                <input
                                    value={createUnit}
                                    onChange={e => setCreateUnit(e.target.value)}
                                    className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                                    placeholder="Contoh: Kg, Liter, Pcs"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-gray-100">
                            <button
                                onClick={() => setIsCreateOpen(false)}
                                className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 text-gray-700 transition-colors"
                            >
                                Batal
                            </button>
                            <button
                                onClick={handleCreateSubmit}
                                disabled={!createName.trim() || isCreating || selectedProductSlugs.length === 0}
                                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-emerald-200"
                            >
                                {isCreating ? (
                                    <>
                                        <div className="animate-spin h-4 w-4 border-2 border-white/50 border-t-white rounded-full"></div>
                                        Menyimpan...
                                    </>
                                ) : (
                                    'Simpan & Tambahkan'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
