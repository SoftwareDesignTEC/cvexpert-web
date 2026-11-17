import { JobListingError } from './jobSearch';
import { jobService } from './otherServices';
import type { JobOffer } from '../types/models';

/** Solo devuelve un catálogo completo verificable. No convierte un subconjunto en búsqueda global. */
export async function loadCompleteJobCatalog(loadPage = jobService.getAll, isCurrent = () => true): Promise<JobOffer[]> {
    const all: JobOffer[] = [];
    const ids = new Set<string>();
    let total: number | undefined;
    for (let page = 1; page <= 20; page++) {
        if (!isCurrent()) throw new JobListingError('cancelled', 'Carga cancelada.');
        const result = await loadPage({ page, pageSize: 100 });
        if (!isCurrent()) throw new JobListingError('cancelled', 'Carga cancelada.');
        if (!result.paginationVerified) throw new JobListingError('unverifiedCatalog', 'El servicio no informa una paginación verificable. No podemos garantizar una búsqueda en todo el catálogo.');
        if (total !== undefined && total !== result.totalRecords) throw new JobListingError('changedCatalog', 'El catálogo cambió durante la carga. Reintentá para consultar una lista completa.');
        total = result.totalRecords;
        for (const job of result.items) {
            if (!job.id || ids.has(job.id)) throw new JobListingError('duplicateOffers', 'El servicio repitió ofertas entre páginas. No podemos garantizar una búsqueda global.');
            ids.add(job.id);
            all.push(job);
        }
        if (all.length === total) return all;
        if (!result.items.length || all.length > total) break;
    }
    throw new JobListingError('incompleteCatalog', 'No pudimos completar el catálogo dentro del límite de carga. Reintentá más tarde; no se mostraron resultados parciales como globales.');
}
