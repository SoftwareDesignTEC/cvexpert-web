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
};

// OFERTAS LABORALES

// El APIM nombra distinto algunos campos (compatibility, createdAt) y no envía
// `type`, `sector` ni `description`. Se traduce acá para no esparcir esa diferencia
// por las pantallas, igual que se hace con el perfil.
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
        sector: res.sector ?? '',
        description: res.description ?? '',
        requirements: res.requirements ?? [],
        skills: res.skills ?? [],
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
            return { ...paged, items: paged.items.map(toJobOffer) };
        });
    },

    getById: (id: string) =>
        http.get<JobApiResponse>(`/jobs/${id}`).then(toJobOffer),
};

// ─── TRACKER DE POSTULACIONES ─────────────────────────────────────────────────

export const applicationService = {
    getAll: ({ page, pageSize, search }: PaginationParams) => {
        const params = new URLSearchParams({
            page: String(page),
            pageSize: String(pageSize),
            ...(search ? { search } : {}),
        });
        return http.get<unknown>(`/applications?${params}`).then(r => toPaginated<JobApplication>(r, pageSize, page));
    },

    create: (data: Omit<JobApplication, 'id' | 'appliedAt' | 'updatedAt'>) =>
        http.post<JobApplication>('/applications', data),

    updateStatus: (id: string, status: ApplicationStatus) =>
        http.put<JobApplication>(`/applications/${id}`, { status }),
};