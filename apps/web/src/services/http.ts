// Cliente HTTP base — todas las llamadas a APIM pasan por aquí

const BASE_URL = import.meta.env.VITE_APIM_BASE_URL;

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
        // Token vencido o inválido — APIM no tiene refresh automático,
        // así que se limpia la sesión y se manda al usuario a loguearse de nuevo.
        localStorage.removeItem('auth_user');
        localStorage.removeItem('id_token');
        window.location.href = '/login';
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

// Métodos HTTP exportados — los servicios los usan directamente
export const http = {
    get:    <T>(path: string)                  => request<T>(path),
    post:   <T>(path: string, body: unknown)   => request<T>(path, { method: 'POST',   body: JSON.stringify(body) }),
    put:    <T>(path: string, body: unknown)   => request<T>(path, { method: 'PUT',    body: JSON.stringify(body) }),
    delete: <T>(path: string)                  => request<T>(path, { method: 'DELETE' }),
};