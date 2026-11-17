import { useEffect } from 'react';
import { X } from 'lucide-react';
import { useLocale } from '../../i18n/LocaleContext';

interface ModalProps {
    open: boolean;
    title: string;
    description?: string;
    /** 'lg' para contenido ancho, como la vista previa de una plantilla */
    /** 'xl' para el documento a tamaño real, que mide una hoja A4 de ancho */
    size?: 'md' | 'lg' | 'xl';
    onClose: () => void;
    children: React.ReactNode;
    /**
     * Franjas que no se desplazan con el contenido: `toolbar` queda bajo el
     * título y `footer` al pie, con los botones de acción.
     *
     * Son ranuras propias y no elementos pegados con `sticky` dentro del
     * contenido porque un elemento pegado no puede salirse del relleno de su
     * contenedor: quedaba una franja de unos pocos píxeles por donde se veía
     * pasar el texto por debajo de los botones.
     */
    toolbar?: React.ReactNode;
    footer?: React.ReactNode;
}

export default function Modal({
    open, title, description, size = 'md', onClose, children, toolbar, footer,
}: ModalProps) {
    const { t } = useLocale();
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
                // Columna con el encabezado fijo y una única zona que se
                // desplaza. Antes el panel entero se desplazaba, y cuando el
                // contenido traía su propia zona desplazable aparecían dos
                // barras pegadas, además de la de la página.
                className={`flex w-full max-h-full flex-col overflow-hidden rounded-t-2xl bg-surface dark:bg-gray-900 shadow-xl sm:rounded-2xl
                    ${size === 'xl' ? 'max-w-5xl' : size === 'lg' ? 'max-w-3xl' : 'max-w-md'}`}
            >
                <div className="flex shrink-0 items-start justify-between gap-3 border-b border-line dark:border-gray-800 px-5 py-4">
                    <div className="min-w-0">
                        <h2 className="text-base font-bold text-ink dark:text-white">{title}</h2>
                        {description && <p className="text-sm text-muted mt-0.5">{description}</p>}
                    </div>
                    <button
                        onClick={onClose}
                        aria-label={t.common.close}
                        className="shrink-0 rounded-lg p-1 text-muted hover:bg-canvas dark:hover:bg-gray-800 transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {toolbar && (
                    <div className="shrink-0 border-b border-line px-5 py-3 dark:border-gray-800">
                        {toolbar}
                    </div>
                )}

                <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>

                {footer && (
                    <div className="shrink-0 border-t border-line bg-surface px-5 py-3 dark:border-gray-800 dark:bg-gray-900">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
}
