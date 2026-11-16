import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import CourseCard from '../components/ui/CourseCard';
import SkillsRadar from '../components/ui/SkillsRadar';
import { ErrorMessage, LoadingSpinner } from '../components/ui/Feedback';
import PageHeader from '../components/ui/PageHeader';
import Button from '../components/ui/Button';
import GalleryDialog from '../components/ui/GalleryDialog';
import Modal from '../components/ui/Modal';
import { LEVEL_LABEL, LEVEL_VALUE, SKILL_LEVELS, levelLabel, mergeJobGap, skillsGapService, uniqueRecommendationCourses } from '../services/skillsGapService';
import { projectCvForJob } from '../services/jobGapProjection';
import type { ContextualGap, CourseSuggestion, SkillLevel } from '../services/skillsGapService';
import { cvService, withAddedSkill } from '../services/cvService';
import { jobService } from '../services/otherServices';
import { ApiError, describeError } from '../services/http';
import type { CV, JobOffer } from '../types/models';
import type { PaginatedResponse } from '../types/api';

type CourseWithSkill = CourseSuggestion & { skillName: string };
const COURSES_PREVIEW = 3;
const COURSES_PER_PAGE = 6;
const panel = 'bg-surface dark:bg-gray-900 border border-line dark:border-gray-800 rounded-2xl shadow-sm p-5';
const field = 'w-full rounded-lg border border-line bg-surface p-2 text-sm text-ink dark:border-gray-700 dark:bg-gray-800 dark:text-white';
type Choice = { id: string; title: string; company?: string };
const loadCvs = (page: number) => cvService.getAll({ page, pageSize: 20 });
const loadJobs = (page: number) => jobService.getAll({ page, pageSize: 20 });

