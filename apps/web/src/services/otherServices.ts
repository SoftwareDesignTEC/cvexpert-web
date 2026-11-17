import { JobListingError } from './jobSearch';
import { http, toPaginated } from './http';
import type { CVTemplate, JobOffer, JobApplication, ApplicationStatus } from '../types/models';
import type { PaginationParams } from '../types/api';

// PLANTILLAS

export const templateService = {
    getAll: ({ page, pageSize, search }: PaginationParams) => {
        const params = new URLSearchParams({
            page: String(page),
            pageSize: String(pageSize),
            ...(search ? { search } : {}),
        });
        return http.get<unknown>(`/templates?${params}`).then(r => toPaginated<CVTemplate>(r, pageSize, page));
    },

    /** Trae una plantilla puntual; de acá sale el `layout` con el que se dibuja el CV. */
    getById: (id: string) => http.get<CVTemplate>(`/templates/${id}`),
};

// OFERTAS LABORALES

// Se conservan los alias de APIM y se distingue la paginación real de respuestas
// antiguas sin metadatos. La disponibilidad de filtros se valida en integración.
interface JobApiResponse {
    id: string;
    title: string;
    company: string;
    companyLogoUrl?: string;
    logoUrl?: string;
    location: string;
    modality: JobOffer['modality'];
    type?: JobOffer['type'];
    sector?: string;
    description?: string;
    requirements?: string[];
    skills?: string[];
    applyUrl?: string;
    salary?: JobOffer['salary'];
    compatibility?: number;
    matchScore?: number;
    createdAt?: string;
    postedAt?: string;
}

function toJobOffer(res: JobApiResponse): JobOffer {
    return {
        id: res.id,
        title: res.title,
        company: res.company,
        companyLogoUrl: res.companyLogoUrl ?? res.logoUrl,
        location: res.location,
        modality: res.modality,
        type: res.type ?? 'full-time',
        typeProvided: res.type != null,
        sector: res.sector ?? '',
        description: res.description ?? '',
        requirements: res.requirements ?? [],
        skills: res.skills ?? [],
        applyUrl: res.applyUrl,
        // Faltaba mapearlo: el diálogo de detalle lo pinta si viene
        salary: res.salary,
        matchScore: res.matchScore ?? res.compatibility,
        postedAt: res.postedAt ?? res.createdAt ?? '',
    };
}

export const jobService = {
    getAll: ({ page, pageSize, search }: PaginationParams) => {
        const params = new URLSearchParams({
            page: String(page),
            pageSize: String(pageSize),
            ...(search ? { search } : {}),
        });
        return http.get<unknown>(`/jobs?${params}`).then(r => {
            const paged = toPaginated<JobApiResponse>(r, pageSize, page);
            const raw = r as Partial<typeof paged> | null;
            const paginationVerified = !Array.isArray(r) && raw?.page === page && raw?.pageSize === pageSize &&
                Number.isSafeInteger(raw?.totalRecords) && Number(raw?.totalRecords) >= 0 &&
                Array.isArray(raw?.items) && raw.items.length <= pageSize && raw.items.length <= Number(raw.totalRecords);
            return { ...paged, items: paged.items.map(toJobOffer), paginationVerified };
        });
    },

    getById: (id: string) =>
        http.get<JobApiResponse>(`/jobs/${encodeURIComponent(id)}`).then(res => {
            if (res.id !== id) throw new JobListingError('wrongDetail', 'El detalle recibido corresponde a otra oferta.');
            return toJobOffer(res);
        }),
};

// ─── TRACKER DE POSTULACIONES ─────────────────────────────────────────────────

// El APIM escribe los estados con guion bajo (in_progress) y a veces en mayusculas,
// mientras el dominio usa guion medio. Sin normalizar, esas postulaciones no caen en
// ninguna columna del tablero y desaparecen de la vista.
const STATUS_ALIASES: Record<string, ApplicationStatus> = {
    interested: 'interested',
    applied: 'applied',
    'in-progress': 'in-progress',
    in_progress: 'in-progress',
    inprogress: 'in-progress',
    interview: 'interview',
    rejected: 'rejected',
};

function normalizeStatus(raw: unknown): ApplicationStatus {
    const key = String(raw ?? '').trim().toLowerCase();
    return STATUS_ALIASES[key] ?? 'applied';
}

function toApplication(res: JobApplication): JobApplication {
    return { ...res, status: normalizeStatus(res.status) };
}

export const applicationService = {
    getAll: ({ page, pageSize, search }: PaginationParams) => {
        const params = new URLSearchParams({
            page: String(page),
            pageSize: String(pageSize),
            ...(search ? { search } : {}),
        });
        return http.get<unknown>(`/applications?${params}`).then(r => {
            const paged = toPaginated<JobApplication>(r, pageSize, page);
            return { ...paged, items: paged.items.map(toApplication) };
        });
    },

    /**
     * `initialStatus` dice en qué columna del tablero queda. El `status` del
     * cuerpo lo ignora el servicio, así que es este campo el que manda.
     */
    create: (
        data: Omit<JobApplication, 'id' | 'appliedAt' | 'updatedAt'>,
        initialStatus?: ApplicationStatus,
    ) =>
        http.post<JobApplication>('/applications', { ...data, initialStatus }),

    updateStatus: (id: string, status: ApplicationStatus) =>
        http.put<JobApplication>(`/applications/${id}`, { status }),

    /** Retirar una postulación. Responde 204 sin cuerpo. */
    remove: (id: string) => http.delete<void>(`/applications/${id}`),
};
