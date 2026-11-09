import { useMemo, useState } from 'react';
import { Eye, Pencil } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import ListEditor, { Field } from './ListEditor';
import type { FieldSpec, Row } from './ListEditor';
import CvDocument from './CvDocument';
import { ApiError, describeError } from '../../services/http';
import { cvService, emptyCvInput, toCvInput } from '../../services/cvService';
import type { CvInput } from '../../services/cvService';
import type { CV, CVTemplate } from '../../types/models';

// Los enums viajan en inglés; las etiquetas son nuestras
const SKILL_LEVELS = [
    { value: 'beginner', label: 'Principiante' },
    { value: 'intermediate', label: 'Intermedio' },
    { value: 'advanced', label: 'Avanzado' },
    { value: 'expert', label: 'Experto' },
];

const LANGUAGE_LEVELS = [
    { value: 'basic', label: 'Básico' },
    { value: 'intermediate', label: 'Intermedio' },
    { value: 'advanced', label: 'Avanzado' },
    { value: 'native', label: 'Nativo' },
];

const WORK_TYPES = [
    { value: 'formal', label: 'Formal' },
    { value: 'freelance', label: 'Independiente' },
    { value: 'volunteer', label: 'Voluntariado' },
    { value: 'school-project', label: 'Proyecto académico' },
    { value: 'informal', label: 'Informal' },
];

const WORK_FIELDS: FieldSpec[] = [
    { key: 'position', label: 'Puesto', kind: 'text' },
    { key: 'company', label: 'Empresa', kind: 'text' },
    { key: 'startDate', label: 'Inicio', kind: 'date' },
    { key: 'endDate', label: 'Fin', kind: 'date' },
    { key: 'type', label: 'Tipo', kind: 'select', options: WORK_TYPES },
    { key: 'current', label: 'Sigo trabajando acá', kind: 'checkbox' },
    { key: 'description', label: 'Descripción', kind: 'textarea', wide: true },
];

const EDUCATION_FIELDS: FieldSpec[] = [
    { key: 'degree', label: 'Título', kind: 'text' },
    { key: 'institution', label: 'Institución', kind: 'text' },
    { key: 'field', label: 'Área', kind: 'text' },
    { key: 'startDate', label: 'Inicio', kind: 'date' },
    { key: 'endDate', label: 'Fin', kind: 'date' },
    { key: 'current', label: 'En curso', kind: 'checkbox' },
];

const SKILL_FIELDS: FieldSpec[] = [
    { key: 'name', label: 'Habilidad', kind: 'text' },
    { key: 'level', label: 'Nivel', kind: 'select', options: SKILL_LEVELS },
    { key: 'category', label: 'Categoría', kind: 'text' },
];

const LANGUAGE_FIELDS: FieldSpec[] = [
    { key: 'name', label: 'Idioma', kind: 'text' },
    { key: 'level', label: 'Nivel', kind: 'select', options: LANGUAGE_LEVELS },
];

const CERT_FIELDS: FieldSpec[] = [
    { key: 'name', label: 'Certificación', kind: 'text' },
    { key: 'issuer', label: 'Emisor', kind: 'text' },
    { key: 'issuedAt', label: 'Emitida', kind: 'date' },
    { key: 'expiresAt', label: 'Vence', kind: 'date' },
    { key: 'credentialUrl', label: 'Enlace', kind: 'text', wide: true },
];

// email no está acá: el servicio lo exige, así que se dibuja junto a fullName
const PERSONAL_FIELDS: FieldSpec[] = [
    { key: 'phone', label: 'Teléfono', kind: 'text' },
    { key: 'address', label: 'Dirección', kind: 'text' },
    { key: 'birthDate', label: 'Fecha de nacimiento', kind: 'date' },
    { key: 'photoUrl', label: 'Foto (URL)', kind: 'text', wide: true },
    { key: 'bio', label: 'Perfil profesional', kind: 'textarea', wide: true },
];

