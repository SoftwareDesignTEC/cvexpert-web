import { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
    open: boolean;
    title: string;
    description?: string;
    /** 'lg' para contenido ancho, como la vista previa de una plantilla */
    size?: 'md' | 'lg';
    onClose: () => void;
    children: React.ReactNode;
}

export default function Modal({ open, title, description, size = 'md', onClose, children }: ModalProps) {
    // Escape cierra el diálogo y el fondo deja de desplazarse mientras está abierto
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

    return (
        <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
            onClick={onClose}
            role="presentation"
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-label={title}
                // El clic dentro del panel no debe cerrar el diálogo
                onClick={e => e.stopPropagation()}
                className={`w-full max-h-full overflow-y-auto rounded-t-2xl bg-surface dark:bg-gray-900 shadow-xl sm:rounded-2xl
                    ${size === 'lg' ? 'max-w-3xl' : 'max-w-md'}`}
            >
                <div className="flex items-start justify-between gap-3 border-b border-line dark:border-gray-800 px-5 py-4">
                    <div className="min-w-0">
                        <h2 className="text-base font-bold text-ink dark:text-white">{title}</h2>
                        {description && <p className="text-sm text-muted mt-0.5">{description}</p>}
                    </div>
                    <button
                        onClick={onClose}
                        aria-label="Cerrar"
                        className="shrink-0 rounded-lg p-1 text-muted hover:bg-canvas dark:hover:bg-gray-800 transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="px-5 py-4">{children}</div>
            </div>
        </div>
    );
}
