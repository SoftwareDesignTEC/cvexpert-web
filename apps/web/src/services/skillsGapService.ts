import { ApiError, http } from './http';

// Contrato del microservicio de Brecha/Cursos (OpenAPI 0.2.0).
// Los tipos viven acá y no en types/models.ts porque SkillGapItem de ese archivo
// quedó de la Fase I, cuando los niveles eran porcentajes.

// ── Escala cv-skill-v1 ────────────────────────────────────────────────────────
// Los niveles son ORDINALES del 1 al 4, no porcentajes: la diferencia entre 1 y 3
// son dos pasos, no un 2 % ni un 50 %. El radar debe escalar contra este máximo.
export const SKILL_SCALE_MAX = 4;

export type SkillLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';

export const SKILL_LEVELS: SkillLevel[] = ['beginner', 'intermediate', 'advanced', 'expert'];

// La API habla en etiquetas; el radar y las barras necesitan el ordinal
export const LEVEL_VALUE: Record<SkillLevel, number> = {
    beginner: 1,
    intermediate: 2,
    advanced: 3,
    expert: 4,
};

export const LEVEL_LABEL: Record<SkillLevel, string> = {
    beginner: 'Principiante',
    intermediate: 'Intermedio',
    advanced: 'Avanzado',
    expert: 'Experto',
};

// Para mostrar un nivel numérico que llega en items[]
export function levelLabel(value: number | null | undefined): string {
    if (value == null) return 'Sin definir';
    const key = SKILL_LEVELS[value - 1];
    return key ? LEVEL_LABEL[key] : `Nivel ${value}`;
}

// ── Respuesta de GET /skills-gap ──────────────────────────────────────────────
export interface CourseSuggestion {
    id: string;
    title: string;
    url: string;
    platform: string;
    // Ambos pueden venir nulos: hay cursos sin logo y sin duración publicada
    logoUrl: string | null;
    durationHours: number | null;
    isPaid: boolean;
    skills: string[];
}

export interface SkillGapApiItem {
    skillName: string;
    userLevel: number;
    marketLevel: number;
    // Pasos ordinales que faltan para alcanzar el requisito
    deficitSteps: number;
    courses: CourseSuggestion[];
}

export type UnresolvedReason =
    | 'MISSING_USER_SKILL'
    | 'MISSING_MARKET_REQUIREMENT'
    | 'UNKNOWN_LEVEL'
    | 'UNKNOWN_SCALE'
    | 'SCALE_MISMATCH';

export interface UnresolvedSkill {
    skillName: string;
    reason: UnresolvedReason;
    userLevel: number | null;
    marketLevel: number | null;
}

// Por qué una habilidad no se pudo comparar, en palabras del usuario
export const UNRESOLVED_REASON_LABEL: Record<UnresolvedReason, string> = {
    MISSING_USER_SKILL: 'La vacante la pide y todavía no la declaraste',
    MISSING_MARKET_REQUIREMENT: 'La declaraste, pero la vacante de referencia no la exige',
    UNKNOWN_LEVEL: 'Falta el nivel de alguna de las dos partes',
    UNKNOWN_SCALE: 'No hay información de escala para compararla',
    SCALE_MISMATCH: 'Las escalas no son compatibles entre sí',
};

export type AnalysisStatus = 'empty' | 'incomplete' | 'complete';
export type MarketStatus = 'missing' | 'available';

export interface SkillsGapAnalysis {
    status: AnalysisStatus;
    comparedSkills: number;
    scaleKey: string;
    marketStatus: MarketStatus;
    // No viene paginado: llegan todas
    unresolved: UnresolvedSkill[];
}

export interface SkillsGapResponse {
    items: SkillGapApiItem[];
    page: number;
    pageSize: number;
    // Cuenta brechas calculables, no todas las habilidades del usuario
    totalRecords: number;
    analysis: SkillsGapAnalysis;
}

// ── Cuerpo de PUT /skills-gap/input ───────────────────────────────────────────
export interface SkillInput {
    skillName: string;
    level: SkillLevel | null;
}

/**
 * Un 409 con SKILLS_INPUT_REQUIRED no es una falla: significa que el usuario
 * todavía no guardó ninguna instantánea de habilidades. La pantalla lo trata
 * como estado inicial, no como error con botón de reintentar.
 */
export function isSkillsInputRequired(err: unknown): boolean {
    return err instanceof ApiError
        && err.status === 409
        && (err.code === undefined || err.code === 'SKILLS_INPUT_REQUIRED');
}

// Defensivo: si falta `analysis` entero, la pantalla no debe reventar
const EMPTY_ANALYSIS: SkillsGapAnalysis = {
    status: 'empty',
    comparedSkills: 0,
    scaleKey: 'cv-skill-v1',
    marketStatus: 'missing',
    unresolved: [],
};

function normalize(res: Partial<SkillsGapResponse> | null | undefined): SkillsGapResponse {
    const r = res ?? {};
    const analysis = r.analysis ?? EMPTY_ANALYSIS;
    return {
        items: Array.isArray(r.items) ? r.items : [],
        page: r.page ?? 1,
        pageSize: r.pageSize ?? 20,
        totalRecords: r.totalRecords ?? 0,
        analysis: {
            ...EMPTY_ANALYSIS,
            ...analysis,
            unresolved: Array.isArray(analysis.unresolved) ? analysis.unresolved : [],
        },
    };
}

export const skillsGapService = {
    /** `pageSize` admite hasta 100; el servicio usa 20 por defecto. */
    getAll: async (page = 1, pageSize = 20): Promise<SkillsGapResponse> => {
        const res = await http.get<Partial<SkillsGapResponse>>(
            `/skills-gap?page=${page}&pageSize=${pageSize}`,
        );
        return normalize(res);
    },

    /**
     * REEMPLAZA la lista completa de habilidades del usuario; no agrega.
     * Responde 204 sin cuerpo, así que después hay que volver a pedir el análisis.
     * La identidad la pone APIM: no se manda X-User-Id desde el cliente.
     */
    saveInput: (skills: SkillInput[]): Promise<void> =>
        http.put<void>('/skills-gap/input', { skills }),
};
