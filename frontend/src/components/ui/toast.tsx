'use client';

import { useEffect, useState, createContext, useContext, useCallback, ReactNode } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

/* ═══════════════════════════════════════════ */
/*  Types                                      */
/* ═══════════════════════════════════════════ */

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
    id: string;
    type: ToastType;
    title: string;
    message?: string;
    duration?: number;
}

interface ToastContextType {
    toast: (type: ToastType, title: string, message?: string, duration?: number) => void;
    success: (title: string, message?: string) => void;
    error: (title: string, message?: string) => void;
    warning: (title: string, message?: string) => void;
    info: (title: string, message?: string) => void;
}

/* ═══════════════════════════════════════════ */
/*  Context                                    */
/* ═══════════════════════════════════════════ */

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error('useToast must be used within ToastProvider');
    return ctx;
}

/* ═══════════════════════════════════════════ */
/*  Provider                                   */
/* ═══════════════════════════════════════════ */

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const addToast = useCallback(
        (type: ToastType, title: string, message?: string, duration = 4000) => {
            const id = Math.random().toString(36).slice(2);
            setToasts((prev) => [...prev, { id, type, title, message, duration }]);
        },
        []
    );

    const api: ToastContextType = {
        toast: addToast,
        success: (t, m) => addToast('success', t, m),
        error: (t, m) => addToast('error', t, m),
        warning: (t, m) => addToast('warning', t, m),
        info: (t, m) => addToast('info', t, m),
    };

    return (
        <ToastContext.Provider value={api}>
            {children}
            {/* Toast Container */}
            <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
                {toasts.map((t) => (
                    <ToastItem key={t.id} toast={t} onDismiss={() => removeToast(t.id)} />
                ))}
            </div>
        </ToastContext.Provider>
    );
}

/* ═══════════════════════════════════════════ */
/*  Toast Item                                 */
/* ═══════════════════════════════════════════ */

const iconMap = {
    success: CheckCircle,
    error: XCircle,
    warning: AlertTriangle,
    info: Info,
};

const colorMap = {
    success: {
        bg: 'bg-emerald-50 border-emerald-200',
        icon: 'text-emerald-500',
        title: 'text-emerald-800',
        msg: 'text-emerald-600',
    },
    error: {
        bg: 'bg-red-50 border-red-200',
        icon: 'text-red-500',
        title: 'text-red-800',
        msg: 'text-red-600',
    },
    warning: {
        bg: 'bg-amber-50 border-amber-200',
        icon: 'text-amber-500',
        title: 'text-amber-800',
        msg: 'text-amber-600',
    },
    info: {
        bg: 'bg-blue-50 border-blue-200',
        icon: 'text-blue-500',
        title: 'text-blue-800',
        msg: 'text-blue-600',
    },
};

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
    const [isVisible, setIsVisible] = useState(false);
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        requestAnimationFrame(() => setIsVisible(true));
        const timer = setTimeout(() => {
            setIsExiting(true);
            setTimeout(onDismiss, 300);
        }, toast.duration || 4000);
        return () => clearTimeout(timer);
    }, [toast.duration, onDismiss]);

    const Icon = iconMap[toast.type];
    const colors = colorMap[toast.type];

    return (
        <div
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-lg backdrop-blur-sm transition-all duration-300 ${colors.bg} ${isVisible && !isExiting
                    ? 'translate-x-0 opacity-100'
                    : 'translate-x-full opacity-0'
                }`}
        >
            <Icon className={`size-5 mt-0.5 shrink-0 ${colors.icon}`} />
            <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold ${colors.title}`}>{toast.title}</p>
                {toast.message && (
                    <p className={`text-xs mt-0.5 ${colors.msg}`}>{toast.message}</p>
                )}
            </div>
            <button
                onClick={() => { setIsExiting(true); setTimeout(onDismiss, 300); }}
                className="p-1 rounded-md hover:bg-black/5 transition-colors shrink-0"
            >
                <X className="size-3.5 text-gray-400" />
            </button>
        </div>
    );
}
