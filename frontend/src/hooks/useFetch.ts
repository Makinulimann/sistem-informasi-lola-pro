import { useEffect, useState, useCallback } from 'react';
import { api, ApiError } from '@/lib/api';

type FetchState<T> =
    | { status: 'idle' }
    | { status: 'loading' }
    | { status: 'success'; data: T }
    | { status: 'error'; error: string };

export function useFetch<T>(endpoint: string) {
    const [state, setState] = useState<FetchState<T>>({ status: 'idle' });

    const execute = useCallback(() => {
        const controller = new AbortController();

        setState({ status: 'loading' });

        api
            .get<T>(endpoint, { signal: controller.signal })
            .then((data) => {
                setState({ status: 'success', data });
            })
            .catch((err: unknown) => {
                if (err instanceof DOMException && err.name === 'AbortError') return;

                const message =
                    err instanceof ApiError
                        ? `HTTP ${err.status}: ${err.message}`
                        : err instanceof Error
                            ? err.message
                            : 'Unknown error';

                setState({ status: 'error', error: message });
            });

        return controller;
    }, [endpoint]);

    useEffect(() => {
        const controller = execute();
        return () => controller.abort();
    }, [execute]);

    const refetch = useCallback(() => {
        execute();
    }, [execute]);

    return { ...state, refetch };
}
