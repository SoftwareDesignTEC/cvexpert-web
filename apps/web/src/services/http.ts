// Cliente HTTP base — todas las llamadas a APIM pasan por aquí

import type { PaginatedResponse } from '../types/api';

// Ya incluye el prefijo /api/v1: las rutas se escriben sin él (`/jobs`, `/notifications`).
// Se exporta para quien no pasa por fetch, como la conexión SignalR del centro de notificaciones.
export const API_BASE_URL: string = import.meta.env.VITE_APIM_BASE_URL;
const BASE_URL = API_BASE_URL;

// AuthProvider escucha este evento para cerrar la sesión. Antes acá se hacía
// window.location.href = '/login', que es una navegación dura del navegador por cada
// request fallida (el Dashboard lanza dos en paralelo) y además dejaba el estado de
// React con el usuario vivo mientras localStorage ya estaba vacío.
export const UNAUTHORIZED_EVENT = 'auth:unauthorized';

// Error tipado para poder distinguir errores de API en los componentes.
// `code` es el identificador que mandan los microservicios en {error, message}
// (p. ej. SKILLS_INPUT_REQUIRED); permite distinguir casos sin leer el texto,
// que cambia. Queda opcional porque APIM responde antes que el servicio en
// varios casos y entonces no viene.
export class ApiError extends Error {
    status: number;
    // Detalle por campo que algunos 400 traen, p. ej. { email: 'ya está en uso' }.
    // Es opcional para no romper a quien construye el error con dos argumentos.
    errors?: Record<string, string>;
    // Identificador que mandan los microservicios junto al mensaje, p. ej.
    // SKILLS_INPUT_REQUIRED. Permite distinguir un caso del texto, que cambia.
    code?: string;

    constructor(
        status: number,
        message: string,
        errors?: Record<string, string>,
        code?: string,
    ) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.errors = errors;
        this.code = code;
    }
}

// El detalle por campo puede venir como texto o como lista de textos (formato de
// ASP.NET); se aplana a un texto por campo para que los formularios lo pinten directo.
function readFieldErrors(raw: unknown): Record<string, string> | undefined {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;

    const out: Record<string, string> = {};
    for (const [field, value] of Object.entries(raw)) {
        if (typeof value === 'string') out[field] = value;
        else if (Array.isArray(value)) out[field] = value.filter(v => typeof v === 'string').join(' ');
    }
    return Object.keys(out).length > 0 ? out : undefined;
}

// Motivo legible cuando la respuesta no trae un mensaje propio
function defaultMessage(status: number) {
    if (status === 400) return 'el servidor rechazó la petición por datos inválidos';
    if (status === 403) return 'no tenés permiso para ver esta información';
    if (status === 404) return 'el servidor no encontró esa información';
    if (status === 408) return 'el servidor tardó demasiado en responder';
    if (status === 409) return 'falta un paso previo para poder continuar';
    if (status === 413) return 'la información enviada es demasiado grande';
    if (status === 429) return 'se hicieron demasiadas peticiones seguidas';
    if (status === 503) return 'el servicio no está disponible en este momento';
    if (status >= 500) return 'el servidor tuvo un problema interno';
    return 'el servidor respondió de forma inesperada';
}

// Arma un mensaje que dice qué falló y por qué. `context` describe la acción,
// p. ej. "cargar las ofertas"; el motivo sale del APIM o del tipo de fallo.
export function describeError(err: unknown, context: string): string {
    const prefix = `No pudimos ${context}`;

    if (err instanceof ApiError) {
        // status 0 = la petición nunca llegó a destino
        if (err.status === 0) {
            return `${prefix}: no hay conexión con el servidor. Revisá tu internet e intentá de nuevo.`;
        }
        if (err.status === 401) {
            return `${prefix}: tu sesión expiró. Iniciá sesión de nuevo.`;
        }
        // El APIM devuelve el detalle en español; se muestra con su código para
        // que sirva también al reportar el problema.
        return `${prefix}: ${err.message} (código ${err.status})`;
    }

    if (err instanceof Error && err.message) {
        return `${prefix}: ${err.message}`;
    }
    return `${prefix} por un error inesperado. Intentá de nuevo.`;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
    // El id_token (JWT) de Google que APIM valida en cada request
    const idToken = localStorage.getItem('id_token');

    let res: Response;
    try {
        res = await fetch(`${BASE_URL}${path}`, {
            ...options,
            headers: {
                // Sin cuerpo no se declara JSON: hay backends que rechazan un POST
                // vacío con Content-Type application/json.
                ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
                ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
                ...options.headers,
            },
        });
    } catch {
        // fetch falla antes de tener respuesta: sin red, DNS caído o CORS.
        // Sin esto el usuario veía el "Failed to fetch" del navegador.
        throw new ApiError(0, 'sin conexión con el servidor');
    }

    if (res.status === 401) {
        // Token vencido o inválido — APIM no tiene refresh automático. Avisamos y cortamos:
        // limpiar la sesión y navegar es responsabilidad de AuthProvider y del router.
        window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
        throw new ApiError(401, 'la sesión expiró');
    }

    if (!res.ok) {
        // El APIM devuelve {statusCode, error, message} con el detalle en español;
        // si no hay cuerpo utilizable, se arma un mensaje según el código.
        const body = await res.json().catch(() => ({}));
        throw new ApiError(
            res.status,
            body.message ?? defaultMessage(res.status),
            readFieldErrors(body.errors),
            typeof body.error === 'string' ? body.error : undefined,
        );
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

// Serializa el cuerpo sólo si lo hay: `post('/x')` sale sin cuerpo ni Content-Type
function withBody(method: string, body: unknown): RequestInit {
    return body === undefined ? { method } : { method, body: JSON.stringify(body) };
}

// Métodos HTTP exportados — los servicios los usan directamente
export const http = {
    get:    <T>(path: string)                  => request<T>(path),
    post:   <T>(path: string, body?: unknown)  => request<T>(path, withBody('POST', body)),
    put:    <T>(path: string, body: unknown)   => request<T>(path, withBody('PUT', body)),
    patch:  <T>(path: string, body?: unknown)  => request<T>(path, withBody('PATCH', body)),
    delete: <T>(path: string)                  => request<T>(path, { method: 'DELETE' }),
};