export default function CvEditorDialog({
    open, cv, templates, defaultTemplateId, defaultFullName, defaultEmail, onClose, onSaved,
}: {
    open: boolean;
    /** null para crear uno nuevo */
    cv: CV | null;
    templates: CVTemplate[];
    defaultTemplateId?: string;
    /** Se precargan al crear; la copia desde el perfil la hace la web, no el backend */
    defaultFullName?: string;
    defaultEmail?: string;
    onClose: () => void;
    onSaved: (saved: CV) => void;
}) {
    const [input, setInput] = useState<CvInput>(() =>
        cv
            ? toCvInput(cv)
            : emptyCvInput(
                defaultTemplateId ?? templates[0]?.id ?? '',
                defaultFullName ?? '',
                defaultEmail ?? '',
            ));
    const [tab, setTab] = useState<'form' | 'preview'>('form');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    const patch = (p: Partial<CvInput>) => setInput(prev => ({ ...prev, ...p }));
    const patchPersonal = (key: string, v: unknown) =>
        setInput(prev => ({ ...prev, personalInfo: { ...prev.personalInfo, [key]: v } }));

    const layout = useMemo(
        () => templates.find(t => t.id === input.templateId)?.layout ?? null,
        [templates, input.templateId],
    );

    const save = async () => {
        setSaving(true);
        setError(null);
        setFieldErrors({});
        try {
            // Las cuatro listas van siempre, aunque estén vacías: omitirlas es 400
            const body: CvInput = {
                ...input,
                title: input.title.trim(),
                personalInfo: {
                    ...input.personalInfo,
                    fullName: input.personalInfo.fullName.trim(),
                    email: input.personalInfo.email.trim(),
                },
                workExperiences: input.workExperiences ?? [],
                education: input.education ?? [],
                skills: input.skills ?? [],
                languages: input.languages ?? [],
            };
            const saved = cv
                ? await cvService.update(cv.id, body)
                : await cvService.create(body);
            onSaved(saved);
        } catch (err) {
            // El 400 trae el detalle por campo; se muestra junto al general
            if (err instanceof ApiError && err.errors) setFieldErrors(err.errors);
            setError(describeError(err, cv ? 'guardar los cambios' : 'crear el currículum'));
        } finally {
            setSaving(false);
        }
    };

    // El servicio exige título, plantilla, fullName y email. En vez de un
    // booleano suelto se arma la lista de lo que falta: un botón apagado sin
    // explicación deja al usuario sin saber qué corregir.
    const missing = [
        input.title.trim() === '' && 'el título',
        input.templateId === '' && 'la plantilla',
        input.personalInfo.fullName.trim() === '' && 'el nombre completo',
        input.personalInfo.email.trim() === '' && 'el correo',
    ].filter((m): m is string => typeof m === 'string');

    const canSave = missing.length === 0 && !saving;

    // Un campo se marca en rojo sólo después de que el usuario pasó por él:
    // señalar errores en un formulario recién abierto es ruido, no ayuda.
    const [touched, setTouched] = useState<Record<string, boolean>>({});
    const touch = (key: string) => setTouched(t => ({ ...t, [key]: true }));
    const errorFor = (key: string, value: string) =>
        touched[key] && value.trim() === '' ? 'Este campo es obligatorio' : undefined;

    return (
        <Modal
            open={open}
            size="lg"
            title={cv ? 'Editar currículum' : 'Nuevo currículum'}
            description={cv ? undefined : 'Los datos los completás vos; no se copian del perfil automáticamente.'}
            onClose={onClose}
        >
            <div className="flex flex-col gap-4">
                <div className="flex gap-2">
                    <Button
                        type="button"
                        size="sm"
                        variant={tab === 'form' ? 'primary' : 'secondary'}
                        onClick={() => setTab('form')}
                    >
                        <Pencil size={14} /> Datos
                    </Button>
                    <Button
                        type="button"
                        size="sm"
                        variant={tab === 'preview' ? 'primary' : 'secondary'}
                        onClick={() => setTab('preview')}
                    >
                        <Eye size={14} /> Vista previa
                    </Button>
                </div>

                <div className="max-h-[60vh] overflow-auto pr-1">
                    {tab === 'preview' ? (
                        layout ? (
                            <div className="rounded-xl bg-canvas p-2 dark:bg-gray-800">
                                <CvDocument cv={input as unknown as Record<string, unknown>} layout={layout} />
                            </div>
                        ) : (
                            <p className="py-8 text-center text-sm text-muted">
                                Esta plantilla todavía no tiene diseño estructurado, así que no hay vista previa.
                            </p>
                        )
                    ) : (
                        <div className="flex flex-col gap-5">
                            <section className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                <Field
                                    spec={{ key: 'title', label: 'Título del currículum *', kind: 'text' }}
                                    value={input.title}
                                    onChange={v => patch({ title: String(v) })}
                                    onBlur={() => touch('title')}
                                    error={errorFor('title', input.title)}
                                />
                                <Field
                                    spec={{
                                        key: 'templateId',
                                        label: 'Plantilla',
                                        kind: 'select',
                                        options: templates.map(t => ({ value: t.id, label: t.name })),
                                    }}
                                    value={input.templateId}
                                    onChange={v => patch({ templateId: String(v ?? '') })}
                                />
                            </section>

                            <section className="flex flex-col gap-2">
                                <h3 className="text-sm font-bold text-ink dark:text-white">Datos personales</h3>
                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                    <Field
                                        spec={{ key: 'fullName', label: 'Nombre completo *', kind: 'text' }}
                                        value={input.personalInfo.fullName}
                                        onChange={v => patchPersonal('fullName', String(v))}
                                        onBlur={() => touch('fullName')}
                                        error={errorFor('fullName', input.personalInfo.fullName)}
                                    />
                                    <Field
                                        spec={{ key: 'email', label: 'Correo *', kind: 'text' }}
                                        value={input.personalInfo.email}
                                        onChange={v => patchPersonal('email', String(v))}
                                        onBlur={() => touch('email')}
                                        error={errorFor('email', input.personalInfo.email)}
                                    />
                                    {PERSONAL_FIELDS.map(f => (
                                        <div key={f.key} className={f.wide ? 'sm:col-span-2' : undefined}>
                                            <Field
                                                spec={f}
                                                value={(input.personalInfo as unknown as Row)[f.key]}
                                                onChange={v => patchPersonal(f.key, v)}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </section>

                            <ListEditor
                                title="Experiencia" addLabel="Agregar experiencia"
                                fields={WORK_FIELDS}
                                rows={input.workExperiences as unknown as Row[]}
                                onChange={r => patch({ workExperiences: r as CvInput['workExperiences'] })}
                            />
                            <ListEditor
                                title="Educación" addLabel="Agregar estudio"
                                fields={EDUCATION_FIELDS}
                                rows={input.education as unknown as Row[]}
                                onChange={r => patch({ education: r as CvInput['education'] })}
                            />
                            <ListEditor
                                title="Habilidades" addLabel="Agregar habilidad"
                                fields={SKILL_FIELDS}
                                rows={input.skills as unknown as Row[]}
                                onChange={r => patch({ skills: r as CvInput['skills'] })}
                            />
                            <ListEditor
                                title="Idiomas" addLabel="Agregar idioma"
                                fields={LANGUAGE_FIELDS}
                                rows={input.languages as unknown as Row[]}
                                onChange={r => patch({ languages: r as CvInput['languages'] })}
                            />
                            <ListEditor
                                title="Certificaciones" addLabel="Agregar certificación"
                                fields={CERT_FIELDS}
                                rows={(input.certifications ?? []) as unknown as Row[]}
                                onChange={r => patch({ certifications: r as CvInput['certifications'] })}
                            />
                        </div>
                    )}
                </div>

                {Object.keys(fieldErrors).length > 0 && (
                    <ul className="rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300">
                        {Object.entries(fieldErrors).map(([field, msg]) => (
                            <li key={field}><strong>{field}:</strong> {msg}</li>
                        ))}
                    </ul>
                )}
                {error && <p className="text-sm text-rose-500">{error}</p>}

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                    {missing.length > 0 && (
                        <p className="text-xs text-muted sm:mr-auto">
                            Falta completar: <strong>{missing.join(', ')}</strong>
                        </p>
                    )}
                    <Button type="button" variant="secondary" size="sm" onClick={onClose}>Cancelar</Button>
                    <Button type="button" size="sm" disabled={!canSave} onClick={save}>
                        {saving ? 'Guardando…' : cv ? 'Guardar cambios' : 'Crear currículum'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
