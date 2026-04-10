'use client';

import React from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'link';
type Size    = 'sm' | 'md' | 'lg' | 'icon';

export interface AppButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: Variant;
    size?: Size;
    loading?: boolean;
    icon?: React.ReactNode;
    iconRight?: React.ReactNode;
}

const variantClass: Record<Variant, string> = {
    primary:   'bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-4 focus:ring-emerald-600/20 active:scale-95',
    secondary: 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50',
    ghost:     'text-gray-500 hover:bg-gray-100 hover:text-gray-700',
    danger:    'bg-white border border-red-200 text-red-600 hover:bg-red-50',
    link:      'text-emerald-600 underline-offset-2 hover:underline p-0 h-auto',
};

const sizeClass: Record<Size, string> = {
    sm:   'px-3 py-1.5 text-xs gap-1.5',
    md:   'px-5 py-2.5 text-sm gap-2',
    lg:   'px-6 py-3 text-base gap-2',
    icon: 'p-2 gap-0',
};

const Spinner = () => (
    <svg className="animate-spin size-4 shrink-0" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
);

export function AppButton({
    variant = 'primary',
    size = 'md',
    loading = false,
    icon,
    iconRight,
    children,
    className = '',
    disabled,
    ...props
}: AppButtonProps) {
    const isDisabled = disabled || loading;

    return (
        <button
            {...props}
            disabled={isDisabled}
            className={[
                'inline-flex items-center justify-center font-medium transition-all',
                'disabled:opacity-50 disabled:pointer-events-none cursor-pointer',
                variantClass[variant],
                sizeClass[size],
                className,
            ].join(' ')}
        >
            {loading ? <Spinner /> : icon}
            {children}
            {!loading && iconRight}
        </button>
    );
}
