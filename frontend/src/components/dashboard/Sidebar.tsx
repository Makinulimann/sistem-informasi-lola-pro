'use client';

import { useState, useEffect, type ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { navigation, type NavSection, type NavChild } from '@/lib/navigation';
import { api, auth, ApiError } from '@/lib/api';
import { LogOut, Settings, User, ChevronDown as ChevronDownIcon } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

/* ─── Icons (inline SVGs) ─── */

function DashboardIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
    );
}

function PackageIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16.5 9.4L7.5 4.21" />
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            <polyline points="3.29 7 12 12 20.71 7" />
            <line x1="12" y1="22" x2="12" y2="12" />
        </svg>
    );
}

function LayersIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 2 7 12 12 22 7 12 2" />
            <polyline points="2 17 12 22 22 17" />
            <polyline points="2 12 12 17 22 12" />
        </svg>
    );
}

function FlaskIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 3h6" />
            <path d="M10 9V3" />
            <path d="M14 9V3" />
            <path d="M6.864 18.364 10 9h4l3.136 9.364a2 2 0 0 1-1.894 2.636H8.758a2 2 0 0 1-1.894-2.636Z" />
        </svg>
    );
}

function UsersIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
    );
}

function ChevronDown({ open }: { open: boolean }) {
    return (
        <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
                transition: 'transform 200ms ease',
                transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            }}
        >
            <polyline points="6 9 12 15 18 9" />
        </svg>
    );
}

function MenuIcon() {
    return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
    );
}

function CloseIcon() {
    return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
    );
}

const iconMap: Record<string, () => ReactNode> = {
    dashboard: DashboardIcon,
    package: PackageIcon,
    layers: LayersIcon,
    flask: FlaskIcon,
    users: UsersIcon,
};

/* ─── Sub-item links (Bahan Baku, Produksi, Analisa) ─── */

function SubItemLink({ label, href, pathname }: { label: string; href: string; pathname: string }) {
    const isActive = pathname === href;
    return (
        <Link
            href={href}
            className={`block py-1.5 pl-12 pr-3 text-[13px] transition-colors duration-150
        ${isActive
                    ? 'text-amber-400 font-semibold'
                    : 'text-emerald-100/70 hover:text-white hover:bg-white/5'
                }`}
        >
            {label}
        </Link>
    );
}

/* ─── Child item (product name, collapsible) ─── */

function ChildItem({ child, pathname }: { child: NavChild; pathname: string }) {
    const isChildActive = child.children?.some((s) => pathname === s.href) ?? false;
    const [open, setOpen] = useState(isChildActive);

    if (!child.children) {
        return (
            <Link
                href={child.href ?? '#'}
                className={`block py-2 pl-10 pr-3 text-sm transition-colors duration-150
          ${pathname === child.href
                        ? 'text-amber-400 font-semibold'
                        : 'text-emerald-100/80 hover:text-white hover:bg-white/5'
                    }`}
            >
                {child.label}
            </Link>
        );
    }

    return (
        <div>
            <button
                onClick={() => setOpen((prev) => !prev)}
                className="flex items-center justify-between w-full py-2 pl-10 pr-3 text-sm text-emerald-100/80 hover:text-white hover:bg-white/5 transition-colors duration-150"
            >
                <span className={isChildActive ? 'text-amber-400 font-semibold' : ''}>{child.label}</span>
                <ChevronDown open={open} />
            </button>
            {open && (
                <div>
                    {child.children.map((sub) => (
                        <SubItemLink key={sub.href} label={sub.label} href={sub.href} pathname={pathname} />
                    ))}
                </div>
            )}
        </div>
    );
}

/* ─── Section (top-level nav item) ─── */

