'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Sparkles,
    Calendar,
    Plus,
    Trash2,
    Download,
    Upload,
    Image as ImageIcon,
    FileSpreadsheet,
    RotateCcw,
    Bookmark,
    History
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { AppButton } from '@/components/ui/app-button';
import { useToast } from '@/components/ui/toast';
import { sidebarService } from '@/lib/sidebarService';
import { reportDraftService, type ReportVersionDraft } from '@/lib/reportDraftService';
import { VersionHistoryDrawer, SaveDraftModal } from '@/components/dashboard/VersionHistoryDrawer';

/* ─── Helper: Format any date/ISO string to DD/MM/YYYY ─── */
function formatYmdToDmy(dateStr: string): string {
    if (!dateStr) return '';
    const cleanStr = dateStr.split('T')[0].split(' ')[0];
    const parts = cleanStr.split('-');
    if (parts.length === 3 && parts[0].length === 4) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
}

/* ─── Types ─── */
interface RkoRow {
    no: number;
    name: string;
    bentuk: string;
    kemasan: string;
    realisasiProduksi: number;
    realisasiPengambilan: number;
    stokAkhir: number;
    satuan: string;
}

interface GroupedRkoProduct {
    productName: string;
    bentuk: string;
    satuan: string;
    rows: RkoRow[];
    originalIndices: number[];
}

function groupRkoTable(rkoTable: RkoRow[]): GroupedRkoProduct[] {
    const groups: GroupedRkoProduct[] = [];
    const map = new Map<string, GroupedRkoProduct>();

    rkoTable.forEach((row, originalIdx) => {
        const cleanName = (row.name || '')
            .replace(/\s*-\s*(1\s*liter|500\s*ml|pgd\s*@[^)]+|pbf\s*@[^)]+|@[^)]+).*$/i, '')
            .trim() || row.name;

        if (!map.has(cleanName)) {
            const group: GroupedRkoProduct = {
                productName: cleanName,
                bentuk: row.bentuk,
                satuan: row.satuan,
                rows: [row],
                originalIndices: [originalIdx],
            };
            map.set(cleanName, group);
            groups.push(group);
        } else {
            const group = map.get(cleanName)!;
            group.rows.push(row);
            group.originalIndices.push(originalIdx);
        }
    });

    return groups;
}

interface DateGroup {
    id: string;
    tanggal: string;
    bullets: string[];
}

interface ProductBlock {
    id: string;
    name: string;
    image: string;
    dateGroups: DateGroup[];
}

interface PabrikDateGroup {
    id: string;
    tanggal: string;
    bullets: string[];
}

interface PabrikPlanBlock {
    id: string;
    name: string;
    image: string;
    dateGroups: PabrikDateGroup[];
}

