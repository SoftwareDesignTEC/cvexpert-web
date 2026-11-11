import { useEffect, useRef, useState } from 'react';
import { Mic, Sparkles, Square } from 'lucide-react';
import { useDictation } from '../../hooks/useDictation';

const inputClass =
    'w-full rounded-lg border border-line bg-surface px-2.5 py-2 text-sm text-ink placeholder:text-muted focus:border-primary focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white';

/**
 * Área de texto con dictado. El botón sólo aparece si el navegador lo soporta;
 * lo dictado se agrega al final en vez de reemplazar, para poder encadenar
 * varias frases y seguir corrigiendo a mano.
 */
export default function DictatableTextArea({
    value, onChange, rows = 3, placeholder, onGenerate,
}: {
    value: string;
    onChange: (v: string) => void;
    rows?: number;
    placeholder?: string;
    /** Pide un texto a la IA; recibe lo que haya escrito como contexto */
    onGenerate?: (actual: string) => Promise<string>;
}) {
    const [generating, setGenerating] = useState(false);
    const [genError, setGenError] = useState<string | null>(null);

    const generar = async () => {
        if (!onGenerate) return;
        setGenerating(true);
        setGenError(null);
        try {
            // Reemplaza, no agrega: es una redacción del texto, no una
            // continuación. Lo anterior se va como contexto.
            onChange(await onGenerate(valorRef.current));
        } catch (err) {
            setGenError(err instanceof Error ? err.message : 'No pudimos generar el texto.');
        } finally {
            setGenerating(false);
        }
    };
    // Lo dictado llega desde un reconocimiento que vive entre renders, así que
    // necesita leer el texto actual y no el que había al empezar a escuchar.
    const valorRef = useRef(value);
    useEffect(() => { valorRef.current = value; }, [value]);

    const { supported, listening, error, start, stop } = useDictation(texto => {
        const previo = valorRef.current.trimEnd();
        onChange(previo ? `${previo} ${texto}` : texto);
    });

    return (
        <div className="flex flex-col gap-1">
            <div className="relative">
                <textarea
                    rows={rows}
                    placeholder={placeholder}
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    className={`${inputClass} resize-y ${supported || onGenerate ? 'pr-20' : ''}`}
                />
                <div className="absolute right-2 top-2 flex gap-1">
                {onGenerate && (
                    <button
                        type="button"
                        onClick={generar}
                        disabled={generating}
                        title="Redactar con IA"
                        aria-label="Redactar con IA"
                        className="rounded-lg p-1.5 text-muted transition-colors hover:bg-canvas hover:text-primary disabled:opacity-50 dark:hover:bg-gray-700"
                    >
                        <Sparkles size={14} className={generating ? 'animate-pulse text-primary' : ''} />
                    </button>
                )}
                {supported && (
                    <button
                        type="button"
                        onClick={listening ? stop : start}
                        title={listening ? 'Detener el dictado' : 'Dictar'}
                        aria-label={listening ? 'Detener el dictado' : 'Dictar'}
                        className={`rounded-lg p-1.5 transition-colors
                            ${listening
                            ? 'bg-rose-500 text-white'
                            : 'text-muted hover:bg-canvas hover:text-primary dark:hover:bg-gray-700'
                        }`}
                    >
                        {listening ? <Square size={14} /> : <Mic size={14} />}
                    </button>
                )}
                </div>
            </div>
            {listening && <p className="text-[11px] text-primary">Escuchando… hablá y se va escribiendo.</p>}
            {generating && <p className="text-[11px] text-primary">Redactando…</p>}
            {error && <p className="text-[11px] text-rose-500">{error}</p>}
            {genError && <p className="text-[11px] text-rose-500">{genError}</p>}
        </div>
    );
}

