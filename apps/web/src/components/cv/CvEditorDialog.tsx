import { useMemo, useState } from 'react';
import { AlertTriangle, Eye, Pencil } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import ListEditor, { Field } from './ListEditor';
import PhotoField from './PhotoField';
import { useCvSuggestions } from '../../hooks/useCvSuggestions';
import { aiService } from '../../services/aiService';
import { declaredData } from '../../types/cvLayout';
import type { ListSource } from '../../types/cvLayout';
import type { CvSuggestions } from '../../hooks/useCvSuggestions';
import type { FieldSpec, Row } from './ListEditor';
import CvDocument from './CvDocument';
import { ApiError, describeError } from '../../services/http';
import { dropEmptyRows, humanizeFieldErrors, isRequired, missingInRows } from './cvErrors';
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

// `required` sale de REQUIRED_BY_SOURCE para que la marca visible y el bloqueo
// del botón no se puedan desincronizar de lo que valida el servicio.
const marcar = (source: string, fields: FieldSpec[]): FieldSpec[] =>
    fields.map(f => ({ ...f, required: isRequired(source, f.key) }));

const WORK_FIELDS: FieldSpec[] = marcar('workExperiences', [
    { key: 'position', label: 'Puesto', kind: 'text' },
    // Sólo obligatoria en un empleo formal
    { key: 'company', label: 'Empresa', kind: 'text', requiredWhen: row => row.type === 'formal' },
    { key: 'startDate', label: 'Inicio', kind: 'date' },
    { key: 'endDate', label: 'Fin', kind: 'date' },
    { key: 'type', label: 'Tipo', kind: 'select', options: WORK_TYPES },
    { key: 'current', label: 'Sigo trabajando acá', kind: 'checkbox' },
    {
        key: 'description', label: 'Descripción', kind: 'textarea', wide: true,
        // Se le pasa el puesto y la empresa para que la redacción tenga de dónde agarrarse
        generate: (actual, row) => aiService.generateText({
            field: 'experienceDescription',
            context: [row.position, row.company, row.type, actual]
                .filter(Boolean).join(' · '),
            language: 'es',
        }),
    },
]);

const EDUCATION_FIELDS: FieldSpec[] = marcar('education', [
    { key: 'degree', label: 'Título', kind: 'text' },
    { key: 'institution', label: 'Institución', kind: 'text' },
    { key: 'field', label: 'Área', kind: 'text' },
    { key: 'startDate', label: 'Inicio', kind: 'date' },
    { key: 'endDate', label: 'Fin', kind: 'date' },
    { key: 'current', label: 'En curso', kind: 'checkbox' },
]);

// Separar técnicas de blandas es práctica estándar en un currículum: quien
// recluta busca unas u otras según el puesto. El contrato deja `category` como
// texto libre, así que acá se fija a estos dos valores para que la lista salga
// agrupada y no con categorías escritas de veinte formas distintas.
const SKILL_CATEGORIES = [
    { value: 'Técnica', label: 'Técnica (dura)' },
    { value: 'Blanda', label: 'Blanda' },
];

// Los más frecuentes en la región; el campo igual acepta cualquier otro
const COMMON_LANGUAGES = [
    'Español', 'Inglés', 'Portugués', 'Francés', 'Alemán', 'Italiano',
    'Mandarín', 'Japonés', 'Coreano', 'Árabe', 'Ruso', 'Lengua de señas costarricense',
] as const;

const SKILL_FIELDS: FieldSpec[] = marcar('skills', [
    { key: 'name', label: 'Habilidad', kind: 'text' },
    { key: 'category', label: 'Tipo', kind: 'select', options: SKILL_CATEGORIES },
    { key: 'level', label: 'Nivel', kind: 'select', options: SKILL_LEVELS },
]);

const languageFields = (usados: string[]): FieldSpec[] => marcar('languages', [
    {
        key: 'name',
        label: 'Idioma',
        kind: 'text',
        // Primero los que ya declaró, después la lista general
        suggestions: [...new Set([...usados, ...COMMON_LANGUAGES])],
    },
    { key: 'level', label: 'Nivel', kind: 'select', options: LANGUAGE_LEVELS },
]);

