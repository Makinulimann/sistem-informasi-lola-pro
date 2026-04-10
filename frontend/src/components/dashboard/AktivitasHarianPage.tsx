'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import {
    aktivitasHarianService,
    AktivitasHarian,
    LogbookPic,
    LogbookLokasi,
} from '@/lib/aktivitasHarianService';
import { PencilIcon, Trash2Icon, PlusIcon, SearchIcon, XIcon, CalendarIcon, MapPinIcon, UserIcon, FileTextIcon, ImageIcon, ChevronLeftIcon, ChevronRightIcon, SettingsIcon, UploadIcon, CheckIcon, ArrowUpDownIcon, ArrowUpIcon, ArrowDownIcon } from 'lucide-react';
import { useToast } from '@/components/ui/toast';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { InputModal } from '@/components/ui/input-modal';
import { AktivitasImportModal } from './AktivitasImportModal';
import { AppButton } from '@/components/ui/app-button';
import { AppSelect } from '@/components/ui/app-select';
import { AppSearchBar } from '@/components/ui/app-search-bar';
import { AppPagination } from '@/components/ui/app-pagination';

/* ─── Types ─── */

type TabKey = 'data' | 'konfigurasi';

const tabs: { key: TabKey; label: string }[] = [
    { key: 'data', label: 'Data Aktivitas' },
    { key: 'konfigurasi', label: 'Konfigurasi' },
];

// Obsolete selection arrays removed since using native month input

/* ─── Main Component ─── */

interface AktivitasHarianPageProps {
    productCategory: string;
    productName?: string;
    productSlug?: string;
}

