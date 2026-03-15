export interface RKAPRow {
    id: number;
    productSlug: string;
    bulan: number;
    tahun: number;
    target: number;
}

export interface SaveRKAPRequest {
    productSlug: string;
    bulan: number;
    tahun: number;
    target: number;
}

export interface UpdateRKAPRequest extends SaveRKAPRequest {
    id: number;
}

export const getRKAP = async (slug: string, bulan?: number, tahun?: number): Promise<{ message: string; data: RKAPRow[] }> => {
    let url = `/api/RKAP?slug=${slug}`;
    if (bulan) url += `&bulan=${bulan}`;
    if (tahun) url += `&tahun=${tahun}`;

    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        throw new Error('Failed to fetch RKAP data');
    }
    return response.json();
};

export const createRKAP = async (data: SaveRKAPRequest): Promise<{ message: string; data: RKAPRow }> => {
    const response = await fetch('/api/RKAP', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    });

    if (!response.ok) {
        throw new Error('Failed to create RKAP data');
    }
    return response.json();
};

export const updateRKAP = async (data: UpdateRKAPRequest): Promise<{ message: string; data: RKAPRow }> => {
    const response = await fetch(`/api/RKAP/${data.id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    });

    if (!response.ok) {
        throw new Error('Failed to update RKAP data');
    }
    return response.json();
};

export const deleteRKAP = async (id: number): Promise<{ message: string }> => {
    const response = await fetch(`/api/RKAP/${id}`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        throw new Error('Failed to delete RKAP data');
    }
    return response.json();
};
