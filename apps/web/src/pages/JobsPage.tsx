import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, Filter, Loader2, MapPin, Search } from 'lucide-react';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { ErrorMessage, LoadingSpinner } from '../components/ui/Feedback';
import { jobService } from '../services/otherServices';
import type { JobOffer } from '../types/models';

// Fase 1: primeras 3 ofertas visibles sin scroll; "Ver Todas las Ofertas" carga las siguientes hacia abajo
const PAGE_SIZE = 3;
const MAX_REQUIREMENTS = 3;

const modalityLabel: Record<JobOffer['modality'], string> = {
    'remote':  'Remoto',
    'on-site': 'Presencial',
    'hybrid':  'Híbrido',
};

//Círculo de compatibilidad
function MatchRing({ score }: { score: number }) {
    const size = 52;
    const stroke = 5;
    const radius = (size - stroke) / 2;
    const circumference = 2 * Math.PI * radius;
    const clamped = Math.max(0, Math.min(100, score));
    const offset = circumference * (1 - clamped / 100);

    return (
        <div className="flex flex-col items-center gap-0.5 shrink-0">
            <div className="relative" style={{ width: size, height: size }}>
                <svg width={size} height={size} className="-rotate-90">
                    <circle
                        cx={size / 2} cy={size / 2} r={radius}
                        fill="none" strokeWidth={stroke}
                        className="stroke-gray-200 dark:stroke-gray-700"
                    />
                    <circle
                        cx={size / 2} cy={size / 2} r={radius}
                        fill="none" strokeWidth={stroke} strokeLinecap="round"
                        stroke="#2F7FD4"
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                    />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-gray-900 dark:text-white">
                    {clamped}%
                </span>
            </div>
            <span className="text-[10px] text-gray-500 dark:text-gray-400">Compatibilidad</span>
        </div>
    );
}

