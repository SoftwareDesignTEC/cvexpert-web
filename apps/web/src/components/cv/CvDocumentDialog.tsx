import { useState } from 'react';
import { Download, FileText } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import CvDocument from './CvDocument';
import { UI_TEXT } from './cvLabels';
import type { Locale } from './cvLabels';
import { parseLayout } from '../../types/cvLayout';
import { buildCvPdf, pdfFileName } from './cvPdf';

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
    const [imgFailed, setImgFailed] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const parsed = parseLayout(layout);
    const canRender = parsed !== null && cv !== null;

    // Se arma el PDF y se descarga directo, sin pasar por el cuadro de imprimir:
    // el usuario quiere un archivo, no elegir una impresora. El documento se
    // dibuja desde los datos, así que el texto queda seleccionable.
    const exportPdf = () => {
        setError(null);
        try {
            const doc = buildCvPdf(cv as Raw, layout, locale);
            if (!doc) {
                setError('Esta plantilla no tiene diseño estructurado, así que no se puede generar el PDF.');
                return;
            }
            doc.save(pdfFileName(title));
        } catch {
            setError('No pudimos generar el PDF. Intentá de nuevo.');
        }
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

                    {error && <p className="text-sm text-rose-500">{error}</p>}

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

        </>
    );
}
