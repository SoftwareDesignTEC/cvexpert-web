import { useEffect, useState } from 'react';
import { Clock, Download, Eye, Pencil, Search, Trash2 } from 'lucide-react';
import Button from '../components/ui/Button';
import { ErrorMessage } from '../components/ui/Feedback';
import Pagination from '../components/ui/Pagination';
import CvViewerDialog from '../components/cv/CvViewerDialog';
import CvThumbnail from '../components/cv/CvThumbnail';
import { downloadCvPdf } from '../components/cv/cvPdf';
import { layoutFor, useTemplates } from '../hooks/useTemplates';
import CvEditorDialog from '../components/cv/CvEditorDialog';
import AiCvDialog from '../components/cv/AiCvDialog';
import DeleteCvDialog from '../components/cv/DeleteCvDialog';
import CvListSkeleton from '../components/cv/CvCardSkeleton';
import MoreMenu from '../components/ui/MoreMenu';
import { formatLongDate } from '../components/cv/cvLabels';
import PageHeader from '../components/ui/PageHeader';
import { cvService, porUltimaEdicion } from '../services/cvService';
import { useLocale } from '../i18n/LocaleContext';
import { useAuth } from '../context/AuthContext';
import { describeError } from '../services/http';
import type { CV } from '../types/models';

// Cada página pide su tramo al APIM, no se acumulan hacia abajo
const PAGE_SIZE = 6;

// Se traen todos y se pagina acá. Ordenar sólo la página que devolvió el
// servidor daría un orden falso: la primera página mostraría los más recientes
// de esos seis, no los más recientes de todos. Son pocos currículums por
// persona, así que traerlos enteros no cuesta nada.
const FETCH_PAGE_SIZE = 50;
const MAX_PAGES = 20;   // salvavidas contra bucles si el endpoint ignora la paginación

async function fetchAllCvs(search?: string): Promise<CV[]> {
    const all: CV[] = [];
    for (let page = 1; page <= MAX_PAGES; page++) {
        const res = await cvService.getAll({ page, pageSize: FETCH_PAGE_SIZE, search });
        all.push(...(res.items ?? []));
        if (!res.items?.length || all.length >= (res.totalRecords ?? 0)) break;
    }
    return all;
}

// ── Card de CV (con acciones decorativas por ahora) ───────────────────────────
function CVListCard({ cv, layout, loadingLayout, onView, onEdit, onDownload, onDelete }: {
    cv: CV; layout: unknown; loadingLayout: boolean;
    onView: () => void; onEdit: () => void; onDownload: () => void; onDelete: () => void;
}) {
    const { t } = useLocale();

    // updatedAt puede llegar como epoch ms o como texto; el ayudante cubre ambos
    const formattedDate = formatLongDate(cv.updatedAt) ?? '';

    return (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-2 sm:p-4 flex flex-col gap-2 sm:gap-3 min-w-0">
            {/* Vista previa */}
            <div className="w-full h-36 sm:h-48 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden flex flex-col items-center justify-center gap-1">
                <CvThumbnail
                    cv={cv as unknown as Record<string, unknown>}
                    layout={layout}
                    title={cv.title}
                    fallbackImageUrl={cv.thumbnailUrl}
                    loading={loadingLayout}
                />
            </div>

            {/* Título y fecha de última modificación */}
            <div className="flex flex-col gap-0.5 min-w-0">
                <h4 className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white truncate">
                    {cv.title}
                </h4>
                <div className="flex items-center gap-1 text-gray-400 min-w-0">
                    <Clock size={12} className="shrink-0" />
                    <span className="text-[10px] sm:text-xs truncate">{formattedDate}</span>
                </div>
            </div>

            <div className="flex flex-col gap-1.5 sm:flex-row">
                <button
                    onClick={onView}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-2 py-2 text-xs font-medium text-white hover:bg-primary-dark transition-colors"
                >
                    <Eye size={13} />
                    Ver
                </button>
                <button
                    onClick={onEdit}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-line px-2 py-2 text-xs font-medium text-body hover:border-primary hover:text-primary transition-colors dark:border-gray-700 dark:text-gray-300"
                >
                    <Pencil size={13} />
                    Editar
                </button>
                {/* Descargar y borrar pasan al menú: se usan menos que ver y
                    editar, y borrar no debería pesar igual que el resto. */}
                <MoreMenu
                    label={`Más acciones para ${cv.title}`}
                    items={[
                        { label: t.cvs.downloadPdf, icon: Download, onSelect: onDownload },
                        { label: t.cvs.deleteCv, icon: Trash2, onSelect: onDelete, danger: true },
                    ]}
                />
            </div>
        </div>
    );
}

