import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, FileText, Loader2 } from 'lucide-react';
import Button from '../components/ui/Button';
import { ErrorMessage, LoadingSpinner } from '../components/ui/Feedback';
import { cvService } from '../services/cvService';
import type { CV } from '../types/models';

// 6 CVs por página; "Ver Más" agrega la siguiente página hacia abajo
const PAGE_SIZE = 6;

// ── Card de CV (con acciones decorativas por ahora) ───────────────────────────
function CVListCard({ cv }: { cv: CV }) {
    const formattedDate = new Date(cv.updatedAt).toLocaleDateString('es-CR', {
        day: '2-digit', month: 'short', year: 'numeric',
    });

    return (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-2 sm:p-4 flex flex-col gap-2 sm:gap-3 min-w-0">
            {/* Vista previa */}
            <div className="w-full h-36 sm:h-48 bg-gray-100 dark:bg-gray-800 rounded-lg flex flex-col items-center justify-center gap-1">
                <FileText size={32} className="text-gray-300 dark:text-gray-600" />
                <span className="text-[10px] sm:text-xs text-gray-400">Vista Previa</span>
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
                <Button variant="secondary" size="sm" disabled className="w-full text-[10px] sm:text-xs">
                    Ver/Editar
                </Button>
                <Button variant="secondary" size="sm" disabled className="w-full text-[10px] sm:text-xs">
                    Descargar
                </Button>
            </div>
        </div>
    );
}

// ── Página ────────────────────────────────────────────────────────────────────
export default function CreateCVPage() {
    const navigate = useNavigate();

    const [items, setItems] = useState<CV[]>([]);
    const [page, setPage] = useState(1);
    const [totalRecords, setTotalRecords] = useState(0);

    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
    const [reloadKey, setReloadKey] = useState(0); // sube al presionar "Reintentar"

    // Modo IA todavía no está implementado: al intentar usarlo solo se muestra un mensaje
    const [aiMode, setAiMode] = useState(false);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(null);
        setLoadMoreError(null);

        cvService
            .getAll({ page: 1, pageSize: PAGE_SIZE })
            .then(res => {
                if (cancelled) return;
                setItems(res.items);
                setPage(1);
                setTotalRecords(res.totalRecords);
            })
            .catch(err => {
                if (cancelled) return;
                setError(err instanceof Error ? err.message : 'No se pudieron cargar los currículums');
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => { cancelled = true; };
    }, [reloadKey]);

    const loadMore = async () => {
        const next = page + 1;
        setLoadingMore(true);
        setLoadMoreError(null);
        try {
            const res = await cvService.getAll({ page: next, pageSize: PAGE_SIZE });
            setItems(prev => [...prev, ...res.items]);
            setPage(next);
            setTotalRecords(res.totalRecords);
        } catch (err) {
            setLoadMoreError(err instanceof Error ? err.message : 'No se pudieron cargar más currículums');
        } finally {
            setLoadingMore(false);
        }
    };

    const hasMore = items.length < totalRecords;

    return (
        <div className="flex flex-col gap-3 sm:gap-6">

            {/* ── Barra: título + modos ───────────────────────────────────────── */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h1 className="text-sm font-bold text-gray-900 dark:text-white sm:text-lg">
                    Crear Nuevo Currículum
                </h1>
                <div className="grid grid-cols-2 gap-2 sm:flex">
                    <Button size="sm" onClick={() => setAiMode(v => !v)}>
                        Modo IA
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => navigate('/templates')}>
                        Offline / Plantilla
                    </Button>
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
                            <CVListCard key={cv.id} cv={cv} />
                        ))}
                    </div>

                    {hasMore && (
                        <Button
                            variant="secondary"
                            className="w-full"
                            onClick={loadMore}
                            disabled={loadingMore}
                        >
                            {loadingMore && <Loader2 size={16} className="animate-spin" />}
                            Ver Más
                        </Button>
                    )}

                    {loadMoreError && <ErrorMessage message={loadMoreError} onRetry={loadMore} />}
                </div>
            )}
        </div>
    );
}