export default function TemplateLaporanPage() {
    const toast = useToast();

    // Refs for hidden date inputs (picker feature)
    const startDatePickerRef = useRef<HTMLInputElement>(null);
    const endDatePickerRef = useRef<HTMLInputElement>(null);

    // Filters & Config
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');
    const [rkoYear, setRkoYear] = useState<number>(2026);
    const [updateDate, setUpdateDate] = useState<string>('');
    const [tableADateLabel, setTableADateLabel] = useState<string>('01/01/2026');

    // Optional Section: Update Progres Pabrik dan Produksi
    const [isPabrikProgressActive, setIsPabrikProgressActive] = useState<boolean>(false);
    const [pabrikPlanBlocks, setPabrikPlanBlocks] = useState<PabrikPlanBlock[]>([
        {
            id: 'pabrik-plan-1',
            name: 'Pabrik Gladiators / NPK',
            image: '/images/petro-gladiator.webp',
            dateGroups: [
                {
                    id: 'pabrik-group-1',
                    tanggal: '',
                    bullets: [
                        'Pembersihan filter pompa limbah & maintenance rutin.',
                        'Trial perbanyakan formula baru.'
                    ]
                }
            ]
        }
    ]);

    /* ── Handlers for Pabrik Plan Progress ── */
    const handleAddPabrikPlanBlock = () => {
        const defaultDate = startDate || formatYmdToDmy(new Date().toISOString().split('T')[0]);
        const newBlock: PabrikPlanBlock = {
            id: `pabrik-plan-${Date.now()}`,
            name: 'Nama Plan Baru...',
            image: '',
            dateGroups: [
                {
                    id: `pabrik-group-${Date.now()}`,
                    tanggal: defaultDate,
                    bullets: ['Aktivitas progres baru...']
                }
            ]
        };
        setPabrikPlanBlocks(prev => [...prev, newBlock]);
    };

    const handleDeletePabrikPlanBlock = (planId: string) => {
        setPabrikPlanBlocks(prev => prev.filter(p => p.id !== planId));
    };

    const handlePabrikPlanImageUpload = (planId: string, file: File) => {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const dataUrl = e.target?.result as string;
            if (dataUrl) {
                setPabrikPlanBlocks(prev => prev.map(p => p.id === planId ? { ...p, image: dataUrl } : p));
            }
        };
        reader.readAsDataURL(file);
    };

    const handlePabrikPlanNameChange = (planId: string, name: string) => {
        setPabrikPlanBlocks(prev => prev.map(p => p.id === planId ? { ...p, name } : p));
    };

    const handlePabrikDateGroupChange = (planId: string, groupId: string, field: 'tanggal', val: string) => {
        setPabrikPlanBlocks(prev => prev.map(p => {
            if (p.id !== planId) return p;
            return {
                ...p,
                dateGroups: p.dateGroups.map(g => g.id === groupId ? { ...g, [field]: val } : g)
            };
        }));
    };

    const handlePabrikBulletChange = (planId: string, groupId: string, bulletIdx: number, val: string) => {
        setPabrikPlanBlocks(prev => prev.map(p => {
            if (p.id !== planId) return p;
            return {
                ...p,
                dateGroups: p.dateGroups.map(g => {
                    if (g.id !== groupId) return g;
                    const newBullets = [...g.bullets];
                    newBullets[bulletIdx] = val;
                    return { ...g, bullets: newBullets };
                })
            };
        }));
    };

    const handleAddPabrikBulletToGroup = (planId: string, groupId: string) => {
        setPabrikPlanBlocks(prev => prev.map(p => {
            if (p.id !== planId) return p;
            return {
                ...p,
                dateGroups: p.dateGroups.map(g => {
                    if (g.id !== groupId) return g;
                    return { ...g, bullets: [...g.bullets, 'Aktivitas progres baru...'] };
                })
            };
        }));
    };

    const handleDeletePabrikBullet = (planId: string, groupId: string, bulletIdx: number) => {
        setPabrikPlanBlocks(prev => prev.map(p => {
            if (p.id !== planId) return p;
            return {
                ...p,
                dateGroups: p.dateGroups.map(g => {
                    if (g.id !== groupId) return g;
                    return { ...g, bullets: g.bullets.filter((_, i) => i !== bulletIdx) };
                })
            };
        }));
    };

    const handleAddPabrikDateGroup = (planId: string) => {
        const defaultDate = startDate || formatYmdToDmy(new Date().toISOString().split('T')[0]);
        setPabrikPlanBlocks(prev => prev.map(p => {
            if (p.id !== planId) return p;
            const newGroup: PabrikDateGroup = {
                id: `pabrik-group-${Date.now()}`,
                tanggal: defaultDate,
                bullets: ['Aktivitas progres baru...']
            };
            return { ...p, dateGroups: [...p.dateGroups, newGroup] };
        }));
    };

    const handleDeletePabrikDateGroup = (planId: string, groupId: string) => {
        setPabrikPlanBlocks(prev => prev.map(p => {
            if (p.id !== planId) return p;
            return {
                ...p,
                dateGroups: p.dateGroups.filter(g => g.id !== groupId)
            };
        }));
    };

    // State for generated preview
    const [hasGenerated, setHasGenerated] = useState<boolean>(false);
    const [generating, setGenerating] = useState<boolean>(false);

    // Version Drafts State
    const [userName, setUserName] = useState<string>('User');
    const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState<boolean>(false);
    const [isSaveDraftModalOpen, setIsSaveDraftModalOpen] = useState<boolean>(false);
    const [versions, setVersions] = useState<ReportVersionDraft[]>([]);
    const [activeVersionId, setActiveVersionId] = useState<string | null>(null);

    useEffect(() => {
        const loadInitialDraftData = async () => {
            try {
                const res = await fetch('/api/auth/me');
                if (res.ok) {
                    const info = await res.json();
                    setUserName(info.fullName || 'User');
                }
            } catch (err) {
                console.error('Failed to fetch user profile:', err);
            }

            // Sync with DB to support multi-browser & Incognito mode
            const dbData = await reportDraftService.fetchVersionsFromDB();
            setVersions(dbData.versions);
            setActiveVersionId(dbData.activeVersionId);
        };

        loadInitialDraftData();
    }, []);

    const handleSaveDraft = async (customName?: string) => {
        const draftData = {
            startDate,
            endDate,
            rkoYear,
            updateDate,
            tableADateLabel,
            hasGenerated,
            rkoTable,
            productBlocks,
            catatanTambahanBullets,
            isPabrikProgressActive,
            pabrikPlanBlocks,
        };
        const newVersion = await reportDraftService.saveVersion(draftData, userName, customName);
        const dbData = await reportDraftService.fetchVersionsFromDB();
        setVersions(dbData.versions);
        setActiveVersionId(newVersion.id);
        toast.success('Draft Tersimpan', `Versi "${newVersion.name}" berhasil disimpan ke histori versi.`);
    };

    const handleRestoreVersion = async (version: ReportVersionDraft) => {
        if (version && version.data) {
            const d = version.data;
            if (d.startDate !== undefined) setStartDate(d.startDate);
            if (d.endDate !== undefined) setEndDate(d.endDate);
            if (d.rkoYear !== undefined) setRkoYear(d.rkoYear);
            if (d.updateDate !== undefined) setUpdateDate(d.updateDate);
            if (d.tableADateLabel !== undefined) setTableADateLabel(d.tableADateLabel);
            if (d.hasGenerated !== undefined) setHasGenerated(d.hasGenerated);
            if (d.rkoTable) setRkoTable(d.rkoTable);
            if (d.productBlocks) setProductBlocks(d.productBlocks);
            if (d.catatanTambahanBullets) setCatatanTambahanBullets(d.catatanTambahanBullets);
            if (d.isPabrikProgressActive !== undefined) setIsPabrikProgressActive(d.isPabrikProgressActive);
            if (d.pabrikPlanBlocks) setPabrikPlanBlocks(d.pabrikPlanBlocks);

            await reportDraftService.setActiveVersionId(version.id);
            setActiveVersionId(version.id);
            toast.success('Versi Diterapkan', `Laporan berhasil dimuat ke versi "${version.name}".`);
        }
    };

    const handleRenameVersion = async (id: string, newName: string) => {
        const ok = await reportDraftService.renameVersion(id, newName);
        if (ok) {
            const dbData = await reportDraftService.fetchVersionsFromDB();
            setVersions(dbData.versions);
            toast.success('Nama Versi Diperbarui', `Nama versi telah diubah menjadi "${newName}".`);
        }
    };

    const handleDeleteVersion = async (id: string) => {
        const ok = await reportDraftService.deleteVersion(id);
        if (ok) {
            const dbData = await reportDraftService.fetchVersionsFromDB();
            setVersions(dbData.versions);
            setActiveVersionId(dbData.activeVersionId);
            toast.success('Versi Dihapus', 'Versi draft telah dihapus dari histori.');
        }
    };

    // Auto-sync Label Up Date Laporan when Tanggal Akhir Aktivitas changes
    useEffect(() => {
        if (endDate) {
            setUpdateDate(endDate);
            setTableADateLabel(`01/01/${rkoYear} s/d ${endDate}`);
        } else {
            setUpdateDate('');
            setTableADateLabel(`01/01/${rkoYear}`);
        }
    }, [endDate, rkoYear]);

    // 7 Official RKO Product Variants
    const [rkoTable, setRkoTable] = useState<RkoRow[]>([
        { no: 1, name: 'Phonska OCA Plus', bentuk: 'Cair', kemasan: '1 Liter', realisasiProduksi: 0, realisasiPengambilan: 0, stokAkhir: 0, satuan: 'Liter' },
        { no: 2, name: 'Petro Fish', bentuk: 'Cair', kemasan: '1 Liter', realisasiProduksi: 0, realisasiPengambilan: 0, stokAkhir: 0, satuan: 'Liter' },
        { no: 3, name: 'Petro Gladiator Padat', bentuk: 'Padat', kemasan: '1 Kg', realisasiProduksi: 0, realisasiPengambilan: 0, stokAkhir: 0, satuan: 'Kg' },
        { no: 4, name: 'Petro Gladiator Padat', bentuk: 'Padat', kemasan: '2 Kg', realisasiProduksi: 0, realisasiPengambilan: 0, stokAkhir: 0, satuan: 'Kg' },
        { no: 5, name: 'Petro Bio Fertil', bentuk: 'Padat', kemasan: '5 Kg', realisasiProduksi: 0, realisasiPengambilan: 0, stokAkhir: 0, satuan: 'Kg' },
        { no: 6, name: 'Petro Gladiator Cair', bentuk: 'Cair', kemasan: '1 Liter', realisasiProduksi: 0, realisasiPengambilan: 0, stokAkhir: 0, satuan: 'Liter' },
        { no: 7, name: 'Petro Gladiator Cair', bentuk: 'Cair', kemasan: '500 ml', realisasiProduksi: 0, realisasiPengambilan: 0, stokAkhir: 0, satuan: 'Liter' },
    ]);

    const [productBlocks, setProductBlocks] = useState<ProductBlock[]>([
        {
            id: 'petro-fish',
            name: 'Petro Fish',
            image: '/images/petro-fish.webp',
            dateGroups: []
        },
        {
            id: 'phonska-oca',
            name: 'Phonska Oca Plus',
            image: '/images/phonska-oca-plus.webp',
            dateGroups: []
        },
        {
            id: 'bio-fertil',
            name: 'Petro Bio Fertil',
            image: '/images/bio-fertil.webp',
            dateGroups: []
        },
        {
            id: 'petro-gladiator',
            name: 'Petro Gladiator Padat',
            image: '/images/petro-gladiator.webp',
            dateGroups: []
        },
        {
            id: 'petro-gladiator-cair',
            name: 'Petro Gladiator Cair',
            image: '/images/petro-gladiator.webp',
            dateGroups: []
        }
    ]);

    const [availableProductsCatalog, setAvailableProductsCatalog] = useState<ProductBlock[]>([
        { id: 'petro-fish', name: 'Petro Fish', image: '/images/petro-fish.webp', dateGroups: [] },
        { id: 'phonska-oca', name: 'Phonska Oca Plus', image: '/images/phonska-oca-plus.webp', dateGroups: [] },
        { id: 'bio-fertil', name: 'Petro Bio Fertil', image: '/images/bio-fertil.webp', dateGroups: [] },
        { id: 'petro-gladiator', name: 'Petro Gladiator Padat', image: '/images/petro-gladiator.webp', dateGroups: [] },
        { id: 'petro-gladiator-cair', name: 'Petro Gladiator Cair', image: '/images/petro-gladiator.webp', dateGroups: [] },
    ]);

    /* ─── Load Initial Active Products Dynamically ─── */
    const loadInitialProducts = useCallback(async () => {
        try {
            const allMenus = await sidebarService.getAllFlat();
            const produkPengembangan = allMenus.find(
                (m) => (m.label || '').toLowerCase().trim() === 'produk pengembangan' && !m.parentId
            );
            if (!produkPengembangan) return;

            const level2 = allMenus.filter(
                (m) => m.parentId === produkPengembangan.id && m.isActive !== false
            );

            const NON_PRODUCT_SLUGS = new Set([
                'bahan-baku',
                'aktivitas-harian',
                'maintenance',
                'rkap-rko',
                'rencana-pengadaan',
                'template-laporan',
            ]);

            const NON_PRODUCT_LABELS = new Set([
                'bahan baku',
                'aktivitas harian',
                'maintenance',
                'rkap / rko',
                'rkap/rko',
                'rkap',
                'rko',
                'rencana pengadaan',
                'template laporan',
            ]);

            const activeProducts: ProductBlock[] = level2
                .filter((l2) => {
                    const hasChildren = allMenus.some((m) => m.parentId === l2.id);
                    if (!hasChildren) return false;
                    const labelNorm = (l2.label || '').toLowerCase().trim();
                    if (NON_PRODUCT_LABELS.has(labelNorm)) return false;
                    return true;
                })
                .sort((a, b) => a.order - b.order)
                .map((l2) => {
                    const children = allMenus.filter((m) => m.parentId === l2.id);
                    const firstChildHref = children.find((c) => c.href && c.href !== '#')?.href || '';
                    const hrefParts = firstChildHref.split('/').filter(Boolean);
                    const slug = hrefParts.length >= 3 ? hrefParts[2] : l2.label.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

                    return {
                        id: slug,
                        name: l2.label,
                        image: l2.imageUrl || `/images/${slug}.webp`,
                        dateGroups: [],
                    };
                })
                .filter((p) => !NON_PRODUCT_SLUGS.has(p.id.toLowerCase()));

            if (activeProducts.length > 0) {
                setAvailableProductsCatalog(activeProducts);
                setProductBlocks((prev) => {
                    // If prev already has dateGroups with data, preserve them!
                    const hasDataInPrev = prev.some((p) => p.dateGroups && p.dateGroups.length > 0);
                    if (hasDataInPrev) {
                        return prev;
                    }
                    // Check if localStorage has saved productBlocks with dateGroups
                    if (typeof window !== 'undefined') {
                        try {
                            const savedDraftStr = localStorage.getItem('sipp_template_laporan_draft_v1');
                            if (savedDraftStr) {
                                const draft = JSON.parse(savedDraftStr);
                                if (draft && draft.productBlocks && draft.productBlocks.some((p: any) => p.dateGroups && p.dateGroups.length > 0)) {
                                    return draft.productBlocks;
                                }
                            }
                        } catch (e) {
                            console.error('Error reading draft in loadInitialProducts:', e);
                        }
                    }
                    return activeProducts;
                });
            }
        } catch (err) {
            console.error('Failed to load initial products for report template:', err);
        }
    }, []);

    useEffect(() => {
        loadInitialProducts();
    }, [loadInitialProducts]);

    const [catatanTambahanBullets, setCatatanTambahanBullets] = useState<string[]>([]);

    const DRAFT_STORAGE_KEY = 'sipp_template_laporan_draft_v1';
    const isRestoredRef = useRef<boolean>(false);

    /* ─── Auto-Restore Draft from LocalStorage on Mount (Strictly Once) ─── */
    useEffect(() => {
        if (isRestoredRef.current) return;
        isRestoredRef.current = true;

        try {
            const savedDraftStr = localStorage.getItem(DRAFT_STORAGE_KEY);
            if (savedDraftStr) {
                const draft = JSON.parse(savedDraftStr);
                if (draft && (draft.hasGenerated || draft.startDate || draft.endDate)) {
                    if (draft.startDate !== undefined) setStartDate(draft.startDate);
                    if (draft.endDate !== undefined) setEndDate(draft.endDate);
                    if (draft.rkoYear !== undefined) setRkoYear(draft.rkoYear);
                    if (draft.updateDate !== undefined) setUpdateDate(draft.updateDate);
                    if (draft.tableADateLabel !== undefined) setTableADateLabel(draft.tableADateLabel);
                    if (draft.hasGenerated !== undefined) setHasGenerated(draft.hasGenerated);
                    if (draft.rkoTable && Array.isArray(draft.rkoTable)) setRkoTable(draft.rkoTable);
                    if (draft.productBlocks && Array.isArray(draft.productBlocks) && draft.productBlocks.length > 0) {
                        setProductBlocks(draft.productBlocks);
                    }
                    if (draft.catatanTambahanBullets && Array.isArray(draft.catatanTambahanBullets)) setCatatanTambahanBullets(draft.catatanTambahanBullets);
                    if (draft.isPabrikProgressActive !== undefined) setIsPabrikProgressActive(draft.isPabrikProgressActive);
                    if (draft.pabrikPlanBlocks && Array.isArray(draft.pabrikPlanBlocks)) setPabrikPlanBlocks(draft.pabrikPlanBlocks);
                }
            }
        } catch (err) {
            console.error('Failed to restore draft from localStorage:', err);
        }
    }, []);

    /* ─── Auto-Save Draft to LocalStorage whenever state changes ─── */
    useEffect(() => {
        if (!isRestoredRef.current) return;
        try {
            const draftPayload = {
                startDate,
                endDate,
                rkoYear,
                updateDate,
                tableADateLabel,
                hasGenerated,
                rkoTable,
                productBlocks,
                catatanTambahanBullets,
                isPabrikProgressActive,
                pabrikPlanBlocks,
                lastSavedAt: new Date().toISOString()
            };
            localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draftPayload));
        } catch (err) {
            console.error('Failed to save draft to localStorage:', err);
        }
    }, [
        startDate,
        endDate,
        rkoYear,
        updateDate,
        tableADateLabel,
        hasGenerated,
        rkoTable,
        productBlocks,
        catatanTambahanBullets,
        isPabrikProgressActive,
        pabrikPlanBlocks
    ]);

    /* ─── Reset Draft Handler ─── */
    const handleResetDraft = () => {
        try {
            localStorage.removeItem(DRAFT_STORAGE_KEY);
            setStartDate('');
            setEndDate('');
            setUpdateDate('');
            setTableADateLabel(`01/01/${rkoYear}`);
            setHasGenerated(false);
            setCatatanTambahanBullets([]);
            setIsPabrikProgressActive(false);
            setPabrikPlanBlocks([
                {
                    id: 'pabrik-plan-1',
                    name: 'Pabrik Gladiators / NPK',
                    image: '/images/petro-gladiator.webp',
                    dateGroups: [
                        {
                            id: 'pabrik-group-1',
                            tanggal: '',
                            bullets: [
                                'Pembersihan filter pompa limbah & maintenance rutin.',
                                'Trial perbanyakan formula baru.'
                            ]
                        }
                    ]
                }
            ]);
            if (availableProductsCatalog.length > 0) {
                setProductBlocks(availableProductsCatalog.map(p => ({ ...p, dateGroups: [] })));
            } else {
                loadInitialProducts();
            }
            toast.success('Draft Dibersihkan', 'Draft laporan lokal berhasil di-reset ke kondisi awal.');
        } catch (err) {
            console.error('Failed to reset draft:', err);
        }
    };

    /* ── Generate Report via API ── */
    const handleGenerate = async () => {
        if (!startDate.trim() || !endDate.trim()) {
            toast.warning('Perhatian', 'Tanggal Mulai Aktivitas dan Tanggal Akhir Aktivitas harus diisi terlebih dahulu.');
            return;
        }

        setGenerating(true);
        try {
            const formatDmyToYmd = (dmy: string) => {
                if (!dmy) return '';
                const parts = dmy.split('/');
                if (parts.length === 3) {
                    return `${parts[2]}-${parts[1]}-${parts[0]}`;
                }
                return dmy;
            };

            const res = await fetch('/api/reports/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    startDate: formatDmyToYmd(startDate),
                    endDate: formatDmyToYmd(endDate),
                    rkoYear,
                }),
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.message || 'Gagal memproses laporan.');
            }

            const data = await res.json();

            if (data.rkoSummary && data.rkoSummary.length > 0) {
                setRkoTable(data.rkoSummary);
            }

            if (data.tableADateLabel) {
                setTableADateLabel(data.tableADateLabel);
            }

            if (data.productBlocks && data.productBlocks.length > 0) {
                setProductBlocks(data.productBlocks);
            } else if (data.aiSummaries) {
                setProductBlocks(prev => prev.map(p => ({
                    ...p,
                    image: data.productImageMap && data.productImageMap[p.id] ? data.productImageMap[p.id] : p.image,
                    dateGroups: data.aiSummaries[p.id] || []
                })));
            }

            if (data.aiSummaries) {

                const rawCatatan: DateGroup[] = data.aiSummaries['catatan-tambahan'] || [];
                const allCatatan = rawCatatan.flatMap(g => g.bullets || []);
                
                // Deduplicate catatan bullets
                const seenCatatan = new Set<string>();
                const uniqueCatatan = allCatatan.filter(item => {
                    const norm = item.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
                    if (!norm) return false;
                    if (seenCatatan.has(norm)) return false;
                    seenCatatan.add(norm);
                    return true;
                });
                setCatatanTambahanBullets(uniqueCatatan);
            }

            setHasGenerated(true);
            toast.success('Berhasil', 'Template Laporan berhasil digenerate menggunakan AI.');
        } catch (err: any) {
            console.error('Generate failed:', err);
            toast.error('Gagal Generate Laporan', err.message || 'Terjadi kesalahan saat merangkum data.');
        } finally {
            setGenerating(false);
        }
    };

    /* ── Edit Handlers ── */
    const handleRkoChange = (index: number, field: keyof RkoRow, value: any) => {
        setRkoTable(prev => {
            const next = [...prev];
            const updated = { ...next[index], [field]: value };
            if (field === 'realisasiProduksi' || field === 'realisasiPengambilan') {
                updated.stokAkhir = Math.max(0, (updated.realisasiProduksi || 0) - (updated.realisasiPengambilan || 0));
            }
            next[index] = updated;
            return next;
        });
    };

    const handleDateGroupChange = (blockId: string, groupId: string, field: 'tanggal', val: string) => {
        setProductBlocks(prev => prev.map(p => {
            if (p.id !== blockId) return p;
            return {
                ...p,
                dateGroups: p.dateGroups.map(g => g.id === groupId ? { ...g, [field]: val } : g)
            };
        }));
    };

    const handleBulletChange = (blockId: string, groupId: string, bulletIdx: number, val: string) => {
        setProductBlocks(prev => prev.map(p => {
            if (p.id !== blockId) return p;
            return {
                ...p,
                dateGroups: p.dateGroups.map(g => {
                    if (g.id !== groupId) return g;
                    const newBullets = [...g.bullets];
                    newBullets[bulletIdx] = val;
                    return { ...g, bullets: newBullets };
                })
            };
        }));
    };

    const handleAddBulletToGroup = (blockId: string, groupId: string) => {
        setProductBlocks(prev => prev.map(p => {
            if (p.id !== blockId) return p;
            return {
                ...p,
                dateGroups: p.dateGroups.map(g => {
                    if (g.id !== groupId) return g;
                    return { ...g, bullets: [...g.bullets, 'Aktivitas baru...'] };
                })
            };
        }));
    };

    const handleDeleteBullet = (blockId: string, groupId: string, bulletIdx: number) => {
        setProductBlocks(prev => prev.map(p => {
            if (p.id !== blockId) return p;
            return {
                ...p,
                dateGroups: p.dateGroups.map(g => {
                    if (g.id !== groupId) return g;
                    return { ...g, bullets: g.bullets.filter((_, i) => i !== bulletIdx) };
                })
            };
        }));
    };

    const handleAddDateGroup = (blockId: string) => {
        const defaultDate = startDate || formatYmdToDmy(new Date().toISOString().split('T')[0]);
        setProductBlocks(prev => prev.map(p => {
            if (p.id !== blockId) return p;
            const newGroup: DateGroup = {
                id: `manual-${Date.now()}`,
                tanggal: defaultDate,
                bullets: ['Aktivitas baru...']
            };
            return { ...p, dateGroups: [...p.dateGroups, newGroup] };
        }));
    };

    const handleDeleteDateGroup = (blockId: string, groupId: string) => {
        setProductBlocks(prev => prev.map(p => {
            if (p.id !== blockId) return p;
            return {
                ...p,
                dateGroups: p.dateGroups.filter(g => g.id !== groupId)
            };
        }));
    };

    const handleDeleteProductBlock = (blockId: string) => {
        setProductBlocks(prev => prev.filter(p => p.id !== blockId));
    };

    const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);

    const handleAddProductBlock = (prod: { id: string; name: string; image: string }) => {
        const normName = prod.name.toLowerCase().trim();
        if (productBlocks.some(b => b.id === prod.id || b.name.toLowerCase().trim() === normName)) return;
        const defaultDate = startDate || formatYmdToDmy(new Date().toISOString().split('T')[0]);
        const newBlock: ProductBlock = {
            id: prod.id,
            name: prod.name,
            image: prod.image,
            dateGroups: [
                {
                    id: `manual-group-${Date.now()}`,
                    tanggal: defaultDate,
                    bullets: ['Aktivitas baru...']
                }
            ]
        };
        setProductBlocks(prev => [...prev, newBlock]);
    };

    /* ── Export PDF ── */
    const handleExportPDF = () => {
        if (!hasGenerated) {
            toast.warning('Perhatian', 'Generate laporan terlebih dahulu sebelum melakukan export PDF.');
            return;
        }
        try {
            const groupedRko = groupRkoTable(rkoTable);

            const rkoRowsHtml = groupedRko.flatMap((group, groupIdx) => {
                return group.rows.map((r, rowIdx) => `
                    <tr>
                        ${rowIdx === 0 ? `
                            <td rowspan="${group.rows.length}" style="text-align: center; border: 1px solid #000; padding: 4px; vertical-align: middle;">${groupIdx + 1}</td>
                            <td rowspan="${group.rows.length}" style="border: 1px solid #000; padding: 4px; font-weight: bold; vertical-align: middle;">${group.productName}</td>
                            <td rowspan="${group.rows.length}" style="text-align: center; border: 1px solid #000; padding: 4px; vertical-align: middle;">${group.bentuk}</td>
                        ` : ''}
                        <td style="text-align: center; border: 1px solid #000; padding: 4px;">${r.kemasan}</td>
                        <td style="text-align: right; border: 1px solid #000; padding: 4px;">${(r.realisasiProduksi || 0).toLocaleString('id-ID')}</td>
                        <td style="text-align: right; border: 1px solid #000; padding: 4px;">${(r.realisasiPengambilan || 0).toLocaleString('id-ID')}</td>
                        <td style="text-align: right; border: 1px solid #000; padding: 4px; font-weight: bold; background: #ecfdf5;">${(r.stokAkhir || 0).toLocaleString('id-ID')}</td>
                        ${rowIdx === 0 ? `
                            <td rowspan="${group.rows.length}" style="text-align: center; border: 1px solid #000; padding: 4px; vertical-align: middle;">${group.satuan}</td>
                        ` : ''}
                    </tr>
                `);
            }).join('');

            const productRowsHtml = productBlocks.map(p => {
                const groups = p.dateGroups || [];

                if (groups.length === 0) {
                    return `
                        <tr>
                            <td style="border: 1px solid #000; padding: 8px; width: 150px; text-align: center; vertical-align: top; background: #fafafa;">
                                <img src="${p.image}" alt="${p.name}" style="width: 65px; height: 75px; object-fit: contain; margin-bottom: 4px;" />
                                <div style="font-weight: bold; font-size: 8.5pt;">${p.name.replace(/\s*\([^)]*\)/g, '')}</div>
                            </td>
                            <td style="border: 1px solid #000; padding: 8px; text-align: center; vertical-align: top; font-size: 8.5pt; width: 120px;"></td>
                            <td style="border: 1px solid #000; padding: 8px; vertical-align: top;"></td>
                        </tr>
                    `;
                }

                return groups.map((g, gIdx) => {
                    const firstCol = gIdx === 0 ? `
                        <td rowspan="${groups.length}" style="border: 1px solid #000; padding: 8px; width: 150px; text-align: center; vertical-align: top; background: #fafafa;">
                            <img src="${p.image}" alt="${p.name}" style="width: 65px; height: 75px; object-fit: contain; margin-bottom: 4px;" />
                            <div style="font-weight: bold; font-size: 8.5pt;">${p.name.replace(/\s*\([^)]*\)/g, '')}</div>
                        </td>
                    ` : '';
                    const bulletList = g.bullets.length === 0 ? '' : `
                        <ul style="margin: 0; padding-left: 16px; font-size: 8.5pt; line-height: 1.5;">
                            ${g.bullets.map(b => `<li>${b}</li>`).join('')}
                        </ul>
                    `;
                    return `
                        <tr>
                            ${firstCol}
                            <td style="border: 1px solid #000; padding: 8px; text-align: center; vertical-align: top; font-size: 8.5pt; width: 120px; font-weight: bold;">
                                ${g.tanggal}
                            </td>
                            <td style="border: 1px solid #000; padding: 8px; vertical-align: top;">
                                ${bulletList}
                            </td>
                        </tr>
                    `;
                }).join('');
            }).join('');

            let pabrikRowsHtml = '';
            if (isPabrikProgressActive && pabrikPlanBlocks.length > 0) {
                pabrikRowsHtml = pabrikPlanBlocks.map(p => {
                    const groups = p.dateGroups || [];

                    if (groups.length === 0) {
                        const imgHtml = p.image ? `<img src="${p.image}" alt="${p.name}" style="width: 65px; height: 75px; object-fit: contain; margin-bottom: 4px;" />` : '';
                        return `
                            <tr>
                                <td style="border: 1px solid #000; padding: 8px; width: 150px; text-align: center; vertical-align: top; background: #fafafa;">
                                    ${imgHtml}
                                    <div style="font-weight: bold; font-size: 8.5pt;">${p.name}</div>
                                </td>
                                <td style="border: 1px solid #000; padding: 8px; text-align: center; vertical-align: top; font-size: 8.5pt; width: 120px;"></td>
                                <td style="border: 1px solid #000; padding: 8px; vertical-align: top;"></td>
                            </tr>
                        `;
                    }

                    return groups.map((g, gIdx) => {
                        const firstCol = gIdx === 0 ? `
                            <td rowspan="${groups.length}" style="border: 1px solid #000; padding: 8px; width: 150px; text-align: center; vertical-align: top; background: #fafafa;">
                                ${p.image ? `<img src="${p.image}" alt="${p.name}" style="width: 65px; height: 75px; object-fit: contain; margin-bottom: 4px;" />` : ''}
                                <div style="font-weight: bold; font-size: 8.5pt;">${p.name}</div>
                            </td>
                        ` : '';
                        const bulletList = g.bullets.length === 0 ? '' : `
                            <ul style="margin: 0; padding-left: 16px; font-size: 8.5pt; line-height: 1.5;">
                                ${g.bullets.map(b => `<li>${b}</li>`).join('')}
                            </ul>
                        `;
                        return `
                            <tr>
                                ${firstCol}
                                <td style="border: 1px solid #000; padding: 8px; text-align: center; vertical-align: top; font-size: 8.5pt; width: 120px; font-weight: bold;">
                                    ${g.tanggal}
                                </td>
                                <td style="border: 1px solid #000; padding: 8px; vertical-align: top;">
                                    ${bulletList}
                                </td>
                            </tr>
                        `;
                    }).join('');
                }).join('');
            }

            const now = new Date();
            const formattedTimestamp = `${now.getMonth() + 1}/${now.getDate()}/${String(now.getFullYear()).slice(-2)}, ${now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;

            const html = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <title></title>
                    <base href="${window.location.origin}/" />
                    <style>
                        @page { size: portrait; margin: 0; }
                        * { color: #000000 !important; font-family: Arial, sans-serif; box-sizing: border-box; }
                        html, body { margin: 0; padding: 0 6mm 18mm 6mm; font-size: 9pt; background: #ffffff; }

                        /* Outer page-frame table — creates per-page top/bottom space */
                        .page-frame, .page-frame > thead > tr > td, .page-frame > tfoot > tr > td, .page-frame > tbody > tr > td {
                            border: none !important; padding: 0; margin: 0; background: none;
                        }
                        .page-frame { width: 100%; border-collapse: collapse; }
                        .page-frame > thead { display: table-header-group; }
                        .page-frame > tfoot { display: table-footer-group; }
                        .page-top-space { height: 10mm; }
                        .page-bottom-space { height: 16mm; }

                        /* Content area padding (left/right margins) */
                        .page-content { padding: 0 12mm; }

                        /* Fixed footer — rendered in the tfoot reserved space on every page */
                        .doc-footer { position: fixed; bottom: 0; left: 0; right: 0; padding: 4px 12mm 5mm 12mm; border-top: 1px solid #ccc; font-size: 8pt; color: #444; text-align: left; background: #fff; }

                        .logo-header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 8px; }
                        .logo-header img { height: 46px; object-fit: contain; }
                        .update-label { text-align: right; font-size: 8.5pt; font-weight: bold; margin-bottom: 8px; }
                        .section-title { font-size: 9.5pt; font-weight: bold; margin: 14px 0 6px 0; background: #e2e8f0; padding: 4px 8px; border-left: 4px solid #000; display: flex; justify-content: space-between; page-break-after: avoid; break-after: avoid; }

                        /* Inner data tables */
                        .data-table { width: 100%; border-collapse: collapse; margin-bottom: 14px; font-size: 8.5pt; page-break-inside: auto; }
                        .data-table th { border: 1px solid #000; padding: 5px; background: #f1f5f9; text-align: center; font-weight: bold; }
                        .data-table td { border: 1px solid #000; padding: 4px; vertical-align: top; }
                        .data-table tr { page-break-inside: avoid; break-inside: avoid; }
                        .data-table thead { display: table-header-group; }
                        .data-table img { page-break-inside: avoid; break-inside: avoid; }
                    </style>
                </head>
                <body>
                    <!-- Outer page-frame: thead/tfoot reserve space on EVERY printed page -->
                    <table class="page-frame">
                        <thead><tr><td><div class="page-top-space"></div></td></tr></thead>
                        <tfoot><tr><td><div class="page-bottom-space"></div></td></tr></tfoot>
                        <tbody><tr><td class="page-content">

                    <div class="logo-header">
                        <div style="display: flex; align-items: center; width: 180px;">
                            <img src="/images/logo-PG.webp" alt="Petrokimia Gresik" />
                        </div>
                        <div style="flex: 1; text-align: center; font-size: 12pt; font-weight: bold; text-transform: uppercase; padding: 0 8px; line-height: 1.3;">
                            LAPORAN KEMITRAAN PRODUK PENGEMBANGAN
                        </div>
                        <div style="text-align: right; width: 180px;">
                            <div style="font-size: 10pt; font-weight: bold;">PT PETROKIMIA GRESIK</div>
                            <div style="font-size: 8pt; color: #333;">Sistem Informasi Produk Pengembangan</div>
                        </div>
                    </div>

                    <div class="update-label">Up Date: ${updateDate}</div>

                    <div class="section-title">
                        <span>A. INFORMASI PRODUKSI DAN STOK PRODUK KPP TAHUN ${rkoYear}</span>
                        <span style="font-size: 8pt; font-weight: normal; font-style: italic;">(periode: ${tableADateLabel})</span>
                    </div>
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th rowSpan="2" style="width: 25px;">No</th>
                                <th rowSpan="2">Nama Produk</th>
                                <th rowSpan="2">Bentuk</th>
                                <th rowSpan="2">Kemasan</th>
                                <th rowSpan="2">Realisasi Produksi</th>
                                <th rowSpan="2">Realisasi Pengambilan</th>
                                <th rowSpan="2">Stok Akhir</th>
                                <th rowSpan="2">Satuan</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rkoRowsHtml}
                        </tbody>
                    </table>

                    <div class="section-title">
                        <span>B. UPDATE PROGRES &amp; RANGKUMAN AKTIVITAS</span>
                        <span style="font-size: 8pt; font-weight: normal; font-style: italic;">(periode: ${startDate} s/d ${endDate})</span>
                    </div>

                    <table class="data-table">
                        <thead>
                            <tr>
                                <th style="width: 150px;">Produk</th>
                                <th style="width: 120px;">Tanggal</th>
                                <th>Hasil Rangkuman Aktivitas</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${productRowsHtml}
                        </tbody>
                    </table>

                    ${isPabrikProgressActive && pabrikPlanBlocks.length > 0 ? `
                        <div class="section-title">
                            <span>C. UPDATE PROGRES PABRIK DAN PRODUKSI</span>
                            <span style="font-size: 8pt; font-weight: normal; font-style: italic;">(periode: ${startDate} s/d ${endDate})</span>
                        </div>

                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th style="width: 150px;">Plan / Unit</th>
                                    <th style="width: 120px;">Tanggal</th>
                                    <th>Poin Aktivitas Progres</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${pabrikRowsHtml}
                            </tbody>
                        </table>
                    ` : ''}

                    <div style="font-weight: bold; margin: 12px 0 6px 0; font-size: 9pt;">Catatan Tambahan:</div>
                    <table class="data-table">
                        <tbody>
                            <tr>
                                <td style="padding: 8px; vertical-align: top;">
                                    ${catatanTambahanBullets.length === 0 ? '<div style="color: #666; font-style: italic;">Tidak ada catatan tambahan pada periode terpilih.</div>' : `
                                        <ul style="margin: 0; padding-left: 16px; font-size: 8.5pt; line-height: 1.5;">
                                            ${catatanTambahanBullets.map(b => `<li>${b}</li>`).join('')}
                                        </ul>
                                    `}
                                </td>
                            </tr>
                        </tbody>
                    </table>

                        </td></tr></tbody>
                    </table>

                    <!-- Fixed footer: appears on every page in CSS print -->
                    <div class="doc-footer">
                        <span>${formattedTimestamp}</span>
                    </div>
                </body>
                </html>
            `;

            const blob = new Blob([html], { type: 'text/html; charset=utf-8' });
            const blobUrl = URL.createObjectURL(blob);
            const printWindow = window.open(blobUrl, '_blank');
            if (!printWindow) {
                URL.revokeObjectURL(blobUrl);
                toast.error('Gagal', 'Popup terblokir oleh browser. Izinkan popup untuk mencetak PDF.');
                return;
            }
            printWindow.onload = () => {
                printWindow.print();
                URL.revokeObjectURL(blobUrl);
            };
            toast.success('Berhasil', 'Membuka dialog cetak PDF Laporan.');
        } catch (err: any) {
            console.error('Export PDF failed:', err);
            toast.error('Gagal Export PDF', err.message || 'Terjadi kesalahan saat mencetak PDF.');
        }
    };

    /* ── Export Excel (.xlsx / .xls) ── */
    const handleExportExcel = () => {
        if (!hasGenerated) {
            toast.warning('Perhatian', 'Generate laporan terlebih dahulu sebelum melakukan export Excel.');
            return;
        }
        try {
            const groupedRko = groupRkoTable(rkoTable);

            const rkoRowsHtml = groupedRko.flatMap((group, groupIdx) => {
                return group.rows.map((r, rowIdx) => `
                    <tr>
                        ${rowIdx === 0 ? `
                            <td rowspan="${group.rows.length}" align="center" valign="middle" style="border: 1px solid #000; text-align: center; vertical-align: middle;">${groupIdx + 1}</td>
                            <td rowspan="${group.rows.length}" valign="middle" style="border: 1px solid #000; font-weight: bold; vertical-align: middle;">${group.productName}</td>
                            <td rowspan="${group.rows.length}" align="center" valign="middle" style="border: 1px solid #000; text-align: center; vertical-align: middle;">${group.bentuk}</td>
                        ` : ''}
                        <td align="center" style="border: 1px solid #000; text-align: center;">${r.kemasan}</td>
                        <td align="right" style="border: 1px solid #000; text-align: right; mso-number-format:'\\#\\,\\#\\#0';">${(r.realisasiProduksi || 0).toLocaleString('id-ID')}</td>
                        <td align="right" style="border: 1px solid #000; text-align: right; mso-number-format:'\\#\\,\\#\\#0';">${(r.realisasiPengambilan || 0).toLocaleString('id-ID')}</td>
                        <td align="right" style="border: 1px solid #000; text-align: right; font-weight: bold; background-color: #ecfdf5; mso-number-format:'\\#\\,\\#\\#0';">${(r.stokAkhir || 0).toLocaleString('id-ID')}</td>
                        ${rowIdx === 0 ? `
                            <td rowspan="${group.rows.length}" align="center" valign="middle" style="border: 1px solid #000; text-align: center; vertical-align: middle;">${group.satuan}</td>
                        ` : ''}
                    </tr>
                `);
            }).join('');

            const productRowsHtml = productBlocks.map(p => {
                const groups = p.dateGroups || [];

                if (groups.length === 0) {
                    return `
                        <tr>
                            <td style="border: 1px solid #000; padding: 8px; width: 160px; text-align: center; vertical-align: top; background-color: #fafafa;">
                                <img src="${p.image}" alt="${p.name}" width="55" height="65" style="object-fit: contain; margin-bottom: 4px;" /><br/>
                                <b>${p.name.replace(/\s*\([^)]*\)/g, '')}</b>
                            </td>
                            <td style="border: 1px solid #000; padding: 8px; text-align: center; vertical-align: top; width: 120px; font-weight: bold;">-</td>
                            <td colSpan="6" style="border: 1px solid #000; padding: 8px; vertical-align: top; font-style: italic; color: #666;">Tidak ada aktivitas harian pada periode terpilih.</td>
                        </tr>
                    `;
                }

                return groups.map((g, gIdx) => {
                    const firstCol = gIdx === 0 ? `
                        <td rowspan="${groups.length}" style="border: 1px solid #000; padding: 8px; width: 160px; text-align: center; vertical-align: top; background-color: #fafafa;">
                            <img src="${p.image}" alt="${p.name}" width="55" height="65" style="object-fit: contain; margin-bottom: 4px;" /><br/>
                            <b>${p.name.replace(/\s*\([^)]*\)/g, '')}</b>
                        </td>
                    ` : '';
                    const bulletList = g.bullets.length === 0 ? '<i style="color:#888;">Belum ada aktivitas.</i>' : `
                        <ul style="margin: 0; padding-left: 16px; line-height: 1.5;">
                            ${g.bullets.map(b => `<li>${b}</li>`).join('')}
                        </ul>
                    `;
                    return `
                        <tr>
                            ${firstCol}
                            <td style="border: 1px solid #000; padding: 8px; text-align: center; vertical-align: top; width: 120px; font-weight: bold;">
                                ${g.tanggal}
                            </td>
                            <td colSpan="6" style="border: 1px solid #000; padding: 8px; vertical-align: top;">
                                ${bulletList}
                            </td>
                        </tr>
                    `;
                }).join('');
            }).join('');

            let pabrikRowsHtml = '';
            if (isPabrikProgressActive && pabrikPlanBlocks.length > 0) {
                pabrikRowsHtml = pabrikPlanBlocks.map(p => {
                    const groups = p.dateGroups || [];

                    if (groups.length === 0) {
                        const imgHtml = p.image ? `<img src="${p.image}" alt="${p.name}" width="55" height="65" style="object-fit: contain; margin-bottom: 4px;" /><br/>` : '';
                        return `
                            <tr>
                                <td style="border: 1px solid #000; padding: 8px; width: 160px; text-align: center; vertical-align: top; background-color: #fafafa;">
                                    ${imgHtml}
                                    <b>${p.name}</b>
                                </td>
                                <td style="border: 1px solid #000; padding: 8px; text-align: center; vertical-align: top; width: 120px; font-weight: bold;">-</td>
                                <td colSpan="6" style="border: 1px solid #000; padding: 8px; vertical-align: top; font-style: italic; color: #666;">Tidak ada poin aktivitas.</td>
                            </tr>
                        `;
                    }

                    return groups.map((g, gIdx) => {
                        const firstCol = gIdx === 0 ? `
                            <td rowspan="${groups.length}" style="border: 1px solid #000; padding: 8px; width: 160px; text-align: center; vertical-align: top; background-color: #fafafa;">
                                ${p.image ? `<img src="${p.image}" alt="${p.name}" width="55" height="65" style="object-fit: contain; margin-bottom: 4px;" /><br/>` : ''}
                                <b>${p.name}</b>
                            </td>
                        ` : '';
                        const bulletList = g.bullets.length === 0 ? '<i style="color:#888;">Belum ada aktivitas.</i>' : `
                            <ul style="margin: 0; padding-left: 16px; line-height: 1.5;">
                                ${g.bullets.map(b => `<li>${b}</li>`).join('')}
                            </ul>
                        `;
                        return `
                            <tr>
                                ${firstCol}
                                <td style="border: 1px solid #000; padding: 8px; text-align: center; vertical-align: top; width: 120px; font-weight: bold;">
                                    ${g.tanggal}
                                </td>
                                <td colSpan="6" style="border: 1px solid #000; padding: 8px; vertical-align: top;">
                                    ${bulletList}
                                </td>
                            </tr>
                        `;
                    }).join('');
                }).join('');
            }

            const origin = typeof window !== 'undefined' ? window.location.origin : '';
            const logoUrl = `${origin}/images/logo-PG.webp`;

            const excelHtml = `
                <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
                <head>
                    <meta charset="utf-8">
                    <!--[if gte mso 9]>
                    <xml>
                     <x:ExcelWorkbook>
                      <x:ExcelWorksheets>
                       <x:ExcelWorksheet>
                        <x:Name>Laporan KPP</x:Name>
                        <x:WorksheetOptions>
                         <x:DisplayGridlines/>
                        </x:WorksheetOptions>
                       </x:ExcelWorksheet>
                      </x:ExcelWorksheets>
                     </x:ExcelWorkbook>
                    </xml>
                    <![endif]-->
                    <style>
                        body { font-family: Arial, sans-serif; font-size: 9pt; color: #000000; }
                        table { width: 100%; border-collapse: collapse; margin-bottom: 14px; font-size: 8.5pt; }
                        th { border: 1px solid #000000; padding: 6px; background-color: #f1f5f9; text-align: center; font-weight: bold; }
                        td { border: 1px solid #000000; padding: 5px; vertical-align: top; }
                        .section-title { font-size: 9.5pt; font-weight: bold; background-color: #e2e8f0; padding: 6px; border: 1px solid #000000; }
                        .doc-title { text-align: center; font-size: 12pt; font-weight: bold; text-transform: uppercase; margin: 10px 0; }
                    </style>
                </head>
                <body>
                    <table style="border: none; margin-bottom: 10px;">
                        <tr>
                            <td style="border: none; vertical-align: middle;">
                                <img src="${logoUrl}" alt="Petrokimia Gresik" height="42" />
                            </td>
                            <td style="border: none; text-align: right; vertical-align: middle;" colSpan="7">
                                <div style="font-size: 11pt; font-weight: bold;">PT PETROKIMIA GRESIK</div>
                                <div style="font-size: 8.5pt; color: #333333;">Sistem Informasi Produk Pengembangan</div>
                            </td>
                        </tr>
                    </table>

                    <div class="doc-title">LAPORAN KEMITRAAN PRODUK PENGEMBANGAN</div>
                    <div style="text-align: right; font-weight: bold; font-size: 8.5pt; margin-bottom: 8px;">Up Date: ${updateDate || '-'}</div>

                    <table style="border: none; margin-bottom: 4px;">
                        <tr>
                            <td class="section-title" colSpan="8">
                                A. INFORMASI PRODUKSI DAN STOK PRODUK KPP TAHUN ${rkoYear} <i style="font-weight: normal; font-size: 8pt;">(periode: ${tableADateLabel})</i>
                            </td>
                        </tr>
                    </table>
                    <table>
                        <thead>
                            <tr>
                                <th rowSpan="2" style="width: 35px;">No</th>
                                <th rowSpan="2" style="width: 160px;">Nama Produk</th>
                                <th rowSpan="2" style="width: 80px;">Bentuk</th>
                                <th rowSpan="2" style="width: 80px;">Kemasan</th>
                                <th rowSpan="2" style="width: 120px;">Realisasi Produksi</th>
                                <th rowSpan="2" style="width: 130px;">Realisasi Pengambilan</th>
                                <th rowSpan="2" style="width: 100px;">Stok Akhir</th>
                                <th rowSpan="2" style="width: 80px;">Satuan</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rkoRowsHtml}
                        </tbody>
                    </table>

                    <table style="border: none; margin-top: 12px; margin-bottom: 4px;">
                        <tr>
                            <td class="section-title" colSpan="8">
                                B. UPDATE PROGRES & RANGKUMAN AKTIVITAS <i style="font-weight: normal; font-size: 8pt;">(periode: ${startDate || '-'} s/d ${endDate || '-'})</i>
                            </td>
                        </tr>
                    </table>
                    <table>
                        <thead>
                            <tr>
                                <th style="width: 160px;">Produk</th>
                                <th style="width: 120px;">Tanggal</th>
                                <th colSpan="6">Hasil Rangkuman Aktivitas</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${productRowsHtml}
                        </tbody>
                    </table>

                    ${isPabrikProgressActive && pabrikPlanBlocks.length > 0 ? `
                        <table style="border: none; margin-top: 12px; margin-bottom: 4px;">
                            <tr>
                                <td class="section-title" colSpan="8">
                                    C. UPDATE PROGRES PABRIK DAN PRODUKSI <i style="font-weight: normal; font-size: 8pt;">(periode: ${startDate || '-'} s/d ${endDate || '-'})</i>
                                </td>
                            </tr>
                        </table>
                        <table>
                            <thead>
                                <tr>
                                    <th style="width: 160px;">Plan / Unit</th>
                                    <th style="width: 120px;">Tanggal</th>
                                    <th colSpan="6">Poin Aktivitas Progres</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${pabrikRowsHtml}
                            </tbody>
                        </table>
                    ` : ''}

                    <div style="font-weight: bold; margin: 12px 0 4px 0; font-size: 9pt;">Catatan Tambahan:</div>
                    <table>
                        <tbody>
                            <tr>
                                <td colSpan="8" style="padding: 8px; vertical-align: top;">
                                    ${catatanTambahanBullets.length === 0 ? '<div style="color: #666; font-style: italic;">Tidak ada catatan tambahan pada periode terpilih.</div>' : `
                                        <ul style="margin: 0; padding-left: 16px; font-size: 8.5pt; line-height: 1.5;">
                                            ${catatanTambahanBullets.map(b => `<li>${b}</li>`).join('')}
                                        </ul>
                                    `}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </body>
                </html>
            `;

            const blob = new Blob([excelHtml], { type: 'application/vnd.ms-excel;charset=utf-8' });
            const fileNameDate = updateDate ? updateDate.replace(/[/\\?%*:|"<>]/g, '-') : 'Terbaru';
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Laporan_Kemitraan_Produk_Pengembangan_${fileNameDate}.xls`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            toast.success('Berhasil Export Excel', 'File Excel dengan format rapi berhasil diunduh.');
        } catch (err: any) {
            console.error('Export Excel failed:', err);
            toast.error('Gagal Export Excel', err.message || 'Terjadi kesalahan saat mengekspor Excel.');
        }
    };

    return (
        <div className="space-y-6 pb-12">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-gray-400">
                <span className="text-gray-500">Dashboard</span>
                <span>/</span>
                <span className="text-gray-500">Produk Pengembangan</span>
                <span>/</span>
                <span className="text-gray-800 font-medium">Template Laporan</span>
            </div>

            {/* Title & Toolbar */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
                        Template Laporan AI
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Generate & rangkum laporan mingguan produk pengembangan berbasis AI
                    </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <AppButton
                        variant="secondary"
                        onClick={() => setIsSaveDraftModalOpen(true)}
                        icon={<Bookmark className="size-4 text-emerald-600" />}
                        title="Simpan versi draft laporan saat ini"
                    >
                        Simpan Draft
                    </AppButton>
                    <AppButton
                        variant="secondary"
                        onClick={() => setIsHistoryDrawerOpen(true)}
                        icon={<History className="size-4 text-slate-700" />}
                        title="Buka Histori Versi Laporan"
                    >
                        Histori Versi
                        {versions.length > 0 && (
                            <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-emerald-600 text-white rounded-full font-bold">
                                {versions.length}
                            </span>
                        )}
                    </AppButton>
                    <AppButton
                        variant="secondary"
                        onClick={handleResetDraft}
                        icon={<RotateCcw className="size-4 text-gray-600" />}
                        title="Reset editan draft lokal dan kembalikan ke kondisi awal"
                    >
                        Reset Draft
                    </AppButton>
                    <AppButton
                        variant="secondary"
                        onClick={handleExportPDF}
                        disabled={!hasGenerated}
                        icon={<Download className="size-4 text-red-600" />}
                    >
                        Export PDF
                    </AppButton>
                    <AppButton
                        variant="secondary"
                        onClick={handleExportExcel}
                        disabled={!hasGenerated}
                        icon={<FileSpreadsheet className="size-4 text-emerald-600" />}
                    >
                        Export Excel
                    </AppButton>
                    <AppButton
                        variant="primary"
                        onClick={handleGenerate}
                        disabled={generating}
                        icon={<Sparkles className={`size-4 ${generating ? 'animate-spin' : ''}`} />}
                    >
                        {generating ? 'Merangkum AI...' : 'Generate Laporan AI'}
                    </AppButton>
                </div>
            </div>

            {/* Filter Controls Card */}
            <div className="bg-white border border-gray-200 p-5 space-y-4">
                <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2 border-b pb-2">
                    Pengaturan & Parameter Rangkuman AI
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Start Date */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">
                            Tanggal Mulai Aktivitas
                        </label>
                        <div className="relative">
                            <input
                                type="text"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                placeholder="DD/MM/YYYY"
                                className="w-full text-xs h-9 pl-3 pr-10 border border-gray-300 rounded focus:ring-1 focus:ring-emerald-500 outline-none font-medium"
                            />
                            <button
                                type="button"
                                onClick={() => startDatePickerRef.current?.showPicker()}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-emerald-600 focus:outline-none cursor-pointer"
                            >
                                <Calendar className="size-4" />
                            </button>
                            <input
                                ref={startDatePickerRef}
                                type="date"
                                className="absolute inset-0 opacity-0 pointer-events-none"
                                onChange={(e) => {
                                    if (e.target.value) {
                                        const parts = e.target.value.split('-');
                                        if (parts.length === 3) {
                                            setStartDate(`${parts[2]}/${parts[1]}/${parts[0]}`);
                                        }
                                    }
                                }}
                            />
                        </div>
                    </div>

                    {/* End Date */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">
                            Tanggal Akhir Aktivitas
                        </label>
                        <div className="relative">
                            <input
                                type="text"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                placeholder="DD/MM/YYYY"
                                className="w-full text-xs h-9 pl-3 pr-10 border border-gray-300 rounded focus:ring-1 focus:ring-emerald-500 outline-none font-medium"
                            />
                            <button
                                type="button"
                                onClick={() => endDatePickerRef.current?.showPicker()}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-emerald-600 focus:outline-none cursor-pointer"
                            >
                                <Calendar className="size-4" />
                            </button>
                            <input
                                ref={endDatePickerRef}
                                type="date"
                                className="absolute inset-0 opacity-0 pointer-events-none"
                                onChange={(e) => {
                                    if (e.target.value) {
                                        const parts = e.target.value.split('-');
                                        if (parts.length === 3) {
                                            setEndDate(`${parts[2]}/${parts[1]}/${parts[0]}`);
                                        }
                                    }
                                }}
                            />
                        </div>
                    </div>

                    {/* Year RKO */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">
                            Tahun Realisasi RKO
                        </label>
                        <input
                            type="number"
                            value={rkoYear}
                            onChange={(e) => setRkoYear(parseInt(e.target.value) || new Date().getFullYear())}
                            className="w-full text-xs h-9 px-3 border border-gray-300 rounded focus:ring-1 focus:ring-emerald-500 outline-none font-medium"
                        />
                    </div>

                    {/* Update Date */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">
                            Label Up Date Laporan
                        </label>
                        <input
                            type="text"
                            value={updateDate}
                            onChange={(e) => setUpdateDate(e.target.value)}
                            placeholder="DD/MM/YYYY"
                            className="w-full text-xs h-9 px-3 border border-gray-300 rounded focus:ring-1 focus:ring-emerald-500 outline-none font-medium"
                        />
                    </div>
                </div>
            </div>

            {/* Editable & Interactive Document Preview */}
            {!hasGenerated ? (
                <div className="bg-white border border-dashed border-gray-300 rounded-lg p-12 text-center max-w-5xl mx-auto shadow-xs flex flex-col items-center justify-center">
                    <Sparkles className="size-12 mb-3 text-emerald-600 opacity-40 animate-pulse" />
                    <h3 className="text-base font-bold text-gray-800">Preview Laporan Belum Digenerate</h3>
                    <p className="text-xs text-gray-500 mt-1 max-w-md">
                        Tentukan parameter rentang tanggal aktivitas harian di atas, lalu klik tombol <strong className="text-emerald-700">&quot;Generate Laporan AI&quot;</strong> untuk membuat rangkuman otomatis.
                    </p>
                </div>
            ) : (
                <div className="bg-white border border-gray-300 rounded-lg p-6 sm:p-8 shadow-md space-y-6 max-w-5xl mx-auto">
                    {/* Header Logo */}
                    <div className="flex items-center justify-between border-b-2 border-gray-900 pb-3">
                        <div className="flex items-center gap-3">
                            <img src="/images/logo-PG.webp" alt="Petrokimia Gresik" className="h-12 object-contain" />
                        </div>
                        <div className="text-right">
                            <h2 className="text-base font-bold text-gray-900 leading-tight">PT PETROKIMIA GRESIK</h2>
                            <p className="text-xs text-gray-600 font-medium">Sistem Informasi Produk Pengembangan</p>
                        </div>
                    </div>

                    {/* Title */}
                    <div className="text-center space-y-1">
                        <h2 className="text-lg sm:text-xl font-black text-gray-900 tracking-wide uppercase">
                            LAPORAN KEMITRAAN PRODUK PENGEMBANGAN
                        </h2>
                        <div className="text-right text-xs font-bold text-gray-700">
                            Up Date: <input
                                type="text"
                                value={updateDate}
                                onChange={(e) => setUpdateDate(e.target.value)}
                                className="w-28 text-right font-bold border-b border-gray-400 outline-none focus:border-emerald-600 px-1"
                            />
                        </div>
                    </div>

                    {/* Section A: RKO Table */}
                    <div className="space-y-2">
                        <h3 className="text-xs sm:text-sm font-bold text-gray-900 bg-gray-100 px-3 py-1.5 border-l-4 border-emerald-600 uppercase flex items-center justify-between">
                            <span>A. Informasi Produksi dan Stok Produk KPP Tahun {rkoYear}</span>
                            <span className="text-[10px] text-emerald-700 font-normal italic lowercase">(periode: {tableADateLabel})</span>
                        </h3>

                        <div className="overflow-x-auto">
                            <table className="w-full text-xs border-collapse border border-gray-300">
                                <thead>
                                    <tr className="bg-gray-100 text-gray-800 uppercase font-bold text-center">
                                        <th className="border border-gray-300 px-2 py-2 w-8">No</th>
                                        <th className="border border-gray-300 px-3 py-2 text-left">Nama Produk</th>
                                        <th className="border border-gray-300 px-2 py-2 w-16">Bentuk</th>
                                        <th className="border border-gray-300 px-2 py-2 w-20">Kemasan</th>
                                        <th className="border border-gray-300 px-3 py-2">Realisasi Produksi</th>
                                        <th className="border border-gray-300 px-3 py-2">Realisasi Pengambilan</th>
                                        <th className="border border-gray-300 px-3 py-2 bg-emerald-50">Stok Akhir</th>
                                        <th className="border border-gray-300 px-2 py-2 w-16">Satuan</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {groupRkoTable(rkoTable).flatMap((group, groupIdx) => {
                                        return group.rows.map((row, rowIdx) => {
                                            const globalRowIdx = group.originalIndices[rowIdx];
                                            return (
                                                <tr key={`${groupIdx}-${rowIdx}`} className="hover:bg-gray-50">
                                                    {rowIdx === 0 && (
                                                        <>
                                                            <td
                                                                rowSpan={group.rows.length}
                                                                className="border border-gray-300 text-center py-1 font-medium align-middle bg-white"
                                                            >
                                                                {groupIdx + 1}
                                                            </td>
                                                            <td
                                                                rowSpan={group.rows.length}
                                                                className="border border-gray-300 px-2 py-1 font-bold align-middle bg-white"
                                                            >
                                                                {group.productName}
                                                            </td>
                                                            <td
                                                                rowSpan={group.rows.length}
                                                                className="border border-gray-300 text-center py-1 font-semibold align-middle bg-white"
                                                            >
                                                                {group.bentuk}
                                                            </td>
                                                        </>
                                                    )}
                                                     <td className="border border-gray-300 p-0">
                                                         <input
                                                             type="text"
                                                             value={row.kemasan}
                                                             onChange={(e) => handleRkoChange(globalRowIdx, 'kemasan', e.target.value)}
                                                             className="w-full text-center px-2 py-1 outline-none font-semibold focus:bg-emerald-50 text-xs"
                                                             placeholder="-"
                                                         />
                                                     </td>
                                                    <td className="border border-gray-300 p-0">
                                                        <input
                                                            type="number"
                                                            value={row.realisasiProduksi}
                                                            onChange={(e) => handleRkoChange(globalRowIdx, 'realisasiProduksi', parseFloat(e.target.value) || 0)}
                                                            className="w-full text-right px-2 py-1 outline-none font-medium focus:bg-emerald-50"
                                                        />
                                                    </td>
                                                    <td className="border border-gray-300 p-0">
                                                        <input
                                                            type="number"
                                                            value={row.realisasiPengambilan}
                                                            onChange={(e) => handleRkoChange(globalRowIdx, 'realisasiPengambilan', parseFloat(e.target.value) || 0)}
                                                            className="w-full text-right px-2 py-1 outline-none font-medium focus:bg-emerald-50"
                                                        />
                                                    </td>
                                                    <td className="border border-gray-300 p-0 bg-emerald-50/50">
                                                        <input
                                                            type="number"
                                                            value={row.stokAkhir}
                                                            onChange={(e) => handleRkoChange(globalRowIdx, 'stokAkhir', parseFloat(e.target.value) || 0)}
                                                            className="w-full text-right px-2 py-1 outline-none font-bold text-emerald-900 bg-transparent focus:bg-emerald-100"
                                                        />
                                                    </td>
                                                    {rowIdx === 0 && (
                                                        <td
                                                            rowSpan={group.rows.length}
                                                            className="border border-gray-300 text-center py-1 align-middle bg-white"
                                                        >
                                                            {group.satuan}
                                                        </td>
                                                    )}
                                                </tr>
                                            );
                                        });
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Section B: Update Progres Pabrik dan Produk */}
                    <div className="space-y-4 pt-2">
                        <h3 className="text-xs sm:text-sm font-bold text-gray-900 bg-gray-100 px-3 py-1.5 border-l-4 border-emerald-600 uppercase flex items-center justify-between">
                            <span>B. Update Progres & Rangkuman Aktivitas</span>
                            <span className="text-[10px] text-emerald-700 font-normal italic lowercase">(periode: {startDate} s/d {endDate})</span>
                        </h3>

                        {/* Structured Table for Summarized Product Activities */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h4 className="text-xs font-bold text-gray-800">Tabel Rangkuman Aktivitas Per Produk:</h4>
                                <button
                                    onClick={() => setIsAddProductModalOpen(true)}
                                    className="text-xs text-emerald-700 font-semibold flex items-center gap-1 hover:underline cursor-pointer bg-emerald-50 px-2 py-1 rounded border border-emerald-200"
                                >
                                    <Plus className="size-3.5" /> Tambah Produk
                                </button>
                            </div>
                            <div className="overflow-x-auto border border-gray-300 rounded-lg">
                                <table className="w-full text-xs border-collapse">
                                    <thead>
                                        <tr className="bg-gray-100 text-gray-900 font-bold uppercase border-b border-gray-300">
                                            <th className="px-4 py-2.5 text-left w-52 border-r border-gray-300">Produk</th>
                                            <th className="px-4 py-2.5 text-center w-36 border-r border-gray-300">Tanggal</th>
                                            <th className="px-4 py-2.5 text-left">Hasil Rangkuman Aktivitas</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {productBlocks.length === 0 ? (
                                            <tr>
                                                <td colSpan={3} className="px-4 py-8 text-center text-gray-400 text-xs italic">
                                                    Semua produk telah dihapus dari rangkuman. Klik tombol <strong className="text-emerald-700">&quot;+ Tambah Produk&quot;</strong> di atas untuk menambahkan produk kembali.
                                                </td>
                                            </tr>
                                        ) : (
                                            productBlocks.map((block) => {
                                                const groups = block.dateGroups || [];

                                                if (groups.length === 0) {
                                                    return (
                                                        <tr key={block.id} className="hover:bg-gray-50/60">
                                                            <td className="px-4 py-3 border-r border-gray-300 bg-gray-50/40 align-top">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-12 h-14 flex-shrink-0 bg-white rounded border border-gray-200 p-1 flex items-center justify-center">
                                                                        <img src={block.image} alt={block.name} className="w-full h-full object-contain" />
                                                                    </div>
                                                                    <div>
                                                                        <div className="font-bold text-gray-900 text-xs">{block.name.replace(/\s*\([^)]*\)/g, '')}</div>
                                                                        <div className="flex items-center gap-2 mt-1">
                                                                            <button
                                                                                onClick={() => handleAddDateGroup(block.id)}
                                                                                className="text-[10px] text-emerald-700 font-semibold flex items-center gap-0.5 hover:underline cursor-pointer"
                                                                            >
                                                                                <Plus className="size-3" /> Tambah Tanggal
                                                                            </button>
                                                                            <button
                                                                                onClick={() => handleDeleteProductBlock(block.id)}
                                                                                className="text-[10px] text-red-600 font-semibold flex items-center gap-0.5 hover:underline cursor-pointer"
                                                                                title="Hapus produk ini dari tabel"
                                                                            >
                                                                                <Trash2 className="size-3" /> Hapus Produk
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="px-3 py-3 border-r border-gray-300 bg-gray-50/20 align-top text-center text-xs text-gray-400 italic">
                                                                {startDate} s/d {endDate}
                                                            </td>
                                                            <td className="px-4 py-3 align-top text-xs text-gray-400 italic">
                                                                Tidak ada aktivitas harian pada periode terpilih.
                                                            </td>
                                                        </tr>
                                                    );
                                                }

                                                return groups.map((group, groupIdx) => (
                                                    <tr key={group.id} className="border-b border-gray-200 hover:bg-gray-50/60">
                                                        {groupIdx === 0 && (
                                                            <td
                                                                rowSpan={groups.length}
                                                                className="px-4 py-3 border-r border-gray-300 bg-gray-50/40 align-top"
                                                            >
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-12 h-14 flex-shrink-0 bg-white rounded border border-gray-200 p-1 flex items-center justify-center">
                                                                        <img src={block.image} alt={block.name} className="w-full h-full object-contain" />
                                                                    </div>
                                                                    <div>
                                                                        <div className="font-bold text-gray-900 text-xs">{block.name.replace(/\s*\([^)]*\)/g, '')}</div>
                                                                        <div className="flex items-center gap-2 mt-1">
                                                                            <button
                                                                                onClick={() => handleAddDateGroup(block.id)}
                                                                                className="text-[10px] text-emerald-700 font-semibold flex items-center gap-0.5 hover:underline cursor-pointer"
                                                                            >
                                                                                <Plus className="size-3" /> Tambah Tanggal
                                                                            </button>
                                                                            <button
                                                                                onClick={() => handleDeleteProductBlock(block.id)}
                                                                                className="text-[10px] text-red-600 font-semibold flex items-center gap-0.5 hover:underline cursor-pointer"
                                                                                title="Hapus produk ini dari tabel"
                                                                            >
                                                                                <Trash2 className="size-3" /> Hapus Produk
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                        )}

                                                        <td className="px-3 py-3 border-r border-gray-300 bg-gray-50/20 align-top w-36">
                                                            <input
                                                                type="text"
                                                                value={group.tanggal}
                                                                onChange={(e) => handleDateGroupChange(block.id, group.id, 'tanggal', e.target.value)}
                                                                className="w-full text-center font-bold text-gray-800 text-xs bg-transparent outline-none focus:bg-white rounded px-1 py-0.5 border-b border-transparent focus:border-emerald-500"
                                                            />
                                                        </td>

                                                        <td className="px-4 py-3 align-top">
                                                            <div className="space-y-1.5">
                                                                {group.bullets.length === 0 ? (
                                                                    <span className="text-gray-400 italic text-xs">Belum ada poin aktivitas pada tanggal ini.</span>
                                                                ) : (
                                                                    <ul className="list-disc list-outside ml-4 space-y-1.5 text-xs text-gray-800">
                                                                        {group.bullets.map((bullet, bIdx) => (
                                                                            <li key={bIdx} className="group relative">
                                                                                <div className="flex items-center gap-1.5">
                                                                                    <input
                                                                                        type="text"
                                                                                        value={bullet}
                                                                                        onChange={(e) => handleBulletChange(block.id, group.id, bIdx, e.target.value)}
                                                                                        className="w-full bg-transparent outline-none focus:bg-emerald-50/60 rounded px-1.5 py-0.5 border-b border-transparent focus:border-emerald-500 text-xs"
                                                                                    />
                                                                                    <button
                                                                                        onClick={() => handleDeleteBullet(block.id, group.id, bIdx)}
                                                                                        className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-600 transition-opacity p-0.5 cursor-pointer"
                                                                                        title="Hapus Poin"
                                                                                    >
                                                                                        <Trash2 className="size-3.5" />
                                                                                    </button>
                                                                                </div>
                                                                            </li>
                                                                        ))}
                                                                    </ul>
                                                                )}

                                                                <div className="pt-1 flex items-center gap-3">
                                                                    <button
                                                                        onClick={() => handleAddBulletToGroup(block.id, group.id)}
                                                                        className="text-[10px] text-emerald-700 font-semibold flex items-center gap-0.5 hover:underline cursor-pointer"
                                                                    >
                                                                        <Plus className="size-3" /> Tambah Poin
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleDeleteDateGroup(block.id, group.id)}
                                                                        className="text-[10px] text-red-600 font-semibold flex items-center gap-0.5 hover:underline cursor-pointer"
                                                                        title="Hapus baris tanggal ini"
                                                                    >
                                                                        <Trash2 className="size-3" /> Hapus Tanggal
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ));
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Section C: Update Progres Pabrik dan Produksi (Opsional) */}
                        <div className="pt-4 border-t border-gray-200 space-y-3">
                            <div className="flex items-center justify-between bg-slate-100 px-3 py-2 border-l-4 border-slate-700 rounded-xs">
                                <div className="flex items-center gap-2">
                                    <h3 className="text-xs sm:text-sm font-bold text-gray-900 uppercase">
                                        C. UPDATE PROGRES PABRIK DAN PRODUKSI <span className="text-[11px] font-normal text-gray-500 lowercase">(opsional)</span>
                                    </h3>
                                </div>
                                <button
                                    onClick={() => setIsPabrikProgressActive(!isPabrikProgressActive)}
                                    className={`text-xs font-semibold px-3 py-1 rounded transition-colors cursor-pointer flex items-center gap-1.5 ${
                                        isPabrikProgressActive
                                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                            : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs'
                                    }`}
                                >
                                    <Plus className={`size-3.5 ${isPabrikProgressActive ? 'rotate-45 text-red-600' : ''}`} />
                                    {isPabrikProgressActive ? 'Sembunyikan Bagian Ini' : '+ Tambah Update Progres Pabrik'}
                                </button>
                            </div>

                            {isPabrikProgressActive && (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between pt-1">
                                        <p className="text-xs text-gray-500">
                                            Tabel update progres fisik pabrik/produksi (Upload gambar plan lokal, nama plan, tanggal & poin aktivitas):
                                        </p>
                                        <button
                                            onClick={handleAddPabrikPlanBlock}
                                            className="text-xs bg-emerald-600 text-white font-semibold px-3 py-1 rounded hover:bg-emerald-700 transition-colors flex items-center gap-1 cursor-pointer shadow-xs"
                                        >
                                            <Plus className="size-3.5" /> Tambah Plan Baru
                                        </button>
                                    </div>

                                    <div className="border border-gray-300 rounded-lg overflow-hidden bg-white shadow-xs">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="bg-gray-100 text-gray-700 text-xs font-bold border-b border-gray-300">
                                                    <th className="px-4 py-2.5 w-48">Kolom Plan (Gambar & Nama)</th>
                                                    <th className="px-4 py-2.5 w-36">Kolom Tanggal</th>
                                                    <th className="px-4 py-2.5">Kolom Poin Aktivitas</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200 text-xs">
                                                {pabrikPlanBlocks.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={3} className="text-center py-6 text-gray-400 italic">
                                                            Belum ada plan pabrik. Klik &quot;+ Tambah Plan Baru&quot; untuk menambahkan unit plan.
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    pabrikPlanBlocks.map(plan => {
                                                        const groups = plan.dateGroups || [];

                                                        if (groups.length === 0) {
                                                            return (
                                                                <tr key={plan.id} className="hover:bg-gray-50/60">
                                                                    <td className="px-4 py-3 border-r border-gray-300 bg-gray-50/40 align-top w-48">
                                                                        <div className="flex flex-col items-center gap-2">
                                                                            <div className="relative group w-20 h-24 bg-gray-100 border border-dashed border-gray-300 rounded flex items-center justify-center overflow-hidden">
                                                                                {plan.image ? (
                                                                                    <img src={plan.image} alt={plan.name} className="w-full h-full object-contain p-1" />
                                                                                ) : (
                                                                                    <div className="flex flex-col items-center justify-center text-gray-400 p-1 text-center">
                                                                                        <ImageIcon className="size-6 mb-1" />
                                                                                        <span className="text-[9px]">Belum ada gambar</span>
                                                                                    </div>
                                                                                )}
                                                                                <label className="absolute inset-0 bg-black/60 text-white opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center cursor-pointer transition-opacity text-[10px] font-medium p-1 text-center">
                                                                                    <Upload className="size-4 mb-0.5" />
                                                                                    <span>Upload Gambar</span>
                                                                                    <input
                                                                                        type="file"
                                                                                        accept="image/*"
                                                                                        className="hidden"
                                                                                        onChange={(e) => {
                                                                                            if (e.target.files?.[0]) {
                                                                                                handlePabrikPlanImageUpload(plan.id, e.target.files[0]);
                                                                                            }
                                                                                        }}
                                                                                    />
                                                                                </label>
                                                                            </div>
                                                                            <input
                                                                                type="text"
                                                                                value={plan.name}
                                                                                onChange={(e) => handlePabrikPlanNameChange(plan.id, e.target.value)}
                                                                                placeholder="Nama Plan..."
                                                                                className="w-full text-center font-bold text-gray-800 text-xs border-b border-gray-300 outline-none focus:border-emerald-600 px-1 py-0.5 bg-white rounded"
                                                                            />
                                                                            <div className="flex items-center gap-2 pt-1">
                                                                                <button
                                                                                    onClick={() => handleAddPabrikDateGroup(plan.id)}
                                                                                    className="text-[10px] text-emerald-700 font-semibold flex items-center gap-0.5 hover:underline cursor-pointer"
                                                                                >
                                                                                    <Plus className="size-3" /> Tambah Tanggal
                                                                                </button>
                                                                                <button
                                                                                    onClick={() => handleDeletePabrikPlanBlock(plan.id)}
                                                                                    className="text-[10px] text-red-600 font-semibold flex items-center gap-0.5 hover:underline cursor-pointer"
                                                                                >
                                                                                    <Trash2 className="size-3" /> Hapus Plan
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-3 py-3 border-r border-gray-300 align-top text-center text-gray-400 italic">
                                                                        Tidak ada tanggal.
                                                                    </td>
                                                                    <td className="px-4 py-3 align-top">
                                                                        <button
                                                                            onClick={() => handleAddPabrikDateGroup(plan.id)}
                                                                            className="text-xs text-emerald-700 font-semibold flex items-center gap-0.5 hover:underline cursor-pointer"
                                                                        >
                                                                            <Plus className="size-3" /> Tambah Tanggal
                                                                        </button>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        }

                                                        return groups.map((group, gIdx) => (
                                                            <tr key={group.id} className="border-b border-gray-200 hover:bg-gray-50/60">
                                                                {gIdx === 0 && (
                                                                    <td rowSpan={groups.length} className="px-4 py-3 border-r border-gray-300 bg-gray-50/40 align-top w-48">
                                                                        <div className="flex flex-col items-center gap-2">
                                                                            <div className="relative group w-20 h-24 bg-gray-100 border border-dashed border-gray-300 rounded flex items-center justify-center overflow-hidden">
                                                                                {plan.image ? (
                                                                                    <img src={plan.image} alt={plan.name} className="w-full h-full object-contain p-1" />
                                                                                ) : (
                                                                                    <div className="flex flex-col items-center justify-center text-gray-400 p-1 text-center">
                                                                                        <ImageIcon className="size-6 mb-1" />
                                                                                        <span className="text-[9px]">Belum ada gambar</span>
                                                                                    </div>
                                                                                )}
                                                                                <label className="absolute inset-0 bg-black/60 text-white opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center cursor-pointer transition-opacity text-[10px] font-medium p-1 text-center">
                                                                                    <Upload className="size-4 mb-0.5" />
                                                                                    <span>Upload Gambar</span>
                                                                                    <input
                                                                                        type="file"
                                                                                        accept="image/*"
                                                                                        className="hidden"
                                                                                        onChange={(e) => {
                                                                                            if (e.target.files?.[0]) {
                                                                                                handlePabrikPlanImageUpload(plan.id, e.target.files[0]);
                                                                                            }
                                                                                        }}
                                                                                    />
                                                                                </label>
                                                                            </div>

                                                                            <input
                                                                                type="text"
                                                                                value={plan.name}
                                                                                onChange={(e) => handlePabrikPlanNameChange(plan.id, e.target.value)}
                                                                                placeholder="Nama Plan..."
                                                                                className="w-full text-center font-bold text-gray-800 text-xs border-b border-gray-300 outline-none focus:border-emerald-600 px-1 py-0.5 bg-white rounded"
                                                                            />

                                                                            <div className="flex items-center gap-2 pt-1">
                                                                                <button
                                                                                    onClick={() => handleAddPabrikDateGroup(plan.id)}
                                                                                    className="text-[10px] text-emerald-700 font-semibold flex items-center gap-0.5 hover:underline cursor-pointer"
                                                                                >
                                                                                    <Plus className="size-3" /> Tambah Tanggal
                                                                                </button>
                                                                                <button
                                                                                    onClick={() => handleDeletePabrikPlanBlock(plan.id)}
                                                                                    className="text-[10px] text-red-600 font-semibold flex items-center gap-0.5 hover:underline cursor-pointer"
                                                                                >
                                                                                    <Trash2 className="size-3" /> Hapus Plan
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    </td>
                                                                )}

                                                                <td className="px-3 py-3 border-r border-gray-300 bg-gray-50/20 align-top w-36">
                                                                    <input
                                                                        type="text"
                                                                        value={group.tanggal}
                                                                        onChange={(e) => handlePabrikDateGroupChange(plan.id, group.id, 'tanggal', e.target.value)}
                                                                        className="w-full text-center font-bold text-gray-800 text-xs bg-transparent outline-none focus:bg-white rounded px-1 py-0.5 border-b border-transparent focus:border-emerald-500"
                                                                    />
                                                                </td>

                                                                <td className="px-4 py-3 align-top">
                                                                    <div className="space-y-1.5">
                                                                        {group.bullets.length === 0 ? (
                                                                            <span className="text-gray-400 italic text-xs">Belum ada poin aktivitas progres.</span>
                                                                        ) : (
                                                                            <ul className="list-disc list-outside ml-4 space-y-1.5 text-xs text-gray-800">
                                                                                {group.bullets.map((bullet, bIdx) => (
                                                                                    <li key={bIdx} className="group relative">
                                                                                        <div className="flex items-center gap-1.5">
                                                                                            <input
                                                                                                type="text"
                                                                                                value={bullet}
                                                                                                onChange={(e) => handlePabrikBulletChange(plan.id, group.id, bIdx, e.target.value)}
                                                                                                className="w-full bg-transparent outline-none focus:bg-emerald-50/60 rounded px-1.5 py-0.5 border-b border-transparent focus:border-emerald-500 text-xs"
                                                                                            />
                                                                                            <button
                                                                                                onClick={() => handleDeletePabrikBullet(plan.id, group.id, bIdx)}
                                                                                                className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-600 transition-opacity p-0.5 cursor-pointer"
                                                                                                title="Hapus Poin"
                                                                                            >
                                                                                                <Trash2 className="size-3.5" />
                                                                                            </button>
                                                                                        </div>
                                                                                    </li>
                                                                                ))}
                                                                            </ul>
                                                                        )}

                                                                        <div className="pt-1 flex items-center gap-3">
                                                                            <button
                                                                                onClick={() => handleAddPabrikBulletToGroup(plan.id, group.id)}
                                                                                className="text-[10px] text-emerald-700 font-semibold flex items-center gap-0.5 hover:underline cursor-pointer"
                                                                            >
                                                                                <Plus className="size-3" /> Tambah Poin
                                                                            </button>
                                                                            <button
                                                                                onClick={() => handleDeletePabrikDateGroup(plan.id, group.id)}
                                                                                className="text-[10px] text-red-600 font-semibold flex items-center gap-0.5 hover:underline cursor-pointer"
                                                                            >
                                                                                <Trash2 className="size-3" /> Hapus Tanggal
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        ));
                                                    })
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Catatan Tambahan Table */}
                        <div className="pt-2 space-y-2">
                            <div className="flex items-center justify-between">
                                <h4 className="text-xs font-bold text-gray-800">Catatan Tambahan:</h4>
                                <button
                                    onClick={() => setCatatanTambahanBullets(prev => [...prev, 'Catatan baru...'])}
                                    className="text-[10px] text-emerald-700 font-semibold flex items-center gap-0.5 hover:underline cursor-pointer"
                                >
                                    <Plus className="size-3" /> Tambah Catatan
                                </button>
                            </div>
                            <div className="border border-gray-300 rounded-lg p-4 bg-gray-50/40">
                                {catatanTambahanBullets.length === 0 ? (
                                    <p className="text-xs text-gray-400 italic">Tidak ada catatan tambahan pada periode terpilih.</p>
                                ) : (
                                    <ul className="list-disc list-outside ml-4 space-y-1.5 text-xs text-gray-800">
                                        {catatanTambahanBullets.map((bullet, idx) => (
                                            <li key={idx} className="group relative">
                                                <div className="flex items-center gap-1.5">
                                                    <input
                                                        type="text"
                                                        value={bullet}
                                                        onChange={(e) => {
                                                            const next = [...catatanTambahanBullets];
                                                            next[idx] = e.target.value;
                                                            setCatatanTambahanBullets(next);
                                                        }}
                                                        className="w-full bg-transparent outline-none focus:bg-white rounded px-1.5 py-0.5 border-b border-transparent focus:border-emerald-500 text-xs"
                                                    />
                                                    <button
                                                        onClick={() => setCatatanTambahanBullets(prev => prev.filter((_, i) => i !== idx))}
                                                        className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-600 transition-opacity p-0.5 cursor-pointer"
                                                        title="Hapus Catatan"
                                                    >
                                                        <Trash2 className="size-3.5" />
                                                    </button>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Tambah Produk ke Rangkuman */}
            {isAddProductModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200 space-y-4">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                            <h4 className="text-base font-bold text-gray-900">Tambah Produk ke Rangkuman</h4>
                            <button
                                onClick={() => setIsAddProductModalOpen(false)}
                                className="text-gray-400 hover:text-gray-600 font-bold text-sm cursor-pointer"
                            >
                                ✕
                            </button>
                        </div>
                        <p className="text-xs text-gray-500">
                            Pilih produk yang ingin ditambahkan kembali ke Tabel Rangkuman Aktivitas Per Produk:
                        </p>
                        <div className="space-y-2 max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-2 bg-gray-50/50">
                            {availableProductsCatalog.map(prod => {
                                const normName = prod.name.toLowerCase().trim();
                                const isAdded = productBlocks.some(
                                    b => b.id === prod.id || b.name.toLowerCase().trim() === normName
                                );
                                return (
                                    <div key={prod.id} className="flex items-center justify-between p-2.5 bg-white rounded border border-gray-200 hover:border-emerald-300 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <img src={prod.image} alt={prod.name} className="w-8 h-9 object-contain" />
                                            <span className="text-xs font-bold text-gray-800">{prod.name}</span>
                                        </div>
                                        <button
                                            disabled={isAdded}
                                            onClick={() => {
                                                handleAddProductBlock(prod);
                                                setIsAddProductModalOpen(false);
                                            }}
                                            className={`text-xs px-3 py-1 rounded font-semibold transition-all ${
                                                isAdded
                                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                    : 'bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer shadow-xs'
                                            }`}
                                        >
                                            {isAdded ? 'Sudah Ada' : '+ Tambah'}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="flex justify-end pt-2 border-t border-gray-100">
                            <AppButton variant="secondary" onClick={() => setIsAddProductModalOpen(false)}>
                                Tutup
                            </AppButton>
                        </div>
                    </div>
                </div>
            )}

            {/* Save Draft Modal */}
            <SaveDraftModal
                isOpen={isSaveDraftModalOpen}
                onClose={() => setIsSaveDraftModalOpen(false)}
                onSave={handleSaveDraft}
            />

            {/* Version History Drawer (Google Docs Style) */}
            <VersionHistoryDrawer
                isOpen={isHistoryDrawerOpen}
                onClose={() => setIsHistoryDrawerOpen(false)}
                versions={versions}
                activeVersionId={activeVersionId}
                onRestoreVersion={handleRestoreVersion}
                onRenameVersion={handleRenameVersion}
                onDeleteVersion={handleDeleteVersion}
                userName={userName}
            />
        </div>
    );
}
