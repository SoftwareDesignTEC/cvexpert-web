import { useEffect, useRef, useState } from 'react';
import { MESES, fromParts, toParts } from './dateParts';
import type { DateParts } from './dateParts';

const campo =
    'w-full min-w-0 rounded-lg bg-surface px-2 py-2 text-sm text-ink placeholder:text-muted focus:outline-none dark:bg-gray-800 dark:text-white';

// Las flechas del input numérico roban ancho y acá no sirven de nada
const sinFlechas = '[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none';

export default function DateFieldInput({ value, onChange, onBlur, error }: {
    value: unknown;
    onChange: (v: number | null) => void;
    onBlur?: () => void;
    error?: boolean;
}) {
    /**
     * Lo que se ve sale de un estado propio y no del valor guardado.
     *
     * Derivarlo del valor hacía imposible escribir el año: al teclear el primer
     * dígito la fecha quedaba incompleta, el padre recibía null y el campo se
     * vaciaba antes de poder escribir el segundo.
     */
    const [partes, setPartes] = useState<DateParts>(() => toParts(value));

    // Si el valor cambia desde afuera —al abrir otro currículum, por ejemplo—
    // se vuelve a tomar de ahí. Se compara contra lo que representa el estado
    // actual para no pisar lo que se está escribiendo.
    const ultimo = useRef<number | null>(fromParts(partes));
    useEffect(() => {
        const entrante = typeof value === 'number' ? value : null;
        if (entrante !== ultimo.current) {
            ultimo.current = entrante;
            setPartes(toParts(value));
        }
    }, [value]);

    const borde = error
        ? 'border border-rose-400 focus:border-rose-500'
        : 'border border-line focus:border-primary dark:border-gray-700';

    const cambiar = (p: Partial<DateParts>) => {
        const nuevas = { ...partes, ...p };
        setPartes(nuevas);

        // El padre recibe la fecha sólo cuando está completa; mientras tanto,
        // null. Lo que se ve no depende de eso, así que se puede seguir escribiendo.
        const ms = nuevas.year === '' && nuevas.month === '' ? null : fromParts(nuevas);
        ultimo.current = ms;
        onChange(ms);
    };

    return (
        <div className="grid grid-cols-[minmax(0,3.5rem)_minmax(0,1fr)_minmax(0,3rem)] gap-1.5">
            <input
                type="text"
                inputMode="numeric"
                maxLength={4}
                placeholder="Año"
                aria-label="Año"
                value={partes.year}
                onChange={e => cambiar({ year: e.target.value.replace(/\D/g, '') })}
                onBlur={onBlur}
                className={`${campo} ${borde} ${sinFlechas}`}
            />
            <select
                aria-label="Mes"
                value={partes.month}
                onChange={e => cambiar({ month: e.target.value })}
                onBlur={onBlur}
                className={`${campo} ${borde}`}
            >
                <option value="">Mes</option>
                {MESES.map((m, i) => (
                    <option key={m} value={i + 1}>{m}</option>
                ))}
            </select>
            <input
                type="text"
                inputMode="numeric"
                maxLength={2}
                // Opcional a propósito: en una experiencia laboral nadie recuerda
                // el día, y pedirlo sólo agrega una ocasión de equivocarse.
                placeholder="Día"
                aria-label="Día (opcional)"
                value={partes.day}
                onChange={e => cambiar({ day: e.target.value.replace(/\D/g, '') })}
                onBlur={onBlur}
                className={`${campo} ${borde} ${sinFlechas}`}
            />
        </div>
    );
}
