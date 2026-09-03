'use client';

import { useState, useRef, useEffect } from 'react';
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon, ArrowRightIcon } from 'lucide-react';

const BULAN_NAMES = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

const BULAN_SHORT = [
    'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
    'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des',
];

export interface AppPeriodFilterProps {
    month: number | null;        // 1-12, or null for all periods
    year: number | null;
    onMonthChange: (month: number | null) => void;
    onYearChange: (year: number | null) => void;

    // Optional Month Range props
    startMonth?: number | null;
    startYear?: number | null;
    endMonth?: number | null;
    endYear?: number | null;
    onRangeChange?: (
        startMonth: number | null,
        startYear: number | null,
        endMonth: number | null,
        endYear: number | null
    ) => void;

    label?: string;       // default: 'Periode'
    className?: string;
}

export function AppPeriodFilter({
    month,
    year,
    onMonthChange,
    onYearChange,
    startMonth = null,
    startYear = null,
    endMonth = null,
    endYear = null,
    onRangeChange,
    label = 'Periode',
    className = '',
}: AppPeriodFilterProps) {
    const [open, setOpen] = useState(false);
    const [tab, setTab] = useState<'single' | 'range'>('single');
    const [pickerYear, setPickerYear] = useState(year || new Date().getFullYear());

    // Local range state for editing before applying
    const now = new Date();
    const [rStartMonth, setRStartMonth] = useState<number>(startMonth || 1);
    const [rStartYear, setRStartYear] = useState<number>(startYear || now.getFullYear());
    const [rEndMonth, setREndMonth] = useState<number>(endMonth || now.getMonth() + 1);
    const [rEndYear, setREndYear] = useState<number>(endYear || now.getFullYear());

    const containerRef = useRef<HTMLDivElement>(null);

    // Sync picker year when external year changes
    useEffect(() => {
        if (year) {
            setPickerYear(year);
        }
    }, [year]);

    useEffect(() => {
        if (startMonth) setRStartMonth(startMonth);
        if (startYear) setRStartYear(startYear);
        if (endMonth) setREndMonth(endMonth);
        if (endYear) setREndYear(endYear);
    }, [startMonth, startYear, endMonth, endYear]);

    // Close on outside click
    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    const handleMonthSelect = (m: number) => {
        // Clear range if active
        if (onRangeChange) {
            onRangeChange(null, null, null, null);
        }
        onMonthChange(m);
        onYearChange(pickerYear);
        setOpen(false);
    };

    const handleEntireYear = () => {
        if (onRangeChange) {
            onRangeChange(null, null, null, null);
        }
        onMonthChange(null);
        onYearChange(pickerYear);
        setOpen(false);
    };

    const handleAllPeriods = () => {
        if (onRangeChange) {
            onRangeChange(null, null, null, null);
        }
        onMonthChange(null);
        onYearChange(null);
        setOpen(false);
    };

    const handleApplyRange = () => {
        if (onRangeChange) {
            onRangeChange(rStartMonth, rStartYear, rEndMonth, rEndYear);
            onMonthChange(null);
            onYearChange(null);
        }
        setOpen(false);
    };

    const hasActiveRange = Boolean(startMonth && startYear && endMonth && endYear && onRangeChange);

    let label_text = 'Seluruh Periode';
    if (hasActiveRange) {
        label_text = `${BULAN_SHORT[startMonth! - 1]} ${startYear} - ${BULAN_SHORT[endMonth! - 1]} ${endYear}`;
    } else if (month && year) {
        label_text = `${BULAN_NAMES[month - 1]} ${year}`;
    } else if (!month && year) {
        label_text = `Tahun ${year}`;
    }

    return (
        <div ref={containerRef} className={`relative inline-block ${className}`}>
            {/* Trigger */}
            <button
                type="button"
                onClick={() => {
                    if (year) setPickerYear(year);
                    setOpen((v) => !v);
                }}
                className="flex items-center gap-0 border border-gray-200 bg-white hover:border-emerald-400 transition-colors group h-9 shadow-2xs"
            >
                <span className="h-full flex items-center px-3 text-xs font-semibold text-gray-500 bg-gray-50 border-r border-gray-200 uppercase tracking-wide">
                    {label}
                </span>
                <span className="h-full flex items-center px-3 text-xs font-semibold text-gray-800 min-w-[140px] text-left whitespace-nowrap">
                    {label_text}
                </span>
                <span className="h-full flex items-center px-2.5 text-gray-400 group-hover:text-emerald-600 transition-colors border-l border-gray-200">
                    <CalendarIcon className="size-4" />
                </span>
            </button>

            {/* Popover */}
            {open && (
                <div className="absolute z-[200] mt-1 left-0 bg-white border border-gray-200 shadow-xl w-[280px] animate-in fade-in slide-in-from-top-2 duration-150 rounded-sm">
                    {/* Tab Navigation */}
                    {onRangeChange && (
                        <div className="flex border-b border-gray-200 bg-gray-50/80 text-xs font-semibold">
                            <button
                                type="button"
                                onClick={() => setTab('single')}
                                className={`flex-1 py-2 text-center transition-colors ${
                                    tab === 'single'
                                        ? 'bg-white text-emerald-700 border-b-2 border-emerald-600 font-bold'
                                        : 'text-gray-500 hover:text-gray-800'
                                }`}
                            >
                                Per Bulan
                            </button>
                            <button
                                type="button"
                                onClick={() => setTab('range')}
                                className={`flex-1 py-2 text-center transition-colors ${
                                    tab === 'range'
                                        ? 'bg-white text-emerald-700 border-b-2 border-emerald-600 font-bold'
                                        : 'text-gray-500 hover:text-gray-800'
                                }`}
                            >
                                Rentang Bulan
                            </button>
                        </div>
                    )}

                    {tab === 'single' ? (
                        <>
                            {/* All Periods & Entire Year Option */}
                            <div className="p-2 border-b border-gray-100 space-y-1">
                                <button
                                    type="button"
                                    onClick={handleAllPeriods}
                                    className={`w-full flex items-center justify-center py-1.5 text-xs font-semibold rounded transition-all ${
                                        !month && !year && !hasActiveRange
                                            ? 'bg-emerald-600 text-white shadow-sm'
                                            : 'text-gray-600 hover:bg-emerald-50 hover:text-emerald-700'
                                    }`}
                                >
                                    Seluruh Periode
                                </button>
                                <button
                                    type="button"
                                    onClick={handleEntireYear}
                                    className={`w-full flex items-center justify-center py-1.5 text-xs font-semibold rounded transition-all ${
                                        !month && year && !hasActiveRange && pickerYear === year
                                            ? 'bg-emerald-600 text-white shadow-sm'
                                            : 'text-gray-600 hover:bg-emerald-50 hover:text-emerald-700'
                                    }`}
                                >
                                    Seluruh Tahun {pickerYear}
                                </button>
                            </div>

                            {/* Year navigation */}
                            <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 bg-gray-50/80">
                                <button
                                    type="button"
                                    onClick={() => setPickerYear((y) => y - 1)}
                                    className="p-1 rounded hover:bg-gray-200 text-gray-500 hover:text-gray-800 transition-colors"
                                >
                                    <ChevronLeftIcon className="size-4" />
                                </button>
                                <span className="text-xs font-bold text-gray-800 tabular-nums">{pickerYear}</span>
                                <button
                                    type="button"
                                    onClick={() => setPickerYear((y) => y + 1)}
                                    className="p-1 rounded hover:bg-gray-200 text-gray-500 hover:text-gray-800 transition-colors"
                                >
                                    <ChevronRightIcon className="size-4" />
                                </button>
                            </div>

                            {/* Month grid 4x3 */}
                            <div className="grid grid-cols-4 gap-1 p-2">
                                {BULAN_SHORT.map((name, idx) => {
                                    const m = idx + 1;
                                    const isActive = !hasActiveRange && m === month && pickerYear === year;
                                    return (
                                        <button
                                            key={m}
                                            type="button"
                                            onClick={() => handleMonthSelect(m)}
                                            className={`py-1.5 text-xs font-semibold rounded transition-all ${
                                                isActive
                                                    ? 'bg-emerald-600 text-white shadow-sm'
                                                    : 'text-gray-600 hover:bg-emerald-50 hover:text-emerald-700'
                                            }`}
                                        >
                                            {name}
                                        </button>
                                    );
                                })}
                            </div>
                        </>
                    ) : (
                        /* Month Range Selection Form */
                        <div className="p-3 space-y-3">
                            <div className="space-y-2">
                                {/* Start Month & Year */}
                                <div>
                                    <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                                        Dari Bulan & Tahun:
                                    </label>
                                    <div className="flex items-center gap-1.5">
                                        <select
                                            value={rStartMonth}
                                            onChange={(e) => setRStartMonth(parseInt(e.target.value))}
                                            className="w-full text-xs h-8 border border-gray-200 rounded px-1.5 bg-white font-medium focus:outline-emerald-500"
                                        >
                                            {BULAN_NAMES.map((n, i) => (
                                                <option key={i + 1} value={i + 1}>{n}</option>
                                            ))}
                                        </select>
                                        <input
                                            type="number"
                                            value={rStartYear}
                                            onChange={(e) => setRStartYear(parseInt(e.target.value) || now.getFullYear())}
                                            className="w-20 text-xs h-8 border border-gray-200 rounded px-1.5 bg-white font-medium text-center focus:outline-emerald-500"
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-center my-0.5 text-gray-400">
                                    <ArrowRightIcon className="size-3.5 rotate-90" />
                                </div>

                                {/* End Month & Year */}
                                <div>
                                    <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                                        Sampai Bulan & Tahun:
                                    </label>
                                    <div className="flex items-center gap-1.5">
                                        <select
                                            value={rEndMonth}
                                            onChange={(e) => setREndMonth(parseInt(e.target.value))}
                                            className="w-full text-xs h-8 border border-gray-200 rounded px-1.5 bg-white font-medium focus:outline-emerald-500"
                                        >
                                            {BULAN_NAMES.map((n, i) => (
                                                <option key={i + 1} value={i + 1}>{n}</option>
                                            ))}
                                        </select>
                                        <input
                                            type="number"
                                            value={rEndYear}
                                            onChange={(e) => setREndYear(parseInt(e.target.value) || now.getFullYear())}
                                            className="w-20 text-xs h-8 border border-gray-200 rounded px-1.5 bg-white font-medium text-center focus:outline-emerald-500"
                                        />
                                    </div>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={handleApplyRange}
                                className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded transition-colors shadow-2xs cursor-pointer"
                            >
                                Terapkan Rentang Bulan
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

