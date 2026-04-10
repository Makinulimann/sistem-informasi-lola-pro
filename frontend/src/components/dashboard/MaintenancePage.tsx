'use client';

import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { maintenanceService, Maintenance } from '@/lib/maintenanceService';
import {
    PencilIcon, Trash2Icon, PlusIcon, SearchIcon, XIcon,
    FileTextIcon, ChevronLeftIcon, ChevronRightIcon,
    UploadIcon, ArrowUpDownIcon, ArrowUpIcon, ArrowDownIcon,
    WrenchIcon, CalendarIcon, UserIcon, AlertCircleIcon,
    TagIcon, InfoIcon
} from 'lucide-react';
import { useToast } from '@/components/ui/toast';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { AppButton } from '@/components/ui/app-button';
import { MaintenanceImportModal } from './MaintenanceImportModal';
import { AppSelect } from '@/components/ui/app-select';
import { AppSearchBar } from '@/components/ui/app-search-bar';
import { AppPagination } from '@/components/ui/app-pagination';

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
    const [filterPrioritas, setFilterPrioritas] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);

    // Data
    const [maintenanceData, setMaintenanceData] = useState<Maintenance[]>([]);

    // UI
    const [isLoading, setIsLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<Maintenance | null>(null);

    // Delete confirm modal
    const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; id: number | null }>({ isOpen: false, id: null });
    const [isDeleting, setIsDeleting] = useState(false);

    // Save confirm modal
    const [saveConfirm, setSaveConfirm] = useState<{ isOpen: boolean; data: any | null }>({ isOpen: false, data: null });
    const [isSaving, setIsSaving] = useState(false);

    // Sorting
    const [sortBy, setSortBy] = useState<string | undefined>('tanggal_dibutuhkan');
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

            // Client-side filter for prioritas & status since API may not support them
            let filtered = responseData;
            if (filterPrioritas) filtered = filtered.filter((d: any) => (d.prioritas || '').toLowerCase() === filterPrioritas.toLowerCase());
            if (filterStatus) filtered = filtered.filter((d: any) => (d.status || '').toLowerCase() === filterStatus.toLowerCase());

            setMaintenanceData(filtered);
            setTotal(filterPrioritas || filterStatus ? filtered.length : responseTotal);
        } catch (error) {
            console.error('Failed to fetch data:', error);
        } finally {
            setIsLoading(false);
        }
    }, [bulan, tahun, search, page, sortBy, sortDesc, filterPrioritas, filterStatus]);

    useEffect(() => {
        setPage(1);
    }, [search, bulan, tahun, filterPrioritas, filterStatus]);

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

            {/* Import Modal */}
            <MaintenanceImportModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                onSuccess={() => {
                    fetchData();
                    setIsImportModalOpen(false);
                }}
                productSlug={productSlug || ''}
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
            <div className="bg-white border border-gray-200 overflow-hidden">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-gray-100">
                    <div className="flex">
                        <div className="flex items-center gap-2 px-5 py-3.5 text-sm font-medium text-emerald-700 relative">
                            Data Maintenance
                            <span className="absolute bottom-0 left-0 w-full h-0.5 bg-emerald-600 rounded-t" />
                        </div>
                    </div>
                    <div className="px-4 py-2 sm:py-0 flex items-center gap-2">
                        <AppButton
                            variant="secondary"
                            size="md"
                            onClick={() => setIsImportModalOpen(true)}
                            icon={<UploadIcon className="size-4 text-emerald-600" />}
                        >
                            Import Excel
                        </AppButton>
                        <AppButton
                            variant="primary"
                            size="md"
                            onClick={handleCreate}
                            icon={<PlusIcon className="size-4" />}
                        >
                            Tambah Maintenance
                        </AppButton>
                    </div>
                </div>

                {/* Filters */}
                <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                    <div className="flex flex-col md:flex-row md:items-center gap-3 justify-between">
                        <div className="flex flex-wrap gap-2 items-center">
                            {/* Periode */}
                            <AppSelect
                                prefixLabel="Periode:"
                                variant="ghost"
                                value={bulan}
                                onChange={(e) => setBulan(e.target.value)}
                                options={BULAN_OPTIONS}
                                className="bg-white border border-gray-200 px-3 py-2"
                            />
                            <AppSelect
                                variant="ghost"
                                value={tahun}
                                onChange={(e) => setTahun(e.target.value)}
                                options={TAHUN_OPTIONS}
                                className="bg-white border border-gray-200 px-3 py-2 -ml-3"
                            />
                            {/* Prioritas filter */}
                            <AppSelect
                                value={filterPrioritas}
                                onChange={(e) => setFilterPrioritas(e.target.value)}
                                options={[
                                    { value: '', label: 'Semua Prioritas' },
                                    { value: 'Normal', label: 'Normal' },
                                    { value: 'Urgent', label: 'Urgent' },
                                ]}
                                className="w-40"
                            />
                            <AppSelect
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                                options={[
                                    { value: '', label: 'Semua Status' },
                                    { value: 'Open', label: 'Open' },
                                    { value: 'In Progress', label: 'In Progress' },
                                    { value: 'Resolved', label: 'Resolved' },
                                    { value: 'Rejected', label: 'Rejected' },
                                ]}
                                className="w-40"
                            />
                            {(bulan || tahun || filterPrioritas || filterStatus) && (
                                <AppButton
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => { setBulan(''); setTahun(''); setFilterPrioritas(''); setFilterStatus(''); }}
                                    title="Reset filter"
                                    className="text-gray-400 hover:text-red-500 hover:bg-red-50 border border-gray-200"
                                >
                                    <XIcon className="size-4" />
                                </AppButton>
                            )}
                        </div>
                        <AppSearchBar
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Cari kode, nama, deskripsi..."
                            containerClassName="w-full md:w-72"
                        />
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
                                { key: 'kode', label: 'Kode', width: 'w-32', sortable: true },
                                { key: 'nama', label: 'Nama', width: 'w-48', sortable: true },
                                { key: 'prioritas', label: 'Prioritas', width: 'w-24', sortable: true },
                                { key: 'status', label: 'Status', width: 'w-32', sortable: true },
                                { key: 'keperluan', label: 'Keperluan', width: 'w-48', sortable: true },
                                { key: 'deskripsi', label: 'Deskripsi', width: '', sortable: true },
                                { key: 'tanggal_dibutuhkan', label: 'Tanggal Dibutuhkan', width: 'w-40', sortable: true },
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
                                <td className="px-4 py-3 border border-gray-200 text-gray-700 font-medium whitespace-nowrap">
                                    {(item as any).kode || '-'}
                                </td>
                                <td className="px-4 py-3 border border-gray-200 text-gray-700">
                                    {(item as any).nama || '-'}
                                </td>
                                <td className="px-4 py-3 border border-gray-200 text-center">
                                    <PrioritasBadge value={(item as any).prioritas || 'Normal'} />
                                </td>
                                <td className="px-4 py-3 border border-gray-200 text-center">
                                    <StatusBadge value={(item as any).status || 'Open'} />
                                </td>
                                <td className="px-4 py-3 border border-gray-200 text-gray-700">
                                    <p className="line-clamp-2">{(item as any).keperluan || '-'}</p>
                                </td>
                                <td className="px-4 py-3 border border-gray-200 text-gray-700">
                                    <div className="whitespace-pre-line text-xs">
                                        {((item as any).deskripsi || '').split('\n').map((line: string, lid: number) => (
                                            line.trim() ? (
                                                <div key={lid} className="flex gap-2 items-start mb-1 last:mb-0">
                                                    <span className="mt-1.5 w-1 h-1 bg-gray-400 shrink-0" />
                                                    <span>{line}</span>
                                                </div>
                                            ) : null
                                        ))}
                                    </div>
                                </td>
                                <td className="px-4 py-3 border border-gray-200 text-gray-700 text-right font-medium">
                                    <div className="flex items-center justify-end gap-2">
                                        <CalendarIcon className="size-3.5 text-gray-400" />
                                        {(item as any).tanggal_dibutuhkan ? format(new Date((item as any).tanggal_dibutuhkan), 'dd/MM/yyyy') : '-'}
                                    </div>
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
                                <CalendarIcon className="size-3.5" />
                                {(item as any).tanggal_dibutuhkan ? format(new Date((item as any).tanggal_dibutuhkan), 'dd MMM yyyy', { locale: localeId }) : '-'}
                            </div>
                            <div className="flex items-center gap-1">
                                <button onClick={() => onEdit(item)} className="p-1 text-gray-400 hover:text-emerald-600"><PencilIcon className="size-4" /></button>
                                <button onClick={() => onDelete(item.id)} className="p-1 text-gray-400 hover:text-red-600"><Trash2Icon className="size-4" /></button>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2 mb-3">
                            <span className="inline-flex items-center px-2 py-0.5 bg-gray-50 text-gray-700 rounded text-[11px] font-bold uppercase border border-gray-100">
                                {(item as any).kode || '-'}
                            </span>
                            <span className="text-gray-400">•</span>
                            <span className="text-sm font-semibold text-gray-800">
                                {(item as any).nama || '-'}
                            </span>
                        </div>
                        <div className="flex flex-wrap gap-2 mb-3">
                            <PrioritasBadge value={(item as any).prioritas || 'Normal'} />
                            <StatusBadge value={(item as any).status || 'Open'} />
                        </div>
                        <div className="text-sm text-gray-600 mb-2">
                            <p className="font-medium text-gray-800 mb-0.5">Keperluan:</p>
                            <p className="line-clamp-3">{(item as any).keperluan || '-'}</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600">
                            <p className="font-medium text-gray-800 mb-1 flex items-center gap-1.5">
                                <FileTextIcon className="size-3" /> Kegiatan:
                            </p>
                            <div className="whitespace-pre-line leading-relaxed">
                                {(item as any).deskripsi || '-'}
                            </div>
                        </div>
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
/*  Apple-style Badge Components               */
/* ═══════════════════════════════════════════ */

