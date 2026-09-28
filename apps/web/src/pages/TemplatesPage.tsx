import { useEffect, useMemo, useState } from 'react';
import { FileText } from 'lucide-react';
import Button from '../components/ui/Button';
import { ErrorMessage, LoadingSpinner } from '../components/ui/Feedback';
import { templateService } from '../services/otherServices';
import type { CVTemplate } from '../types/models';


const OFFLINE_INITIAL = 8;
const OFFLINE_STEP = 8;
const STORE_INITIAL = 4;
const STORE_STEP = 4;

// APIM no filtra por availableOffline, así que se descargan todas las páginas
// y el reparto entre "Catálogo" y "Tienda" se hace en el frontend.
const FETCH_PAGE_SIZE = 50;
const MAX_PAGES = 20; // salvavidas contra bucles si el endpoint ignora la paginación

async function fetchAllTemplates(): Promise<CVTemplate[]> {
    const all: CVTemplate[] = [];
    for (let page = 1; page <= MAX_PAGES; page++) {
        const res = await templateService.getAll({ page, pageSize: FETCH_PAGE_SIZE });
        all.push(...res.items);
        if (res.items.length === 0 || all.length >= res.totalRecords) break;
    }
    return all;
}

// ── Card de plantilla ─────────────────────────────────────────────────────────
function TemplateCard({ template, actionLabel }: { template: CVTemplate; actionLabel: string }) {
    const [imgFailed, setImgFailed] = useState(false);

    return (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-1.5 sm:p-3 flex flex-col gap-1.5 sm:gap-2 min-w-0">
            {/* Vista previa */}
            <div className="aspect-[3/4] w-full rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden">
                {template.previewUrl && !imgFailed ? (
                    <img
                        src={template.previewUrl}
                        alt={`Vista previa de ${template.name}`}
                        className="w-full h-full object-cover"
                        onError={() => setImgFailed(true)}
                    />
                ) : (
                    <FileText size={24} className="text-gray-400" />
                )}
            </div>

            <h3 className="text-[11px] sm:text-sm font-semibold text-gray-900 dark:text-white line-clamp-1">
                {template.name}
            </h3>
            <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                {template.description}
            </p>

            {/* Sin funcionalidad por ahora (no hay editor ni descarga en esta fase) */}
            <Button
                variant="secondary"
                size="sm"
                disabled
                className="w-full text-[10px] leading-tight sm:text-xs"
            >
                {actionLabel}
            </Button>
        </div>
    );
}

// ── Sección con grid y botón de "ver más" ─────────────────────────────────────
interface TemplateSectionProps {
    title: string;
    main?: boolean;            // true = título principal de la página (h1)
    items: CVTemplate[];
    visibleCount: number;
    moreLabel: string;
    cardActionLabel: string;
    emptyText: string;
    onShowMore: () => void;
}

function TemplateSection({
                             title, main, items, visibleCount, moreLabel, cardActionLabel, emptyText, onShowMore,
                         }: TemplateSectionProps) {
    const visible = items.slice(0, visibleCount);
    const hasMore = visibleCount < items.length;
    const Heading = main ? 'h1' : 'h2';

    return (
        <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
                <Heading className="text-lg font-bold text-gray-900 dark:text-white sm:text-2xl">
                    {title}
                </Heading>
                {hasMore && (
                    <Button variant="secondary" size="sm" onClick={onShowMore} className="shrink-0">
                        {moreLabel}
                    </Button>
                )}
            </div>

            {visible.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">{emptyText}</p>
            ) : (
                <div className="grid grid-cols-3 gap-2 sm:gap-4 md:grid-cols-4">
                    {visible.map(t => (
                        <TemplateCard key={t.id} template={t} actionLabel={cardActionLabel} />
                    ))}
                </div>
            )}
        </section>
    );
}

// ── Página ────────────────────────────────────────────────────────────────────
export default function TemplatesPage() {
    const [templates, setTemplates] = useState<CVTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [reloadKey, setReloadKey] = useState(0); // sube al presionar "Reintentar"

    const [offlineVisible, setOfflineVisible] = useState(OFFLINE_INITIAL);
    const [storeVisible, setStoreVisible] = useState(STORE_INITIAL);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(null);

        fetchAllTemplates()
            .then(all => {
                if (!cancelled) setTemplates(all);
            })
            .catch(err => {
                if (cancelled) return;
                setError(err instanceof Error ? err.message : 'No se pudieron cargar las plantillas');
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => { cancelled = true; };
    }, [reloadKey]);

    // Catálogo sin conexión = plantillas que trae la app; Tienda = las descargables
    const offlineTemplates = useMemo(() => templates.filter(t => t.availableOffline), [templates]);
    const storeTemplates = useMemo(() => templates.filter(t => !t.availableOffline), [templates]);

    if (loading) return <LoadingSpinner />;
    if (error) return <ErrorMessage message={error} onRetry={() => setReloadKey(k => k + 1)} />;

    return (
        <div className="flex flex-col gap-6 sm:gap-8">
            <TemplateSection
                main
                title="Catálogo de Plantillas Sin Conexión"
                items={offlineTemplates}
                visibleCount={offlineVisible}
                moreLabel="Ver Todas"
                cardActionLabel="Usar esta plantilla"
                emptyText="No hay plantillas disponibles sin conexión."
                onShowMore={() => setOfflineVisible(v => v + OFFLINE_STEP)}
            />

            <TemplateSection
                title="Tienda de plantillas"
                items={storeTemplates}
                visibleCount={storeVisible}
                moreLabel="Ver Más"
                cardActionLabel="Descargar Plantilla"
                emptyText="No hay plantillas disponibles en la tienda."
                onShowMore={() => setStoreVisible(v => v + STORE_STEP)}
            />
        </div>
    );
}