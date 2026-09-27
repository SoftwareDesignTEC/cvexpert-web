import apiFetch, { type PaginatedResponse } from './api';
import type { JobOffer } from '../types/models';

export async function getJobs(page = 1, pageSize = 10): Promise<PaginatedResponse<JobOffer>> {
    return apiFetch<PaginatedResponse<JobOffer>>(`/jobs?page=${page}&pageSize=${pageSize}`);
}

export async function getJobById(id: string): Promise<JobOffer> {
    return apiFetch<JobOffer>(`/jobs/${id}`);
}