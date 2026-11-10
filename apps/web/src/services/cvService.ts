import { http, toPaginated } from './http';
import type { CV, Certification, Education, Language, Skill, WorkExperience } from '../types/models';
import type { PaginationParams } from '../types/api';

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
export interface CvPersonalInfo {
    // fullName y email son los dos obligatorios del bloque (required en el
    // esquema del servicio). Ojo: el backend ignora en silencio las claves que
    // no conoce, así que mandar `name` en vez de `fullName` termina en un 400
    // por campo faltante, no en un error descriptivo.
    fullName: string;
    email: string;
    phone?: string;
    /** Opcional, a diferencia de fullName y email */
    address?: string;
    photoUrl?: string;
    bio?: string;
    birthDate?: number | null;
}

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
    const p = cv.personalInfo as unknown as Partial<CvPersonalInfo>;
    return {
        title: cv.title,
        templateId: cv.templateId,
        personalInfo: {
            fullName: p.fullName ?? '',
            email: p.email ?? '',
            phone: p.phone,
            address: p.address,
            photoUrl: p.photoUrl,
            bio: p.bio,
            birthDate: typeof p.birthDate === 'number' ? p.birthDate : undefined,
        },
        workExperiences: cv.workExperiences ?? [],
        education: cv.education ?? [],
        skills: cv.skills ?? [],
        languages: cv.languages ?? [],
        ...(cv.certifications ? { certifications: cv.certifications } : {}),
    };
}

/** Errores por campo que devuelve un 400: {campo: mensaje} */
export type FieldErrors = Record<string, string>;

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
};
