import { useEffect, useRef, useState } from 'react';
import { FileText } from 'lucide-react';
import CvDocument from './CvDocument';
import { parseLayout } from '../../types/cvLayout';

// Ancho de una hoja A4 a 96 ppp: es el que usa CvDocument, y contra el que se
// calcula cuánto hay que encoger para que entre en la tarjeta.
const A4_WIDTH_PX = 794;

/**
 * Vista en miniatura del currículum: el documento real dibujado en chico.
 * Antes acá iba `thumbnailUrl`, que el servicio no genera, así que la tarjeta
 * quedaba como un rectángulo vacío. Dibujarlo es más útil que un ícono y no
 * cuesta una petición extra: el layout ya está cargado en la página.
 */
export default function CvThumbnail({
    cv, layout, title,
}: {
    cv: Record<string, unknown>;
    layout: unknown;
    title: string;
}) {
    const box = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(0);

    // El factor depende del ancho real de la tarjeta, que cambia con el
    // responsive, así que se mide en vez de fijarlo.
    useEffect(() => {
        const el = box.current;
        if (!el) return;

        const medir = () => setScale(el.clientWidth / A4_WIDTH_PX);
        medir();

        const obs = new ResizeObserver(medir);
        obs.observe(el);
        return () => obs.disconnect();
    }, []);

    if (!parseLayout(layout)) {
        return (
            <div className="flex h-full w-full items-center justify-center">
                <FileText size={32} className="text-gray-300 dark:text-gray-600" />
            </div>
        );
    }

    return (
        <div ref={box} className="h-full w-full overflow-hidden bg-white" aria-label={title}>
            {scale > 0 && (
                <div
                    // La hoja se dibuja a tamaño real y se encoge: así el texto
                    // mantiene sus proporciones en vez de recalcularse.
                    style={{
                        width: A4_WIDTH_PX,
                        transform: `scale(${scale})`,
                        transformOrigin: 'top left',
                    }}
                    aria-hidden
                >
                    <CvDocument cv={cv} layout={layout} />
                </div>
            )}
        </div>
    );
}
