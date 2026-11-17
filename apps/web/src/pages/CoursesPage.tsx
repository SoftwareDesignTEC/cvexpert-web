import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import PageHeader from '../components/ui/PageHeader';
import Button from '../components/ui/Button';
import CourseCard from '../components/ui/CourseCard';
import Pagination from '../components/ui/Pagination';
import { useLocale } from '../i18n/LocaleContext';
import { ErrorMessage, LoadingSpinner } from '../components/ui/Feedback';
import { courseService } from '../services/courseService';
import type { CourseFilters, CoursePage } from '../services/courseService';
import { describeError } from '../services/http';

const PAGE_SIZE = 8;
// Lo que se espera desde la última tecla antes de volver a consultar. Corto
// para que se sienta en vivo, largo para no pedir una página por cada letra.
const ESPERA_TECLEO = 350;
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
    function apply(next: CourseFilters) {
        const query = new URLSearchParams();
        if (next.platform?.trim()) query.set('platform', next.platform.trim());
        if (next.skillName?.trim()) query.set('skillName', next.skillName.trim());
        if (next.isPaid !== undefined) query.set('isPaid', String(next.isPaid));
        // Sin page: al cambiar el filtro se vuelve al principio, porque la
        // página 3 de la búsqueda anterior no significa nada en la nueva.
        // Y con replace, para no llenar el historial con cada tecleada.
        setParams(query, { replace: true });
    }
    const { t } = useLocale();

    // Ni el formulario ni los resultados llevan key: si se remontaran en cada
    // cambio, el campo perdería el foco a media palabra y la lista parpadearía.
    return <div className="flex flex-col gap-3 sm:gap-6">
        <PageHeader eyebrow={t.courses.eyebrow} title={t.courses.title} />
        <p className="text-sm text-muted">{t.courses.intro}</p>
        <CourseFiltersForm filters={filters} onApply={apply} />
        <CatalogResults page={page} filters={filters} onPage={next => setParams(previous => {
            const query = new URLSearchParams(previous);
            query.set('page', String(next));
            return query;
        })} />
    </div>;
}

function CourseFiltersForm({ filters, onApply }: { filters: CourseFilters; onApply: (filters: CourseFilters) => void }) {
    const { t } = useLocale();
    // Arranca con lo que venga en la dirección: desde la brecha se llega acá
    // con una habilidad ya puesta.
    const [platform, setPlatform] = useState(filters.platform ?? '');
    const [skillName, setSkillName] = useState(filters.skillName ?? '');
    const [price, setPrice] = useState(filters.isPaid === undefined ? '' : String(filters.isPaid));

    const pendiente = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    useEffect(() => () => clearTimeout(pendiente.current), []);

    function filtrar(next: { platform: string; skillName: string; price: string }, yaMismo = false) {
        setPlatform(next.platform);
        setSkillName(next.skillName);
        setPrice(next.price);
        clearTimeout(pendiente.current);
        const aplicar = () => onApply({
            platform: next.platform,
            skillName: next.skillName,
            isPaid: next.price === '' ? undefined : next.price === 'true',
        });
        // Escribir espera; elegir en la lista, limpiar o apretar Enter no.
        if (yaMismo) aplicar();
        else pendiente.current = setTimeout(aplicar, ESPERA_TECLEO);
    }

    const actuales = { platform, skillName, price };

    return <form onSubmit={event => {
        event.preventDefault();
        filtrar(actuales, true);
    }} className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="grid gap-4 sm:grid-cols-3">
            <label className="text-sm font-medium text-body dark:text-gray-300">{t.courses.platform}
                <input className={field} value={platform} placeholder={t.courses.platformPlaceholder}
                    onChange={e => filtrar({ ...actuales, platform: e.target.value })} />
            </label>
            <label className="text-sm font-medium text-body dark:text-gray-300">{t.courses.skill}
                <input className={field} value={skillName} placeholder={t.courses.skillPlaceholder}
                    onChange={e => filtrar({ ...actuales, skillName: e.target.value })} />
            </label>
            <label className="text-sm font-medium text-body dark:text-gray-300">{t.courses.price}
                <select className={field} value={price}
                    onChange={e => filtrar({ ...actuales, price: e.target.value }, true)}>
                    <option value="">{t.courses.priceAll}</option><option value="false">{t.courses.priceFree}</option><option value="true">{t.courses.pricePaid}</option>
                </select>
            </label>
        </div>
        <p className="text-xs text-muted">{t.courses.exactNames}</p>
        <div className="flex flex-wrap gap-2">
            <Button size="sm" type="button" variant="secondary" onClick={() => {
                filtrar({ platform: '', skillName: '', price: '' }, true);
            }}>{t.courses.clearFilters}</Button>
        </div>
    </form>;
}

