import apiFetch, { type PaginatedResponse } from './api';
import type { CV } from '../types/models';

export async function getCVs(page = 1, pageSize = 10): Promise<PaginatedResponse<CV>> {
    return apiFetch<PaginatedResponse<CV>>(`/cvs?page=${page}&pageSize=${pageSize}`);
}

export async function getCVById(id: string): Promise<CV> {
    return apiFetch<CV>(`/cvs/${id}`);
}