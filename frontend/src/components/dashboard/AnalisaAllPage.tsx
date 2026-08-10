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
import {
    getAllAnalisa,
    updateAnalisa,
    type AnalisaRow,
    type SaveAnalisaRequest
} from '@/lib/analisaService';
import { getProduksi } from '@/lib/produksiService';
import { api } from '@/lib/api';
import { AppModal } from '@/components/ui/app-modal';
import { AppButton } from '@/components/ui/app-button';
import { AppPeriodFilter } from '@/components/ui/app-period-filter';
import { AppSearchBar } from '../ui/app-search-bar';
import { AppPagination } from '../ui/app-pagination';
import { AppSelect } from '../ui/app-select';

/* ─── Icons ─── */
function PlusIcon() { return (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>); }
function XIcon() { return (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>); }
function FlaskIcon() { return (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 3h6" /><path d="M10 9V3" /><path d="M14 9V3" /><path d="M6.864 18.364 10 9h4l3.136 9.364a2 2 0 0 1-1.894 2.636H8.758a2 2 0 0 1-1.894-2.636Z" /></svg>); }
function EyeIcon() { return (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>); }

/* ─── Product Name Helper ─── */
const PRODUCT_LABELS: Record<string, string> = {
    'petro-gladiator': 'Petro Gladiator',
    'bio-fertil': 'Bio Fertil',
    'petro-fish': 'Petro Fish',
    'phonska-oca': 'Phonska Oca Plus',
    'petro-gladiator-cair': 'Petro Gladiator Cair',
};

function getProductLabel(slug: string): string {
    return PRODUCT_LABELS[slug] || slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

/* ─── Product color palette ─── */
const PRODUCT_COLORS: Record<string, { bg: string; text: string; border: string }> = {
    'petro-gladiator': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
    'bio-fertil': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
    'petro-fish': { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200' },
    'phonska-oca': { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
    'petro-gladiator-cair': { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200' },
};

function getProductColor(slug: string) {
    return PRODUCT_COLORS[slug] || { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' };
}

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
        <span className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold border ${styles[status] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
            {status}
        </span>
    );
}

/* ─── Product Badge ─── */
function ProductBadge({ slug }: { slug: string }) {
    const color = getProductColor(slug);
    return (
        <span className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold border ${color.bg} ${color.text} ${color.border}`}>
            {getProductLabel(slug)}
        </span>
    );
}

/* ═══════════════════════════════════════════ */
/*  Verification Modal (for Riset role)        */
/* ═══════════════════════════════════════════ */

interface VerifyModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: { hasilAnalisa: string; tanggalAnalisa?: string; dokumen?: string }) => Promise<void>;
    initialData: AnalisaRow | null;
}

const fieldCls = 'w-full px-3 py-2.5 border border-gray-200 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all bg-white rounded-lg';

function VerifyModal({ isOpen, onClose, onSave, initialData }: VerifyModalProps) {
    const [hasilAnalisa, setHasilAnalisa] = useState('Lolos');
    const [tanggalAnalisa, setTanggalAnalisa] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [existingDokumen, setExistingDokumen] = useState('');
    const [dragActive, setDragActive] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && initialData) {
            setFormError(null);
            setFile(null);
            setHasilAnalisa(initialData.hasilAnalisa === 'Pending' ? 'Lolos' : initialData.hasilAnalisa);
            setTanggalAnalisa(formatDateForInput(initialData.tanggalAnalisa || initialData.tanggalSampling || new Date().toISOString()));
            setExistingDokumen(initialData.dokumen || '');
        }
    }, [isOpen, initialData]);

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
        try {
            setIsSaving(true);
            let docName = existingDokumen;
            if (file) {
                docName = await uploadToCloudinary(file);
            }
            await onSave({
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

    if (!initialData) return null;

    const footer = (
        <>
            {formError && <span className="text-sm text-red-600 font-medium mr-auto">{formError}</span>}
            <AppButton type="button" variant="secondary" onClick={onClose}>Batal</AppButton>
            <AppButton type="submit" form="verify-form" variant="primary" loading={isSaving}>
                {isSaving ? 'Menyimpan...' : 'Simpan Verifikasi'}
            </AppButton>
        </>
    );

    return (
        <AppModal
            isOpen={isOpen}
            onClose={onClose}
            title="Verifikasi Hasil Analisa"
            footer={footer}
        >
            <form id="verify-form" onSubmit={handleSubmit} className="space-y-4">
                {/* Read-only info */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-2">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                            <span className="text-gray-400 text-xs uppercase">Produk</span>
                            <p className="font-semibold text-gray-800">{getProductLabel(initialData.productSlug)}</p>
                        </div>
                        <div>
                            <span className="text-gray-400 text-xs uppercase">Batch</span>
                            <p className="font-semibold text-gray-800">{initialData.noBAPC}</p>
                        </div>
                        <div>
                            <span className="text-gray-400 text-xs uppercase">Tanggal Sampling</span>
                            <p className="font-medium text-gray-700">{formatDateShort(initialData.tanggalSampling)}</p>
                        </div>
                        <div>
                            <span className="text-gray-400 text-xs uppercase">Kuantum</span>
                            <p className="font-mono text-gray-700">{fmt(initialData.kuantum)} Kg</p>
                        </div>
                    </div>
                </div>

                {/* Editable fields */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="block text-sm font-medium text-gray-700">Hasil Analisa</label>
                        <select
                            value={hasilAnalisa}
                            onChange={e => setHasilAnalisa(e.target.value)}
                            className={fieldCls}
                        >
                            <option value="Lolos">Lolos</option>
                            <option value="Tidak Lolos">Tidak Lolos</option>
                        </select>
                    </div>
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
                </div>

                <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-gray-700">Dokumen Analisa (JPG, PNG, PDF max 5MB)</label>
                    {file || existingDokumen ? (
                        <div className="flex items-center justify-between p-3 border border-emerald-200 bg-emerald-50/30 rounded-lg">
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
                                className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors rounded"
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
                            onClick={() => document.getElementById('verify-file-input')?.click()}
                            className={`border-2 border-dashed p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-1.5 rounded-lg ${
                                dragActive
                                    ? 'border-emerald-500 bg-emerald-50/50'
                                    : 'border-gray-300 hover:border-emerald-400 hover:bg-gray-50/50'
                            }`}
                        >
                            <input
                                id="verify-file-input"
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
/*  Summary Cards                              */
/* ═══════════════════════════════════════════ */

// function SummaryCards({ data }: { data: AnalisaRow[] }) {
//     const total = data.length;
//     const pending = data.filter(d => d.hasilAnalisa === 'Pending').length;
//     const lolos = data.filter(d => d.hasilAnalisa === 'Lolos').length;
//     const tidakLolos = data.filter(d => d.hasilAnalisa === 'Tidak Lolos').length;

//     const cards = [
//         { label: 'Total Data', value: total, icon: '📊', gradient: 'from-blue-500 to-indigo-600', bg: 'bg-blue-50' },
//         { label: 'Pending', value: pending, icon: '⏳', gradient: 'from-amber-500 to-orange-600', bg: 'bg-amber-50' },
//         { label: 'Lolos', value: lolos, icon: '✅', gradient: 'from-emerald-500 to-teal-600', bg: 'bg-emerald-50' },
//         { label: 'Tidak Lolos', value: tidakLolos, icon: '❌', gradient: 'from-red-500 to-rose-600', bg: 'bg-red-50' },
//     ];

//     return (
//         <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
//             {cards.map(c => (
//                 <div key={c.label} className="bg-white border border-gray-200 p-4 flex items-center gap-4">
//                     <div className={`w-12 h-12 ${c.bg} rounded-lg flex items-center justify-center text-xl flex-shrink-0`}>
//                         {c.icon}
//                     </div>
//                     <div>
//                         <p className="text-xs text-gray-500 font-medium">{c.label}</p>
//                         <p className="text-2xl font-bold text-gray-900">{c.value}</p>
//                     </div>
//                 </div>
//             ))}
//         </div>
//     );
// }

/* ═══════════════════════════════════════════ */
/*  Detail View Modal (Read-Only)              */
/* ═══════════════════════════════════════════ */

interface DetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    data: AnalisaRow | null;
}

function AnalisaAllDetailModal({ isOpen, onClose, data }: DetailModalProps) {
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
                            <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider block mb-1">Produk</span>
                            <ProductBadge slug={data.productSlug} />
                        </div>
                        <div>
                            <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider block mb-1">Batch</span>
                            <p className="font-semibold text-gray-800">{data.noBAPC || '—'}</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-200">
                        <div>
                            <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider block mb-1">Tanggal Sampling</span>
                            <p className="font-semibold text-gray-800">{formatDateShort(data.tanggalSampling)}</p>
                        </div>
                        <div>
                            <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider block mb-1">Kuantum</span>
                            <p className="font-mono font-semibold text-gray-800">{fmt(data.kuantum)} Kg</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-200">
                        <div>
                            <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider block mb-1">Hasil Analisa</span>
                            <StatusBadge status={data.hasilAnalisa} />
                        </div>
                        <div>
                            <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider block mb-1">Tanggal Verifikasi (COA)</span>
                            <p className="font-medium text-gray-700">{formatDateShort(data.tanggalAnalisa)}</p>
                        </div>
                    </div>
                    <div className="pt-2 border-t border-gray-200">
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
        </AppModal>
    );
}

/* ═══════════════════════════════════════════ */
/*  Main Component                             */
/* ═══════════════════════════════════════════ */

export function AnalisaAllPage() {
    const [bulan, setBulan] = useState<number | null>(new Date().getMonth() + 1);
    const [tahun, setTahun] = useState<number | null>(new Date().getFullYear());
    const [search, setSearch] = useState('');
    const [filterProduk, setFilterProduk] = useState('');
    const [filterHasil, setFilterHasil] = useState('');
    const [page, setPage] = useState(1);
    const pageSize = 10;

    const [data, setData] = useState<AnalisaRow[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [userRole, setUserRole] = useState<string | null>(null);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingData, setEditingData] = useState<AnalisaRow | null>(null);
    const [detailData, setDetailData] = useState<AnalisaRow | null>(null);

    const normRole = (userRole || '').toLowerCase().trim();
    const isAdminOrRiset = normRole === 'admin' || normRole === 'riset';

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
            const res = await getAllAnalisa(bulan || undefined, tahun || undefined);
            setData(res.data || []);
        } catch (error) {
            console.error('Error fetching analisa data:', error);
        } finally {
            setIsLoading(false);
        }
    }, [bulan, tahun]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Mark as seen when data loads (for notification system)
    useEffect(() => {
        if (data.length > 0) {
            const pendingIds = data.filter(d => d.hasilAnalisa === 'Pending').map(d => d.id);
            if (pendingIds.length > 0) {
                try {
                    const seenIds: number[] = JSON.parse(localStorage.getItem('sippro_seen_analisa') || '[]');
                    const allIds = [...new Set([...seenIds, ...pendingIds])];
                    localStorage.setItem('sippro_seen_analisa', JSON.stringify(allIds));
                    // Dispatch event so the notification bell updates
                    window.dispatchEvent(new Event('analisa-seen'));
                } catch { }
            }
        }
    }, [data]);

    // Extract unique product slugs from data
    const productOptions = useMemo(() => {
        const slugs = [...new Set(data.map(d => d.productSlug))];
        return slugs.map(s => ({ label: getProductLabel(s), value: s }));
    }, [data]);

    const hasilOptions = [
        { label: 'Semua Hasil', value: '' },
        { label: 'Pending', value: 'Pending' },
        { label: 'Lolos', value: 'Lolos' },
        { label: 'Tidak Lolos', value: 'Tidak Lolos' },
    ];

    const handleVerify = async (payload: { hasilAnalisa: string; tanggalAnalisa?: string; dokumen?: string }) => {
        if (!editingData) return;
        await updateAnalisa({
            id: editingData.id,
            hasilAnalisa: payload.hasilAnalisa,
            ...(payload.tanggalAnalisa ? { tanggalAnalisa: payload.tanggalAnalisa } : {}),
            ...(payload.dokumen ? { dokumen: payload.dokumen } : {}),
        });
        fetchData();
    };

    const openVerifyModal = (row: AnalisaRow) => {
        setEditingData(row);
        setIsModalOpen(true);
    };

    const filteredData = useMemo(() => {
        let list = data;

        if (filterProduk) {
            list = list.filter(r => r.productSlug === filterProduk);
        }

        if (filterHasil) {
            list = list.filter(r => r.hasilAnalisa === filterHasil);
        }

        if (search) {
            const s = search.toLowerCase();
            list = list.filter(r =>
                r.noBAPC.toLowerCase().includes(s) ||
                r.hasilAnalisa.toLowerCase().includes(s) ||
                getProductLabel(r.productSlug).toLowerCase().includes(s) ||
                (r.dokumen && r.dokumen.toLowerCase().includes(s))
            );
        }

        return list;
    }, [data, search, filterProduk, filterHasil]);

    // Reset page on filter change
    useEffect(() => { setPage(1); }, [search, filterProduk, filterHasil, bulan, tahun]);

    const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize) || 1);
    const paginatedSlice = filteredData.slice((page - 1) * pageSize, page * pageSize);

    return (
        <div className="space-y-6">
            <VerifyModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleVerify}
                initialData={editingData}
            />

            <AnalisaAllDetailModal
                isOpen={!!detailData}
                onClose={() => setDetailData(null)}
                data={detailData}
            />

            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-gray-400 flex-wrap">
                <span className="text-gray-500">Dashboard</span>
                <span>/</span>
                <span className="text-gray-800 font-medium">Analisa</span>
            </div>

            {/* Page Header */}
            <div className="flex items-center gap-3">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                        Analisa Produk
                    </h1>
                    <p className="text-sm text-gray-500 mt-0.5">
                        Data analisa seluruh produk pengembangan
                    </p>
                </div>
            </div>

            {/* Main Content Card */}
            <div className="bg-white border border-gray-200 overflow-hidden flex flex-col min-h-[500px]">

                {/* Filters Row */}
                <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                    <div className="flex flex-col md:flex-row md:items-end gap-4 justify-between">
                        {/* Left: Period + Product + Result Filters */}
                        <div className="flex flex-col sm:flex-row gap-3 items-end flex-wrap">
                            <AppPeriodFilter
                                month={bulan}
                                year={tahun}
                                onMonthChange={setBulan}
                                onYearChange={setTahun}
                            />
                            <div className="flex items-center gap-2">
                                <AppSelect
                                    prefixLabel="Produk:"
                                    variant="sharp"
                                    value={filterProduk}
                                    onChange={(e) => setFilterProduk(e.target.value)}
                                    options={[{ label: 'Semua Produk', value: '' }, ...productOptions]}
                                    className="h-9 bg-white min-w-[160px]"
                                />
                                <AppSelect
                                    prefixLabel="Hasil:"
                                    variant="sharp"
                                    value={filterHasil}
                                    onChange={(e) => setFilterHasil(e.target.value)}
                                    options={hasilOptions}
                                    className="h-9 bg-white min-w-[140px]"
                                />
                            </div>
                        </div>

                        {/* Right: Search */}
                        <div>
                            <AppSearchBar
                                value={search}
                                placeholder="Cari batch, produk..."
                                type="text"
                                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                                containerClassName="w-full md:w-64"
                            />
                        </div>
                    </div>
                </div>

                {/* Table Content */}
                <div className="flex-1">
                    {isLoading ? (
                        <div className="p-12 text-center">
                            <div className="inline-flex items-center gap-3 text-gray-500">
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-emerald-600" />
                                <span>Memuat data analisa...</span>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Desktop */}
                            <div className="overflow-x-auto hidden sm:block">
                                <table className="w-full text-sm border-collapse border border-gray-200">
                                    <thead>
                                        <tr className="bg-gray-50/80">
                                            <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200 text-center w-14">No</th>
                                            <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200 text-left whitespace-nowrap">Produk</th>
                                            <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200 text-left whitespace-nowrap">Tanggal Sampling</th>
                                            <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200 text-left whitespace-nowrap">Batch</th>
                                            <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200 text-right whitespace-nowrap">Kuantum</th>
                                            <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200 text-left whitespace-nowrap">Dokumen</th>
                                            <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200 text-center whitespace-nowrap">Hasil Analisa</th>
                                            <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-200 text-center w-32">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white">
                                        {paginatedSlice.length === 0 ? (
                                            <tr><td colSpan={8} className="p-12 text-center text-gray-400 text-sm border border-gray-200">Tidak ada data analisa</td></tr>
                                        ) : (
                                            paginatedSlice.map((row, idx) => (
                                                <tr key={row.id} className="hover:bg-emerald-50/10 transition-colors">
                                                    <td className="px-4 py-3 text-gray-700 font-medium text-center border border-gray-200">{((page - 1) * pageSize) + idx + 1}</td>
                                                    <td className="px-4 py-3 border border-gray-200">
                                                        <ProductBadge slug={row.productSlug} />
                                                    </td>
                                                    <td className="px-4 py-3 text-gray-700 border border-gray-200">{formatDateShort(row.tanggalSampling)}</td>
                                                    <td className="px-4 py-3 text-gray-700 border border-gray-200">{row.noBAPC}</td>
                                                    <td className="px-4 py-3 text-right font-mono tabular-nums text-gray-700 border border-gray-200">{fmt(row.kuantum)}</td>
                                                    <td className="px-4 py-3 text-gray-700 border border-gray-200">
                                                        {row.dokumen ? (
                                                            <a
                                                                href={row.dokumen}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 text-xs font-semibold hover:bg-emerald-100 hover:text-emerald-800 transition-all cursor-pointer rounded"
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
                                                        {isAdminOrRiset ? (
                                                            <button
                                                                onClick={() => openVerifyModal(row)}
                                                                className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer rounded ${
                                                                    row.hasilAnalisa === 'Pending'
                                                                        ? 'bg-amber-500 hover:bg-amber-600 text-white'
                                                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
                                                                }`}
                                                            >
                                                                {row.hasilAnalisa === 'Pending' ? 'Verifikasi' : 'Edit Verifikasi'}
                                                            </button>
                                                        ) : (
                                                            <button
                                                                onClick={() => setDetailData(row)}
                                                                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold bg-gray-50 hover:bg-emerald-50 text-gray-700 hover:text-emerald-700 border border-gray-200 hover:border-emerald-200 transition-all cursor-pointer rounded"
                                                                title="Lihat Detail"
                                                            >
                                                                <EyeIcon />
                                                                <span>Detail</span>
                                                            </button>
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
                                                    <ProductBadge slug={row.productSlug} />
                                                    <p className="text-sm font-semibold text-gray-800 mt-1.5">{formatDateShort(row.tanggalSampling)}</p>
                                                    <p className="text-xs text-gray-500 font-mono mt-0.5">{row.noBAPC}</p>
                                                </div>
                                                <div className="flex flex-col items-end gap-1.5">
                                                    <StatusBadge status={row.hasilAnalisa} />
                                                    {isAdminOrRiset ? (
                                                        <button
                                                            onClick={() => openVerifyModal(row)}
                                                            className={`text-xs font-semibold px-2.5 py-1 rounded transition-all ${
                                                                row.hasilAnalisa === 'Pending'
                                                                    ? 'bg-amber-500 text-white'
                                                                    : 'bg-gray-100 text-gray-700 border border-gray-200'
                                                            }`}
                                                        >
                                                            {row.hasilAnalisa === 'Pending' ? 'Verifikasi' : 'Edit'}
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => setDetailData(row)}
                                                            className="text-xs font-semibold px-2.5 py-1 rounded transition-all bg-gray-50 hover:bg-emerald-50 text-gray-700 hover:text-emerald-700 border border-gray-200 flex items-center gap-1"
                                                        >
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
