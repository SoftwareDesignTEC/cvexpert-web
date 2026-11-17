import type { JobOffer } from '../types/models';

export const JOBS_PER_PAGE = 8;

/** Codes are translated by the UI; diagnostic messages stay independent of React. */
export class JobListingError extends Error {
    readonly code: 'cancelled' | 'unverifiedCatalog' | 'changedCatalog' | 'duplicateOffers' | 'incompleteCatalog' | 'wrongDetail';
    constructor(code: JobListingError['code'], message: string) {
        super(message);
        this.name = 'JobListingError';
        this.code = code;
    }
}

/** Coincidencia textual parcial; no búsqueda semántica. Conserva ñ y puntuación. */
export function normalizeJobSearch(value: string): string {
    return value.trim().replace(/\s+/gu, ' ').toLowerCase().normalize('NFD')
        .replace(/[\u0300\u0301\u0302\u0308]/gu, '').normalize('NFC');
}

export function matchesJobSearch(job: Pick<JobOffer, 'title' | 'company' | 'location'>, query: string): boolean {
    const needle = normalizeJobSearch(query);
    return !needle || [job.title, job.company, job.location].some(value => normalizeJobSearch(value ?? '').includes(needle));
}

export function paginateItems<T>(items: readonly T[], requestedPage: number, pageSize = JOBS_PER_PAGE) {
    const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
    const page = Math.min(Math.max(1, requestedPage), totalPages);
    return { page, totalPages, items: items.slice((page - 1) * pageSize, page * pageSize) };
}
