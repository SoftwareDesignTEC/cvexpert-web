import { useEffect, useState } from 'react';
import { Eye, FileText, Pencil, X } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';

// Lo mínimo que necesitan estos diálogos, sirva para una plantilla o un currículum
export interface PreviewItem {
    id: string;
    name: string;
    description?: string;
    imageUrl?: string;
}

// Aviso flotante que se desvanece solo. Se puede cerrar antes con la equis.
const VISIBLE_MS = 1700;   // tiempo en pantalla antes de empezar a desaparecer
const FADE_MS = 300;       // duración del desvanecido

function Toast({ message, onDismiss }: { message: string; onDismiss: () => void }) {
    const [leaving, setLeaving] = useState(false);

    useEffect(() => {
        const fade = setTimeout(() => setLeaving(true), VISIBLE_MS);
        const remove = setTimeout(onDismiss, VISIBLE_MS + FADE_MS);
        return () => { clearTimeout(fade); clearTimeout(remove); };
    }, [onDismiss]);

    return (
        <div
            role="status"
            className={`absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 rounded-xl bg-ink px-4 py-2.5 shadow-lg transition-opacity
                ${leaving ? 'opacity-0' : 'opacity-100'}`}
            style={{ transitionDuration: `${FADE_MS}ms` }}
        >
            <span className="text-sm text-white">{message}</span>
            <button
                onClick={onDismiss}
                aria-label="Cerrar aviso"
                className="shrink-0 text-white/60 hover:text-white transition-colors"
            >
                <X size={15} />
            </button>
        </div>
    );
}

// ── Vista previa de la plantilla ──────────────────────────────────────────────
export function TemplateViewerDialog({
    template, onClose,
}: {
    template: PreviewItem | null;
    onClose: () => void;
}) {
    const [imgFailed, setImgFailed] = useState(false);
    const [toast, setToast] = useState<string | null>(null);

    return (
        <Modal
            open={template !== null}
            size="lg"
            title={template?.name ?? ''}
            description={template?.description}
            onClose={onClose}
        >
            <div className="relative flex flex-col gap-4">
                {/* Queda explícito que sólo se está viendo, no editando */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary-dark dark:bg-primary/15 dark:text-primary">
                        <Eye size={13} />
                        Modo vista
                    </span>
                    <Button size="sm" onClick={() => setToast('Modo edición aún no implementado.')}>
                        <Pencil size={14} />
                        Cambiar a modo edición
                    </Button>
                </div>

                <div className="rounded-xl bg-canvas dark:bg-gray-800 p-3 flex items-center justify-center min-h-[20rem]">
                    {template?.imageUrl && !imgFailed ? (
                        <img
                            src={template.imageUrl}
                            alt={`Vista previa de ${template.name}`}
                            onError={() => setImgFailed(true)}
                            className="max-h-[70vh] w-auto max-w-full rounded-lg object-contain shadow-md"
                        />
                    ) : (
                        <div className="flex flex-col items-center gap-2 py-10 text-muted">
                            <FileText size={32} />
                            <p className="text-sm">No se pudo cargar la vista previa.</p>
                        </div>
                    )}
                </div>

                {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
            </div>
        </Modal>
    );
}

// ── Confirmación de descarga ──────────────────────────────────────────────────
export function DownloadTemplateDialog({
    template, onClose, title = '¿Descargar esta plantilla?', notice = 'La descarga de plantillas todavía no está implementada.',
}: {
    template: PreviewItem | null;
    onClose: () => void;
    title?: string;
    notice?: string;
}) {
    const [answered, setAnswered] = useState(false);

    const close = () => {
        setAnswered(false);
        onClose();
    };

    return (
        <Modal
            open={template !== null}
            title={title}
            description={template?.name}
            onClose={close}
        >
            <div className="flex flex-col gap-4">
                {answered ? (
                    // Cualquiera de las dos respuestas termina igual: todavía no se puede
                    <>
                        <p className="rounded-xl bg-primary-tint dark:bg-primary/10 px-4 py-3 text-sm text-body dark:text-gray-300">
                            {notice}
                        </p>
                        <div className="flex justify-end">
                            <Button size="sm" onClick={close}>Entendido</Button>
                        </div>
                    </>
                ) : (
                    <>
                        <p className="text-sm text-body dark:text-gray-300">
                            Se guardará una copia de <span className="font-semibold">{template?.name}</span> en tu dispositivo.
                        </p>
                        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                            <Button variant="secondary" size="sm" onClick={() => setAnswered(true)}>No</Button>
                            <Button size="sm" onClick={() => setAnswered(true)}>Sí, descargar</Button>
                        </div>
                    </>
                )}
            </div>
        </Modal>
    );
}
