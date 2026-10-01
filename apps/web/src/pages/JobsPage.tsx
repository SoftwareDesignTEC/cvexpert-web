import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Filter, MapPin, Search } from 'lucide-react';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { CompanyLogo } from '../components/ui/Avatar';
import { ErrorMessage, LoadingSpinner } from '../components/ui/Feedback';
import PageHeader from '../components/ui/PageHeader';
import Modal from '../components/ui/Modal';
import { ChipGroup } from '../components/ui/FormBits';
import { jobService } from '../services/otherServices';
import type { JobOffer } from '../types/models';

// El APIM todavía no filtra, así que se descarga el catálogo completo una vez y
// los filtros trabajan sobre todas las ofertas, no sólo sobre las que están a la vista.
const FETCH_PAGE_SIZE = 50;
const MAX_PAGES = 20;   // salvavidas contra bucles si el endpoint ignora la paginación
const INITIAL_VISIBLE = 3;
const STEP = 6;
const MAX_REQUIREMENTS = 3;

// Accesos rapidos del mockup. Filtran sobre las ofertas ya cargadas: el mock de APIM
// todavia no acepta filtros, asi que hacerlo aqui es lo unico que da un resultado real.
const QUICK_FILTERS = [
    { id: 'recommended', label: 'Recomendadas' },
    { id: 'remote',      label: 'Remoto' },
    { id: 'hybrid',      label: 'Híbrido' },
    { id: 'recent',      label: 'Últimos 7 días' },
] as const;

type QuickFilter = typeof QUICK_FILTERS[number]['id'];

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

const MODALITY_OPTIONS: { value: JobOffer['modality']; label: string }[] = [
    { value: 'remote',  label: 'Remoto' },
    { value: 'on-site', label: 'Presencial' },
    { value: 'hybrid',  label: 'Híbrido' },
];

const TYPE_OPTIONS: { value: JobOffer['type']; label: string }[] = [
    { value: 'full-time',  label: 'Tiempo completo' },
    { value: 'part-time',  label: 'Medio tiempo' },
    { value: 'freelance',  label: 'Freelance' },
    { value: 'internship', label: 'Práctica profesional' },
];

async function fetchAllJobs(search?: string): Promise<JobOffer[]> {
    const all: JobOffer[] = [];
    for (let page = 1; page <= MAX_PAGES; page++) {
        const res = await jobService.getAll({ page, pageSize: FETCH_PAGE_SIZE, search });
        all.push(...(res.items ?? []));
        if (!res.items?.length || all.length >= (res.totalRecords ?? 0)) break;
    }
    return all;
}

const modalityLabel: Record<JobOffer['modality'], string> = {
    'remote':  'Remoto',
    'on-site': 'Presencial',
    'hybrid':  'Híbrido',
};

//Círculo de compatibilidad
function MatchRing({ score }: { score: number }) {
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
            <span className="text-[10px] text-muted">Compatibilidad</span>
        </div>
    );
}

