import { ApiError, http } from './http';
import type { CV, JobOffer } from '../types/models';
import { courseService, publishedCourse, validCourse } from './courseService';
import type { Course } from './courseService';
import { projectCvForJob } from './jobGapProjection';

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
export type CourseSuggestion = Course;

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
    // Se exige el código, no sólo el 409: otro conflicto distinto no debe
    // confundirse con "el usuario todavía no cargó habilidades".
    return err instanceof ApiError
        && err.status === 409
        && err.code === 'SKILLS_INPUT_REQUIRED';
}

/**
 * El contrato 0.2.0 exige `items` y `analysis`. Si falta alguno, la respuesta no
 * es un análisis vacío: es una respuesta incompatible, y hay que decirlo. Rellenar
 * los metadatos haría pasar por válido, por ejemplo, al mock viejo de la Fase I.
 */
function normalize(res: Partial<SkillsGapResponse> | null | undefined): SkillsGapResponse {
    const r = res ?? {};
    const analysis = r.analysis;

    if (!Array.isArray(r.items) || !analysis || typeof analysis !== 'object') {
        throw new Error(
            'el servidor devolvió una respuesta que no corresponde al contrato del análisis de brecha',
        );
    }

    return {
        items: r.items,
        page: r.page ?? 1,
        pageSize: r.pageSize ?? 20,
        totalRecords: r.totalRecords ?? r.items.length,
        analysis: {
            ...analysis,
            unresolved: Array.isArray(analysis.unresolved) ? analysis.unresolved : [],
        },
    };
}

export const skillsGapService = {
    coursesForSkill: (skillName: string, page = 1) => courseService.getAll({ skillName, page, pageSize: 5 }),
    recommendForJob: async (cv: CV, job: JobOffer) => {
        const body = jobGapInput(cv, job, false);
        return readJobGap(await http.post<unknown>('/skills-gap/recommendations', body), cv.id, job.id, true);
    },
    evaluateForJob: async (cv: CV, job: JobOffer) => {
        const body = jobGapInput(cv, job, true);
        return readJobGap(await http.post<unknown>('/skills-gap/evaluate', body), cv.id, job.id, false);
    },
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

export interface JobLevelAssessment {
    name: string;
    cvLevel: SkillLevel | null;
    requiredLevel: SkillLevel | null;
    evidenceSource: 'description' | 'requirements' | null;
    evidenceText: string | null;
    detectionStatus: 'explicit' | 'unknown' | 'conflict';
    reason: 'no_explicit_evidence' | 'optional' | 'negated' | 'contradictory' | 'ambiguous' | null;
    status: 'documented_skill_below_required' | 'documented_skill_meets_required' | 'not_documented' | 'unknown_required_level';
    deficitSteps: number | null;
}

export interface JobGapResult {
    jobId: string;
    status: 'complete' | 'partial' | 'insufficient_information';
    requiredSkillsCount: number;
    documentedMatchesCount: number;
    documentedCoveragePercent: number | null;
    matchedSkills: { name: string; cvLevel: SkillLevel }[];
    notDocumentedSkills: string[];
    skillLevelAssessments?: JobLevelAssessment[];
    levelAnalysis?: {
        scale: 'cv-skill-v1';
        comparedSkillsCount: number;
        belowRequiredCount: number;
        meetsRequiredCount: number;
        notDocumentedCount: number;
        unknownRequiredLevelCount: number;
        conflictCount: number;
    };
    recommendations?: { skillName: string; catalogMatch: 'matched' | 'not_found' | 'ambiguous'; courses: CourseSuggestion[] }[];
}

export interface ContextualGap {
    cvId: string;
    catalogStatus?: 'consulted' | 'not_needed';
    /** Cursos descartados por datos inválidos, enlaces inseguros o ID repetido dentro de un grupo. */
    excludedCourses?: number;
    result: JobGapResult;
}

/** Un curso aparece una sola vez, conservando todas las habilidades que lo recomendaron. */
export function uniqueRecommendationCourses(groups: NonNullable<JobGapResult['recommendations']>): (CourseSuggestion & { skillName: string })[] {
    const byId = new Map<string, { course: CourseSuggestion; skills: Set<string> }>();
    for (const group of groups) {
        for (const course of group.courses) {
            const existing = byId.get(course.id);
            if (existing) existing.skills.add(group.skillName);
            else byId.set(course.id, { course, skills: new Set([group.skillName]) });
        }
    }
    return [...byId.values()].map(({ course, skills }) => ({
        ...course, skillName: [...skills].join(', '),
    }));
}

function compatible(condition: unknown): asserts condition {
    if (!condition) throw new Error('El servidor devolvió una respuesta incompatible con el análisis por oferta.');
}
const text = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;
const level = (v: unknown): v is SkillLevel => SKILL_LEVELS.includes(v as SkillLevel);
const count = (v: unknown): v is number => Number.isInteger(v) && Number(v) >= 0 && Number(v) <= 200;
const object = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v);

