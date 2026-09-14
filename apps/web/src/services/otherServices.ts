import { http } from './http';
import type { CVTemplate, JobOffer, JobApplication, ApplicationStatus } from '../types/models';
import type { PaginatedResponse, PaginationParams } from '../types/api';

// ─── PLANTILLAS ───────────────────────────────────────────────────────────────

export const templateService = {
    getAll: ({ page, pageSize, search }: PaginationParams) => {
        const params = new URLSearchParams({
            page: String(page),
            pageSize: String(pageSize),
            ...(search ? { search } : {}),
        });
        return http.get<PaginatedResponse<CVTemplate>>(`/templates?${params}`);
    },
};

// ─── OFERTAS LABORALES ────────────────────────────────────────────────────────

export const jobService = {
    getAll: ({ page, pageSize, search }: PaginationParams) => {
        const params = new URLSearchParams({
            page: String(page),
            pageSize: String(pageSize),
            ...(search ? { search } : {}),
        });
        return http.get<PaginatedResponse<JobOffer>>(`/jobs?${params}`);
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
        return http.get<PaginatedResponse<JobApplication>>(`/applications?${params}`);
    },

    create: (data: Omit<JobApplication, 'id' | 'appliedAt' | 'updatedAt'>) =>
        http.post<JobApplication>('/applications', data),

    updateStatus: (id: string, status: ApplicationStatus) =>
        http.put<JobApplication>(`/applications/${id}`, { status }),
};