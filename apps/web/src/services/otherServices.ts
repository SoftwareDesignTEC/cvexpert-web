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

export const jobService = {
    getAll: ({ page, pageSize, search }: PaginationParams) => {
        const params = new URLSearchParams({
            page: String(page),
            pageSize: String(pageSize),
            ...(search ? { search } : {}),
        });
        return http.get<unknown>(`/jobs?${params}`).then(r => toPaginated<JobOffer>(r, pageSize, page));
    },

    getById: (id: string) =>
        http.get<JobOffer>(`/jobs/${id}`),
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