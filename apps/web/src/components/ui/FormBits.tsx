import { Info } from 'lucide-react';
import Button from './Button';

// Piezas compartidas por los formularios de Configuración y Perfil.
// Ninguno envía datos todavía: validan en el navegador y avisan al guardar.

export function Field({
    label, type = 'text', value, onChange, error, placeholder, autoComplete,
}: {
    label: string;
    type?: string;
    value: string;
    onChange: (v: string) => void;
    error?: string;
    placeholder?: string;
    autoComplete?: string;
}) {
    return (
        <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-body dark:text-gray-300">{label}</label>
            <input
                type={type}
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder}
                autoComplete={autoComplete}
                className={`rounded-xl border px-3 py-2.5 text-sm bg-surface dark:bg-gray-800 text-ink dark:text-white placeholder:text-muted focus:outline-none
                    ${error
                    ? 'border-rose-400 focus:border-rose-500'
                    : 'border-line dark:border-gray-700 focus:border-primary'
                }`}
            />
            {error && <p className="text-xs text-rose-500">{error}</p>}
        </div>
    );
}

export function TextArea({
    label, value, onChange, error, placeholder, rows = 4,
}: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    error?: string;
    placeholder?: string;
    rows?: number;
}) {
    return (
        <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-body dark:text-gray-300">{label}</label>
            <textarea
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder}
                rows={rows}
                className={`rounded-xl border px-3 py-2.5 text-sm bg-surface dark:bg-gray-800 text-ink dark:text-white placeholder:text-muted focus:outline-none resize-y
                    ${error
                    ? 'border-rose-400 focus:border-rose-500'
                    : 'border-line dark:border-gray-700 focus:border-primary'
                }`}
            />
            {error && <p className="text-xs text-rose-500">{error}</p>}
        </div>
    );
}

export function Toggle({
    label, description, checked, onChange,
}: {
    label: string;
    description?: string;
    checked: boolean;
    onChange: (v: boolean) => void;
}) {
    return (
        <label className="flex items-start justify-between gap-3 rounded-xl border border-line dark:border-gray-800 px-3 py-2.5 cursor-pointer">
            <span className="min-w-0">
                <span className="block text-sm font-medium text-ink dark:text-gray-100">{label}</span>
                {description && <span className="block text-xs text-muted">{description}</span>}
            </span>
            <button
                type="button"
                role="switch"
                aria-checked={checked}
                aria-label={label}
                onClick={() => onChange(!checked)}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors
                    ${checked ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-700'}`}
            >
                <span
                    className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform
                        ${checked ? 'translate-x-5' : 'translate-x-0.5'}`}
                />
            </button>
        </label>
    );
}

// Grupo de opciones múltiples en forma de etiquetas seleccionables
export function ChipGroup<T extends string>({
    label, options, selected, onToggle,
}: {
    label: string;
    options: { value: T; label: string }[];
    selected: T[];
    onToggle: (value: T) => void;
}) {
    return (
        <div className="flex flex-col gap-2">
            <span className="text-xs font-medium text-body dark:text-gray-300">{label}</span>
            <div className="flex flex-wrap gap-2">
                {options.map(opt => {
                    const active = selected.includes(opt.value);
                    return (
                        <button
                            key={opt.value}
                            type="button"
                            aria-pressed={active}
                            onClick={() => onToggle(opt.value)}
                            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors
                                ${active
                                ? 'bg-primary text-white border-primary'
                                : 'bg-surface dark:bg-gray-800 text-body dark:text-gray-300 border-line dark:border-gray-700 hover:border-primary'
                            }`}
                        >
                            {opt.label}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

export function NotAvailableNotice() {
    return (
        <div className="flex items-start gap-2 rounded-xl bg-primary-tint dark:bg-primary/10 px-3 py-2.5">
            <Info size={15} className="text-primary shrink-0 mt-0.5" />
            <p className="text-xs text-body dark:text-gray-300">
                Esta acción todavía no está disponible: el formulario valida los datos pero no se envía nada.
            </p>
        </div>
    );
}

export function DialogActions({
    onCancel, saved, submitLabel = 'Guardar cambios', danger,
}: {
    onCancel: () => void;
    saved: boolean;
    submitLabel?: string;
    danger?: boolean;
}) {
    return (
        <>
            {saved && <NotAvailableNotice />}
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <Button type="button" variant="secondary" size="sm" onClick={onCancel}>Cancelar</Button>
                <Button type="submit" size="sm" variant={danger ? 'danger' : 'primary'}>{submitLabel}</Button>
            </div>
        </>
    );
}