/** Proyecciones cerradas e independientes: jamás se envía texto a recomendaciones. */
export function jobGapInput(cv: CV, job: JobOffer, evaluation: boolean) {
    if (!Array.isArray(cv.skills) || cv.skills.some(s => !s || !level(s.level))) {
        throw new Error('El CV contiene niveles inválidos. Corregilos en Mis Currículums antes de analizar.');
    }
    const validText = (v: unknown, max: number, blank = false) => typeof v === 'string' &&
        (blank || v.trim().length > 0) && [...v].length <= max &&
        [...v].every(char => {
            const code = char.codePointAt(0)!;
            return !(code >= 0xD800 && code <= 0xDFFF) &&
                (code >= 32 && !(code >= 127 && code <= 159) || [9, 10, 13].includes(code));
        });
    const skills = job.skills ?? [];
    if (!validText(cv.id, 200) || !validText(job.id, 200) || cv.skills.length > 500 ||
        cv.skills.some(s => !validText(s.name, 200)) || !Array.isArray(skills) || skills.length > 200 ||
        skills.some(s => !validText(s, 200, true)) || (evaluation &&
        (!validText(job.description, 20000, true) || !Array.isArray(job.requirements) ||
        job.requirements.length > 100 || job.requirements.some(r => !validText(r, 2000, true))))) {
        throw new Error('Los datos del CV o de la oferta no cumplen el contrato de análisis.');
    }
    const projection = projectCvForJob(cv, skills);
    if (projection.skills.length > 500 || projection.skills.some(s => !validText(s.name, 200))) {
        throw new Error('Las habilidades e idiomas proyectados superan los límites del contrato de análisis.');
    }
    const body = {
        cv: projection,
        jobs: [{ id: job.id, skills, ...(evaluation ? { description: job.description, requirements: job.requirements } : {}) }],
    };
    if (new TextEncoder().encode(JSON.stringify(body)).length > 100 * 1024) {
        throw new Error('El CV y la oferta superan el tamaño permitido para el análisis (100 KiB).');
    }
    return body;
}

