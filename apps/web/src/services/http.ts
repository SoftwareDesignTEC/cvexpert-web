// Cliente HTTP base — todas las llamadas a APIM pasan por aquí

import type { PaginatedResponse } from '../types/api';

const BASE_URL = import.meta.env.VITE_APIM_BASE_URL;

// AuthProvider escucha este evento para cerrar la sesión. Antes acá se hacía
// window.location.href = '/login', que es una navegación dura del navegador por cada
// request fallida (el Dashboard lanza dos en paralelo) y además dejaba el estado de
// React con el usuario vivo mientras localStorage ya estaba vacío.
export const UNAUTHORIZED_EVENT = 'auth:unauthorized';

// Error tipado para poder distinguir errores de API en los componentes
export class ApiError extends Error {
    status: number;

    constructor(status: number, message: string) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
    }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
    // El id_token (JWT) de Google que APIM valida en cada request
    const idToken = localStorage.getItem('id_token');

    const res = await fetch(`${BASE_URL}${path}`, {
        headers: {
            'Content-Type': 'application/json',
            ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
            ...options?.headers,
        },
        ...options,
    });

    if (res.status === 401) {
        // Token vencido o inválido — APIM no tiene refresh automático. Avisamos y cortamos:
        // limpiar la sesión y navegar es responsabilidad de AuthProvider y del router.
        window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
        throw new ApiError(401, 'Sesión expirada. Iniciá sesión de nuevo.');
    }

    if (!res.ok) {
        // Intenta leer el mensaje de error del body; si no, usa un genérico
        const body = await res.json().catch(() => ({}));
        throw new ApiError(res.status, body.message ?? `Error ${res.status}`);
    }

    // 204 No Content (DELETE exitoso) no tiene body
    if (res.status === 204) return undefined as T;

    return res.json();
}

// Algunos endpoints del APIM devuelven el arreglo pelado en vez del objeto con
// metadatos de paginación (`/jobs` hoy lo hace). Se normalizan las dos formas acá
// para que las páginas siempre reciban la misma estructura.
export function toPaginated<T>(res: unknown, pageSize: number, page = 1): PaginatedResponse<T> {
    if (Array.isArray(res)) {
        return { items: res as T[], totalRecords: res.length, page, pageSize };
    }
    const obj = (res ?? {}) as Partial<PaginatedResponse<T>>;
    const items = obj.items ?? [];
    return {
        items,
        totalRecords: obj.totalRecords ?? items.length,
        page: obj.page ?? page,
        pageSize: obj.pageSize ?? pageSize,
    };
}

// Métodos HTTP exportados — los servicios los usan directamente
export const http = {
    get:    <T>(path: string)                  => request<T>(path),
    post:   <T>(path: string, body: unknown)   => request<T>(path, { method: 'POST',   body: JSON.stringify(body) }),
    put:    <T>(path: string, body: unknown)   => request<T>(path, { method: 'PUT',    body: JSON.stringify(body) }),
    delete: <T>(path: string)                  => request<T>(path, { method: 'DELETE' }),
};
