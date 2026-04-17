'use client';

import { useState, useEffect, useRef } from 'react';
import { AppModal } from './app-modal';
import { AppButton } from './app-button';

interface InputModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (value: string) => void;
    title: string;
    placeholder?: string;
    defaultValue?: string;
    submitText?: string;
    cancelText?: string;
    isLoading?: boolean;
}

export function InputModal({
    isOpen,
    onClose,
    onSubmit,
    title,
    placeholder = '',
    defaultValue = '',
    submitText = 'Simpan',
    cancelText = 'Batal',
    isLoading = false,
}: InputModalProps) {
    const [value, setValue] = useState(defaultValue);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            setValue(defaultValue);
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen, defaultValue]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (value.trim()) {
            onSubmit(value.trim());
        }
    };

    const footer = (
        <>
            <AppButton
                type="button"
                variant="secondary"
                onClick={onClose}
                disabled={isLoading}
            >
                {cancelText}
            </AppButton>
            <AppButton
                type="submit"
                form="input-modal-form"
                variant="primary"
                loading={isLoading}
                disabled={isLoading || !value.trim()}
            >
                {submitText}
            </AppButton>
        </>
    );

    return (
        <AppModal isOpen={isOpen} onClose={onClose} title={title} size="sm" footer={footer}>
            <form id="input-modal-form" onSubmit={handleSubmit}>
                <input
                    ref={inputRef}
                    type="text"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder={placeholder}
                    className="w-full px-4 py-3 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all"
                    required
                />
            </form>
        </AppModal>
    );
}