// ── Página ────────────────────────────────────────────────────────────────────
export default function MyCVsPage() {
    const { profile } = useAuth();
    const { locale, t } = useLocale();

    const [items, setItems] = useState<CV[]>([]);
    const [page, setPage] = useState(1);
    const [totalRecords, setTotalRecords] = useState(0);

    const [loading, setLoading] = useState(true);

    const [error, setError] = useState<string | null>(null);

    const [reloadKey, setReloadKey] = useState(0); // sube al presionar "Reintentar"

    const [aiOpen, setAiOpen] = useState(false);
    const [viewingCv, setViewingCv] = useState<CV | null>(null);
    // null = cerrado; { cv: null } = crear uno nuevo
    const [editing, setEditing] = useState<{ cv: CV | null } | null>(null);
    const [deleting, setDeleting] = useState<CV | null>(null);

    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch] = useState('');

    // Alimenta el selector de plantilla, la vista previa y las miniaturas
    const { templates, loading: loadingTemplates } = useTemplates();

    useEffect(() => {
        const t = setTimeout(() => {
            setSearch(searchInput.trim());
            setPage(1);   // una búsqueda nueva empieza desde la primera página
        }, 400);
        return () => clearTimeout(t);
    }, [searchInput]);

    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            setLoading(true);
            setError(null);
            try {
                const todos = porUltimaEdicion(await fetchAllCvs(search || undefined));
                if (cancelled) return;
                setItems(todos);
                setTotalRecords(todos.length);
            } catch (err) {
                if (!cancelled) {
                    setError(describeError(err, t.cvs.loadError));
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        load();

        return () => { cancelled = true; };
        // `page` no está en las dependencias a propósito: cambiar de página
        // ya no vuelve a pedir nada, sólo corta la lista que ya está en memoria.
    }, [search, reloadKey]);


    const totalPages = Math.max(1, Math.ceil(totalRecords / PAGE_SIZE));
    // Si al borrar uno la última página queda vacía, hay que volver a una válida
    const currentPage = Math.min(page, totalPages);
    const visibles = items.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

    return (
        <div className="flex flex-col gap-3 sm:gap-6">

            <PageHeader
                eyebrow={t.cvs.eyebrow}
                title={t.cvs.title}
                action={
                    <div className="relative w-full lg:w-80">
                        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                        <input
                            type="text"
                            value={searchInput}
                            onChange={e => setSearchInput(e.target.value)}
                            placeholder={t.cvs.searchPlaceholder}
                            className="w-full rounded-full border border-line dark:border-gray-800 bg-surface dark:bg-gray-900 py-2.5 pl-11 pr-4 text-sm text-ink dark:text-white placeholder:text-muted shadow-sm focus:outline-none focus:border-primary"
                        />
                    </div>
                }
            />

            {/* Bloque de creación, en alto contraste como en el mockup */}
            <div className="rounded-2xl bg-gradient-to-r from-ink via-ink to-deep px-5 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                    <h2 className="text-base font-bold text-white sm:text-lg">Crear Nuevo Currículum</h2>
                    <p className="text-xs text-white/60 sm:text-sm">Elige cómo quieres comenzar tu próxima oportunidad.</p>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0">
                    <Button size="sm" onClick={() => setAiOpen(true)}>
                        Modo IA
                    </Button>
                    <button
                        onClick={() => setEditing({ cv: null })}
                        className="rounded-lg bg-white/10 px-3 py-1.5 text-sm font-medium text-white hover:bg-white/20 transition-colors"
                    >
                        Offline / Plantilla
                    </button>
                </div>
            </div>

            {/* ── Contenido ───────────────────────────────────────────────────── */}
            {loading ? (
                // Tantos esqueletos como entran en una página: así el alto no
                // cambia cuando llegan los currículums de verdad
                <CvListSkeleton count={PAGE_SIZE} />
            ) : error ? (
                <ErrorMessage message={error} onRetry={() => setReloadKey(k => k + 1)} />
            ) : items.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">{t.cvs.empty}</p>
            ) : (
                <div className="flex flex-col gap-3 sm:gap-4">
                    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
                        {visibles.map(cv => (
                            <CVListCard
                                key={cv.id}
                                cv={cv}
                                layout={layoutFor(templates, cv)}
                                loadingLayout={loadingTemplates}
                                onView={() => setViewingCv(cv)}
                                onEdit={() => setEditing({ cv })}
                                onDelete={() => setDeleting(cv)}
                                onDownload={async () => {
                                    const problema = await downloadCvPdf(
                                        cv as unknown as Record<string, unknown>,
                                        layoutFor(templates, cv),
                                        cv.title,
                                        locale,
                                    );
                                    if (problema) setError(problema);
                                }}
                            />
                        ))}
                    </div>

                    <Pagination page={currentPage} totalPages={totalPages} onChange={setPage} />
                </div>
            )}

            {/* Dibuja el CV con el layout de su plantilla; si no hay, muestra la miniatura */}
            <CvViewerDialog
                key={`cv-view-${viewingCv?.id ?? ''}`}
                cv={viewingCv}
                layout={viewingCv ? layoutFor(templates, viewingCv) : null}
                onClose={() => setViewingCv(null)}
            />
            {/* Se monta sólo al abrirse: cada apertura parte del CV actual */}
            {/* Genera el CV y lo abre en el editor para revisarlo */}
            {aiOpen && (
                <AiCvDialog
                    open
                    defaultFullName={profile?.name}
                    onClose={() => setAiOpen(false)}
                    onCreated={cv => { setAiOpen(false); setEditing({ cv }); setReloadKey(k => k + 1); }}
                />
            )}

            <DeleteCvDialog
                key={`cv-del-${deleting?.id ?? ''}`}
                cv={deleting}
                onClose={() => setDeleting(null)}
                onDeleted={id => {
                    setDeleting(null);
                    // Se saca de la lista y se recarga: la paginación y el
                    // total cambian al quedar un currículum menos.
                    setItems(prev => prev.filter(c => c.id !== id));
                    setReloadKey(k => k + 1);
                }}
            />

            {editing && (
                <CvEditorDialog
                    open
                    cv={editing.cv}
                    templates={templates}
                    defaultFullName={profile?.name}
                    defaultEmail={profile?.email}
                    onClose={() => setEditing(null)}
                    onSaved={() => { setEditing(null); setReloadKey(k => k + 1); }}
                />
            )}
        </div>
    );
}
