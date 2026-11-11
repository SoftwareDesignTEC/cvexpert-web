/**
 * Bloque gris que late mientras se espera un dato.
 *
 * Reemplaza al indicador giratorio centrado: al ocupar el mismo espacio que el
 * contenido real, la página no salta cuando llega. Y comunica qué va a
 * aparecer, no sólo que algo está pasando.
 */
export function Skeleton({ className = '' }: { className?: string }) {
    return (
        <div
            className={`animate-pulse rounded bg-gray-200 dark:bg-gray-800 ${className}`}
            aria-hidden
        />
    );
}

/**
 * Envoltorio para un grupo de esqueletos. Lleva el aviso para quien use un
 * lector de pantalla, que no percibe la animación, y evita que cada bloque
 * suelto se anuncie por separado.
 */
export function SkeletonGroup({ label, children }: {
    label: string;
    children: React.ReactNode;
}) {
    return (
        <div role="status" aria-busy="true" aria-live="polite">
            <span className="sr-only">{label}</span>
            {children}
        </div>
    );
}
