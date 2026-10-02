import { useEffect, useMemo, useState } from 'react';
import { FileText } from 'lucide-react';
import { ErrorMessage, LoadingSpinner } from '../components/ui/Feedback';
import PageHeader from '../components/ui/PageHeader';
import Button from '../components/ui/Button';
import GalleryDialog from '../components/ui/GalleryDialog';
import { DownloadTemplateDialog, TemplateViewerDialog } from '../components/ui/TemplateDialogs';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { templateService } from '../services/otherServices';
import type { CVTemplate } from '../types/models';

// Cuántas plantillas entran en cada página
// Cuántas se ven en la pantalla y cuántas entran por página en la ventana completa
const PREVIEW_COUNT = 4;
const PER_PAGE = 6;

// APIM no filtra por availableOffline, así que se descargan todas las páginas
// y el reparto entre "Catálogo" y "Tienda" se hace en el frontend.
const FETCH_PAGE_SIZE = 50;
const MAX_PAGES = 20; // salvavidas contra bucles si el endpoint ignora la paginación

async function fetchAllTemplates(): Promise<CVTemplate[]> {
    const all: CVTemplate[] = [];
    for (let page = 1; page <= MAX_PAGES; page++) {
        const res = await templateService.getAll({ page, pageSize: FETCH_PAGE_SIZE });
        all.push(...(res.items ?? []));
        if (!res.items?.length || all.length >= (res.totalRecords ?? 0)) break;
    }
    return all;
}

// ── Card de plantilla ─────────────────────────────────────────────────────────
function TemplateCard({
    template, actionLabel, onAction,
}: {
    template: CVTemplate;
    actionLabel: string;
    onAction: (t: CVTemplate) => void;
}) {
    const [imgFailed, setImgFailed] = useState(false);

    return (
        <div className="bg-surface dark:bg-gray-900 border border-line dark:border-gray-800 rounded-xl overflow-hidden flex min-w-0">
            {/* Vista previa: contain para que no se recorte el diseño de la plantilla */}
            <div className="relative w-24 sm:w-28 shrink-0 bg-primary-tint dark:bg-gray-800 flex items-center justify-center overflow-hidden">
                {template.previewUrl && !imgFailed ? (
                    <img
                        src={template.previewUrl}
                        alt={`Vista previa de ${template.name}`}
                        className="w-full h-full object-contain"
                        onError={() => setImgFailed(true)}
                    />
                ) : (
                    <FileText size={20} className="text-gray-400" />
                )}
                <span className="absolute bottom-1.5 left-1.5 rounded-md bg-surface/90 dark:bg-gray-900/90 px-1.5 py-0.5 text-[10px] font-medium text-body dark:text-gray-300 shadow-sm">
                    Vista previa
                </span>
            </div>

            <div className="flex flex-col gap-1 flex-1 min-w-0 p-3">
                <h3 className="text-sm font-bold text-ink dark:text-white line-clamp-1">
                    {template.name}
                </h3>
                <p className="text-[11px] text-muted dark:text-gray-400 line-clamp-2">
                    {template.description}
                </p>

                <button
                    onClick={() => onAction(template)}
                    className="w-full rounded-lg bg-primary px-2 py-2 text-[11px] font-semibold text-white mt-auto hover:bg-primary-dark transition-colors"
                >
                    {actionLabel}
                </button>
            </div>
        </div>
    );
}

// ── Sección con grid y botón de "ver más" ─────────────────────────────────────
interface TemplateSectionProps {
    title: string;
    subtitle?: string;
    main?: boolean;            // true = el encabezado lo pone PageHeader
    items: CVTemplate[];
    cardActionLabel: string;
    emptyText: string;
    onShowAll: () => void;
    onCardAction: (t: CVTemplate) => void;
}

