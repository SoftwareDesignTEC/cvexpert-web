import { useEffect, useRef, useState } from 'react';
import { FileText } from 'lucide-react';
import CvDocument from './CvDocument';
import { parseLayout } from '../../types/cvLayout';

// Ancho de una hoja A4 a 96 ppp: es el que usa CvDocument, y contra el que se
// calcula cuánto hay que encoger para que entre en la tarjeta.
const A4_WIDTH_PX = 794;

/**
 * Vista en miniatura del currículum: el documento real dibujado en chico.
 * Antes la tarjeta mostraba `thumbnailUrl`, que hoy es un marcador de posición
 * gris, así que se veía un recuadro vacío. Dibujar el documento dice mucho más
 * y no cuesta una petición extra: el layout ya está cargado en la página.
 */
export default function CvThumbnail({
    cv, layout, title, fallbackImageUrl,
}: {
    cv: Record<string, unknown>;
    layout: unknown;
    title: string;
    /**
     * `thumbnailUrl` del servicio. Es el último recurso, no el primero: hoy
     * devuelve un marcador de posición gris, y dibujar el documento real
     * siempre dice más que esa imagen.
     */
    fallbackImageUrl?: string;
}) {
    const box = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(0);
    const [imgFailed, setImgFailed] = useState(false);

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

    // Sin layout no hay documento que dibujar: ahí sí vale la imagen del servicio
    if (!parseLayout(layout)) {
        if (fallbackImageUrl && !imgFailed) {
            return (
                <img
                    src={fallbackImageUrl}
                    alt={title}
                    onError={() => setImgFailed(true)}
                    className="h-full w-full object-cover object-top"
                />
            );
        }
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
