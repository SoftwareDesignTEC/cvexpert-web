import { MESES, fromParts, toParts } from './dateParts';
import type { DateParts } from './dateParts';

const campo =
    'rounded-lg bg-surface px-2.5 py-2 text-sm text-ink placeholder:text-muted focus:outline-none dark:bg-gray-800 dark:text-white';

export default function DateFieldInput({ value, onChange, onBlur, error }: {
    value: unknown;
    onChange: (v: number | null) => void;
    onBlur?: () => void;
    error?: boolean;
}) {
    const partes = toParts(value);
    const borde = error
        ? 'border border-rose-400 focus:border-rose-500'
        : 'border border-line focus:border-primary dark:border-gray-700';

    const cambiar = (p: Partial<DateParts>) => {
        const nuevas = { ...partes, ...p };
        // Vaciar año y mes borra la fecha en vez de dejarla a medias
        if (nuevas.year === '' && nuevas.month === '') onChange(null);
        else onChange(fromParts(nuevas));
    };

    return (
        <div className="grid grid-cols-[1fr_1.4fr_0.8fr] gap-1.5">
            <input
                type="number"
                inputMode="numeric"
                placeholder="Año"
                aria-label="Año"
                value={partes.year}
                onChange={e => cambiar({ year: e.target.value })}
                onBlur={onBlur}
                className={`${campo} ${borde}`}
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
                type="number"
                inputMode="numeric"
                min={1}
                max={31}
                // Opcional a propósito: en una experiencia laboral nadie recuerda
                // el día, y pedirlo sólo agrega una ocasión de equivocarse.
                placeholder="Día"
                aria-label="Día (opcional)"
                value={partes.day}
                onChange={e => cambiar({ day: e.target.value })}
                onBlur={onBlur}
                className={`${campo} ${borde}`}
            />
        </div>
    );
}