/** Valida identidad, nulabilidad y coherencia; no recalcula ni reemplaza resultados del servidor. */
export function readJobGap(raw: unknown, cvId: string, jobId: string, courses: boolean): ContextualGap {
    compatible(object(raw) && raw.cvId === cvId && raw.dataSource === 'client_request' &&
        Array.isArray(raw.results) && raw.results.length === 1);
    const r = raw.results[0];
    compatible(object(r) && r.jobId === jobId && ['complete', 'partial', 'insufficient_information'].includes(String(r.status)) &&
        count(r.requiredSkillsCount) && count(r.documentedMatchesCount) &&
        Array.isArray(r.matchedSkills) && Array.isArray(r.notDocumentedSkills));
    compatible(r.matchedSkills.every(m => object(m) && text(m.name) && level(m.cvLevel)) && r.notDocumentedSkills.every(text));
    const matchedSkills = r.matchedSkills;
    const notDocumentedSkills = r.notDocumentedSkills;
    const names = [...r.matchedSkills.map(m => m.name), ...r.notDocumentedSkills];
    compatible(new Set(names).size === names.length && r.requiredSkillsCount === names.length &&
        r.documentedMatchesCount === r.matchedSkills.length);
    if (r.status === 'insufficient_information') compatible(names.length === 0 && r.documentedCoveragePercent === null);
    else compatible(names.length > 0 && typeof r.documentedCoveragePercent === 'number' &&
        Number.isFinite(r.documentedCoveragePercent) && r.documentedCoveragePercent >= 0 && r.documentedCoveragePercent <= 100 &&
        Math.abs(r.documentedCoveragePercent - r.documentedMatchesCount * 100 / names.length) <= 0.0051 &&
        (r.status === 'complete') === (r.notDocumentedSkills.length === 0));
    let excludedCourses = 0;
    let cleanedRecommendations: NonNullable<JobGapResult['recommendations']> | undefined;
    if (courses) {
        compatible(['consulted', 'not_needed'].includes(String(raw.catalogStatus)) && Array.isArray(r.recommendations) &&
            r.recommendations.length === r.notDocumentedSkills.length &&
            (raw.catalogStatus === 'not_needed') === (r.notDocumentedSkills.length === 0));
        cleanedRecommendations = r.recommendations.map((g, i) => {
            compatible(object(g) && g.skillName === notDocumentedSkills[i] &&
                ['matched', 'not_found', 'ambiguous'].includes(String(g.catalogMatch)) && Array.isArray(g.courses) && g.courses.length <= 5);
            compatible(g.catalogMatch === 'matched' || g.courses.length === 0);
            const seen = new Set<string>();
            const safeCourses: CourseSuggestion[] = [];
            for (const course of g.courses) {
                if (!validCourse(course) || !publishedCourse(course) || seen.has(course.id)) {
                    excludedCourses++;
                    continue;
                }
                seen.add(course.id);
                safeCourses.push(course);
            }
            return { skillName: g.skillName as string, catalogMatch: g.catalogMatch as 'matched' | 'not_found' | 'ambiguous', courses: safeCourses };
        });
    }
    compatible((r.skillLevelAssessments === undefined) === (r.levelAnalysis === undefined));
    if (r.skillLevelAssessments !== undefined) {
        compatible(Array.isArray(r.skillLevelAssessments) && r.skillLevelAssessments.length === names.length && object(r.levelAnalysis));
        const assessments = r.skillLevelAssessments;
        compatible(new Set(assessments.map(a => a?.name)).size === names.length);
        assessments.forEach(a => {
            compatible(object(a) && names.includes(a.name) && (a.cvLevel === null || level(a.cvLevel)) &&
                (a.requiredLevel === null || level(a.requiredLevel)) && ['explicit', 'unknown', 'conflict'].includes(String(a.detectionStatus)) &&
                ['documented_skill_below_required', 'documented_skill_meets_required', 'not_documented', 'unknown_required_level'].includes(String(a.status)) &&
                [null, 'no_explicit_evidence', 'optional', 'negated', 'contradictory', 'ambiguous'].includes(a.reason as string) &&
                (a.deficitSteps === null || (Number.isInteger(a.deficitSteps) && Number(a.deficitSteps) >= 0 && Number(a.deficitSteps) <= 3)));
            compatible(a.detectionStatus === 'explicit'
                ? level(a.requiredLevel) && ['description', 'requirements'].includes(String(a.evidenceSource)) && text(a.evidenceText) && a.reason === null
                : a.requiredLevel === null && a.evidenceSource === null && a.evidenceText === null && text(a.reason));
            const match = matchedSkills.find(m => m.name === a.name);
            compatible(match ? a.cvLevel === match.cvLevel && a.status !== 'not_documented'
                : a.cvLevel === null && a.status === 'not_documented' && a.deficitSteps === null);
            if (a.status === 'unknown_required_level') compatible(a.requiredLevel === null && a.deficitSteps === null);
            if (String(a.status).startsWith('documented_skill_')) compatible(level(a.requiredLevel) && level(a.cvLevel) &&
                a.detectionStatus === 'explicit' && (a.status === 'documented_skill_below_required' ? Number(a.deficitSteps) > 0 : a.deficitSteps === 0));
        });
        const l = r.levelAnalysis;
        compatible(l.scale === 'cv-skill-v1');
        const counters = {
            belowRequiredCount: assessments.filter(a => a.status === 'documented_skill_below_required').length,
            meetsRequiredCount: assessments.filter(a => a.status === 'documented_skill_meets_required').length,
            notDocumentedCount: assessments.filter(a => a.status === 'not_documented').length,
            unknownRequiredLevelCount: assessments.filter(a => a.status === 'unknown_required_level').length,
            conflictCount: assessments.filter(a => a.detectionStatus === 'conflict').length,
        };
        compatible(Object.entries(counters).every(([k, n]) => l[k] === n) &&
            l.comparedSkillsCount === counters.belowRequiredCount + counters.meetsRequiredCount);
    }
    return { cvId, result: { ...r, ...(courses ? { recommendations: cleanedRecommendations } : {}) } as JobGapResult,
        ...(courses ? { catalogStatus: raw.catalogStatus as ContextualGap['catalogStatus'], excludedCourses } : {}) };
}

export function mergeJobGap(courses: ContextualGap, evaluation: ContextualGap): ContextualGap {
    const a = courses.result, b = evaluation.result;
    compatible(courses.cvId === evaluation.cvId && a.jobId === b.jobId && a.status === b.status &&
        a.requiredSkillsCount === b.requiredSkillsCount && a.documentedMatchesCount === b.documentedMatchesCount &&
        a.documentedCoveragePercent === b.documentedCoveragePercent &&
        JSON.stringify(a.matchedSkills) === JSON.stringify(b.matchedSkills) &&
        JSON.stringify(a.notDocumentedSkills) === JSON.stringify(b.notDocumentedSkills));
    return { ...courses, result: { ...a, skillLevelAssessments: b.skillLevelAssessments, levelAnalysis: b.levelAnalysis } };
}
