import { http } from './http';

// Tipos según la respuesta real de APIM — no coinciden con SkillGapItem /
// CourseRecommendation de types/models.ts (esos quedaron desactualizados),
// así que se definen aparte para no arrastrar esa inconsistencia.
export interface CourseSuggestion {
    id: string;
    title: string;
    url: string;
    platform: string;
    logoUrl?: string;
    durationHours: number;
}

export interface SkillGapApiItem {
    skillName: string;
    userLevel: number;
    marketLevel: number;
    courses: CourseSuggestion[];
}

interface SkillsGapResponse {
    items: SkillGapApiItem[];
}

export const skillsGapService = {
    getAll: () => http.get<SkillsGapResponse>('/skills-gap'),
};