// ── Fila de oferta ────────────────────────────────────────────────────────────
function JobRow({ job, onOpen }: { job: JobOffer; onOpen: () => void }) {
    const requirements = job.requirements.slice(0, MAX_REQUIREMENTS);

    return (
        <div
            onClick={onOpen}
            className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-3 sm:p-4 flex flex-col gap-3 md:flex-row md:items-center md:gap-5 hover:shadow-md hover:border-[#2F7FD4] dark:hover:border-[#2F7FD4] transition-all cursor-pointer"
        >
            {/* Parte superior (mobile) / izquierda (desktop): logo + datos + compatibilidad */}
            <div className="flex items-center gap-3 md:flex-1 md:min-w-0">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0 overflow-hidden">
                    {job.companyLogoUrl ? (
                        <img src={job.companyLogoUrl} alt={job.company} className="w-full h-full object-cover" />
                    ) : (
                        <Briefcase size={18} className="text-gray-400" />
                    )}
                </div>

                <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">{job.company}</h3>
                    <p className="text-xs text-gray-700 dark:text-gray-300 truncate">{job.title}</p>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
                        <div className="flex items-center gap-1 text-xs text-gray-400 min-w-0">
                            <MapPin size={12} className="shrink-0" />
                            <span className="truncate">{job.location}</span>
                        </div>
                        <Badge label={modalityLabel[job.modality]} variant="info" />
                    </div>
                </div>

                {job.matchScore !== undefined && <MatchRing score={job.matchScore} />}
            </div>

            {/* Parte inferior (mobile) / centro (desktop): requisitos */}
            <div className="md:w-64 lg:w-80 md:shrink-0 border-t border-gray-100 dark:border-gray-800 pt-3 md:border-t-0 md:pt-0">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Requisitos Principales
                </p>
                {requirements.length > 0 ? (
                    <ul className="list-disc pl-4 flex flex-col gap-0.5">
                        {requirements.map((req, i) => (
                            <li key={i} className="text-xs text-gray-700 dark:text-gray-300 line-clamp-1">
                                {req}
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-xs text-gray-400">Sin requisitos especificados</p>
                )}
            </div>

            <Button
                variant="secondary"
                size="sm"
                className="w-full md:w-auto md:shrink-0"
                onClick={e => { e.stopPropagation(); onOpen(); }}
            >
                Ver Detalles
            </Button>
        </div>
    );
}

// ── Página ────────────────────────────────────────────────────────────────────
export default function JobsPage() {
    const navigate = useNavigate();

    const [items, setItems] = useState<JobOffer[]>([]);
    const [page, setPage] = useState(1);
    const [totalRecords, setTotalRecords] = useState(0);

    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loadMoreError, setLoadMoreError] = useState<string | null>(null);

    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch] = useState('');
    const [reloadKey, setReloadKey] = useState(0); // sube al presionar "Reintentar"

    // Debounce del buscador para no pegarle a APIM en cada tecla
    useEffect(() => {
        const t = setTimeout(() => setSearch(searchInput.trim()), 400);
        return () => clearTimeout(t);
    }, [searchInput]);

    // Carga inicial y cada vez que cambia la búsqueda (vuelve a la página 1)
    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            setLoading(true);
            setError(null);
            setLoadMoreError(null);
            try {
                const res = await jobService.getAll({ page: 1, pageSize: PAGE_SIZE, search: search || undefined });
                if (cancelled) return;
                setItems(res.items);
                setPage(1);
                setTotalRecords(res.totalRecords);
            } catch (err) {
                if (!cancelled) {
                    setError(err instanceof Error ? err.message : 'No se pudieron cargar las ofertas');
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        load();

        return () => { cancelled = true; };
    }, [search, reloadKey]);

    // "Ver Todas las Ofertas": agrega la siguiente página hacia abajo
    const loadMore = async () => {
        const next = page + 1;
        setLoadingMore(true);
        setLoadMoreError(null);
        try {
            const res = await jobService.getAll({
                page: next,
                pageSize: PAGE_SIZE,
                search: search || undefined,
            });
            setItems(prev => [...prev, ...res.items]);
            setPage(next);
            setTotalRecords(res.totalRecords);
        } catch (err) {
            setLoadMoreError(err instanceof Error ? err.message : 'No se pudieron cargar más ofertas');
        } finally {
            setLoadingMore(false);
        }
    };

    const hasMore = items.length < totalRecords;

    return (
        <div className="flex flex-col gap-3 sm:gap-6">

            {/* ── Buscador (el embudo es solo visual en esta fase) ─────────────── */}
            <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                    type="text"
                    value={searchInput}
                    onChange={e => setSearchInput(e.target.value)}
                    placeholder="Buscar Ofertas, Empleos, Puestos ..."
                    className="w-full rounded-full border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 py-2 pl-9 pr-10 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-[#2F7FD4]"
                />
                <Filter
                    size={16}
                    aria-hidden="true"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                />
            </div>

            {/* ── Título ──────────────────────────────────────────────────────── */}
            <h1 className="text-lg font-bold text-gray-900 dark:text-white sm:text-2xl">
                Ofertas Laborales
            </h1>

            {/* ── Contenido ───────────────────────────────────────────────────── */}
            {loading ? (
                <LoadingSpinner />
            ) : error ? (
                <ErrorMessage message={error} onRetry={() => setReloadKey(k => k + 1)} />
            ) : items.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    No se encontraron ofertas{search ? ` para "${search}"` : ''}.
                </p>
            ) : (
                <div className="flex flex-col gap-3">
                    {items.map(job => (
                        <JobRow key={job.id} job={job} onOpen={() => navigate(`/jobs/${job.id}`)} />
                    ))}

                    {hasMore && (
                        <Button
                            variant="secondary"
                            className="w-full"
                            onClick={loadMore}
                            disabled={loadingMore}
                        >
                            {loadingMore && <Loader2 size={16} className="animate-spin" />}
                            Ver Todas las Ofertas
                        </Button>
                    )}

                    {loadMoreError && <ErrorMessage message={loadMoreError} onRetry={loadMore} />}
                </div>
            )}
        </div>
    );
}