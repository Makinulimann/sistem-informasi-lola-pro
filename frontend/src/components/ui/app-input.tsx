'use client';

import React, { type InputHTMLAttributes, type ReactNode } from 'react';

export interface AppInputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    icon?: ReactNode;
    rightElement?: ReactNode;
    error?: string;
}

export function AppInput({
    label,
    icon,
    rightElement,
    error,
    className = '',
    id,
    ...props
}: AppInputProps) {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
        <div className="space-y-1.5">
            {label && (
                <label htmlFor={inputId} className="block text-sm font-medium text-gray-700">
                    {label}
                </label>
            )}
            <div className="relative group">
                {icon && (
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors group-focus-within:text-emerald-500 text-gray-400">
                        {icon}
                    </span>
                )}
                <input
                    id={inputId}
                    className={[
                        'w-full py-3 bg-white border text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 transition-all hover:border-gray-300',
                        icon ? 'pl-11' : 'pl-4',
                        rightElement ? 'pr-12' : 'pr-4',
                        error 
                            ? 'border-red-300 focus:ring-red-500/40 focus:border-red-500' 
                            : 'border-gray-200 focus:ring-emerald-500/40 focus:border-emerald-500',
                        className
                    ].join(' ')}
                    {...props}
                />
                {rightElement && (
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center">
                        {rightElement}
                    </div>
                )}
            </div>
            {error && (
                <p className="text-xs text-red-500 mt-1 animate-in fade-in slide-in-from-top-1 duration-200">
                    {error}
                </p>
            )}
        </div>
    );
}
