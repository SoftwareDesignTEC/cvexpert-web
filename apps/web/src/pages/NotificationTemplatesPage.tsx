import { useCallback, useEffect, useRef, useState } from 'react';
import { Briefcase, FileText, GraduationCap, Kanban, Pencil } from 'lucide-react';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import { ErrorMessage, LoadingSpinner } from '../components/ui/Feedback';
import NotificationTemplateDialog from '../components/ui/NotificationTemplateDialog';
import PageHeader from '../components/ui/PageHeader';
import Toast from '../components/ui/Toast';
import { NOTIFICATION_LANGUAGES } from '../context/LanguageContext';
import { describeError } from '../services/http';
import { NOTIFICATION_TYPES, notificationService } from '../services/notificationService';
import type { NotificationTemplate, NotificationType } from '../types/models';

// Nombre, cuándo se envía y el mismo ícono que usa el aviso en la campana
const TYPE_INFO: Record<NotificationType, { label: string; description: string; icon: React.ReactNode }> = {
    'application.status_changed': {
        label: 'Cambio de estado de una postulación',
        description: 'Cuando una postulación pasa a otro estado del tablero.',
        icon: <Kanban size={16} />,
    },
    'cv.generated': {
        label: 'Currículum generado',
        description: 'Cuando termina de generarse un currículum.',
        icon: <FileText size={16} />,
    },
    'job.new': {
        label: 'Nueva oferta compatible',
        description: 'Cuando aparece una oferta compatible con el perfil.',
        icon: <Briefcase size={16} />,
    },
    'course.recommended': {
        label: 'Curso recomendado',
        description: 'Cuando se recomienda un curso para cubrir una brecha.',
        icon: <GraduationCap size={16} />,
    },
};

const languageLabel = (value: string) => NOTIFICATION_LANGUAGES.find(l => l.value === value)?.label ?? value;

const templateKey = (t: Pick<NotificationTemplate, 'type' | 'language'>) => `${t.type}/${t.language}`;

function formatUpdatedAt(epochMs: number): string {
    return new Date(epochMs).toLocaleString('es-CR', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function NotificationTemplatesPage() {
    const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [reloadKey, setReloadKey] = useState(0);
    const [editing, setEditing] = useState<NotificationTemplate | null>(null);
    const [toast, setToast] = useState<{ id: number; message: string } | null>(null);

    // Tras guardar se recarga en segundo plano: si eso falla, la lista que ya se ve
    // (con la plantilla que devolvió el PUT) es correcta y no se reemplaza por un error.
    const loadedOnce = useRef(false);

    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            try {
                const list = await notificationService.getTemplates();
                if (cancelled) return;
                setTemplates(list);
                setError(null);
                loadedOnce.current = true;
            } catch (err) {
                if (!cancelled && !loadedOnce.current) setError(describeError(err, 'cargar las plantillas de notificaciones'));
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        load();

        return () => { cancelled = true; };
    }, [reloadKey]);

    const retry = () => {
        setLoading(true);
        setError(null);
        setReloadKey(k => k + 1);
    };

    const handleSaved = (saved: NotificationTemplate) => {
        setTemplates(prev => prev.map(t => (templateKey(t) === templateKey(saved) ? saved : t)));
        setEditing(null);
        // El id distinto reinicia el temporizador si se guarda dos veces seguidas
        setToast(prev => ({ id: (prev?.id ?? 0) + 1, message: 'Plantilla guardada.' }));
        setReloadKey(k => k + 1);
    };

    const closeDialog = useCallback(() => setEditing(null), []);
    const dismissToast = useCallback(() => setToast(null), []);

    const byKey = new Map(templates.map(t => [templateKey(t), t]));

    return (
        <div className="flex flex-col gap-3 sm:gap-6">
            <PageHeader eyebrow="Administración" title="Plantillas de notificaciones" />

            <p className="text-sm text-body dark:text-gray-300 max-w-3xl">
                Título y cuerpo con que el servicio redacta cada aviso, por tipo y por idioma. El historial se redacta al
                consultarlo, así que un cambio también se ve en los avisos que ya existen. Estas plantillas no tienen
                relación con las plantillas de currículum.
            </p>

            {loading ? (
                <LoadingSpinner />
            ) : error ? (
                <ErrorMessage message={error} onRetry={retry} />
            ) : templates.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">El servicio no devolvió plantillas.</p>
            ) : (
                <div className="flex flex-col gap-4">
                    {NOTIFICATION_TYPES.map(type => {
                        const info = TYPE_INFO[type];
                        const items = NOTIFICATION_LANGUAGES
                            .map(l => byKey.get(templateKey({ type, language: l.value })))
                            .filter((t): t is NotificationTemplate => !!t);
                        if (items.length === 0) return null;

                        return (
                            <section
                                key={type}
                                aria-labelledby={`tpl-${type}`}
                                className="rounded-xl border border-line dark:border-gray-800 bg-surface dark:bg-gray-900 p-4 sm:p-5 flex flex-col gap-4"
                            >
                                <header className="flex items-start gap-3">
                                    <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-primary-tint text-primary dark:bg-primary/15">
                                        {info.icon}
                                    </span>
                                    <div className="min-w-0">
                                        <h2 id={`tpl-${type}`} className="text-base font-semibold text-ink dark:text-white">
                                            {info.label}
                                        </h2>
                                        <p className="text-xs text-muted">
                                            {info.description} <code className="font-mono">{type}</code>
                                        </p>
                                    </div>
                                </header>

                                <div className="grid gap-3 md:grid-cols-2">
                                    {items.map(t => {
                                        const isDefault = t.updatedAt === 0;
                                        return (
                                            <article
                                                key={t.language}
                                                className="rounded-lg border border-line dark:border-gray-800 p-3 flex flex-col gap-2 min-w-0"
                                            >
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className="text-sm font-medium text-ink dark:text-gray-100">
                                                        {languageLabel(t.language)}
                                                    </span>
                                                    <Button
                                                        variant="secondary"
                                                        size="sm"
                                                        onClick={() => setEditing(t)}
                                                        aria-label={`Editar plantilla: ${info.label}, ${languageLabel(t.language)}`}
                                                    >
                                                        <Pencil size={14} />
                                                        Editar
                                                    </Button>
                                                </div>

                                                <p className="text-sm font-semibold text-ink dark:text-white break-words">{t.title}</p>
                                                <p className="text-sm text-body dark:text-gray-300 whitespace-pre-line break-words">{t.body}</p>

                                                <div className="mt-auto pt-1">
                                                    {isDefault ? (
                                                        <Badge label="Texto por defecto" />
                                                    ) : (
                                                        <p className="text-xs text-muted">
                                                            Editada el {formatUpdatedAt(t.updatedAt)}
                                                            {t.updatedBy && <> por <span className="break-all">{t.updatedBy}</span></>}
                                                        </p>
                                                    )}
                                                </div>
                                            </article>
                                        );
                                    })}
                                </div>
                            </section>
                        );
                    })}
                </div>
            )}

            {editing && (
                <NotificationTemplateDialog
                    key={templateKey(editing)}
                    template={editing}
                    heading={`${TYPE_INFO[editing.type]?.label ?? editing.type} · ${languageLabel(editing.language)}`}
                    onClose={closeDialog}
                    onSaved={handleSaved}
                />
            )}

            {toast && (
                <Toast
                    key={toast.id}
                    message={toast.message}
                    onDismiss={dismissToast}
                    className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 max-w-[calc(100vw-2rem)]"
                />
            )}
        </div>
    );
}