const CERT_FIELDS: FieldSpec[] = marcar('certifications', [
    { key: 'name', label: 'Certificación', kind: 'text' },
    { key: 'issuer', label: 'Emisor', kind: 'text' },
    { key: 'issuedAt', label: 'Emitida', kind: 'date' },
    { key: 'expiresAt', label: 'Vence', kind: 'date' },
    { key: 'credentialUrl', label: 'Enlace', kind: 'text', wide: true },
]);

// email no está acá: el servicio lo exige, así que se dibuja junto a fullName
const personalFields = (
    s: CvSuggestions,
    generarBio: (actual: string) => Promise<string>,
): FieldSpec[] => [
    { key: 'phone', label: 'Teléfono', kind: 'text', suggestions: s.phone },
    { key: 'address', label: 'Dirección', kind: 'text', suggestions: s.address },
    { key: 'birthDate', label: 'Fecha de nacimiento', kind: 'date' },
    { key: 'bio', label: 'Perfil profesional', kind: 'textarea', wide: true, generate: generarBio },
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

    // Lo que había al abrir, para saber si hay cambios sin guardar. Se congela
    // en el primer render: comparar contra el valor vivo daría siempre igual.
    const [original] = useState(() => JSON.stringify(
        cv ? toCvInput(cv) : emptyCvInput('', defaultFullName ?? '', defaultEmail ?? ''),
    ));
    const [confirmingClose, setConfirmingClose] = useState(false);
    // Sólo al crear: al editar los datos ya vienen en el currículum
    // Valores ya escritos en otros currículums, para ofrecerlos al tipear
    const suggestions = useCvSuggestions(cv === null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    // Ya traducidos a frases; nunca se muestran las rutas del contrato
    const [problems, setProblems] = useState<string[]>([]);

    const patch = (p: Partial<CvInput>) => setInput(prev => ({ ...prev, ...p }));

    // El perfil profesional resume el currículum, así que se le manda lo que
    // ya hay cargado: puestos, estudios y habilidades.
    const generarBio = (actual: string) => aiService.generateText({
        field: 'profileBio',
        context: [
            actual,
            ...input.workExperiences.map(e => [e.position, e.company].filter(Boolean).join(' en ')),
            ...input.education.map(e => [e.degree, e.institution].filter(Boolean).join(' en ')),
            ...input.skills.map(h => h.name),
        ].filter(Boolean).join(' · '),
        language: 'es',
    });

    const patchPersonal = (key: string, v: unknown) =>
        setInput(prev => ({ ...prev, personalInfo: { ...prev.personalInfo, [key]: v } }));

    const layout = useMemo(
        () => templates.find(t => t.id === input.templateId)?.layout ?? null,
        [templates, input.templateId],
    );

    // Qué pide realmente la plantilla elegida. Si no tiene diseño estructurado
    // se muestra todo, que es el comportamiento de siempre.
    const declared = useMemo(() => declaredData(layout), [layout]);
    const usa = (campo: string) => !declared || declared.personal.has(campo);
    const dibuja = (fuente: ListSource) => !declared || declared.sources.has(fuente);
    const plantilla = templates.find(t => t.id === input.templateId)?.name ?? 'esta plantilla';
    // El dato se guarda igual: al cambiar de plantilla vuelve a verse
    const ETIQUETA_PERSONAL: Record<string, string> = {
        phone: 'el teléfono', address: 'la dirección',
        birthDate: 'la fecha de nacimiento', bio: 'el perfil profesional',
    };
    const personalesIgnorados = Object.keys(ETIQUETA_PERSONAL)
        .filter(k => !usa(k))
        .map(k => ETIQUETA_PERSONAL[k]);

    const nota = (fuente: ListSource) =>
        dibuja(fuente) ? undefined : `${plantilla} no muestra esta sección, pero el dato se guarda.`;

    const hayCambios = JSON.stringify(input) !== original;

    // Cerrar con cambios sin guardar pierde todo lo escrito, así que se avisa.
    // Sin cambios se cierra directo: preguntar por nada molesta.
    const intentarCerrar = () => {
        if (hayCambios && !saving) setConfirmingClose(true);
        else onClose();
    };

    const save = async () => {
        setSaving(true);
        setError(null);
        setProblems([]);
        try {
            // Las cuatro listas van siempre, aunque queden vacías: omitirlas es 400.
            // Las filas en blanco sí se descartan: son filas que el usuario agregó
            // y no llegó a completar, no datos que el servicio deba rechazar.
            const body: CvInput = {
                ...input,
                title: input.title.trim(),
                personalInfo: {
                    ...input.personalInfo,
                    fullName: input.personalInfo.fullName.trim(),
                    email: input.personalInfo.email.trim(),
                },
                // `current` es obligatorio para el servicio aunque esté sin marcar:
                // pide el campo presente, no que sea true.
                workExperiences: dropEmptyRows(input.workExperiences ?? [])
                    .map(r => ({ ...r, current: r.current === true })),
                education: dropEmptyRows(input.education ?? [])
                    .map(r => ({ ...r, current: r.current === true })),
                skills: dropEmptyRows(input.skills ?? []),
                languages: dropEmptyRows(input.languages ?? []),
                ...(input.certifications
                    ? { certifications: dropEmptyRows(input.certifications) }
                    : {}),
            };
            const saved = cv
                ? await cvService.update(cv.id, body)
                : await cvService.create(body);
            onSaved(saved);
        } catch (err) {
            // Un 400 con detalle por campo se explica en palabras y sin el código:
            // el número no le dice nada a quien tiene que corregir el formulario.
            if (err instanceof ApiError && err.errors) {
                setProblems(humanizeFieldErrors(err.errors));
                setError('Revisá lo siguiente antes de volver a guardar:');
            } else {
                setError(describeError(err, cv ? 'guardar los cambios' : 'crear el currículum'));
            }
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

    // Una fila a medias también bloquea: antes pasaba el filtro de filas vacías
    // y la rechazaba el servicio. Es mejor no dejar intentarlo.
    const incompleteRows = [
        ...missingInRows('workExperiences', dropEmptyRows(input.workExperiences ?? [])),
        ...missingInRows('education', dropEmptyRows(input.education ?? [])),
        ...missingInRows('skills', dropEmptyRows(input.skills ?? [])),
        ...missingInRows('languages', dropEmptyRows(input.languages ?? [])),
        ...missingInRows('certifications', dropEmptyRows(input.certifications ?? [])),
    ];

    const canSave = missing.length === 0 && incompleteRows.length === 0 && !saving;

    // Un campo se marca en rojo sólo después de que el usuario pasó por él:
    // señalar errores en un formulario recién abierto es ruido, no ayuda.
    const [touched, setTouched] = useState<Record<string, boolean>>({});
    const touch = (key: string) => setTouched(t => ({ ...t, [key]: true }));
    const errorFor = (key: string, value: string) =>
        touched[key] && value.trim() === '' ? 'Este campo es obligatorio' : undefined;

    return (
        <>
        <Modal
            open={open}
            size="lg"
            title={cv ? 'Editar currículum' : 'Nuevo currículum'}
            description={cv ? undefined : 'Los datos los completás vos; no se copian del perfil automáticamente.'}
            onClose={intentarCerrar}
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
                                    spec={{ key: 'title', label: 'Título del currículum', kind: 'text', required: true }}
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
                                        required: true,
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
                                        spec={{
                                            key: 'fullName', label: 'Nombre completo', kind: 'text',
                                            required: true, suggestions: suggestions.fullName,
                                        }}
                                        value={input.personalInfo.fullName}
                                        onChange={v => patchPersonal('fullName', String(v))}
                                        onBlur={() => touch('fullName')}
                                        error={errorFor('fullName', input.personalInfo.fullName)}
                                    />
                                    <Field
                                        spec={{
                                            key: 'email', label: 'Correo', kind: 'text',
                                            required: true, suggestions: suggestions.email,
                                        }}
                                        value={input.personalInfo.email}
                                        onChange={v => patchPersonal('email', String(v))}
                                        onBlur={() => touch('email')}
                                        error={errorFor('email', input.personalInfo.email)}
                                    />
                                    {/* Harvard y otras van sin foto: no se pide
                                        lo que la plantilla no va a dibujar. */}
                                    {usa('photoUrl') && (
                                        <div className="sm:col-span-2">
                                            <PhotoField
                                                value={input.personalInfo.photoUrl}
                                                onChange={v => patchPersonal('photoUrl', v)}
                                            />
                                        </div>
                                    )}
                                    {personalesIgnorados.length > 0 && (
                                        <p className="text-[11px] text-muted sm:col-span-2">
                                            {plantilla} no muestra: {personalesIgnorados.join(', ')}.
                                            Se guardan igual.
                                        </p>
                                    )}
                                    {personalFields(suggestions, generarBio).map(f => (
                                        <div key={f.key} className={`min-w-0 ${f.wide ? 'sm:col-span-2' : ''}`}>
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
                                title="Experiencia" note={nota('workExperiences')} addLabel="Agregar experiencia"
                                fields={WORK_FIELDS}
                                rows={input.workExperiences as unknown as Row[]}
                                onChange={r => patch({ workExperiences: r as CvInput['workExperiences'] })}
                            />
                            <ListEditor
                                title="Educación" note={nota('education')} addLabel="Agregar estudio"
                                fields={EDUCATION_FIELDS}
                                rows={input.education as unknown as Row[]}
                                onChange={r => patch({ education: r as CvInput['education'] })}
                            />
                            <ListEditor
                                title="Habilidades" note={nota('skills')} addLabel="Agregar habilidad"
                                fields={SKILL_FIELDS}
                                rows={input.skills as unknown as Row[]}
                                onChange={r => patch({ skills: r as CvInput['skills'] })}
                            />
                            <ListEditor
                                title="Idiomas" note={nota('languages')} addLabel="Agregar idioma"
                                fields={languageFields(suggestions.languageNames)}
                                rows={input.languages as unknown as Row[]}
                                onChange={r => patch({ languages: r as CvInput['languages'] })}
                            />
                            <ListEditor
                                title="Certificaciones" note={nota('certifications')} addLabel="Agregar certificación"
                                fields={CERT_FIELDS}
                                rows={(input.certifications ?? []) as unknown as Row[]}
                                onChange={r => patch({ certifications: r as CvInput['certifications'] })}
                            />
                        </div>
                    )}
                </div>

                {error && (
                    <div className="flex flex-col gap-1.5 rounded-xl border border-rose-300 bg-rose-50 px-3 py-2.5 dark:border-rose-500/40 dark:bg-rose-500/10">
                        <p className="text-sm font-medium text-rose-700 dark:text-rose-300">{error}</p>
                        {problems.length > 0 && (
                            <ul className="list-disc pl-4 text-xs text-rose-700 dark:text-rose-300">
                                {problems.map(p => <li key={p}>{p}</li>)}
                            </ul>
                        )}
                    </div>
                )}

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                    {(missing.length > 0 || incompleteRows.length > 0) && (
                        <div className="flex flex-col gap-0.5 text-xs text-muted sm:mr-auto">
                            {missing.length > 0 && (
                                <p>Falta completar: <strong>{missing.join(', ')}</strong></p>
                            )}
                            {incompleteRows.map(r => <p key={r}>Falta completar en {r}.</p>)}
                        </div>
                    )}
                    <Button type="button" variant="secondary" size="sm" onClick={intentarCerrar}>Cancelar</Button>
                    <Button type="button" size="sm" disabled={!canSave} onClick={save}>
                        {saving ? 'Guardando…' : cv ? 'Guardar cambios' : 'Crear currículum'}
                    </Button>
                </div>
            </div>
        </Modal>

        {/* Va encima del editor: se dibuja después, así que queda por delante */}
        <Modal
            open={confirmingClose}
            title="¿Salir sin guardar?"
            onClose={() => setConfirmingClose(false)}
        >
            <div className="flex flex-col gap-4">
                <div className="flex gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2.5 dark:border-amber-500/40 dark:bg-amber-500/10">
                    <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
                    <p className="text-xs text-amber-900 dark:text-amber-200">
                        Tenés cambios sin guardar. Si salís ahora se pierden.
                    </p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                    <Button type="button" variant="secondary" size="sm" onClick={() => setConfirmingClose(false)}>
                        Seguir editando
                    </Button>
                    <Button type="button" variant="danger" size="sm" onClick={() => { setConfirmingClose(false); onClose(); }}>
                        Salir y perder los cambios
                    </Button>
                </div>
            </div>
        </Modal>
        </>
    );
}
