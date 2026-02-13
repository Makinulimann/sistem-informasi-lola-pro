'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
    Plus,
    Trash2,
    Edit,
    Save,
    X,
    Search,
    ChevronLeft,
    ChevronRight,
    ArrowUpDown,
    MoreHorizontal,
    LayoutDashboard,
    FolderTree,
    Shield,
    Eye,
    EyeOff
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/badge';
import { sidebarService, SidebarMenu } from '@/lib/sidebarService';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
    PopoverAnchor,
} from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

// Internal Searchable Select Component (Combobox Style)
function ParentSelector({
    value,
    onChange,
    options,
    level
}: {
    value?: number | null;
    onChange: (val: number | undefined) => void;
    options: { id: number; label: string }[];
    level: number;
}) {
    const [open, setOpen] = useState(false);
    const [inputValue, setInputValue] = useState("");

    // Sync input with selected value when controlled value changes
    useEffect(() => {
        const selected = options.find(o => o.id === value);
        if (selected) {
            setInputValue(selected.label);
        } else if (!value) {
            setInputValue("");
        }
    }, [value, options]);

    const filteredOptions = options.filter(opt =>
        opt.label.toLowerCase().includes(inputValue.toLowerCase())
    );

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverAnchor asChild>
                <div className="relative">
                    <Input
                        value={inputValue}
                        onChange={(e) => {
                            setInputValue(e.target.value);
                            setOpen(true);
                            if (!e.target.value) onChange(undefined);
                        }}
                        onFocus={() => setOpen(true)}
                        onClick={() => setOpen(true)}
                        placeholder={`— Pilih Parent (${filteredOptions.length} opsi) —`}
                        className="pr-8 cursor-text bg-white"
                    />
                    <ChevronsUpDown className="absolute right-2 top-2.5 h-4 w-4 text-gray-400 opacity-50 pointer-events-none" />
                </div>
            </PopoverAnchor>
            <PopoverContent
                className="w-[--radix-popover-trigger-width] p-0"
                align="start"
                onOpenAutoFocus={(e) => e.preventDefault()}
                collisionPadding={10}
            >
                <div className="max-h-[200px] overflow-y-auto p-1">
                    {filteredOptions.length === 0 ? (
                        <p className="p-2 text-xs text-center text-gray-500">
                            {inputValue ? "Tidak ditemukan." : "Ketik untuk mencari..."}
                        </p>
                    ) : (
                        filteredOptions.map((option) => (
                            <div
                                key={option.id}
                                onClick={() => {
                                    onChange(option.id);
                                    setInputValue(option.label);
                                    setOpen(false);
                                }}
                                className={cn(
                                    "flex items-center px-2 py-2 text-sm rounded-sm cursor-pointer transition-colors hover:bg-emerald-50 hover:text-emerald-700",
                                    value === option.id ? "bg-emerald-50 text-emerald-700 font-medium" : "text-gray-700"
                                )}
                            >
                                <Check
                                    className={cn(
                                        "mr-2 h-4 w-4",
                                        value === option.id ? "opacity-100" : "opacity-0"
                                    )}
                                />
                                {option.label}
                            </div>
                        ))
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
}

export default function SidebarManagementPage() {
    const [menus, setMenus] = useState<SidebarMenu[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('All');

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Sorting state
    const [sortConfig, setSortConfig] = useState<{ key: keyof SidebarMenu; direction: 'asc' | 'desc' } | null>({ key: 'order', direction: 'asc' });

    // Editing / Creating state
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editForm, setEditForm] = useState<Partial<SidebarMenu>>({});
    const [isCreating, setIsCreating] = useState(false);
    const [createStep, setCreateStep] = useState<1 | 2 | 3>(1);
    const [createLevel, setCreateLevel] = useState<1 | 2 | 3>(1);
    const [createMenuType, setCreateMenuType] = useState<'page' | 'with-children'>('page');
    const [newMenu, setNewMenu] = useState<Partial<SidebarMenu>>({
        label: '',
        icon: 'package',
        href: '#',
        order: 0,
        isActive: true,
        roleAccess: 'All'
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const availableRoles = ['Admin', 'VP', 'KPP', 'KP', 'KNP'];

    const defaultLevel3Labels = ['Bahan Baku', 'Produksi', 'Analisa', 'RKAP'];

    // Helper: slugify label for href generation
    const slugify = (text: string) =>
        text.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    // Helper: get items at a specific depth
    const getItemsAtDepth = (depth: number) =>
        menus.filter(m => getDepth(m, menus) === depth);

    // Helper: calculate next order among siblings
    const getNextOrder = (parentId?: number | null) => {
        const siblings = menus.filter(m =>
            parentId ? m.parentId === parentId : !m.parentId
        );
        return siblings.length > 0 ? Math.max(...siblings.map(s => s.order)) + 1 : 1;
    };

    // Helper: build href based on level and parent chain
    const buildHref = (label: string, parentId?: number | null): string => {
        if (!parentId) return `/dashboard/${slugify(label)}`;

        const parent = menus.find(m => m.id === parentId);
        if (!parent) return `/dashboard/${slugify(label)}`;

        const grandParent = parent.parentId ? menus.find(m => m.id === parent.parentId) : null;

        if (grandParent) {
            // Level 3: /dashboard/{grandparent-slug}/{parent-slug}/{label-slug}
            const gpParent = grandParent.parentId ? menus.find(m => m.id === grandParent.parentId) : null;
            const basePath = grandParent.href !== '#' ? grandParent.href : `/dashboard/${slugify(grandParent.label)}`;
            return `${basePath}/${slugify(label)}`;
        }

        // Level 2: Use parent's existing path structure or build from parent label
        const l1 = menus.find(m => m.id === parentId);
        if (!l1) return `/dashboard/${slugify(label)}`;

        // Find the category path from existing siblings or parent
        const existingSiblings = menus.filter(m => m.parentId === parentId);
        const siblingWithHref = existingSiblings.find(s => s.href && s.href !== '#');
        if (siblingWithHref) {
            const parts = siblingWithHref.href.split('/');
            parts.pop();
            return `${parts.join('/')}/${slugify(label)}`;
        }

        // Derive from parent label
        return `/dashboard/${slugify(l1.label)}/${slugify(label)}`;
    };

    // Reset create form
    const resetCreateForm = () => {
        setIsCreating(false);
        setCreateStep(1);
        setCreateLevel(1);
        setCreateMenuType('page');
        setNewMenu({ label: '', icon: 'package', href: '#', order: 0, isActive: true, roleAccess: 'All', parentId: undefined });
    };

    // Enhanced create handler
    const handleCreate = async () => {
        if (!newMenu.label?.trim()) return;
        setIsSubmitting(true);
        try {
            const parentId = newMenu.parentId || null;
            const order = getNextOrder(parentId);
            const icon = createLevel === 1 ? 'package' : '';
            const isWithChildren = (createLevel === 1 || createLevel === 2) && createMenuType === 'with-children';
            const href = isWithChildren ? '#' : buildHref(newMenu.label!, parentId);

            if (createLevel === 2 && createMenuType === 'with-children') {
                // Build href for L3 children based on L2 parent path
                const l2BasePath = buildHref(newMenu.label!, parentId);
                const children = defaultLevel3Labels.map(childLabel => ({
                    label: childLabel,
                    icon: '',
                    href: `${l2BasePath}/${slugify(childLabel)}`,
                }));

                await sidebarService.createWithChildren({
                    label: newMenu.label!,
                    icon,
                    href: '#',
                    parentId: parentId,
                    order,
                    roleAccess: newMenu.roleAccess || 'All',
                    children,
                });
            } else {
                await sidebarService.create({
                    ...newMenu,
                    icon,
                    href,
                    order,
                    parentId: parentId,
                });
            }

            resetCreateForm();
            loadMenus();
        } catch (error) {
            console.error("Failed to create menu", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    useEffect(() => {
        loadMenus();
    }, []);

    const loadMenus = async () => {
        setLoading(true);
        try {
            const data = await sidebarService.getAllFlat();
            setMenus(data);
        } catch (error) {
            console.error("Failed to load menus", error);
        } finally {
            setLoading(false);
        }
    };

    // Helper to calculate depth
    const getDepth = (item: SidebarMenu, allItems: SidebarMenu[]): number => {
        if (!item.parentId) return 0;
        const parent = allItems.find(i => i.id === item.parentId);
        if (!parent) return 0; // Should not happen if integrity is good
        return 1 + getDepth(parent, allItems);
    };

    // Processed Data (Filtered -> Sorted -> Paginated)
    const processedData = useMemo(() => {
        let data = [...menus];

        // 1. Filter Level 3 Items (Hide Depth >= 2)
        // Depth 0: Dashboard, Portal Admin (Top)
        // Depth 1: Manajemen User, Nitrea 5Kg (Child)
        // Depth 2: Bahan Baku (Sub-item) -> Hide this
        data = data.filter(item => {
            const depth = getDepth(item, menus);
            return depth < 2;
        });

        // 2. Filter by Search & Role
        if (searchTerm) {
            const lowerTerm = searchTerm.toLowerCase();
            data = data.filter(item =>
                item.label.toLowerCase().includes(lowerTerm) ||
                item.href.toLowerCase().includes(lowerTerm)
            );
        }

        if (roleFilter !== 'All') {
            data = data.filter(item =>
                item.roleAccess === 'All' ||
                (item.roleAccess && item.roleAccess.includes(roleFilter))
            );
        }

        // 3. Sort
        if (sortConfig) {
            data.sort((a, b) => {
                const aValue = a[sortConfig.key];
                const bValue = b[sortConfig.key];

                if (aValue === bValue) return 0;

                // Handle different types
                if (typeof aValue === 'number' && typeof bValue === 'number') {
                    return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
                }

                const aString = String(aValue).toLowerCase();
                const bString = String(bValue).toLowerCase();

                if (aString < bString) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aString > bString) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return data;
    }, [menus, searchTerm, roleFilter, sortConfig]);

    // Pagination Logic
    const totalPages = Math.ceil(processedData.length / itemsPerPage);
    const paginatedData = processedData.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const handleSort = (key: keyof SidebarMenu) => {
        setSortConfig(current => ({
            key,
            direction: current?.key === key && current.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const startEdit = (menu: SidebarMenu) => {
        setEditingId(menu.id);
        setEditForm({ ...menu });
    };




    const handleUpdate = async (id: number) => {
        try {
            await sidebarService.update(id, editForm);
            setEditingId(null);
            loadMenus();
        } catch (error) {
            console.error("Failed to update menu", error);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Apakah Anda yakin ingin menghapus menu ini?')) return;
        try {
            await sidebarService.delete(id);
            loadMenus();
        } catch (error) {
            console.error("Failed to delete menu", error);
        }
    };

    const toggleActive = async (menu: SidebarMenu) => {
        // Optimistic Update
        const oldStatus = menu.isActive;
        const newStatus = !oldStatus;

        setMenus(current => current.map(m => m.id === menu.id ? { ...m, isActive: newStatus } : m));

        try {
            await sidebarService.update(menu.id, { ...menu, isActive: newStatus });
            // success, keep state
        } catch (error) {
            console.error("Failed to toggle active", error);
            // Revert
            setMenus(current => current.map(m => m.id === menu.id ? { ...m, isActive: oldStatus } : m));
        }
    };

    const toggleRoleInForm = (role: string, isCreate: boolean) => {
        const currentRoles = isCreate
            ? (newMenu.roleAccess === 'All' ? [] : newMenu.roleAccess?.split(',') || [])
            : (editForm.roleAccess === 'All' ? [] : editForm.roleAccess?.split(',') || []);

        let newRoles;
        if (currentRoles.includes(role)) {
            newRoles = currentRoles.filter(r => r !== role);
        } else {
            newRoles = [...currentRoles, role];
        }

        const roleString = newRoles.length > 0 ? newRoles.join(',') : 'All';

        if (isCreate) {
            setNewMenu({ ...newMenu, roleAccess: roleString });
        } else {
            setEditForm({ ...editForm, roleAccess: roleString });
        }
    };

    // Render Helpers
    const SortIcon = ({ column }: { column: keyof SidebarMenu }) => {
        if (sortConfig?.key !== column) return <ArrowUpDown className="w-3 h-3 ml-1 text-gray-400 opacity-50" />;
        return <ArrowUpDown className={`w-3 h-3 ml-1 ${sortConfig.direction === 'asc' ? 'text-emerald-600' : 'text-emerald-600 rotate-180'}`} />;
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                        <Shield className="w-6 h-6 text-emerald-600" />
                        Manajemen Sidebar
                    </h1>
                    <p className="text-sm text-gray-500 mt-1 ml-8">
                        Atur struktur navigasi dan hak akses role aplikasi.
                    </p>
                </div>
                <div className="flex gap-3">

                    <Button
                        onClick={() => setIsCreating(true)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md hover:shadow-lg transition-all"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Tambah Menu
                    </Button>
                </div>
            </div>

            {/* Controls Card */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative w-full md:max-w-md">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                    <Input
                        placeholder="Cari menu berdasarkan nama atau link..."
                        value={searchTerm}
                        onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                        className="pl-9 bg-gray-50 border-gray-200 focus:bg-white transition-colors"
                    />
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <span className="text-sm text-gray-500 whitespace-nowrap hidden md:inline">Filter Role:</span>
                    <select
                        className="h-10 w-full md:w-48 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all cursor-pointer"
                        value={roleFilter}
                        onChange={(e) => { setRoleFilter(e.target.value); setCurrentPage(1); }}
                    >
                        <option value="All">Semua Role</option>
                        {availableRoles.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                </div>
            </div>

            {/* Create Form - Wizard */}
            {isCreating && (
                <div className="bg-white p-5 md:p-6 rounded-xl border border-emerald-100 shadow-lg ring-1 ring-emerald-50 mb-0 animate-in slide-in-from-top-4 duration-300">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-5 pb-3 border-b border-gray-100">
                        <h3 className="font-semibold text-gray-800 flex items-center gap-2 text-base">
                            <Plus className="w-4 h-4 text-emerald-600" />
                            Buat Menu Baru
                        </h3>
                        <Button variant="ghost" size="sm" onClick={resetCreateForm} className="h-8 w-8 p-0 rounded-full hover:bg-red-50 hover:text-red-500">
                            <X className="w-4 h-4" />
                        </Button>
                    </div>

                    {/* Step Indicator */}
                    <div className="flex items-center gap-2 mb-6">
                        {[1, 2, 3].map((step) => (
                            <div key={step} className="flex items-center gap-2 flex-1">
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 shrink-0 ${createStep === step
                                    ? 'bg-emerald-600 text-white shadow-md scale-110'
                                    : createStep > step
                                        ? 'bg-emerald-100 text-emerald-700'
                                        : 'bg-gray-100 text-gray-400'
                                    }`}>
                                    {createStep > step ? '✓' : step}
                                </div>
                                <span className={`text-[11px] font-medium hidden sm:block transition-colors ${createStep >= step ? 'text-gray-700' : 'text-gray-400'
                                    }`}>
                                    {step === 1 ? 'Level' : step === 2 ? 'Konfigurasi' : 'Hak Akses'}
                                </span>
                                {step < 3 && <div className={`flex-1 h-px transition-colors ${createStep > step ? 'bg-emerald-300' : 'bg-gray-200'}`} />}
                            </div>
                        ))}
                    </div>

                    {/* Step 1: Choose Level */}
                    {createStep === 1 && (
                        <div className="space-y-3">
                            <p className="text-sm text-gray-500 mb-4">Pilih level menu yang ingin ditambahkan:</p>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                {[
                                    { level: 1 as const, title: 'Level 1', subtitle: 'Menu Utama', desc: 'Menu utama di sidebar (contoh: Produk Petroganik)', icon: '📁' },
                                    { level: 2 as const, title: 'Level 2', subtitle: 'Sub Menu', desc: 'Menu di bawah menu utama (contoh: Nitrea 5Kg)', icon: '📂' },
                                    { level: 3 as const, title: 'Level 3', subtitle: 'Halaman', desc: 'Halaman di bawah sub menu (contoh: Bahan Baku)', icon: '📄' },
                                ].map(({ level, title, subtitle, desc, icon }) => (
                                    <button
                                        key={level}
                                        onClick={() => { setCreateLevel(level); setCreateStep(2); setNewMenu(prev => ({ ...prev, parentId: undefined })); setCreateMenuType('page'); }}
                                        className={`group relative text-left p-4 rounded-xl border-2 transition-all duration-200 hover:shadow-md ${createLevel === level
                                            ? 'border-emerald-500 bg-emerald-50/50 shadow-sm'
                                            : 'border-gray-200 bg-white hover:border-emerald-300'
                                            }`}
                                    >
                                        <div className="text-2xl mb-2">{icon}</div>
                                        <p className="font-semibold text-sm text-gray-800">{title}</p>
                                        <p className="text-[11px] font-medium text-emerald-600 mb-1">{subtitle}</p>
                                        <p className="text-[11px] text-gray-400 leading-relaxed">{desc}</p>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Step 2: Configuration */}
                    {createStep === 2 && (
                        <div className="space-y-4">
                            <p className="text-sm text-gray-500">Konfigurasi menu Level {createLevel}:</p>

                            {/* Parent Selection for L2 and L3 */}
                            {createLevel >= 2 && (
                                <div>
                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">
                                        {createLevel === 2 ? 'Parent Menu (Level 1)' : 'Parent Menu (Level 2)'}
                                    </label>
                                    <ParentSelector
                                        level={createLevel}
                                        value={newMenu.parentId}
                                        onChange={(val) => setNewMenu({ ...newMenu, parentId: val })}
                                        options={getItemsAtDepth(createLevel - 2)
                                            .filter(m => m.href === '#') // Only allow containers (href='#') as parents
                                            .map(m => ({ id: m.id, label: m.label }))}
                                    />
                                </div>
                            )}

                            {/* Label */}
                            <div>
                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Nama Menu</label>
                                <Input
                                    placeholder={createLevel === 1 ? 'Contoh: Produk Baru' : createLevel === 2 ? 'Contoh: Nitrea 5Kg' : 'Contoh: Bahan Baku'}
                                    value={newMenu.label}
                                    onChange={e => setNewMenu({ ...newMenu, label: e.target.value })}
                                    className="border-gray-300 focus:border-emerald-500 h-10"
                                />
                            </div>

                            {/* Menu Type for L1 and L2 */}
                            {(createLevel === 1 || createLevel === 2) && (
                                <div>
                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Tipe Menu</label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <button
                                            onClick={() => setCreateMenuType('page')}
                                            className={`text-left p-3 rounded-lg border-2 transition-all duration-200 ${createMenuType === 'page'
                                                ? 'border-emerald-500 bg-emerald-50/50'
                                                : 'border-gray-200 hover:border-emerald-300'
                                                }`}
                                        >
                                            <div className="flex items-center gap-2 mb-1">
                                                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${createMenuType === 'page' ? 'border-emerald-500' : 'border-gray-300'}`}>
                                                    {createMenuType === 'page' && <div className="w-2 h-2 rounded-full bg-emerald-500" />}
                                                </div>
                                                <span className="text-sm font-medium text-gray-700">Halaman Baru</span>
                                            </div>
                                            <p className="text-[11px] text-gray-400 ml-6">Menu langsung menuju ke halaman (link otomatis)</p>
                                        </button>
                                        <button
                                            onClick={() => setCreateMenuType('with-children')}
                                            className={`text-left p-3 rounded-lg border-2 transition-all duration-200 ${createMenuType === 'with-children'
                                                ? 'border-emerald-500 bg-emerald-50/50'
                                                : 'border-gray-200 hover:border-emerald-300'
                                                }`}
                                        >
                                            <div className="flex items-center gap-2 mb-1">
                                                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${createMenuType === 'with-children' ? 'border-emerald-500' : 'border-gray-300'}`}>
                                                    {createMenuType === 'with-children' && <div className="w-2 h-2 rounded-full bg-emerald-500" />}
                                                </div>
                                                <span className="text-sm font-medium text-gray-700">Dengan Sub-Menu</span>
                                            </div>
                                            <p className="text-[11px] text-gray-400 ml-6">
                                                {createLevel === 2
                                                    ? 'Otomatis membuat sub halaman: Bahan Baku, Produksi, Analisa, RKAP'
                                                    : 'Menu yang memiliki child menu di bawahnya'}
                                            </p>
                                        </button>
                                    </div>

                                    {/* Preview default children for L2 with-children */}
                                    {createLevel === 2 && createMenuType === 'with-children' && (
                                        <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                                            <p className="text-[11px] font-semibold text-blue-700 mb-2 flex items-center gap-1">
                                                <FolderTree className="w-3 h-3" />
                                                Sub-halaman yang akan otomatis dibuat:
                                            </p>
                                            <div className="flex flex-wrap gap-2">
                                                {defaultLevel3Labels.map(label => (
                                                    <span key={label} className="px-2.5 py-1 bg-white rounded-md text-[11px] text-blue-700 border border-blue-200 font-medium">
                                                        {label}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step 3: Role Access */}
                    {createStep === 3 && (
                        <div className="space-y-4">
                            <p className="text-sm text-gray-500">Atur hak akses role untuk menu ini:</p>

                            {/* Summary */}
                            <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div>
                                        <span className="text-gray-400">Level:</span>
                                        <span className="ml-1 font-medium text-gray-700">{createLevel}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-400">Tipe:</span>
                                        <span className="ml-1 font-medium text-gray-700">
                                            {createLevel === 3 ? 'Halaman' : createMenuType === 'page' ? 'Halaman' : 'Dengan Sub-Menu'}
                                        </span>
                                    </div>
                                    <div className="col-span-2">
                                        <span className="text-gray-400">Nama:</span>
                                        <span className="ml-1 font-semibold text-gray-800">{newMenu.label}</span>
                                    </div>
                                    {newMenu.parentId && (
                                        <div className="col-span-2">
                                            <span className="text-gray-400">Parent:</span>
                                            <span className="ml-1 font-medium text-gray-700">
                                                {menus.find(m => m.id === newMenu.parentId)?.label || '-'}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 block">Hak Akses Role</span>
                                <div className="flex flex-wrap gap-2">
                                    {availableRoles.map(role => (
                                        <button
                                            key={role}
                                            onClick={() => toggleRoleInForm(role, true)}
                                            className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-all duration-200 ${(newMenu.roleAccess?.split(',').includes(role) && newMenu.roleAccess !== 'All')
                                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                                : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-300 hover:text-emerald-700'
                                                }`}
                                        >
                                            {role}
                                        </button>
                                    ))}
                                    <button
                                        onClick={() => setNewMenu({ ...newMenu, roleAccess: 'All' })}
                                        className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-all duration-200 ${newMenu.roleAccess === 'All'
                                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                            : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-700'}`}
                                    >
                                        All (Public)
                                    </button>
                                </div>
                                <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                                    <Shield className="w-3 h-3" />
                                    Akses saat ini: <span className="text-gray-700 font-medium">{newMenu.roleAccess}</span>
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Navigation Buttons */}
                    <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
                        <div>
                            {createStep > 1 && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCreateStep((createStep - 1) as 1 | 2 | 3)}
                                    className="text-gray-600"
                                >
                                    <ChevronLeft className="w-4 h-4 mr-1" />
                                    Kembali
                                </Button>
                            )}
                        </div>
                        <div className="flex gap-3">
                            <Button variant="outline" size="sm" onClick={resetCreateForm}>Batal</Button>
                            {createStep < 3 ? (
                                <Button
                                    size="sm"
                                    onClick={() => setCreateStep((createStep + 1) as 1 | 2 | 3)}
                                    disabled={
                                        (createStep === 1 && !createLevel) ||
                                        (createStep === 2 && (!newMenu.label?.trim() || (createLevel >= 2 && !newMenu.parentId)))
                                    }
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-4"
                                >
                                    Lanjut
                                    <ChevronRight className="w-4 h-4 ml-1" />
                                </Button>
                            ) : (
                                <Button
                                    size="sm"
                                    onClick={handleCreate}
                                    disabled={isSubmitting}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-5"
                                >
                                    {isSubmitting ? (
                                        <span className="flex items-center gap-2">
                                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Menyimpan...
                                        </span>
                                    ) : (
                                        <>
                                            <Save className="w-4 h-4 mr-1" />
                                            Simpan Menu
                                        </>
                                    )}
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Data Table */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead>
                            <tr className="bg-gray-50/80 border-b border-gray-200 text-xs text-gray-500 uppercase tracking-wider">
                                <th
                                    className="px-6 py-4 font-semibold cursor-pointer hover:bg-gray-100 transition-colors w-24 text-center select-none"
                                    onClick={() => handleSort('order')}
                                >
                                    <div className="flex items-center justify-center">
                                        Order <SortIcon column="order" />
                                    </div>
                                </th>
                                <th
                                    className="px-6 py-4 font-semibold cursor-pointer hover:bg-gray-100 transition-colors select-none"
                                    onClick={() => handleSort('label')}
                                >
                                    <div className="flex items-center">
                                        Label Menu <SortIcon column="label" />
                                    </div>
                                </th>
                                <th className="px-6 py-4 font-semibold">Role Access</th>
                                <th className="px-6 py-4 font-semibold text-center w-24">Status</th>
                                <th className="px-6 py-4 font-semibold text-right w-24">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {paginatedData.map((menu) => (
                                <tr key={menu.id} className="group hover:bg-emerald-50/30 transition-colors duration-150">
                                    {editingId === menu.id ? (
                                        // Edit Mode Row
                                        <td colSpan={5} className="p-4 bg-emerald-50/50">
                                            <div className="bg-white p-4 rounded-lg border border-emerald-100 shadow-sm flex flex-col gap-4">
                                                <div className="grid grid-cols-12 gap-4">
                                                    <div className="col-span-1">
                                                        <label className="text-[10px] text-gray-400 block mb-1">Order</label>
                                                        <Input
                                                            type="number"
                                                            value={editForm.order}
                                                            onChange={e => setEditForm({ ...editForm, order: parseInt(e.target.value) })}
                                                            className="text-center h-9"
                                                        />
                                                    </div>
                                                    <div className="col-span-8">
                                                        <label className="text-[10px] text-gray-400 block mb-1">Label</label>
                                                        <Input
                                                            value={editForm.label}
                                                            onChange={e => setEditForm({ ...editForm, label: e.target.value })}
                                                            className="h-9"
                                                        />
                                                    </div>

                                                    <div className="col-span-3 flex items-end justify-end gap-2">
                                                        <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} className="h-9">
                                                            Batal
                                                        </Button>
                                                        <Button size="sm" onClick={() => handleUpdate(menu.id)} className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white">
                                                            <Save className="w-4 h-4 mr-2" />
                                                            Simpan
                                                        </Button>
                                                    </div>
                                                </div>

                                                {/* Sub Items Visibility Section */}
                                                {menus.filter(m => m.parentId === menu.id).length > 0 && (
                                                    <div className="border-t border-gray-100 pt-3 mt-1">
                                                        <label className="text-[10px] text-gray-400 block mb-2 uppercase tracking-wide">Tampilkan Sub-Menu</label>
                                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                                            {menus.filter(m => m.parentId === menu.id).map(child => (
                                                                <div key={child.id} className="flex items-center space-x-2 bg-gray-50 p-2 rounded border border-gray-100">
                                                                    <Checkbox
                                                                        id={`child-${child.id}`}
                                                                        checked={child.isActive}
                                                                        onCheckedChange={() => toggleActive(child)}
                                                                    />
                                                                    <label
                                                                        htmlFor={`child-${child.id}`}
                                                                        className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer text-gray-600 select-none"
                                                                    >
                                                                        {child.label}
                                                                    </label>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                <div>
                                                    <label className="text-[10px] text-gray-400 block mb-2">Role Access</label>
                                                    <div className="flex flex-wrap gap-2">
                                                        {availableRoles.map(role => (
                                                            <button
                                                                key={role}
                                                                onClick={() => toggleRoleInForm(role, false)}
                                                                className={`px-2 py-1 rounded text-xs border transition-colors ${editForm.roleAccess?.split(',').includes(role) && editForm.roleAccess !== 'All'
                                                                    ? 'bg-emerald-100 text-emerald-800 border-emerald-200 font-medium'
                                                                    : 'bg-white text-gray-500 border-gray-200'}`}
                                                            >
                                                                {role}
                                                            </button>
                                                        ))}
                                                        <button
                                                            onClick={() => setEditForm({ ...editForm, roleAccess: 'All' })}
                                                            className={`px-2 py-1 rounded text-xs border transition-colors ${editForm.roleAccess === 'All'
                                                                ? 'bg-blue-100 text-blue-800 border-blue-200 font-medium'
                                                                : 'bg-white text-gray-500 border-gray-200'}`}
                                                        >
                                                            All
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                    ) : (
                                        // View Mode Row
                                        <>
                                            <td className="px-6 py-4 text-center font-mono text-gray-500 text-xs">
                                                {menu.order}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="font-semibold text-gray-800 text-sm">{menu.label}</span>
                                                    {menu.parentId && (
                                                        <span className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5">
                                                            <ChevronRight className="w-3 h-3" /> Parent ID: {menu.parentId}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-wrap gap-1.5">
                                                    {menu.roleAccess === 'All' ? (
                                                        <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-100">
                                                            All
                                                        </Badge>
                                                    ) : (
                                                        menu.roleAccess?.split(',').map((role, idx) => (
                                                            <Badge key={idx} variant="outline" className="bg-white text-gray-600 border-gray-200 hover:border-emerald-300">
                                                                {role.trim()}
                                                            </Badge>
                                                        ))
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex justify-center">
                                                    <Switch
                                                        checked={menu.isActive}
                                                        onCheckedChange={() => toggleActive(menu)}
                                                    />
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <span className="sr-only">Open menu</span>
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => startEdit(menu)} className="cursor-pointer">
                                                            <Edit className="mr-2 h-4 w-4" /> Edit
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleDelete(menu.id)} className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50">
                                                            <Trash2 className="mr-2 h-4 w-4" /> Hapus
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </td>
                                        </>
                                    )}
                                </tr>
                            ))}
                            {processedData.length === 0 && !loading && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center">
                                                <Search className="w-6 h-6 text-gray-300" />
                                            </div>
                                            <p className="font-medium">Data tidak ditemukan</p>
                                            <p className="text-xs text-gray-400">Coba ubah filter pencarian Anda</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50/50">
                    <p className="text-sm text-gray-500">
                        Menampilkan <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> sampai <span className="font-medium">{Math.min(currentPage * itemsPerPage, processedData.length)}</span> dari <span className="font-medium">{processedData.length}</span> data
                    </p>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                            className="bg-white border-gray-200"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </Button>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                            <button
                                key={page}
                                onClick={() => setCurrentPage(page)}
                                className={`w-8 h-8 rounded-md text-sm font-medium transition-colors ${currentPage === page
                                    ? 'bg-emerald-600 text-white shadow-sm'
                                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                                    }`}
                            >
                                {page}
                            </button>
                        ))}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages}
                            className="bg-white border-gray-200"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
