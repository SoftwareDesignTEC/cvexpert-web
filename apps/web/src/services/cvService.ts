import { http } from './http';
import type { CV } from '../types/models';
import type { PaginatedResponse, PaginationParams } from '../types/api';

export const cvService = {
    getAll: ({ page, pageSize, search }: PaginationParams) => {
        const params = new URLSearchParams({
            page: String(page),
            pageSize: String(pageSize),
            ...(search ? { search } : {}),
        });
        return http.get<PaginatedResponse<CV>>(`/cvs?${params}`);
    },

    getById: (id: string) =>
        http.get<CV>(`/cvs/${id}`),

    create: (data: Omit<CV, 'id' | 'createdAt' | 'updatedAt'>) =>
        http.post<CV>('/cvs', data),

    update: (id: string, data: Partial<CV>) =>
        http.put<CV>(`/cvs/${id}`, data),

    delete: (id: string) =>
        http.delete<void>(`/cvs/${id}`),
};