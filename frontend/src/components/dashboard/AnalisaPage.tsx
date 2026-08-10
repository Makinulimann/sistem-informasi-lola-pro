'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import {
    getAnalisa,
    createAnalisa,
    updateAnalisa,
    deleteAnalisa,
    type AnalisaRow,
    type SaveAnalisaRequest
} from '@/lib/analisaService';
import { getProduksi } from '@/lib/produksiService';
import { AppModal } from '@/components/ui/app-modal';
import { AppButton } from '@/components/ui/app-button';
import { AppPeriodFilter } from '@/components/ui/app-period-filter';
import { AppInput } from '../ui/app-input';
import { AppSearchBar } from '../ui/app-search-bar';
import { AppPagination } from '../ui/app-pagination';

/* ─── Icons ─── */
function SearchIcon() { return (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>); }
function PlusIcon() { return (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>); }
function DownloadIcon() { return (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>); }
function ChevronLeftIcon() { return (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>); }
function ChevronRightIcon() { return (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>); }
function MoreIcon() { return (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1" /><circle cx="12" cy="5" r="1" /><circle cx="12" cy="19" r="1" /></svg>); }
function FilterIcon() { return (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></svg>); }
function XIcon() { return (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>); }
function TrashIcon() { return (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>); }
function AlertTriangleIcon() { return (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><path d="M12 9v4" /><path d="M12 17h.01" /></svg>); }
function PencilIcon() { return (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" /></svg>); }
function EyeIcon() { return (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>); }

/* ─── Types ─── */


/* ─── Helpers ─── */
function fmt(n: number | null | undefined): string {
    return Number(n || 0).toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 2 });
}

function formatDateShort(dateStr: string | null): string {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
}

function formatDateForInput(dateStr: string | null): string {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

/* ─── Status Badge ─── */
function StatusBadge({ status }: { status: string }) {
    const styles: Record<string, string> = {
        'Lolos': 'bg-emerald-50 text-emerald-700 border-emerald-200',
        'Tidak Lolos': 'bg-red-50 text-red-700 border-red-200',
        'Pending': 'bg-amber-50 text-amber-700 border-amber-200',
    };
    return (
        <span className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full border ${styles[status] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
            {status}
        </span>
    );
}



/* ═══════════════════════════════════════════ */
/*  Form Modal                                 */
/* ═══════════════════════════════════════════ */

/* ─── SearchableSelect Component ─── */
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
        if (!search) return options.slice(0, 10);
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
                className={`w-full px-3 py-2.5 bg-white border border-gray-200 text-sm text-left text-gray-700 flex items-center justify-between transition-all focus:outline-none rounded-lg ${
                    disabled ? "bg-gray-50 text-gray-400 cursor-not-allowed" : "cursor-pointer hover:border-gray-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/40"
                }`}
            >
                <span className={!value ? "text-gray-400" : ""}>
                    {value || placeholder}
                </span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 font-bold">
                    <polyline points="6 9 12 15 18 9" />
                </svg>
            </button>

            {isOpen && (
                <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 shadow-xl rounded-lg z-50 p-2 space-y-2 max-h-72 overflow-hidden">
                    <input
                        type="text"
                        autoFocus
                        placeholder="Ketik untuk mencari..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full px-3 py-1.5 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 rounded-md transition-all"
                    />
                    <div className="max-h-48 overflow-y-auto divide-y divide-gray-50">
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
                                        setIsOpen(false);
                                        setSearch('');
                                    }}
                                    className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 transition-all font-medium"
                                >
                                    {opt}
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: SaveAnalisaRequest) => Promise<void>;
    initialData?: AnalisaRow | null;
    productSlug: string;
    userRole: string | null;
}

const fieldCls = 'w-full px-3 py-2.5 border border-gray-200 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all bg-white rounded-lg';

function AnalisaFormModal({ isOpen, onClose, onSave, initialData, productSlug, userRole }: ModalProps) {
    const [tanggalSampling, setTanggalSampling] = useState('');
    const [tanggalAnalisa, setTanggalAnalisa] = useState('');
    const [noBAPC, setNoBAPC] = useState('');
    const [kuantum, setKuantum] = useState('');
    const [hasilAnalisa, setHasilAnalisa] = useState('Lolos');
    const [existingDokumen, setExistingDokumen] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [dragActive, setDragActive] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    const [batches, setBatches] = useState<{ kode: string; bsWip: number }[]>([]);
    const [isLoadingBatches, setIsLoadingBatches] = useState(false);

    // Fetch batches when modal is opened
    useEffect(() => {
        if (isOpen) {
            const fetchBatches = async () => {
                setIsLoadingBatches(true);
                try {
                    const res = await getProduksi(productSlug);
                    if (res && res.availableBatches) {
                        setBatches(res.availableBatches.map(b => ({ kode: b.kode, bsWip: b.bsWip })));
                    } else if (res && res.data) {
                        const seen = new Set<string>();
                        const list: { kode: string; bsWip: number }[] = [];
                        res.data.forEach(row => {
                            if (row.batchKode && !seen.has(row.batchKode)) {
                                seen.add(row.batchKode);
                                list.push({ kode: row.batchKode, bsWip: row.bs || 0 });
                            }
                        });
                        setBatches(list);
                    }
                } catch (error) {
                    console.error('Failed to fetch batches:', error);
                } finally {
                    setIsLoadingBatches(false);
                }
            };
            fetchBatches();
        }
    }, [isOpen, productSlug]);

    useEffect(() => {
        if (isOpen) {
            setFormError(null);
            setFile(null);
            if (initialData) {
                setTanggalSampling(formatDateForInput(initialData.tanggalSampling));
                setTanggalAnalisa(formatDateForInput(initialData.tanggalAnalisa || initialData.tanggalSampling || new Date().toISOString()));
                setNoBAPC(initialData.noBAPC);
                setKuantum(initialData.kuantum.toString());
                setHasilAnalisa(initialData.hasilAnalisa);
                setExistingDokumen(initialData.dokumen || '');
            } else {
                const todayStr = formatDateForInput(new Date().toISOString());
                setTanggalSampling(todayStr);
                setTanggalAnalisa(todayStr);
                setNoBAPC('');
                setKuantum('');
                setHasilAnalisa('Lolos');
                setExistingDokumen('');
            }
        }
    }, [isOpen, initialData]);

    // Automatically sync Kuantum with the selected Batch
    useEffect(() => {
        if (noBAPC) {
            const matched = batches.find(b => b.kode === noBAPC);
            if (matched) {
                setKuantum(matched.bsWip.toString());
            }
        } else {
            setKuantum('');
        }
    }, [noBAPC, batches]);

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            validateAndSetFile(e.dataTransfer.files[0]);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            validateAndSetFile(e.target.files[0]);
        }
    };

    const validateAndSetFile = (f: File) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
        if (!allowedTypes.includes(f.type)) {
            alert('File harus berupa JPG, PNG, atau PDF.');
            return;
        }
        if (f.size > 5 * 1024 * 1024) {
            alert('Ukuran file maksimal 5MB.');
            return;
        }
        setFile(f);
    };

    const uploadToCloudinary = async (fileToUpload: File): Promise<string> => {
        const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
        const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

        if (!cloudName || !uploadPreset) {
            console.warn("Cloudinary configuration missing. Using mock Cloudinary URL.");
            return `https://res.cloudinary.com/demo/image/upload/v1700000000/${encodeURIComponent(fileToUpload.name)}`;
        }

        const formData = new FormData();
        formData.append('file', fileToUpload);
        formData.append('upload_preset', uploadPreset);

        const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/upload`, {
            method: 'POST',
            body: formData,
        });

        if (!res.ok) {
            throw new Error('Gagal mengunggah berkas ke Cloudinary');
        }

        const data = await res.json();
        return data.secure_url;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError(null);
        if (!noBAPC) {
            setFormError('Batch harus dipilih.');
            return;
        }
        try {
            setIsSaving(true);
            let docName = existingDokumen;
            if (file) {
                docName = await uploadToCloudinary(file);
            }

            await onSave({
                productSlug,
                tanggalSampling: new Date(tanggalSampling).toISOString(),
                noBAPC,
                kuantum: parseFloat(kuantum || '0'),
                lembaga: '-',
                hasilAnalisa,
                tanggalAnalisa: tanggalAnalisa ? new Date(tanggalAnalisa).toISOString() : new Date().toISOString(),
                dokumen: docName
            });
            onClose();
        } catch (error: any) {
            console.error('Save failed', error);
            setFormError(error.message || 'Gagal menyimpan data.');
        } finally {
            setIsSaving(false);
        }
    };

    const footer = (
        <>
            {formError && <span className="text-sm text-red-600 font-medium mr-auto">{formError}</span>}
            <AppButton type="button" variant="secondary" onClick={onClose}>Batal</AppButton>
            <AppButton type="submit" form="analisa-form" variant="primary" loading={isSaving}>
                {isSaving ? 'Menyimpan...' : 'Simpan'}
            </AppButton>
        </>
    );

    const batchOptions = batches.map(b => b.kode);

    return (
        <AppModal
            isOpen={isOpen}
            onClose={onClose}
            title={userRole === 'Riset' ? 'Verifikasi Hasil Analisa' : (initialData ? 'Edit Data Analisa' : 'Tambah Data Analisa')}
            footer={footer}
        >
            <form id="analisa-form" onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="block text-sm font-medium text-gray-700">Tanggal Sampling</label>
                        <input
                            type="date"
                            required
                            disabled={userRole === 'Riset'}
                            value={tanggalSampling}
                            onChange={e => setTanggalSampling(e.target.value)}
                            className={fieldCls}
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="block text-sm font-medium text-gray-700">Batch</label>
                        <SearchableSelect
                            value={noBAPC}
                            onChange={setNoBAPC}
                            options={batchOptions}
                            placeholder={isLoadingBatches ? "Memuat batch..." : "Pilih Batch"}
                            disabled={isLoadingBatches || userRole === 'Riset'}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="block text-sm font-medium text-gray-700">Kuantum</label>
                        <div className="w-full px-3 py-2.5 border border-gray-200 text-sm text-gray-500 bg-gray-50/50 font-mono">
                            {kuantum ? fmt(parseFloat(kuantum)) : '0.0'} Kg
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <label className="block text-sm font-medium text-gray-700">Hasil Analisa</label>
                        <select
                            value={hasilAnalisa}
                            onChange={e => setHasilAnalisa(e.target.value)}
                            className={fieldCls}
                        >
                            {hasilAnalisa === 'Pending' && <option value="Pending">Pending</option>}
                            <option value="Lolos">Lolos</option>
                            <option value="Tidak Lolos">Tidak Lolos</option>
                        </select>
                    </div>
                </div>

                {userRole === 'Riset' && (
                    <div className="space-y-1.5">
                        <label className="block text-sm font-medium text-gray-700">Tanggal Verifikasi (COA)</label>
                        <input
                            type="date"
                            required
                            value={tanggalAnalisa}
                            onChange={e => setTanggalAnalisa(e.target.value)}
                            className={fieldCls}
                        />
                    </div>
                )}

                <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-gray-700">Dokumen Analisa (JPG, PNG, PDF max 5MB)</label>
                    {file || existingDokumen ? (
                        <div className="flex items-center justify-between p-3 border border-emerald-200 bg-emerald-50/30">
                            <div className="flex items-center gap-2 overflow-hidden">
                                <svg className="text-emerald-600 shrink-0" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                                <span className="text-sm font-medium text-gray-700 truncate">
                                    {file ? file.name : existingDokumen}
                                </span>
                                {file && (
                                    <span className="text-xs text-gray-400 font-mono shrink-0">
                                        ({(file.size / 1024 / 1024).toFixed(2)} MB)
                                    </span>
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setFile(null);
                                    setExistingDokumen('');
                                }}
                                className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                            >
                                <XIcon />
                            </button>
                        </div>
                    ) : (
                        <div
                            onDragEnter={handleDrag}
                            onDragOver={handleDrag}
                            onDragLeave={handleDrag}
                            onDrop={handleDrop}
                            onClick={() => document.getElementById('analisa-file-input')?.click()}
                            className={`border-2 border-dashed p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-1.5 ${
                                dragActive
                                    ? 'border-emerald-500 bg-emerald-50/50'
                                    : 'border-gray-300 hover:border-emerald-400 hover:bg-gray-50/50'
                            }`}
                        >
                            <input
                                id="analisa-file-input"
                                type="file"
                                accept=".jpg,.jpeg,.png,.pdf"
                                className="hidden"
                                onChange={handleFileChange}
                            />
                            <svg className="text-gray-400 mb-1" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="17 8 12 3 7 8" />
                                <line x1="12" y1="3" x2="12" y2="15" />
                            </svg>
                            <p className="text-sm font-semibold text-gray-700">
                                Pilih file atau drop disini
                            </p>
                            <p className="text-xs text-gray-400">
                                JPG, PNG, atau PDF hingga 5MB
                            </p>
                        </div>
                    )}
                </div>
            </form>
        </AppModal>
    );
}

/* ═══════════════════════════════════════════ */
/*  Detail View Modal (Read-Only)              */
/* ═══════════════════════════════════════════ */

interface DetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    data: AnalisaRow | null;
}

function AnalisaDetailModal({ isOpen, onClose, data }: DetailModalProps) {
    if (!data) return null;

    return (
        <AppModal
            isOpen={isOpen}
            onClose={onClose}
            title="Detail Data Analisa"
            footer={
                <AppButton type="button" variant="secondary" onClick={onClose}>
                    Tutup
                </AppButton>
            }
        >
            <div className="space-y-4 text-sm">
                <div className="bg-gray-50 border border-gray-200 p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider block mb-1">Tanggal Sampling</span>
                            <p className="font-semibold text-gray-800">{formatDateShort(data.tanggalSampling)}</p>
                        </div>
                        <div>
                            <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider block mb-1">Batch</span>
                            <p className="font-semibold text-gray-800">{data.noBAPC || '—'}</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-200">
                        <div>
                            <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider block mb-1">Kuantum</span>
                            <p className="font-mono font-semibold text-gray-800">{fmt(data.kuantum)} Kg</p>
                        </div>
                        <div>
                            <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider block mb-1">Hasil Analisa</span>
                            <StatusBadge status={data.hasilAnalisa} />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-200">
                        <div>
                            <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider block mb-1">Tanggal Verifikasi (COA)</span>
                            <p className="font-medium text-gray-700">{formatDateShort(data.tanggalAnalisa)}</p>
                        </div>
                        <div>
                            <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider block mb-1">Dokumen Analisa</span>
                            {data.dokumen ? (
                                <a
                                    href={data.dokumen}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold hover:bg-emerald-100 transition-colors"
                                >
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                                    Lihat Dokumen
                                </a>
                            ) : (
                                <p className="text-gray-400 font-mono">—</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </AppModal>
    );
}

/* ═══════════════════════════════════════════ */
/*  Main Component                             */
/* ═══════════════════════════════════════════ */

interface AnalisaPageProps {
    productCategory: string;
    productName: string;
    productSlug?: string;
}

export function AnalisaPage({ productCategory, productName, productSlug }: AnalisaPageProps) {
    const slug = productSlug || 'petro-gladiator';

    const [bulan, setBulan] = useState<number | null>(new Date().getMonth() + 1);
    const [tahun, setTahun] = useState<number | null>(new Date().getFullYear());
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const pageSize = 10;

    const [data, setData] = useState<AnalisaRow[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [userRole, setUserRole] = useState<string | null>(null);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingData, setEditingData] = useState<AnalisaRow | null>(null);
    const [detailData, setDetailData] = useState<AnalisaRow | null>(null);

    const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: number | null }>({ isOpen: false, id: null });
    const [isDeleting, setIsDeleting] = useState(false);
    const [pageError, setPageError] = useState<string | null>(null);

    const normRole = (userRole || '').toLowerCase().trim();
    const isAdmin = normRole === 'admin';
    const isRiset = normRole === 'riset';
    const isAdminOrRiset = isAdmin || isRiset;

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const res = await fetch('/api/auth/me');
                if (res.ok) {
                    const info = await res.json();
                    setUserRole(info.role || null);
                }
            } catch (err) {
                console.error('Failed to fetch user info', err);
            }
        };
        fetchUser();
    }, []);

    const fetchData = useCallback(async () => {
        try {
            setIsLoading(true);
            const res = await getAnalisa(slug, bulan || undefined, tahun || undefined);
            setData(res.data || []);
        } catch (error) {
            console.error('Error fetching analisa data:', error);
        } finally {
            setIsLoading(false);
        }
    }, [slug, bulan, tahun]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Mark verified results as seen for KPP role
    useEffect(() => {
        if (data.length > 0 && userRole === 'KPP') {
            const verifiedIds = data.filter(d => d.hasilAnalisa === 'Lolos' || d.hasilAnalisa === 'Tidak Lolos').map(d => d.id);
            if (verifiedIds.length > 0) {
                try {
                    const seenIds: number[] = JSON.parse(localStorage.getItem('sippro_seen_kpp_analisa') || '[]');
                    const allIds = [...new Set([...seenIds, ...verifiedIds])];
                    localStorage.setItem('sippro_seen_kpp_analisa', JSON.stringify(allIds));
                    // Notify Sidebar bell icon
                    window.dispatchEvent(new Event('analisa-seen'));
                } catch (e) {
                    console.error('Failed to save seen notification IDs', e);
                }
            }
        }
    }, [data, userRole]);

    const handleSave = async (payload: SaveAnalisaRequest) => {
        if (editingData) {
            await updateAnalisa({ id: editingData.id, ...payload });
        } else {
            await createAnalisa(payload);
        }
        fetchData();
    };

    const executeDelete = async () => {
        if (!deleteModal.id) return;
        try {
            setIsDeleting(true);
            setPageError(null);
            await deleteAnalisa(deleteModal.id);
            setDeleteModal({ isOpen: false, id: null });
            fetchData();
        } catch (error) {
            console.error("Delete failed", error);
            setPageError("Gagal menghapus data.");
            setDeleteModal({ isOpen: false, id: null });
        } finally {
            setIsDeleting(false);
        }
    };

    const openEditModal = (row: AnalisaRow) => {
        setEditingData(row);
        setIsModalOpen(true);
    };

    const openAddModal = () => {
        setEditingData(null);
        setIsModalOpen(true);
    };

    const filteredData = useMemo(() => {
        let list = data;

        if (search) {
            const s = search.toLowerCase();
            list = list.filter(r =>
                r.noBAPC.toLowerCase().includes(s) ||
                r.hasilAnalisa.toLowerCase().includes(s) ||
                (r.dokumen && r.dokumen.toLowerCase().includes(s))
            );
        }

        return list;
    }, [data, search]);

    const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize) || 1);
    const paginatedSlice = filteredData.slice((page - 1) * pageSize, page * pageSize);

    return (
        <div className="space-y-6">
            <AnalisaFormModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSave}
                initialData={editingData}
                productSlug={slug}
                userRole={userRole}
            />

            <AnalisaDetailModal
                isOpen={!!detailData}
                onClose={() => setDetailData(null)}
                data={detailData}
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
                            <button onClick={() => setDeleteModal({ isOpen: false, id: null })} className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium transition-colors">Batal</button>
                            <button onClick={executeDelete} disabled={isDeleting} className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium transition-colors disabled:opacity-50">
                                {isDeleting ? 'Menghapus...' : 'Ya, Hapus'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {pageError && (
                <div className="bg-red-50 border border-red-200 p-4 flex items-center justify-between shadow-sm">
                    <span className="text-sm font-medium text-red-800">{pageError}</span>
                    <button onClick={() => setPageError(null)} className="px-3 py-1.5 text-sm font-semibold text-red-700 bg-red-100 hover:bg-red-200 transition-colors">Tutup</button>
                </div>
            )}

            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-gray-400 flex-wrap">
                <span className="text-gray-500">Dashboard</span>
                <span>/</span>
                <span className="text-gray-500">{productCategory}</span>
                <span>/</span>
                <span className="text-gray-500">{productName}</span>
                <span>/</span>
                <span className="text-gray-800 font-medium">Analisa</span>
            </div>

            {/* Page Header */}
            <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                    Analisa {productName}
                </h1>
            </div>

            {/* Main Content Card */}
            <div className="bg-white border border-gray-200 overflow-hidden flex flex-col min-h-[500px]">

                {/* Actions Only (Tabs removed) */}
                <div className="flex items-center justify-between border-b border-gray-100 p-4 bg-gray-50/30">
                    <div className="text-sm font-semibold text-gray-700"></div>

                    {/* Actions: Only Admin and Riset can Add Data */}
                    {isAdminOrRiset && (
                        <AppButton
                            variant="primary"
                            size="md"
                            icon={<PlusIcon />}
                            onClick={openAddModal}
                        >
                            Tambah Data
                        </AppButton>
                    )}
                </div>

                {/* Filters Row */}
                <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                    <div className="flex flex-col md:flex-row md:items-end gap-4 justify-between">
                        {/* Left: Period */}
                        <div className="flex flex-col sm:flex-row gap-3 items-end">
                            <AppPeriodFilter
                                month={bulan}
                                year={tahun}
                                onMonthChange={setBulan}
                                onYearChange={setTahun}
                            />
                        </div>

                        {/* Right: Search */}
                        <div>
                            <AppSearchBar
                                value={search}
                                placeholder="Cari data..."
                                type="text"
                                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                                containerClassName="w-full md:w-64"
                            />
                        </div>
                    </div>
                </div>

                {/* ════ Table Content Based on Active Tab ════ */}
                <div className="flex-1">
                    {isLoading ? (
                        <div className="p-12 text-center text-gray-500">Memuat data...</div>
                    ) : (
                        <>
                            {/* Desktop */}
                            <div className="overflow-x-auto hidden sm:block">
                                <table className="w-full text-sm border-collapse border border-gray-200">
                                    <thead>
                                        <tr className="bg-gray-50/80">
                                            <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200 text-center w-16">No</th>
                                            <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200 text-left whitespace-nowrap">Tanggal Sampling</th>
                                            <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200 text-left whitespace-nowrap">Batch</th>
                                            <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200 text-right whitespace-nowrap">Kuantum</th>
                                            <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200 text-left whitespace-nowrap">Dokumen</th>
                                            <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200 text-center whitespace-nowrap">Hasil Analisa</th>
                                            <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200 text-center w-28">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white">
                                        {paginatedSlice.length === 0 ? (
                                            <tr><td colSpan={7} className="p-12 text-center text-gray-400 text-sm border border-gray-200">Tidak ada data analisa</td></tr>
                                        ) : (
                                            paginatedSlice.map((row, idx) => (
                                                <tr key={row.id} className="hover:bg-emerald-50/10 transition-colors">
                                                    <td className="px-4 py-3 text-gray-700 font-medium text-center border border-gray-200">{((page - 1) * pageSize) + idx + 1}</td>
                                                    <td className="px-4 py-3 text-gray-700 border border-gray-200">{formatDateShort(row.tanggalSampling)}</td>
                                                    <td className="px-4 py-3 text-gray-700 border border-gray-200">{row.noBAPC}</td>
                                                    <td className="px-4 py-3 text-right font-mono tabular-nums text-gray-700 border border-gray-200">{fmt(row.kuantum)}</td>
                                                    <td className="px-4 py-3 text-gray-700 border border-gray-200">
                                                        {row.dokumen ? (
                                                            <a 
                                                                href={row.dokumen} 
                                                                target="_blank" 
                                                                rel="noopener noreferrer"
                                                                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 text-xs font-semibold hover:bg-emerald-100 hover:text-emerald-800 transition-all cursor-pointer"
                                                                title={row.dokumen}
                                                            >
                                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                                                                {row.dokumen.startsWith('http') ? 'Lihat Dokumen' : (row.dokumen.length > 15 ? `${row.dokumen.slice(0, 12)}...` : row.dokumen)}
                                                            </a>
                                                        ) : (
                                                            <span className="text-gray-400 font-medium">—</span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-center border border-gray-200"><StatusBadge status={row.hasilAnalisa} /></td>

                                                    <td className="px-4 py-3 text-center border border-gray-200">
                                                        {isAdmin ? (
                                                            <div className="flex items-center justify-center gap-1">
                                                                <button onClick={() => openEditModal(row)} className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors" title="Edit">
                                                                    <PencilIcon />
                                                                </button>
                                                                <button onClick={() => setDeleteModal({ isOpen: true, id: row.id })} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Hapus">
                                                                    <TrashIcon />
                                                                </button>
                                                            </div>
                                                        ) : isRiset ? (
                                                            <div className="flex items-center justify-center">
                                                                <button
                                                                    onClick={() => openEditModal(row)}
                                                                    className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold shadow-sm transition-all cursor-pointer ${
                                                                        row.hasilAnalisa === 'Pending'
                                                                            ? 'bg-amber-500 hover:bg-amber-600 text-white'
                                                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
                                                                    }`}
                                                                >
                                                                    {row.hasilAnalisa === 'Pending' ? 'Verifikasi' : 'Edit Verifikasi'}
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center justify-center">
                                                                <button
                                                                    onClick={() => setDetailData(row)}
                                                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold bg-gray-50 hover:bg-emerald-50 text-gray-700 hover:text-emerald-700 border border-gray-200 hover:border-emerald-200 transition-all cursor-pointer"
                                                                    title="Lihat Detail"
                                                                >
                                                                    <EyeIcon />
                                                                    <span>Detail</span>
                                                                </button>
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile view */}
                            <div className="sm:hidden divide-y divide-gray-100">
                                {paginatedSlice.length === 0 ? (
                                    <div className="px-4 py-12 text-center text-gray-400">Tidak ada data analisa</div>
                                ) : (
                                    paginatedSlice.map((row) => (
                                        <div key={row.id} className="p-4 space-y-2 relative group hover:bg-emerald-50/10">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="text-sm font-semibold text-gray-800">{formatDateShort(row.tanggalSampling)}</p>
                                                    <p className="text-xs text-gray-500 font-mono mt-0.5">{row.noBAPC}</p>
                                                </div>
                                                <StatusBadge status={row.hasilAnalisa} />
                                                <div className="absolute top-2 right-2 flex gap-1 bg-white border border-gray-100 shadow-sm px-1 py-0.5">
                                                    {isAdmin ? (
                                                        <>
                                                            <button onClick={() => openEditModal(row)} className="text-xs text-blue-600 px-2 py-1 hover:bg-blue-50 rounded">Edit</button>
                                                            <button onClick={() => setDeleteModal({ isOpen: true, id: row.id })} className="text-xs text-red-600 px-2 py-1 hover:bg-red-50 rounded">Hapus</button>
                                                        </>
                                                    ) : isRiset ? (
                                                        <button onClick={() => openEditModal(row)} className="text-xs text-amber-600 px-2 py-1 hover:bg-amber-50 rounded">
                                                            {row.hasilAnalisa === 'Pending' ? 'Verifikasi' : 'Edit'}
                                                        </button>
                                                    ) : (
                                                        <button onClick={() => setDetailData(row)} className="text-xs text-emerald-600 px-2 py-1 hover:bg-emerald-50 rounded font-semibold flex items-center gap-1">
                                                            <EyeIcon /> Detail
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2 text-sm">
                                                <div>
                                                    <span className="text-[11px] text-gray-400 uppercase">Kuantum</span>
                                                    <p className="font-mono text-gray-700">{fmt(row.kuantum)}</p>
                                                </div>
                                                <div>
                                                    <span className="text-[11px] text-gray-400 uppercase">Dokumen</span>
                                                    {row.dokumen ? (
                                                        <a 
                                                            href={row.dokumen} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer"
                                                            className="block text-emerald-600 font-medium hover:underline text-xs truncate max-w-[120px]" 
                                                            title={row.dokumen}
                                                        >
                                                            {row.dokumen.startsWith('http') ? 'Lihat Dokumen' : row.dokumen}
                                                        </a>
                                                    ) : (
                                                        <p className="text-gray-400 font-mono">—</p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </>
                    )}
                </div>

                {/* Pagination */}
                <AppPagination 
                    currentPage={page}
                    totalPages={totalPages}
                    onPageChange={setPage}
                    totalItems={filteredData.length}
                    itemsPerPage={pageSize}
                />
            </div>
        </div>
    );
}
