import { API_BASE_URL, http, toPaginated } from './http';
import type {
    AppNotification, NotificationDirectoryEntry, NotificationDirectoryUpdate,
    NotificationLanguage, NotificationTemplate, NotificationTemplateUpdate,
    NotificationType, UnreadCountResponse,
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

// Tipos en el orden del enum del contrato; el editor de plantillas los muestra así
export const NOTIFICATION_TYPES: NotificationType[] = [
    'application.status_changed', 'cv.generated', 'job.new', 'course.recommended',
];

// Marcadores {{campo}} que el servidor acepta en cada tipo: los campos de data de
// evento-notificacion.schema.json (tabla "Plantillas" del README del contrato).
// Un PUT con cualquier otro responde 400 con el detalle en errors.title / errors.body.
export const TEMPLATE_PLACEHOLDERS: Record<NotificationType, string[]> = {
    'application.status_changed': ['applicationId', 'jobOfferId', 'jobTitle', 'company', 'previousStatus', 'newStatus'],
    'cv.generated':               ['cvId', 'title', 'templateId'],
    'job.new':                    ['jobOfferId', 'title', 'company', 'location', 'modality', 'matchScore'],
    'course.recommended':         ['title', 'platform', 'url', 'isPaid', 'duration', 'skill'],
};

function templatePath(type: NotificationType, language: NotificationLanguage) {
    return `${BASE}/templates/${encodeURIComponent(type)}/${encodeURIComponent(language)}`;
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

    // ─── Plantillas (solo admin: sin X-User-Role admin, APIM/servidor responde 403) ───

    // Las 8 plantillas (4 tipos × 2 idiomas) como arreglo, sin paginar
    getTemplates: () =>
        http.get<NotificationTemplate[]>(`${BASE}/templates`).then(r => (Array.isArray(r) ? r : [])),

    getTemplate: (type: NotificationType, language: NotificationLanguage) =>
        http.get<NotificationTemplate>(templatePath(type, language)),

    // Reemplaza título y cuerpo; responde 200 con la plantilla guardada (updatedAt y
    // updatedBy los pone el servidor)
    updateTemplate: (type: NotificationType, language: NotificationLanguage, update: NotificationTemplateUpdate) =>
        http.put<NotificationTemplate>(templatePath(type, language), update),
};
