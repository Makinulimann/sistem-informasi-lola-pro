'use client';

import { useState, useEffect, type ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { navigation, type NavSection, type NavChild } from '@/lib/navigation';
import { api, auth, ApiError } from '@/lib/api';
import { jwtDecode } from 'jwt-decode';
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
                className={`flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors duration-150 rounded-lg mx-2
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
                className={`flex items-center gap-3 w-full px-4 py-2.5 text-sm font-medium transition-colors duration-150 rounded-lg mx-2
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
        const token = auth.getToken();
        if (token) {
            try {
                const decoded: any = jwtDecode(token);
                setRole(decoded.role || null);
            } catch (error) {
                console.error("Failed to decode token:", error);
                setRole(null);
            }
        }
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
        const roleAccess = item.roleAccess;
        if (roleAccess && roleAccess !== 'All') {
            const allowedRoles = roleAccess.split(',').map((r: string) => r.trim());
            return role && allowedRoles.includes(role);
        }
        return true;
    });

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
                        <Image src="/images/logo-PG.png" alt="Petrokimia Gresik" width={36} height={36} className="object-contain" />
                        <div>
                            <p className="text-sm font-bold text-white leading-tight">SIPPro</p>
                            <p className="text-[11px] text-emerald-300/70 leading-tight">Pengelolaan Produk</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="lg:hidden text-emerald-200 hover:text-white">
                        <CloseIcon />
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto py-4 space-y-1 scrollbar-dark">
                    {filteredNavigation.map((section) => (
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
    const [user, setUser] = useState<{ fullName: string; role: string } | null>(null);

    // Fetch user on mount
    useEffect(() => {
        const fetchUser = async () => {
            try {
                // We're casting here for simplicity, assuming the API returns this shape
                const data = await api.get<{ fullName: string; role: string }>('/auth/me');
                setUser(data);
            } catch (err) {
                // Ignore 401/403 (Unauthorized/Forbidden) - just means user is not logged in
                if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
                    return;
                }
                console.error('Failed to fetch user', err);
            }
        };
        fetchUser();
    }, []);

    const handleLogout = () => {
        auth.removeToken();
        // Force full reload to clear any memory state
        window.location.href = '/';
    };

    return (
        <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-6 bg-white border-b border-gray-200 shadow-sm">
            <div className="flex items-center gap-4">
                <button
                    onClick={onMenuToggle}
                    className="lg:hidden p-1.5 rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                >
                    <MenuIcon />
                </button>
            </div>
            <div className="flex items-center gap-3">
                <DropdownMenu>
                    <DropdownMenuTrigger className="outline-none">
                        <div className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors">
                            <div className="text-right hidden sm:block">
                                <p className="text-sm font-semibold text-gray-700 leading-none">
                                    {user?.fullName || 'User'}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                    {user?.role || 'Guest'}
                                </p>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center text-white text-sm font-semibold shadow-sm ring-2 ring-white">
                                {user?.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
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