function SectionItem({ section, pathname }: { section: NavSection; pathname: string }) {
    const Icon = iconMap[section.icon];
    const isSectionActive =
        section.href === pathname ||
        section.children?.some(
            (c) => c.href === pathname || c.children?.some((s) => pathname === s.href)
        ) ||
        false;
    const [open, setOpen] = useState(isSectionActive);

    // Simple link (Dashboard)
    if (!section.children) {
        return (
            <Link
                href={section.href ?? '#'}
                className={`flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors duration-150 mx-2
          ${pathname === section.href
                        ? 'bg-amber-500/15 text-amber-400'
                        : 'text-emerald-100/90 hover:bg-white/8 hover:text-white'
                    }`}
            >
                {Icon && <Icon />}
                <span>{section.label}</span>
            </Link>
        );
    }

    // Collapsible section
    return (
        <div>
            <button
                onClick={() => setOpen((prev) => !prev)}
                className={`flex items-center gap-3 w-full px-4 py-2.5 text-sm font-medium transition-colors duration-150 mx-2
          ${isSectionActive
                        ? 'bg-white/8 text-white'
                        : 'text-emerald-100/90 hover:bg-white/8 hover:text-white'
                    }`}
                style={{ width: 'calc(100% - 1rem)' }}
            >
                {Icon && <Icon />}
                <span className="flex-1 text-left">{section.label}</span>
                <ChevronDown open={open} />
            </button>
            {open && (
                <div className="mt-0.5 mb-1">
                    {section.children.map((child) => (
                        <ChildItem key={child.label} child={child} pathname={pathname} />
                    ))}
                </div>
            )}
        </div>
    );
}

/* ─── Main Sidebar ─── */

