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
    companyLogoUrl?: string;
    location: string;
    modality: 'remote' | 'on-site' | 'hybrid';
    type: 'full-time' | 'part-time' | 'freelance' | 'internship';
    sector: string;
    description: string;
    requirements: string[];
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

// Un ítem del radar: nivel del usuario vs lo que se frecuenta en el mercado actual
export interface SkillGapItem {
    name: string;
    userLevel: number;                  // 0-100
    marketLevel: number;                // 0-100
}

// Conversión de nivel categórico a numérico para el radar
export const levelToNumber: Record<Skill['level'], number> = {
    beginner:     25,
    intermediate: 50,
    advanced:     75,
    expert:       100,
};

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

// A diferencia del resto del dominio, el servicio de notificaciones manda las
// fechas como epoch en milisegundos, no como texto ISO.
export interface AppNotification {
    id: string;
    type: string;                       // categoría libre, p. ej. 'application' o 'job'
    title: string;
    message: string;
    link?: string;                      // ruta interna a la que lleva el aviso
    createdAt: number;                  // epoch ms
    readAt: number | null;              // epoch ms; null = sin leer
}

export interface UnreadCountResponse {
    count: number;
}

// Lo que el servicio necesita saber del usuario para enviarle avisos
export interface NotificationDirectoryEntry {
    language: NotificationLanguage;
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
