import { Clock, Download, Eye, FolderOpen, Pencil } from 'lucide-react';
import MoreMenu from './MoreMenu';
import type { CV } from '../../types/models';
import CvThumbnail from '../cv/CvThumbnail';
import { formatLongDate } from '../cv/cvLabels';

interface CVCardProps {
    cv: CV;
    /** Diseño de su plantilla, para dibujar la miniatura */
    layout?: unknown;
    /** El catálogo todavía no llegó */
    loadingLayout?: boolean;
    /** Abre el visor */
    onClick?: () => void;
    /** Abre el editor */
    onEdit?: () => void;
    onDownload?: () => void;
    /** Lleva a la pantalla completa, donde está el resto de las acciones */
    onGoToList?: () => void;
}

export default function CVCard({ cv, layout, loadingLayout, onClick, onEdit, onDownload, onGoToList }: CVCardProps) {

    // updatedAt puede llegar como epoch ms o como texto; el ayudante cubre ambos
    const formattedDate = formatLongDate(cv.updatedAt) ?? '';

    return (
        <div className="h-full min-h-0 bg-surface dark:bg-gray-900 border border-line dark:border-gray-800 rounded-2xl p-2.5 sm:p-3 shadow-sm flex flex-col gap-2 hover:shadow-md hover:border-primary transition-all">
            {/* Vista previa del currículum; si el APIM no manda imagen, queda el icono */}
            <button
                onClick={onClick}
                className="w-full flex-1 min-h-0 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden flex items-center justify-center cursor-pointer"
                title={cv.title}
            >
                <CvThumbnail
                    cv={cv as unknown as Record<string, unknown>}
                    layout={layout}
                    title={cv.title}
                    fallbackImageUrl={cv.thumbnailUrl}
                    loading={loadingLayout}
                />
            </button>

            {/* Título y última modificación */}
            <div className="flex flex-col gap-0.5 min-w-0 shrink-0">
                <h4 className="text-xs sm:text-sm font-semibold text-ink dark:text-white truncate leading-tight">
                    {cv.title}
                </h4>
                <div className="flex items-center gap-1 text-muted min-w-0">
                    <Clock size={12} className="shrink-0" />
                    <span className="text-[10px] sm:text-xs truncate">Modificado {formattedDate}</span>
                </div>
            </div>

            {/* La tarjeta es angosta —van tres por fila—, así que sólo ver y
                editar llevan texto; el resto va detrás de los tres puntos.
                Borrar no está acá a propósito: el panel es un resumen, y una
                acción irreversible pertenece a la pantalla de gestión. */}
            <div className="flex gap-1.5 shrink-0">
                <button
                    onClick={onClick}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-2 py-1.5 text-[11px] sm:text-xs font-medium text-white hover:bg-primary-dark transition-colors"
                >
                    <Eye size={12} />
                    Ver
                </button>
                <button
                    onClick={onEdit}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-line px-2 py-1.5 text-[11px] sm:text-xs font-medium text-body transition-colors hover:border-primary hover:text-primary dark:border-gray-700 dark:text-gray-300"
                >
                    <Pencil size={12} />
                    Editar
                </button>
                <MoreMenu
                    label={`Más acciones para ${cv.title}`}
                    items={[
                        { label: 'Descargar PDF', icon: Download, onSelect: () => onDownload?.() },
                        { label: 'Ir a Mis Currículums', icon: FolderOpen, onSelect: () => onGoToList?.() },
                    ]}
                />
            </div>
        </div>
    );
}
