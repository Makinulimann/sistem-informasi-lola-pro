import { api } from './api';

export interface SidebarMenu {
    id: number;
    label: string;
    icon: string;
    href: string;
    parentId?: number | null;
    children?: SidebarMenu[];
    order: number;
    isActive: boolean;
    roleAccess?: string;
}

export const sidebarService = {
    getAll: async () => {
        return api.get<SidebarMenu[]>('/sidebar');
    },

    getAllFlat: async () => {
        return api.get<SidebarMenu[]>('/sidebar/all');
    },

    create: async (menu: Partial<SidebarMenu>) => {
        return api.post<SidebarMenu>('/sidebar', menu);
    },

    createWithChildren: async (data: {
        label: string;
        icon?: string;
        href?: string;
        parentId?: number | null;
        order: number;
        roleAccess?: string;
        children?: { label: string; icon?: string; href?: string }[];
    }) => {
        return api.post<SidebarMenu>('/sidebar/create-with-children', data);
    },

    update: async (id: number, menu: Partial<SidebarMenu>) => {
        return api.put<void>(`/sidebar/${id}`, menu);
    },

    delete: async (id: number) => {
        return api.delete<void>(`/sidebar/${id}`);
    },

    seed: async () => {
        return api.post<void>('/sidebar/seed', {});
    }
};