function PrioritasBadge({ value }: { value: string }) {
    const isUrgent = value === 'Urgent';
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium tracking-wide ${
            isUrgent
                ? 'bg-red-50 text-red-600'
                : 'bg-gray-100 text-gray-500'
        }`}>
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isUrgent ? 'bg-red-500' : 'bg-gray-400'}`} />
            {value}
        </span>
    );
}

function StatusBadge({ value }: { value: string }) {
    const config: Record<string, { bg: string; text: string; dot: string }> = {
        'Open':        { bg: 'bg-gray-100',   text: 'text-gray-500',   dot: 'bg-gray-400' },
        'In Progress': { bg: 'bg-blue-50',    text: 'text-blue-600',   dot: 'bg-blue-500' },
        'Resolved':    { bg: 'bg-emerald-50', text: 'text-emerald-700',dot: 'bg-emerald-500' },
        'Rejected':    { bg: 'bg-red-50',     text: 'text-red-600',    dot: 'bg-red-500' },
    };
    const style = config[value] ?? config['Open'];
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium tracking-wide ${style.bg} ${style.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${style.dot}`} />
            {value}
        </span>
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
    const [kode, setKode] = useState('');
    const [nama, setNama] = useState('');
    const [prioritas, setPrioritas] = useState<'Normal' | 'Urgent'>('Normal');
    const [status, setStatus] = useState<'In Progress' | 'Open' | 'Rejected' | 'Resolved'>('Open');
    const [keperluan, setKeperluan] = useState('');
    const [deskripsi, setDeskripsi] = useState('');
    const [dokumentasi, setDokumentasi] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const toast = useToast();

    // Reset form when modal opens
    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                // Support both new and old field names for compatibility
                const rawDate = (initialData as any).tanggalDibutuhkan || initialData.tanggal_dibutuhkan || initialData.tanggal;
                setTanggal(rawDate ? format(new Date(rawDate), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'));
                setKode((initialData as any).kode || initialData.kode || initialData.equipment || '');
                setNama((initialData as any).nama || initialData.nama || (initialData as any).area || '');
                setPrioritas((initialData as any).prioritas || initialData.prioritas || 'Normal');
                setStatus((initialData as any).status || initialData.status || 'Open');
                setKeperluan((initialData as any).keperluan || initialData.keperluan || initialData.keterangan || '');
                setDeskripsi((initialData as any).deskripsi || initialData.deskripsi || (initialData as any).kegiatan || '');
                setDokumentasi((initialData as any).dokumentasi || initialData.dokumentasi || '');
            } else {
                setTanggal(format(new Date(), 'yyyy-MM-dd'));
                setKode('');
                setNama('');
                setPrioritas('Normal');
                setStatus('Open');
                setKeperluan('');
                setDeskripsi('');
                setDokumentasi('');
            }
        }
    }, [isOpen, initialData]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!tanggal || !kode || !nama || !deskripsi) {
            toast.warning('Perhatian', 'Mohon lengkapi field wajib (Tanggal, Kode, Nama, Deskripsi).');
            return;
        }
        setIsSaving(true);
        try {
            await onSubmit({
                product_slug: initialData?.product_slug,
                kode: kode,
                nama: nama,
                deskripsi: deskripsi,
                keperluan: keperluan || null,
                tanggal_dibutuhkan: new Date(tanggal).toISOString(),
                prioritas,
                status,
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
                        <div className="grid grid-cols-2 gap-4">
                            {/* Kode */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Kode <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <TagIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                                    <input
                                        type="text"
                                        value={kode}
                                        onChange={(e) => setKode(e.target.value)}
                                        placeholder="Kode"
                                        className="w-full pl-9 pr-3 py-2.5 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow"
                                        required
                                    />
                                </div>
                            </div>
                            {/* Tanggal Dibutuhkan */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Tgl Dibutuhkan <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                                    <input
                                        type="date"
                                        value={tanggal}
                                        onChange={(e) => setTanggal(e.target.value)}
                                        className="w-full pl-9 pr-3 py-2.5 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow"
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Nama */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Nama Pemohon <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                                <input
                                    type="text"
                                    value={nama}
                                    onChange={(e) => setNama(e.target.value)}
                                    placeholder="Nama lengkap..."
                                    className="w-full pl-9 pr-3 py-2.5 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow"
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            {/* Prioritas */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Prioritas
                                </label>
                                <div className="relative">
                                    <AlertCircleIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                                    <select
                                        value={prioritas}
                                        onChange={(e) => setPrioritas(e.target.value as any)}
                                        className="w-full pl-9 pr-3 py-2.5 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow appearance-none"
                                    >
                                        <option value="Normal">Normal</option>
                                        <option value="Urgent">Urgent</option>
                                    </select>
                                </div>
                            </div>
                            {/* Status */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Status
                                </label>
                                <div className="relative">
                                    <InfoIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                                    <select
                                        value={status}
                                        onChange={(e) => setStatus(e.target.value as any)}
                                        className="w-full pl-9 pr-3 py-2.5 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow appearance-none"
                                    >
                                        <option value="Open">Open</option>
                                        <option value="In Progress">In Progress</option>
                                        <option value="Rejected">Rejected</option>
                                        <option value="Resolved">Resolved</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Keperluan */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Keperluan
                            </label>
                            <input
                                type="text"
                                value={keperluan}
                                onChange={(e) => setKeperluan(e.target.value)}
                                placeholder="Keperluan maintenance..."
                                className="w-full px-3 py-2.5 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow"
                            />
                        </div>

                        {/* Deskripsi */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Deskripsi <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                value={deskripsi}
                                onChange={(e) => setDeskripsi(e.target.value)}
                                placeholder="Detail deskripsi kegiatan..."
                                rows={4}
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
                                        <div className="flex items-center gap-3 w-full">
                                            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                                                <FileTextIcon className="size-5" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-900 truncate">{dokumentasi}</p>
                                                <p className="text-xs text-emerald-600 font-medium">Dokumen dipilih</p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    setDokumentasi('');
                                                }}
                                                className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors z-20 relative"
                                            >
                                                <XIcon className="size-4" />
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <UploadIcon className="size-6 text-gray-400 mb-2" />
                                            <p className="text-sm font-medium text-gray-700">
                                                <span className="text-emerald-600">Klik untuk unggah</span>
                                            </p>
                                            <p className="text-xs text-gray-500 mt-1">PDF, JPG, PNG (Maks. 5MB)</p>
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
                        variant="secondary"
                        onClick={onClose}
                    >
                        Batal
                    </AppButton>
                    <AppButton
                        type="submit"
                        form="maintenance-form"
                        variant="primary"
                        loading={isSaving}
                    >
                        {isSaving ? 'Menyimpan...' : (initialData ? 'Simpan Perubahan' : 'Tambah Maintenance')}
                    </AppButton>
                </div>
            </div>
        </div>
    );
}
