import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Download, FileText, Pencil, Search } from 'lucide-react';
import Button from '../components/ui/Button';
import { ErrorMessage, LoadingSpinner } from '../components/ui/Feedback';
import Pagination from '../components/ui/Pagination';
import { DownloadTemplateDialog, TemplateViewerDialog } from '../components/ui/TemplateDialogs';
import PageHeader from '../components/ui/PageHeader';
import { cvService } from '../services/cvService';
import { describeError } from '../services/http';
import type { CV } from '../types/models';

// Cada página pide su tramo al APIM, no se acumulan hacia abajo
const PAGE_SIZE = 6;

// ── Card de CV (con acciones decorativas por ahora) ───────────────────────────
function CVListCard({ cv, onView, onDownload }: { cv: CV; onView: () => void; onDownload: () => void }) {
    const [imgFailed, setImgFailed] = useState(false);

    const formattedDate = new Date(cv.updatedAt).toLocaleDateString('es-CR', {
        day: '2-digit', month: 'short', year: 'numeric',
    });

    return (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-2 sm:p-4 flex flex-col gap-2 sm:gap-3 min-w-0">
            {/* Vista previa */}
            <div className="w-full h-36 sm:h-48 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden flex flex-col items-center justify-center gap-1">
                {cv.thumbnailUrl && !imgFailed ? (
                    <img
                        src={cv.thumbnailUrl}
                        alt={cv.title}
                        onError={() => setImgFailed(true)}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <>
                        <FileText size={32} className="text-gray-300 dark:text-gray-600" />
                        <span className="text-[10px] sm:text-xs text-gray-400">Vista Previa</span>
                    </>
                )}
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

            {/* Sin funcionalidad por ahora (no hay editor ni descarga en esta fase) */}
            <div className="flex flex-col gap-1.5 sm:flex-row">
                <button
                    onClick={onView}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-2 py-2 text-xs font-medium text-white hover:bg-primary-dark transition-colors"
                >
                    <Pencil size={13} />
                    Ver/Editar
                </button>
                <button
                    onClick={onDownload}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-deep px-2 py-2 text-xs font-medium text-white hover:opacity-90 transition-opacity"
                >
                    <Download size={13} />
                    Descargar
                </button>
            </div>
        </div>
    );
}

// ── Página ────────────────────────────────────────────────────────────────────
export default function MyCVsPage() {
    const navigate = useNavigate();

    const [items, setItems] = useState<CV[]>([]);
    const [page, setPage] = useState(1);
    const [totalRecords, setTotalRecords] = useState(0);

    const [loading, setLoading] = useState(true);

    const [error, setError] = useState<string | null>(null);

    const [reloadKey, setReloadKey] = useState(0); // sube al presionar "Reintentar"

    // Modo IA todavía no está implementado: al intentar usarlo solo se muestra un mensaje
    const [aiMode, setAiMode] = useState(false);
    const [viewingCv, setViewingCv] = useState<CV | null>(null);
    const [downloadCv, setDownloadCv] = useState<CV | null>(null);

    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch] = useState('');

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
                    <Button size="sm" onClick={() => setAiMode(v => !v)}>
                        Modo IA
                    </Button>
                    <button
                        onClick={() => navigate('/templates')}
                        className="rounded-lg bg-white/10 px-3 py-1.5 text-sm font-medium text-white hover:bg-white/20 transition-colors"
                    >
                        Offline / Plantilla
                    </button>
                </div>
            </div>

            {/* ── Contenido ───────────────────────────────────────────────────── */}
            {aiMode ? (
                <div className="flex items-center justify-center min-h-[50vh]">
                    <p className="text-sm text-gray-400 dark:text-gray-500">Nada que hacer por aquí</p>
                </div>
            ) : loading ? (
                <LoadingSpinner />
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
                                onView={() => setViewingCv(cv)}
                                onDownload={() => setDownloadCv(cv)}
                            />
                        ))}
                    </div>

                    <Pagination page={page} totalPages={totalPages} onChange={setPage} />
                </div>
            )}

            <TemplateViewerDialog
                key={`cv-view-${viewingCv?.id ?? ''}`}
                template={viewingCv && { id: viewingCv.id, name: viewingCv.title, imageUrl: viewingCv.thumbnailUrl }}
                onClose={() => setViewingCv(null)}
            />
            <DownloadTemplateDialog
                key={`cv-dl-${downloadCv?.id ?? ''}`}
                template={downloadCv && { id: downloadCv.id, name: downloadCv.title }}
                onClose={() => setDownloadCv(null)}
                title="¿Descargar este currículum?"
                notice="La descarga de currículums todavía no está implementada."
            />
        </div>
    );
}
