import { useId, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import Button from '../ui/Button';
import DateFieldInput from './DateField';
import DictatableTextArea from './DictatableTextArea';

export type FieldKind = 'text' | 'textarea' | 'date' | 'checkbox' | 'select';

export interface FieldSpec {
    key: string;
    label: string;
    kind: FieldKind;
    options?: { value: string; label: string }[];
    /**
     * Sugerencias para un campo de texto. Se ofrecen mientras se escribe pero
     * no obligan: en un currículum siempre puede aparecer algo fuera de la lista.
     */
    suggestions?: readonly string[];
    /** El servicio lo exige: se marca a la vista y bloquea el guardado */
    required?: boolean;
    /** Obligatorio sólo en ciertas filas, p. ej. la empresa en un empleo formal */
    requiredWhen?: (row: Row) => boolean;
    /** Redacta el contenido con IA; recibe la fila para armar el contexto */
    generate?: (actual: string, row: Row) => Promise<string>;
    /** Ocupa toda la fila en vez de media */
    wide?: boolean;
}

export type Row = Record<string, unknown>;

const inputBase =
    'w-full rounded-lg bg-surface px-2.5 py-2 text-sm text-ink placeholder:text-muted focus:outline-none dark:bg-gray-800 dark:text-white';

const inputClass = `${inputBase} border border-line focus:border-primary dark:border-gray-700`;
const inputClassError = `${inputBase} border border-rose-400 focus:border-rose-500`;

/** Punto rojo fijo; el texto sigue el tema, para que no grite en cada campo. */
export function RequiredMark() {
    return (
        <span className="ml-1.5 whitespace-nowrap text-[10px] text-muted">
            <span className="text-rose-500">●</span> Obligatorio
        </span>
    );
}

export function Field({ spec, value, onChange, error, onBlur, row }: {
    spec: FieldSpec;
    value: unknown;
    onChange: (v: unknown) => void;
    /** Mensaje bajo el campo; también lo pinta de rojo */
    error?: string;
    onBlur?: () => void;
    /** La fila a la que pertenece, para dar contexto a la redacción con IA */
    row?: Row;
}) {
    // El id del datalist tiene que ser único en toda la página: la misma clave
    // se repite en cada fila de una lista y entre secciones distintas.
    const listId = useId();
    if (spec.kind === 'checkbox') {
        return (
            <label className="flex items-center gap-2 text-xs text-body dark:text-gray-300">
                <input
                    type="checkbox"
                    checked={value === true}
                    onChange={e => onChange(e.target.checked)}
                    className="h-4 w-4 rounded border-line accent-[var(--color-primary)]"
                />
                {spec.label}
            </label>
        );
    }

    return (
        <label className="flex flex-col gap-1">
            <span className="text-[11px] font-medium text-body dark:text-gray-300">
                {spec.label}
                {spec.required && <RequiredMark />}
            </span>
            {spec.kind === 'textarea' ? (
                <DictatableTextArea
                    value={typeof value === 'string' ? value : ''}
                    onChange={onChange}
                    onGenerate={spec.generate ? actual => spec.generate!(actual, row ?? {}) : undefined}
                />
            ) : spec.kind === 'select' ? (
                <select
                    value={typeof value === 'string' ? value : ''}
                    onChange={e => onChange(e.target.value || null)}
                    className={inputClass}
                >
                    <option value="">Sin definir</option>
                    {spec.options?.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                </select>
            ) : spec.kind === 'date' ? (
                <DateFieldInput
                    value={value}
                    onChange={onChange}
                    onBlur={onBlur}
                    error={!!error}
                />
            ) : (
                <>
                    <input
                        type="text"
                        list={spec.suggestions ? listId : undefined}
                        value={typeof value === 'string' ? value : ''}
                        onChange={e => onChange(e.target.value)}
                        onBlur={onBlur}
                        className={error ? inputClassError : inputClass}
                    />
                    {spec.suggestions && (
                        <datalist id={listId}>
                            {spec.suggestions.map(o => <option key={o} value={o} />)}
                        </datalist>
                    )}
                </>
            )}
            {error && <p className="text-[11px] text-rose-500">{error}</p>}
        </label>
    );
}

/**
 * Edita una de las listas repetibles del CV (experiencia, educación…).
 * Los elementos no llevan `id`: el servidor lo genera cuando falta, y los que
 * ya lo tienen lo conservan intacto.
 */
export default function ListEditor({
    title, fields, rows, onChange, addLabel, note,
}: {
    title: string;
    fields: FieldSpec[];
    rows: Row[];
    onChange: (rows: Row[]) => void;
    addLabel: string;
    /** Aclaración bajo el título, p. ej. que la plantilla no dibuja esta sección */
    note?: string;
}) {
    const update = (i: number, key: string, v: unknown) =>
        onChange(rows.map((r, j) => (j === i ? { ...r, [key]: v } : r)));

    // Se marca en rojo recién cuando el usuario pasó por el campo
    const [touched, setTouched] = useState<Record<string, boolean>>({});
    const touch = (key: string) => setTouched(t => ({ ...t, [key]: true }));

    return (
        <section className="flex flex-col gap-2">
            <h3 className="text-sm font-bold text-ink dark:text-white">{title}</h3>
            {note && <p className="-mt-1 text-[11px] text-muted">{note}</p>}

            {rows.length === 0 && (
                <p className="text-xs text-muted">Todavía no agregaste nada.</p>
            )}

            {rows.map((row, i) => (
                <div
                    key={(row.id as string) ?? i}
                    className="rounded-xl border border-line p-3 dark:border-gray-800"
                >
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {/* min-w-0 en cada celda: sin eso, una con varios controles
                            dentro ensancha la rejilla y el diálogo scrollea */}
                        {fields.map(f => (
                            <div key={f.key} className={`min-w-0 ${f.wide ? 'sm:col-span-2' : ''}`}>
                                <Field
                                    spec={{
                                        ...f,
                                        required: f.requiredWhen ? f.requiredWhen(row) : f.required,
                                    }}
                                    value={row[f.key]}
                                    onChange={v => update(i, f.key, v)}
                                    row={row}
                                    onBlur={() => touch(`${i}.${f.key}`)}
                                    error={
                                        (f.requiredWhen ? f.requiredWhen(row) : f.required)
                                        && touched[`${i}.${f.key}`]
                                        && String(row[f.key] ?? '').trim() === ''
                                            ? 'Este campo es obligatorio'
                                            : undefined
                                    }
                                />
                            </div>
                        ))}
                    </div>
                    <button
                        type="button"
                        onClick={() => onChange(rows.filter((_, j) => j !== i))}
                        className="mt-2 inline-flex items-center gap-1 text-xs text-muted hover:text-rose-500"
                    >
                        <Trash2 size={13} /> Quitar
                    </button>
                </div>
            ))}

            <Button
                type="button"
                variant="secondary"
                size="sm"
                className="self-start"
                onClick={() => onChange([...rows, {}])}
            >
                <Plus size={14} /> {addLabel}
            </Button>
        </section>
    );
}
