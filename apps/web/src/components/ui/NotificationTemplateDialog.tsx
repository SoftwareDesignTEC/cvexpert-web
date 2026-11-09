import { useRef, useState } from 'react';
import Button from './Button';
import Modal from './Modal';
import { TextArea } from './FormBits';
import { ApiError, describeError } from '../../services/http';
import { notificationService, TEMPLATE_PLACEHOLDERS } from '../../services/notificationService';
import type { NotificationTemplate } from '../../types/models';

type FieldName = 'title' | 'body';
type FieldErrors = Partial<Record<FieldName, string>>;

const FIELD_LABELS: Record<FieldName, string> = { title: 'título', body: 'cuerpo' };

interface NotificationTemplateDialogProps {
    template: NotificationTemplate;
    // Nombre legible del tipo y del idioma, p. ej. "Curso recomendado · Inglés"
    heading: string;
    onClose: () => void;
    // Recibe la plantilla tal como la guardó el servidor
    onSaved: (saved: NotificationTemplate) => void;
}

// Se monta con key por plantilla, así el formulario arranca con su texto sin un efecto
export default function NotificationTemplateDialog({ template, heading, onClose, onSaved }: NotificationTemplateDialogProps) {
    const [values, setValues] = useState<Record<FieldName, string>>({ title: template.title, body: template.body });
    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
    const [formError, setFormError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    // Campo donde se insertan los marcadores: el último que tuvo el foco
    const [target, setTarget] = useState<FieldName>('body');

    const titleRef = useRef<HTMLTextAreaElement>(null);
    const bodyRef = useRef<HTMLTextAreaElement>(null);

    const placeholders = TEMPLATE_PLACEHOLDERS[template.type] ?? [];

    const setField = (field: FieldName, value: string) => {
        setValues(prev => ({ ...prev, [field]: value }));
        setFieldErrors(prev => ({ ...prev, [field]: undefined }));
    };

    // Inserta el marcador donde está el cursor (o reemplaza la selección) del campo activo
    const insertPlaceholder = (name: string) => {
        const marker = `{{${name}}}`;
        const el = target === 'title' ? titleRef.current : bodyRef.current;
        const current = values[target];
        const start = el?.selectionStart ?? current.length;
        const end = el?.selectionEnd ?? current.length;

        setField(target, current.slice(0, start) + marker + current.slice(end));

        // Después de que React escriba el nuevo valor, el cursor queda detrás del marcador
        const caret = start + marker.length;
        requestAnimationFrame(() => {
            el?.focus();
            el?.setSelectionRange(caret, caret);
        });
    };

    const validate = (): FieldErrors => {
        const errors: FieldErrors = {};
        if (!values.title.trim()) errors.title = 'El título no puede quedar vacío.';
        if (!values.body.trim()) errors.body = 'El cuerpo no puede quedar vacío.';
        return errors;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError(null);

        const local = validate();
        if (local.title || local.body) {
            setFieldErrors(local);
            return;
        }

        setSaving(true);
        try {
            const saved = await notificationService.updateTemplate(template.type, template.language, {
                title: values.title,
                body: values.body,
            });
            onSaved(saved);
        } catch (err) {
            // 400 con detalle por campo: un marcador no permitido o un campo vacío.
            // El texto del servidor ya dice cuál falló y cuáles se permiten.
            if (err instanceof ApiError && err.status === 400 && err.errors) {
                const { title, body, ...rest } = err.errors;
                setFieldErrors({ title, body });
                // Un error que no es de un campo del formulario (p. ej. type o language)
                const others = Object.values(rest).join(' ');
                setFormError(others || (title || body ? null : describeError(err, 'guardar la plantilla')));
            } else {
                setFormError(describeError(err, 'guardar la plantilla'));
            }
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal
            open
            size="lg"
            title="Editar plantilla"
            description={heading}
            onClose={saving ? () => {} : onClose}
        >
            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
                <TextArea
                    label="Título"
                    rows={2}
                    value={values.title}
                    onChange={v => setField('title', v)}
                    onFocus={() => setTarget('title')}
                    textareaRef={titleRef}
                    error={fieldErrors.title}
                />
                <TextArea
                    label="Cuerpo"
                    rows={5}
                    value={values.body}
                    onChange={v => setField('body', v)}
                    onFocus={() => setTarget('body')}
                    textareaRef={bodyRef}
                    error={fieldErrors.body}
                />

                <div className="flex flex-col gap-2">
                    <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-medium text-body dark:text-gray-300">Marcadores permitidos</span>
                        <span className="text-xs text-muted">
                            Un clic lo inserta en el {FIELD_LABELS[target]}, donde está el cursor. Se reemplazan por los
                            datos del aviso; los estados y la modalidad se traducen al idioma de la plantilla y un dato
                            opcional sin valor queda vacío.
                        </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {placeholders.map(name => (
                            <button
                                key={name}
                                type="button"
                                // Sin esto el textarea pierde la selección antes del clic
                                onMouseDown={e => e.preventDefault()}
                                onClick={() => insertPlaceholder(name)}
                                aria-label={`Insertar {{${name}}} en el ${FIELD_LABELS[target]}`}
                                className="rounded-full border border-line dark:border-gray-700 bg-surface dark:bg-gray-800 px-3 py-1 font-mono text-xs text-body dark:text-gray-300 hover:border-primary hover:text-primary transition-colors"
                            >
                                {`{{${name}}}`}
                            </button>
                        ))}
                    </div>
                </div>

                {formError && (
                    <p role="alert" className="rounded-xl bg-rose-50 dark:bg-rose-950/30 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
                        {formError}
                    </p>
                )}

                <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                    <Button type="button" variant="secondary" size="sm" onClick={onClose} disabled={saving}>
                        Cancelar
                    </Button>
                    <Button type="submit" size="sm" loading={saving}>
                        Guardar plantilla
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
