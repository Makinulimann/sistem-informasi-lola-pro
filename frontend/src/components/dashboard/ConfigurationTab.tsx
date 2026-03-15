import { useState, useEffect, useCallback } from 'react';
import { masterItemService, MasterItem, ProductMaterial } from '@/lib/masterItemService';
import { sidebarService, SidebarMenu } from '@/lib/sidebarService';
import { PlusIcon, XIcon as LucideXIcon, InfoIcon, CheckIcon, PencilIcon, Trash2Icon, SearchIcon, AlertTriangleIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

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
            alert('Gagal menghapus material: ' + error);
        }
    };

    return (
        <div className="space-y-10 animate-in fade-in duration-500 pb-10">
            <MaterialTableSection
                title="Bahan Baku"
                description="Komponen utama untuk produksi (contoh: Dolomite, Gambut)."
                items={bakuList}
                jenis="Baku"
                productSlug={productSlug}
                onUpdate={fetchMaterials}
                onRemove={handleUnassign}
                colorTheme="emerald"
            />

            <MaterialTableSection
                title="Bahan Penolong"
                description="Bahan pelengkap dan kemasan (contoh: Botol, Stiker)."
                items={penolongList}
                jenis="Penolong"
                productSlug={productSlug}
                onUpdate={fetchMaterials}
                onRemove={handleUnassign}
                colorTheme="amber"
            />
        </div>
    );
}

interface MaterialTableSectionProps {
    title: string;
    description: string;
    items: ProductMaterial[];
    jenis: 'Baku' | 'Penolong';
    productSlug: string;
    onUpdate: () => void;
    onRemove: (id: number) => void;
    colorTheme: 'emerald' | 'amber';
}