export function AktivitasHarianPage({ productCategory, productName, productSlug }: AktivitasHarianPageProps) {
    const [activeTab, setActiveTab] = useState<TabKey>('data');
    const [search, setSearch] = useState('');
    const currentMonth = new Date().toISOString().substring(0, 7);
    const [periode, setPeriode] = useState<string>(currentMonth);
    const [jenisProduk, setJenisProduk] = useState('');
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);

    // Data
    const [aktivitasData, setAktivitasData] = useState<AktivitasHarian[]>([]);
    const [pics, setPics] = useState<LogbookPic[]>([]);
    const [lokasis, setLokasis] = useState<LogbookLokasi[]>([]);

    // UI
    const [isLoading, setIsLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<AktivitasHarian | null>(null);

    // Delete confirm modal
    const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; id: number | null }>({ isOpen: false, id: null });
    const [isDeleting, setIsDeleting] = useState(false);

    // Sorting
    const [sortBy, setSortBy] = useState<string | undefined>('tanggal');
    const [sortDesc, setSortDesc] = useState<boolean>(true);

    const toast = useToast();

    // Fetch data
    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [year, month] = periode ? periode.split('-') : ['', ''];
            const response = await aktivitasHarianService.getAll({
                bulan: month ? Number(month).toString() : undefined,
                tahun: year ? String(year) : undefined,
                search: search || undefined,
                jenisProduk: jenisProduk || undefined,
                page: page,
                limit: 10,
                sortBy,
                sortDesc
            });
            const responseData = response.data || (response as any).Data || [];
            const responseTotal = response.total || (response as any).Total || 0;

            setAktivitasData(responseData);
            setTotal(responseTotal);
        } catch (error) {
            console.error('Failed to fetch data:', error);
        } finally {
            setIsLoading(false);
        }
    }, [periode, search, jenisProduk, page, sortBy, sortDesc]);

    useEffect(() => {
        setPage(1);
    }, [search, periode, jenisProduk]);

    const fetchTemplates = useCallback(async () => {
        try {
            const [picData, lokasiData] = await Promise.all([
                aktivitasHarianService.getPics(),
                aktivitasHarianService.getLokasis(),
            ]);
            setPics(picData);
            setLokasis(lokasiData);
        } catch (error) {
            console.error('Failed to fetch templates:', error);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        fetchTemplates();
    }, [fetchTemplates]);

    // Handlers
    const handleCreate = () => {
        setEditingItem(null);
        setIsModalOpen(true);
    };

    const handleEdit = (item: AktivitasHarian) => {
        setEditingItem(item);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: number) => {
        setDeleteConfirm({ isOpen: true, id });
    };

    const confirmDelete = async () => {
        if (!deleteConfirm.id) return;
        setIsDeleting(true);
        try {
            await aktivitasHarianService.delete(deleteConfirm.id);
            toast.success('Berhasil', 'Data aktivitas berhasil dihapus.');
            fetchData();
        } catch (error) {
            console.error('Failed to delete:', error);
            toast.error('Gagal', 'Gagal menghapus data.');
        } finally {
            setIsDeleting(false);
            setDeleteConfirm({ isOpen: false, id: null });
        }
    };

    const handleModalSubmit = async (data: any) => {
        try {
            if (editingItem) {
                await aktivitasHarianService.update(editingItem.id, data);
                toast.success('Berhasil', 'Data aktivitas berhasil diperbarui.');
            } else {
                await aktivitasHarianService.create(data);
                toast.success('Berhasil', 'Data aktivitas berhasil ditambahkan.');
            }
            setIsModalOpen(false);
            setEditingItem(null);
            fetchData();
            fetchTemplates();
        } catch (error) {
            console.error('Failed to save:', error);
            toast.error('Gagal', 'Gagal menyimpan data.');
        }
    };

    return (
        <div className="space-y-6">
            {/* Confirm Modal */}
            <ConfirmModal
                isOpen={deleteConfirm.isOpen}
                onClose={() => setDeleteConfirm({ isOpen: false, id: null })}
                onConfirm={confirmDelete}
                title="Hapus Data Aktivitas"
                message="Apakah Anda yakin ingin menghapus data aktivitas ini? Tindakan ini tidak dapat dibatalkan."
                confirmText="Hapus"
                variant="danger"
                isLoading={isDeleting}
            />

            {/* Import Modal */}
            <AktivitasImportModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                onSuccess={() => {
                    fetchData();
                }}
            />

            {/* Modal */}
            <AktivitasModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setEditingItem(null);
                }}
                onSubmit={handleModalSubmit}
                initialData={editingItem}
                pics={pics}
                lokasis={lokasis}
            />

            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-gray-400">
                <span className="text-gray-500">Dashboard</span>
                <span>/</span>
                <span className="text-gray-500">{productCategory}</span>
                <span>/</span>
                {productName && (
                    <>
                        <span className="text-gray-500">{productName}</span>
                        <span>/</span>
                    </>
                )}
                <span className="text-gray-800 font-medium">Aktivitas Harian</span>
            </div>

            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                        {productCategory} {productName ? `/ ${productName} ` : ''}/ Aktivitas Harian
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Logbook harian kegiatan operasional</p>
                </div>
            </div>

            {/* Main Card */}
            <div className="bg-white border border-gray-200 overflow-hidden">
                {/* Tabs */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-gray-100">
                    <div className="flex">
                        {tabs.map((tab) => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium transition-colors relative
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
                    {activeTab === 'data' && (
                        <div className="px-4 py-2 sm:py-0 flex gap-3">
                            <AppButton
                                onClick={() => setIsImportModalOpen(true)}
                                variant="secondary"
                                icon={<UploadIcon className="size-4" />}
                            >
                                Import Excel
                            </AppButton>
                            <AppButton
                                onClick={handleCreate}
                                variant="primary"
                                icon={<PlusIcon className="size-4" />}
                            >
                                Tambah Aktivitas
                            </AppButton>
                        </div>
                    )}
                </div>

                {/* Filters */}
                {activeTab === 'data' && (
                    <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                        <div className="flex flex-col md:flex-row md:items-end gap-4 justify-between">
                            <div className="flex flex-col sm:flex-row gap-3 items-end">
                                <div className="flex items-center gap-2 bg-white px-3 py-1 border border-gray-200">
                                    <span className="text-sm font-medium text-gray-500">Periode:</span>
                                <div className="flex items-center gap-1 group">
                                    <AppButton 
                                        onClick={() => {
                                            if (!periode) return;
                                            const d = new Date(`${periode}-01T12:00:00`);
                                            d.setMonth(d.getMonth() - 1);
                                            setPeriode(format(d, 'yyyy-MM'));
                                        }}
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-gray-400 hover:text-emerald-600"
                                        title="Bulan Sebelumnya"
                                        icon={<ChevronLeftIcon className="size-4" />}
                                    />
                                    <input 
                                        type="month" 
                                        value={periode}
                                        onChange={(e) => setPeriode(e.target.value)}
                                        className="bg-transparent text-sm font-medium text-gray-700 focus:outline-none cursor-pointer hover:text-emerald-600 transition-colors px-1"
                                    />
                                    <AppButton 
                                        onClick={() => {
                                            if (!periode) return;
                                            const d = new Date(`${periode}-01T12:00:00`);
                                            d.setMonth(d.getMonth() + 1);
                                            setPeriode(format(d, 'yyyy-MM'));
                                        }}
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-gray-400 hover:text-emerald-600"
                                        title="Bulan Selanjutnya"
                                        icon={<ChevronRightIcon className="size-4" />}
                                    />
                                </div>
                                <span className="text-gray-300">/</span>
                                <AppSelect
                                    variant="ghost"
                                    value={jenisProduk}
                                    onChange={(e) => setJenisProduk(e.target.value)}
                                    options={[
                                        { value: '', label: 'Semua Jenis' },
                                        { value: 'Produk Padat', label: 'Produk Padat' },
                                        { value: 'Produk Cair', label: 'Produk Cair' },
                                    ]}
                                    className="pr-2"
                                />
                                </div>
                                {(periode || jenisProduk) && (
                                    <AppButton
                                        onClick={() => { setPeriode(''); setJenisProduk(''); }}
                                        variant="secondary"
                                        size="md"
                                        icon={<XIcon className="size-4" />}
                                        className="hover:text-red-600 hover:border-red-200"
                                    />
                                )}
                            </div>
                            <AppSearchBar
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Cari PIC, lokasi, atau deskripsi..."
                                containerClassName="w-full md:w-72"
                            />
                        </div>
                    </div>
                )}

                {/* Content */}
                <div className="min-h-[400px]">
                    {isLoading && activeTab === 'data' ? (
                        <div className="flex items-center justify-center h-48">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
                        </div>
                    ) : (
                        <>
                            {activeTab === 'data' && (
                                <AktivitasTable
                                    data={aktivitasData}
                                    page={page}
                                    setPage={setPage}
                                    total={total}
                                    onEdit={handleEdit}
                                    onDelete={handleDelete}
                                    sortBy={sortBy}
                                    sortDesc={sortDesc}
                                    onSort={(col) => {
                                        if (sortBy === col) {
                                            setSortDesc(!sortDesc);
                                        } else {
                                            setSortBy(col);
                                            setSortDesc(false);
                                        }
                                    }}
                                />
                            )}
                            {activeTab === 'konfigurasi' && (
                                <KonfigurasiTab
                                    pics={pics}
                                    lokasis={lokasis}
                                    onRefresh={fetchTemplates}
                                />
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════ */
/*  Aktivitas Table                            */
/* ═══════════════════════════════════════════ */

function AktivitasTable({
    data,
    page,
    setPage,
    total,
    onEdit,
    onDelete,
    sortBy,
    sortDesc,
    onSort
}: {
    data: AktivitasHarian[];
    page: number;
    setPage: (p: number) => void;
    total: number;
    onEdit: (item: AktivitasHarian) => void;
    onDelete: (id: number) => void;
    sortBy?: string;
    sortDesc?: boolean;
    onSort: (column: string) => void;
}) {
    const totalPages = Math.max(1, Math.ceil(total / 10));

    if (total === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <FileTextIcon className="size-12 mb-3 opacity-40" />
                <p className="text-sm font-medium">Belum ada data aktivitas</p>
                <p className="text-xs mt-1">Klik &quot;Tambah Aktivitas&quot; untuk menambahkan data baru</p>
            </div>
        );
    }

    return (
        <>
            {/* Desktop Table */}
            <div className="overflow-x-auto hidden sm:block">
                <table className="w-full text-sm border-collapse border border-gray-200">
                    <thead>
                        <tr className="bg-gray-50/80">
                            {[
                                { key: 'no', label: 'No', width: 'w-12', sortable: false },
                                { key: 'tanggal', label: 'Tanggal', width: 'w-32', sortable: true },
                                { key: 'jenis_produk', label: 'Jenis Produk', width: 'w-36', sortable: true },
                                { key: 'pic', label: 'PIC', width: 'w-36', sortable: true },
                                { key: 'lokasi', label: 'Lokasi', width: 'w-36', sortable: true },
                                { key: 'deskripsi', label: 'Deskripsi Kegiatan', width: '', sortable: true },
                                { key: 'dokumentasi', label: 'Dokumentasi', width: 'w-36', sortable: true },
                                { key: 'aksi', label: 'Aksi', width: 'w-24', sortable: false }
                            ].map((col) => (
                                <th
                                    key={col.key}
                                    onClick={() => col.sortable ? onSort(col.key) : undefined}
                                    className={`text-left px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200 ${col.width} ${col.sortable ? 'cursor-pointer hover:bg-gray-100 transition-colors select-none' : ''}`}
                                >
                                    <div className="flex items-center gap-1.5">
                                        {col.label}
                                        {col.sortable && (
                                            <span className="text-gray-400">
                                                {sortBy === col.key ? (
                                                    sortDesc ? <ArrowDownIcon className="size-3.5 text-emerald-600" /> : <ArrowUpIcon className="size-3.5 text-emerald-600" />
                                                ) : (
                                                    <ArrowUpDownIcon className="size-3.5 opacity-50" />
                                                )}
                                            </span>
                                        )}
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="bg-white">
                        {data.map((item, idx) => (
                            <tr key={item.id} className="hover:bg-emerald-50/10 transition-colors">
                                <td className="px-4 py-3 text-gray-700 font-medium border border-gray-200">{(page - 1) * 10 + idx + 1}</td>
                                <td className="px-4 py-3 border border-gray-200 text-gray-700">
                                    {format(new Date(item.tanggal), 'dd/MM/yyyy')}
                                </td>
                                <td className="px-4 py-3 border border-gray-200 text-gray-700">
                                    {item.jenis_produk ? item.jenis_produk : '-'}
                                </td>
                                <td className="px-4 py-3 border border-gray-200 text-gray-700">
                                    {item.pic ? item.pic : '-'}
                                </td>
                                <td className="px-4 py-3 border border-gray-200 text-gray-700">
                                    {item.lokasi}
                                </td>
                                <td className="px-4 py-3 border border-gray-200 text-gray-700 min-w-[350px]">
                                    <ul className="list-disc list-outside ml-4 space-y-1">
                                        {item.deskripsi.split('\n').filter(d => d.trim()).map((line, i) => (
                                            <li key={i} title={line}>{line}</li>
                                        ))}
                                    </ul>
                                </td>
                                <td className="px-4 py-3 border border-gray-200 text-gray-700">
                                    {item.dokumentasi ? item.dokumentasi : '-'}
                                </td>
                                <td className="px-4 py-3 border border-gray-200">
                                    <div className="flex items-center justify-center gap-1">
                                        <AppButton
                                            onClick={() => onEdit(item)}
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-gray-400 hover:text-emerald-600"
                                            title="Edit"
                                            icon={<PencilIcon className="size-4" />}
                                        />
                                        <AppButton
                                            onClick={() => onDelete(item.id)}
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-gray-400 hover:text-red-600"
                                            title="Hapus"
                                            icon={<Trash2Icon className="size-4" />}
                                        />
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Mobile Cards */}
            <div className="sm:hidden divide-y divide-gray-100">
                {data.map((item) => (
                    <div key={item.id} className="p-4 hover:bg-gray-50/50">
                        <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
                                {format(new Date(item.tanggal), 'dd MMM yyyy', { locale: localeId })}
                            </div>
                            <div className="flex items-center gap-1">
                                <button onClick={() => onEdit(item)} className="p-1 text-gray-400 hover:text-emerald-600"><PencilIcon className="size-4" /></button>
                                <button onClick={() => onDelete(item.id)} className="p-1 text-gray-400 hover:text-red-600"><Trash2Icon className="size-4" /></button>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2 mb-2">
                            <div className="flex flex-wrap gap-1.5">
                                {item.pic ? item.pic.split(', ').map((p, i) => (
                                    <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-medium">
                                        <UserIcon className="size-3" />{p}
                                    </span>
                                )) : null}
                            </div>
                            <span className="inline-flex items-center px-2.5 py-1 bg-amber-50 text-amber-700 rounded-full text-xs font-medium">
                                {item.lokasi}
                            </span>
                        </div>
                        <ul className="list-disc list-outside ml-4 space-y-1 text-sm text-gray-700 mt-2">
                            {item.deskripsi.split('\n').filter(d => d.trim()).map((line, i) => (
                                <li key={i}>{line}</li>
                            ))}
                        </ul>
                        {item.dokumentasi && (
                            <p className="text-xs text-emerald-600 mt-1.5 flex items-center gap-1">
                                <ImageIcon className="size-3" />{item.dokumentasi}
                            </p>
                        )}
                    </div>
                ))}
            </div>

            {/* Pagination */}
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
/*  Konfigurasi Tab                            */
/* ═══════════════════════════════════════════ */

function KonfigurasiTab({
    pics,
    lokasis,
    onRefresh,
}: {
    pics: LogbookPic[];
    lokasis: LogbookLokasi[];
    onRefresh: () => void;
}) {
    /* ── PIC state ── */
    const [picSearch, setPicSearch] = useState('');
    const [picPage, setPicPage] = useState(1);
    const [newPic, setNewPic] = useState('');
    const [isAddingPic, setIsAddingPic] = useState(false);
    const [editingPicId, setEditingPicId] = useState<number | null>(null);
    const [editingPicNama, setEditingPicNama] = useState('');

    /* ── Lokasi state ── */
    const [lokasiSearch, setLokasiSearch] = useState('');
    const [lokasiPage, setLokasiPage] = useState(1);
    const [newLokasi, setNewLokasi] = useState('');
    const [isAddingLokasi, setIsAddingLokasi] = useState(false);
    const [editingLokasiId, setEditingLokasiId] = useState<number | null>(null);
    const [editingLokasiNama, setEditingLokasiNama] = useState('');

    const toast = useToast();

    /* -- Delete confirmation states -- */
    const [picDeleteConfirm, setPicDeleteConfirm] = useState<{ isOpen: boolean; id: number | null; nama: string }>({ isOpen: false, id: null, nama: '' });
    const [lokasiDeleteConfirm, setLokasiDeleteConfirm] = useState<{ isOpen: boolean; id: number | null; nama: string }>({ isOpen: false, id: null, nama: '' });
    const [isDeletingConfig, setIsDeletingConfig] = useState(false);

    /* -- Input modal states -- */
    const [picInputModal, setPicInputModal] = useState(false);
    const [lokasiInputModal, setLokasiInputModal] = useState(false);

    const PAGE_SIZE = 10;

    /* ── Filtered & paginated data ── */
    const filteredPics = pics.filter(p => p.nama.toLowerCase().includes(picSearch.toLowerCase()));
    const picTotalPages = Math.max(1, Math.ceil(filteredPics.length / PAGE_SIZE));
    const paginatedPics = filteredPics.slice((picPage - 1) * PAGE_SIZE, picPage * PAGE_SIZE);

    const filteredLokasis = lokasis.filter(l => l.nama.toLowerCase().includes(lokasiSearch.toLowerCase()));
    const lokasiTotalPages = Math.max(1, Math.ceil(filteredLokasis.length / PAGE_SIZE));
    const paginatedLokasis = filteredLokasis.slice((lokasiPage - 1) * PAGE_SIZE, lokasiPage * PAGE_SIZE);

    /* ── PIC handlers ── */
    const handleAddPic = async (nama?: string) => {
        const picName = nama || newPic;
        if (!picName.trim()) return;
        setIsAddingPic(true);
        try {
            await aktivitasHarianService.createPic(picName.trim());
            setNewPic('');
            toast.success('Berhasil', `PIC '${picName.trim()}' berhasil ditambahkan.`);
            onRefresh();
        } catch (error) {
            console.error('Failed to add PIC:', error);
            toast.error('Gagal', 'Gagal menambahkan PIC.');
        } finally {
            setIsAddingPic(false);
        }
    };

    const handleEditPic = async (id: number) => {
        if (!editingPicNama.trim()) return;
        try {
            await aktivitasHarianService.updatePic(id, editingPicNama.trim());
            setEditingPicId(null);
            toast.success('Berhasil', 'Nama PIC berhasil diperbarui. Data aktivitas terkait juga ikut diperbarui.');
            onRefresh();
        } catch (error) {
            console.error('Failed to update PIC:', error);
            toast.error('Gagal', 'Gagal memperbarui PIC.');
        }
    };

    const handleDeletePic = async (id: number, nama: string) => {
        setPicDeleteConfirm({ isOpen: true, id, nama });
    };

    const confirmDeletePic = async () => {
        if (!picDeleteConfirm.id) return;
        setIsDeletingConfig(true);
        try {
            await aktivitasHarianService.deletePic(picDeleteConfirm.id);
            toast.success('Berhasil', `PIC '${picDeleteConfirm.nama}' berhasil dihapus.`);
            onRefresh();
        } catch (error: any) {
            console.error('Failed to delete PIC:', error);
            const msg = error?.message || 'Gagal menghapus PIC.';
            if (msg.includes('tidak dapat dihapus')) {
                toast.warning('Tidak Dapat Dihapus', msg);
            } else {
                toast.error('Gagal', msg);
            }
        } finally {
            setIsDeletingConfig(false);
            setPicDeleteConfirm({ isOpen: false, id: null, nama: '' });
        }
    };

    /* ── Lokasi handlers ── */
    const handleAddLokasi = async (nama?: string) => {
        const lokasiName = nama || newLokasi;
        if (!lokasiName.trim()) return;
        setIsAddingLokasi(true);
        try {
            await aktivitasHarianService.createLokasi(lokasiName.trim());
            setNewLokasi('');
            toast.success('Berhasil', `Lokasi '${lokasiName.trim()}' berhasil ditambahkan.`);
            onRefresh();
        } catch (error) {
            console.error('Failed to add Lokasi:', error);
            toast.error('Gagal', 'Gagal menambahkan Lokasi.');
        } finally {
            setIsAddingLokasi(false);
        }
    };

    const handleEditLokasi = async (id: number) => {
        if (!editingLokasiNama.trim()) return;
        try {
            await aktivitasHarianService.updateLokasi(id, editingLokasiNama.trim());
            setEditingLokasiId(null);
            toast.success('Berhasil', 'Nama Lokasi berhasil diperbarui. Data aktivitas terkait juga ikut diperbarui.');
            onRefresh();
        } catch (error) {
            console.error('Failed to update Lokasi:', error);
            toast.error('Gagal', 'Gagal memperbarui Lokasi.');
        }
    };

    const handleDeleteLokasi = async (id: number, nama: string) => {
        setLokasiDeleteConfirm({ isOpen: true, id, nama });
    };

    const confirmDeleteLokasi = async () => {
        if (!lokasiDeleteConfirm.id) return;
        setIsDeletingConfig(true);
        try {
            await aktivitasHarianService.deleteLokasi(lokasiDeleteConfirm.id);
            toast.success('Berhasil', `Lokasi '${lokasiDeleteConfirm.nama}' berhasil dihapus.`);
            onRefresh();
        } catch (error: any) {
            console.error('Failed to delete Lokasi:', error);
            const msg = error?.message || 'Gagal menghapus Lokasi.';
            if (msg.includes('tidak dapat dihapus')) {
                toast.warning('Tidak Dapat Dihapus', msg);
            } else {
                toast.error('Gagal', msg);
            }
        } finally {
            setIsDeletingConfig(false);
            setLokasiDeleteConfirm({ isOpen: false, id: null, nama: '' });
        }
    };

    /* ── Pagination helper ── */
    const renderPagination = (page: number, totalPages: number, setPage: (p: number) => void, totalItems: number) => {
        if (totalPages <= 1) return null;
        return (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50/30">
                <span className="text-xs text-gray-500">
                    Menampilkan {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, totalItems)} dari {totalItems}
                </span>
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setPage(Math.max(1, page - 1))}
                        disabled={page === 1}
                        className="p-1.5 rounded-md text-gray-500 hover:bg-white hover:shadow-sm disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    >
                        <ChevronLeftIcon className="size-4" />
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                        <button
                            key={p}
                            onClick={() => setPage(p)}
                            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${p === page
                                ? 'bg-emerald-600 text-white shadow-sm'
                                : 'text-gray-500 hover:bg-white hover:shadow-sm'
                                }`}
                        >
                            {p}
                        </button>
                    ))}
                    <button
                        onClick={() => setPage(Math.min(totalPages, page + 1))}
                        disabled={page === totalPages}
                        className="p-1.5 rounded-md text-gray-500 hover:bg-white hover:shadow-sm disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    >
                        <ChevronRightIcon className="size-4" />
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div className="p-6">
            {/* Confirm Modals */}
            <ConfirmModal
                isOpen={picDeleteConfirm.isOpen}
                onClose={() => setPicDeleteConfirm({ isOpen: false, id: null, nama: '' })}
                onConfirm={confirmDeletePic}
                title="Hapus PIC"
                message={`Apakah Anda yakin ingin menghapus PIC '${picDeleteConfirm.nama}'?`}
                confirmText="Hapus"
                variant="danger"
                isLoading={isDeletingConfig}
            />
            <ConfirmModal
                isOpen={lokasiDeleteConfirm.isOpen}
                onClose={() => setLokasiDeleteConfirm({ isOpen: false, id: null, nama: '' })}
                onConfirm={confirmDeleteLokasi}
                title="Hapus Lokasi"
                message={`Apakah Anda yakin ingin menghapus Lokasi '${lokasiDeleteConfirm.nama}'?`}
                confirmText="Hapus"
                variant="danger"
                isLoading={isDeletingConfig}
            />

            {/* Input Modals */}
            <InputModal
                isOpen={picInputModal}
                onClose={() => setPicInputModal(false)}
                onSubmit={(val) => { handleAddPic(val); setPicInputModal(false); }}
                title="Tambah PIC Baru"
                placeholder="Masukkan nama PIC..."
                submitText="Tambah"
                isLoading={isAddingPic}
            />
            <InputModal
                isOpen={lokasiInputModal}
                onClose={() => setLokasiInputModal(false)}
                onSubmit={(val) => { handleAddLokasi(val); setLokasiInputModal(false); }}
                title="Tambah Lokasi Baru"
                placeholder="Masukkan nama Lokasi..."
                submitText="Tambah"
                isLoading={isAddingLokasi}
            />

            <div className="mb-6">
                <h2 className="text-lg font-semibold text-gray-900">Konfigurasi</h2>
                <p className="text-sm text-gray-500 mt-1">Kelola daftar PIC dan Lokasi yang tersedia saat menambah data aktivitas</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* ═══ PIC Section ═══ */}
                <div className="border border-gray-200 overflow-hidden">
                    {/* Header */}
                    <div className="bg-blue-50/50 px-4 py-3 border-b border-gray-200">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <h3 className="text-sm font-semibold text-gray-800">PIC</h3>
                                <span className="text-xs text-gray-400 bg-white px-2 py-0.5">{pics.length}</span>
                            </div>
                            <AppButton
                                onClick={() => setPicInputModal(true)}
                                variant="primary"
                                size="sm"
                                icon={<PlusIcon className="size-3.5" />}
                            >
                                Tambah PIC
                            </AppButton>
                        </div>
                    </div>

                    {/* Search */}
                    <div className="px-4 pt-3 pb-2">
                        <div className="relative">
                            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                            <input
                                type="text"
                                value={picSearch}
                                onChange={(e) => { setPicSearch(e.target.value); setPicPage(1); }}
                                placeholder="Cari PIC..."
                                className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
                            />
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm border-collapse border border-gray-200">
                            <thead>
                                <tr className="bg-gray-50/80">
                                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-700 uppercase tracking-wider w-12 border border-gray-200">No</th>
                                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200">Nama</th>
                                    <th className="text-center px-4 py-2.5 text-xs font-semibold text-gray-700 uppercase tracking-wider w-20 border border-gray-200">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white">
                                {paginatedPics.length === 0 ? (
                                    <tr>
                                        <td colSpan={3} className="text-center py-8 text-xs text-gray-400 border border-gray-200">
                                            {picSearch ? 'Tidak ada PIC ditemukan' : 'Belum ada data PIC'}
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedPics.map((p, idx) => (
                                        <tr key={p.id} className="hover:bg-blue-50/10 transition-colors">
                                            <td className="px-4 py-2.5 text-gray-500 font-medium border border-gray-200">{(picPage - 1) * PAGE_SIZE + idx + 1}</td>
                                            <td className="px-4 py-2.5 border border-gray-200">
                                                {editingPicId === p.id ? (
                                                    <input
                                                        type="text"
                                                        value={editingPicNama}
                                                        onChange={(e) => setEditingPicNama(e.target.value)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') handleEditPic(p.id);
                                                            if (e.key === 'Escape') setEditingPicId(null);
                                                        }}
                                                        autoFocus
                                                        className="w-full px-2 py-1 border border-blue-300 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                    />
                                                ) : (
                                                    <span className="font-medium text-gray-800">{p.nama}</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-2.5 border border-gray-200">
                                                <div className="flex items-center justify-center gap-1">
                                                    {editingPicId === p.id ? (
                                                        <>
                                                            <AppButton
                                                                onClick={() => handleEditPic(p.id)}
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-emerald-600"
                                                                title="Simpan"
                                                                icon={<PlusIcon className="size-4" />}
                                                            />
                                                            <AppButton
                                                                onClick={() => setEditingPicId(null)}
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-gray-400"
                                                                title="Batal"
                                                                icon={<XIcon className="size-4" />}
                                                            />
                                                        </>
                                                    ) : (
                                                        <>
                                                            <AppButton
                                                                onClick={() => { setEditingPicId(p.id); setEditingPicNama(p.nama); }}
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-gray-400 hover:text-blue-600"
                                                                title="Edit"
                                                                icon={<PencilIcon className="size-3.5" />}
                                                            />
                                                            <AppButton
                                                                onClick={() => handleDeletePic(p.id, p.nama)}
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-gray-400 hover:text-red-600"
                                                                title="Hapus"
                                                                icon={<Trash2Icon className="size-3.5" />}
                                                            />
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    {renderPagination(picPage, picTotalPages, setPicPage, filteredPics.length)}
                </div>

                {/* ═══ Lokasi Section ═══ */}
                <div className="border border-gray-200 overflow-hidden">
                    {/* Header */}
                    <div className="bg-amber-50/50 px-4 py-3 border-b border-gray-200">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <h3 className="text-sm font-semibold text-gray-800">Lokasi</h3>
                                <span className="text-xs text-gray-400 bg-white px-2 py-0.5 rounded-full">{lokasis.length}</span>
                            </div>
                            <AppButton
                                onClick={() => setLokasiInputModal(true)}
                                variant="primary"
                                size="sm"
                                icon={<PlusIcon className="size-3.5" />}
                            >
                                Tambah Lokasi
                            </AppButton>
                        </div>
                    </div>

                    {/* Search */}
                    <div className="px-4 pt-3 pb-2">
                        <div className="relative">
                            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                            <input
                                type="text"
                                value={lokasiSearch}
                                onChange={(e) => { setLokasiSearch(e.target.value); setLokasiPage(1); }}
                                placeholder="Cari Lokasi..."
                                className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-shadow"
                            />
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm border-collapse border border-gray-200">
                            <thead>
                                <tr className="bg-gray-50/80">
                                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-700 uppercase tracking-wider w-12 border border-gray-200">No</th>
                                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200">Nama</th>
                                    <th className="text-center px-4 py-2.5 text-xs font-semibold text-gray-700 uppercase tracking-wider w-20 border border-gray-200">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white">
                                {paginatedLokasis.length === 0 ? (
                                    <tr>
                                        <td colSpan={3} className="text-center py-8 text-xs text-gray-400 border border-gray-200">
                                            {lokasiSearch ? 'Tidak ada Lokasi ditemukan' : 'Belum ada data Lokasi'}
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedLokasis.map((l, idx) => (
                                        <tr key={l.id} className="hover:bg-amber-50/10 transition-colors">
                                            <td className="px-4 py-2.5 text-gray-500 font-medium border border-gray-200">{(lokasiPage - 1) * PAGE_SIZE + idx + 1}</td>
                                            <td className="px-4 py-2.5 border border-gray-200">
                                                {editingLokasiId === l.id ? (
                                                    <input
                                                        type="text"
                                                        value={editingLokasiNama}
                                                        onChange={(e) => setEditingLokasiNama(e.target.value)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') handleEditLokasi(l.id);
                                                            if (e.key === 'Escape') setEditingLokasiId(null);
                                                        }}
                                                        autoFocus
                                                        className="w-full px-2 py-1 border border-amber-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                                                    />
                                                ) : (
                                                    <span className="text-sm text-gray-700 font-medium">{l.nama}</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-2.5">
                                                <div className="flex items-center justify-center gap-1">
                                                    {editingLokasiId === l.id ? (
                                                        <>
                                                            <button
                                                                onClick={() => handleEditLokasi(l.id)}
                                                                className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                                                                title="Simpan"
                                                            >
                                                                <PlusIcon className="size-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => setEditingLokasiId(null)}
                                                                className="p-1 text-gray-400 hover:bg-gray-100 rounded-md transition-colors"
                                                                title="Batal"
                                                            >
                                                                <XIcon className="size-4" />
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <button
                                                                onClick={() => { setEditingLokasiId(l.id); setEditingLokasiNama(l.nama); }}
                                                                className="p-1 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-colors"
                                                                title="Edit"
                                                            >
                                                                <PencilIcon className="size-3.5" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteLokasi(l.id, l.nama)}
                                                                className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                                                title="Hapus"
                                                            >
                                                                <Trash2Icon className="size-3.5" />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    {renderPagination(lokasiPage, lokasiTotalPages, setLokasiPage, filteredLokasis.length)}
                </div>
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════ */
/*  Add/Edit Modal                             */
/* ═══════════════════════════════════════════ */

function AktivitasModal({
    isOpen,
    onClose,
    onSubmit,
    initialData,
    pics,
    lokasis,
}: {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: any) => void;
    initialData: AktivitasHarian | null;
    pics: LogbookPic[];
    lokasis: LogbookLokasi[];
}) {
    const [tanggal, setTanggal] = useState('');
    const [jenisProdukForm, setJenisProdukForm] = useState('');
    const [pic, setPic] = useState<string[]>([]);
    const [lokasi, setLokasi] = useState('');
    const [deskripsi, setDeskripsi] = useState('');
    const [dokumentasi, setDokumentasi] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [customPic, setCustomPic] = useState('');
    const toast = useToast();

    // Reset form when modal opens
    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setTanggal(format(new Date(initialData.tanggal), 'yyyy-MM-dd'));
                setJenisProdukForm(initialData.jenis_produk || '');
                setPic(initialData.pic ? initialData.pic.split(', ') : []);
                setLokasi(initialData.lokasi || '');
                setDeskripsi(initialData.deskripsi);
                setDokumentasi(initialData.dokumentasi || '');
            } else {
                setTanggal(format(new Date(), 'yyyy-MM-dd'));
                setJenisProdukForm('');
                setPic([]);
                setLokasi('');
                setDeskripsi('');
                setDokumentasi('');
            }
            setCustomPic('');
        }
    }, [isOpen, initialData]);

    const handleAddPic = (newPic: string) => {
        if (newPic && !pic.includes(newPic)) {
            setPic([...pic, newPic]);
        }
        setCustomPic('');
    };

    const handleRemovePic = (picToRemove: string) => {
        setPic(pic.filter(p => p !== picToRemove));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!tanggal || !deskripsi) {
            toast.warning('Perhatian', 'Mohon lengkapi field Tanggal dan Deskripsi.');
            return;
        }
        setIsSaving(true);
        try {
            await onSubmit({
                tanggal: new Date(tanggal).toISOString(),
                jenis_produk: jenisProdukForm || null,
                pic: pic.length > 0 ? pic.join(', ') : null,
                lokasi: lokasi || null,
                deskripsi,
                dokumentasi: dokumentasi || null,
            });
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={onClose} />

            {/* Modal */}
            <div className="relative bg-white shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
                    <h2 className="text-lg font-bold text-gray-800">
                        {initialData ? 'Edit Aktivitas' : 'Tambah Aktivitas Baru'}
                    </h2>
                    <AppButton
                        variant="ghost"
                        size="icon"
                        onClick={onClose}
                        icon={<XIcon className="size-5" />}
                        className="text-gray-400 hover:text-gray-600"
                    />
                </div>

                {/* Scrollable Form Body */}
                <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                    <form id="aktivitas-form" onSubmit={handleSubmit} className="space-y-5">
                        {/* Tanggal */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Tanggal <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="date"
                                value={tanggal}
                                onChange={(e) => setTanggal(e.target.value)}
                                className="w-full px-3 py-2.5 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow"
                                required
                            />
                        </div>

                        {/* Jenis Produk */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Jenis Produk <span className="text-gray-400 text-xs font-normal">(opsional)</span>
                            </label>
                            <select
                                value={jenisProdukForm}
                                onChange={(e) => setJenisProdukForm(e.target.value)}
                                className="w-full px-3 py-2.5 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow"
                            >
                                <option value="">Pilih Jenis Produk...</option>
                                <option value="Produk Padat">Produk Padat</option>
                                <option value="Produk Cair">Produk Cair</option>
                            </select>
                        </div>

                        {/* PIC */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                PIC <span className="text-gray-400 text-xs font-normal">(opsional)</span>
                            </label>

                            <div className="space-y-3">
                                {/* Selected PICs as Pills */}
                                {pic.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                        {pic.map((p) => (
                                            <span key={p} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 text-sm font-medium">
                                                <UserIcon className="size-3.5" />
                                                {p}
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemovePic(p)}
                                                    className="p-0.5 hover:bg-blue-100 text-blue-500 hover:text-blue-700 transition-colors ml-1"
                                                >
                                                    <XIcon className="size-3" />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                )}

                                {/* Inputs to add new PIC */}
                                {pics.length > 0 ? (
                                    <div className="flex gap-2">
                                        <select
                                            value=""
                                            onChange={(e) => handleAddPic(e.target.value)}
                                            className="flex-1 px-3 py-2.5 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow bg-white"
                                        >
                                            <option value="" disabled>Tambah PIC dari daftar...</option>
                                            {pics.filter(p => !pic.includes(p.nama)).map((p) => (
                                                <option key={p.id} value={p.nama}>{p.nama}</option>
                                            ))}
                                        </select>
                                    </div>
                                ) : (
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={customPic}
                                            onChange={(e) => setCustomPic(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    handleAddPic(customPic);
                                                }
                                            }}
                                            placeholder="Ketik nama PIC lalu tekan Enter..."
                                            className="flex-1 px-3 py-2.5 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow"
                                        />
                                        <AppButton
                                            onClick={() => handleAddPic(customPic)}
                                            disabled={!customPic.trim()}
                                            variant="secondary"
                                        >
                                            Tambah
                                        </AppButton>
                                    </div>
                                )}
                            </div>

                            {pics.length === 0 && (
                                <p className="text-xs text-amber-600 mt-2">Tambahkan template PIC di tab Konfigurasi untuk dropdown otomatis</p>
                            )}
                        </div>

                        {/* Lokasi */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Lokasi <span className="text-gray-400 text-xs font-normal">(opsional)</span>
                            </label>
                            {lokasis.length > 0 ? (
                                <select
                                    value={lokasi}
                                    onChange={(e) => setLokasi(e.target.value)}
                                    className="w-full px-3 py-2.5 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow bg-white"
                                >
                                    <option value="">Pilih Lokasi...</option>
                                    {lokasis.map((l) => (
                                        <option key={l.id} value={l.nama}>{l.nama}</option>
                                    ))}
                                </select>
                            ) : (
                                <input
                                    type="text"
                                    value={lokasi}
                                    onChange={(e) => setLokasi(e.target.value)}
                                    placeholder="Ketik lokasi..."
                                    className="w-full px-3 py-2.5 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow"
                                />
                            )}
                            {lokasis.length === 0 && (
                                <p className="text-xs text-amber-600 mt-1.5">Tambahkan template Lokasi di tab Konfigurasi untuk dropdown otomatis</p>
                            )}
                        </div>

                        {/* Deskripsi */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Deskripsi Kegiatan <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                value={deskripsi}
                                onChange={(e) => setDeskripsi(e.target.value)}
                                placeholder="Jelaskan kegiatan yang dilakukan..."
                                rows={3}
                                className="w-full px-3 py-2.5 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow resize-none"
                                required
                            />
                        </div>

                        {/* Dokumentasi */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Dokumentasi <span className="text-gray-400 text-xs font-normal">(opsional)</span>
                            </label>
                            <div className="relative group">
                                <input
                                    type="file"
                                    onChange={(e) => {
                                        if (e.target.files && e.target.files[0]) {
                                            setDokumentasi(e.target.files[0].name);
                                        }
                                    }}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                />
                                <div className={`flex flex-col items-center justify-center p-6 border-2 border-dashed transition-all h-32 ${dokumentasi ? 'border-emerald-500 bg-emerald-50/30' : 'border-gray-200 bg-gray-50 hover:bg-emerald-50/50 hover:border-emerald-300'}`}>
                                    {dokumentasi ? (
                                        <>
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                                                    <FileTextIcon className="size-5" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-gray-900 truncate max-w-xs">{dokumentasi}</p>
                                                    <p className="text-xs text-emerald-600 font-medium">Dokumen siap diunggah</p>
                                                </div>
                                                 <AppButton
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        setDokumentasi('');
                                                    }}
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-gray-400 hover:text-red-500 z-20"
                                                    title="Hapus"
                                                    icon={<XIcon className="size-4" />}
                                                />
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="w-10 h-10 bg-transparent flex items-center justify-center text-gray-400">
                                                <UploadIcon className="size-5 text-gray-500" />
                                            </div>
                                            <p className="text-sm font-medium text-gray-700">
                                                <span className="text-emerald-600">Klik untuk unggah</span> atau drag & drop
                                            </p>
                                            <p className="text-xs text-gray-500 mt-1">PDF, JPG, PNG, DOCX (Maks. 5MB)</p>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </form>
                </div>

                {/* Actions */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3 shrink-0">
                    <AppButton
                        type="button"
                        onClick={onClose}
                        variant="secondary"
                    >
                        Batal
                    </AppButton>
                    <AppButton
                        type="submit"
                        form="aktivitas-form"
                        variant="primary"
                        loading={isSaving}
                    >
                        {initialData ? 'Perbarui' : 'Simpan'}
                    </AppButton>
                </div>
            </div>
        </div>
    );
}
