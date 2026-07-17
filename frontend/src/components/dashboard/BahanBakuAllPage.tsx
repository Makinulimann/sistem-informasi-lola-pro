'use client';

import { useState, useMemo, useEffect, useCallback, Fragment } from 'react';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { SuplaiModal } from './SuplaiModal';
import { MutasiModal } from './MutasiModal';
import { ConfigurationTab } from './ConfigurationTab';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { bahanBakuService, BahanBaku, BalanceStokRow } from '@/lib/bahanBakuService';
import { sidebarService, SidebarMenu } from '@/lib/sidebarService';
import { masterItemService } from '@/lib/masterItemService';
import { PencilIcon, Trash2Icon as TrashIcon, FilterIcon, PackageIcon } from 'lucide-react';
import { AppSearchBar } from '@/components/ui/app-search-bar';
import { AppPagination } from '@/components/ui/app-pagination';
import { AppButton } from '@/components/ui/app-button';
import { AppPeriodFilter } from '@/components/ui/app-period-filter';

/* ─── Types ─── */

type TabKey = 'suplai' | 'mutasi' | 'balance-stok' | 'konfigurasi';

interface ProductInfo {
    label: string;
    slug: string;
}

/** Format number with locale-aware thousand separators */
const fmtNumber = (n: number | null | undefined) => Number(n || 0).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtInteger = (n: number | null | undefined) => Number(n || 0).toLocaleString('id-ID');

const tabs: { key: TabKey; label: string }[] = [
    { key: 'suplai', label: 'Suplai' },
    { key: 'mutasi', label: 'Mutasi' },
    { key: 'balance-stok', label: 'Balance Stok' },
    { key: 'konfigurasi', label: 'Konfigurasi' },
];

interface SuplaiRow {
    id: number;
    no: number;
    tanggal: string;
    jenis: string;
    namaBahan: string;
    kuantum: number;
    satuan: string;
    dokumen: string;
    keterangan: string;
    productSlug: string;
    productName: string;
}

interface MutasiRow {
    id: number;
    no: number;
    tanggal: string;
    jenis: string;
    namaBahan: string;
    kuantum: number;
    satuan: string;
    dokumen: string;
    keterangan: string;
    productSlug: string;
    productName: string;
}

interface BalanceStokRowExt extends BalanceStokRow {
    productSlug: string;
    productName: string;
}

/* ─── Icons ─── */

function EyeIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
            <circle cx="12" cy="12" r="3" />
        </svg>
    );
}

function PlusIcon({ size = 16 }: { size?: number } = {}) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
    );
}

function DownloadIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
    );
}

function SortIcon({ direction }: { direction?: 'asc' | 'desc' }) {
    return (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline-block ml-1 opacity-40">
            {direction === 'asc' ? (
                <polyline points="18 15 12 9 6 15" />
            ) : direction === 'desc' ? (
                <polyline points="6 9 12 15 18 9" />
            ) : (
                <>
                    <polyline points="7 7 12 2 17 7" />
                    <polyline points="7 17 12 22 17 17" />
                </>
            )}
        </svg>
    );
}

function AlertTriangleIcon() {
    return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
            <path d="M12 9v4" />
            <path d="M12 17h.01" />
        </svg>
    );
}

/* ─── Pagination helper ─── */

function usePagination<T>(data: T[], pageSize = 10) {
    const [page, setPage] = useState(1);
    const totalPages = Math.max(1, Math.ceil(data.length / pageSize));
    const paginated = data.slice((page - 1) * pageSize, page * pageSize);
    // Reset page when data changes
    useEffect(() => { setPage(1); }, [data.length]);
    return { page, setPage, totalPages, paginated, total: data.length };
}

/* ─── Helper: Extract products from sidebar ─── */

function extractProducts(menus: SidebarMenu[]): ProductInfo[] {
    const products: ProductInfo[] = [];

    for (const l1 of menus) {
        if (!l1.children) continue;
        for (const l2 of l1.children) {
            if (!l2.children) continue;
            // Check if this child has Bahan Baku, Produksi, or Analisa sub-items (indicating it's a product)
            const hasBahanBaku = l2.children.some(c => c.label === 'Bahan Baku');
            const hasProduksi = l2.children.some(c => c.label === 'Produksi');
            if (hasBahanBaku || hasProduksi) {
                // Extract slug from href of any child
                const child = l2.children.find(c => c.href && c.href !== '#');
                if (child?.href) {
                    const parts = child.href.split('/');
                    // href like /dashboard/produk-pengembangan/petro-gladiator/bahan-baku
                    // slug is parts[parts.length - 2]
                    const slug = parts[parts.length - 2];
                    if (slug && !products.find(p => p.slug === slug)) {
                        products.push({ label: l2.label, slug });
                    }
                }
            }
        }
    }

    return products;
}

