import { useMemo, useState } from 'react';
import { AlertTriangle, Plus, Trash2 } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';
import { describeError } from '../../services/http';
import {
    LEVEL_LABEL,
    SKILL_LEVELS,
    skillsGapService,
} from '../../services/skillsGapService';
import type { SkillInput, SkillLevel } from '../../services/skillsGapService';

interface Row {
    // Clave estable: el nombre cambia mientras se escribe y no sirve como key
    id: number;
    skillName: string;
    level: SkillLevel | '';
}

let nextId = 1;
const emptyRow = (): Row => ({ id: nextId++, skillName: '', level: '' });

export default function SkillsInputDialog({
    open, onClose, onSaved,
}: {
    open: boolean;
    onClose: () => void;
    onSaved: () => void;
}) {
    // El formulario arranca vacío a propósito. GET /skills-gap NO devuelve la
    // lista guardada: `items` trae sólo las brechas positivas y `unresolved` las
    // no comparables, así que las habilidades que ya cumplen el requisito no
    // aparecen en ninguna parte. Precargar desde ahí y mandar el PUT —que
    // reemplaza todo— habría borrado justamente esas, sin aviso.
    const [rows, setRows] = useState<Row[]>(() => [emptyRow()]);
    const [confirming, setConfirming] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const update = (id: number, patch: Partial<Row>) =>
        setRows(rs => rs.map(r => (r.id === id ? { ...r, ...patch } : r)));

    const named = rows.filter(r => r.skillName.trim() !== '');

    // El servicio rechaza toda la petición con 400 si hay duplicados, así que se
    // bloquean acá. La comparación ignora mayúsculas aunque el catálogo sí las
    // distinga: "python" y "Python" son dos filas que el usuario no quiso repetir.
    const duplicates = useMemo(() => {
        const seen = new Set<string>();
        const dup = new Set<string>();
        for (const r of named) {
            const key = r.skillName.trim().toLowerCase();
            if (seen.has(key)) dup.add(key);
            seen.add(key);
        }
        return dup;
    }, [named]);

    const isDuplicate = (r: Row) =>
        r.skillName.trim() !== '' && duplicates.has(r.skillName.trim().toLowerCase());

    const canSave = duplicates.size === 0 && !saving;

    const save = async () => {
        setSaving(true);
        setError(null);
        try {
            const payload: SkillInput[] = named.map(r => ({
                skillName: r.skillName.trim(),
                level: r.level === '' ? null : r.level,
            }));
            await skillsGapService.saveInput(payload);
            onSaved();
        } catch (err) {
            setError(describeError(err, 'guardar tus habilidades'));
            setConfirming(false);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal
            open={open}
            size="lg"
            title="Mis habilidades"
            description="Con esto calculamos tu brecha frente a la vacante de referencia."
            onClose={onClose}
        >
            <div className="flex flex-col gap-4">
                {/* El PUT reemplaza la lista completa y el formulario arranca vacío:
                    hay que ser explícito o el usuario pierde lo que ya tenía. */}
                <div className="flex gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2.5 dark:border-amber-500/40 dark:bg-amber-500/10">
                    <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
                    <p className="text-xs text-amber-900 dark:text-amber-200">
                        Escribí <strong>todas</strong> tus habilidades, incluso las que ya hayas
                        guardado antes. Esta lista <strong>reemplaza por completo</strong> la
                        anterior: lo que no esté acá deja de contar para el análisis.
                    </p>
                </div>

                <div className="flex flex-col gap-2">
                    {rows.map(row => (
                        <div key={row.id} className="flex items-start gap-2">
                            <div className="min-w-0 flex-1">
                                <input
                                    value={row.skillName}
                                    onChange={e => update(row.id, { skillName: e.target.value })}
                                    placeholder="Nombre de la habilidad"
                                    className={`w-full rounded-xl border bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-muted focus:outline-none dark:bg-gray-800 dark:text-white
                                        ${isDuplicate(row)
                                        ? 'border-rose-400 focus:border-rose-500'
                                        : 'border-line focus:border-primary dark:border-gray-700'
                                    }`}
                                />
                                {isDuplicate(row) && (
                                    <p className="mt-1 text-xs text-rose-500">Está repetida</p>
                                )}
                            </div>

                            <select
                                value={row.level}
                                onChange={e => update(row.id, { level: e.target.value as SkillLevel | '' })}
                                className="w-36 shrink-0 rounded-xl border border-line bg-surface px-3 py-2.5 text-sm text-ink focus:border-primary focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                            >
                                <option value="">Sin definir</option>
                                {SKILL_LEVELS.map(l => (
                                    <option key={l} value={l}>{LEVEL_LABEL[l]}</option>
                                ))}
                            </select>

                            <button
                                type="button"
                                onClick={() => setRows(rs => (rs.length === 1 ? [emptyRow()] : rs.filter(r => r.id !== row.id)))}
                                aria-label={`Quitar ${row.skillName || 'la fila'}`}
                                className="mt-1 shrink-0 rounded-lg p-2 text-muted hover:bg-canvas hover:text-rose-500 dark:hover:bg-gray-800"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ))}
                </div>

                <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="self-start"
                    onClick={() => setRows(rs => [...rs, emptyRow()])}
                >
                    <Plus size={14} /> Agregar habilidad
                </Button>

                <p className="text-xs text-muted">
                    Los nombres distinguen mayúsculas. Si una habilidad no está en el catálogo
                    igual se guarda, pero va a aparecer como no comparable en el análisis.
                </p>

                {error && <p className="text-sm text-rose-500">{error}</p>}

                {confirming ? (
                    <div className="flex flex-col gap-3 rounded-xl border border-line bg-canvas/60 p-3 dark:border-gray-800 dark:bg-gray-800/60">
                        <p className="text-sm text-body dark:text-gray-300">
                            {named.length === 0
                                ? '¿Guardar una lista vacía? Vas a quedarte sin análisis de brecha hasta que cargues habilidades de nuevo.'
                                : `¿Reemplazar todas tus habilidades guardadas por estas ${named.length}? Las que no estén en la lista se pierden.`}
                        </p>
                        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                            <Button type="button" variant="secondary" size="sm" onClick={() => setConfirming(false)}>
                                Volver
                            </Button>
                            <Button type="button" size="sm" onClick={save} disabled={saving}>
                                {saving ? 'Guardando…' : 'Sí, reemplazar'}
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                        <Button type="button" variant="secondary" size="sm" onClick={onClose}>
                            Cancelar
                        </Button>
                        <Button type="button" size="sm" disabled={!canSave} onClick={() => setConfirming(true)}>
                            Guardar habilidades
                        </Button>
                    </div>
                )}
            </div>
        </Modal>
    );
}
