import { http } from './http';

export interface Course {
    id: string;
    title: string;
    url: string;
    platform: string;
    logoUrl: string | null;
    durationHours: number | null;
    isPaid: boolean;
    skills: string[];
}

/** Plataforma y habilidad usan coincidencia exacta del servidor, sensible a mayúsculas y acentos. */
export interface CourseFilters {
    platform?: string;
    isPaid?: boolean;
    skillName?: string;
}

export interface CoursePage {
    items: Course[];
    page: number;
    pageSize: number;
    totalRecords: number;
    excluded: number;
}

export function safeCourseUrl(value: unknown): value is string {
    if (typeof value !== 'string') return false;
    try {
        const url = new URL(value);
        return ['http:', 'https:'].includes(url.protocol) && !!url.hostname && !url.username && !url.password;
    } catch { return false; }
}

const object = (value: unknown): value is Record<string, unknown> =>
    value !== null && typeof value === 'object' && !Array.isArray(value);
const text = (value: unknown): value is string => typeof value === 'string' && !!value.trim();

export function validCourse(course: unknown): course is Course {
    return object(course) && text(course.id) && text(course.title) && text(course.platform) && safeCourseUrl(course.url) &&
        (course.logoUrl === null || safeCourseUrl(course.logoUrl)) && (course.durationHours === null ||
        (Number.isSafeInteger(course.durationHours) && Number(course.durationHours) >= 0)) &&
        typeof course.isPaid === 'boolean' && Array.isArray(course.skills) && course.skills.every(text);
}

export function publishedCourse(course: Course): boolean {
    if (!safeCourseUrl(course.url) || [course.title, course.platform, ...course.skills].some(s => /\[(DEMO|TEST)\]/i.test(s))) return false;
    const host = new URL(course.url).hostname.toLowerCase();
    return !['example.com', 'example.net', 'example.org', 'example.edu', 'localhost'].some(h => host === h || host.endsWith(`.${h}`)) &&
        !['.example', '.test', '.invalid', '.local'].some(suffix => host.endsWith(suffix));
}

export function coursesQuery(page: number, pageSize: number, filters: CourseFilters = {}): URLSearchParams {
    if (!Number.isSafeInteger(page) || page < 1 || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) {
        throw new Error('La página solicitada del catálogo no es válida.');
    }
    const query = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    for (const key of ['platform', 'skillName'] as const) {
        const value = filters[key];
        if (value?.trim()) {
            if (value.includes('\0')) throw new Error('El filtro del catálogo contiene caracteres no válidos.');
            query.set(key, value);
        }
    }
    if (filters.isPaid !== undefined) query.set('isPaid', String(filters.isPaid));
    return query;
}

/** Descarta registros inseguros o de prueba sin cambiar totalRecords ni la numeración del servidor. */
export function readCoursePage(raw: unknown, page: number, pageSize: number): CoursePage {
    if (!object(raw) || raw.page !== page || raw.pageSize !== pageSize ||
        !Number.isSafeInteger(raw.totalRecords) || Number(raw.totalRecords) < 0 || !Array.isArray(raw.items) ||
        raw.items.length > pageSize || raw.items.length > Number(raw.totalRecords)) {
        throw new Error('El servidor devolvió una página incompatible con el catálogo de cursos.');
    }
    const ids = new Set<string>();
    const items = raw.items.filter((course): course is Course => {
        if (!validCourse(course) || !publishedCourse(course) || ids.has(course.id)) return false;
        ids.add(course.id);
        return true;
    });
    return { items, page, pageSize, totalRecords: Number(raw.totalRecords), excluded: raw.items.length - items.length };
}

export const courseService = {
    getAll: async ({ page = 1, pageSize = 8, ...filters }: CourseFilters & { page?: number; pageSize?: number } = {}): Promise<CoursePage> => {
        const query = coursesQuery(page, pageSize, filters);
        return readCoursePage(await http.get<unknown>(`/courses?${query}`), page, pageSize);
    },
};
