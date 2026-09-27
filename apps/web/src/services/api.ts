// Cliente base para el APIM
const BASE_URL = import.meta.env.VITE_APIM_BASE_URL ?? '';

export interface PaginatedResponse<T> {
    items: T[];
    page: number;
    pageSize: number;
    totalRecords: number;
}

async function apiFetch<T>(path: string): Promise<T> {
    const res = await fetch(`${BASE_URL}${path}`);
    if (!res.ok) {
        throw new Error(`API error ${res.status}: ${res.statusText}`);
    }
    return res.json() as Promise<T>;
}

export default apiFetch;