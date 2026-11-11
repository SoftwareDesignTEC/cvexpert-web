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
import { formatLongDate } from '../components/cv/cvLabels';
import PageHeader from '../components/ui/PageHeader';
import { cvService } from '../services/cvService';
import { useAuth } from '../context/AuthContext';
import { describeError } from '../services/http';
import type { CV } from '../types/models';

// Cada página pide su tramo al APIM, no se acumulan hacia abajo
const PAGE_SIZE = 6;

// ── Card de CV (con acciones decorativas por ahora) ───────────────────────────
function CVListCard({ cv, layout, onView, onEdit, onDownload, onDelete }: {
    cv: CV; layout: unknown;
    onView: () => void; onEdit: () => void; onDownload: () => void; onDelete: () => void;
}) {

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
                <button
                    onClick={onDownload}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-deep px-2 py-2 text-xs font-medium text-white hover:opacity-90 transition-opacity"
                >
                    <Download size={13} />
                    Descargar
                </button>
                {/* Borrar va sin texto y aparte: es la única irreversible */}
                <button
                    onClick={onDelete}
                    title="Borrar currículum"
                    aria-label={`Borrar ${cv.title}`}
                    className="shrink-0 rounded-lg border border-line px-2.5 py-2 text-muted transition-colors hover:border-rose-400 hover:text-rose-500 dark:border-gray-700"
                >
                    <Trash2 size={13} />
                </button>
            </div>
        </div>
    );
}

// ── Página ────────────────────────────────────────────────────────────────────
export default function MyCVsPage() {
    const { profile } = useAuth();

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
    const templates = useTemplates();

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
                const res = await cvService.getAll({ page, pageSize: PAGE_SIZE, search: search || undefined });
                if (cancelled) return;
                setItems(res.items ?? []);
                setTotalRecords(res.totalRecords ?? 0);
            } catch (err) {
                if (!cancelled) {
                    setError(describeError(err, 'cargar tus currículums'));
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        load();

        return () => { cancelled = true; };
    }, [search, page, reloadKey]);


    const totalPages = Math.max(1, Math.ceil(totalRecords / PAGE_SIZE));

    return (
        <div className="flex flex-col gap-3 sm:gap-6">

            <PageHeader
                eyebrow="Tu espacio profesional"
                title="Mis Currículums"
                action={
                    <div className="relative w-full lg:w-80">
                        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                        <input
                            type="text"
                            value={searchInput}
                            onChange={e => setSearchInput(e.target.value)}
                            placeholder="Buscar currículum"
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
                <p className="text-sm text-gray-500 dark:text-gray-400">Aún no tienes currículums creados.</p>
            ) : (
                <div className="flex flex-col gap-3 sm:gap-4">
                    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
                        {items.map(cv => (
                            <CVListCard
                                key={cv.id}
                                cv={cv}
                                layout={layoutFor(templates, cv)}
                                onView={() => setViewingCv(cv)}
                                onEdit={() => setEditing({ cv })}
                                onDelete={() => setDeleting(cv)}
                                onDownload={() => {
                                    const problema = downloadCvPdf(
                                        cv as unknown as Record<string, unknown>,
                                        layoutFor(templates, cv),
                                        cv.title,
                                    );
                                    if (problema) setError(problema);
                                }}
                            />
                        ))}
                    </div>

                    <Pagination page={page} totalPages={totalPages} onChange={setPage} />
                </div>
            )}

            {/* Dibuja el CV con el layout de su plantilla; si no hay, muestra la miniatura */}
            <CvViewerDialog
                key={`cv-view-${viewingCv?.id ?? ''}`}
                cv={viewingCv}
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
