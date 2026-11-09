import { API_BASE_URL, http, toPaginated } from './http';
import type {
    AppNotification, NotificationDirectoryEntry, NotificationDirectoryUpdate,
    NotificationLanguage, NotificationType, UnreadCountResponse,
} from '../types/models';
import type { PaginatedResponse, PaginationParams } from '../types/api';

// Contrato: cvexpert-ms-notificaciones/docs/contratos/openapi.yaml.
// Las rutas viven en la misma API del APIM que el resto (…/api/v1/notifications/…).
// API_BASE_URL ya trae el /api/v1, así que acá sólo se agrega /notifications.
const BASE = '/notifications';

export interface NotificationListParams extends Omit<PaginationParams, 'search'> {
    unreadOnly?: boolean;
}

// Una notificación no trae enlace: la pantalla a la que lleva depende de su tipo
const LINKS: Record<NotificationType, string> = {
    'application.status_changed': '/applications',
    'job.new':                    '/jobs',
    'cv.generated':               '/cvs',
    'course.recommended':         '/skills-gap',
};

export function internalLink(type: string): string | null {
    return LINKS[type as NotificationType] ?? null;
}

export const notificationService = {
    // Hub de SignalR (evento "notification"). La librería cliente hace el negotiate en
    // {hubUrl}/negotiate vía APIM y se conecta directo a la url de Azure SignalR que devuelve.
    hubUrl: `${API_BASE_URL}${BASE}/hub`,

    getAll: ({ page, pageSize, unreadOnly }: NotificationListParams): Promise<PaginatedResponse<AppNotification>> => {
        const params = new URLSearchParams({
            page: String(page),
            pageSize: String(pageSize),
            // unread=false pediría solo las leídas; para "todas" se omite
            ...(unreadOnly ? { unread: 'true' } : {}),
        });
        return http.get<unknown>(`${BASE}?${params}`).then(r => toPaginated<AppNotification>(r, pageSize, page));
    },

    getUnreadCount: () =>
        http.get<UnreadCountResponse>(`${BASE}/unread-count`).then(r => Math.max(0, Number(r?.count) || 0)),

    // 200 con la notificación ya leída (readAt incluido). Idempotente: si ya estaba
    // leída conserva su readAt original.
    markAsRead: (id: string) =>
        http.patch<AppNotification>(`${BASE}/${encodeURIComponent(id)}/read`),

    // 204 sin cuerpo
    markAllAsRead: () =>
        http.post<void>(`${BASE}/read-all`),

    // Registra o actualiza al usuario en el directorio; responde la entrada guardada
    updateDirectory: (language: NotificationLanguage) =>
        http.put<NotificationDirectoryEntry>(`${BASE}/directory/me`, { language } satisfies NotificationDirectoryUpdate),
};
