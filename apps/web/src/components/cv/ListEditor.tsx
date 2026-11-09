import { Plus, Trash2 } from 'lucide-react';
import Button from '../ui/Button';

export type FieldKind = 'text' | 'textarea' | 'date' | 'checkbox' | 'select';

export interface FieldSpec {
    key: string;
    label: string;
    kind: FieldKind;
    options?: { value: string; label: string }[];
    /** Ocupa toda la fila en vez de media */
    wide?: boolean;
}

export type Row = Record<string, unknown>;

// Las fechas del contrato son epoch ms; el <input type="date"> habla en
// "YYYY-MM-DD". Se convierte en los dos sentidos acá y no en cada formulario.
function toInputDate(v: unknown): string {
    if (v == null || v === '') return '';
    const ms = typeof v === 'number' ? v : Number(v);
    if (!Number.isFinite(ms)) return '';
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
}

function fromInputDate(s: string): number | null {
    if (!s) return null;
    const ms = Date.parse(`${s}T00:00:00Z`);
    return Number.isNaN(ms) ? null : ms;
}

const inputClass =
    'w-full rounded-lg border border-line bg-surface px-2.5 py-2 text-sm text-ink placeholder:text-muted focus:border-primary focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white';

export function Field({ spec, value, onChange }: {
    spec: FieldSpec; value: unknown; onChange: (v: unknown) => void;
}) {
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
            <span className="text-[11px] font-medium text-body dark:text-gray-300">{spec.label}</span>
            {spec.kind === 'textarea' ? (
                <textarea
                    rows={3}
                    value={typeof value === 'string' ? value : ''}
                    onChange={e => onChange(e.target.value)}
                    className={`${inputClass} resize-y`}
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
                <input
                    type="date"
                    value={toInputDate(value)}
                    onChange={e => onChange(fromInputDate(e.target.value))}
                    className={inputClass}
                />
            ) : (
                <input
                    type="text"
                    value={typeof value === 'string' ? value : ''}
                    onChange={e => onChange(e.target.value)}
                    className={inputClass}
                />
            )}
        </label>
    );
}

/**
 * Edita una de las listas repetibles del CV (experiencia, educación…).
 * Los elementos no llevan `id`: el servidor lo genera cuando falta, y los que
 * ya lo tienen lo conservan intacto.
 */
export default function ListEditor({
    title, fields, rows, onChange, addLabel,
}: {
    title: string;
    fields: FieldSpec[];
    rows: Row[];
    onChange: (rows: Row[]) => void;
    addLabel: string;
}) {
    const update = (i: number, key: string, v: unknown) =>
        onChange(rows.map((r, j) => (j === i ? { ...r, [key]: v } : r)));

    return (
        <section className="flex flex-col gap-2">
            <h3 className="text-sm font-bold text-ink dark:text-white">{title}</h3>

            {rows.length === 0 && (
                <p className="text-xs text-muted">Todavía no agregaste nada.</p>
            )}

            {rows.map((row, i) => (
                <div
                    key={(row.id as string) ?? i}
                    className="rounded-xl border border-line p-3 dark:border-gray-800"
                >
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {fields.map(f => (
                            <div key={f.key} className={f.wide ? 'sm:col-span-2' : undefined}>
                                <Field
                                    spec={f}
                                    value={row[f.key]}
                                    onChange={v => update(i, f.key, v)}
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