function Picker({ label, value, onChange, load, disabled, empty }: {
    label: string; value: string; onChange: (id: string) => void;
    load: (page: number) => Promise<PaginatedResponse<Choice>>; disabled: boolean; empty: React.ReactNode;
}) {
    const [items, setItems] = useState<Choice[]>([]);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [retry, setRetry] = useState(0);
    useEffect(() => {
        let active = true;
        load(page).then(res => {
            if (!active) return;
            setItems(prev => [...new Map([...prev, ...res.items].map(i => [i.id, i])).values()]);
            setTotal(res.totalRecords);
            setError(null);
        }).catch(err => { if (active) setError(describeError(err, `cargar ${label.toLowerCase()}`)); })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [load, page, retry, label]);
    return <div className="flex min-w-0 flex-1 flex-col gap-2">
        <label className="text-sm font-medium text-body dark:text-gray-300">
            {label}
            <select className={`${field} mt-1`} value={value} disabled={disabled} onChange={e => onChange(e.target.value)}>
                <option value="">Seleccionar…</option>
                {value && !items.some(i => i.id === value) && <option value={value}>Oferta seleccionada ({value})</option>}
                {items.map(i => <option key={i.id} value={i.id}>{i.title}{i.company ? ` · ${i.company}` : ''}</option>)}
            </select>
        </label>
        {loading && <p className="text-xs text-muted" role="status">Cargando…</p>}
        {!loading && !error && items.length === 0 && <div className="text-sm text-muted">{empty}</div>}
        {error && <><p className="text-sm text-rose-500" role="alert">{error}</p><Button size="sm" variant="secondary" disabled={loading || disabled} onClick={() => { setLoading(true); setRetry(n => n + 1); }}>Reintentar lista</Button></>}
        {!error && items.length < total && <Button size="sm" variant="secondary" disabled={loading || disabled} onClick={() => { setLoading(true); setPage(n => n + 1); }}>Cargar más</Button>}
    </div>;
}

export default function SkillsGapPage() {
    const [params, setParams] = useSearchParams();
    const [cvId, setCvId] = useState('');
    const jobId = params.get('jobId') ?? '';
    const [saving, setSaving] = useState(false);
    return <div className="flex flex-col gap-3 sm:gap-6">
        <PageHeader eyebrow="Crecimiento profesional" title="Análisis de Brecha" />
        <div className={`${panel} flex flex-col gap-4`}>
            <p className="text-sm text-muted">Compará las habilidades documentadas en tu CV con una oferta laboral.</p>
            <div className="flex flex-col gap-4 sm:flex-row">
                <Picker label="Currículum" value={cvId} onChange={setCvId} load={loadCvs} disabled={saving}
                    empty={<>Todavía no tenés currículums. <Link className="text-primary underline" to="/cvs">Crear un CV</Link></>} />
                <Picker label="Oferta laboral" value={jobId} onChange={id => setParams(id ? { jobId: id } : {})} load={loadJobs} disabled={saving}
                    empty="No hay ofertas disponibles en este momento." />
            </div>
        </div>
        {cvId && jobId ? <AnalysisPanel key={`${cvId}:${jobId}`} cvId={cvId} jobId={jobId} onSaving={setSaving} />
            : <p className="text-sm text-muted">Elegí un currículum y una oferta para analizar.</p>}
    </div>;
}

const reasons = {
    no_explicit_evidence: 'La oferta no especifica un nivel obligatorio explícito.',
    optional: 'La mención es opcional o deseable.',
    negated: 'La oferta contiene una mención negada; no se asignó nivel.',
    contradictory: 'La oferta contiene niveles contradictorios.',
    ambiguous: 'La mención del nivel es ambigua.',
};
const statuses = {
    documented_skill_below_required: 'Por debajo del nivel solicitado',
    documented_skill_meets_required: 'Cumple el nivel solicitado',
    not_documented: 'No documentada en este CV',
    unknown_required_level: 'Nivel requerido desconocido',
};

/** Consulta voluntaria del catálogo por habilidad; no asegura cubrir el déficit de nivel. */
function LevelCourses({ name }: { name: string }) {
    const [items, setItems] = useState<CourseWithSkill[]>([]);
    const [page, setPage] = useState(0);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [excluded, setExcluded] = useState(0);
    const active = useRef(true);
    const busy = useRef(false);
    useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
    async function load() {
        if (busy.current) return;
        busy.current = true;
        setLoading(true);
        setError(null);
        try {
            const res = await skillsGapService.coursesForSkill(name, page + 1);
            if (!active.current) return;
            setItems(prev => [...new Map([...prev, ...res.items.map(c => ({ ...c, skillName: name }))].map(c => [c.id, c])).values()]);
            setPage(res.page);
            setTotal(res.totalRecords);
            setExcluded(n => n + res.excluded);
        } catch (err) { if (active.current) setError(describeError(err, `consultar cursos de ${name}`)); }
        finally { busy.current = false; if (active.current) setLoading(false); }
    }
    return <div className="border-t border-line pt-3 dark:border-gray-800">
        <h3 className="text-sm font-semibold text-ink dark:text-white">Cursos para explorar: {name}</h3>
        <p className="mb-2 text-xs text-muted">Esta habilidad está documentada por debajo del nivel solicitado. El catálogo asocia cursos por nombre; no verifica que alcancen el nivel requerido.</p>
        {items.length > 0 && <div className="mb-3 grid grid-cols-2 gap-3 lg:grid-cols-3">{items.map(c => <CourseCard key={c.id} course={c} />)}</div>}
        {page > 0 && items.length === 0 && <p className="text-sm text-muted">No se encontraron cursos elegibles asociados.</p>}
        {excluded > 0 && <p className="text-xs text-muted">Se omitieron registros de ejemplo del catálogo.</p>}
        {error && <p role="alert" className="text-sm text-rose-500">{error}</p>}
        {(page === 0 || page * 5 < total || error) && <Button variant="secondary" size="sm" loading={loading} onClick={() => void load()}>{error ? 'Reintentar cursos' : page === 0 ? 'Consultar cursos' : 'Cargar más cursos'}</Button>}
    </div>;
}

function AnalysisPanel({ cvId, jobId, onSaving }: { cvId: string; jobId: string; onSaving: (saving: boolean) => void }) {
    const [data, setData] = useState<ContextualGap | null>(null);
    const [context, setContext] = useState<{ cv: CV; job: JobOffer } | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [catalogFailed, setCatalogFailed] = useState(false);
    const [evaluationOnly, setEvaluationOnly] = useState(false);
    const [coursesOpen, setCoursesOpen] = useState(false);
    const [skill, setSkill] = useState<string | null>(null);
    const [level, setLevel] = useState<SkillLevel | ''>('');
    const [category, setCategory] = useState('Técnica');
    const [saveError, setSaveError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [notice, setNotice] = useState<string | null>(null);
    const active = useRef(true);
    const busy = useRef(false);
    const retry = useRef<(() => Promise<void>) | null>(null);
    useEffect(() => {
        active.current = true;
        return () => { active.current = false; };
    }, []);

    async function evaluate(cv: CV, job: JobOffer, courses?: ContextualGap) {
        const evaluation = await skillsGapService.evaluateForJob(cv, job);
        const result = courses ? mergeJobGap(courses, evaluation) : evaluation;
        if (active.current) setData(result);
    }
    async function perform(work: () => Promise<void>) {
        if (busy.current) return;
        busy.current = true;
        setLoading(true);
        setError(null);
        setCatalogFailed(false);
        try { await work(); }
        catch (err) {
            if (active.current) {
                setError(describeError(err, 'actualizar el análisis'));
                setCatalogFailed(err instanceof ApiError && err.status === 503 && err.code === 'CATALOG_UNAVAILABLE');
            }
        } finally {
            busy.current = false;
            if (active.current) setLoading(false);
        }
    }
    async function analyze(only = evaluationOnly) {
        if (busy.current) return;
        setEvaluationOnly(only);
        setData(null);
        const work = async () => {
            const [cv, job] = await Promise.all([cvService.getById(cvId), jobService.getById(jobId)]);
            if (!active.current) return;
            if (cv.id !== cvId || job.id !== jobId) throw new Error('El detalle recibido corresponde a otra selección.');
            setContext({ cv, job });
            if (only) { await evaluate(cv, job); return; }
            const courses = await skillsGapService.recommendForJob(cv, job);
            if (!active.current) return;
            setData(courses);
            // Si solo falla la evaluación, el reintento conserva los cursos y repite ese POST.
            retry.current = () => evaluate(cv, job, courses);
            await evaluate(cv, job, courses);
        };
        retry.current = work;
        await perform(work);
    }
    async function saveSkill() {
        if (!skill || !level || busy.current) return;
        busy.current = true;
        setSaving(true);
        onSaving(true);
        setSaveError(null);
        let confirmed = false;
        try {
            const latest = await cvService.getById(cvId);
            if (!active.current) return;
            if (latest.id !== cvId) throw new Error('El CV recibido no corresponde al seleccionado. No se guardó ningún cambio.');
            const input = withAddedSkill(latest, { name: skill, level, category });
            // Si ya existe, no enviamos un PUT ni modificamos su nivel.
            if (input.skills.length !== latest.skills.length) {
                await cvService.update(cvId, input);
                confirmed = true;
            }
            if (!active.current) return;
            setNotice(confirmed ? `La habilidad ${skill} se guardó en el CV seleccionado. Si falla la actualización, reintentá únicamente el análisis.`
                : `${skill} ya estaba documentada en el CV. Conservamos su nivel y actualizamos el análisis.`);
            setSkill(null);
            busy.current = false;
            // analyze obtiene nuevamente el CV confirmado. Sus errores nunca vuelven a ejecutar el PUT.
            await analyze();
        } catch (err) {
            if (active.current) setSaveError(describeError(err, confirmed ? 'consultar el CV actualizado' : 'guardar la habilidad'));
        } finally {
            busy.current = false;
            if (active.current) setSaving(false);
            onSaving(false);
        }
    }

    const result = data?.result;
    const assessments = result?.skillLevelAssessments ?? [];
    const radar = assessments.filter(a => a.cvLevel && a.requiredLevel && a.status.startsWith('documented_skill_'))
        .map(a => ({ name: a.name, userLevel: LEVEL_VALUE[a.cvLevel!], marketLevel: LEVEL_VALUE[a.requiredLevel!] }));
    const allCourses: CourseWithSkill[] = uniqueRecommendationCourses(result?.recommendations ?? []);
    // Incluye habilidades del CV e idiomas requeridos incorporados únicamente a la proyección HTTP.
    const projectedCompetenceCount = result && context
        ? projectCvForJob(context.cv, context.job.skills ?? []).skills.length
        : 0;
    const closeSkill = () => { if (!saving) setSkill(null); };
    return <>
        <div className="flex flex-wrap gap-2">
            <Button size="sm" loading={loading} disabled={saving} onClick={() => void analyze(false)}>Analizar</Button>
            {context && <p className="self-center text-sm text-muted">{context.cv.title} · {context.job.title} · {context.job.company}</p>}
        </div>
        {notice && <p role="status" className="text-sm text-primary">{notice}</p>}
        {error && <div role="alert">
            <ErrorMessage message={error} onRetry={loading || saving ? undefined : () => { if (retry.current) void perform(retry.current); }} />
            {catalogFailed && <Button variant="secondary" size="sm" disabled={loading || saving} onClick={() => void analyze(true)}>Evaluar sin consultar cursos</Button>}
            <Link to="/cvs" className="ml-3 text-sm text-primary underline">Revisar mi CV</Link>
        </div>}
        {loading && !result && <LoadingSpinner />}
        {result && <>
            <div className={panel}>
                <h2 className="text-lg font-bold text-ink dark:text-white">Resumen de la oferta</h2>
                <dl className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4 text-sm">
                    <div><dt className="text-muted">Habilidades exigidas</dt><dd className="text-xl font-bold text-primary">{result.requiredSkillsCount}</dd></div>
                    <div><dt className="text-muted">Documentadas de la oferta</dt><dd className="text-xl font-bold text-primary">{result.documentedMatchesCount}</dd></div>
                    <div><dt className="text-muted">Competencias consideradas</dt><dd className="text-xl font-bold text-primary">{projectedCompetenceCount}</dd></div>
                    <div><dt className="text-muted">Cobertura documental</dt><dd className="text-xl font-bold text-primary">{result.documentedCoveragePercent == null ? 'Sin información suficiente' : `${result.documentedCoveragePercent.toLocaleString('es-CR', { maximumFractionDigits: 2 })} %`}</dd></div>
                </dl>
                <p className="mt-4 text-sm text-body dark:text-gray-300">Estado: {({ complete: 'Todas las habilidades de la oferta están documentadas', partial: 'Hay habilidades no documentadas', insufficient_information: 'La oferta no tiene habilidades identificables' })[result.status]}.</p>
                <p className="mt-2 text-xs text-muted">La cobertura compara nombres documentados. No mide dominio, cumplimiento de niveles ni la compatibilidad de Ofertas.</p>
                {(context?.cv.languages.length ?? 0) > 0 && <p className="mt-2 text-xs text-muted">También se consideran los idiomas exigidos y documentados en el CV. Sus niveles se adaptan solo para analizar: Básico → Principiante, Intermedio → Intermedio, Avanzado → Avanzado y Nativo → cuarto escalón (Experto). Esta última es una equivalencia operativa de escala, no una certificación lingüística. Los idiomas originales del CV se conservan.</p>}
            </div>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:gap-4">
                <div className={`${panel} flex-1 min-w-0`}>
                    <h2 className="text-lg font-bold text-ink dark:text-white">Tu CV frente a la oferta</h2>
                    {radar.length > 0 ? <><SkillsRadar skills={radar} size={220} max={4} formatValue={levelLabel} /><p className="text-xs text-muted">Azul: nivel declarado en el CV · Gris: nivel requerido explícito. Escala ordinal de 1 a 4.</p></>
                        : <p className="mt-3 text-sm text-muted">No hay pares de niveles comparables. Un nivel no especificado no equivale a un nivel bajo.</p>}
                </div>
                <div className={`${panel} flex-1 min-w-0`}>
                    <h2 className="text-lg font-bold text-ink dark:text-white">Evaluación por niveles</h2>
                    {result.levelAnalysis ? <p className="mt-2 text-sm text-muted">Cumplen: {result.levelAnalysis.meetsRequiredCount} · Por debajo: {result.levelAnalysis.belowRequiredCount} · Documentadas con nivel requerido desconocido: {result.levelAnalysis.unknownRequiredLevelCount}</p>
                        : <p className="mt-2 text-sm text-muted">{loading ? 'Consultando los niveles de la oferta…' : 'El servidor no proporcionó evaluación por niveles.'}</p>}
                    <ul className="mt-3 divide-y divide-line dark:divide-gray-800">
                        {result.matchedSkills.map(s => {
                            const a = assessments.find(a => a.name === s.name);
                            return <li key={s.name} className="py-3 text-sm text-body dark:text-gray-300">
                                <p className="font-semibold text-ink dark:text-white">{s.name}</p>
                                <p>CV: {LEVEL_LABEL[s.cvLevel]} · Oferta: {a?.requiredLevel ? LEVEL_LABEL[a.requiredLevel] : 'No especificado'}</p>
                                <p className="text-xs text-muted">{a ? statuses[a.status] : 'Sin evaluación de niveles'}{a?.deficitSteps != null ? ` · Déficit ordinal: ${a.deficitSteps}` : ''}</p>
                            </li>;
                        })}
                    </ul>
                </div>
            </div>
            <div className={panel}>
                <h2 className="text-lg font-bold text-ink dark:text-white">Habilidades no documentadas</h2>
                <p className="mt-2 text-sm text-muted">Su ausencia en este CV no significa que no las poseás. Seleccioná una para documentarla con tu nivel real.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                    {result.notDocumentedSkills.map(name => <Button key={name} variant="secondary" size="sm" disabled={saving || loading} onClick={() => { setSkill(name); setLevel(''); setCategory('Técnica'); setSaveError(null); }}>{name}</Button>)}
                    {result.notDocumentedSkills.length === 0 && <p className="text-sm text-muted">{result.requiredSkillsCount ? 'Todas las habilidades identificadas están documentadas.' : 'La oferta no contiene habilidades identificables.'}</p>}
                </div>
            </div>
            {assessments.length > 0 && <details className={panel}>
                <summary className="cursor-pointer text-sm font-semibold text-ink dark:text-white">Evidencias y niveles desconocidos</summary>
                <ul className="mt-3 divide-y divide-line dark:divide-gray-800">
                    {assessments.map(a => <li key={a.name} className="py-3 text-sm text-body dark:text-gray-300">
                        <p className="font-semibold">{a.name} · Nivel requerido: {a.requiredLevel ? LEVEL_LABEL[a.requiredLevel] : 'Desconocido'}</p>
                        {a.evidenceText != null && <p className="mt-1 whitespace-pre-wrap break-words">{a.evidenceSource === 'description' ? 'Descripción' : 'Requisitos'}: {a.evidenceText}</p>}
                        {a.reason && <p className="text-muted">{reasons[a.reason]}</p>}
                    </li>)}
                </ul>
            </details>}
            <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2">
                    <h2 className="text-lg font-bold text-ink dark:text-white">Cursos de Mejora</h2>
                    {allCourses.length > COURSES_PREVIEW && <Button variant="secondary" size="sm" onClick={() => setCoursesOpen(true)}>Ver más</Button>}
                </div>
                <p className="text-sm text-muted">{data?.catalogStatus ? 'Cursos asociados por el catálogo a habilidades no documentadas. No certifican dominio ni garantizan cubrir un nivel.' : 'No se consultaron recomendaciones de cursos en esta evaluación.'}</p>
                {(data?.excludedCourses ?? 0) > 0 && <p role="status" className="text-sm text-muted">Se omitieron {data?.excludedCourses} cursos inválidos, de ejemplo o repetidos. El análisis de habilidades permanece disponible.</p>}
                {allCourses.length > 0 && <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">{allCourses.slice(0, COURSES_PREVIEW).map(c => <CourseCard key={c.id} course={c} />)}</div>}
                {result.recommendations?.filter(g => g.courses.length === 0).map(g => <p key={g.skillName} className="text-sm text-muted">{g.skillName}: {g.catalogMatch === 'ambiguous' ? 'nombre ambiguo en el catálogo' : g.catalogMatch === 'not_found' ? 'habilidad no encontrada en el catálogo' : 'sin cursos elegibles asociados'}.</p>)}
                {data?.catalogStatus === 'not_needed' && <p className="text-sm text-muted">No hay habilidades no documentadas que requieran consultar cursos.</p>}
                {assessments.filter(a => a.status === 'documented_skill_below_required' && a.detectionStatus === 'explicit' && (a.deficitSteps ?? 0) > 0)
                    .map(a => <LevelCourses key={`${context?.cv.updatedAt}:${a.name}:${a.cvLevel}:${a.requiredLevel}`} name={a.name} />)}
                <div className="flex flex-col items-start gap-2 text-sm text-primary">
                    {[...new Set([...result.notDocumentedSkills, ...assessments.filter(a => a.status === 'documented_skill_below_required').map(a => a.name)])].map(name =>
                        <Link className="hover:underline" key={name} to={`/courses?${new URLSearchParams({ skillName: name })}`}>Buscar cursos de {name}</Link>)}
                    <Link className="font-medium hover:underline" to="/courses">Explorar todos los cursos</Link>
                </div>
            </div>
            <GalleryDialog open={coursesOpen} title="Cursos de Mejora" description={`${allCourses.length} recomendaciones asociadas a habilidades`} items={allCourses} perPage={COURSES_PER_PAGE} onClose={() => setCoursesOpen(false)} keyOf={c => c.id} renderItem={c => <CourseCard course={c} />} />
        </>}
        <Modal open={skill !== null} title="Agregar habilidad al CV" description={context?.cv.title} onClose={closeSkill}>
            <div className="flex flex-col gap-4">
                <p className="text-sm text-body dark:text-gray-300">¿Querés agregar {skill} a este currículum? Elegí tu nivel real de dominio.</p>
                <label className="text-sm text-body dark:text-gray-300">Nivel<select className={field} value={level} disabled={saving} onChange={e => setLevel(e.target.value as SkillLevel | '')}>
                    <option value="">Seleccionar tu nivel…</option>{SKILL_LEVELS.map(l => <option key={l} value={l}>{LEVEL_LABEL[l]}</option>)}
                </select></label>
                <label className="text-sm text-body dark:text-gray-300">Tipo<select className={field} value={category} disabled={saving} onChange={e => setCategory(e.target.value)}><option value="Técnica">Técnica (dura)</option><option value="Blanda">Blanda</option></select></label>
                {saveError && <p role="alert" className="text-sm text-rose-500">{saveError}</p>}
                <div className="flex justify-end gap-2"><Button variant="secondary" size="sm" disabled={saving} onClick={closeSkill}>Cancelar</Button><Button size="sm" disabled={!level || saving} loading={saving} onClick={() => void saveSkill()}>Agregar al CV</Button></div>
            </div>
        </Modal>
    </>;
}
