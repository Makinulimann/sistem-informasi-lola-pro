import Cookies from 'js-cookie';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? '/api';

export class ApiError extends Error {
    constructor(
        public readonly status: number,
        public readonly statusText: string,
        message: string,
    ) {
        super(message);
        this.name = 'ApiError';
    }
}

const TOKEN_KEY = 'sippro_token';

export const auth = {
    setToken(token: string, remember: boolean) {
        if (typeof window === 'undefined') return;

        const options: Cookies.CookieAttributes = {
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            path: '/'
        };

        if (remember) {
            options.expires = 7; // 7 days
        }

        Cookies.set(TOKEN_KEY, token, options);
    },
    getToken(): string | null {
        // Can read from cookie on client side
        return Cookies.get(TOKEN_KEY) || null;
    },
    removeToken() {
        Cookies.remove(TOKEN_KEY);
    },
    isAuthenticated(): boolean {
        return !!this.getToken();
    }
};

function toCamelCase(obj: any): any {
    if (Array.isArray(obj)) {
        return obj.map(v => toCamelCase(v));
    } else if (obj !== null && typeof obj === 'object' && obj.constructor === Object) {
        return Object.keys(obj).reduce((result, key) => {
            const camelKey = key.charAt(0).toLowerCase() + key.slice(1);
            result[camelKey] = toCamelCase(obj[key]);
            return result;
        }, {} as any);
    }
    return obj;
}

async function request<T>(
    endpoint: string,
    options: RequestInit = {},
    token?: string | null
): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;

    // Explicitly cast headers to Record<string, string> or HeadersInit
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string> || {}),
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const config: RequestInit = {
        ...options,
        headers,
    };

    const res = await fetch(url, config);

    // Handle 401 Unauthorized globally
    if (res.status === 401) {
        auth.removeToken();
        if (typeof window !== 'undefined' && window.location.pathname !== '/') {
            window.location.href = '/';
        }
    }

    if (!res.ok) {
        const body = await res.text().catch(() => 'Kesalahan tidak diketahui');
        // Try parsing JSON error
        try {
            const json = JSON.parse(body);
            // Handle ASP.NET Core Validation Problem Details
            if (json.errors && typeof json.errors === 'object') {
                const errorMessages = Object.values(json.errors).flat().join(', ');
                throw new ApiError(res.status, res.statusText, errorMessages);
            }
            // Handle standard ProblemDetails title if no specific message
            const message = json.message || json.title || 'Kesalahan tidak diketahui';
            throw new ApiError(res.status, res.statusText, message);
        } catch (e) {
            if (e instanceof ApiError) throw e;

            // Clean up massive RSC or HTML error payloads for the UI
            const isHtmlOrRsc = typeof body === 'string' && (body.trim().startsWith('<') || body.trim().startsWith('['));
            const errorMessage = isHtmlOrRsc ? `Server returned ${res.status} (Possible missing route or crash)` : (body || 'Kesalahan tidak diketahui');
            throw new ApiError(res.status, res.statusText, errorMessage);
        }
    }

    // Handle 204 No Content
    if (res.status === 204) {
        return {} as unknown as T;
    }

    // Handle empty response body
    const text = await res.text();
    return text ? toCamelCase(JSON.parse(text)) : ({} as unknown as T);
}

export const api = {
    get<T>(endpoint: string, options?: RequestInit): Promise<T> {
        const token = auth.getToken();
        return request<T>(endpoint, { ...options, method: 'GET' }, token);
    },
    post<T>(endpoint: string, body: any, options?: RequestInit): Promise<T> {
        const token = auth.getToken();
        return request<T>(endpoint, { ...options, method: 'POST', body: JSON.stringify(body) }, token);
    },
    put<T>(endpoint: string, body: any, options?: RequestInit): Promise<T> {
        const token = auth.getToken();
        return request<T>(endpoint, { ...options, method: 'PUT', body: JSON.stringify(body) }, token);
    },
    delete<T>(endpoint: string, options?: RequestInit): Promise<T> {
        const token = auth.getToken();
        return request<T>(endpoint, { ...options, method: 'DELETE' }, token);
    }
} as const;
