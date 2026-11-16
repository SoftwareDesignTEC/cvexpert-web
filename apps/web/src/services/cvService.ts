import { http, toPaginated } from './http';
import type { CV, CvPersonalInfo, Certification, Education, Language, Skill, WorkExperience } from '../types/models';
import type { PaginationParams } from '../types/api';
export type { CvPersonalInfo } from '../types/models';

/**
 * Cuerpo de POST /cvs y PUT /cvs/{id}.
 *
 * Tres reglas del contrato que no se ven en el tipo:
 *
 * 1. Las cuatro listas son OBLIGATORIAS. Si no hay datos van como [], pero
 *    omitirlas devuelve 400. `certifications` sí es opcional.
 * 2. El PUT reemplaza el documento entero, no es un parche: hay que mandar
 *    todo de nuevo, no sólo lo que cambió.
 * 3. Estos campos los pone el servidor y no se envían: id, userId, createdAt,
 *    updatedAt y thumbnailUrl. El `id` de cada elemento de las listas también
 *    es opcional; si no va, el servidor lo genera.
 */

/** Igual que los del modelo, pero con `id` opcional: lo genera el servidor. */
type Draft<T> = Omit<T, 'id'> & { id?: string };

export interface CvInput {
    title: string;
    /** Tiene que existir en el catálogo; si no, 400 con errors.templateId */
    templateId: string;
    personalInfo: CvPersonalInfo;
    workExperiences: Draft<WorkExperience>[];
    education: Draft<Education>[];
    skills: Draft<Skill>[];
    languages: Draft<Language>[];
    certifications?: Draft<Certification>[];
}

/** Cuerpo vacío válido: las cuatro listas presentes aunque no haya datos. */
export function emptyCvInput(templateId: string, fullName = '', email = ''): CvInput {
    return {
        title: '',
        templateId,
        personalInfo: { fullName, email },
        workExperiences: [],
        education: [],
        skills: [],
        languages: [],
    };
}

/** Pasa un CV existente a cuerpo de envío, quitando lo que pone el servidor. */
export function toCvInput(cv: CV): CvInput {
    const p = cv.personalInfo;
    return {
        title: cv.title,
        templateId: cv.templateId,
        personalInfo: {
            ...p,
            fullName: p.fullName ?? '',
            email: p.email ?? '',
        },
        workExperiences: cv.workExperiences ?? [],
        education: cv.education ?? [],
        skills: cv.skills ?? [],
        languages: cv.languages ?? [],
        ...(cv.certifications ? { certifications: cv.certifications } : {}),
    };
}

/** El PUT solo se construye a partir del detalle recién leído, nunca de la lista o del análisis. */
export function withAddedSkill(cv: CV, skill: Draft<Skill>): CvInput {
    const known = ['id', 'userId', 'title', 'templateId', 'thumbnailUrl', 'createdAt', 'updatedAt',
        'personalInfo', 'workExperiences', 'education', 'skills', 'languages', 'certifications'];
    const personalFields = ['id', 'fullName', 'email', 'phone', 'address', 'photoUrl', 'bio', 'birthDate', 'types', 'modalities', 'sectors'];
    const sections: [unknown, string[]][] = [
        [cv.workExperiences, ['id', 'company', 'position', 'startDate', 'endDate', 'current', 'description', 'type']],
        [cv.education, ['id', 'institution', 'degree', 'field', 'startDate', 'endDate', 'current']],
        [cv.skills, ['id', 'name', 'level', 'category']],
        [cv.languages, ['id', 'name', 'level']],
        [cv.certifications ?? [], ['id', 'name', 'issuer', 'issuedAt', 'expiresAt', 'credentialUrl']],
    ];
    if (Object.keys(cv).some(key => !known.includes(key)) ||
        !cv.personalInfo || Object.keys(cv.personalInfo).some(key => !personalFields.includes(key)) || typeof cv.personalInfo.fullName !== 'string' ||
        typeof cv.personalInfo.email !== 'string' || typeof cv.title !== 'string' ||
        typeof cv.templateId !== 'string' || !cv.templateId ||
        ![cv.workExperiences, cv.education, cv.skills, cv.languages].every(Array.isArray) ||
        (cv.certifications !== undefined && !Array.isArray(cv.certifications)) ||
        sections.some(([rows, fields]) => !Array.isArray(rows) || rows.some(row => !row ||
            typeof row !== 'object' || Array.isArray(row) || Object.keys(row).some(key => !fields.includes(key)))) ||
        (cv.personalInfo.birthDate != null && typeof cv.personalInfo.birthDate !== 'number')) {
        throw new Error('El CV contiene datos que no podemos preservar con seguridad. No se guardó ningún cambio.');
    }
    const input = toCvInput(cv);
    // Misma equivalencia de nombres documentada por el contrato; conserva ñ y puntuación.
    const key = (name: string) => name.trim().replace(/\s+/gu, ' ').toLowerCase()
        .normalize('NFD').replace(/[\u0300\u0301\u0302\u0308]/gu, '').normalize('NFC');
    if (cv.skills.some(s => !s || typeof s.name !== 'string')) {
        throw new Error('La lista de habilidades del CV es incompatible. No se guardó ningún cambio.');
    }
    if (!cv.skills.some(s => key(s.name) === key(skill.name))) input.skills = [...input.skills, skill];
    return input;
}