function titleCase(s: string): string {
    if (s === 'phonska-oca') return 'Phonska Oca Plus';
    return s.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/* ─── Unit conversion helpers ─── */

const MASS_UNITS = ['Ton', 'Kwintal', 'Kg', 'Gram', 'mg'];
const VOL_UNITS = ['KL', 'Liter', 'mL'];

function getUnitFamily(unit: string): string[] {
    const lo = unit.toLowerCase();
    if (['ton', 'kwintal', 'kg', 'gram', 'mg', 'kilogram', 'kilo', 'gr', 'g'].includes(lo)) return MASS_UNITS;
    if (['kl', 'liter', 'l', 'lt', 'litre', 'ml', 'milliliter', 'cc'].includes(lo)) return VOL_UNITS;
    return [unit];
}

function normalizeUnit(u: string): string {
    const lo = u.trim().toLowerCase();
    const map: Record<string, string> = {
        'l': 'Liter', 'lt': 'Liter', 'litre': 'Liter', 'liter': 'Liter',
        'ml': 'mL', 'milliliter': 'mL', 'cc': 'mL',
        'kl': 'KL',
        'kg': 'Kg', 'kilo': 'Kg', 'kilogram': 'Kg',
        'gram': 'Gram', 'gr': 'Gram', 'g': 'Gram',
        'mg': 'mg',
        'ton': 'Ton',
        'kwintal': 'Kwintal',
    };
    return map[lo] || u;
}

function convertUnitFE(value: number, fromUnit: string, toUnit: string): number {
    const from = normalizeUnit(fromUnit);
    const to = normalizeUnit(toUnit);
    if (from === to) return value;
    const toKg: Record<string, number> = { 'Ton': 1000, 'Kwintal': 100, 'Kg': 1, 'Gram': 0.001, 'mg': 0.000001 };
    const toLiter: Record<string, number> = { 'KL': 1000, 'Liter': 1, 'mL': 0.001 };
    if (from in toKg && to in toKg) return value * toKg[from] / toKg[to];
    if (from in toLiter && to in toLiter) return value * toLiter[from] / toLiter[to];
    return value;
}

/* ─── Product Badge Component ─── */

function ProductBadge({ name }: { name: string }) {
    // Generate a consistent color from product name
    const colors = [
        { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200' },
        { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200' },
        { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
        { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200' },
        { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
        { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
    ];
    const hash = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    const color = colors[hash % colors.length];

    return (
        <span className={cn(
            "inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded-full border",
            color.bg, color.text, color.border
        )}>
            <PackageIcon size={10} />
            {name}
        </span>
    );
}

/* ═══════════════════════════════════════════ */
/*  Main Component                            */
/* ═══════════════════════════════════════════ */

export function BahanBakuAllPage() {
    const [activeTab, setActiveTab] = useState<TabKey>('suplai');
    const [search, setSearch] = useState('');

    // Filter State
    const [bulan, setBulan] = useState<number | null>(new Date().getMonth() + 1);
    const [tahun, setTahun] = useState<number | null>(new Date().getFullYear());
    const [selectedProductSlug, setSelectedProductSlug] = useState<string>('all');

    // Products State
    const [products, setProducts] = useState<ProductInfo[]>([]);
    const [isLoadingProducts, setIsLoadingProducts] = useState(true);

    // Data State
    const [suplaiData, setSuplaiData] = useState<SuplaiRow[]>([]);
    const [mutasiData, setMutasiData] = useState<MutasiRow[]>([]);
    const [balanceStokRows, setBalanceStokRows] = useState<BalanceStokRowExt[]>([]);

    const [configBakuList, setConfigBakuList] = useState<GroupedMaterial[]>([]);
    const [configPenolongList, setConfigPenolongList] = useState<GroupedMaterial[]>([]);
    const [isLoadingConfig, setIsLoadingConfig] = useState(false);

    const fetchConfigMaterials = useCallback(async () => {
        if (products.length === 0) return;
        setIsLoadingConfig(true);
        try {
            const allMaterials = await Promise.all(
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
            );

            const bakuGroups: Record<number, GroupedMaterial> = {};
            const penolongGroups: Record<number, GroupedMaterial> = {};

            allMaterials.forEach(pData => {
                pData.baku.forEach(item => {
                    if (!bakuGroups[item.masterItemId]) {
                        bakuGroups[item.masterItemId] = {
                            masterItemId: item.masterItemId,
                            nama: item.nama,
                            satuan: item.satuan,
                            jenis: 'Baku',
                            products: []
                        };
                    }
                    bakuGroups[item.masterItemId].products.push({
                        slug: pData.productSlug,
                        name: pData.productName,
                        assignmentId: item.id
                    });
                });

                pData.penolong.forEach(item => {
                    if (!penolongGroups[item.masterItemId]) {
                        penolongGroups[item.masterItemId] = {
                            masterItemId: item.masterItemId,
                            nama: item.nama,
                            satuan: item.satuan,
                            jenis: 'Penolong',
                            products: []
                        };
                    }
                    penolongGroups[item.masterItemId].products.push({
                        slug: pData.productSlug,
                        name: pData.productName,
                        assignmentId: item.id
                    });
                });
            });

            setConfigBakuList(Object.values(bakuGroups));
            setConfigPenolongList(Object.values(penolongGroups));
        } catch (error) {
            console.error('Failed to fetch all product config materials:', error);
        } finally {
            setIsLoadingConfig(false);
        }
    }, [products]);

    useEffect(() => {
        if (products.length > 0) {
            fetchConfigMaterials();
        }
    }, [products, fetchConfigMaterials]);

    const materialAffiliationMap = useMemo(() => {
        const map: Record<string, { slug: string; name: string }[]> = {};
        
        configBakuList.forEach(m => {
            const key = `Bahan Baku-${m.nama}`;
            map[key] = m.products.map(p => ({ slug: p.slug, name: p.name }));
        });
        
        configPenolongList.forEach(m => {
            const key = `Bahan Penolong-${m.nama}`;
            map[key] = m.products.map(p => ({ slug: p.slug, name: p.name }));
        });
        
        return map;
    }, [configBakuList, configPenolongList]);

    // UI State
    const [isLoading, setIsLoading] = useState(false);
    const [isSuplaiModalOpen, setIsSuplaiModalOpen] = useState(false);
    const [isMutasiModalOpen, setIsMutasiModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editData, setEditData] = useState<any>(null);
    const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: number | null; type: 'suplai' | 'mutasi' | null }>({ isOpen: false, id: null, type: null });
    const [isDeleting, setIsDeleting] = useState(false);
    const [pageError, setPageError] = useState<string | null>(null);

    // For modals: which product slug to use for adding data
    const [modalProductSlug, setModalProductSlug] = useState<string>('');

    // Fetch products from sidebar
    useEffect(() => {
        const fetchProducts = async () => {
            setIsLoadingProducts(true);
            try {
                const menus = await sidebarService.getAll();
                const prods = extractProducts(menus);
                setProducts(prods);
                if (prods.length > 0 && !modalProductSlug) {
                    setModalProductSlug(prods[0].slug);
                }
            } catch (error) {
                console.error('Failed to fetch products:', error);
                // Fallback products
                setProducts([
                    { label: 'Petro Gladiator', slug: 'petro-gladiator' },
                    { label: 'Bio Fertil', slug: 'bio-fertil' },
                    { label: 'Petro Fish', slug: 'petro-fish' },
                    { label: 'Phonska Oca Plus', slug: 'phonska-oca' },
                ]);
            } finally {
                setIsLoadingProducts(false);
            }
        };
        fetchProducts();
    }, []);

    const getProductName = useCallback((slug: string) => {
        const prod = products.find(p => p.slug === slug);
        return prod?.label || titleCase(slug);
    }, [products]);

    // Fetch data
    const fetchData = useCallback(async () => {
        if (products.length === 0) return;
        setIsLoading(true);
        try {
            const allSlugs = products.map(p => p.slug);

            if (activeTab === 'suplai') {
                const allData = await Promise.all(
                    allSlugs.map(async (slug) => {
                        const data = await bahanBakuService.getSuplai({
                            productSlug: slug,
                            bulan: bulan ? String(bulan) : undefined,
                            tahun: tahun ? String(tahun) : undefined,
                        });
                        return data.map((item) => ({
                            ...item,
                            productSlug: slug,
                            productName: getProductName(slug),
                        }));
                    })
                );
                
                // De-duplicate by transaction ID
                const seen = new Set<number>();
                const uniqueMerged: any[] = [];
                allData.flat().forEach(item => {
                    if (!seen.has(item.id)) {
                        seen.add(item.id);
                        uniqueMerged.push(item);
                    }
                });

                uniqueMerged.sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());

                setSuplaiData(uniqueMerged.map((item, idx) => ({
                    id: item.id,
                    no: idx + 1,
                    tanggal: format(new Date(item.tanggal), 'yyyy-MM-dd'),
                    jenis: item.jenis,
                    namaBahan: item.namaBahan,
                    kuantum: item.kuantum,
                    satuan: item.satuan || 'Kg',
                    dokumen: item.dokumen,
                    keterangan: item.keterangan || '-',
                    productSlug: item.productSlug,
                    productName: item.productName,
                })));
            } else if (activeTab === 'mutasi') {
                const allData = await Promise.all(
                    allSlugs.map(async (slug) => {
                        const data = await bahanBakuService.getMutasi({
                            productSlug: slug,
                            bulan: bulan ? String(bulan) : undefined,
                            tahun: tahun ? String(tahun) : undefined,
                        });
                        return data.map((item) => ({
                            ...item,
                            productSlug: slug,
                            productName: getProductName(slug),
                        }));
                    })
                );
                
                // De-duplicate by transaction ID
                const seen = new Set<number>();
                const uniqueMerged: any[] = [];
                allData.flat().forEach(item => {
                    if (!seen.has(item.id)) {
                        seen.add(item.id);
                        uniqueMerged.push(item);
                    }
                });

                uniqueMerged.sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());

                setMutasiData(uniqueMerged.map((item, idx) => ({
                    id: item.id,
                    no: idx + 1,
                    tanggal: format(new Date(item.tanggal), 'yyyy-MM-dd'),
                    jenis: item.jenis,
                    namaBahan: item.namaBahan,
                    kuantum: item.kuantum,
                    satuan: item.satuan || 'Kg',
                    dokumen: item.dokumen,
                    keterangan: item.keterangan || '-',
                    productSlug: item.productSlug,
                    productName: item.productName,
                })));
            } else if (activeTab === 'balance-stok') {
                const allData = await Promise.all(
                    allSlugs.map(async (slug) => {
                        const data = await bahanBakuService.getBalanceStok({
                            productSlug: slug,
                            bulan: bulan ? String(bulan) : undefined,
                            tahun: tahun ? String(tahun) : undefined,
                        });
                        return data.map((row) => ({
                            ...row,
                            productSlug: slug,
                            productName: getProductName(slug),
                        }));
                    })
                );
                setBalanceStokRows(allData.flat());
            }
        } catch (error) {
            console.error('Failed to fetch data:', error);
        } finally {
            setIsLoading(false);
        }
    }, [activeTab, products, bulan, tahun, getProductName]);

    useEffect(() => {
        if (!isLoadingProducts) {
            fetchData();
        }
    }, [fetchData, isLoadingProducts]);

    const handleAddSuplai = async (data: any) => {
        const payload = {
            productSlug: data.productSlug || modalProductSlug,
            perusahaanId: 0,
            tanggal: data.date,
            jenis: data.jenis,
            namaBahan: data.namaBahan,
            kuantum: parseFloat(data.quantum || 0),
            satuan: data.satuan,
            dokumen: data.file ? data.file.name : (editData?.dokumen || ''),
            keterangan: data.keterangan || ''
        };
        try {
            if (editingId) {
                await bahanBakuService.updateSuplai(editingId, payload);
            } else {
                await bahanBakuService.createSuplai(payload as any);
            }
            fetchData();
            setEditingId(null);
            setEditData(null);
        } catch (error) {
            console.error('Failed to save suplai:', error);
            alert('Gagal menyimpan data suplai.');
        }
    };

    const handleAddMutasi = async (data: any) => {
        const payload = {
            productSlug: data.productSlug || modalProductSlug,
            perusahaanId: 0,
            tanggal: data.date,
            jenis: data.jenis,
            namaBahan: data.namaBahan,
            kuantum: parseFloat(data.quantum || 0),
            satuan: data.satuan,
            dokumen: data.file ? data.file.name : (editData?.dokumen || ''),
            keterangan: data.keterangan
        };
        try {
            if (editingId) {
                await bahanBakuService.updateMutasi(editingId, payload);
            } else {
                await bahanBakuService.createMutasi(payload as any);
            }
            fetchData();
            setEditingId(null);
            setEditData(null);
        } catch (error) {
            console.error('Failed to save mutasi:', error);
            alert('Gagal menyimpan data mutasi.');
        }
    };

    const confirmDelete = (type: 'suplai' | 'mutasi', id: number) => {
        setDeleteModal({ isOpen: true, id, type });
    };

    const executeDelete = async () => {
        if (!deleteModal.id || !deleteModal.type) return;
        try {
            setIsDeleting(true);
            setPageError(null);
            if (deleteModal.type === 'suplai') {
                await bahanBakuService.deleteSuplai(deleteModal.id);
            } else {
                await bahanBakuService.deleteMutasi(deleteModal.id);
            }
            fetchData();
            setDeleteModal({ isOpen: false, id: null, type: null });
        } catch (error) {
            console.error('Failed to delete data:', error);
            setPageError('Gagal menghapus data.');
            setDeleteModal({ isOpen: false, id: null, type: null });
        } finally {
            setIsDeleting(false);
        }
    };

    const handleEditSuplai = (item: SuplaiRow) => {
        setEditingId(item.id);
        setEditData(item);
        setModalProductSlug(item.productSlug);
        setIsSuplaiModalOpen(true);
    };

    const handleEditMutasi = (item: MutasiRow) => {
        setEditingId(item.id);
        setEditData(item);
        setModalProductSlug(item.productSlug);
        setIsMutasiModalOpen(true);
    };

    const handleExportExcel = () => {
        let dataToExport: any[] = [];
        let filename = '';

        if (activeTab === 'suplai') {
            dataToExport = suplaiData.map(row => ({
                No: row.no,
                Produk: row.productName,
                Tanggal: format(new Date(row.tanggal), 'dd/MM/yyyy'),
                Jenis: row.jenis,
                'Nama Bahan': row.namaBahan,
                Kuantum: row.kuantum,
                Satuan: row.satuan,
                Dokumen: row.dokumen,
                Keterangan: row.keterangan,
            }));
            filename = `Suplai_All_Products_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`;
        } else if (activeTab === 'mutasi') {
            dataToExport = mutasiData.map(row => ({
                No: row.no,
                Produk: row.productName,
                Tanggal: format(new Date(row.tanggal), 'dd/MM/yyyy'),
                Jenis: row.jenis,
                'Nama Bahan': row.namaBahan,
                Kuantum: row.kuantum,
                Satuan: row.satuan,
                Dokumen: row.dokumen,
                Keterangan: row.keterangan,
            }));
            filename = `Mutasi_All_Products_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`;
        } else if (activeTab === 'balance-stok') {
            dataToExport = balanceStokRows.map(row => ({
                Produk: row.productName,
                'Nama Bahan': row.nama,
                'Jenis': row.jenis === 'Baku' ? 'Bahan Baku' : 'Bahan Penolong',
                'Satuan': row.satuan,
                'Pemasukan': row.totalIn,
                'Pengeluaran': row.totalOut,
                'Stok Akhir': row.stok,
            }));
            filename = `Balance_Stok_All_Products_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`;
        }

        if (dataToExport.length > 0) {
            import('@/lib/export-utils').then(({ downloadCSV }) => {
                downloadCSV(dataToExport, filename);
            });
        } else {
            alert('Tidak ada data untuk diekspor.');
        }
    };

    const handleExportPDF = () => {
        let columns: { key: string, label: string }[] = [];
        let dataRows: any[] = [];
        let title = '';

        if (activeTab === 'suplai') {
            title = 'Data Suplai Bahan Baku';
            columns = [
                { key: 'no', label: 'No.' },
                { key: 'produk', label: 'Produk' },
                { key: 'tanggal', label: 'Tanggal' },
                { key: 'jenis', label: 'Jenis' },
                { key: 'namaBahan', label: 'Nama Bahan' },
                { key: 'kuantum', label: 'Kuantum' },
                { key: 'satuan', label: 'Satuan' },
                { key: 'keterangan', label: 'Keterangan' }
            ];
            dataRows = suplaiData.map(row => ({
                no: row.no,
                produk: row.productName,
                tanggal: format(new Date(row.tanggal), 'dd/MM/yyyy'),
                jenis: row.jenis,
                namaBahan: row.namaBahan,
                kuantum: fmtInteger(row.kuantum),
                satuan: row.satuan,
                keterangan: row.keterangan || '-',
            }));
        } else if (activeTab === 'mutasi') {
            title = 'Data Mutasi Bahan Baku';
            columns = [
                { key: 'no', label: 'No.' },
                { key: 'produk', label: 'Produk' },
                { key: 'tanggal', label: 'Tanggal' },
                { key: 'jenis', label: 'Jenis' },
                { key: 'namaBahan', label: 'Nama Bahan' },
                { key: 'kuantum', label: 'Kuantum' },
                { key: 'satuan', label: 'Satuan' },
                { key: 'keterangan', label: 'Keterangan' }
            ];
            dataRows = mutasiData.map(row => ({
                no: row.no,
                produk: row.productName,
                tanggal: format(new Date(row.tanggal), 'dd/MM/yyyy'),
                jenis: row.jenis,
                namaBahan: row.namaBahan,
                kuantum: fmtInteger(row.kuantum),
                satuan: row.satuan,
                keterangan: row.keterangan || '-',
            }));
        } else if (activeTab === 'balance-stok') {
            title = 'Balance Stok Bahan Baku';
            columns = [
                { key: 'produk', label: 'Produk' },
                { key: 'nama', label: 'Nama Bahan' },
                { key: 'jenis', label: 'Jenis' },
                { key: 'satuan', label: 'Satuan' },
                { key: 'in', label: 'Pemasukan' },
                { key: 'out', label: 'Pengeluaran' },
                { key: 'stok', label: 'Stok Akhir' }
            ];
            dataRows = balanceStokRows.map(row => ({
                produk: row.productName,
                nama: row.nama,
                jenis: row.jenis === 'Baku' ? 'Bahan Baku' : 'Bahan Penolong',
                satuan: row.satuan,
                in: fmtInteger(row.totalIn),
                out: fmtInteger(row.totalOut),
                stok: fmtInteger(row.stok),
            }));
        }

        if (dataRows.length > 0) {
            import('@/lib/export-utils').then(({ printTable }) => {
                printTable({
                    title,
                    date: format(new Date(), 'EEEE, dd MMMM yyyy HH:mm:ss', { locale: localeId }),
                    columns,
                    data: dataRows
                });
            });
        } else {
            alert('Tidak ada data untuk diekspor.');
        }
    };

    const filteredSuplai = useMemo(() => {
        if (selectedProductSlug === 'all') return suplaiData;
        return suplaiData.filter(row => {
            const key = `${row.jenis}-${row.namaBahan}`;
            const affiliated = materialAffiliationMap[key] || [];
            return row.productSlug === selectedProductSlug || affiliated.some(p => p.slug === selectedProductSlug);
        });
    }, [suplaiData, selectedProductSlug, materialAffiliationMap]);

    const filteredMutasi = useMemo(() => {
        if (selectedProductSlug === 'all') return mutasiData;
        return mutasiData.filter(row => {
            const key = `${row.jenis}-${row.namaBahan}`;
            const affiliated = materialAffiliationMap[key] || [];
            return row.productSlug === selectedProductSlug || affiliated.some(p => p.slug === selectedProductSlug);
        });
    }, [mutasiData, selectedProductSlug, materialAffiliationMap]);

    const filteredBalanceRows = useMemo(() => {
        if (selectedProductSlug === 'all') return balanceStokRows;
        return balanceStokRows.filter(row => row.productSlug === selectedProductSlug);
    }, [balanceStokRows, selectedProductSlug]);

    return (
        <div className="space-y-6">
            <SuplaiModal
                isOpen={isSuplaiModalOpen}
                onClose={() => {
                    setIsSuplaiModalOpen(false);
                    setEditingId(null);
                    setEditData(null);
                }}
                onSubmit={handleAddSuplai}
                products={products}
                initialData={editData}
            />
            <MutasiModal
                isOpen={isMutasiModalOpen}
                onClose={() => {
                    setIsMutasiModalOpen(false);
                    setEditingId(null);
                    setEditData(null);
                }}
                onSubmit={handleAddMutasi}
                products={products}
                initialData={editData}
            />

            {deleteModal.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white shadow-xl max-w-sm w-full p-6 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex flex-col items-center text-center">
                            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-4">
                                <AlertTriangleIcon />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 mb-2">Hapus Data?</h3>
                            <p className="text-sm text-gray-500 mb-6">Data yang dihapus tidak dapat dikembalikan. Lanjutkan?</p>
                        </div>
                        <div className="flex gap-3 w-full">
                            <AppButton
                                variant="secondary"
                                className="flex-1"
                                onClick={() => setDeleteModal({ isOpen: false, id: null, type: null })}
                            >
                                Batal
                            </AppButton>
                            <AppButton
                                variant="danger"
                                className="flex-1"
                                onClick={executeDelete}
                                disabled={isDeleting}
                                loading={isDeleting}
                            >
                                {isDeleting ? 'Menghapus...' : 'Ya, Hapus'}
                            </AppButton>
                        </div>
                    </div>
                </div>
            )}

            {pageError && (
                <div className="bg-red-50 border border-red-200 p-4 flex items-center justify-between shadow-sm">
                    <span className="text-sm font-medium text-red-800">{pageError}</span>
                    <button onClick={() => setPageError(null)} className="px-3 py-1.5 text-sm font-semibold text-red-700 bg-red-100 hover:bg-red-200 rounded-lg transition-colors">Tutup</button>
                </div>
            )}

            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-gray-400">
                <span className="text-gray-500">Dashboard</span>
                <span>/</span>
                <span className="text-gray-500">Produk Pengembangan</span>
                <span>/</span>
                <span className="text-gray-800 font-medium">Bahan Baku</span>
            </div>

            {/* Page title */}
            <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                    Bahan Baku
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                    Kelola data bahan baku untuk seluruh produk pengembangan
                </p>
            </div>

            {/* Tabs + Actions row */}
            <div className="bg-white border border-gray-200 overflow-hidden">
                {/* Header with tabs and button */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-gray-100">
                    <div className="flex">
                        {tabs.map((tab) => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={`px-5 py-3 text-sm font-medium transition-colors relative
                  ${activeTab === tab.key
                                        ? 'text-emerald-700'
                                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                    }`}
                            >
                                {tab.label}
                                {activeTab === tab.key && (
                                    <span className="absolute bottom-0 left-0 w-full h-0.5 bg-emerald-600 rounded-t" />
                                )}
                            </button>
                        ))}
                    </div>
                    <div className="px-4 py-2 sm:py-0 flex items-center gap-2">
                        {activeTab !== 'konfigurasi' && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button suppressHydrationWarning className="inline-flex items-center gap-2 px-4 py-2 bg-white text-gray-700 text-sm font-medium border border-gray-200 hover:bg-gray-50 hover:text-gray-900 transition-colors">
                                        <DownloadIcon />
                                        Export Data
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48 bg-white border border-gray-200 p-1 z-50">
                                    <DropdownMenuItem onClick={handleExportExcel} className="cursor-pointer hover:bg-gray-50 focus:bg-gray-50">
                                        Export to Excel
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={handleExportPDF} className="cursor-pointer hover:bg-gray-50 focus:bg-gray-50">
                                        Export to PDF
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}

                        {activeTab !== 'balance-stok' && activeTab !== 'konfigurasi' && (
                            <AppButton
                                variant="primary"
                                size="sm"
                                icon={<PlusIcon />}
                                onClick={() => {
                                    setEditingId(null);
                                    setEditData(null);
                                    if (activeTab === 'mutasi') {
                                        setIsMutasiModalOpen(true);
                                    } else {
                                        setIsSuplaiModalOpen(true);
                                    }
                                }}
                            >
                                Tambah Data
                            </AppButton>
                        )}
                    </div>
                </div>

                {/* Filters Row */}
                <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                    <div className="flex flex-col md:flex-row md:items-end gap-4 justify-between">
                        {/* Left Side: Period Filter + Product Filter */}
                        <div className="flex flex-col sm:flex-row gap-4 items-end">
                            {activeTab !== 'konfigurasi' && (
                                <AppPeriodFilter
                                    month={bulan}
                                    year={tahun}
                                    onMonthChange={setBulan}
                                    onYearChange={setTahun}
                                />
                            )}
                            {/* Product Filter */}
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                                    <FilterIcon size={12} />
                                    Produk
                                </label>
                                <select
                                    value={selectedProductSlug}
                                    onChange={(e) => setSelectedProductSlug(e.target.value)}
                                    className="h-10 px-3 py-2 bg-white border border-gray-200 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all min-w-[180px] cursor-pointer"
                                >
                                    <option value="all">Semua Produk</option>
                                    {products.map(p => (
                                        <option key={p.slug} value={p.slug}>{p.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Right Side: Search */}
                        {activeTab !== 'konfigurasi' && (
                            <AppSearchBar
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Cari data..."
                                containerClassName="w-full md:w-64"
                            />
                        )}
                    </div>
                </div>

                {/* Tab content */}
                <div className="min-h-[400px]">
                    {isLoading || isLoadingProducts ? (
                        <div className="flex items-center justify-center h-48">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
                        </div>
                    ) : (
                        <>
                            {activeTab === 'suplai' && <SuplaiTable data={filteredSuplai} search={search} onDelete={(id) => confirmDelete('suplai', id)} onEdit={handleEditSuplai} materialAffiliationMap={materialAffiliationMap} />}
                            {activeTab === 'mutasi' && <MutasiTable data={filteredMutasi} search={search} onEdit={handleEditMutasi} onDelete={(id) => confirmDelete('mutasi', id)} materialAffiliationMap={materialAffiliationMap} />}
                            {activeTab === 'balance-stok' && (
                                <BalanceStokAllTable
                                    data={filteredBalanceRows}
                                    search={search}
                                    bulan={bulan}
                                    tahun={tahun}
                                />
                            )}
                            {activeTab === 'konfigurasi' && (
                                <div className="p-6">
                                    <ConfigurationAllTab
                                        products={products}
                                        bakuList={configBakuList}
                                        penolongList={configPenolongList}
                                        isLoading={isLoadingConfig}
                                        onRefresh={fetchConfigMaterials}
                                        selectedProductSlug={selectedProductSlug}
                                    />
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════ */
/*  Suplai Table (with Product Column)         */
/* ═══════════════════════════════════════════ */

function SuplaiTable({ data, search, onDelete, onEdit, materialAffiliationMap }: { data: SuplaiRow[]; search: string; onDelete: (id: number) => void; onEdit: (item: SuplaiRow) => void; materialAffiliationMap: Record<string, { slug: string; name: string }[]> }) {
    const filtered = useMemo(() =>
        data.filter((row) => {
            const key = `${row.jenis}-${row.namaBahan}`;
            const affiliated = materialAffiliationMap[key] || [];
            const matchesAffiliatedProduct = affiliated.some(p => p.name.toLowerCase().includes(search.toLowerCase()));

            return search === '' ||
                row.namaBahan.toLowerCase().includes(search.toLowerCase()) ||
                row.keterangan.toLowerCase().includes(search.toLowerCase()) ||
                row.jenis.toLowerCase().includes(search.toLowerCase()) ||
                row.productName.toLowerCase().includes(search.toLowerCase()) ||
                matchesAffiliatedProduct;
        }), [data, search, materialAffiliationMap]);

    const { page, setPage, totalPages, paginated, total } = usePagination(filtered);

    const [sortConfig, setSortConfig] = useState<{ key: keyof SuplaiRow | null; direction: 'asc' | 'desc' }>({ key: null, direction: 'asc' });

    const sortedData = useMemo(() => {
        if (!sortConfig.key) return paginated;
        const sorted = [...paginated].sort((a, b) => {
            const aVal = a[sortConfig.key!] as any;
            const bVal = b[sortConfig.key!] as any;
            if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
        return sorted;
    }, [paginated, sortConfig]);

    const requestSort = (key: keyof SuplaiRow) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
        setSortConfig({ key, direction });
    };

    return (
        <>
            <div className="overflow-x-auto hidden sm:block">
                <table className="w-full text-sm border-collapse border border-gray-200">
                    <thead>
                        <tr className="bg-gray-50/80">
                            <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200 text-center w-14">No</th>
                            <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200 text-left cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => requestSort('tanggal')}>
                                <div className="flex items-center gap-1.5">
                                    Tanggal <SortIcon direction={sortConfig.key === 'tanggal' ? sortConfig.direction : undefined} />
                                </div>
                            </th>
                            <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200 text-left cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => requestSort('productName')}>
                                <div className="flex items-center gap-1.5">
                                    Produk <SortIcon direction={sortConfig.key === 'productName' ? sortConfig.direction : undefined} />
                                </div>
                            </th>
                            <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200 text-left cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => requestSort('jenis')}>
                                <div className="flex items-center gap-1.5">
                                    Jenis <SortIcon direction={sortConfig.key === 'jenis' ? sortConfig.direction : undefined} />
                                </div>
                            </th>
                            <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200 text-left cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => requestSort('namaBahan')}>
                                <div className="flex items-center gap-1.5">
                                    Nama Bahan <SortIcon direction={sortConfig.key === 'namaBahan' ? sortConfig.direction : undefined} />
                                </div>
                            </th>
                            <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200 text-right cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => requestSort('kuantum')}>
                                <div className="flex items-center justify-end gap-1.5">
                                    Kuantum <SortIcon direction={sortConfig.key === 'kuantum' ? sortConfig.direction : undefined} />
                                </div>
                            </th>
                            <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200 text-center">Dokumen</th>
                            <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200 text-left">Keterangan</th>
                            <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200 text-center w-24">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white">
                        {sortedData.length === 0 ? (
                            <tr>
                                <td colSpan={9} className="p-12 text-center text-gray-400 text-sm border border-gray-200">
                                    Tidak ada data ditemukan.
                                </td>
                            </tr>
                        ) : (
                            sortedData.map((row) => (
                                <tr key={`${row.productSlug}-${row.id}`} className="hover:bg-emerald-50/10 transition-colors">
                                    <td className="px-4 py-3 text-gray-700 font-medium text-center border border-gray-200">{row.no}</td>
                                    <td className="px-4 py-3 text-gray-700 border border-gray-200">{format(new Date(row.tanggal), 'dd/MM/yyyy')}</td>
                                    <td className="px-4 py-3 border border-gray-200">
                                        <div className="flex flex-wrap gap-1">
                                            {(materialAffiliationMap[`${row.jenis}-${row.namaBahan}`] || [
                                                { slug: row.productSlug, name: row.productName }
                                            ]).map((p) => (
                                                <ProductBadge key={p.slug} name={p.name} />
                                            ))}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 border border-gray-200">
                                        <span className={cn(
                                            "inline-flex px-2 py-0.5 text-[11px] font-medium rounded-full border",
                                            row.jenis === 'Bahan Baku'
                                                ? "bg-blue-50 text-blue-700 border-blue-100"
                                                : "bg-emerald-50 text-emerald-700 border-emerald-100"
                                        )}>
                                            {row.jenis}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-gray-800 font-medium border border-gray-200">{row.namaBahan || '-'}</td>
                                    <td className="px-4 py-3 text-right font-mono text-gray-700 border border-gray-200">
                                        {fmtInteger(row.kuantum)} <span className="text-gray-400 text-[11px] ml-0.5">{row.satuan}</span>
                                    </td>
                                    <td className="px-4 py-3 text-center border border-gray-200">
                                        {row.dokumen ? (
                                            <button className="text-emerald-600 hover:text-emerald-800 transition-colors p-1" title={row.dokumen}>
                                                <EyeIcon />
                                            </button>
                                        ) : (
                                            <span className="text-gray-300">-</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-gray-600 max-w-xs truncate border border-gray-200">{row.keterangan || '-'}</td>
                                    <td className="px-4 py-3 text-center border border-gray-200">
                                        <div className="flex items-center justify-center gap-1">
                                            <button onClick={() => onEdit(row)} className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors" title="Edit">
                                                <PencilIcon size={14} />
                                            </button>
                                            <button onClick={() => onDelete(row.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors" title="Hapus">
                                                <TrashIcon size={14} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
            {/* Mobile View */}
            <div className="sm:hidden divide-y divide-gray-100">
                {sortedData.map((row) => (
                    <div key={`${row.productSlug}-${row.id}`} className="p-4 space-y-3 bg-white">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-mono text-gray-400">#{row.no}</span>
                                <span className="text-xs text-gray-500">{format(new Date(row.tanggal), 'dd/MM/yyyy')}</span>
                            </div>
                            <div className="flex gap-1 justify-end">
                                <button onClick={() => onEdit(row)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"><PencilIcon size={14} /></button>
                                <button onClick={() => onDelete(row.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"><TrashIcon size={14} /></button>
                            </div>
                        </div>
                        <div className="flex justify-between items-start">
                            <div>
                                <div className="flex flex-wrap gap-1">
                                    {(materialAffiliationMap[`${row.jenis}-${row.namaBahan}`] || [
                                        { slug: row.productSlug, name: row.productName }
                                    ]).map((p) => (
                                        <ProductBadge key={p.slug} name={p.name} />
                                    ))}
                                </div>
                                <p className="text-sm font-bold text-gray-800 mt-1">{row.namaBahan}</p>
                                <span className={cn("text-xs px-2 py-0.5 rounded-full mt-1 inline-block", row.jenis === 'Bahan Baku' ? "bg-blue-50 text-blue-700" : "bg-emerald-50 text-emerald-700")}>
                                    {row.jenis}
                                </span>
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-mono font-medium text-gray-700">
                                    {fmtInteger(row.kuantum)} {row.satuan}
                                </p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            <AppPagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
                totalItems={total}
            />
        </>
    );
}

/* ═══════════════════════════════════════════ */
/*  Mutasi Table (with Product Column)         */
/* ═══════════════════════════════════════════ */

function MutasiTable({ data, search, onEdit, onDelete, materialAffiliationMap }: { data: MutasiRow[]; search: string; onEdit: (row: MutasiRow) => void; onDelete: (id: number) => void; materialAffiliationMap: Record<string, { slug: string; name: string }[]> }) {
    const filtered = useMemo(() =>
        data.filter((row) => {
            const key = `${row.jenis}-${row.namaBahan}`;
            const affiliated = materialAffiliationMap[key] || [];
            const matchesAffiliatedProduct = affiliated.some(p => p.name.toLowerCase().includes(search.toLowerCase()));

            return search === '' ||
                row.namaBahan.toLowerCase().includes(search.toLowerCase()) ||
                row.keterangan.toLowerCase().includes(search.toLowerCase()) ||
                row.productName.toLowerCase().includes(search.toLowerCase()) ||
                matchesAffiliatedProduct;
        }), [data, search, materialAffiliationMap]);

    const { page, setPage, totalPages, paginated, total } = usePagination(filtered);

    const [sortConfig, setSortConfig] = useState<{ key: keyof MutasiRow | null; direction: 'asc' | 'desc' }>({ key: null, direction: 'asc' });

    const sortedData = useMemo(() => {
        if (!sortConfig.key) return paginated;
        const sorted = [...paginated].sort((a, b) => {
            const aVal = a[sortConfig.key!] as any;
            const bVal = b[sortConfig.key!] as any;
            if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
        return sorted;
    }, [paginated, sortConfig]);

    const requestSort = (key: keyof MutasiRow) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
        setSortConfig({ key, direction });
    };

    return (
        <>
            <div className="overflow-x-auto hidden sm:block">
                <table className="w-full text-sm border-collapse border border-gray-200">
                    <thead>
                        <tr className="bg-gray-50/80">
                            <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200 text-center w-14">No</th>
                            <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200 text-left cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => requestSort('tanggal')}>
                                <div className="flex items-center gap-1.5">
                                    Tanggal <SortIcon direction={sortConfig.key === 'tanggal' ? sortConfig.direction : undefined} />
                                </div>
                            </th>
                            <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200 text-left cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => requestSort('productName')}>
                                <div className="flex items-center gap-1.5">
                                    Produk <SortIcon direction={sortConfig.key === 'productName' ? sortConfig.direction : undefined} />
                                </div>
                            </th>
                            <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200 text-left cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => requestSort('jenis')}>
                                <div className="flex items-center gap-1.5">
                                    Jenis <SortIcon direction={sortConfig.key === 'jenis' ? sortConfig.direction : undefined} />
                                </div>
                            </th>
                            <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200 text-left cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => requestSort('namaBahan')}>
                                <div className="flex items-center gap-1.5">
                                    Nama Bahan <SortIcon direction={sortConfig.key === 'namaBahan' ? sortConfig.direction : undefined} />
                                </div>
                            </th>
                            <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200 text-right cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => requestSort('kuantum')}>
                                <div className="flex items-center justify-end gap-1.5">
                                    Kuantum <SortIcon direction={sortConfig.key === 'kuantum' ? sortConfig.direction : undefined} />
                                </div>
                            </th>
                            <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200 text-center">Dokumen</th>
                            <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200 text-left">Keterangan</th>
                            <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200 text-center w-24">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white">
                        {sortedData.length === 0 ? (
                            <tr>
                                <td colSpan={9} className="p-12 text-center text-gray-400 text-sm border border-gray-200">
                                    Tidak ada data ditemukan.
                                </td>
                            </tr>
                        ) : (
                            sortedData.map((row) => (
                                <tr key={`${row.productSlug}-${row.id}`} className="hover:bg-emerald-50/10 transition-colors">
                                    <td className="px-4 py-3 text-gray-700 font-medium text-center border border-gray-200">{row.no}</td>
                                    <td className="px-4 py-3 text-gray-700 border border-gray-200">{format(new Date(row.tanggal), 'dd/MM/yyyy')}</td>
                                    <td className="px-4 py-3 border border-gray-200">
                                        <div className="flex flex-wrap gap-1">
                                            {(materialAffiliationMap[`${row.jenis}-${row.namaBahan}`] || [
                                                { slug: row.productSlug, name: row.productName }
                                            ]).map((p) => (
                                                <ProductBadge key={p.slug} name={p.name} />
                                            ))}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 border border-gray-200">
                                        <span className={cn(
                                            "inline-flex px-2 py-0.5 text-[11px] font-medium rounded-full border",
                                            row.jenis === 'Bahan Baku'
                                                ? "bg-blue-50 text-blue-700 border-blue-100"
                                                : "bg-emerald-50 text-emerald-700 border-emerald-100"
                                        )}>
                                            {row.jenis}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-gray-800 font-medium border border-gray-200">{row.namaBahan || '-'}</td>
                                    <td className="px-4 py-3 text-right font-mono text-gray-700 border border-gray-200">
                                        {fmtInteger(row.kuantum)} <span className="text-gray-400 text-[11px] ml-0.5">{row.satuan}</span>
                                    </td>
                                    <td className="px-4 py-3 text-center border border-gray-200">
                                        {row.dokumen ? (
                                            <button className="text-emerald-600 hover:text-emerald-800 transition-colors p-1" title={row.dokumen}>
                                                <EyeIcon />
                                            </button>
                                        ) : (
                                            <span className="text-gray-300">-</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-gray-600 max-w-xs truncate border border-gray-200">{row.keterangan || '-'}</td>
                                    <td className="px-4 py-3 text-center border border-gray-200">
                                        <div className="flex items-center justify-center gap-1">
                                            <button onClick={() => onEdit(row)} className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors" title="Edit">
                                                <PencilIcon size={14} />
                                            </button>
                                            <button onClick={() => onDelete(row.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors" title="Hapus">
                                                <TrashIcon size={14} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
            {/* Mobile View */}
            <div className="sm:hidden divide-y divide-gray-100">
                {sortedData.map((row) => (
                    <div key={`${row.productSlug}-${row.id}`} className="p-4 space-y-3 bg-white">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-mono text-gray-400">#{row.no}</span>
                                <span className="text-xs text-gray-500">{format(new Date(row.tanggal), 'dd/MM/yyyy')}</span>
                            </div>
                            <div className="flex gap-1 justify-end">
                                <button onClick={() => onEdit(row)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"><PencilIcon size={14} /></button>
                                <button onClick={() => onDelete(row.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"><TrashIcon size={14} /></button>
                            </div>
                        </div>
                        <div className="flex justify-between items-start">
                            <div>
                                <div className="flex flex-wrap gap-1">
                                    {(materialAffiliationMap[`${row.jenis}-${row.namaBahan}`] || [
                                        { slug: row.productSlug, name: row.productName }
                                    ]).map((p) => (
                                        <ProductBadge key={p.slug} name={p.name} />
                                    ))}
                                </div>
                                <p className="text-sm font-bold text-gray-800 mt-1">{row.namaBahan}</p>
                                <span className={cn(
                                    "text-xs px-2 py-0.5 rounded-full mt-1 inline-block",
                                    row.jenis === 'Bahan Baku' ? "bg-blue-50 text-blue-700" : "bg-emerald-50 text-emerald-700"
                                )}>
                                    {row.jenis}
                                </span>
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-mono font-medium text-gray-700">
                                    {fmtInteger(row.kuantum)} {row.satuan}
                                </p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            <AppPagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
                totalItems={total}
            />
        </>
    );
}

/* ═══════════════════════════════════════════ */
/*  Balance Stok All Table                     */
/* ═══════════════════════════════════════════ */

interface GroupedBalanceRow {
    nama: string;
    jenis: string;
    satuan: string;
    totalIn: number;
    totalOut: number;
    stok: number;
    products: { slug: string; name: string }[];
}

interface BalanceStokAllTableProps {
    data: BalanceStokRowExt[];
    search: string;
    bulan?: number | null;
    tahun?: number | null;
}

function BalanceStokAllTable({ data, search, bulan, tahun }: BalanceStokAllTableProps) {
    const [historyModal, setHistoryModal] = useState<{ nama: string; tipe: string; products: { slug: string; name: string }[] } | null>(null);
    const [historyData, setHistoryData] = useState<BahanBaku[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [satuanOverrides, setSatuanOverrides] = useState<Record<string, string>>({});
    const [categoryFilter, setCategoryFilter] = useState<'All' | 'Baku' | 'Penolong'>('All');

    const getDisplaySatuan = (row: GroupedBalanceRow) => satuanOverrides[`${row.jenis}-${row.nama}`] || normalizeUnit(row.satuan);

    const getConvertedRow = (row: GroupedBalanceRow) => {
        const displaySatuan = getDisplaySatuan(row);
        const fromSatuan = normalizeUnit(row.satuan);
        return {
            totalIn: convertUnitFE(row.totalIn, fromSatuan, displaySatuan),
            totalOut: convertUnitFE(row.totalOut, fromSatuan, displaySatuan),
            stok: convertUnitFE(row.stok, fromSatuan, displaySatuan),
            satuan: displaySatuan,
        };
    };

    const handleSatuanChange = (jenis: string, materialName: string, newSatuan: string) => {
        setSatuanOverrides(prev => ({ ...prev, [`${jenis}-${materialName}`]: newSatuan }));
    };

    const openHistory = async (nama: string, tipe: 'Suplai' | 'Mutasi', products: { slug: string; name: string }[]) => {
        setHistoryModal({ nama, tipe, products });
        setHistoryLoading(true);
        try {
            const allHistory = await Promise.all(
                products.map(async (prod) => {
                    const res = await bahanBakuService.getHistory({
                        productSlug: prod.slug,
                        namaBahan: nama,
                        tipe,
                        bulan: bulan ? String(bulan) : undefined,
                        tahun: tahun ? String(tahun) : undefined,
                    });
                    return res.map(item => ({
                        ...item,
                        productName: prod.name
                    }));
                })
            );
            const merged = allHistory.flat().sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());
            setHistoryData(merged);
        } catch (e) {
            console.error('Failed to load history:', e);
            setHistoryData([]);
        } finally {
            setHistoryLoading(false);
        }
    };

    const closeHistory = () => {
        setHistoryModal(null);
        setHistoryData([]);
    };

    // Grouping logic (display material once, group products)
    const groupedData = useMemo(() => {
        const groups: Record<string, GroupedBalanceRow> = {};

        data.forEach(row => {
            const key = `${row.jenis}-${row.nama}`;
            const rowUnit = normalizeUnit(row.satuan);
            
            if (!groups[key]) {
                const displayUnit = normalizeUnit(row.satuan);
                const convertedIn = convertUnitFE(row.totalIn, rowUnit, displayUnit);
                const convertedOut = convertUnitFE(row.totalOut, rowUnit, displayUnit);
                const convertedStok = convertUnitFE(row.stok, rowUnit, displayUnit);

                groups[key] = {
                    nama: row.nama,
                    jenis: row.jenis,
                    satuan: row.satuan,
                    totalIn: convertedIn,
                    totalOut: convertedOut,
                    stok: convertedStok,
                    products: []
                };
            }

            if (!groups[key].products.some(p => p.slug === row.productSlug)) {
                groups[key].products.push({
                    slug: row.productSlug,
                    name: row.productName
                });
            }
        });

        return Object.values(groups);
    }, [data]);

    // Filtering logic for Baku
    const filteredBaku = useMemo(() => {
        return groupedData.filter(row => {
            const matchesSearch = row.nama.toLowerCase().includes(search.toLowerCase()) || 
                                 row.products.some(p => p.name.toLowerCase().includes(search.toLowerCase()));
            return matchesSearch && row.jenis === 'Baku';
        });
    }, [groupedData, search]);

    // Filtering logic for Penolong
    const filteredPenolong = useMemo(() => {
        return groupedData.filter(row => {
            const matchesSearch = row.nama.toLowerCase().includes(search.toLowerCase()) || 
                                 row.products.some(p => p.name.toLowerCase().includes(search.toLowerCase()));
            return matchesSearch && row.jenis === 'Penolong';
        });
    }, [groupedData, search]);

    // Separate Paginations
    const bakuPagination = usePagination(filteredBaku);
    const penolongPagination = usePagination(filteredPenolong);

    const renderRow = (row: GroupedBalanceRow, idx: number) => {
        const converted = getConvertedRow(row);
        const unitFamily = getUnitFamily(row.satuan);

        return (
            <tr key={`${row.jenis}-${row.nama}`} className="hover:bg-emerald-50/10 transition-colors group">
                <td className="px-4 py-3 text-emerald-600 font-medium text-center border border-gray-200">{idx + 1}</td>
                <td className="px-4 py-3 border border-gray-200">
                    <div className="flex flex-wrap gap-1">
                        {row.products.map(p => (
                            <ProductBadge key={p.slug} name={p.name} />
                        ))}
                    </div>
                </td>
                <td className="px-4 py-3 border border-gray-200">
                    <div className="flex items-center gap-2.5">
                        <div className={cn(
                            'w-2 h-2 rounded-full shrink-0',
                            row.jenis === 'Baku' ? 'bg-emerald-500' : 'bg-amber-500'
                        )} />
                        <span className="text-gray-800 font-medium">{row.nama}</span>
                    </div>
                </td>
                <td className="px-4 py-3 text-center border border-gray-200">
                    {unitFamily.length > 1 ? (
                        <select
                            value={converted.satuan}
                            onChange={(e) => handleSatuanChange(row.jenis, row.nama, e.target.value)}
                            className="bg-gray-50 border border-gray-200 text-sm font-medium text-gray-700 rounded-lg px-2 py-1 cursor-pointer hover:border-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-400 transition-all appearance-none text-center"
                            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 4px center', paddingRight: '18px' }}
                        >
                            {unitFamily.map(u => (
                                <option key={u} value={u}>{u}</option>
                            ))}
                        </select>
                    ) : (
                        <span className="text-sm text-gray-500">{converted.satuan}</span>
                    )}
                </td>
                <td className="px-4 py-3 text-center border border-gray-200">
                    {converted.totalIn > 0 ? (
                        <button
                            onClick={() => openHistory(row.nama, 'Suplai', row.products)}
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-md text-sm font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-100 hover:border-blue-200 transition-all cursor-pointer group/in"
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500"><polyline points="17 1 21 5 17 9" /><path d="M3 11V9a4 4 0 0 1 4-4h14" /></svg>
                            {fmtNumber(converted.totalIn)} <span className="text-[11px] font-normal text-blue-600/70">{converted.satuan}</span>
                        </button>
                    ) : (
                        <span className="text-sm text-gray-300 font-mono">—</span>
                    )}
                </td>
                <td className="px-4 py-3 text-center border border-gray-200">
                    {converted.totalOut > 0 ? (
                        <button
                            onClick={() => openHistory(row.nama, 'Mutasi', row.products)}
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-md text-sm font-semibold text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-100 hover:border-orange-200 transition-all cursor-pointer group/out"
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-orange-500"><polyline points="7 1 3 5 7 9" /><path d="M21 11V9a4 4 0 0 0-4-4H3" /></svg>
                            {fmtNumber(converted.totalOut)} <span className="text-[11px] font-normal text-orange-600/70">{converted.satuan}</span>
                        </button>
                    ) : (
                        <span className="text-sm text-gray-300 font-mono">—</span>
                    )}
                </td>
                <td className="px-4 py-3 text-center border border-gray-200">
                    <span className={cn(
                        'inline-flex items-center gap-1 px-3 py-1 rounded-lg text-sm font-bold',
                        converted.stok > 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                            converted.stok < 0 ? 'bg-red-50 text-red-600 border border-red-100' :
                                'bg-gray-50 text-gray-400 border border-gray-100'
                    )}>
                        {fmtNumber(converted.stok)} <span className="text-xs font-normal opacity-70">{converted.satuan}</span>
                    </span>
                </td>
            </tr>
        );
    };

    return (
        <>
            <div className="p-4 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between">
                <div className="flex gap-2">
                    {(['All', 'Baku', 'Penolong'] as const).map(cat => (
                        <button
                            key={cat}
                            onClick={() => setCategoryFilter(cat)}
                            className={cn(
                                'px-3 py-1.5 rounded-full text-xs font-medium transition-colors border',
                                categoryFilter === cat
                                    ? 'bg-white text-emerald-700 border-emerald-200 shadow-sm'
                                    : 'text-gray-500 border-transparent hover:bg-white hover:border-gray-200'
                            )}
                        >
                            {cat === 'All' ? 'Semua' : cat === 'Baku' ? 'Bahan Baku' : 'Bahan Penolong'}
                        </button>
                    ))}
                </div>
            </div>

            <div className="p-6 space-y-10">
                {/* 1. Bahan Baku Section */}
                {(categoryFilter === 'All' || categoryFilter === 'Baku') && (
                    <div className="space-y-4">
                        <div className="border-b border-gray-150 pb-2">
                            <h3 className="text-sm font-bold text-emerald-700 uppercase tracking-wider">Bahan Baku</h3>
                        </div>
                        <div className="overflow-x-auto border border-gray-200">
                            <table className="w-full text-sm border-collapse">
                                <thead>
                                    <tr className="bg-gray-50/80">
                                        <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200 text-center w-12">No</th>
                                        <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200 text-left">Produk</th>
                                        <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200 text-left">Nama Bahan</th>
                                        <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200 text-center w-24">Satuan</th>
                                        <th className="px-4 py-3 text-xs font-semibold text-blue-700 uppercase tracking-wider border border-gray-200 text-center">In (Masuk)</th>
                                        <th className="px-4 py-3 text-xs font-semibold text-orange-700 uppercase tracking-wider border border-gray-200 text-center">Out (Keluar)</th>
                                        <th className="px-4 py-3 text-xs font-semibold text-emerald-700 uppercase tracking-wider border border-gray-200 text-center">Stok Akhir</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white">
                                    {bakuPagination.paginated.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                                                Tidak ada data Bahan Baku.
                                            </td>
                                        </tr>
                                    ) : (
                                        bakuPagination.paginated.map((row, idx) => renderRow(row, (bakuPagination.page - 1) * 10 + idx))
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <AppPagination
                            currentPage={bakuPagination.page}
                            totalPages={bakuPagination.totalPages}
                            onPageChange={bakuPagination.setPage}
                            totalItems={bakuPagination.total}
                        />
                    </div>
                )}

                {/* 2. Bahan Penolong Section */}
                {(categoryFilter === 'All' || categoryFilter === 'Penolong') && (
                    <div className="space-y-4">
                        <div className="border-b border-gray-150 pb-2">
                            <h3 className="text-sm font-bold text-amber-700 uppercase tracking-wider">Bahan Penolong</h3>
                        </div>
                        <div className="overflow-x-auto border border-gray-200">
                            <table className="w-full text-sm border-collapse">
                                <thead>
                                    <tr className="bg-gray-50/80">
                                        <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200 text-center w-12">No</th>
                                        <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200 text-left">Produk</th>
                                        <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200 text-left">Nama Bahan</th>
                                        <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200 text-center w-24">Satuan</th>
                                        <th className="px-4 py-3 text-xs font-semibold text-blue-700 uppercase tracking-wider border border-gray-200 text-center">In (Masuk)</th>
                                        <th className="px-4 py-3 text-xs font-semibold text-orange-700 uppercase tracking-wider border border-gray-200 text-center">Out (Keluar)</th>
                                        <th className="px-4 py-3 text-xs font-semibold text-emerald-700 uppercase tracking-wider border border-gray-200 text-center">Stok Akhir</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white">
                                    {penolongPagination.paginated.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                                                Tidak ada data Bahan Penolong.
                                            </td>
                                        </tr>
                                    ) : (
                                        penolongPagination.paginated.map((row, idx) => renderRow(row, (penolongPagination.page - 1) * 10 + idx))
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <AppPagination
                            currentPage={penolongPagination.page}
                            totalPages={penolongPagination.totalPages}
                            onPageChange={penolongPagination.setPage}
                            totalItems={penolongPagination.total}
                        />
                    </div>
                )}
            </div>

            {/* History Modal */}
            {historyModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={closeHistory}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className={cn(
                            'flex items-center justify-between px-6 py-4 border-b',
                            historyModal.tipe === 'Suplai' ? 'bg-gradient-to-r from-blue-50 to-white border-blue-100' : 'bg-gradient-to-r from-orange-50 to-white border-orange-100'
                        )}>
                            <div>
                                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                                    {historyModal.tipe === 'Suplai' ? (
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-500"><polyline points="17 1 21 5 17 9" /><path d="M3 11V9a4 4 0 0 1 4-4h14" /></svg>
                                    ) : (
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-orange-600"><polyline points="7 1 3 5 7 9" /><path d="M21 11V9a4 4 0 0 0-4-4H3" /></svg>
                                    )}
                                    Riwayat {historyModal.tipe}
                                </h3>
                                <p className="text-sm text-gray-500 mt-0.5">Material: <span className="font-semibold text-gray-700">{historyModal.nama}</span></p>
                            </div>
                            <button onClick={closeHistory} className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            {historyLoading ? (
                                <div className="flex items-center justify-center py-16">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
                                </div>
                            ) : historyData.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mb-3"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                                    <p className="text-sm">Tidak ada data riwayat.</p>
                                </div>
                            ) : (
                                <table className="w-full text-sm border-collapse border border-gray-200">
                                    <thead className="sticky top-0 bg-white z-10">
                                        <tr className="bg-gray-50/80">
                                            <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200 text-center w-10">No</th>
                                            <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200 text-left">Produk</th>
                                            <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200 text-left">Tanggal</th>
                                            <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200 text-right">Kuantum</th>
                                            <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200 text-center">Satuan</th>
                                            <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200 text-left">Dokumen</th>
                                            <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200 text-left">Keterangan</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white">
                                        {historyData.map((item: any, idx) => (
                                            <tr key={item.id} className="hover:bg-emerald-50/10 transition-colors group">
                                                <td className="px-4 py-3 text-gray-700 text-center font-medium border border-gray-200">{idx + 1}</td>
                                                <td className="px-4 py-3 border border-gray-200">
                                                    <ProductBadge name={item.productName} />
                                                </td>
                                                <td className="px-4 py-3 text-gray-700 border border-gray-200">{format(new Date(item.tanggal), 'dd/MM/yyyy')}</td>
                                                <td className="px-4 py-3 text-right font-mono text-gray-700 border border-gray-200">{fmtNumber(item.kuantum)}</td>
                                                <td className="px-4 py-3 text-center text-[11px] text-gray-500 border border-gray-200">{item.satuan || 'Kg'}</td>
                                                <td className="px-4 py-3 text-gray-700 border border-gray-200">{item.dokumen || '—'}</td>
                                                <td className="px-4 py-3 text-gray-600 max-w-xs truncate border border-gray-200">{item.keterangan || '—'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="bg-gray-50/80">
                                        <tr>
                                            <td colSpan={3} className="px-4 py-3 text-right text-xs font-bold text-gray-700 border border-gray-200 uppercase tracking-wider">Total</td>
                                            <td className="px-4 py-3 text-right font-mono font-bold text-gray-800 border border-gray-200">{fmtNumber(historyData.reduce((s, i) => s + i.kuantum, 0))}</td>
                                            <td colSpan={3} className="border border-gray-200"></td>
                                        </tr>
                                    </tfoot>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

/* ═══════════════════════════════════════════ */
/*  Unified Configuration Tab (All Products)   */
/* ═══════════════════════════════════════════ */

import { AddMaterialModal, EditMaterialModal } from './ConfigurationTab';

interface GroupedMaterial {
    masterItemId: number;
    nama: string;
    satuan?: string;
    jenis: 'Baku' | 'Penolong';
    products: { slug: string; name: string; assignmentId: number }[];
}

interface ConfigurationAllTabProps {
    products: ProductInfo[];
    bakuList: GroupedMaterial[];
    penolongList: GroupedMaterial[];
    isLoading: boolean;
    onRefresh: () => void;
    selectedProductSlug: string;
}

export function ConfigurationAllTab({ products, bakuList, penolongList, isLoading, onRefresh, selectedProductSlug }: ConfigurationAllTabProps) {
    const filteredBaku = useMemo(() => {
        if (selectedProductSlug === 'all') return bakuList;
        return bakuList.filter(m => m.products.some(p => p.slug === selectedProductSlug));
    }, [bakuList, selectedProductSlug]);

    const filteredPenolong = useMemo(() => {
        if (selectedProductSlug === 'all') return penolongList;
        return penolongList.filter(m => m.products.some(p => p.slug === selectedProductSlug));
    }, [penolongList, selectedProductSlug]);

    const handleRemove = async (row: GroupedMaterial) => {
        const prodNames = row.products.map(p => p.name).join(', ');
        if (!confirm(`Hapus material "${row.nama}" dari produk: ${prodNames}?`)) return;
        try {
            await masterItemService.deleteMasterItem(row.masterItemId);
            onRefresh();
        } catch (error) {
            console.error('Failed to delete material:', error);
            alert('Gagal menghapus material: ' + error);
        }
    };

    return (
        <div className="space-y-10 animate-in fade-in duration-500 pb-10">
            {isLoading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
                </div>
            ) : (
                <>
                    <MaterialAllTableSection
                        title="Bahan Baku"
                        description="Komponen utama untuk produksi (contoh: Dolomite, Gambut)."
                        items={filteredBaku}
                        jenis="Baku"
                        products={products}
                        onUpdate={onRefresh}
                        onRemove={handleRemove}
                        colorTheme="emerald"
                    />

                    <MaterialAllTableSection
                        title="Bahan Penolong"
                        description="Bahan pelengkap dan kemasan (contoh: Botol, Stiker)."
                        items={filteredPenolong}
                        jenis="Penolong"
                        products={products}
                        onUpdate={onRefresh}
                        onRemove={handleRemove}
                        colorTheme="amber"
                    />
                </>
            )}
        </div>
    );
}

/* ═══════════════════════════════════════════ */
/*  Material All Table Section (with Product)  */
/* ═══════════════════════════════════════════ */

interface MaterialAllTableSectionProps {
    title: string;
    description: string;
    items: GroupedMaterial[];
    jenis: 'Baku' | 'Penolong';
    products: ProductInfo[];
    onUpdate: () => void;
    onRemove: (row: GroupedMaterial) => void;
    colorTheme: 'emerald' | 'amber';
}

function MaterialAllTableSection({ title, description, items, jenis, products, onUpdate, onRemove, colorTheme }: MaterialAllTableSectionProps) {
    const [search, setSearch] = useState('');
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);

    // Edit State
    const [editId, setEditId] = useState<number | null>(null);
    const [editName, setEditName] = useState('');
    const [editUnit, setEditUnit] = useState('');

    // Filter items based on local search
    const filteredItems = useMemo(() => {
        return items.filter(item =>
            item.nama.toLowerCase().includes(search.toLowerCase()) ||
            item.products.some(p => p.name.toLowerCase().includes(search.toLowerCase()))
        );
    }, [items, search]);

    // Pagination
    const { page, setPage, totalPages, paginated, total } = usePagination(filteredItems);

    const openEditModal = (item: GroupedMaterial) => {
        setEditId(item.masterItemId);
        setEditName(item.nama);
        setEditUnit(item.satuan || '');
        setIsEditOpen(true);
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
            ring: 'focus:ring-amber-500'
        }
    };

    const theme = themeColors[colorTheme];
    const defaultProductSlug = products[0]?.slug || 'petro-gladiator';

    return (
        <div className="bg-white border border-gray-200 overflow-hidden">
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
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="11" cy="11" r="8" />
                            <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                        <input
                            type="text"
                            placeholder={`Cari ${jenis}...`}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all"
                        />
                    </div>
                    <AppButton
                        onClick={() => setIsAddOpen(true)}
                        className={cn("flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors", theme.btn)}
                    >
                        <PlusIcon size={16} />
                        Tambah Data
                    </AppButton>
                </div>
            </div>

            {/* Table Section */}
            <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse border border-gray-200">
                    <thead className="bg-gray-50/80">
                        <tr>
                            <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200 text-center w-16">No</th>
                            <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200 text-left">Nama Material</th>
                            <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200 text-left">Produk</th>
                            <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200 text-left w-36">Satuan Default</th>
                            <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200 text-right w-24">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white">
                        {paginated.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-4 py-12 text-center text-gray-500 border border-gray-200">
                                    <div className="flex flex-col items-center justify-center">
                                        <p className="font-medium text-gray-900 mb-1">Tidak ada data</p>
                                        <p className="text-xs text-gray-400">Belum ada material yang ditambahkan atau tidak cocok dengan pencarian.</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            paginated.map((item, index) => (
                                <tr key={item.masterItemId} className="group hover:bg-emerald-50/10 transition-colors">
                                    <td className="px-4 py-3 text-center text-gray-500 border border-gray-200">
                                        {(page - 1) * 10 + index + 1}
                                    </td>
                                    <td className="px-4 py-3 border border-gray-200 font-medium text-gray-900">
                                        {item.nama}
                                    </td>
                                    <td className="px-4 py-3 border border-gray-200">
                                        <div className="flex flex-wrap gap-1">
                                            {item.products.map(p => (
                                                <ProductBadge key={p.slug} name={p.name} />
                                            ))}
                                        </div>
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
                                        <div className="flex items-center justify-end gap-1">
                                            <button
                                                onClick={() => openEditModal(item)}
                                                className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                                                title="Edit"
                                            >
                                                <PencilIcon size={14} />
                                            </button>
                                            <button
                                                onClick={() => onRemove(item)}
                                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                                title="Hapus dari Produk"
                                            >
                                                <TrashIcon size={14} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <div className="p-4 border-t border-gray-100">
                <AppPagination
                    currentPage={page}
                    totalPages={totalPages}
                    onPageChange={setPage}
                    totalItems={total}
                />
            </div>

            {isAddOpen && (
                <AddMaterialModal
                    isOpen={isAddOpen}
                    onClose={() => setIsAddOpen(false)}
                    jenis={jenis}
                    productSlug={defaultProductSlug}
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
                    productSlug={defaultProductSlug}
                    onSuccess={onUpdate}
                />
            )}
        </div>
    );
}
