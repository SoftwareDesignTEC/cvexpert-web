import { AlertTriangle, Check, X } from 'lucide-react';

/**
 * Estado de una fase del formulario.
 *
 * - `pendiente`: todavía no se abrió, no se sabe nada de ella
 * - `incompleta`: le faltan datos obligatorios y bloquea el guardado
 * - `parcial`: se abrió pero no tiene contenido, o quedó algo por revisar
 * - `lista`: completa, sin nada que corregir
 */
export type PhaseState = 'pendiente' | 'incompleta' | 'parcial' | 'lista';

export interface Phase {
    id: string;
    label: string;
    state: PhaseState;
}

// El color por sí solo no comunica a quien no lo distingue, así que cada
// estado lleva además un ícono y un texto en el título.
const ESTILO: Record<PhaseState, { punto: string; texto: string; titulo: string }> = {
    pendiente:  { punto: 'bg-gray-300 text-gray-600 dark:bg-gray-700 dark:text-gray-400', texto: 'text-muted',                       titulo: 'sin abrir' },
    incompleta: { punto: 'bg-rose-500 text-white',                                        texto: 'text-rose-600 dark:text-rose-400', titulo: 'falta completar datos obligatorios' },
    parcial:    { punto: 'bg-amber-400 text-amber-950',                                   texto: 'text-amber-600 dark:text-amber-400', titulo: 'sin contenido o con algo por revisar' },
    lista:      { punto: 'bg-emerald-500 text-white',                                     texto: 'text-emerald-600 dark:text-emerald-400', titulo: 'lista' },
};

function Icono({ state, index }: { state: PhaseState; index: number }) {
    if (state === 'lista') return <Check size={13} strokeWidth={3} />;
    if (state === 'incompleta') return <X size={13} strokeWidth={3} />;
    if (state === 'parcial') return <AlertTriangle size={12} strokeWidth={3} />;
    return <span className="text-[11px] font-bold">{index + 1}</span>;
}

/**
 * Línea de tiempo del formulario por fases.
 *
 * Los pasos se pueden pulsar para saltar directo. Como guardar está sólo al
 * final, sin eso alguien que viene a corregir un dato tendría que recorrer
 * todas las fases para llegar al botón.
 */
export default function PhaseTimeline({ phases, current, onSelect }: {
    phases: Phase[];
    current: number;
    onSelect: (index: number) => void;
}) {
    return (
        <ol className="flex items-start gap-1 overflow-x-auto pb-1">
            {phases.map((phase, i) => {
                const estilo = ESTILO[phase.state];
                const actual = i === current;

                return (
                    <li key={phase.id} className="flex min-w-0 flex-1 items-start gap-1">
                        <button
                            type="button"
                            onClick={() => onSelect(i)}
                            title={`${phase.label}: ${estilo.titulo}`}
                            aria-current={actual ? 'step' : undefined}
                            className={`flex min-w-0 flex-1 flex-col items-center gap-1 rounded-lg px-1 py-1.5 transition-colors
                                ${actual ? 'bg-canvas dark:bg-gray-800' : 'hover:bg-canvas/60 dark:hover:bg-gray-800/60'}`}
                        >
                            <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${estilo.punto}
                                ${actual ? 'ring-2 ring-primary ring-offset-2 ring-offset-surface dark:ring-offset-gray-900' : ''}`}
                            >
                                <Icono state={phase.state} index={i} />
                            </span>
                            <span className={`w-full truncate text-center text-[10px] font-medium leading-tight ${estilo.texto}`}>
                                {phase.label}
                            </span>
                        </button>

                        {/* Línea de unión, salvo después del último */}
                        {i < phases.length - 1 && (
                            <span className="mt-3 h-px w-2 shrink-0 bg-line dark:bg-gray-700" aria-hidden />
                        )}
                    </li>
                );
            })}
        </ol>
    );
}
