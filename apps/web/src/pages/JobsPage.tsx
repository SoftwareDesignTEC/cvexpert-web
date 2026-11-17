import { formatMessage } from '../i18n/formatMessage';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Filter, MapPin, Search } from 'lucide-react';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { CompanyLogo } from '../components/ui/Avatar';
import { ErrorMessage, LoadingSpinner } from '../components/ui/Feedback';
import PageHeader from '../components/ui/PageHeader';
import Modal from '../components/ui/Modal';
import { ChipGroup } from '../components/ui/FormBits';
import JobDetailDialog from '../components/ui/JobDetailDialog';
import Pagination from '../components/ui/Pagination';
import { loadCompleteJobCatalog } from '../services/jobCatalogService';
import { JOBS_PER_PAGE, matchesJobSearch } from '../services/jobSearch';
import { jobErrorMessage } from '../i18n/jobErrorMessage';
import { hayPreferencias, leerPreferencias, ordenarPorPreferencias } from '../services/jobRanking';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../i18n/LocaleContext';
import type { JobOffer } from '../types/models';

// Los filtros y el orden por preferencias necesitan un catálogo completo verificable.
// Se carga una vez; escribir una búsqueda nunca vuelve a descargarlo.
const PER_PAGE = JOBS_PER_PAGE;
const MAX_REQUIREMENTS = 3;

// Filtros sobre el catálogo completo, sin depender de filtros publicados en APIM.
const QUICK_FILTERS = [
    { id: 'recommended', key: 'quickRecommended' },
    { id: 'remote',      key: 'quickRemote' },
    { id: 'hybrid',      key: 'quickHybrid' },
    { id: 'recent',      key: 'quickRecent' },
] as const;

type QuickFilter = typeof QUICK_FILTERS[number]['id'];

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;




//Círculo de compatibilidad
function MatchRing({ score }: { score: number }) {
    const { t } = useLocale();
    const size = 64;
    const stroke = 6;
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
                        className="stroke-primary"
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                    />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-ink dark:text-white">
                    {clamped}%
                </span>
            </div>
            <span className="text-[10px] text-muted">{t.jobs.match}</span>
        </div>
    );
}

