'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Save, RefreshCw, ChevronLeftIcon, ChevronRightIcon, TrendingUp, FileSpreadsheet, FileText } from 'lucide-react';
import { AppButton } from '@/components/ui/app-button';
import { useToast } from '@/components/ui/toast';
import { rkoService, RkoTarget, RkoReportRow } from '@/services/rkoService';
import * as XLSX from 'xlsx';

/* ─── Types ─── */
interface MonthData {
    target_volume: number;
    real_volume: number;
}

interface ReportProduct {
    product_slug: string;
    tab_name: string;
    jenis_produk: string;
    kemasan: string;
    months: Record<number, MonthData>;
    annual: {
        target_volume: number;
        real_volume: number;
    };
}

/* ─── Constants ─── */
const MONTH_NAMES_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

/* ─── Helpers ─── */
const fmt = (n: number) => n ? n.toLocaleString('id-ID', { maximumFractionDigits: 3 }) : '-';
const pct = (real: number, target: number) => target > 0 ? Math.round((real / target) * 100) : null;
function escapeHtml(text: string): string {
    return (text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* ─── Number Input Cell ─── */
function NumCell({ value, onChange, accent }: { value: number; onChange: (v: number) => void; accent?: 'blue' | 'amber' | 'emerald' }) {
    const ring = accent === 'blue' ? 'focus:ring-blue-400' : accent === 'amber' ? 'focus:ring-amber-400' : 'focus:ring-emerald-500';
    return (
        <input
            type="number"
            value={value || ''}
            onChange={e => onChange(e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
            className={`w-full h-8 px-1 text-right text-xs bg-transparent outline-none focus:bg-white focus:ring-1 focus:ring-inset ${ring} transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none font-mono font-medium text-emerald-800`}
            placeholder="-"
        />
    );
}

/* ─── Pct Badge ─── */
function PctBadge({ real, target }: { real: number; target: number }) {
    const p = pct(real, target);
    if (p === null) return <span className="text-gray-300 text-xs">-</span>;
    const color = p >= 100 ? 'bg-emerald-100 text-emerald-700' : p >= 80 ? 'bg-blue-100 text-blue-700' : p >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-600';
    return <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${color}`}>{p}%</span>;
}

/* ─── Main Page ─── */
export default function RKAPPage() {
    const [year, setYear] = useState(new Date().getFullYear());
    const [reportRows, setReportRows] = useState<ReportProduct[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [dirty, setDirty] = useState(false);
    const [activeMonth, setActiveMonth] = useState<number>(new Date().getMonth() + 1);

    const toast = useToast();

    /* ── Scroll to Month Column ── */
    const scrollToMonth = (m: number) => {
        setActiveMonth(m);
        const el = document.getElementById(`month-col-${m}`);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
    };

    /* ── Fetch data ── */
    const fetchReport = useCallback(async () => {
        setLoading(true);
        try {
            const data = await rkoService.getReport(year);
            const grouped: Record<string, ReportProduct> = {};
            (data || []).forEach((r: RkoReportRow) => {
                const key = r.product_slug + '||' + r.tab_name;
                if (!grouped[key]) {
                    grouped[key] = {
                        product_slug: r.product_slug,
                        tab_name: r.tab_name,
                        jenis_produk: r.jenis_produk || '',
                        kemasan: r.kemasan || '',
                        months: {},
                        annual: { target_volume: 0, real_volume: 0 },
                    };
                }
                grouped[key].months[r.bulan] = {
                    target_volume: Number(r.target_volume || 0),
                    real_volume: Number(r.real_volume || 0),
                };
            });

            // Calculate annual totals for each product row
            const processed = Object.values(grouped).map(row => {
                let tv_plan = 0, tv_real = 0;
                for (let m = 1; m <= 12; m++) {
                    if (!row.months[m]) {
                        row.months[m] = { target_volume: 0, real_volume: 0 };
                    }
                    tv_plan += row.months[m].target_volume;
                    tv_real += row.months[m].real_volume;
                }
                row.annual = {
                    target_volume: Math.round(tv_plan * 100) / 100,
                    real_volume: Math.round(tv_real * 100) / 100,
                };
                return row;
            }).sort((a, b) => a.tab_name.localeCompare(b.tab_name));

            setReportRows(processed);
            setDirty(false);
        } catch (err: any) {
            toast.error('Gagal', err.message || 'Gagal memuat laporan RKO');
        } finally {
            setLoading(false);
        }
    }, [year]);

    useEffect(() => {
        fetchReport();
    }, [fetchReport]);

    /* ── Edit Handlers ── */
    const handleMonthTargetChange = (slug: string, tabName: string, editedMonth: number, val: number) => {
        setReportRows(prev => prev.map(r => {
            if (r.product_slug !== slug || r.tab_name !== tabName) return r;

            const annualTarget = r.annual.target_volume;
            const newMonths = { ...r.months };

            // Update edited month target
            newMonths[editedMonth] = {
                ...newMonths[editedMonth],
                target_volume: val,
            };

            const remainingCount = 12 - editedMonth;
            if (remainingCount > 0 && annualTarget > 0) {
                // Calculate sum of fixed months (Month 1 up to editedMonth)
                let fixedSum = 0;
                for (let m = 1; m <= editedMonth; m++) {
                    fixedSum += Number(newMonths[m]?.target_volume || 0);
                }

                const remainingVolume = Math.max(0, annualTarget - fixedSum);
                const perMonthVal = Math.round((remainingVolume / remainingCount) * 100) / 100;

                let currentSum = fixedSum;
                for (let m = editedMonth + 1; m < 12; m++) {
                    newMonths[m] = {
                        ...newMonths[m],
                        target_volume: perMonthVal,
                    };
                    currentSum += perMonthVal;
                }

                // Assign remaining exact difference to Month 12 to prevent rounding drift
                const lastMonthVal = Math.round((annualTarget - currentSum) * 100) / 100;
                newMonths[12] = {
                    ...newMonths[12],
                    target_volume: Math.max(0, lastMonthVal),
                };
            }

            // Recalculate annual total sum
            let tv_plan = 0;
            for (let m = 1; m <= 12; m++) {
                tv_plan += Number(newMonths[m]?.target_volume || 0);
            }

            return {
                ...r,
                months: newMonths,
                annual: {
                    ...r.annual,
                    target_volume: Math.round(tv_plan * 100) / 100,
                }
            };
        }));
        setDirty(true);
    };

    // When annual total target is changed, distribute equally across 12 months
    const handleAnnualTotalChange = (slug: string, tabName: string, val: number) => {
        const perMonth = Math.round((val / 12) * 100) / 100;
        setReportRows(prev => prev.map(r => {
            if (r.product_slug !== slug || r.tab_name !== tabName) return r;
            const newMonths: Record<number, MonthData> = {};
            let sumSoFar = 0;
            for (let m = 1; m <= 11; m++) {
                newMonths[m] = {
                    ...r.months[m],
                    target_volume: perMonth,
                };
                sumSoFar += perMonth;
            }
            const remaining = Math.round((val - sumSoFar) * 100) / 100;
            newMonths[12] = {
                ...r.months[12],
                target_volume: Math.max(0, remaining),
            };

            return {
                ...r,
                months: newMonths,
                annual: {
                    ...r.annual,
                    target_volume: val,
                }
            };
        }));
        setDirty(true);
    };

    /* ── Save ── */
    const handleSave = async () => {
        setSaving(true);
        try {
            const payload: RkoTarget[] = [];
            reportRows.forEach(r => {
                for (let m = 1; m <= 12; m++) {
                    payload.push({
                        product_slug: r.product_slug,
                        tab_name: r.tab_name,
                        tahun: year,
                        bulan: m,
                        target_volume: r.months[m]?.target_volume || 0,
                        target_kemasan: 0,
                    });
                }
            });
            await rkoService.bulkUpsert(payload);
            setDirty(false);
            toast.success('Berhasil', 'Data RKO berhasil disimpan.');
        } catch (err: any) {
            toast.error('Gagal', err.message || 'Gagal menyimpan data RKO.');
        } finally {
            setSaving(false);
        }
    };

    /* ── Export Excel ── */
    const handleExportExcel = () => {
        try {
            const aoa: any[][] = [];

            // Title
            aoa.push([`LAPORAN RKO - TARGET & REALISASI PRODUKSI TAHUN ${year}`]);
            aoa.push([`Tanggal Export: ${new Date().toLocaleDateString('id-ID')}`]);
            aoa.push([]);

            // Table Header Row 1
            const headerRow = [
                'No',
                'Nama Produk (Varian Sub-Produk)',
                'Jenis Produk',
                `Total Rencana (${year})`,
                `Total Realisasi (${year})`,
            ];
            MONTH_NAMES_SHORT.forEach(m => {
                headerRow.push(`${m} Rencana`, `${m} Realisasi`);
            });
            aoa.push(headerRow);

            // Group rows
            groups.forEach(group => {
                const groupRows = reportRows.filter(group.filter);
                if (groupRows.length === 0) return;

                // Group header row
                aoa.push([`--- ${group.label.toUpperCase()} ---`]);

                const groupAnnual = { tv_plan: 0, tv_real: 0 };
                const groupMonths: Record<number, { v_plan: number; v_real: number }> = {};
                for (let m = 1; m <= 12; m++) groupMonths[m] = { v_plan: 0, v_real: 0 };

                groupRows.forEach((row, idx) => {
                    const rowData: any[] = [
                        idx + 1,
                        row.tab_name,
                        group.label,
                        row.annual.target_volume,
                        row.annual.real_volume,
                    ];

                    groupAnnual.tv_plan += row.annual.target_volume;
                    groupAnnual.tv_real += row.annual.real_volume;

                    for (let m = 1; m <= 12; m++) {
                        const vp = row.months[m]?.target_volume || 0;
                        const vr = row.months[m]?.real_volume || 0;
                        rowData.push(vp, vr);

                        groupMonths[m].v_plan += vp;
                        groupMonths[m].v_real += vr;
                    }

                    aoa.push(rowData);
                });

                // Group Subtotal Row
                const subtotalRow: any[] = [
                    '',
                    `TOTAL ${group.label.toUpperCase()}`,
                    '',
                    groupAnnual.tv_plan,
                    groupAnnual.tv_real,
                ];
                for (let m = 1; m <= 12; m++) {
                    subtotalRow.push(groupMonths[m].v_plan, groupMonths[m].v_real);
                }
                aoa.push(subtotalRow);
                aoa.push([]); // blank spacing
            });

            // Grand Total Row
            const grandTotalRow: any[] = [
                '',
                'GRAND TOTAL',
                '',
                reportRows.reduce((s, r) => s + r.annual.target_volume, 0),
                reportRows.reduce((s, r) => s + r.annual.real_volume, 0),
            ];
            for (let m = 1; m <= 12; m++) {
                grandTotalRow.push(
                    reportRows.reduce((s, r) => s + (r.months[m]?.target_volume || 0), 0),
                    reportRows.reduce((s, r) => s + (r.months[m]?.real_volume || 0), 0)
                );
            }
            aoa.push(grandTotalRow);

            const ws = XLSX.utils.aoa_to_sheet(aoa);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, `RKO_${year}`);
            XLSX.writeFile(wb, `Laporan_RKO_${year}.xlsx`);
            toast.success('Berhasil', 'File Excel RKO berhasil didownload.');
        } catch (err: any) {
            console.error('Export Excel failed:', err);
            toast.error('Gagal Export Excel', err.message || 'Terjadi kesalahan saat export Excel.');
        }
    };

    /* ── Export PDF ── */
    const handleExportPDF = () => {
        try {
            const printWindow = window.open('', '_blank');
            if (!printWindow) {
                toast.error('Gagal', 'Popup terblokir oleh browser. Izinkan popup untuk mencetak PDF.');
                return;
            }

            let groupsHtml = '';
            groups.forEach(group => {
                const groupRows = reportRows.filter(group.filter);
                if (groupRows.length === 0) return;

                const groupAnnual = { tv_plan: 0, tv_real: 0 };
                const groupMonths: Record<number, { v_plan: number; v_real: number }> = {};
                for (let m = 1; m <= 12; m++) groupMonths[m] = { v_plan: 0, v_real: 0 };

                let rowsHtml = '';
                groupRows.forEach((row, idx) => {
                    groupAnnual.tv_plan += row.annual.target_volume;
                    groupAnnual.tv_real += row.annual.real_volume;

                    let monthCells = '';
                    for (let m = 1; m <= 12; m++) {
                        const vp = row.months[m]?.target_volume || 0;
                        const vr = row.months[m]?.real_volume || 0;
                        groupMonths[m].v_plan += vp;
                        groupMonths[m].v_real += vr;

                        monthCells += `
                            <td style="text-align: right; border: 1px solid #d1d5db; padding: 4px 5px; color: #000000;">${fmt(vp)}</td>
                            <td style="text-align: right; border: 1px solid #d1d5db; padding: 4px 5px; font-weight: 600; color: #000000;">${fmt(vr)}</td>
                        `;
                    }

                    rowsHtml += `
                        <tr>
                            <td style="text-align: center; border: 1px solid #d1d5db; padding: 4px 5px; color: #000000;">${idx + 1}</td>
                            <td style="border: 1px solid #d1d5db; padding: 4px 5px; font-weight: 500; color: #000000;">${escapeHtml(row.tab_name)}</td>
                            <td style="text-align: right; border: 1px solid #d1d5db; padding: 4px 5px; font-weight: 600; color: #000000;">${fmt(row.annual.target_volume)}</td>
                            <td style="text-align: right; border: 1px solid #d1d5db; padding: 4px 5px; font-weight: 600; color: #000000;">${fmt(row.annual.real_volume)}</td>
                            ${monthCells}
                        </tr>
                    `;
                });

                let subtotalMonthCells = '';
                for (let m = 1; m <= 12; m++) {
                    subtotalMonthCells += `
                        <td style="text-align: right; border: 1px solid #94a3b8; padding: 4px 5px; font-weight: 600; color: #000000;">${fmt(groupMonths[m].v_plan)}</td>
                        <td style="text-align: right; border: 1px solid #94a3b8; padding: 4px 5px; font-weight: 600; color: #000000;">${fmt(groupMonths[m].v_real)}</td>
                    `;
                }

                groupsHtml += `
                    <tr style="background: #f1f5f9; font-weight: bold; color: #000000;">
                        <td colSpan="28" style="padding: 5px 8px; border: 1px solid #94a3b8; font-size: 8.5pt; text-transform: uppercase; color: #000000;">${escapeHtml(group.label)}</td>
                    </tr>
                    ${rowsHtml}
                    <tr style="background: #f8fafc; font-weight: bold; color: #000000;">
                        <td colSpan="2" style="text-align: right; border: 1px solid #94a3b8; padding: 5px 8px; color: #000000;">TOTAL ${escapeHtml(group.label.toUpperCase())}</td>
                        <td style="text-align: right; border: 1px solid #94a3b8; padding: 5px 8px; color: #000000;">${fmt(groupAnnual.tv_plan)}</td>
                        <td style="text-align: right; border: 1px solid #94a3b8; padding: 5px 8px; color: #000000;">${fmt(groupAnnual.tv_real)}</td>
                        ${subtotalMonthCells}
                    </tr>
                `;
            });

            let grandMonthCells = '';
            for (let m = 1; m <= 12; m++) {
                const mvPlan = reportRows.reduce((s, r) => s + (r.months[m]?.target_volume || 0), 0);
                const mvReal = reportRows.reduce((s, r) => s + (r.months[m]?.real_volume || 0), 0);
                grandMonthCells += `
                    <td style="text-align: right; border: 1px solid #000000; padding: 5px 8px; color: #000000;">${fmt(mvPlan)}</td>
                    <td style="text-align: right; border: 1px solid #000000; padding: 5px 8px; color: #000000;">${fmt(mvReal)}</td>
                `;
            }

            const grandPlan = reportRows.reduce((s, r) => s + r.annual.target_volume, 0);
            const grandReal = reportRows.reduce((s, r) => s + r.annual.real_volume, 0);

            const monthHeaderCols = MONTH_NAMES_SHORT.map(m => `
                <th colSpan="2" style="border: 1px solid #94a3b8; padding: 4px; text-align: center; color: #000000;">${m}</th>
            `).join('');

            const subMonthHeaderCols = MONTH_NAMES_SHORT.map(() => `
                <th style="border: 1px solid #94a3b8; padding: 3px; text-align: center; font-size: 7pt; color: #000000;">Renc</th>
                <th style="border: 1px solid #94a3b8; padding: 3px; text-align: center; font-size: 7pt; color: #000000;">Real</th>
            `).join('');

            const html = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <title>Laporan RKO ${year}</title>
                    <style>
                        @page { size: landscape; margin: 8mm; }
                        * { color: #000000 !important; }
                        body { font-family: Arial, sans-serif; font-size: 8pt; margin: 0; padding: 10px; color: #000000 !important; }
                        .header { margin-bottom: 12px; border-bottom: 2px solid #000000; padding-bottom: 8px; }
                        .header h2 { margin: 0; font-size: 14pt; color: #000000 !important; }
                        .header p { margin: 2px 0 0 0; color: #000000 !important; font-size: 9pt; }
                        table { width: 100%; border-collapse: collapse; margin-top: 8px; }
                        th { background: #f8fafc; font-size: 8pt; text-transform: uppercase; color: #000000 !important; }
                        td { color: #000000 !important; }
                        @media print {
                            body { padding: 0; }
                            * { color: #000000 !important; }
                        }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h2>LAPORAN RKO - TARGET & REALISASI PRODUKSI</h2>
                        <p>Filter Tahun: <strong>${year}</strong> | Tanggal Cetak: <strong>${new Date().toLocaleDateString('id-ID')}</strong></p>
                    </div>
                    <table>
                        <thead>
                            <tr>
                                <th rowSpan="2" style="border: 1px solid #94a3b8; padding: 4px; width: 25px; color: #000000;">No</th>
                                <th rowSpan="2" style="border: 1px solid #94a3b8; padding: 4px; text-align: left; color: #000000;">Nama Produk</th>
                                <th colSpan="2" style="border: 1px solid #94a3b8; padding: 4px; background: #f1f5f9; color: #000000;">Total Tahun ${year}</th>
                                ${monthHeaderCols}
                            </tr>
                            <tr>
                                <th style="border: 1px solid #94a3b8; padding: 3px; background: #f1f5f9; color: #000000;">Renc</th>
                                <th style="border: 1px solid #94a3b8; padding: 3px; background: #f1f5f9; color: #000000;">Real</th>
                                ${subMonthHeaderCols}
                            </tr>
                        </thead>
                        <tbody>
                            ${groupsHtml}
                        </tbody>
                        <tfoot>
                            <tr style="background: #e2e8f0; color: #000000; font-weight: bold; border: 1.5px solid #000000;">
                                <td colSpan="2" style="text-align: right; border: 1px solid #000000; padding: 6px; color: #000000;">GRAND TOTAL</td>
                                <td style="text-align: right; border: 1px solid #000000; padding: 6px; color: #000000;">${fmt(grandPlan)}</td>
                                <td style="text-align: right; border: 1px solid #000000; padding: 6px; color: #000000;">${fmt(grandReal)}</td>
                                ${grandMonthCells}
                            </tr>
                        </tfoot>
                    </table>
                </body>
                </html>
            `;

            printWindow.document.write(html);
            printWindow.document.close();
            printWindow.onload = () => {
                printWindow.print();
            };
            toast.success('Berhasil', 'Membuka tampilan cetak PDF.');
        } catch (err: any) {
            console.error('Export PDF failed:', err);
            toast.error('Gagal Export PDF', err.message || 'Terjadi kesalahan saat mencetak PDF.');
        }
    };

    /* ── Report groups ── */
    const groups = [
        { label: 'Produk Cair', filter: (r: ReportProduct) => r.jenis_produk?.toLowerCase().includes('cair') || r.tab_name?.toLowerCase().includes('cair') },
        { label: 'Produk Padat', filter: (r: ReportProduct) => !r.jenis_produk?.toLowerCase().includes('cair') && !r.tab_name?.toLowerCase().includes('cair') },
    ];

    return (
        <div className="space-y-6">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-gray-400">
                <span className="text-gray-500">Dashboard</span>
                <span>/</span>
                <span className="text-gray-500">Produk Pengembangan</span>
                <span>/</span>
                <span className="text-gray-800 font-medium">RKO</span>
            </div>

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
                        RKO
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Target rencana & realisasi produksi tahunan per varian produk
                    </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <AppButton variant="secondary" onClick={handleExportExcel} disabled={loading || reportRows.length === 0} icon={<FileSpreadsheet className="size-4 text-emerald-600" />}>
                        Export Excel
                    </AppButton>
                    <AppButton variant="secondary" onClick={handleExportPDF} disabled={loading || reportRows.length === 0} icon={<FileText className="size-4 text-red-600" />}>
                        Export PDF
                    </AppButton>
                    <AppButton variant="secondary" onClick={fetchReport} disabled={loading} icon={<RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />}>
                        Refresh
                    </AppButton>
                    <AppButton variant="primary" onClick={handleSave} disabled={saving || !dirty} icon={<Save className="size-4" />} className="relative">
                        {dirty && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-400 rounded-full border border-white" />}
                        {saving ? 'Menyimpan...' : 'Simpan RKO'}
                    </AppButton>
                </div>
            </div>

            {/* Main Card */}
            <div className="bg-white border border-gray-200 overflow-hidden">
                {/* Year + Month Toolbar */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 px-4 py-2.5 bg-gray-50/50 gap-2">
                    <div className="text-xs text-gray-500 italic">
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <div className="flex items-center gap-1">
                            <span className="text-xs font-semibold text-gray-500 uppercase">Tahun</span>
                            <AppButton variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:text-emerald-600" onClick={() => setYear(y => y - 1)} icon={<ChevronLeftIcon className="size-4" />} />
                            <span className="text-sm font-bold text-gray-800 w-12 text-center">{year}</span>
                            <AppButton variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:text-emerald-600" onClick={() => setYear(y => y + 1)} icon={<ChevronRightIcon className="size-4" />} />
                        </div>
                        <span className="text-gray-200 hidden sm:block">|</span>
                        <div className="hidden sm:flex items-center gap-1">
                            {MONTH_NAMES_SHORT.map((m, i) => (
                                <button
                                    key={i}
                                    onClick={() => scrollToMonth(i + 1)}
                                    className={`px-2.5 py-1 rounded text-xs font-semibold transition-all cursor-pointer ${
                                        activeMonth === i + 1
                                            ? 'bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-500'
                                            : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'
                                    }`}
                                >
                                    {m}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Table View */}
                <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 280px)' }}>
                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
                        </div>
                    ) : reportRows.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                            <TrendingUp className="size-12 mb-3 opacity-20" />
                            <p className="text-sm font-medium">Belum ada data produk</p>
                            <p className="text-xs mt-1">Pastikan data produksi_tabs telah terisi</p>
                        </div>
                    ) : (
                        <table className="w-full text-sm border-collapse min-w-max">
                            <thead className="sticky top-0 z-30">
                                <tr className="bg-gray-50 text-xs text-gray-600 uppercase tracking-wider">
                                    <th rowSpan={3} className="px-3 py-2 text-center border-b border-r border-gray-200 sticky left-0 z-40 bg-gray-50 w-10">No</th>
                                    <th rowSpan={3} className="px-4 py-2 text-left border-b border-r border-gray-200 sticky left-10 z-40 bg-gray-50 min-w-[220px]">Nama Produk (Varian Sub-Produk)</th>
                                    {/* Annual total */}
                                    <th colSpan={2} className="px-3 py-2 text-center font-bold border-b border-r border-gray-200 bg-emerald-50 text-emerald-800">Total Tahun {year}</th>
                                    {/* Monthly */}
                                    {MONTH_NAMES_SHORT.map((m, i) => (
                                        <th
                                            id={`month-col-${i + 1}`}
                                            key={i}
                                            colSpan={2}
                                            className={`px-2 py-2 text-center font-semibold border-b border-r border-gray-200 transition-colors ${
                                                activeMonth === i + 1 ? 'bg-blue-100 text-blue-800 font-bold' : 'text-gray-500'
                                            }`}
                                        >
                                            {m}
                                        </th>
                                    ))}
                                </tr>
                                <tr className="bg-gray-50 text-[11px] text-gray-500 uppercase">
                                    <th colSpan={2} className="px-2 py-1.5 text-center border-b border-r border-gray-200 bg-emerald-50/70 text-emerald-700 font-bold">Volume (L/Kg)</th>
                                    {MONTH_NAMES_SHORT.map((_, i) => (
                                        <th key={i} colSpan={2} className={`px-2 py-1.5 text-center border-b border-r border-gray-200 font-semibold ${activeMonth === i + 1 ? 'bg-blue-50/70 text-blue-600' : ''}`}>Vol.</th>
                                    ))}
                                </tr>
                                <tr className="bg-gray-50 text-[10px] text-gray-500 uppercase">
                                    <th className="px-2 py-1 text-center border-b border-r border-gray-200 bg-emerald-100/60 text-emerald-800 font-bold">Rencana</th>
                                    <th className="px-2 py-1 text-center border-b border-r border-gray-200 bg-blue-50/50 text-blue-600 font-bold">Realisasi</th>
                                    {MONTH_NAMES_SHORT.map((_, i) => (
                                        <React.Fragment key={i}>
                                            <th className={`px-2 py-1 text-center border-b border-r border-gray-200 font-bold ${activeMonth === i + 1 ? 'bg-blue-100/50 text-blue-700' : 'bg-emerald-50/40 text-emerald-700'}`}>Renc.</th>
                                            <th className={`px-2 py-1 text-center border-b border-r border-gray-200 ${activeMonth === i + 1 ? 'bg-blue-50/30' : ''}`}>Real.</th>
                                        </React.Fragment>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {groups.map(group => {
                                    const groupRows = reportRows.filter(group.filter);
                                    if (groupRows.length === 0) return null;
                                    const groupAnnual = { tv_plan: 0, tv_real: 0 };
                                    const groupMonths: Record<number, { v_plan: number; v_real: number }> = {};
                                    for (let m = 1; m <= 12; m++) groupMonths[m] = { v_plan: 0, v_real: 0 };
                                    groupRows.forEach(r => {
                                        groupAnnual.tv_plan += r.annual.target_volume;
                                        groupAnnual.tv_real += r.annual.real_volume;
                                        for (let m = 1; m <= 12; m++) {
                                            groupMonths[m].v_plan += r.months[m]?.target_volume || 0;
                                            groupMonths[m].v_real += r.months[m]?.real_volume || 0;
                                        }
                                    });

                                    return (
                                        <React.Fragment key={group.label}>
                                            {/* Group Header */}
                                            <tr className="bg-gray-100/80">
                                                <td colSpan={100} className="px-4 py-2 font-bold text-xs text-gray-700 uppercase tracking-wider border-b border-gray-200">
                                                    {group.label}
                                                </td>
                                            </tr>
                                            {/* Product rows */}
                                            {groupRows.map((row, idx) => (
                                                <tr key={row.product_slug + '||' + row.tab_name} className="group hover:bg-emerald-50/20 transition-colors border-b border-gray-100">
                                                    <td className="px-3 py-1 text-center text-gray-400 text-xs border-r border-gray-100 sticky left-0 z-20 bg-white group-hover:bg-emerald-50/40">{idx + 1}</td>
                                                    <td className="px-4 py-1 font-medium text-gray-800 border-r border-gray-200 sticky left-10 z-20 bg-white group-hover:bg-emerald-50/40 whitespace-nowrap">
                                                        <span className="block truncate" title={row.tab_name}>{row.tab_name}</span>
                                                    </td>

                                                    {/* Annual Target Vol (Editable) */}
                                                    <td className="p-0 border-r border-gray-100 bg-emerald-50/50 hover:bg-emerald-100/60 min-w-[80px]">
                                                        <NumCell
                                                            value={row.annual.target_volume}
                                                            onChange={v => handleAnnualTotalChange(row.product_slug, row.tab_name, v)}
                                                            accent="emerald"
                                                        />
                                                    </td>
                                                    {/* Annual Real Vol (Readonly) */}
                                                    <td className="px-3 py-1 text-right text-xs border-r border-gray-200 bg-blue-50/30 text-blue-700 font-medium min-w-[90px]">
                                                        <div className="flex items-center justify-end gap-1.5">
                                                            {fmt(row.annual.real_volume)}
                                                            <PctBadge real={row.annual.real_volume} target={row.annual.target_volume} />
                                                        </div>
                                                    </td>

                                                    {/* Monthly Columns */}
                                                    {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                                        <React.Fragment key={m}>
                                                            {/* Rencana Month Vol (Editable) */}
                                                            <td className={`p-0 border-r border-gray-100 transition-colors min-w-[65px] ${activeMonth === m ? 'bg-blue-50/40' : 'bg-emerald-50/20 hover:bg-emerald-50/50'}`}>
                                                                <NumCell
                                                                    value={row.months[m]?.target_volume || 0}
                                                                    onChange={v => handleMonthTargetChange(row.product_slug, row.tab_name, m, v)}
                                                                    accent={activeMonth === m ? 'blue' : 'emerald'}
                                                                />
                                                            </td>
                                                            {/* Realisasi Month Vol (Readonly) */}
                                                            <td className={`px-2 py-1 text-right text-xs border-r border-gray-200 ${activeMonth === m ? 'bg-blue-50/30 font-bold text-blue-800' : 'text-gray-700 font-medium'} min-w-[60px]`}>
                                                                {fmt(row.months[m]?.real_volume || 0)}
                                                            </td>
                                                        </React.Fragment>
                                                    ))}
                                                </tr>
                                            ))}
                                            {/* Group subtotal */}
                                            <tr className="bg-gray-50 text-xs font-semibold text-gray-700 border-b-2 border-gray-300">
                                                <td colSpan={2} className="px-4 py-2 text-right sticky left-0 bg-gray-50 z-20 border-r border-gray-200">Total {group.label}</td>
                                                <td className="px-3 py-2 text-right border-r border-gray-100 text-emerald-700">{fmt(groupAnnual.tv_plan)}</td>
                                                <td className="px-3 py-2 text-right border-r border-gray-200 text-blue-700">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        {fmt(groupAnnual.tv_real)}
                                                        <PctBadge real={groupAnnual.tv_real} target={groupAnnual.tv_plan} />
                                                    </div>
                                                </td>
                                                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                                    <React.Fragment key={m}>
                                                        <td className={`px-3 py-2 text-right border-r border-gray-100 ${activeMonth === m ? 'bg-blue-50/20' : ''} text-emerald-700 font-medium`}>
                                                            {fmt(groupMonths[m].v_plan)}
                                                        </td>
                                                        <td className={`px-3 py-2 text-right border-r border-gray-200 ${activeMonth === m ? 'bg-blue-50/20' : ''} text-gray-700 font-medium`}>
                                                            {fmt(groupMonths[m].v_real)}
                                                        </td>
                                                    </React.Fragment>
                                                ))}
                                            </tr>
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                            {/* Grand Total footer */}
                            <tfoot className="sticky bottom-0 z-30">
                                <tr className="bg-emerald-900 text-white text-xs font-semibold">
                                    <td colSpan={2} className="px-4 py-3 text-right sticky left-0 bg-emerald-900 border-r border-emerald-800 z-40">GRAND TOTAL</td>
                                    <td className="px-3 py-3 text-right border-r border-emerald-800 text-emerald-200">
                                        {fmt(reportRows.reduce((s, r) => s + r.annual.target_volume, 0))}
                                    </td>
                                    <td className="px-3 py-3 text-right border-r border-emerald-800 text-blue-200">
                                        {fmt(reportRows.reduce((s, r) => s + r.annual.real_volume, 0))}
                                    </td>
                                    {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                        <React.Fragment key={m}>
                                            <td className="px-3 py-3 text-right border-r border-emerald-800 text-emerald-100">
                                                {fmt(reportRows.reduce((s, r) => s + (r.months[m]?.target_volume || 0), 0))}
                                            </td>
                                            <td className="px-3 py-3 text-right border-r border-emerald-800 text-emerald-50">
                                                {fmt(reportRows.reduce((s, r) => s + (r.months[m]?.real_volume || 0), 0))}
                                            </td>
                                        </React.Fragment>
                                    ))}
                                </tr>
                            </tfoot>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}
