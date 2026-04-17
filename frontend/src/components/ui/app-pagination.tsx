import React from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { AppButton } from './app-button';

interface AppPaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    totalItems: number;
    itemsPerPage?: number;
    className?: string;
}

export function AppPagination({
    currentPage,
    totalPages,
    onPageChange,
    totalItems,
    itemsPerPage = 10,
    className = '',
}: AppPaginationProps) {
    if (!totalItems || totalItems === 0) return null;
    
    // Safety check for NaN values
    const safeCurrentPage = isNaN(currentPage) ? 1 : currentPage;
    const safeItemsPerPage = isNaN(itemsPerPage) ? 10 : itemsPerPage;

    const startItem = (safeCurrentPage - 1) * safeItemsPerPage + 1;
    const endItem = Math.min(safeCurrentPage * safeItemsPerPage, totalItems);

    return (
        <div className={`flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50/30 ${className}`}>
            <span className="text-xs text-gray-500 font-medium whitespace-nowrap">
                Menampilkan <span className="text-gray-900 font-bold">{startItem}–{endItem}</span> dari <span className="text-gray-900 font-bold">{totalItems}</span> data
            </span>
            
            <div className="flex items-center gap-1 ml-4 overflow-x-auto no-scrollbar">
                <AppButton
                    variant="ghost"
                    size="icon"
                    onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="h-8 w-8 text-gray-400 group-hover:text-emerald-600"
                    icon={<ChevronLeftIcon className="size-4" />}
                />
                
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
                    // Simple pagination logic for many pages
                    if (totalPages > 7) {
                        if (p !== 1 && p !== totalPages && (p < currentPage - 1 || p > currentPage + 1)) {
                            if (p === currentPage - 2 || p === currentPage + 2) {
                                return <span key={p} className="text-gray-300 px-1 text-xs">...</span>;
                            }
                            return null;
                        }
                    }

                    return (
                        <button
                            key={p}
                            onClick={() => onPageChange(p)}
                            className={`px-3 py-1 text-xs font-bold transition-all min-w-[32px] h-8 ${
                                p === currentPage
                                    ? 'bg-emerald-600 text-white shadow-sm'
                                    : 'text-gray-500 hover:bg-white hover:text-emerald-600 border border-transparent hover:border-gray-200'
                            }`}
                        >
                            {p}
                        </button>
                    );
                })}
                
                <AppButton
                    variant="ghost"
                    size="icon"
                    onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="h-8 w-8 text-gray-400 group-hover:text-emerald-600"
                    icon={<ChevronRightIcon className="size-4" />}
                />
            </div>
        </div>
    );
}
