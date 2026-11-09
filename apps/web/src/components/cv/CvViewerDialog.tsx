import { useEffect, useState } from 'react';
import CvDocumentDialog from './CvDocumentDialog';
import { templateService } from '../../services/otherServices';
import type { CV, CVTemplate } from '../../types/models';
import type { Locale } from './cvLabels';

/**
 * Abre un currículum con el diseño de su plantilla. El `layout` no viene en el
 * CV, así que se pide la plantilla por su id. Si esa llamada falla o la
 * plantilla todavía no está migrada, se cae en la imagen de siempre: ver el
 * currículum no puede depender de que el catálogo responda.
 */
export default function CvViewerDialog({
    cv, locale = 'es', onClose,
}: {
    cv: CV | null;
    locale?: Locale;
    onClose: () => void;
}) {
    const [template, setTemplate] = useState<CVTemplate | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!cv?.templateId) return;
        let cancelled = false;

        const load = async () => {
            setLoading(true);
            try {
                const res = await templateService.getById(cv.templateId);
                if (!cancelled) setTemplate(res);
            } catch {
                // Sin plantilla se muestra la miniatura; no se interrumpe la vista
                if (!cancelled) setTemplate(null);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        load();

        return () => { cancelled = true; };
    }, [cv?.templateId]);

    return (
        <CvDocumentDialog
            open={cv !== null}
            cv={cv as unknown as Record<string, unknown> | null}
            layout={loading ? null : template?.layout ?? null}
            title={cv?.title ?? 'Currículum'}
            fallbackImageUrl={cv?.thumbnailUrl}
            locale={locale}
            onClose={onClose}
        />
    );
}
