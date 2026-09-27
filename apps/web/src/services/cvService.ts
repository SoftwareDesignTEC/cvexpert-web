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
};