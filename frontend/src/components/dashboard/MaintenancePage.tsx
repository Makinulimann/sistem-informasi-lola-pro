'use client';

import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { maintenanceService, Maintenance } from '@/lib/maintenanceService';
import {
    PencilIcon, Trash2Icon, PlusIcon, SearchIcon, XIcon,
    FileTextIcon, ChevronLeftIcon, ChevronRightIcon,
    UploadIcon, ArrowUpDownIcon, ArrowUpIcon, ArrowDownIcon,
    WrenchIcon, MapPinIcon, ClipboardListIcon
} from 'lucide-react';
import { useToast } from '@/components/ui/toast';
import { ConfirmModal } from '@/components/ui/confirm-modal';

/* ─── Constants ─── */

const BULAN_OPTIONS = [
    { value: '', label: 'Semua Bulan' },
    { value: '1', label: 'Januari' },
    { value: '2', label: 'Februari' },
    { value: '3', label: 'Maret' },
    { value: '4', label: 'April' },
    { value: '5', label: 'Mei' },
    { value: '6', label: 'Juni' },
    { value: '7', label: 'Juli' },
    { value: '8', label: 'Agustus' },
    { value: '9', label: 'September' },
    { value: '10', label: 'Oktober' },
    { value: '11', label: 'November' },
    { value: '12', label: 'Desember' },
];

const TAHUN_OPTIONS = [
    { value: '', label: 'Semua Tahun' },
    { value: '2026', label: '2026' },
    { value: '2025', label: '2025' },
    { value: '2024', label: '2024' },
];

/* ─── Main Component ─── */

interface MaintenancePageProps {
    productCategory: string;
    productName?: string;
    productSlug?: string;
}

