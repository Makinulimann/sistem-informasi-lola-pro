'use client';

import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { AppButton } from './app-button';

/* ═══════════════════════════════════════════ */
/*  Types                                      */
/* ═══════════════════════════════════════════ */

type ModalSize = 'sm' | 'md' | 'lg' | 'xl';

export interface AppModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    footer?: React.ReactNode;
    size?: ModalSize;
    /** Set to true to prevent closing when clicking backdrop */
    disableBackdropClose?: boolean;
}

const sizeClass: Record<ModalSize, string> = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
};

/* ═══════════════════════════════════════════ */
/*  Component                                  */
/* ═══════════════════════════════════════════ */

export function AppModal({
    isOpen,
    onClose,
    title,
    children,
    footer,
    size = 'md',
    disableBackdropClose = false,
}: AppModalProps) {
    /* Close on Escape key */
    useEffect(() => {
        if (!isOpen) return;
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleKey);
        return () => document.removeEventListener('keydown', handleKey);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
                onClick={disableBackdropClose ? undefined : onClose}
            />

            {/* Modal — no rounded, no shadow */}
            <div
                className={[
                    'relative bg-white w-full flex flex-col max-h-[90vh]',
                    'animate-in fade-in zoom-in-95 duration-200',
                    sizeClass[size],
                ].join(' ')}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
                    <h2 className="text-lg font-bold text-gray-800">{title}</h2>
                    <AppButton
                        variant="ghost"
                        size="icon"
                        onClick={onClose}
                        icon={<X className="size-5" />}
                        className="text-gray-400 hover:text-gray-600"
                        type="button"
                    />
                </div>

                {/* Scrollable Body */}
                <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                    {children}
                </div>

                {/* Footer (optional) */}
                {footer && (
                    <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 shrink-0">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
}
