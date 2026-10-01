import { http, toPaginated } from './http';
import type { CV } from '../types/models';
import type { PaginationParams } from '../types/api';

export const cvService = {
    getAll: ({ page, pageSize, search }: PaginationParams) => {
        const params = new URLSearchParams({
            page: String(page),
            pageSize: String(pageSize),
            ...(search ? { search } : {}),
        });
        return http.get<unknown>(`/cvs?${params}`).then(r => toPaginated<CV>(r, pageSize, page));
    },

    getById: (id: string) =>
        http.get<CV>(`/cvs/${id}`),
};