export function Sidebar({
    mobileOpen,
    onClose,
}: {
    mobileOpen: boolean;
    onClose: () => void;
}) {
    const pathname = usePathname();
    const router = useRouter();
    const [role, setRole] = useState<string | null>(null);
    const [menuItems, setMenuItems] = useState<any[]>([]);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const data = await api.get<{ role: string }>('/auth/me');
                setRole(data.role || null);
            } catch (error) {
                setRole(null);
            }
        };
        fetchUser();
    }, []);

    // Fetch sidebar menu from API
    useEffect(() => {
        const fetchMenu = async () => {
            try {
                const items = await api.get<any[]>('/sidebar');
                if (items && items.length > 0) {
                    // Map API response to NavSection structure
                    const mapped: NavSection[] = items.map((item: any) => {
                        const strictRoleAccess = item.label === 'Portal Admin' ? 'Admin' : item.roleAccess;
                        const section: NavSection = {
                            label: item.label,
                            icon: item.icon || 'package',
                            roleAccess: strictRoleAccess,
                        };

                        if (item.children && item.children.length > 0) {
                            section.children = item.children.map((child: any) => {
                                const navChild: NavChild = {
                                    label: child.label,
                                };

                                if (child.children && child.children.length > 0) {
                                    // Level 3 sub-items (Bahan Baku, Produksi, etc.)
                                    navChild.children = child.children.map((sub: any) => ({
                                        label: sub.label,
                                        href: sub.href,
                                    }));
                                } else {
                                    // Simple link (no sub-items)
                                    navChild.href = child.href;
                                }

                                return navChild;
                            });
                        } else {
                            // Simple top-level link (Dashboard)
                            section.href = item.href;
                        }

                        return section;
                    });

                    // ── Post-process: Extract "Bahan Baku" from product sub-items ──
                    // Move it to a standalone menu entry under the parent section
                    for (const section of mapped) {
                        if (!section.children) continue;
                        // Check if any child has a "Bahan Baku" sub-item
                        const hasBahanBaku = section.children.some(
                            c => c.children?.some(s => s.label === 'Bahan Baku')
                        );
                        if (!hasBahanBaku) continue;

                        // Determine the base path for the standalone Bahan Baku page
                        // e.g., from /dashboard/produk-pengembangan/petro-gladiator/bahan-baku
                        // => /dashboard/produk-pengembangan/bahan-baku
                        let basePath = '';
                        for (const child of section.children) {
                            const bbItem = child.children?.find(s => s.label === 'Bahan Baku');
                            if (bbItem?.href) {
                                const parts = bbItem.href.split('/');
                                // Remove product slug and page type, keep category path
                                // e.g., ['', 'dashboard', 'produk-pengembangan', 'petro-gladiator', 'bahan-baku']
                                // => /dashboard/produk-pengembangan/bahan-baku
                                basePath = parts.slice(0, -2).join('/') + '/bahan-baku';
                                break;
                            }
                        }

                        // Remove "Bahan Baku" from each product's sub-items
                        for (const child of section.children) {
                            if (child.children) {
                                child.children = child.children.filter(s => s.label !== 'Bahan Baku');
                            }
                        }

                        // Insert standalone "Bahan Baku" at the top of children
                        if (basePath) {
                            section.children.unshift({
                                label: 'Bahan Baku',
                                href: basePath,
                            });
                        }
                    }
                    setMenuItems(mapped);
                } else {
                    setMenuItems(navigation);
                }
            } catch (err) {
                console.error("Failed to fetch sidebar", err);
                setMenuItems(navigation);
            }
        };
        fetchMenu();
    }, []);

    // Filter navigation items based on RoleAccess from DB
    const filteredNavigation = menuItems.filter((item: any) => {
        if (role === 'Riset') {
            return item.label !== 'Portal Admin';
        }
        const roleAccess = item.roleAccess;
        if (roleAccess && roleAccess !== 'All') {
            const allowedRoles = roleAccess.split(',').map((r: string) => r.trim());
            return role && allowedRoles.includes(role);
        }
        return true;
    });

    const risetNavigation: NavSection[] = [
        {
            label: 'Dashboard',
            icon: 'dashboard',
            href: '/dashboard',
        },
        {
            label: 'Analisa',
            icon: 'flask',
            href: '/dashboard/analisa',
        },
    ];

    const displayNavigation = role === 'Riset' ? risetNavigation : filteredNavigation;

    return (
        <>
            {/* Mobile overlay */}
            {mobileOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={onClose}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`fixed top-0 left-0 z-50 h-screen w-64 flex flex-col
          bg-gradient-to-b from-emerald-900 via-emerald-800 to-emerald-900
          border-r border-emerald-700/30
          transition-transform duration-300 ease-in-out
          lg:translate-x-0 lg:static lg:z-auto
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
            >
                {/* Logo area */}
                <div className="flex items-center justify-between px-4 py-4 border-b border-emerald-700/30">
                    <div className="flex items-center gap-3">
                        <Image src="/images/logo-PG.webp" alt="Petrokimia Gresik" width={36} height={36} className="object-contain" />
                        <div>
                            <p className="text-sm font-bold text-white leading-tight">SIPP</p>
                            <p className="text-[11px] text-emerald-300/70 leading-tight">Produk Pengembangan</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="lg:hidden text-emerald-200 hover:text-white">
                        <CloseIcon />
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto py-4 space-y-1 scrollbar-dark">
                    {displayNavigation.map((section) => (
                        <SectionItem key={section.label} section={section} pathname={pathname} />
                    ))}
                </nav>

                {/* Footer */}
                <div className="px-4 py-3 border-t border-emerald-700/30">
                    <p className="text-[11px] text-emerald-400/50 text-center">© 2026 PT Petrokimia Gresik</p>
                </div>
            </aside>
        </>
    );
}

/* ─── Dashboard Header ─── */



// ... (existing imports)

// ...

export function DashboardHeader({ onMenuToggle }: { onMenuToggle: () => void }) {
    const router = useRouter();
    const [user, setUser] = useState<{ fullName: string; role: string; photoUrl?: string | null } | null>(null);
    const [hasNewNotification, setHasNewNotification] = useState(false);
    const [notifOpen, setNotifOpen] = useState(false);
    const [notificationItems, setNotificationItems] = useState<{ id: number; productSlug: string; noBAPC: string; tanggalSampling: string; hasilAnalisa: string }[]>([]);

    const fetchUser = async () => {
        try {
            const data = await api.get<{ fullName: string; role: string; photoUrl?: string | null }>('/auth/me');
            setUser(data);
        } catch (err) {
            if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
                return;
            }
            console.error('Failed to fetch user', err);
        }
    };

    // Check for new pending or verified analisa data
    const checkNotifications = async () => {
        if (!user?.role) return;
        try {
            const res = await api.get<{ data: { id: number; productSlug: string; noBAPC: string; hasilAnalisa: string; tanggalSampling: string }[] }>('/Analisa/all');
            const allData = res.data || [];

            if (user.role === 'Riset') {
                const pending = allData.filter(d => d.hasilAnalisa === 'Pending');
                setNotificationItems(pending.map(p => ({
                    id: p.id,
                    productSlug: p.productSlug,
                    noBAPC: p.noBAPC,
                    tanggalSampling: p.tanggalSampling,
                    hasilAnalisa: p.hasilAnalisa
                })));
                const seenIds: number[] = JSON.parse(localStorage.getItem('sippro_seen_analisa') || '[]');
                const hasUnseen = pending.some(p => !seenIds.includes(p.id));
                setHasNewNotification(hasUnseen);
            } else if (user.role === 'KPP') {
                const verified = allData.filter(d => d.hasilAnalisa === 'Lolos' || d.hasilAnalisa === 'Tidak Lolos');
                setNotificationItems(verified.map(p => ({
                    id: p.id,
                    productSlug: p.productSlug,
                    noBAPC: p.noBAPC,
                    tanggalSampling: p.tanggalSampling,
                    hasilAnalisa: p.hasilAnalisa
                })));
                const seenIds: number[] = JSON.parse(localStorage.getItem('sippro_seen_kpp_analisa') || '[]');
                const hasUnseen = verified.some(p => !seenIds.includes(p.id));
                setHasNewNotification(hasUnseen);
            }
        } catch (err) {
            console.error('Failed to check notifications', err);
        }
    };

    // Fetch user on mount and listen to updates
    useEffect(() => {
        fetchUser();

        if (typeof window !== 'undefined') {
            window.addEventListener('profile-updated', fetchUser);
            return () => {
                window.removeEventListener('profile-updated', fetchUser);
            };
        }
    }, []);

    // Poll notifications for Riset and KPP roles
    useEffect(() => {
        if (!user?.role || (user.role !== 'Riset' && user.role !== 'KPP')) return;

        checkNotifications();
        const interval = setInterval(checkNotifications, 60000); // every 60s

        // Listen for analisa-seen events
        const handleSeen = () => {
            setHasNewNotification(false);
        };
        window.addEventListener('analisa-seen', handleSeen);

        return () => {
            clearInterval(interval);
            window.removeEventListener('analisa-seen', handleSeen);
        };
    }, [user]);

    const handleNotifClick = () => {
        setNotifOpen(prev => !prev);
        if (hasNewNotification && user?.role) {
            const storageKey = user.role === 'Riset' ? 'sippro_seen_analisa' : 'sippro_seen_kpp_analisa';
            const seenIds: number[] = JSON.parse(localStorage.getItem(storageKey) || '[]');
            const allIds = [...new Set([...seenIds, ...notificationItems.map(p => p.id)])];
            localStorage.setItem(storageKey, JSON.stringify(allIds));
            setHasNewNotification(false);
        }
    };

    // Close notif dropdown on outside click
    useEffect(() => {
        if (!notifOpen) return;
        const handleClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (!target.closest('.notif-dropdown-container')) {
                setNotifOpen(false);
            }
        };
        document.addEventListener('click', handleClick);
        return () => document.removeEventListener('click', handleClick);
    }, [notifOpen]);

    const handleLogout = async () => {
        try {
            await api.post('/auth/logout', {});
        } catch (err) {
            console.error('Failed to log out server-side:', err);
        }
        auth.removeToken();
        // Force full reload to clear any memory state
        window.location.href = '/';
    };

    const formatDateShort = (dateStr: string | null): string => {
        if (!dateStr) return '—';
        const d = new Date(dateStr);
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yyyy = d.getFullYear();
        return `${dd}/${mm}/${yyyy}`;
    };

    const getProductLabel = (slug: string): string => {
        const labels: Record<string, string> = {
            'petro-gladiator': 'Petro Gladiator',
            'bio-fertil': 'Bio Fertil',
            'petro-fish': 'Petro Fish',
            'phonska-oca': 'Phonska Oca Plus',
            'petro-gladiator-cair': 'Petro Gladiator Cair',
        };
        return labels[slug] || slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    };

    const isRiset = user?.role === 'Riset';
    const isKpp = user?.role === 'KPP';

    return (
        <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-6 bg-white border-b border-gray-200 shadow-sm">
            <div className="flex items-center gap-4">
                <button
                    onClick={onMenuToggle}
                    className="lg:hidden p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                >
                    <MenuIcon />
                </button>
            </div>
            <div className="flex items-center gap-3">
                {/* ─── Notification Bell (Riset & KPP only) ─── */}
                {(isRiset || isKpp) && (
                    <div className="relative notif-dropdown-container">
                        <button
                            onClick={handleNotifClick}
                            className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
                            title="Notifikasi"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                            </svg>
                            {/* Red dot indicator */}
                            {hasNewNotification && (
                                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-white animate-pulse" />
                            )}
                        </button>

                        {/* Notification Dropdown */}
                        {notifOpen && (
                            <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-xl z-50 overflow-hidden">
                                <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
                                    <h3 className="text-sm font-semibold text-gray-800">Notifikasi</h3>
                                    <p className="text-xs text-gray-400 mt-0.5">
                                        {isRiset ? 'Data analisa menunggu verifikasi' : 'Hasil analisa baru terverifikasi'}
                                    </p>
                                </div>
                                <div className="max-h-72 overflow-y-auto">
                                    {notificationItems.length === 0 ? (
                                        <div className="px-4 py-8 text-center">
                                            <div className="w-10 h-10 rounded-full bg-emerald-50 mx-auto mb-2 flex items-center justify-center">
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                                                    <polyline points="22 4 12 14.01 9 11.01" />
                                                </svg>
                                            </div>
                                            <p className="text-sm text-gray-500 font-medium">
                                                {isRiset ? 'Semua data sudah diverifikasi' : 'Belum ada hasil analisa baru'}
                                            </p>
                                            <p className="text-xs text-gray-400 mt-0.5">
                                                {isRiset ? 'Tidak ada data pending saat ini' : 'Semua update telah dibaca'}
                                            </p>
                                        </div>
                                    ) : (
                                        notificationItems.slice(0, 10).map(item => (
                                            <div
                                                key={item.id}
                                                className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-0 transition-colors"
                                                onClick={() => {
                                                    setNotifOpen(false);
                                                    if (isRiset) {
                                                        router.push('/dashboard/analisa');
                                                    } else {
                                                        router.push(`/dashboard/produk-pengembangan/${item.productSlug}/analisa`);
                                                    }
                                                }}
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium text-gray-800 truncate">
                                                            {getProductLabel(item.productSlug)}
                                                        </p>
                                                        <p className="text-xs text-gray-500 mt-0.5">
                                                            Batch {item.noBAPC} · {formatDateShort(item.tanggalSampling)}
                                                        </p>
                                                    </div>
                                                    <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-bold rounded-full flex-shrink-0 ${
                                                        item.hasilAnalisa === 'Pending'
                                                            ? 'bg-amber-100 text-amber-700'
                                                            : item.hasilAnalisa === 'Lolos'
                                                                ? 'bg-emerald-100 text-emerald-700'
                                                                : 'bg-red-100 text-red-700'
                                                    }`}>
                                                        {item.hasilAnalisa}
                                                    </span>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                                {notificationItems.length > 0 && (
                                    <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50/30">
                                        <button
                                            onClick={() => {
                                                setNotifOpen(false);
                                                if (isRiset) {
                                                    router.push('/dashboard/analisa');
                                                } else {
                                                    router.push('/dashboard');
                                                }
                                            }}
                                            className="w-full text-center text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
                                        >
                                            {isRiset 
                                                ? `Lihat semua (${notificationItems.length} pending) →` 
                                                : `Lihat dashboard →`}
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* ─── Profile Dropdown ─── */}
                <DropdownMenu>
                    <DropdownMenuTrigger className="outline-none">
                        <div className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 transition-colors">
                            <div className="text-right hidden sm:block">
                                <p className="text-sm font-semibold text-gray-700 leading-none">
                                    {user?.fullName || 'User'}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                    {user?.role || 'Guest'}
                                </p>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-emerald-600 overflow-hidden flex items-center justify-center text-white text-sm font-semibold shadow-sm ring-2 ring-white">
                                {user?.photoUrl ? (
                                    <img src={user.photoUrl} alt={user.fullName} className="w-full h-full object-cover" />
                                ) : (
                                    user?.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'
                                )}
                            </div>
                        </div>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuLabel>My Account</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="cursor-pointer" asChild>
                            <Link href="/dashboard/settings" className="flex items-center w-full">
                                <Settings className="mr-2 h-4 w-4" />
                                <span>Settings</span>
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50">
                            <LogOut className="mr-2 h-4 w-4" />
                            <span>Log out</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    );
}