function TemplateSection({
                             title, subtitle, main, items,
                             cardActionLabel, emptyText, onShowAll, onCardAction,
                         }: TemplateSectionProps) {
    const visible = items.slice(0, PREVIEW_COUNT);
    const hasMore = items.length > PREVIEW_COUNT;

    return (
        <section className="flex flex-col gap-4">
            {/* El título principal ya lo pone PageHeader; las demás secciones llevan
                el suyo con el acento azul, como en el mockup. */}
            {!main && (
                <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="w-1 h-5 rounded-full bg-primary shrink-0" />
                            <h2 className="text-lg font-bold text-ink dark:text-white">{title}</h2>
                        </div>
                        {subtitle && <p className="text-sm text-muted mt-1">{subtitle}</p>}
                    </div>

                </div>
            )}

            {visible.length === 0 ? (
                <p className="text-sm text-muted">{emptyText}</p>
            ) : (
                <div className="bg-surface dark:bg-gray-900 border border-line dark:border-gray-800 rounded-2xl shadow-sm p-4 flex flex-col gap-4">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 sm:gap-4">
                        {visible.map(t => (
                            <TemplateCard key={t.id} template={t} actionLabel={cardActionLabel} onAction={onCardAction} />
                        ))}
                    </div>
                    {hasMore && (
                        <div className="flex justify-center">
                            <Button variant="secondary" size="sm" onClick={onShowAll}>
                                Ver más
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </section>
    );
}

// ── Página ────────────────────────────────────────────────────────────────────
export default function TemplatesPage() {
    const isOnline = useOnlineStatus();
    const [templates, setTemplates] = useState<CVTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [reloadKey, setReloadKey] = useState(0); // sube al presionar "Reintentar"

    const [viewing, setViewing] = useState<CVTemplate | null>(null);
    const [downloading, setDownloading] = useState<CVTemplate | null>(null);

    const [galleryFor, setGalleryFor] = useState<'offline' | 'store' | null>(null);

    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            setLoading(true);
            setError(null);
            try {
                const all = await fetchAllTemplates();
                if (!cancelled) setTemplates(all);
            } catch (err) {
                if (!cancelled) {
                    setError(err instanceof Error ? err.message : 'No se pudieron cargar las plantillas');
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        load();

        return () => { cancelled = true; };
    }, [reloadKey]);

    // Catálogo sin conexión = plantillas que trae la app; Tienda = las descargables
    const offlineTemplates = useMemo(() => templates.filter(t => t.availableOffline), [templates]);
    const storeTemplates = useMemo(() => templates.filter(t => !t.availableOffline), [templates]);

    if (loading) return <LoadingSpinner />;
    if (error) return <ErrorMessage message={error} onRetry={() => setReloadKey(k => k + 1)} />;

    return (
        <div className="flex flex-col gap-6 sm:gap-8">
            <PageHeader
                eyebrow="Crea donde quieras"
                title="Plantillas sin conexión"
            />

            <TemplateSection
                main
                title="Plantillas sin conexión"
                items={offlineTemplates}
                cardActionLabel="Usar esta plantilla"
                emptyText="No hay plantillas disponibles sin conexión."
                onShowAll={() => setGalleryFor('offline')}
                onCardAction={setViewing}
            />

            {/* La tienda requiere conexión: desaparece si el usuario está offline */}
            {isOnline && (
                <TemplateSection
                    title="Tienda de plantillas"
                    subtitle="Explora diseños premium para destacar tu experiencia."
                    items={storeTemplates}
                    cardActionLabel="Descargar Plantilla"
                    emptyText="No hay plantillas disponibles en la tienda."
                    onShowAll={() => setGalleryFor('store')}
                    onCardAction={setDownloading}
                />
            )}

            {/* La `key` remonta el diálogo al cambiar de plantilla, así el estado
                interno (error de imagen, avisos) arranca limpio cada vez. */}
            <GalleryDialog
                open={galleryFor !== null}
                title={galleryFor === 'store' ? 'Tienda de plantillas' : 'Plantillas sin conexión'}
                description={`${(galleryFor === 'store' ? storeTemplates : offlineTemplates).length} plantillas`}
                items={galleryFor === 'store' ? storeTemplates : offlineTemplates}
                perPage={PER_PAGE}
                onClose={() => setGalleryFor(null)}
                keyOf={t => t.id}
                renderItem={t => (
                    <TemplateCard
                        template={t}
                        actionLabel={galleryFor === 'store' ? 'Descargar Plantilla' : 'Usar esta plantilla'}
                        onAction={template => {
                            setGalleryFor(null);
                            if (galleryFor === 'store') setDownloading(template);
                            else setViewing(template);
                        }}
                    />
                )}
            />

            <TemplateViewerDialog
                key={`view-${viewing?.id ?? ''}`}
                template={viewing && { id: viewing.id, name: viewing.name, description: viewing.description, imageUrl: viewing.previewUrl }}
                onClose={() => setViewing(null)}
            />
            <DownloadTemplateDialog
                key={`dl-${downloading?.id ?? ''}`}
                template={downloading && { id: downloading.id, name: downloading.name }}
                onClose={() => setDownloading(null)}
            />
        </div>
    );
}