function MaterialTableSection({ title, description, items, jenis, productSlug, onUpdate, onRemove, colorTheme }: MaterialTableSectionProps) {
    const [search, setSearch] = useState('');
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);

    // Edit State
    const [editId, setEditId] = useState<number | null>(null);
    const [editName, setEditName] = useState('');
    const [editUnit, setEditUnit] = useState('');
    const [isEditing, setIsEditing] = useState(false);

    // Filter items based on local search
    const filteredItems = items.filter(item =>
        item.nama.toLowerCase().includes(search.toLowerCase())
    );

    const openEditModal = (item: ProductMaterial) => {
        setEditId(item.masterItemId);
        setEditName(item.nama);
        setEditUnit(item.satuan || '');
        setIsEditOpen(true);
    };

    const handleEditSubmit = async () => {
        if (!editId || !editName.trim()) return;
        setIsEditing(true);
        try {
            await masterItemService.updateMasterItem(editId, editName, editUnit);
            setIsEditOpen(false);
            onUpdate();
        } catch (error) {
            console.error('Failed to update item:', error);
            alert('Gagal mengupdate material.');
        } finally {
            setIsEditing(false);
        }
    };

    const themeColors = {
        emerald: {
            bg: 'bg-emerald-50',
            text: 'text-emerald-700',
            border: 'border-emerald-200',
            btn: 'bg-emerald-600 hover:bg-emerald-700 text-white',
            icon: 'text-emerald-600',
            ring: 'focus:ring-emerald-500'
        },
        amber: {
            bg: 'bg-amber-50',
            text: 'text-amber-700',
            border: 'border-amber-200',
            btn: 'bg-amber-500 hover:bg-amber-600 text-white',
            icon: 'text-amber-600',
            ring: 'focus:ring-amber-500' // slightly different mapping but ok
        }
    };

    const theme = themeColors[colorTheme];

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Header Section */}
            <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-bold text-gray-900">{title}</h3>
                        <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full border", theme.bg, theme.text, theme.border)}>
                            {items.length} Item
                        </span>
                    </div>
                    <p className="text-sm text-gray-500">{description}</p>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder={`Cari ${jenis}...`}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all"
                        />
                    </div>
                    <button
                        onClick={() => setIsAddOpen(true)}
                        className={cn("flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm", theme.btn)}
                    >
                        <PlusIcon size={16} />
                        Tambah Data
                    </button>
                </div>
            </div>

            {/* Table Section */}
            <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse border border-gray-200">
                    <thead className="bg-gray-50/80">
                        <tr>
                            <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200 text-center w-16">No</th>
                            <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200 text-left">Nama Material</th>
                            <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200 text-left">Satuan Default</th>
                            <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200 text-right">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white">
                        {filteredItems.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-4 py-12 text-center text-gray-500 border border-gray-200">
                                    <div className="flex flex-col items-center justify-center">
                                        <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-3 text-gray-400">
                                            <InfoIcon size={20} />
                                        </div>
                                        <p className="font-medium text-gray-900 mb-1">Tidak ada data</p>
                                        <p className="text-xs text-gray-400">Belum ada material yang ditambahkan atau tidak cocok dengan pencarian.</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            filteredItems.map((item, index) => (
                                <tr key={item.id} className="group hover:bg-emerald-50/10 transition-colors">
                                    <td className="px-4 py-3 text-center text-gray-500 border border-gray-200">{index + 1}</td>
                                    <td className="px-4 py-3 border border-gray-200">
                                        <span className="font-medium text-gray-900">{item.nama}</span>
                                    </td>
                                    <td className="px-4 py-3 text-gray-600 border border-gray-200">
                                        {item.satuan ? (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-gray-100 border border-gray-200">
                                                {item.satuan}
                                            </span>
                                        ) : (
                                            <span className="text-gray-400 text-[11px] italic">Not set</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-right border border-gray-200">
                                        <div className="flex items-center justify-end gap-1 transition-opacity">
                                            <button
                                                onClick={() => openEditModal(item)}
                                                className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                                                title="Edit"
                                            >
                                                <PencilIcon size={14} />
                                            </button>
                                            <button
                                                onClick={() => onRemove(item.id)}
                                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                                title="Hapus dari Produk"
                                            >
                                                <Trash2Icon size={14} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modals */}
            {isAddOpen && (
                <AddMaterialModal
                    isOpen={isAddOpen}
                    onClose={() => setIsAddOpen(false)}
                    jenis={jenis}
                    productSlug={productSlug}
                    onSuccess={onUpdate}
                    colorTheme={colorTheme}
                />
            )}

            {isEditOpen && (
                <EditMaterialModal
                    isOpen={isEditOpen}
                    onClose={() => setIsEditOpen(false)}
                    initialData={{ id: editId!, name: editName, unit: editUnit }}
                    jenis={jenis}
                    productSlug={productSlug}
                    onSuccess={onUpdate}
                />
            )}
        </div>
    );
}

// ----------------------------------------------------------------------
// Edit Material Modal (With Product Integration)
// ----------------------------------------------------------------------

interface EditMaterialModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialData: { id: number, name: string, unit: string };
    jenis: 'Baku' | 'Penolong';
    productSlug: string;
    onSuccess: () => void;
}

function EditMaterialModal({ isOpen, onClose, initialData, jenis, productSlug, onSuccess }: EditMaterialModalProps) {
    const [name, setName] = useState(initialData.name);
    const [unit, setUnit] = useState(initialData.unit);
    const [isSaving, setIsSaving] = useState(false);

    // Integration State
    const [availableProducts, setAvailableProducts] = useState<{ label: string, slug: string }[]>([]);
    const [originalAssignments, setOriginalAssignments] = useState<string[]>([]);
    const [selectedProductSlugs, setSelectedProductSlugs] = useState<string[]>([]);
    const [isLoadingAssignments, setIsLoadingAssignments] = useState(true);

    // Initial load for products and assignments
    useEffect(() => {
        const loadData = async () => {
            setIsLoadingAssignments(true);
            try {
                // 1. Load Scope Products (Reused logic)
                const menus = await sidebarService.getAll();
                const products: { label: string, slug: string }[] = [];
                let currentL1Parent: SidebarMenu | undefined;
                const searchSlug = productSlug.replace(/-/g, '');

                for (const l1 of menus) {
                    if (l1.children) {
                        for (const l2 of l1.children) {
                            const bb = l2.children?.find(c => c.label === 'Bahan Baku');
                            if (bb && bb.href) {
                                const hrefSlug = bb.href.split('/').slice(-2)[0];
                                if (hrefSlug === productSlug || hrefSlug.replace(/-/g, '') === searchSlug) {
                                    currentL1Parent = l1;
                                    break;
                                }
                            }
                        }
                    }
                    if (currentL1Parent) break;
                }

                if (currentL1Parent && currentL1Parent.children) {
                    currentL1Parent.children.forEach(l2 => {
                        const bahanBakuChild = l2.children?.find(l3 => l3.label === 'Bahan Baku');
                        if (bahanBakuChild && bahanBakuChild.href) {
                            const parts = bahanBakuChild.href.split('/');
                            const slug = parts[parts.length - 2];
                            if (slug) products.push({ label: l2.label, slug: slug });
                        }
                    });
                }
                setAvailableProducts(products);

                // 2. Load Existing Assignments
                const assignments = await masterItemService.getMasterItemAssignments(initialData.id);
                // Filter only assignments of the SAME TYPE (jenis) to avoid confusion
                // e.g. If editing "Bahan Baku", only show "Bahan Baku" assignments.
                const currentTypeAssignments = assignments
                    .filter(a => a.jenis === jenis)
                    .map(a => a.productSlug);

                setOriginalAssignments(currentTypeAssignments);
                setSelectedProductSlugs(currentTypeAssignments);

            } catch (e) {
                console.error('Failed to load edit data:', e);
            } finally {
                setIsLoadingAssignments(false);
            }
        };
        if (isOpen) loadData();
    }, [isOpen, productSlug, initialData.id, jenis]);

    const toggleProductSelection = (slug: string) => {
        setSelectedProductSlugs(prev => prev.includes(slug) ? prev.filter(s => s !== slug) : [...prev, slug]);
    };

    const handleSubmit = async () => {
        if (!name.trim()) return;
        setIsSaving(true);
        try {
            // 1. Update Master Item details
            await masterItemService.updateMasterItem(initialData.id, name, unit);

            // 2. Handle Integration Changes
            // Find added
            const added = selectedProductSlugs.filter(slug => !originalAssignments.includes(slug));
            // Find removed
            const removed = originalAssignments.filter(slug => !selectedProductSlugs.includes(slug));

            // Execute assignments
            if (added.length > 0) {
                await Promise.all(added.map(slug =>
                    masterItemService.assignMaterial(slug, initialData.id, jenis)
                ));
            }

            // Execute unassignments
            if (removed.length > 0) {
                // Need to find ProductMaterial ID for these specific slugs + jenis + masterItemId
                // We re-fetch assignments to get correct IDs (safest way)
                const freshAssignments = await masterItemService.getMasterItemAssignments(initialData.id);
                const toRemoveIds = freshAssignments
                    .filter(a => removed.includes(a.productSlug) && a.jenis === jenis)
                    .map(a => a.id);

                await Promise.all(toRemoveIds.map(id =>
                    masterItemService.unassignMaterial(id)
                ));
            }

            onSuccess();
            onClose();
        } catch (error) {
            console.error('Failed to update item:', error);
            alert('Gagal mengupdate material.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-gray-900">Edit Material</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-500 transition-colors">
                        <LucideXIcon className="w-5 h-5" />
                    </button>
                </div>

                <div className="space-y-5 overflow-y-auto pr-2">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Nama Material</label>
                        <div className="relative">
                            <input
                                value={name}
                                onChange={e => setName(e.target.value)}
                                className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all pl-9"
                                autoFocus
                            />
                            <PencilIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        </div>
                    </div>

                    <div className="space-y-3 pt-2 border-t border-gray-100">
                        <label className="text-sm font-medium text-gray-700 flex justify-between items-center">
                            Integrasi Produk
                            <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                                {selectedProductSlugs.length} Dipilih
                            </span>
                        </label>

                        {isLoadingAssignments ? (
                            <div className="flex justify-center py-4"><div className="animate-spin h-5 w-5 border-2 border-emerald-500 border-t-transparent rounded-full" /></div>
                        ) : (
                            <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto p-2 space-y-1 bg-gray-50/50">
                                {availableProducts.map(prod => {
                                    const isSelected = selectedProductSlugs.includes(prod.slug);
                                    return (
                                        <div
                                            key={prod.slug}
                                            onClick={() => toggleProductSelection(prod.slug)}
                                            className={cn(
                                                "flex items-center gap-3 p-2 rounded-md cursor-pointer text-sm transition-all select-none",
                                                isSelected ? "bg-emerald-50 text-emerald-900 font-medium border border-emerald-100 shadow-sm" : "hover:bg-gray-100 text-gray-600 border border-transparent"
                                            )}
                                        >
                                            <div className={cn("w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0", isSelected ? "bg-emerald-500 border-emerald-500" : "border-gray-300 bg-white")}>
                                                {isSelected && <CheckIcon size={12} className="text-white" />}
                                            </div>
                                            <span className="truncate">{prod.label}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                        <p className="text-xs text-gray-400">Material ini bisa digunakan oleh produk lain dalam satu departemen.</p>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-gray-100">
                        <label className="text-sm font-medium text-gray-700">Satuan Default</label>
                        <SelectUnit value={unit} onChange={setUnit} />
                        <p className="text-xs text-gray-400">Perhatian: Merubah satuan akan mempengaruhi semua produk terkait.</p>
                    </div>
                </div>

                <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
                    <button onClick={onClose} className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 text-gray-700 transition-colors">Batal</button>
                    <button onClick={handleSubmit} disabled={!name.trim() || isSaving} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 shadow-sm">
                        {isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
                    </button>
                </div>
            </div>
        </div>
    );
}


// ----------------------------------------------------------------------
// Add Material Modal (Includes Master Search & Deletion)
// ----------------------------------------------------------------------

interface AddMaterialModalProps {
    isOpen: boolean;
    onClose: () => void;
    jenis: 'Baku' | 'Penolong';
    productSlug: string;
    onSuccess: () => void;
    colorTheme: 'emerald' | 'amber';
}

function AddMaterialModal({ isOpen, onClose, jenis, productSlug, onSuccess, colorTheme }: AddMaterialModalProps) {
    const [search, setSearch] = useState('');
    const [searchResults, setSearchResults] = useState<MasterItem[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    // Create Mode
    const [isCreateMode, setIsCreateMode] = useState(false);
    const [createName, setCreateName] = useState('');
    const [createUnit, setCreateUnit] = useState('');
    const [availableProducts, setAvailableProducts] = useState<{ label: string, slug: string }[]>([]);
    const [selectedProductSlugs, setSelectedProductSlugs] = useState<string[]>([]);
    const [isCreating, setIsCreating] = useState(false);

    // Initial load for products (scope)
    useEffect(() => {
        const loadProducts = async () => {
            try {
                // Get all sidebar menus to find products (reused logic)
                const menus = await sidebarService.getAll();
                const products: { label: string, slug: string }[] = [];
                let currentL1Parent: SidebarMenu | undefined;
                const searchSlug = productSlug.replace(/-/g, '');

                // Logic to find sibling products in the same category
                // (Simplified for brevity, assuming standard structure)
                for (const l1 of menus) {
                    if (l1.children) {
                        for (const l2 of l1.children) {
                            const bb = l2.children?.find(c => c.label === 'Bahan Baku');
                            if (bb && bb.href) {
                                const hrefSlug = bb.href.split('/').slice(-2)[0];
                                if (hrefSlug === productSlug || hrefSlug.replace(/-/g, '') === searchSlug) {
                                    currentL1Parent = l1;
                                    break;
                                }
                            }
                        }
                    }
                    if (currentL1Parent) break;
                }

                if (currentL1Parent && currentL1Parent.children) {
                    currentL1Parent.children.forEach(l2 => {
                        const bahanBakuChild = l2.children?.find(l3 => l3.label === 'Bahan Baku');
                        if (bahanBakuChild && bahanBakuChild.href) {
                            const parts = bahanBakuChild.href.split('/');
                            const slug = parts[parts.length - 2];
                            if (slug) products.push({ label: l2.label, slug: slug });
                        }
                    });
                }

                setAvailableProducts(products);
                const currentCanonical = products.find(p => p.slug === productSlug || p.slug.replace(/-/g, '') === productSlug.replace(/-/g, ''));
                if (currentCanonical) {
                    setSelectedProductSlugs([currentCanonical.slug]);
                } else {
                    setSelectedProductSlugs([productSlug]);
                }
            } catch (e) {
                console.error('Failed to load products for scope:', e);
            }
        };
        if (isOpen) loadProducts();
    }, [isOpen, productSlug]);

    // Search Effect
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (search.trim().length >= 1) {
                setIsSearching(true);
                try {
                    const results = await masterItemService.searchMasterItems(search, productSlug);
                    setSearchResults(results);
                } catch (error) {
                    console.error(error);
                } finally {
                    setIsSearching(false);
                }
            } else {
                setSearchResults([]);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [search, productSlug]);

    const handleSelect = async (item: MasterItem) => {
        try {
            await masterItemService.assignMaterial(productSlug, item.id, jenis);
            onSuccess();
            onClose();
        } catch (error) {
            alert('Gagal menambahkan material: ' + error);
        }
    };

    const handleDeleteMaster = async (item: MasterItem, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm(`PERINGATAN: Anda akan menghapus Master Item "${item.nama}" dari sistem.\n\nItem ini akan hilang dari pencarian untuk SEMUA produk.\nApakah Anda yakin?`)) return;

        try {
            await masterItemService.deleteMasterItem(item.id);
            setSearchResults(prev => prev.filter(p => p.id !== item.id));
        } catch (error) {
            alert('Gagal menghapus master item. Mungkin item sedang digunakan oleh produk lain.');
        }
    };

    const handleCreateSubmit = async () => {
        if (!createName.trim()) return;
        setIsCreating(true);
        try {
            let scopeSlug: string | null = null;
            if (selectedProductSlugs.length === 1) scopeSlug = selectedProductSlugs[0];

            const newItem = await masterItemService.createMasterItem(createName, createUnit, scopeSlug);
            await Promise.all(selectedProductSlugs.map(slug =>
                masterItemService.assignMaterial(slug, newItem.id, jenis)
            ));

            onSuccess();
            onClose();
        } catch (error) {
            console.error('Failed to create item:', error);
            alert('Gagal membuat material baru.');
        } finally {
            setIsCreating(false);
        }
    };

    const toggleProductSelection = (slug: string) => {
        setSelectedProductSlugs(prev => prev.includes(slug) ? prev.filter(s => s !== slug) : [...prev, slug]);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-gray-900">
                        {isCreateMode ? 'Buat Material Baru' : `Tambah ${jenis}`}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-500 transition-colors">
                        <LucideXIcon className="w-5 h-5" />
                    </button>
                </div>

                {!isCreateMode ? (
                    <div className="flex flex-col h-full overflow-hidden">
                        <div className="relative mb-4">
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Cari material..."
                                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                                autoFocus
                            />
                            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        </div>

                        <div className="flex-1 overflow-y-auto min-h-[200px]">
                            {isSearching ? (
                                <div className="flex justify-center py-8"><div className="animate-spin h-6 w-6 border-2 border-emerald-500 border-t-transparent rounded-full" /></div>
                            ) : searchResults.length > 0 ? (
                                <div className="space-y-1">
                                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">Hasil Pencarian</p>
                                    {searchResults.map(item => (
                                        <div key={item.id} className="flex items-center gap-2 group">
                                            <button
                                                onClick={() => handleSelect(item)}
                                                className="flex-1 text-left px-4 py-3 hover:bg-emerald-50 rounded-lg text-sm flex justify-between items-center transition-colors border border-transparent hover:border-emerald-100"
                                            >
                                                <div>
                                                    <span className="font-medium text-gray-900 block">{item.nama}</span>
                                                    {item.satuanDefault && <span className="text-xs text-gray-500">{item.satuanDefault}</span>}
                                                </div>
                                                <PlusIcon size={16} className="text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </button>

                                            {/* DELETE MASTER ITEM BUTTON */}
                                            <button
                                                onClick={(e) => handleDeleteMaster(item, e)}
                                                className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                                title="Hapus Master Item ini dari sistem"
                                            >
                                                <Trash2Icon size={16} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : search.length > 1 ? (
                                <div className="text-center py-8">
                                    <p className="text-gray-500 text-sm mb-4">Material tidak ditemukan.</p>
                                    <button
                                        onClick={() => {
                                            setCreateName(search);
                                            setIsCreateMode(true);
                                        }}
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium"
                                    >
                                        <PlusIcon size={16} />
                                        Buat data baru "{search}"
                                    </button>
                                </div>
                            ) : (
                                <div className="text-center py-12 text-gray-400 text-sm">
                                    Ketik nama material untuk mencari...
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    // CREATE FORM
                    <div className="flex flex-col h-full overflow-hidden">
                        <div className="space-y-4 overflow-y-auto flex-1 pr-2">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Nama Material</label>
                                <input
                                    value={createName}
                                    onChange={e => setCreateName(e.target.value)}
                                    className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Produk yang Menggunakan</label>
                                <div className="border border-gray-200 rounded-lg max-h-40 overflow-y-auto p-2 space-y-1">
                                    {availableProducts.map(prod => (
                                        <div
                                            key={prod.slug}
                                            onClick={() => toggleProductSelection(prod.slug)}
                                            className={cn(
                                                "flex items-center gap-3 p-2 rounded-md cursor-pointer text-sm transition-colors",
                                                selectedProductSlugs.includes(prod.slug) ? "bg-emerald-50 text-emerald-900 font-medium" : "hover:bg-gray-50 text-gray-700"
                                            )}
                                        >
                                            <div className={cn("w-4 h-4 rounded border flex items-center justify-center transition-colors", selectedProductSlugs.includes(prod.slug) ? "bg-emerald-500 border-emerald-500" : "border-gray-300 bg-white")}>
                                                {selectedProductSlugs.includes(prod.slug) && <CheckIcon size={12} className="text-white" />}
                                            </div>
                                            {prod.label}
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Satuan Default <span className="text-red-500">*</span></label>
                                <SelectUnit value={createUnit} onChange={setCreateUnit} />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
                            <button onClick={() => setIsCreateMode(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 text-gray-700 transition-colors">
                                Kembali
                            </button>
                            <button onClick={handleCreateSubmit} disabled={isCreating || !createName || !createUnit} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50">
                                {isCreating ? 'Menyimpan...' : 'Simpan'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function SelectUnit({ value, onChange }: { value: string, onChange: (val: string) => void }) {
    return (
        <select
            value={value}
            onChange={e => onChange(e.target.value)}
            className="flex h-10 w-full rounded-lg border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all border-gray-300"
        >
            <option value="" disabled>Pilih satuan...</option>
            <optgroup label="Massa">
                <option value="Ton">Ton</option>
                <option value="Kwintal">Kwintal</option>
                <option value="Kg">Kilogram (Kg)</option>
                <option value="Gram">Gram</option>
                <option value="mg">Miligram (mg)</option>
            </optgroup>
            <optgroup label="Volume">
                <option value="KL">Kiloliter (KL)</option>
                <option value="Liter">Liter (L)</option>
                <option value="mL">Mililiter (mL)</option>
            </optgroup>
            <optgroup label="Satuan Lainnya">
                <option value="Pcs">Pieces (Pcs)</option>
                <option value="Lusin">Lusin</option>
                <option value="Karton">Karton</option>
                <option value="Drum">Drum</option>
                <option value="Sak">Sak</option>
            </optgroup>
            <optgroup label="Panjang">
                <option value="Meter">Meter (m)</option>
                <option value="cm">Sentimeter (cm)</option>
                <option value="mm">Milimeter (mm)</option>
            </optgroup>
        </select>
    );
}

