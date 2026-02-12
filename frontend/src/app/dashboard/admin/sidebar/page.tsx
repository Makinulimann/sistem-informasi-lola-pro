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
    const [newMenu, setNewMenu] = useState<Partial<SidebarMenu>>({
        label: '',
        icon: 'circle',
        href: '#',
        order: 0,
        isActive: true,
        roleAccess: 'All'
    });

    const availableRoles = ['Admin', 'VP', 'KPP', 'KP', 'KNP'];

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

    // CRUD Handlers
    const handleCreate = async () => {
        try {
            await sidebarService.create(newMenu);
            setIsCreating(false);
            setNewMenu({ label: '', icon: 'circle', href: '#', order: 0, isActive: true, roleAccess: 'All' });
            loadMenus();
        } catch (error) {
            console.error("Failed to create menu", error);
        }
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
                        variant="outline"
                        onClick={() => sidebarService.seed().then(loadMenus)}
                        className="text-gray-600 border-gray-300 hover:bg-gray-50 hover:text-emerald-700"
                    >
                        <FolderTree className="w-4 h-4 mr-2" />
                        Reset / Seed Default
                    </Button>
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

            {/* Create Form */}
            {isCreating && (
                <div className="bg-white p-6 rounded-xl border border-emerald-100 shadow-lg ring-1 ring-emerald-50 mb-6 animate-in slide-in-from-top-4 duration-300">
                    <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100">
                        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                            <Plus className="w-4 h-4 text-emerald-600" />
                            Buat Menu Baru
                        </h3>
                        <Button variant="ghost" size="sm" onClick={() => setIsCreating(false)} className="h-8 w-8 p-0 rounded-full hover:bg-red-50 hover:text-red-500">
                            <X className="w-4 h-4" />
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-5">
                        <div className="lg:col-span-4">
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Label Menu</label>
                            <Input
                                placeholder="Contoh: Produk Baru"
                                value={newMenu.label}
                                onChange={e => setNewMenu({ ...newMenu, label: e.target.value })}
                                className="border-gray-300 focus:border-emerald-500"
                            />
                        </div>
                        <div className="lg:col-span-4">
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Link (Href)</label>
                            <Input
                                placeholder="/dashboard/..."
                                value={newMenu.href}
                                onChange={e => setNewMenu({ ...newMenu, href: e.target.value })}
                                className="font-mono text-xs border-gray-300 focus:border-emerald-500"
                            />
                        </div>
                        <div className="lg:col-span-2">
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Icon</label>
                            <Input
                                placeholder="package"
                                value={newMenu.icon}
                                onChange={e => setNewMenu({ ...newMenu, icon: e.target.value })}
                                className="border-gray-300 focus:border-emerald-500"
                            />
                        </div>
                        <div className="lg:col-span-2">
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Order</label>
                            <Input
                                type="number"
                                value={newMenu.order}
                                onChange={e => setNewMenu({ ...newMenu, order: parseInt(e.target.value) })}
                                className="border-gray-300 focus:border-emerald-500"
                            />
                        </div>
                    </div>

                    <div className="mt-5 bg-gray-50 p-4 rounded-lg border border-gray-100">
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 block">Hak Akses Role</span>
                        <div className="flex flex-wrap gap-2">
                            {availableRoles.map(role => (
                                <button
                                    key={role}
                                    onClick={() => toggleRoleInForm(role, true)}
                                    className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-all duration-200 ${(newMenu.roleAccess?.includes(role) && newMenu.roleAccess !== 'All')
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

                    <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
                        <Button variant="outline" onClick={() => setIsCreating(false)}>Batal</Button>
                        <Button onClick={handleCreate} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6">Simpan Menu</Button>
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
                                                                className={`px-2 py-1 rounded text-xs border transition-colors ${editForm.roleAccess?.includes(role) && editForm.roleAccess !== 'All'
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
