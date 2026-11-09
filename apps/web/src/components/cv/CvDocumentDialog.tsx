import { useState } from 'react';
import { createPortal, flushSync } from 'react-dom';
import { Download, FileText } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import CvDocument from './CvDocument';
import { UI_TEXT } from './cvLabels';
import type { Locale } from './cvLabels';
import { parseLayout } from '../../types/cvLayout';

type Raw = Record<string, unknown>;

export default function CvDocumentDialog({
    open, cv, layout, title, fallbackImageUrl, locale = 'es', onClose,
}: {
    open: boolean;
    cv: Raw | null;
    /** Template.layout; null en plantillas viejas sin migrar */
    layout: unknown;
    title: string;
    /** previewUrl o thumbnailUrl: el comportamiento de siempre */
    fallbackImageUrl?: string | null;
    locale?: Locale;
    onClose: () => void;
}) {
    const [printing, setPrinting] = useState(false);
    const [imgFailed, setImgFailed] = useState(false);

    const parsed = parseLayout(layout);
    const canRender = parsed !== null && cv !== null;

    /**
     * Exportar es imprimir: el navegador ofrece "Guardar como PDF" y el texto
     * queda seleccionable, cosa que una captura rasterizada no da.
     * El documento se monta en un portal sobre document.body para que ningún
     * contenedor del diálogo —que es `fixed` y recorta— lo corte al imprimir.
     * flushSync obliga a pintarlo antes de abrir el cuadro de impresión.
     */
    const exportPdf = () => {
        flushSync(() => setPrinting(true));
        window.print();
        setPrinting(false);
    };

    return (
        <>
            <Modal
                open={open}
                size="lg"
                title={title}
                description={canRender ? undefined : UI_TEXT[locale].noLayout}
                onClose={onClose}
            >
                <div className="flex flex-col gap-4">
                    <div className="max-h-[65vh] overflow-auto rounded-xl bg-canvas p-2 dark:bg-gray-800">
                        {canRender ? (
                            <div className="shadow-sm">
                                <CvDocument cv={cv} layout={layout} locale={locale} />
                            </div>
                        ) : fallbackImageUrl && !imgFailed ? (
                            <img
                                src={fallbackImageUrl}
                                alt={title}
                                onError={() => setImgFailed(true)}
                                className="mx-auto w-full max-w-[210mm] rounded-lg"
                            />
                        ) : (
                            <div className="flex flex-col items-center gap-2 py-12 text-muted">
                                <FileText size={28} />
                                <p className="text-sm">No hay vista previa disponible.</p>
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                        <Button variant="secondary" size="sm" onClick={onClose}>Cerrar</Button>
                        {canRender && (
                            <Button size="sm" onClick={exportPdf}>
                                <Download size={14} /> Descargar PDF
                            </Button>
                        )}
                    </div>
                </div>
            </Modal>

            {printing && canRender && createPortal(
                <div className="cv-print-area">
                    <CvDocument cv={cv} layout={layout} locale={locale} />
                </div>,
                document.body,
            )}
        </>
    );
}
