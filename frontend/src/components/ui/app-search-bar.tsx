import React from 'react';
import { SearchIcon } from 'lucide-react';

interface AppSearchBarProps extends React.InputHTMLAttributes<HTMLInputElement> {
    containerClassName?: string;
}

export function AppSearchBar({
    containerClassName = '',
    className = '',
    ...props
}: AppSearchBarProps) {
    return (
        <div className={`relative w-full ${containerClassName}`}>
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-500 transition-colors">
                <SearchIcon className="size-4" />
            </span>
            <input
                type="text"
                className={`w-full pl-9 pr-4 py-2 bg-white border border-gray-200 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow ${className}`}
                {...props}
            />
        </div>
    );
}
