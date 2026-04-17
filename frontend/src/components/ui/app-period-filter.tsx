'use client';

import { useState, useRef, useEffect } from 'react';
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';

const BULAN_NAMES = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

const BULAN_SHORT = [
    'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
    'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des',
];

interface AppPeriodFilterProps {
    month: number | null;        // 1-12, or null for all periods
    year: number | null;
    onMonthChange: (month: number | null) => void;
    onYearChange: (year: number | null) => void;
    label?: string;       // default: 'Periode'
    className?: string;
}

export function AppPeriodFilter({
    month,
    year,
    onMonthChange,
    onYearChange,
    label = 'Periode',
    className = '',
}: AppPeriodFilterProps) {
    const [open, setOpen] = useState(false);
    const [pickerYear, setPickerYear] = useState(year || new Date().getFullYear());

    const containerRef = useRef<HTMLDivElement>(null);

    // Sync picker year when external year changes
    useEffect(() => {
        if (year) {
            setPickerYear(year);
        }
    }, [year]);

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
        onMonthChange(m);
        onYearChange(pickerYear);
        setOpen(false);
    };

    const handleAllPeriods = () => {
        onMonthChange(null);
        onYearChange(null);
        setOpen(false);
    };

    const label_text = month && year ? `${BULAN_NAMES[month - 1]} ${year}` : 'Seluruh Periode';

    return (
        <div ref={containerRef} className={`relative inline-block ${className}`}>
            {/* Trigger */}
            <button
                type="button"
                onClick={() => {
                    if (year) setPickerYear(year);
                    setOpen((v) => !v);
                }}
                className="flex items-center gap-0 border border-gray-200 bg-white hover:border-emerald-400 transition-colors group h-9"
            >
                <span className="h-full flex items-center px-3 text-xs font-semibold text-gray-500 bg-gray-50 border-r border-gray-200 uppercase tracking-wide">
                    {label}
                </span>
                <span className="h-full flex items-center px-3 text-sm font-semibold text-gray-800 min-w-[130px] text-left">
                    {label_text}
                </span>
                <span className="h-full flex items-center px-2.5 text-gray-400 group-hover:text-emerald-600 transition-colors border-l border-gray-200">
                    <CalendarIcon className="size-4" />
                </span>
            </button>

            {/* Popover */}
            {open && (
                <div className="absolute z-[200] mt-1 left-0 bg-white border border-gray-200 shadow-xl w-[220px] animate-in fade-in slide-in-from-top-2 duration-150">
                    {/* All Periods Option */}
                    <div className="p-2 border-b border-gray-100">
                        <button
                            type="button"
                            onClick={handleAllPeriods}
                            className={`w-full flex items-center justify-center py-1.5 text-xs font-semibold rounded transition-all ${
                                !month && !year
                                    ? 'bg-emerald-600 text-white shadow-sm'
                                    : 'text-gray-600 hover:bg-emerald-50 hover:text-emerald-700'
                            }`}
                        >
                            Seluruh Periode
                        </button>
                    </div>

                    {/* Year navigation */}
                    <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-100 bg-gray-50/80">
                        <button
                            type="button"
                            onClick={() => setPickerYear((y) => y - 1)}
                            className="p-1 rounded hover:bg-gray-200 text-gray-500 hover:text-gray-800 transition-colors"
                        >
                            <ChevronLeftIcon className="size-4" />
                        </button>
                        <span className="text-sm font-bold text-gray-800 tabular-nums">{pickerYear}</span>
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
                            const isActive = m === month && pickerYear === year;
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
                </div>
            )}
        </div>
    );
}
