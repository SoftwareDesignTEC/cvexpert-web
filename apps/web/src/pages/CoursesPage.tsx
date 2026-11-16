import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import PageHeader from '../components/ui/PageHeader';
import Button from '../components/ui/Button';
import CourseCard from '../components/ui/CourseCard';
import Pagination from '../components/ui/Pagination';
import { ErrorMessage, LoadingSpinner } from '../components/ui/Feedback';
import { courseService } from '../services/courseService';
import type { CourseFilters, CoursePage } from '../services/courseService';
import { describeError } from '../services/http';

const PAGE_SIZE = 20;
const field = 'mt-1 w-full rounded-lg border border-line bg-surface p-2 text-sm text-ink dark:border-gray-700 dark:bg-gray-800 dark:text-white';

export default function CoursesPage() {
    const [params, setParams] = useSearchParams();
    const filters: CourseFilters = {
        platform: params.get('platform') || undefined,
        skillName: params.get('skillName') || undefined,
        isPaid: params.get('isPaid') === 'true' ? true : params.get('isPaid') === 'false' ? false : undefined,
    };
    const requested = Number(params.get('page') ?? 1);
    const page = Number.isSafeInteger(requested) && requested > 0 ? requested : 1;
    const filterKey = JSON.stringify(filters);
    function apply(next: CourseFilters) {
        const query = new URLSearchParams();
        if (next.platform?.trim()) query.set('platform', next.platform.trim());
        if (next.skillName?.trim()) query.set('skillName', next.skillName.trim());
        if (next.isPaid !== undefined) query.set('isPaid', String(next.isPaid));
        setParams(query);
    }
    return <div className="flex flex-col gap-3 sm:gap-6">
        <PageHeader eyebrow="Crecimiento profesional" title="Cursos" />
        <p className="text-sm text-muted">Explorá el catálogo de cursos. Las asociaciones por habilidad no garantizan un nivel de dominio ni son recomendaciones personalizadas.</p>
        <CourseFiltersForm key={filterKey} filters={filters} onApply={apply} />
        <CatalogResults key={`${filterKey}:${page}`} page={page} filters={filters} onPage={next => setParams(previous => {
            const query = new URLSearchParams(previous);
            query.set('page', String(next));
            return query;
        })} />
    </div>;
}

function CourseFiltersForm({ filters, onApply }: { filters: CourseFilters; onApply: (filters: CourseFilters) => void }) {
    const [platform, setPlatform] = useState(filters.platform ?? '');
    const [skillName, setSkillName] = useState(filters.skillName ?? '');
    const [price, setPrice] = useState(filters.isPaid === undefined ? '' : String(filters.isPaid));
    return <form onSubmit={event => {
        event.preventDefault();
        onApply({ platform, skillName, isPaid: price === '' ? undefined : price === 'true' });
    }} className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="grid gap-4 sm:grid-cols-3">
            <label className="text-sm font-medium text-body dark:text-gray-300">Plataforma
                <input className={field} value={platform} onChange={e => setPlatform(e.target.value)} placeholder="Nombre de la plataforma" />
            </label>
            <label className="text-sm font-medium text-body dark:text-gray-300">Habilidad
                <input className={field} value={skillName} onChange={e => setSkillName(e.target.value)} placeholder="Por ejemplo, Git" />
            </label>
            <label className="text-sm font-medium text-body dark:text-gray-300">Precio
                <select className={field} value={price} onChange={e => setPrice(e.target.value)}>
                    <option value="">Todos</option><option value="false">Gratis</option><option value="true">De pago</option>
                </select>
            </label>
        </div>
        <p className="text-xs text-muted">Plataforma y habilidad deben coincidir con el nombre del catálogo, incluyendo mayúsculas y acentos.</p>
        <div className="flex flex-wrap gap-2">
            <Button size="sm" type="submit">Aplicar filtros</Button>
            <Button size="sm" type="button" variant="secondary" onClick={() => {
                setPlatform(''); setSkillName(''); setPrice(''); onApply({});
            }}>Limpiar filtros</Button>
        </div>
    </form>;
}

function CatalogResults({ page, filters: { platform, skillName, isPaid }, onPage }: {
    page: number; filters: CourseFilters; onPage: (page: number) => void;
}) {
    const [result, setResult] = useState<CoursePage | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [retry, setRetry] = useState(0);
    useEffect(() => {
        let active = true;
        courseService.getAll({ page, pageSize: PAGE_SIZE, platform, skillName, isPaid }).then(data => {
            if (active) { setResult(data); setError(null); }
        }).catch(err => { if (active) setError(describeError(err, 'cargar el catálogo de cursos')); })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [page, platform, skillName, isPaid, retry]);
    if (loading) return <LoadingSpinner />;
    if (error) return <ErrorMessage message={error} onRetry={() => { setLoading(true); setRetry(n => n + 1); }} />;
    if (!result) return null;
    const totalPages = Math.max(1, Math.ceil(result.totalRecords / PAGE_SIZE));
    const activeFilters = !!platform || !!skillName || isPaid !== undefined;
    return <div className="flex flex-col gap-4" aria-live="polite">
        <p className="text-sm text-muted">Página {result.page} · {result.totalRecords} cursos en el catálogo{activeFilters ? ' con estos filtros' : ''}.</p>
        {result.excluded > 0 && <p role="status" className="text-sm text-muted">Se omitieron {result.excluded} registros inválidos, duplicados o de demostración en esta página. El total corresponde al servidor.</p>}
        {result.items.length > 0 ? <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {result.items.map(course => <CourseCard key={course.id} course={course} />)}
        </div> : <div className="rounded-2xl border border-line bg-surface p-6 text-sm text-muted dark:border-gray-800 dark:bg-gray-900">
            {result.totalRecords > 0 ? 'No hay cursos elegibles para mostrar en esta página. Podés consultar otra página.'
                : activeFilters ? 'No encontramos cursos con estos filtros.' : 'No hay cursos disponibles en el catálogo en este momento.'}
        </div>}
        {result.page > totalPages && <Button size="sm" variant="secondary" onClick={() => onPage(1)}>Volver a la primera página</Button>}
        {result.page <= totalPages && <Pagination page={result.page} totalPages={totalPages} onChange={onPage} />}
    </div>;
}
