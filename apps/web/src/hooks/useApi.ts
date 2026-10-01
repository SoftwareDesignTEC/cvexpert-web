import { useState, useEffect, useCallback } from 'react';

interface UseApiState<T> {
    data: T | null;
    loading: boolean;
    error: string | null;
}

// Hook genérico para cualquier llamada a la API
// Uso: const { data, loading, error } = useApi(() => cvService.getAll({ page: 1, pageSize: 10 }))
export function useApi<T>(
    fn: () => Promise<T>,
    deps: unknown[] = [],
) {
    const [state, setState] = useState<UseApiState<T>>({
        data: null,
        loading: true,
        error: null,
    });

    const fetch = useCallback(async () => {
        setState(prev => ({ ...prev, loading: true, error: null }));
        try {
            const data = await fn();
            setState({ data, loading: false, error: null });
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Error desconocido';
            setState({ data: null, loading: false, error: message });
        }
        // `deps` llega por parametro porque el hook es generico, asi que no puede ser
        // un literal como exigen las reglas. Es intencional y el hook no se usa todavia.
        // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/use-memo
    }, deps);

    useEffect(() => { fetch(); }, [fetch]);

    return { ...state, refetch: fetch };
}

// Hook específico para listas paginadas
export function usePaginatedApi<T>(
    fn: (page: number, pageSize: number, search: string) => Promise<{ items: T[]; totalRecords: number; page: number; pageSize: number }>,
    initialPageSize = 10,
) {
    const [page, setPage] = useState(1);
    const [pageSize] = useState(initialPageSize);
    const [search, setSearch] = useState('');

    const { data, loading, error, refetch } = useApi(
        () => fn(page, pageSize, search),
        [page, pageSize, search],
    );

    const handleSearch = (value: string) => {
        setSearch(value);
        setPage(1);
    };

    return {
        items: data?.items ?? [],
        totalRecords: data?.totalRecords ?? 0,
        page,
        pageSize,
        loading,
        error,
        onPageChange: setPage,
        onSearch: handleSearch,
        refetch,
    };
}
