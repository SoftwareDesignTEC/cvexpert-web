import { useCallback, useEffect, useRef, useState } from 'react';
import { Maximize2, Minus, Plus } from 'lucide-react';
import CvDocument from './CvDocument';
import type { Locale } from './cvLabels';

// Ancho de una hoja A4 a 96 ppp, que es el que usa CvDocument. A zoom 1 el
// documento se ve del tamaño que va a tener impreso.
const A4_WIDTH_PX = 794;
// Y su alto: una A4 son 210 × 297 mm. Se dibuja la hoja entera, con el espacio
// en blanco que quede al pie, porque es lo que va a salir al descargarla.
const A4_HEIGHT_PX = 1123;

const MIN = 0.4;
const MAX = 2;
const PASO = 0.2;

type Raw = Record<string, unknown>;

/**
 * El currículum a tamaño real, con zoom y desplazamiento.
 *
 * Antes se encogía para entrar en el ancho del diálogo, así que el texto
 * quedaba más chico de lo que sale impreso y no había forma de acercarse a
 * mirar un detalle.
 */
export default function CvZoomView({ cv, layout, locale = 'es' }: {
    cv: Raw;
    layout: unknown;
    locale?: Locale;
}) {
    const [zoom, setZoom] = useState(1);
    const [alto, setAlto] = useState(0);
    const marco = useRef<HTMLDivElement>(null);

    // El contenedor con la barra de desplazamiento necesita saber cuánto ocupa
    // el documento ya escalado; si no, no habría qué desplazar.
    const medir = useCallback((el: HTMLDivElement | null) => {
        if (!el) return;
        const actualizar = () => setAlto(el.scrollHeight);
        actualizar();
        const obs = new ResizeObserver(actualizar);
        obs.observe(el);
        return () => obs.disconnect();
    }, []);

    const ajustarAlAncho = useCallback(() => {
        const disponible = marco.current?.clientWidth;
        if (!disponible) return;
        // Un respiro a los lados para que no quede pegado al borde
        setZoom(Math.min(MAX, Math.max(MIN, (disponible - 32) / A4_WIDTH_PX)));
    }, []);

    // Al abrir se ajusta al ancho: ver la hoja entera primero y después
    // acercarse es más útil que empezar cortado.
    useEffect(() => { ajustarAlAncho(); }, [ajustarAlAncho]);

    const cambiar = (delta: number) =>
        setZoom(z => Math.min(MAX, Math.max(MIN, Math.round((z + delta) * 100) / 100)));

    return (
        <div className="flex flex-col gap-2">
            <div className="flex items-center justify-end gap-1">
                <button
                    type="button"
                    onClick={() => cambiar(-PASO)}
                    disabled={zoom <= MIN}
                    title="Alejar"
                    aria-label="Alejar"
                    className="rounded-lg border border-line p-1.5 text-muted transition-colors hover:border-primary hover:text-primary disabled:opacity-40 dark:border-gray-700"
                >
                    <Minus size={14} />
                </button>

                <span className="w-12 text-center text-xs tabular-nums text-muted">
                    {Math.round(zoom * 100)}%
                </span>

                <button
                    type="button"
                    onClick={() => cambiar(PASO)}
                    disabled={zoom >= MAX}
                    title="Acercar"
                    aria-label="Acercar"
                    className="rounded-lg border border-line p-1.5 text-muted transition-colors hover:border-primary hover:text-primary disabled:opacity-40 dark:border-gray-700"
                >
                    <Plus size={14} />
                </button>

                <button
                    type="button"
                    onClick={ajustarAlAncho}
                    title="Ajustar al ancho"
                    aria-label="Ajustar al ancho"
                    className="ml-1 rounded-lg border border-line p-1.5 text-muted transition-colors hover:border-primary hover:text-primary dark:border-gray-700"
                >
                    <Maximize2 size={14} />
                </button>

                <button
                    type="button"
                    onClick={() => setZoom(1)}
                    className="ml-1 rounded-lg border border-line px-2 py-1.5 text-[11px] font-medium text-muted transition-colors hover:border-primary hover:text-primary dark:border-gray-700"
                >
                    Tamaño real
                </button>
            </div>

            <div
                ref={marco}
                className="max-h-[65vh] overflow-auto rounded-xl bg-canvas p-4 dark:bg-gray-800"
            >
                {/* Este div ocupa el tamaño ya escalado: es lo que le dice al
                    contenedor cuánto hay que poder desplazar. */}
                <div
                    style={{ width: A4_WIDTH_PX * zoom, height: alto * zoom }}
                    className="mx-auto"
                >
                    <div
                        ref={medir}
                        style={{
                            width: A4_WIDTH_PX,
                            minHeight: A4_HEIGHT_PX,
                            transform: `scale(${zoom})`,
                            transformOrigin: 'top left',
                        }}
                        className="bg-white shadow-sm"
                    >
                        <CvDocument cv={cv} layout={layout} locale={locale} />
                    </div>
                </div>
            </div>
        </div>
    );
}
