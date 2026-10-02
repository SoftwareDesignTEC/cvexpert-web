import { useState } from 'react';
import { Clock, Download, FileText, Pencil } from 'lucide-react';
import type { CV } from '../../types/models';

interface CVCardProps {
    cv: CV;
    onClick?: () => void;
    onDownload?: () => void;
}

export default function CVCard({ cv, onClick, onDownload }: CVCardProps) {
    const [imgFailed, setImgFailed] = useState(false);

    const formattedDate = new Date(cv.updatedAt).toLocaleDateString('es-CR', {
        day: '2-digit', month: 'short', year: 'numeric',
    });

    return (
        <div className="h-full min-h-0 bg-surface dark:bg-gray-900 border border-line dark:border-gray-800 rounded-2xl p-2.5 sm:p-3 shadow-sm flex flex-col gap-2 hover:shadow-md hover:border-primary transition-all">
            {/* Vista previa del currículum; si el APIM no manda imagen, queda el icono */}
            <button
                onClick={onClick}
                className="w-full flex-1 min-h-0 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden flex items-center justify-center cursor-pointer"
                title={cv.title}
            >
                {cv.thumbnailUrl && !imgFailed ? (
                    <img
                        src={cv.thumbnailUrl}
                        alt={cv.title}
                        onError={() => setImgFailed(true)}
                        className="w-full h-full object-cover object-top"
                    />
                ) : (
                    <FileText size={32} className="text-gray-300 dark:text-gray-600" />
                )}
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

            {/* Abren la vista previa y la confirmación de descarga: el editor y la
                descarga real todavía no existen, y los diálogos lo dejan claro. */}
            <div className="flex flex-col gap-1.5 shrink-0 sm:flex-row">
                <button
                    onClick={onClick}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-2 py-1.5 text-[11px] sm:text-xs font-medium text-white hover:bg-primary-dark transition-colors"
                >
                    <Pencil size={12} />
                    Ver/Editar
                </button>
                <button
                    onClick={onDownload}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-deep px-2 py-1.5 text-[11px] sm:text-xs font-medium text-white hover:opacity-90 transition-opacity"
                >
                    <Download size={12} />
                    Descargar
                </button>
            </div>
        </div>
    );
}
