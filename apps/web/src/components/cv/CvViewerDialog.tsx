import { useEffect, useState } from 'react';
import CvDocumentDialog from './CvDocumentDialog';
import { templateService } from '../../services/otherServices';
import type { CV, CVTemplate } from '../../types/models';
import type { Locale } from './cvLabels';

/**
 * Abre un currículum con el diseño de su plantilla.
 *
 * El `layout` no viene en el CV. Lo normal es recibirlo de la pantalla, que ya
 * tiene el catálogo cargado para dibujar las miniaturas; pedirlo de nuevo acá
 * sería una llamada de más y, si esa llamada responde distinto que el listado,
 * la tarjeta y el visor mostrarían cosas diferentes para el mismo currículum.
 *
 * Sólo se pide por id cuando la pantalla no lo pasa.
 */
export default function CvViewerDialog({
    cv, layout, locale = 'es', onClose,
}: {
    cv: CV | null;
    /** Diseño de su plantilla, tomado del catálogo de la pantalla */
    layout?: unknown;
    locale?: Locale;
    onClose: () => void;
}) {
    const [fetched, setFetched] = useState<CVTemplate | null>(null);
    const [loading, setLoading] = useState(false);

    // `undefined` significa "la pantalla no me lo pasó"; `null` significa
    // "no tiene diseño", y en ese caso no hay nada que buscar.
    const faltaBuscarlo = layout === undefined;

    useEffect(() => {
        if (!faltaBuscarlo || !cv?.templateId) return;
        let cancelled = false;

        const load = async () => {
            setLoading(true);
            try {
                const res = await templateService.getById(cv.templateId);
                if (!cancelled) setFetched(res);
            } catch {
                // Sin plantilla queda la imagen; ver el currículum no puede
                // depender de que el catálogo responda
                if (!cancelled) setFetched(null);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        load();

        return () => { cancelled = true; };
    }, [faltaBuscarlo, cv?.templateId]);

    return (
        <CvDocumentDialog
            open={cv !== null}
            cv={cv as unknown as Record<string, unknown> | null}
            layout={faltaBuscarlo ? fetched?.layout ?? null : layout}
            loading={loading}
            title={cv?.title ?? 'Currículum'}
            fallbackImageUrl={cv?.thumbnailUrl}
            locale={locale}
            onClose={onClose}
        />
    );
}
