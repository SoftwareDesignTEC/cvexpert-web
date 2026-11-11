import { Skeleton, SkeletonGroup } from '../ui/Skeleton';

/**
 * Esqueleto de una tarjeta de currículum. Copia las medidas de CVListCard
 * —la vista previa, el título, la fecha y la fila de acciones— para que al
 * llegar los datos la tarjeta ocupe el mismo lugar y nada se mueva.
 */
function CvCardSkeleton() {
    return (
        <div className="flex min-w-0 flex-col gap-2 rounded-xl border border-gray-200 bg-white p-2 dark:border-gray-800 dark:bg-gray-900 sm:gap-3 sm:p-4">
            <Skeleton className="h-36 w-full rounded-lg sm:h-48" />

            <div className="flex flex-col gap-1.5">
                <Skeleton className="h-3.5 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
            </div>

            <div className="flex flex-col gap-1.5 sm:flex-row">
                <Skeleton className="h-8 flex-1 rounded-lg" />
                <Skeleton className="h-8 flex-1 rounded-lg" />
                <Skeleton className="h-8 flex-1 rounded-lg" />
                <Skeleton className="h-8 w-9 shrink-0 rounded-lg" />
            </div>
        </div>
    );
}

/** Una rejilla de esqueletos, con la misma forma que la lista real. */
export default function CvListSkeleton({ count }: { count: number }) {
    return (
        <SkeletonGroup label="Cargando tus currículums">
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
                {Array.from({ length: count }, (_, i) => <CvCardSkeleton key={i} />)}
            </div>
        </SkeletonGroup>
    );
}