function CatalogResults({ page, filters: { platform, skillName, isPaid }, onPage }: {
    page: number; filters: CourseFilters; onPage: (page: number) => void;
}) {
    // El resultado y el error se guardan junto a la consulta que los produjo.
    // Así se sabe si lo que está en pantalla corresponde a lo que se pide
    // ahora, sin tener que mover un estado de carga desde el efecto.
    const [result, setResult] = useState<{ clave: string; datos: CoursePage } | null>(null);
    const [error, setError] = useState<{ clave: string; mensaje: string } | null>(null);
    const [retry, setRetry] = useState(0);
    const { t } = useLocale();

    const clave = JSON.stringify([page, platform, skillName, isPaid, retry]);

    useEffect(() => {
        let active = true;
        courseService.getAll({ page, pageSize: PAGE_SIZE, platform, skillName, isPaid }).then(datos => {
            if (active) { setResult({ clave, datos }); setError(null); }
        }).catch(err => {
            if (active) setError({ clave, mensaje: describeError(err, 'cargar el catálogo de cursos') });
        });
        return () => { active = false; };
    }, [clave, page, platform, skillName, isPaid]);

    if (error?.clave === clave) {
        return <ErrorMessage message={error.mensaje} onRetry={() => setRetry(n => n + 1)} />;
    }
    if (!result) return <LoadingSpinner />;

    const { datos } = result;
    // Mientras llega lo nuevo se deja ver lo anterior apagado: filtrando en
    // vivo, vaciar la lista en cada tecla marea más de lo que informa.
    const esperando = result.clave !== clave;
    const totalPages = Math.max(1, Math.ceil(datos.totalRecords / PAGE_SIZE));
    const activeFilters = !!platform || !!skillName || isPaid !== undefined;

    return <div className={`flex flex-col gap-4 transition-opacity ${esperando ? 'opacity-50' : ''}`}
        aria-live="polite" aria-busy={esperando}>
        <p className="text-sm text-muted">
            {t.courses.pageLabel} {datos.page} · {datos.totalRecords} {t.courses.inCatalog}
            {activeFilters ? t.courses.withFilters : ''}.
        </p>
        {datos.excluded > 0 && <p role="status" className="text-sm text-muted">
            {t.courses.excludedBefore} {datos.excluded} {t.courses.excludedAfter}
        </p>}
        {datos.items.length > 0 ? <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {datos.items.map(course => <CourseCard key={course.id} course={course} />)}
        </div> : <div className="rounded-2xl border border-line bg-surface p-6 text-sm text-muted dark:border-gray-800 dark:bg-gray-900">
            {datos.totalRecords > 0 ? t.courses.noneOnPage
                : activeFilters ? t.courses.noneWithFilters : t.courses.noneAtAll}
        </div>}
        {datos.page > totalPages && <Button size="sm" variant="secondary" onClick={() => onPage(1)}>{t.courses.backToFirst}</Button>}
        {datos.page <= totalPages && <Pagination page={datos.page} totalPages={totalPages} onChange={onPage} />}
    </div>;
}