// ── Fila de oferta ────────────────────────────────────────────────────────────
function JobRow({ job, onOpen }: { job: JobOffer; onOpen: () => void }) {
    const { t } = useLocale();
    // `requirements` puede faltar en la respuesta; sin esto la pantalla entera falla
    const requirements = (job.requirements ?? []).slice(0, MAX_REQUIREMENTS);

    return (
        <div
            onClick={onOpen}
            className="bg-surface dark:bg-gray-900 border border-line dark:border-gray-800 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col gap-3 md:flex-row md:items-center md:gap-5 hover:shadow-md hover:border-primary transition-all cursor-pointer"
        >
            {/* Parte superior (mobile) / izquierda (desktop): logo + datos + compatibilidad */}
            <div className="flex items-center gap-3 md:flex-1 md:min-w-0">
                <CompanyLogo
                    src={job.companyLogoUrl}
                    name={job.company}
                    className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-primary-tint text-primary text-sm dark:bg-gray-800"
                />

                <div className="flex-1 min-w-0">
                    <h3 className="text-base font-bold text-ink dark:text-white truncate sm:text-lg">{job.title}</h3>
                    <p className="text-sm text-body dark:text-gray-300 truncate">{job.company}</p>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
                        <div className="flex items-center gap-1 text-xs text-muted min-w-0">
                            <MapPin size={12} className="shrink-0" />
                            <span className="truncate">{job.location}</span>
                        </div>
                        <Badge label={t.modality[job.modality]} variant="info" />
                    </div>
                </div>

                {job.matchScore !== undefined && <MatchRing score={job.matchScore} />}
            </div>

            {/* Parte inferior (mobile) / centro (desktop): requisitos */}
            <div className="md:w-64 lg:w-80 md:shrink-0 border-t border-gray-100 dark:border-gray-800 pt-3 md:border-t-0 md:pt-0">
                <p className="text-xs font-semibold text-ink dark:text-gray-200 mb-1">
                    {t.jobs.mainRequirements}
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
                    <p className="text-xs text-gray-400">{t.jobs.noRequirements}</p>
                )}
            </div>

            <Button
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
    const { profile } = useAuth();
    const { t } = useLocale();
    const navigate = useNavigate();

    const [items, setItems] = useState<JobOffer[]>([]);
    const [page, setPage] = useState(1);
    const topRef = useRef<HTMLDivElement>(null);

    const goToPage = (next: number) => {
        setPage(next);
        requestAnimationFrame(() => { topRef.current?.focus({ preventScroll: true }); topRef.current?.scrollIntoView({ block: 'start' }); });
    };

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<unknown>(null);

    const [detailJob, setDetailJob] = useState<JobOffer | null>(null);
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [modalities, setModalities] = useState<JobOffer['modality'][]>([]);
    const [minMatch, setMinMatch] = useState(0);

    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch] = useState('');
    const [quickFilter, setQuickFilter] = useState<QuickFilter>('recommended');
    // Se fija al montar: leer el reloj dentro del useMemo lo volveria impuro
    const [recentCutoff] = useState(() => Date.now() - SEVEN_DAYS_MS);
    const [reloadKey, setReloadKey] = useState(0); // sube al presionar "Reintentar"

    // Debounce de la búsqueda local; no solicita datos por cada tecla.
    useEffect(() => {
        const t = setTimeout(() => { setSearch(searchInput.trim()); setPage(1); }, 350);
        return () => clearTimeout(t);
    }, [searchInput]);

    // Se verifica el catálogo completo antes de aplicar filtros y preferencias globales.
    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            setLoading(true);
            setError(null);
            try {
                const all = await loadCompleteJobCatalog(undefined, () => !cancelled);
                if (cancelled) return;
                setItems(all);
                setPage(1);
            } catch (err) {
                if (!cancelled) {
                    setError(err);
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        load();

        return () => { cancelled = true; };
    }, [reloadKey]);

    const toggle = <T,>(list: T[], value: T) =>
        list.includes(value) ? list.filter(v => v !== value) : [...list, value];

    const prefs = useMemo(() => leerPreferencias(profile), [profile]);
    const ordenadoPorPrefs = quickFilter === 'recommended' && hayPreferencias(prefs);

    const activeFilters = modalities.length + (minMatch > 0 ? 1 : 0);

    const clearFilters = () => { setModalities([]); setMinMatch(0); setPage(1); };

    // Primero el panel de filtros, después el chip, y al final el orden
    const filtered = useMemo(() => {
        let list = items.filter(job => matchesJobSearch(job, search));

        if (modalities.length) list = list.filter(j => modalities.includes(j.modality));
        if (minMatch > 0)      list = list.filter(j => (j.matchScore ?? 0) >= minMatch);

        switch (quickFilter) {
            case 'remote':
                return list.filter(j => j.modality === 'remote');
            case 'hybrid':
                return list.filter(j => j.modality === 'hybrid');
            case 'recent':
                return list.filter(j => new Date(j.postedAt).getTime() >= recentCutoff);
            default:
                // "Recomendadas": primero las que coinciden con lo que el
                // usuario dijo que busca, y dentro de cada grupo las de mayor
                // compatibilidad. Sin preferencias elegidas queda el orden por
                // compatibilidad de siempre.
                return ordenarPorPreferencias(list, prefs);
        }
    }, [items, search, quickFilter, recentCutoff, modalities, minMatch, prefs]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
    // Si los filtros reducen la lista, la página actual puede quedar fuera de rango
    const currentPage = Math.min(page, totalPages);
    const visibleItems = filtered.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);

    return (
        <div className="flex flex-col gap-3 sm:gap-6">

            <PageHeader
                eyebrow={t.jobs.eyebrow}
                title={t.jobs.title}
                action={
                    filtered.length > 0 ? (
                        <span className="inline-block rounded-full bg-primary-soft px-3 py-1.5 text-xs font-semibold text-primary-dark dark:bg-primary/15 dark:text-primary">
                            {filtered.length} {filtered.length === 1 ? t.jobs.foundSingular : t.jobs.foundPlural}
                        </span>
                    ) : undefined
                }
            />

            {/* ── Buscador (el embudo es solo visual en esta fase) ─────────────── */}
            <div className="flex items-center gap-2 sm:gap-3">
                <div className="relative flex-1 min-w-0">
                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                    <input
                        type="text"
                        value={searchInput}
                        onChange={e => setSearchInput(e.target.value)}
                        aria-label={t.offerPicker.searchPlaceholder} placeholder={t.offerPicker.searchPlaceholder}
                        className="w-full rounded-full border border-line dark:border-gray-800 bg-surface dark:bg-gray-900 py-3 pl-12 pr-4 text-sm text-ink dark:text-white placeholder:text-muted shadow-sm focus:outline-none focus:border-primary"
                    />
                </div>
                <button
                    onClick={() => setFiltersOpen(true)}
                    className={`inline-flex items-center gap-2 rounded-full border bg-surface dark:bg-gray-900 px-4 py-3 text-sm font-medium shadow-sm shrink-0 transition-colors
                        ${activeFilters > 0
                        ? 'border-primary text-primary'
                        : 'border-line dark:border-gray-800 text-body dark:text-gray-300 hover:border-primary'
                    }`}
                >
                    <Filter size={16} aria-hidden="true" />
                    <span className="hidden sm:inline">{t.jobs.filters}</span>
                    {activeFilters > 0 && (
                        <span className="rounded-full bg-primary px-1.5 text-xs font-bold text-white">
                            {activeFilters}
                        </span>
                    )}
                </button>
            </div>

            {/* ── Accesos rápidos ─────────────────────────────────────────────── */}
            <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {QUICK_FILTERS.map(f => (
                    <button
                        key={f.id}
                        onClick={() => { setQuickFilter(f.id); setPage(1); }}
                        className={`shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors
                            ${quickFilter === f.id
                            ? 'bg-primary text-white border-primary'
                            : 'bg-surface dark:bg-gray-900 text-body dark:text-gray-300 border-line dark:border-gray-800 hover:border-primary hover:text-primary'
                        }`}
                    >
                        {t.jobs[f.key]}
                    </button>
                ))}
            </div>

            {/* Se dice por qué están en ese orden. Sin esto, "Recomendadas" no
                explica nada y el usuario no tiene motivo para ir a elegir sus
                preferencias, que es lo que mejora la lista. */}
            {quickFilter === 'recommended' && !loading && !error && filtered.length > 0 && (
                <p className="-mt-1 text-xs text-muted">
                    {ordenadoPorPrefs
                        ? t.jobs.orderedByPrefs
                        : t.jobs.noPrefsYet}{' '}
                    <button
                        type="button"
                        onClick={() => navigate('/profile')}
                        className="font-medium text-primary underline-offset-2 hover:underline"
                    >
                        {ordenadoPorPrefs ? t.jobs.changePrefs : t.jobs.choosePrefs}
                    </button>
                </p>
            )}

            {/* ── Contenido ───────────────────────────────────────────────────── */}
            <div ref={topRef} tabIndex={-1} className="scroll-mt-4">
            {loading ? (
                <LoadingSpinner />
            ) : error ? (
                <ErrorMessage message={jobErrorMessage(error, t, t.ux.loadOffers)} onRetry={() => setReloadKey(k => k + 1)} />
            ) : filtered.length === 0 ? (
                <div className="flex flex-col items-start gap-3">
                    <p className="text-sm text-muted">
                        {t.jobs.noneFound}{search ? ` "${search}"` : ''}
                        {activeFilters > 0 || quickFilter !== 'recommended' ? t.jobs.withFilters : ''}.
                    </p>
                    {activeFilters > 0 && (
                        <Button variant="secondary" size="sm" onClick={clearFilters}>
                            {t.ux.removeFilters}
                        </Button>
                    )}
                </div>
            ) : (
                <div className="flex flex-col gap-3">
                    {visibleItems.map(job => (
                        <JobRow key={job.id} job={job} onOpen={() => setDetailJob(job)} />
                    ))}

                    <p className="text-xs text-muted" role="status">{formatMessage(t.ux.pageOf, { page: currentPage, total: totalPages })} · {t.ux.fullCatalog}</p>
                    <Pagination page={currentPage} totalPages={totalPages} onChange={goToPage} />
                </div>
            )}

            </div>
            <JobDetailDialog job={detailJob} onClose={() => setDetailJob(null)} />

            {/* Panel de filtros */}
            <Modal
                open={filtersOpen}
                title={t.jobs.filterTitle}
                description={t.ux.filtersHint}
                onClose={() => setFiltersOpen(false)}
            >
                <div className="flex flex-col gap-5">
                    <ChipGroup
                        label={t.jobs.modalityLabel}
                        options={(['remote', 'on-site', 'hybrid'] as const)
                            .map(v => ({ value: v, label: t.modality[v] }))}
                        selected={modalities}
                        onToggle={v => { setModalities(prev => toggle(prev, v)); setPage(1); }}
                    />

                    <div className="flex flex-col gap-2">
                        <div className="flex items-baseline justify-between gap-2">
                            <label htmlFor="min-match" className="text-xs font-medium text-body dark:text-gray-300">
                                {t.jobs.minMatch}
                            </label>
                            <span className="text-sm font-bold text-primary">
                                {minMatch === 0 ? t.ux.anyMatch : `${minMatch}%`}
                            </span>
                        </div>
                        <input
                            id="min-match"
                            type="range"
                            min={0}
                            max={100}
                            step={5}
                            value={minMatch}
                            onChange={e => { setMinMatch(Number(e.target.value)); setPage(1); }}
                            className="w-full accent-[var(--color-primary)]"
                        />
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
                        <Button variant="secondary" size="sm" onClick={clearFilters} disabled={activeFilters === 0}>
                            {t.ux.removeFilters}
                        </Button>
                        <Button size="sm" onClick={() => setFiltersOpen(false)}>
                            {formatMessage(t.ux.viewOffers, { count: filtered.length })}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}