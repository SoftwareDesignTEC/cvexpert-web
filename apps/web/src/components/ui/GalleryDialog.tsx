import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import Pagination from './Pagination';

interface GalleryDialogProps<T> {
    open: boolean;
    title: string;
    description?: string;
    items: T[];
    perPage: number;
    onClose: () => void;
    renderItem: (item: T) => React.ReactNode;
    keyOf: (item: T) => string;
}

// Ventana amplia que cubre casi toda la pantalla, con su propia paginación.
// La usan los cursos de mejora y las plantillas para mostrar el listado completo.
export default function GalleryDialog<T>({
    open, title, description, items, perPage, onClose, renderItem, keyOf,
}: GalleryDialogProps<T>) {
    const [page, setPage] = useState(1);

    useEffect(() => {
        if (!open) return;

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKeyDown);

        const previous = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        return () => {
            window.removeEventListener('keydown', onKeyDown);
            document.body.style.overflow = previous;
        };
    }, [open, onClose]);

    if (!open) return null;

    const totalPages = Math.max(1, Math.ceil(items.length / perPage));
    const currentPage = Math.min(page, totalPages);
    const visible = items.slice((currentPage - 1) * perPage, currentPage * perPage);

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-6"
            onClick={onClose}
            role="presentation"
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-label={title}
                onClick={e => e.stopPropagation()}
                className="w-full max-w-6xl h-[88vh] rounded-2xl bg-surface dark:bg-gray-900 shadow-2xl flex flex-col"
            >
                <div className="flex items-start justify-between gap-3 border-b border-line dark:border-gray-800 px-5 py-4 shrink-0">
                    <div className="min-w-0">
                        <h2 className="text-lg font-bold text-ink dark:text-white">{title}</h2>
                        {description && <p className="text-sm text-muted mt-0.5">{description}</p>}
                    </div>
                    <button
                        onClick={onClose}
                        aria-label="Cerrar"
                        className="shrink-0 rounded-lg p-1.5 text-muted hover:bg-canvas dark:hover:bg-gray-800 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Tres columnas en escritorio: con 6 por página quedan dos filas */}
                <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4">
                    {items.length === 0 ? (
                        <p className="text-sm text-muted text-center py-10">No hay nada que mostrar.</p>
                    ) : (
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {visible.map(item => (
                                <div key={keyOf(item)}>{renderItem(item)}</div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="border-t border-line dark:border-gray-800 px-5 py-3 shrink-0">
                    <Pagination page={currentPage} totalPages={totalPages} onChange={setPage} />
                </div>
            </div>
        </div>
    );
}