/** Errores por campo que devuelve un 400: {campo: mensaje} */
export type FieldErrors = Record<string, string>;

/**
 * `updatedAt` llega como epoch en milisegundos o como texto ISO según el
 * endpoint, así que se normaliza antes de comparar. Lo que no se entiende vale
 * 0 y queda al final, que es mejor que romper el orden entero.
 */
function enMilis(v: unknown): number {
    if (typeof v === 'number') return v;
    if (typeof v === 'string') {
        const n = /^\d+$/.test(v) ? Number(v) : Date.parse(v);
        return Number.isFinite(n) ? n : 0;
    }
    return 0;
}

/**
 * Del más recientemente editado al más viejo.
 *
 * Vive acá y no en cada pantalla porque el panel principal y Mis Currículums
 * muestran la misma lista: si ordenaran por su cuenta, bastaría con que una
 * tratara distinto una fecha rara para que mostraran dos órdenes diferentes de
 * los mismos currículums.
 */
export function porUltimaEdicion<T extends { updatedAt?: unknown }>(cvs: T[]): T[] {
    return [...cvs].sort((a, b) => enMilis(b.updatedAt) - enMilis(a.updatedAt));
}

export const cvService = {
    getAll: ({ page, pageSize, search }: PaginationParams) => {
        const params = new URLSearchParams({
            page: String(page),
            pageSize: String(pageSize),
            ...(search ? { search } : {}),
        });
        return http.get<unknown>(`/cvs?${params}`).then(r => toPaginated<CV>(r, pageSize, page));
    },

    /** 404 también cuando el CV es de otro usuario: no revela que existe. */
    getById: (id: string) => http.get<CV>(`/cvs/${id}`),

    /** 201 con el CV creado. */
    create: (input: CvInput) => http.post<CV>('/cvs', input),

    /** Reemplaza el documento completo. Conserva createdAt y mueve updatedAt. */
    update: (id: string, input: CvInput) => http.put<CV>(`/cvs/${id}`, input),

    /** 204 sin cuerpo. */
    remove: (id: string) => http.delete<void>(`/cvs/${id}`),

    /**
     * Sube la foto y devuelve su enlace. La imagen no viaja dentro del
     * currículum —el profesor pidió que se subiera aparte y que en el documento
     * quedara sólo el enlace—, y la ruta no lleva el id del currículum porque
     * la foto se elige mientras se está creando uno que todavía no existe.
     */
    uploadPhoto: (imagen: Blob) => {
        const form = new FormData();
        form.append('file', imagen, 'foto.jpg');
        return http.upload<{ url: string }>('/cvs/photos', form).then(r => r.url);
    },
};