// ── Fila de oferta ────────────────────────────────────────────────────────────
function JobRow({ job, onOpen }: { job: JobOffer; onOpen: () => void }) {
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
                        <Badge label={modalityLabel[job.modality]} variant="info" />
                    </div>
                </div>

                {job.matchScore !== undefined && <MatchRing score={job.matchScore} />}
            </div>

            {/* Parte inferior (mobile) / centro (desktop): requisitos */}
            <div className="md:w-64 lg:w-80 md:shrink-0 border-t border-gray-100 dark:border-gray-800 pt-3 md:border-t-0 md:pt-0">
                <p className="text-xs font-semibold text-ink dark:text-gray-200 mb-1">
                    Requisitos principales
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
    const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [filtersOpen, setFiltersOpen] = useState(false);
    const [modalities, setModalities] = useState<JobOffer['modality'][]>([]);
    const [types, setTypes] = useState<JobOffer['type'][]>([]);
    const [sectors, setSectors] = useState<string[]>([]);

    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch] = useState('');
    const [quickFilter, setQuickFilter] = useState<QuickFilter>('recommended');
    // Se fija al montar: leer el reloj dentro del useMemo lo volveria impuro
    const [recentCutoff] = useState(() => Date.now() - SEVEN_DAYS_MS);
    const [reloadKey, setReloadKey] = useState(0); // sube al presionar "Reintentar"

    // Debounce del buscador para no pegarle a APIM en cada tecla
    useEffect(() => {
        const t = setTimeout(() => setSearch(searchInput.trim()), 400);
        return () => clearTimeout(t);
    }, [searchInput]);

    // Se descarga el catálogo entero para que los filtros vean todas las ofertas
    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            setLoading(true);
            setError(null);
            try {
                const all = await fetchAllJobs(search || undefined);
                if (cancelled) return;
                setItems(all);
                setVisibleCount(INITIAL_VISIBLE);
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

    // Los sectores salen de las propias ofertas: no hay catálogo fijo
    const sectorOptions = useMemo(
        () => [...new Set(items.map(j => j.sector).filter(Boolean))].sort(),
        [items],
    );

    const toggle = <T,>(list: T[], value: T) =>
        list.includes(value) ? list.filter(v => v !== value) : [...list, value];

    const activeFilters = modalities.length + types.length + sectors.length;

    const clearFilters = () => { setModalities([]); setTypes([]); setSectors([]); };

    // Primero el panel de filtros, después el chip, y al final el orden
    const filtered = useMemo(() => {
        let list = items;

        if (modalities.length) list = list.filter(j => modalities.includes(j.modality));
        if (types.length)      list = list.filter(j => types.includes(j.type));
        if (sectors.length)    list = list.filter(j => sectors.includes(j.sector));

        switch (quickFilter) {
            case 'remote':
                return list.filter(j => j.modality === 'remote');
            case 'hybrid':
                return list.filter(j => j.modality === 'hybrid');
            case 'recent':
                return list.filter(j => new Date(j.postedAt).getTime() >= recentCutoff);
            default:
                // "Recomendadas": todas, de mayor a menor compatibilidad
                return [...list].sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0));
        }
    }, [items, quickFilter, recentCutoff, modalities, types, sectors]);

    const visibleItems = filtered.slice(0, visibleCount);
    const hasMore = visibleCount < filtered.length;
    const canCollapse = visibleCount > INITIAL_VISIBLE;

    return (
        <div className="flex flex-col gap-3 sm:gap-6">

            <PageHeader
                eyebrow="Oportunidades para ti"
                title="Ofertas Laborales"
                action={
                    filtered.length > 0 ? (
                        <span className="inline-block rounded-full bg-primary-soft px-3 py-1.5 text-xs font-semibold text-primary-dark dark:bg-primary/15 dark:text-primary">
                            {filtered.length} {filtered.length === 1 ? 'oferta encontrada' : 'ofertas encontradas'}
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
                        placeholder="Buscar ofertas, empresas o puestos"
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
                    <span className="hidden sm:inline">Filtros</span>
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
                        onClick={() => setQuickFilter(f.id)}
                        className={`shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors
                            ${quickFilter === f.id
                            ? 'bg-primary text-white border-primary'
                            : 'bg-surface dark:bg-gray-900 text-body dark:text-gray-300 border-line dark:border-gray-800 hover:border-primary hover:text-primary'
                        }`}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {/* ── Contenido ───────────────────────────────────────────────────── */}
            {loading ? (
                <LoadingSpinner />
            ) : error ? (
                <ErrorMessage message={error} onRetry={() => setReloadKey(k => k + 1)} />
            ) : filtered.length === 0 ? (
                <div className="flex flex-col items-start gap-3">
                    <p className="text-sm text-muted">
                        No se encontraron ofertas{search ? ` para "${search}"` : ''}
                        {activeFilters > 0 || quickFilter !== 'recommended' ? ' con esos filtros' : ''}.
                    </p>
                    {activeFilters > 0 && (
                        <Button variant="secondary" size="sm" onClick={clearFilters}>
                            Quitar filtros
                        </Button>
                    )}
                </div>
            ) : (
                <div className="flex flex-col gap-3">
                    {visibleItems.map(job => (
                        <JobRow key={job.id} job={job} onOpen={() => navigate(`/jobs/${job.id}`)} />
                    ))}

                    <div className="flex flex-col gap-2 sm:flex-row">
                        {hasMore && (
                            <Button
                                variant="secondary"
                                className="w-full"
                                onClick={() => setVisibleCount(v => v + STEP)}
                            >
                                Ver Más Ofertas
                            </Button>
                        )}
                        {canCollapse && (
                            <Button
                                variant="secondary"
                                className="w-full"
                                onClick={() => setVisibleCount(INITIAL_VISIBLE)}
                            >
                                Ver menos
                            </Button>
                        )}
                    </div>
                </div>
            )}

            {/* Panel de filtros */}
            <Modal
                open={filtersOpen}
                title="Filtrar ofertas"
                description="Se combinan con los accesos rápidos y la búsqueda."
                onClose={() => setFiltersOpen(false)}
            >
                <div className="flex flex-col gap-5">
                    <ChipGroup
                        label="Modalidad"
                        options={MODALITY_OPTIONS}
                        selected={modalities}
                        onToggle={v => setModalities(prev => toggle(prev, v))}
                    />
                    <ChipGroup
                        label="Tipo de jornada"
                        options={TYPE_OPTIONS}
                        selected={types}
                        onToggle={v => setTypes(prev => toggle(prev, v))}
                    />
                    {sectorOptions.length > 0 && (
                        <ChipGroup
                            label="Sector"
                            options={sectorOptions.map(sec => ({ value: sec, label: sec }))}
                            selected={sectors}
                            onToggle={v => setSectors(prev => toggle(prev, v))}
                        />
                    )}

                    <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
                        <Button variant="secondary" size="sm" onClick={clearFilters} disabled={activeFilters === 0}>
                            Quitar filtros
                        </Button>
                        <Button size="sm" onClick={() => setFiltersOpen(false)}>
                            Ver {filtered.length} {filtered.length === 1 ? 'oferta' : 'ofertas'}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}