import { Skeleton, SkeletonGroup } from './Skeleton';

// Un esqueleto por bloque del panel. Cada uno copia la forma de su contenido
// real para que al llegar los datos nada se mueva de lugar: las tres secciones
// cargan por separado y terminan en momentos distintos, así que si cambiaran
// de alto al resolverse, la página saltaría tres veces.

/** Currículums recientes: tres miniaturas con su título y sus botones. */
export function RecentCvsSkeleton() {
    return (
        <SkeletonGroup label="Cargando tus currículums recientes">
            <div className="grid h-full min-h-0 grid-cols-3 gap-2 sm:gap-4">
                {[0, 1, 2].map(i => (
                    <div key={i} className="flex min-h-0 flex-col gap-2 rounded-2xl border border-line p-2.5 dark:border-gray-800 sm:p-3">
                        <Skeleton className="min-h-0 flex-1 rounded-lg" />
                        <div className="flex shrink-0 flex-col gap-1">
                            <Skeleton className="h-3 w-4/5" />
                            <Skeleton className="h-2.5 w-3/5" />
                        </div>
                        <div className="flex shrink-0 gap-1.5">
                            <Skeleton className="h-6 flex-1 rounded-lg" />
                            <Skeleton className="h-6 flex-1 rounded-lg" />
                            <Skeleton className="h-6 w-7 rounded-lg" />
                        </div>
                    </div>
                ))}
            </div>
        </SkeletonGroup>
    );
}

/** Brecha: el radar circular y la lista de habilidades por mejorar. */
export function SkillsGapSkeleton() {
    return (
        <SkeletonGroup label="Cargando tu análisis de brecha">
            <div className="flex h-full items-center gap-3 lg:flex-col lg:items-stretch">
                <div className="flex min-h-0 min-w-0 flex-1 items-center justify-center">
                    <Skeleton className="aspect-square w-full max-w-[12.5rem] rounded-full" />
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-1.5 lg:flex-none">
                    <Skeleton className="mb-1 h-3 w-2/3" />
                    {[0, 1, 2, 3].map(i => (
                        <div key={i} className="flex items-center justify-between gap-2">
                            <Skeleton className="h-2.5 flex-1" />
                            <Skeleton className="h-2.5 w-12 shrink-0" />
                        </div>
                    ))}
                </div>
            </div>
        </SkeletonGroup>
    );
}

/** Ofertas: lista compacta en móvil, tarjetas en escritorio. */
export function RecommendedJobsSkeleton() {
    return (
        <SkeletonGroup label="Cargando las ofertas recomendadas">
            {/* Móvil */}
            <div className="flex flex-col divide-y divide-gray-100 dark:divide-gray-800 sm:hidden">
                {[0, 1, 2].map(i => (
                    <div key={i} className="flex items-center gap-3 py-2.5">
                        <Skeleton className="h-8 w-8 shrink-0 rounded-lg" />
                        <div className="flex min-w-0 flex-1 flex-col gap-1">
                            <Skeleton className="h-3 w-3/4" />
                            <Skeleton className="h-2.5 w-1/2" />
                        </div>
                        <Skeleton className="h-2.5 w-14 shrink-0" />
                    </div>
                ))}
            </div>

            {/* Escritorio */}
            <div className="hidden gap-4 sm:grid sm:grid-cols-2 lg:grid-cols-3">
                {[0, 1, 2].map(i => (
                    <div key={i} className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
                        <div className="flex items-start gap-3">
                            <Skeleton className="h-10 w-10 shrink-0 rounded-lg" />
                            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                                <Skeleton className="h-3.5 w-full" />
                                <Skeleton className="h-2.5 w-2/3" />
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Skeleton className="h-5 w-16 rounded-full" />
                            <Skeleton className="h-5 w-20 rounded-full" />
                        </div>
                        <Skeleton className="h-8 w-full rounded-lg" />
                    </div>
                ))}
            </div>
        </SkeletonGroup>
    );
}
