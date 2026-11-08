import { API_BASE_URL, http, toPaginated } from './http';
import type { AppNotification, NotificationDirectoryEntry, NotificationLanguage, UnreadCountResponse } from '../types/models';
import type { PaginatedResponse, PaginationParams } from '../types/api';

// Las rutas viven en la misma API del APIM que el resto (…/api/v1/notifications/…).
// API_BASE_URL ya trae el /api/v1, así que acá sólo se agrega /notifications.
const BASE = '/notifications';

export interface NotificationListParams extends Omit<PaginationParams, 'search'> {
    unreadOnly?: boolean;
}

// El enlace de un aviso viene del servidor: sólo se sigue si es una ruta interna,
// para que un valor como "//otro-sitio.com" no saque al usuario de la aplicación.
export function internalLink(link: string | undefined): string | null {
    return link && /^\/(?!\/)/.test(link) ? link : null;
}

export const notificationService = {
    // Hub de SignalR para recibir los avisos en vivo (evento "notification")
    hubUrl: `${API_BASE_URL}${BASE}/hub`,

    getAll: ({ page, pageSize, unreadOnly }: NotificationListParams): Promise<PaginatedResponse<AppNotification>> => {
        const params = new URLSearchParams({
            page: String(page),
            pageSize: String(pageSize),
            ...(unreadOnly ? { unreadOnly: 'true' } : {}),
        });
        return http.get<unknown>(`${BASE}?${params}`).then(r => toPaginated<AppNotification>(r, pageSize, page));
    },

    getUnreadCount: () =>
        http.get<UnreadCountResponse>(`${BASE}/unread-count`).then(r => Math.max(0, Number(r?.count) || 0)),

    // Resuelve con la hora (epoch ms) en que se confirmó, para actualizar la lista sin recargarla
    markAsRead: (id: string): Promise<number> =>
        http.patch<void>(`${BASE}/${encodeURIComponent(id)}/read`).then(() => Date.now()),

    markAllAsRead: () =>
        http.post<void>(`${BASE}/read-all`),

    // Registra (o actualiza) al usuario en el directorio del servicio de notificaciones
    updateDirectory: (language: NotificationLanguage) =>
        http.put<void>(`${BASE}/directory/me`, { language } satisfies NotificationDirectoryEntry),
};
