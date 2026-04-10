import React from 'react';
import { ChevronDownIcon } from 'lucide-react';

interface AppSelectOption {
    value: string;
    label: string;
}

interface AppSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    options: AppSelectOption[];
    prefixLabel?: string;
    icon?: React.ReactNode;
    variant?: 'default' | 'ghost' | 'sharp';
}

export function AppSelect({
    options,
    prefixLabel,
    icon,
    variant = 'default',
    className = '',
    ...props
}: AppSelectProps) {
    const baseStyles = "appearance-none bg-transparent text-sm font-medium focus:outline-none transition-all cursor-pointer";
    
    const variants = {
        default: "bg-white border border-gray-200 px-3 py-2 focus:ring-2 focus:ring-emerald-500",
        ghost: "hover:text-emerald-600",
        sharp: "bg-white border border-gray-200 px-3 py-2 focus:ring-0 focus:border-emerald-500",
    };

    const containerStyles = variant === 'ghost' ? "" : "bg-white border border-gray-200 px-3 py-2 flex items-center gap-2 transition-all hover:border-emerald-300";

    if (variant === 'ghost') {
        return (
            <div className={`flex items-center gap-2 ${className}`}>
                {prefixLabel && <span className="text-sm font-medium text-gray-500">{prefixLabel}</span>}
                {icon && <div className="text-gray-400">{icon}</div>}
                <div className="relative group">
                    <select
                        className={`${baseStyles} ${variants.ghost} pr-5`}
                        {...props}
                    >
                        {options.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </select>
                    <ChevronDownIcon className="absolute right-0 top-1/2 -translate-y-1/2 size-3.5 text-gray-400 pointer-events-none group-hover:text-emerald-600 transition-colors" />
                </div>
            </div>
        );
    }

    return (
        <div className={`${containerStyles} ${className}`}>
            {prefixLabel && <span className="text-sm font-medium text-gray-500">{prefixLabel}</span>}
            {icon && <div className="text-gray-400 group-focus-within:text-emerald-500 transition-colors">{icon}</div>}
            <div className="relative flex-1 group">
                <select
                    className={`${baseStyles} w-full pr-6`}
                    {...props}
                >
                    {options.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                            {opt.label}
                        </option>
                    ))}
                </select>
                <ChevronDownIcon className="absolute right-0 top-1/2 -translate-y-1/2 size-4 text-gray-400 pointer-events-none group-hover:text-emerald-500 transition-colors" />
            </div>
        </div>
    );
}