export function MaintenancePage({ productCategory, productName, productSlug }: MaintenancePageProps) {
    const [search, setSearch] = useState('');
    const [bulan, setBulan] = useState('');
    const [tahun, setTahun] = useState('');
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);

    // Data
    const [maintenanceData, setMaintenanceData] = useState<Maintenance[]>([]);

    // UI
    const [isLoading, setIsLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<Maintenance | null>(null);

    // Delete confirm modal
    const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; id: number | null }>({ isOpen: false, id: null });
    const [isDeleting, setIsDeleting] = useState(false);

    // Save confirm modal
    const [saveConfirm, setSaveConfirm] = useState<{ isOpen: boolean; data: any | null }>({ isOpen: false, data: null });
    const [isSaving, setIsSaving] = useState(false);

    // Sorting
    const [sortBy, setSortBy] = useState<string | undefined>('tanggal');
    const [sortDesc, setSortDesc] = useState<boolean>(true);

    const toast = useToast();

    // Fetch data
    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await maintenanceService.getAll({
                bulan: bulan || undefined,
                tahun: tahun || undefined,
                search: search || undefined,
                page: page,
                limit: 10,
                sortBy,
                sortDesc
            });
            const responseData = response.data || (response as any).Data || [];
            const responseTotal = response.total || (response as any).Total || 0;

            setMaintenanceData(responseData);
            setTotal(responseTotal);
        } catch (error) {
            console.error('Failed to fetch data:', error);
        } finally {
            setIsLoading(false);
        }
    }, [bulan, tahun, search, page, sortBy, sortDesc]);

    useEffect(() => {
        setPage(1);
    }, [search, bulan, tahun]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Handlers
    const handleCreate = () => {
        setEditingItem(null);
        setIsModalOpen(true);
    };

    const handleEdit = (item: Maintenance) => {
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
            await maintenanceService.delete(deleteConfirm.id);
            toast.success('Berhasil', 'Data maintenance berhasil dihapus.');
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
        // Stage data and show confirmation modal
        setSaveConfirm({ isOpen: true, data });
    };

    const confirmSave = async () => {
        if (!saveConfirm.data) return;
        setIsSaving(true);
        try {
            if (editingItem) {
                await maintenanceService.update(editingItem.id, saveConfirm.data);
                toast.success('Berhasil', 'Data maintenance berhasil diperbarui.');
            } else {
                await maintenanceService.create(saveConfirm.data);
                toast.success('Berhasil', 'Data maintenance berhasil ditambahkan.');
            }
            setIsModalOpen(false);
            setEditingItem(null);
            fetchData();
        } catch (error) {
            console.error('Failed to save:', error);
            toast.error('Gagal', 'Gagal menyimpan data.');
        } finally {
            setIsSaving(false);
            setSaveConfirm({ isOpen: false, data: null });
        }
    };

    return (
        <div className="space-y-6">
            {/* Delete Confirm Modal */}
            <ConfirmModal
                isOpen={deleteConfirm.isOpen}
                onClose={() => setDeleteConfirm({ isOpen: false, id: null })}
                onConfirm={confirmDelete}
                title="Hapus Data Maintenance"
                message="Apakah Anda yakin ingin menghapus data maintenance ini? Tindakan ini tidak dapat dibatalkan."
                confirmText="Hapus"
                variant="danger"
                isLoading={isDeleting}
            />

            {/* Save Confirm Modal */}
            <ConfirmModal
                isOpen={saveConfirm.isOpen}
                onClose={() => setSaveConfirm({ isOpen: false, data: null })}
                onConfirm={confirmSave}
                title={editingItem ? 'Konfirmasi Perubahan' : 'Konfirmasi Tambah Data'}
                message={editingItem
                    ? 'Apakah Anda yakin ingin menyimpan perubahan data maintenance ini?'
                    : 'Apakah Anda yakin ingin menambahkan data maintenance baru ini?'
                }
                confirmText={editingItem ? 'Ya, Perbarui' : 'Ya, Simpan'}
                variant="info"
                isLoading={isSaving}
            />

            {/* Modal */}
            <MaintenanceModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setEditingItem(null);
                }}
                onSubmit={handleModalSubmit}
                initialData={editingItem}
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
                <span className="text-gray-800 font-medium">Maintenance</span>
            </div>

            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                        {productCategory} {productName ? `/ ${productName} ` : ''}/ Maintenance
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Pengelolaan maintenance operasional</p>
                </div>
            </div>

            {/* Main Card */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-gray-100">
                    <div className="flex">
                        <div className="flex items-center gap-2 px-5 py-3.5 text-sm font-medium text-emerald-700 relative">
                            Data Maintenance
                            <span className="absolute bottom-0 left-0 w-full h-0.5 bg-emerald-600 rounded-t" />
                        </div>
                    </div>
                    <div className="px-4 py-2 sm:py-0">
                        <button
                            onClick={handleCreate}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
                        >
                            <PlusIcon className="size-4" />
                            Tambah Maintenance
                        </button>
                    </div>
                </div>

                {/* Filters */}
                <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                    <div className="flex flex-col md:flex-row md:items-end gap-4 justify-between">
                        <div className="flex flex-col sm:flex-row gap-3 items-end">
                            <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-gray-200 shadow-sm">
                                <span className="text-sm font-medium text-gray-500">Periode:</span>
                                <select
                                    value={bulan}
                                    onChange={(e) => setBulan(e.target.value)}
                                    className="bg-transparent text-sm font-medium text-gray-700 focus:outline-none cursor-pointer hover:text-emerald-600 transition-colors"
                                >
                                    {BULAN_OPTIONS.map((opt) => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                                <span className="text-gray-300">/</span>
                                <select
                                    value={tahun}
                                    onChange={(e) => setTahun(e.target.value)}
                                    className="bg-transparent text-sm font-medium text-gray-700 focus:outline-none cursor-pointer hover:text-emerald-600 transition-colors"
                                >
                                    {TAHUN_OPTIONS.map((opt) => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>
                            {(bulan || tahun) && (
                                <button
                                    onClick={() => { setBulan(''); setTahun(''); }}
                                    className="px-3 py-2 bg-white text-gray-500 text-sm font-medium rounded-lg border border-gray-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all shadow-sm"
                                >
                                    <XIcon className="size-4" />
                                </button>
                            )}
                        </div>
                        <div className="relative w-full md:w-72">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                                <SearchIcon className="size-4" />
                            </span>
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Cari equipment, area, kegiatan..."
                                className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow shadow-sm"
                            />
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="min-h-[400px]">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-48">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
                        </div>
                    ) : (
                        <MaintenanceTable
                            data={maintenanceData}
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
                </div>
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════ */
/*  Maintenance Table                          */
/* ═══════════════════════════════════════════ */

function MaintenanceTable({
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
    data: Maintenance[];
    page: number;
    setPage: (p: number) => void;
    total: number;
    onEdit: (item: Maintenance) => void;
    onDelete: (id: number) => void;
    sortBy?: string;
    sortDesc?: boolean;
    onSort: (column: string) => void;
}) {
    const totalPages = Math.max(1, Math.ceil(total / 10));

    if (total === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <WrenchIcon className="size-12 mb-3 opacity-40" />
                <p className="text-sm font-medium">Belum ada data maintenance</p>
                <p className="text-xs mt-1">Klik &quot;Tambah Maintenance&quot; untuk menambahkan data baru</p>
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
                                { key: 'equipment', label: 'Equipment', width: 'w-36', sortable: true },
                                { key: 'area', label: 'Area', width: 'w-36', sortable: true },
                                { key: 'kegiatan', label: 'Kegiatan', width: '', sortable: true },
                                { key: 'keterangan', label: 'Keterangan', width: 'w-44', sortable: true },
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
                                    {item.equipment || '-'}
                                </td>
                                <td className="px-4 py-3 border border-gray-200 text-gray-700">
                                    {item.area || '-'}
                                </td>
                                <td className="px-4 py-3 border border-gray-200 text-gray-700 max-w-xs">
                                    <p className="line-clamp-2">{item.kegiatan}</p>
                                </td>
                                <td className="px-4 py-3 border border-gray-200 text-gray-700 max-w-xs">
                                    <p className="line-clamp-2">{item.keterangan || '-'}</p>
                                </td>
                                <td className="px-4 py-3 border border-gray-200 text-gray-700">
                                    {item.dokumentasi ? item.dokumentasi : '-'}
                                </td>
                                <td className="px-4 py-3 border border-gray-200">
                                    <div className="flex items-center justify-center gap-1">
                                        <button
                                            onClick={() => onEdit(item)}
                                            className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                                            title="Edit"
                                        >
                                            <PencilIcon className="size-4" />
                                        </button>
                                        <button
                                            onClick={() => onDelete(item.id)}
                                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                            title="Hapus"
                                        >
                                            <Trash2Icon className="size-4" />
                                        </button>
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
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-medium">
                                <WrenchIcon className="size-3" />{item.equipment}
                            </span>
                            <span className="inline-flex items-center px-2.5 py-1 bg-amber-50 text-amber-700 rounded-full text-xs font-medium">
                                {item.area}
                            </span>
                        </div>
                        <p className="text-sm text-gray-700 line-clamp-3">{item.kegiatan}</p>
                        {item.keterangan && (
                            <p className="text-xs text-gray-500 mt-1 line-clamp-2">{item.keterangan}</p>
                        )}
                        {item.dokumentasi && (
                            <p className="text-xs text-emerald-600 mt-1.5 flex items-center gap-1">
                                <FileTextIcon className="size-3" />{item.dokumentasi}
                            </p>
                        )}
                    </div>
                ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50/30">
                    <span className="text-xs text-gray-500">
                        Menampilkan {(page - 1) * 10 + 1}–{Math.min(page * 10, total)} dari {total} data
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
            )}
        </>
    );
}

/* ═══════════════════════════════════════════ */
/*  Add/Edit Modal                             */
/* ═══════════════════════════════════════════ */

function MaintenanceModal({
    isOpen,
    onClose,
    onSubmit,
    initialData,
}: {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: any) => void;
    initialData: Maintenance | null;
}) {
    const [tanggal, setTanggal] = useState('');
    const [equipment, setEquipment] = useState('');
    const [area, setArea] = useState('');
    const [kegiatan, setKegiatan] = useState('');
    const [keterangan, setKeterangan] = useState('');
    const [dokumentasi, setDokumentasi] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const toast = useToast();

    // Reset form when modal opens
    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setTanggal(format(new Date(initialData.tanggal), 'yyyy-MM-dd'));
                setEquipment(initialData.equipment);
                setArea(initialData.area);
                setKegiatan(initialData.kegiatan);
                setKeterangan(initialData.keterangan || '');
                setDokumentasi(initialData.dokumentasi || '');
            } else {
                setTanggal(format(new Date(), 'yyyy-MM-dd'));
                setEquipment('');
                setArea('');
                setKegiatan('');
                setKeterangan('');
                setDokumentasi('');
            }
        }
    }, [isOpen, initialData]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!tanggal || !equipment || !area || !kegiatan) {
            toast.warning('Perhatian', 'Mohon lengkapi semua field yang wajib diisi.');
            return;
        }
        setIsSaving(true);
        try {
            await onSubmit({
                tanggal: new Date(tanggal).toISOString(),
                equipment,
                area,
                kegiatan,
                keterangan: keterangan || null,
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
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
                    <h2 className="text-lg font-bold text-gray-800">
                        {initialData ? 'Edit Maintenance' : 'Tambah Maintenance Baru'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-full transition-colors"
                    >
                        <XIcon className="size-5" />
                    </button>
                </div>

                {/* Scrollable Form Body */}
                <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                    <form id="maintenance-form" onSubmit={handleSubmit} className="space-y-5">
                        {/* Tanggal */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Tanggal <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="date"
                                value={tanggal}
                                onChange={(e) => setTanggal(e.target.value)}
                                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow"
                                required
                            />
                        </div>

                        {/* Equipment */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Equipment <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={equipment}
                                onChange={(e) => setEquipment(e.target.value)}
                                placeholder="Nama equipment..."
                                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow"
                                required
                            />
                        </div>

                        {/* Area */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Area <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={area}
                                onChange={(e) => setArea(e.target.value)}
                                placeholder="Area maintenance..."
                                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow"
                                required
                            />
                        </div>

                        {/* Kegiatan */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Kegiatan <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                value={kegiatan}
                                onChange={(e) => setKegiatan(e.target.value)}
                                placeholder="Jelaskan kegiatan maintenance..."
                                rows={3}
                                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow resize-none"
                                required
                            />
                        </div>

                        {/* Keterangan */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Keterangan <span className="text-gray-400 text-xs font-normal">(opsional)</span>
                            </label>
                            <textarea
                                value={keterangan}
                                onChange={(e) => setKeterangan(e.target.value)}
                                placeholder="Keterangan tambahan..."
                                rows={2}
                                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow resize-none"
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
                                <div className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl transition-all h-32 ${dokumentasi ? 'border-emerald-500 bg-emerald-50/30' : 'border-gray-200 bg-gray-50 hover:bg-emerald-50/50 hover:border-emerald-300'}`}>
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
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        setDokumentasi('');
                                                    }}
                                                    className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg transition-colors z-20 relative ml-2"
                                                    title="Hapus"
                                                >
                                                    <XIcon className="size-4" />
                                                </button>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-gray-400 shadow-sm border border-gray-100 mb-3 group-hover:text-emerald-500 group-hover:border-emerald-200 transition-colors">
                                                <UploadIcon className="size-5 text-gray-500 group-hover:text-emerald-500 transition-colors" />
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
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3 shrink-0 rounded-b-2xl">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2.5 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-all shadow-sm"
                    >
                        Batal
                    </button>
                    <button
                        type="submit"
                        form="maintenance-form"
                        disabled={isSaving}
                        className="px-6 py-2.5 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 focus:ring-4 focus:ring-emerald-600/20 transition-all shadow-sm hover:shadow-md active:scale-95"
                    >
                        {isSaving ? (
                            <span className="flex items-center gap-2">
                                <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                                Menyimpan...
                            </span>
                        ) : (
                            initialData ? 'Perbarui' : 'Simpan'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
