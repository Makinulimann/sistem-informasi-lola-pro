'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    Plus,
    Pencil,
    Trash2,
    Package,
    Search,
    ToggleLeft,
    ToggleRight,
    Loader2,
    FolderTree,
    ExternalLink,
    AlertTriangle,
    Upload,
} from 'lucide-react';
import { sidebarService, SidebarMenu } from '@/lib/sidebarService';
import { AppButton } from '@/components/ui/app-button';
import { AppModal } from '@/components/ui/app-modal';
import { ConfirmModal } from '@/components/ui/confirm-modal';

/* ═══════════════════════════════════════════════════════════════
   Types & Helpers
   ═══════════════════════════════════════════════════════════════ */

interface Product {
    id: number;
    label: string;
    slug: string;
    isActive: boolean;
    order: number;
    imageUrl?: string | null;
    satuan?: string | null;
    children: { id: number; label: string; href: string; isActive: boolean }[];
}

const slugify = (text: string) =>
    text.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

const DEFAULT_SUB_PAGES = ['Bahan Baku', 'Produksi', 'Analisa'];

/* ═══════════════════════════════════════════════════════════════
   Main Page Component
   ═══════════════════════════════════════════════════════════════ */

export default function ManajemenProdukPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [parentMenuId, setParentMenuId] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');

    // Modal State
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);

    // Delete State
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [productToDelete, setProductToDelete] = useState<Product | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    /* ─── Data Loading ─── */

    const loadProducts = useCallback(async () => {
        setIsLoading(true);
        try {
            const allMenus = await sidebarService.getAllFlat();

            // Find "Produk Pengembangan" parent (Level 1)
            const produkPengembangan = allMenus.find(
                (m) => m.label === 'Produk Pengembangan' && !m.parentId
            );

            if (!produkPengembangan) {
                setProducts([]);
                setIsLoading(false);
                return;
            }

            setParentMenuId(produkPengembangan.id);

            // Get Level 2 children (products)
            const level2 = allMenus.filter(
                (m) => m.parentId === produkPengembangan.id
            );

            // Build products with their L3 children
            const productList: Product[] = level2
                .filter((l2) => {
                    // Only include items that have children (actual products),
                    // not standalone pages like "Aktivitas Harian"
                    const hasChildren = allMenus.some((m) => m.parentId === l2.id);
                    return hasChildren;
                })
                .sort((a, b) => a.order - b.order)
                .map((l2) => {
                    const children = allMenus
                        .filter((m) => m.parentId === l2.id)
                        .sort((a, b) => a.order - b.order)
                        .map((child) => ({
                            id: child.id,
                            label: child.label,
                            href: child.href,
                            isActive: child.isActive,
                        }));

                    // Extract slug from children's href
                    const firstChildHref = children[0]?.href || '';
                    const hrefParts = firstChildHref.split('/');
                    const slug = hrefParts.length >= 4 ? hrefParts[hrefParts.length - 2] : slugify(l2.label);

                    return {
                        id: l2.id,
                        label: l2.label,
                        slug,
                        isActive: l2.isActive,
                        order: l2.order,
                        imageUrl: l2.imageUrl,
                        satuan: l2.satuan,
                        children,
                    };
                });

            setProducts(productList);
        } catch (err) {
            console.error('Failed to load products:', err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadProducts();
        ensureMenuEntry();
    }, [loadProducts]);

    /* ─── Auto-seed "Manajemen Produk" in sidebar_menus ─── */

    const ensureMenuEntry = async () => {
        try {
            const allMenus = await sidebarService.getAllFlat();
            const portalAdmin = allMenus.find(
                (m) => m.label === 'Portal Admin' && !m.parentId
            );
            if (!portalAdmin) return;

            const exists = allMenus.find(
                (m) => m.label === 'Manajemen Produk' && m.parentId === portalAdmin.id
            );
            if (exists) return;

            // Find order for insertion (after existing children)
            const siblings = allMenus.filter((m) => m.parentId === portalAdmin.id);
            const maxOrder = siblings.length > 0 ? Math.max(...siblings.map((s) => s.order)) : 0;

            await sidebarService.create({
                label: 'Manajemen Produk',
                icon: '',
                href: '/dashboard/admin/products',
                parentId: portalAdmin.id,
                order: maxOrder + 1,
                isActive: true,
                roleAccess: 'Admin',
            });
        } catch (err) {
            // Silently ignore — menu may already exist
            console.error('Auto-seed menu check failed:', err);
        }
    };

    /* ─── Toggle Active ─── */

    const handleToggleActive = async (product: Product) => {
        const newStatus = !product.isActive;

        // Optimistic update
        setProducts((prev) =>
            prev.map((p) => (p.id === product.id ? { ...p, isActive: newStatus } : p))
        );

        try {
            await sidebarService.update(product.id, {
                id: product.id,
                label: product.label,
                isActive: newStatus,
            } as SidebarMenu);
        } catch (err) {
            console.error('Failed to toggle:', err);
            // Revert
            setProducts((prev) =>
                prev.map((p) => (p.id === product.id ? { ...p, isActive: product.isActive } : p))
            );
        }
    };

    /* ─── Delete ─── */

    const handleDeleteConfirm = async () => {
        if (!productToDelete) return;
        setIsDeleting(true);
        try {
            await sidebarService.delete(productToDelete.id);
            setIsDeleteOpen(false);
            setProductToDelete(null);
            loadProducts();
        } catch (err) {
            console.error('Failed to delete product:', err);
            alert('Gagal menghapus produk.');
        } finally {
            setIsDeleting(false);
        }
    };

    /* ─── Filtered List ─── */

    const filteredProducts = products.filter((p) =>
        p.label.toLowerCase().includes(search.toLowerCase()) ||
        p.slug.toLowerCase().includes(search.toLowerCase())
    );

    /* ─── Render ─── */

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px] bg-gray-50">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
                    <p className="text-sm text-gray-500">Memuat data produk...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        Manajemen Produk
                    </h1>
                    <p className="text-gray-500 mt-1 ">
                        Kelola produk yang ditampilkan di menu Produk Pengembangan.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="bg-white px-4 py-2 border border-gray-200 text-sm text-gray-600">
                        Total Produk: <span className="font-semibold text-emerald-600">{products.length}</span>
                    </div>
                    <AppButton
                        variant="primary"
                        onClick={() => setIsAddOpen(true)}
                        icon={<Plus className="w-4 h-4" />}
                    >
                        Tambah Produk
                    </AppButton>
                </div>
            </div>

            {/* Search Bar */}
            <div className="bg-white p-4 border border-gray-200">
                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Cari produk berdasarkan nama atau slug..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                    />
                </div>
            </div>

            {/* Product Table */}
            <div className="bg-white border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50/80 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-4 font-semibold text-gray-700 text-center w-16">No</th>
                                <th className="px-6 py-4 font-semibold text-gray-700">Nama Produk</th>
                                <th className="px-6 py-4 font-semibold text-gray-700">Slug</th>
                                <th className="px-6 py-4 font-semibold text-gray-700">Sub Halaman</th>
                                <th className="px-6 py-4 font-semibold text-gray-700 text-center">Status</th>
                                <th className="px-6 py-4 font-semibold text-gray-700 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredProducts.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-16 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center">
                                                <Package className="w-6 h-6 text-gray-400" />
                                            </div>
                                            <p className="font-medium text-gray-700">Tidak ada produk ditemukan</p>
                                            <p className="text-xs text-gray-400">
                                                {search ? 'Coba ubah kata kunci pencarian.' : 'Klik "Tambah Produk" untuk menambahkan produk baru.'}
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredProducts.map((product, index) => (
                                    <tr key={product.id} className="group hover:bg-emerald-50/30 transition-colors">
                                        <td className="px-6 py-4 text-center text-gray-500">{index + 1}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 bg-emerald-100 text-emerald-600 flex items-center justify-center font-semibold text-sm shrink-0 overflow-hidden rounded-md border border-gray-200">
                                                    {product.imageUrl ? (
                                                        <img src={product.imageUrl} alt={product.label} className="w-full h-full object-cover" />
                                                    ) : (
                                                        product.label.charAt(0).toUpperCase()
                                                    )}
                                                </div>
                                                <div>
                                                    <span className="font-medium text-gray-900 block">{product.label}</span>
                                                    <div className="flex items-center gap-1.5 mt-0.5">
                                                        {product.satuan && (
                                                            <span className="text-[10px] text-emerald-600 font-medium bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                                                                {product.satuan}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <code className="text-xs bg-gray-100 text-gray-600 px-2 py-1 border border-gray-200 font-mono">
                                                {product.slug}
                                            </code>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-wrap gap-1.5">
                                                {product.children.map((child) => (
                                                    <span
                                                        key={child.id}
                                                        className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-100"
                                                    >
                                                        {child.label}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <button
                                                onClick={() => handleToggleActive(product)}
                                                className="inline-flex items-center gap-1.5 transition-colors"
                                                title={product.isActive ? 'Klik untuk nonaktifkan' : 'Klik untuk aktifkan'}
                                            >
                                                {product.isActive ? (
                                                    <>
                                                        <ToggleRight className="w-6 h-6 text-emerald-500" />
                                                        <span className="text-xs font-medium text-emerald-600">Aktif</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <ToggleLeft className="w-6 h-6 text-gray-400" />
                                                        <span className="text-xs font-medium text-gray-400">Nonaktif</span>
                                                    </>
                                                )}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <button
                                                    onClick={() => {
                                                        setEditingProduct(product);
                                                        setIsEditOpen(true);
                                                    }}
                                                    className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                                                    title="Edit Produk"
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setProductToDelete(product);
                                                        setIsDeleteOpen(true);
                                                    }}
                                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                                    title="Hapus Produk"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add Product Modal */}
            {isAddOpen && (
                <AddProductModal
                    isOpen={isAddOpen}
                    onClose={() => setIsAddOpen(false)}
                    parentMenuId={parentMenuId}
                    existingSlugs={products.map((p) => p.slug)}
                    onSuccess={loadProducts}
                />
            )}

            {/* Edit Product Modal */}
            {isEditOpen && editingProduct && (
                <EditProductModal
                    isOpen={isEditOpen}
                    onClose={() => {
                        setIsEditOpen(false);
                        setEditingProduct(null);
                    }}
                    product={editingProduct}
                    existingSlugs={products.filter((p) => p.id !== editingProduct.id).map((p) => p.slug)}
                    onSuccess={loadProducts}
                />
            )}

            {/* Delete Confirmation */}
            <ConfirmModal
                isOpen={isDeleteOpen}
                onClose={() => {
                    setIsDeleteOpen(false);
                    setProductToDelete(null);
                }}
                onConfirm={handleDeleteConfirm}
                title="Hapus Produk"
                message={`Apakah Anda yakin ingin menghapus produk "${productToDelete?.label}"? Semua sub-halaman (Bahan Baku, Produksi, Analisa) akan ikut terhapus dari sidebar. Tindakan ini tidak dapat dibatalkan.`}
                confirmText="Ya, Hapus Produk"
                cancelText="Batal"
                variant="danger"
                isLoading={isDeleting}
            />
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════
   Add Product Modal
   ═══════════════════════════════════════════════════════════════ */

interface AddProductModalProps {
    isOpen: boolean;
    onClose: () => void;
    parentMenuId: number | null;
    existingSlugs: string[];
    onSuccess: () => void;
}

function AddProductModal({ isOpen, onClose, parentMenuId, existingSlugs, onSuccess }: AddProductModalProps) {
    const [name, setName] = useState('');
    const [slug, setSlug] = useState('');
    const [isSlugManual, setIsSlugManual] = useState(false);
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [satuan, setSatuan] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');

    // Auto-generate slug from name
    useEffect(() => {
        if (!isSlugManual) {
            setSlug(slugify(name));
        }
    }, [name, isSlugManual]);

    const slugConflict = existingSlugs.includes(slug);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        setError('');

        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch('/api/products/upload', {
                method: 'POST',
                body: formData,
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.message || 'Gagal mengunggah gambar');
            }

            const data = await res.json();
            setImageUrl(data.url);
        } catch (err: any) {
            console.error('Image upload failed:', err);
            setError(err.message || 'Gagal mengunggah gambar.');
        } finally {
            setIsUploading(false);
        }
    };

    const handleSubmit = async () => {
        if (!name.trim() || !slug.trim() || !parentMenuId) return;
        if (slugConflict) {
            setError('Slug ini sudah digunakan oleh produk lain.');
            return;
        }

        setIsSaving(true);
        setError('');
        try {
            const basePath = `/dashboard/produk-pengembangan/${slug}`;

            // Get next order among actual product siblings (exclude general pages order >= 1000)
            const allMenus = await sidebarService.getAllFlat();
            const siblings = allMenus.filter((m) => m.parentId === parentMenuId);
            const productSiblings = siblings.filter((s) => s.order < 1000);
            const maxOrder = productSiblings.length > 0 ? Math.max(...productSiblings.map((s) => s.order)) : 0;

            // Create L2 menu with L3 children
            await sidebarService.createWithChildren({
                label: name.trim(),
                icon: '',
                href: '#',
                parentId: parentMenuId,
                order: maxOrder + 1,
                roleAccess: 'Admin,VP,KPP',
                imageUrl,
                satuan: satuan.trim() || null,
                children: DEFAULT_SUB_PAGES.map((label) => ({
                    label,
                    icon: '',
                    href: `${basePath}/${slugify(label)}`,
                })),
            });

            onSuccess();
            onClose();
        } catch (err: any) {
            console.error('Failed to create product:', err);
            setError(err?.message || 'Gagal menambahkan produk.');
        } finally {
            setIsSaving(false);
        }
    };

    const footer = (
        <>
            <AppButton variant="secondary" onClick={onClose}>Batal</AppButton>
            <AppButton
                variant="primary"
                onClick={handleSubmit}
                disabled={!name.trim() || !slug.trim() || slugConflict || isSaving || isUploading}
                loading={isSaving}
            >
                {isSaving ? 'Menyimpan...' : 'Tambah Produk'}
            </AppButton>
        </>
    );

    return (
        <AppModal isOpen={isOpen} onClose={onClose} title="Tambah Produk Baru" footer={footer}>
            <div className="space-y-5">
                {error && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 text-red-700 text-sm">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        {error}
                    </div>
                )}

                {/* Product Name */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                        Nama Produk <span className="text-red-500">*</span>
                    </label>
                    <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Contoh: Phonska Plus"
                        className="flex h-10 w-full border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                        autoFocus
                    />
                </div>

                {/* Product Image */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Gambar Produk</label>
                    <div className="flex items-center gap-4">
                        <div className="w-20 h-20 bg-gray-100 border border-dashed border-gray-300 flex items-center justify-center overflow-hidden rounded-md relative group">
                            {imageUrl ? (
                                <>
                                    <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                                    <button
                                        type="button"
                                        onClick={() => setImageUrl(null)}
                                        className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white rounded-md"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </>
                            ) : isUploading ? (
                                <Loader2 className="w-6 h-6 text-emerald-600 animate-spin" />
                            ) : (
                                <Package className="w-8 h-8 text-gray-400" />
                            )}
                        </div>
                        <div className="flex-1">
                            <label className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors shadow-sm">
                                <Upload className="w-4 h-4" />
                                <span>Pilih File</span>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                    className="hidden"
                                    disabled={isUploading}
                                />
                            </label>
                            <p className="text-xs text-gray-400 mt-1.5">Maksimal 5MB. Format gambar (PNG, JPG, WebP).</p>
                        </div>
                    </div>
                </div>

                {/* Unit (Satuan) */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Satuan Default</label>
                    <select
                        value={satuan}
                        onChange={(e) => setSatuan(e.target.value)}
                        className="flex h-10 w-full border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                    >
                        <option value="">Pilih Satuan...</option>
                        <option value="Kg">Padat (Kg)</option>
                        <option value="Liter">Cair (L)</option>
                    </select>
                </div>

                {/* Slug */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 flex items-center justify-between">
                        <span>
                            Slug URL <span className="text-red-500">*</span>
                        </span>
                        <button
                            type="button"
                            onClick={() => {
                                // Enable manual edit
                                setIsSlugManual(!isSlugManual);
                                if (isSlugManual) setSlug(slugify(name));
                            }}
                            className="text-xs text-emerald-600 hover:text-emerald-700"
                        >
                            {isSlugManual ? 'Auto-generate' : 'Edit manual'}
                        </button>
                    </label>
                    <input
                        value={slug}
                        onChange={(e) => {
                            setIsSlugManual(true);
                            setSlug(slugify(e.target.value));
                        }}
                        disabled={!isSlugManual}
                        className={`flex h-10 w-full border px-3 py-2 text-sm font-mono transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500
                            ${isSlugManual ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50 text-gray-500'}
                            ${slugConflict ? 'border-red-300 bg-red-50 ring-1 ring-red-200' : ''}`}
                    />
                    {slugConflict && (
                        <p className="text-xs text-red-500 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            Slug ini sudah digunakan oleh produk lain.
                        </p>
                    )}
                    {slug && !slugConflict && (
                        <p className="text-xs text-gray-400">
                            URL: /dashboard/produk-pengembangan/<span className="font-medium text-gray-600">{slug}</span>/bahan-baku
                        </p>
                    )}
                </div>

                {/* Preview */}
                <div className="space-y-2 pt-2 border-t border-gray-100">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <FolderTree className="w-4 h-4 text-gray-400" />
                        Sub-halaman yang akan dibuat
                    </label>
                    <div className="bg-gray-50 border border-gray-200 p-3 space-y-2">
                        {DEFAULT_SUB_PAGES.map((page) => (
                            <div key={page} className="flex items-center gap-2 text-sm">
                                <ExternalLink className="w-3.5 h-3.5 text-emerald-500" />
                                <span className="text-gray-700">{page}</span>
                                <span className="text-xs text-gray-400 font-mono">
                                    /{slug}/{slugify(page)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </AppModal>
    );
}

/* ═══════════════════════════════════════════════════════════════
   Edit Product Modal
   ═══════════════════════════════════════════════════════════════ */

interface EditProductModalProps {
    isOpen: boolean;
    onClose: () => void;
    product: Product;
    existingSlugs: string[];
    onSuccess: () => void;
}

function EditProductModal({ isOpen, onClose, product, existingSlugs, onSuccess }: EditProductModalProps) {
    const [name, setName] = useState(product.label);
    const [imageUrl, setImageUrl] = useState<string | null>(product.imageUrl || null);
    const [satuan, setSatuan] = useState(product.satuan || '');
    const [isUploading, setIsUploading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        setError('');

        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch('/api/products/upload', {
                method: 'POST',
                body: formData,
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.message || 'Gagal mengunggah gambar');
            }

            const data = await res.json();
            setImageUrl(data.url);
        } catch (err: any) {
            console.error('Image upload failed:', err);
            setError(err.message || 'Gagal mengunggah gambar.');
        } finally {
            setIsUploading(false);
        }
    };

    const handleSubmit = async () => {
        if (!name.trim()) return;

        setIsSaving(true);
        setError('');
        try {
            // Update L2 menu details
            await sidebarService.update(product.id, {
                id: product.id,
                label: name.trim(),
                isActive: product.isActive,
                imageUrl,
                satuan: satuan.trim() || null,
            } as SidebarMenu);

            onSuccess();
            onClose();
        } catch (err: any) {
            console.error('Failed to update product:', err);
            setError(err?.message || 'Gagal mengupdate produk.');
        } finally {
            setIsSaving(false);
        }
    };

    const hasChanges = name.trim() !== product.label ||
        imageUrl !== product.imageUrl ||
        satuan !== (product.satuan || '');

    const footer = (
        <>
            <AppButton variant="secondary" onClick={onClose}>Batal</AppButton>
            <AppButton
                variant="primary"
                onClick={handleSubmit}
                disabled={!name.trim() || !hasChanges || isSaving || isUploading}
                loading={isSaving}
            >
                {isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
            </AppButton>
        </>
    );

    return (
        <AppModal isOpen={isOpen} onClose={onClose} title="Edit Produk" footer={footer}>
            <div className="space-y-5">
                {error && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 text-red-700 text-sm">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        {error}
                    </div>
                )}

                {/* Product Name */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                        Nama Produk <span className="text-red-500">*</span>
                    </label>
                    <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="flex h-10 w-full border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                        autoFocus
                    />
                </div>

                {/* Product Image */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Gambar Produk</label>
                    <div className="flex items-center gap-4">
                        <div className="w-20 h-20 bg-gray-100 border border-dashed border-gray-300 flex items-center justify-center overflow-hidden rounded-md relative group">
                            {imageUrl ? (
                                <>
                                    <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                                    <button
                                        type="button"
                                        onClick={() => setImageUrl(null)}
                                        className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white rounded-md"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </>
                            ) : isUploading ? (
                                <Loader2 className="w-6 h-6 text-emerald-600 animate-spin" />
                            ) : (
                                <Package className="w-8 h-8 text-gray-400" />
                            )}
                        </div>
                        <div className="flex-1">
                            <label className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors shadow-sm">
                                <Upload className="w-4 h-4" />
                                <span>Pilih File</span>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                    className="hidden"
                                    disabled={isUploading}
                                />
                            </label>
                            <p className="text-xs text-gray-400 mt-1.5">Maksimal 5MB. Format gambar (PNG, JPG, WebP).</p>
                        </div>
                    </div>
                </div>

                {/* Unit (Satuan) */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Satuan Default</label>
                    <select
                        value={satuan}
                        onChange={(e) => setSatuan(e.target.value)}
                        className="flex h-10 w-full border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                    >
                        <option value="">Pilih Satuan...</option>
                        <option value="Kg">Padat (Kg)</option>
                        <option value="Liter">Cair (L)</option>
                    </select>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Slug URL</label>
                    <input
                        value={product.slug}
                        disabled
                        className="flex h-10 w-full border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-500 font-mono"
                    />
                    <p className="text-xs text-gray-400">
                        Slug tidak dapat diubah setelah produk dibuat untuk menjaga integritas data.
                    </p>
                </div>

                {/* Current sub-pages */}
                <div className="space-y-2 pt-2 border-t border-gray-100">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <FolderTree className="w-4 h-4 text-gray-400" />
                        Sub-halaman saat ini
                    </label>
                    <div className="bg-gray-50 border border-gray-200 p-3 space-y-2">
                        {product.children.map((child) => (
                            <div key={child.id} className="flex items-center gap-2 text-sm">
                                <ExternalLink className="w-3.5 h-3.5 text-emerald-500" />
                                <span className="text-gray-700">{child.label}</span>
                                <span className="text-xs text-gray-400 font-mono">{child.href}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </AppModal>
    );
}
