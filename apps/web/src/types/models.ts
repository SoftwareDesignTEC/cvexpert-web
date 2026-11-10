// PERFIL DE USUARIO

export interface UserProfile {
    id: string;
    name: string;
    email: string;
    phone?: string;
    location: string;
    photoUrl?: string;
    bio?: string;
    birthDate?: string;
    types: ('full-time' | 'part-time' | 'freelance' | 'internship')[];
    modalities: ('remote' | 'on-site' | 'hybrid')[];
    sectors: string[];
}

//CV / CURRÍCULUM

export interface CV {
    id: string;
    userId: string;
    title: string;
    templateId: string;
    thumbnailUrl?: string;
    createdAt: string;
    updatedAt: string;

    personalInfo: UserProfile;
    workExperiences: WorkExperience[];
    education: Education[];
    skills: Skill[];
    languages: Language[];
}

export interface WorkExperience {
    id: string;
    company: string;
    position: string;
    startDate: string;
    endDate: string | null;
    current: boolean;
    description: string;
    type: 'formal' | 'freelance' | 'volunteer' | 'school-project' | 'informal';
}

export interface Education {
    id: string;
    institution: string;
    degree: string;
    field: string;
    startDate: string;
    endDate: string | null;
    current: boolean;
}

export interface Skill {
    id: string;
    name: string;
    level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
    category: string;
}

export interface Language {
    id: string;
    name: string;
    level: 'basic' | 'intermediate' | 'advanced' | 'native';
}

//PLANTILLAS DE CV

export interface CVTemplate {
    id: string;
    name: string;
    description: string;
    previewUrl: string;
    category: string;
    isPremium: boolean;
    availableOffline: boolean;
}

// OFERTAS LABORALES

export interface JobOffer {
    id: string;
    title: string;
    company: string;
    // Logo real de la empresa; hay ofertas que vienen sin él
    companyLogoUrl?: string;
    /** Página donde se postula de verdad, en el sitio de origen */
    applyUrl?: string;
    location: string;
    modality: 'remote' | 'on-site' | 'hybrid';
    type: 'full-time' | 'part-time' | 'freelance' | 'internship';
    sector: string;
    description: string;
    requirements: string[];
    /** Habilidades que el servicio extrae del texto de la oferta */
    skills?: string[];
    salary?: {
        min: number;
        max: number;
        currency: string;
    };
    matchScore?: number;                 // 0-100
    postedAt: string;                   // 2026-09-13T21:00:00Z
}

//TRACKER DE POSTULACIONES (KANBAN)

// 4 columnas según diseño de Samuel
export type ApplicationStatus =
    | 'applied'       // Aplicado
    | 'in-progress'   // En proceso
    | 'interview'     // Entrevista
    | 'rejected';     // Rechazado

export interface JobApplication {
    id: string;
    userId: string;
    jobOfferId: string;
    jobTitle: string;
    company: string;
    companyLogoUrl?: string;
    location: string;
    modality: 'remote' | 'on-site' | 'hybrid';
    status: ApplicationStatus;
    appliedAt: string;                  //2026-09-13T21:00:00Z
    updatedAt: string;
    notes?: string;
}

// ─── ANÁLISIS DE BRECHA DE HABILIDADES ───────────────────────────────────────

// Un ítem del radar: nivel del usuario vs el que pide la vacante de referencia.
// La escala la define quien consume el componente mediante su prop `max`; con
// el microservicio de Brecha/Cursos son ordinales del 1 al 4 (cv-skill-v1),
// no porcentajes. Ver SKILL_SCALE_MAX en services/skillsGapService.ts.
export interface SkillGapItem {
    name: string;
    userLevel: number;
    marketLevel: number;
}

export interface SkillsGapAnalysis {
    id: string;
    userId: string;
    targetJobTitle: string;
    skills: SkillGapItem[];
    recommendations: CourseRecommendation[];
    createdAt: string;                  // 2026-09-13T21:00:00Z
}

export interface CourseRecommendation {
    id: string;
    title: string;
    platform: string;
    url: string;
    isPaid: boolean;
    duration?: string;
}
// ─── NOTIFICACIONES ──────────────────────────────────────────────────────────

// Idioma en que el servicio de notificaciones redacta los avisos de este usuario.
// La interfaz sigue en español; esto sólo afecta el texto que llega del servidor.
export type NotificationLanguage = 'es' | 'en';

// Tipo de evento que originó la notificación (enum NotificationType del contrato)
export type NotificationType =
    | 'application.status_changed'
    | 'job.new'
    | 'cv.generated'
    | 'course.recommended';

// Esquema Notification de openapi.yaml: cada item de GET /notifications y también el
// argumento del evento "notification" de SignalR. A diferencia del resto del dominio,
// las fechas son epoch en milisegundos, no texto ISO.
export interface AppNotification {
    id: string;
    type: NotificationType;
    title: string;                      // ya renderizado en el idioma del usuario
    body: string;
    data: Record<string, unknown>;      // el data del evento original, sin cambios
    read: boolean;
    createdAt: number;                  // epoch ms
    readAt?: number;                    // epoch ms; se omite mientras read es false
}

export interface UnreadCountResponse {
    count: number;
}

// Cuerpo de PUT /notifications/directory/me
export interface NotificationDirectoryUpdate {
    language: NotificationLanguage;
}

// Respuesta de PUT /notifications/directory/me. El correo lo pone APIM desde el token.
export interface NotificationDirectoryEntry {
    userId: string;
    email: string;
    language: NotificationLanguage;
}

// Esquema Template de openapi.yaml: título y cuerpo con que el servicio redacta cada tipo
// de aviso en cada idioma. Solo los administradores lo ven y lo editan.
export interface NotificationTemplate {
    type: NotificationType;
    language: NotificationLanguage;
    title: string;                      // con marcadores {{campo}}
    body: string;
    updatedAt: number;                  // epoch ms; 0 = nunca se editó (texto por defecto)
    updatedBy?: string;                 // correo del admin; se omite en las por defecto
}

// Cuerpo de PUT /notifications/templates/{type}/{language}
export interface NotificationTemplateUpdate {
    title: string;
    body: string;
}

//Paginación

// Reemplaza PaginatedResponse<T> en api.ts — nombres exactos del enunciado
export interface PagedResult<T> {
    items: T[];
    page: number;
    pageSize: number;
    totalRecords: number;              // ojo: totalRecords, no total (lo pide el enunciado)
}

// Respuesta de error de la API — permite pintar el campo exacto del formulario
export interface ApiErrorResponse {
    status: number;
    message: string;
    errors?: Record<string, string>;  // solo en 400, ej: { "email": "ya está en uso" }
}
