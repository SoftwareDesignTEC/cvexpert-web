import { useCallback, useEffect, useMemo, useState } from 'react';
import { ExternalLink, GraduationCap, HelpCircle, Pencil } from 'lucide-react';
import SkillsRadar from '../components/ui/SkillsRadar';
import { ErrorMessage, LoadingSpinner } from '../components/ui/Feedback';
import PageHeader from '../components/ui/PageHeader';
import Button from '../components/ui/Button';
import GalleryDialog from '../components/ui/GalleryDialog';
import SkillsInputDialog from '../components/ui/SkillsInputDialog';
import {
    SKILL_SCALE_MAX,
    UNRESOLVED_REASON_LABEL,
    isSkillsInputRequired,
    levelLabel,
    skillsGapService,
} from '../services/skillsGapService';
import { describeError } from '../services/http';
import type {
    CourseSuggestion,
    SkillInput,
    SkillLevel,
    SkillsGapResponse,
} from '../services/skillsGapService';

// Cuántos cursos se ven en la pantalla y cuántos entran por página en el panel
const COURSES_PREVIEW = 3;
const COURSES_PER_PAGE = 6;

const LEVEL_BY_VALUE: Record<number, SkillLevel> = {
    1: 'beginner', 2: 'intermediate', 3: 'advanced', 4: 'expert',
};

// El logo de la plataforma viene del servicio; puede ser null y la URL puede fallar.
function CoursePlatformLogo({ logoUrl, platform }: { logoUrl: string | null; platform: string }) {
    const [failed, setFailed] = useState(false);

    if (!logoUrl || failed) {
        return (
            <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
                <GraduationCap size={16} className="text-gray-400" />
            </div>
        );
    }

    return (
        <img
            src={logoUrl}
            alt={platform}
            onError={() => setFailed(true)}
            className="w-8 h-8 rounded-lg object-cover shrink-0 bg-gray-100 dark:bg-gray-800"
        />
    );
}

type CourseWithSkill = CourseSuggestion & { skillName: string };

function CourseCard({ course }: { course: CourseWithSkill }) {
    // durationHours puede venir null: hay cursos sin duración publicada.
    // Se omite el dato en vez de escribir "null h".
    const meta = [
        course.durationHours != null ? `${course.durationHours} h` : null,
        course.skillName,
    ].filter(Boolean).join(' · ');

    return (
        <div className="bg-surface dark:bg-gray-900 border border-line dark:border-gray-800 rounded-xl p-3 flex flex-col gap-2">
            <div className="flex items-center gap-2">
                <CoursePlatformLogo logoUrl={course.logoUrl} platform={course.platform} />
                <span className="text-[11px] text-muted truncate">{course.platform}</span>
                <span
                    className={`ml-auto shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        course.isPaid
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400'
                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400'
                    }`}
                >
                    {course.isPaid ? 'De pago' : 'Gratis'}
                </span>
            </div>

            <h3 className="text-xs font-semibold text-ink dark:text-white line-clamp-2">
                {course.title}
            </h3>
            <p className="text-[11px] text-muted">{meta}</p>

            <a
                href={course.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-auto inline-flex items-center justify-center gap-1 text-xs font-medium text-primary border border-primary rounded-lg px-2 py-1.5 hover:bg-primary-tint dark:hover:bg-primary/10 transition-colors"
            >
                Ver Curso <ExternalLink size={12} />
            </a>
        </div>
    );
}

export default function SkillsGapPage() {
    const [data, setData] = useState<SkillsGapResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    // 409 SKILLS_INPUT_REQUIRED: no es una falla, es que falta el paso previo
    const [needsInput, setNeedsInput] = useState(false);
    const [reloadKey, setReloadKey] = useState(0);
    const [coursesOpen, setCoursesOpen] = useState(false);
    const [inputOpen, setInputOpen] = useState(false);

    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await skillsGapService.getAll();
                if (!cancelled) {
                    setData(res);
                    setNeedsInput(false);
                }
            } catch (err) {
                if (cancelled) return;
                if (isSkillsInputRequired(err)) {
                    setNeedsInput(true);
                    setData(null);
                } else {
                    setError(describeError(err, 'cargar tu análisis de brecha'));
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        load();

        return () => { cancelled = true; };
    }, [reloadKey]);

    const reload = useCallback(() => setReloadKey(k => k + 1), []);

    // Memorizados: sin esto cada render crea arreglos nuevos y los useMemo de
    // abajo se recalculan siempre.
    const items = useMemo(() => data?.items ?? [], [data]);
    const unresolved = useMemo(() => data?.analysis.unresolved ?? [], [data]);
    const analysis = data?.analysis;

    // El radar escala contra 4, no contra 100: los niveles son ordinales.
    const radarData = useMemo(
        () => items.map(i => ({ name: i.skillName, userLevel: i.userLevel, marketLevel: i.marketLevel })),
        [items],
    );

    // items[] ya trae sólo brechas positivas; deficitSteps dice cuántos niveles faltan
    const gaps = useMemo(
        () => [...items].sort((a, b) => b.deficitSteps - a.deficitSteps),
        [items],
    );

    const allCourses = useMemo(
        () => items.flatMap(i => i.courses.map(c => ({ ...c, skillName: i.skillName }))),
        [items],
    );

    // Para precargar el diálogo con lo que el servicio ya conoce del usuario
    const knownSkills = useMemo<SkillInput[]>(() => {
        const out = new Map<string, SkillInput>();
        for (const i of items) {
            out.set(i.skillName, { skillName: i.skillName, level: LEVEL_BY_VALUE[i.userLevel] ?? null });
        }
        for (const u of unresolved) {
            if (out.has(u.skillName)) continue;
            // MISSING_USER_SKILL es una habilidad que pide la vacante y el usuario
            // no declaró: se precarga sin nivel para que sólo tenga que elegirlo.
            out.set(u.skillName, {
                skillName: u.skillName,
                level: u.userLevel != null ? LEVEL_BY_VALUE[u.userLevel] ?? null : null,
            });
        }
        return [...out.values()];
    }, [items, unresolved]);

    if (loading) return <LoadingSpinner />;
    if (error) return <ErrorMessage message={error} onRetry={reload} />;

    const header = (
        <PageHeader
            eyebrow="Crecimiento profesional"
            title="Análisis de Brecha"
            action={
                <Button variant="secondary" size="sm" onClick={() => setInputOpen(true)}>
                    <Pencil size={14} /> Mis habilidades
                </Button>
            }
        />
    );

    // Se monta sólo al abrirse, con key: así cada apertura parte de lo guardado
    // sin necesidad de un efecto que reinicie el formulario.
    const dialog = inputOpen && (
        <SkillsInputDialog
            key={reloadKey}
            open
            initialSkills={knownSkills}
            onClose={() => setInputOpen(false)}
            onSaved={() => { setInputOpen(false); reload(); }}
        />
    );

    // ── Falta la instantánea de habilidades (409) ────────────────────────────
    if (needsInput) {
        return (
            <div className="flex flex-col gap-3 sm:gap-6">
                {header}
                <div className="bg-surface dark:bg-gray-900 border border-line dark:border-gray-800 rounded-2xl shadow-sm p-6 flex flex-col items-start gap-3">
                    <h2 className="text-lg font-bold text-ink dark:text-white">
                        Contanos qué sabés hacer
                    </h2>
                    <p className="text-sm text-body dark:text-gray-300 max-w-prose">
                        Todavía no guardaste tus habilidades, así que no hay nada con qué comparar.
                        Cargalas una vez y calculamos tu brecha frente a la vacante de referencia.
                    </p>
                    <Button size="sm" onClick={() => setInputOpen(true)}>
                        Cargar mis habilidades
                    </Button>
                </div>
                {dialog}
            </div>
        );
    }

    // `items: []` NO significa que el usuario cumpla todo: puede ser que no haya
    // datos comparables o que falte el contexto laboral. El texto se arma con
    // analysis.status y marketStatus para no afirmar algo falso.
    const emptyMessage =
        analysis?.marketStatus === 'missing'
            ? 'No hay una vacante de referencia disponible en este momento, así que no se puede calcular la brecha.'
            : analysis?.status === 'empty'
                ? 'No hay habilidades comparables todavía. Revisá las que cargaste o agregá las que falten.'
                : 'No se encontraron brechas calculables con las habilidades que tenés cargadas.';

    return (
        <div className="flex flex-col gap-3 sm:gap-6">
            {header}

            {items.length === 0 ? (
                <div className="bg-surface dark:bg-gray-900 border border-line dark:border-gray-800 rounded-2xl shadow-sm p-5">
                    <p className="text-sm text-body dark:text-gray-300">{emptyMessage}</p>
                </div>
            ) : (
                <>
                    {/* ── Radar + Puntos a Mejorar ────────────────────────────────── */}
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:gap-4">
                        <div className="flex-1 min-w-0 bg-surface dark:bg-gray-900 border border-line dark:border-gray-800 rounded-2xl shadow-sm p-5 flex flex-col gap-4">
                            <div>
                                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-primary">
                                    Comparativa de mercado
                                </p>
                                <h2 className="text-lg font-bold text-ink dark:text-white">
                                    Tu perfil frente al objetivo
                                </h2>
                            </div>
                            <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                                <SkillsRadar
                                    skills={radarData}
                                    size={220}
                                    max={SKILL_SCALE_MAX}
                                    formatValue={levelLabel}
                                />
                                <div className="flex gap-4 text-sm text-body dark:text-gray-300 sm:flex-col">
                                    <span className="flex items-center gap-2">
                                        <span className="w-4 h-4 rounded bg-primary/30 border border-primary" /> Tu Perfil
                                    </span>
                                    <span className="flex items-center gap-2">
                                        <span className="w-4 h-4 rounded bg-slate-300 border border-slate-400" /> Mercado Objetivo
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="lg:w-96 lg:shrink-0 bg-gradient-to-b from-primary-tint to-surface dark:from-primary/10 dark:to-gray-900 border border-line dark:border-gray-800 rounded-2xl shadow-sm p-5 flex flex-col gap-4">
                            <div>
                                <h2 className="text-xl font-bold text-ink dark:text-white">
                                    Puntos a Mejorar
                                </h2>
                                <p className="text-sm text-muted">Habilidades por mejorar</p>
                            </div>
                            <ol className="flex flex-col gap-3">
                                {/* El fondo se aclara al bajar en la lista, para que la brecha
                                    mayor sea la que más pesa visualmente, como en el mockup. */}
                                {gaps.map((g, i) => (
                                    <li
                                        key={g.skillName}
                                        className="flex items-center justify-between gap-3 rounded-lg border-l-4 border-primary bg-surface dark:bg-gray-800/60 px-4 py-3 shadow-sm"
                                        style={{ backgroundColor: i < 3 ? `rgba(37, 99, 235, ${0.10 - i * 0.035})` : undefined }}
                                    >
                                        <span className="flex min-w-0 flex-col">
                                            <span className="flex items-center gap-2 min-w-0">
                                                <span className="text-sm font-bold text-primary shrink-0">{i + 1}.</span>
                                                <span className="text-sm font-semibold text-ink dark:text-gray-100 truncate">
                                                    {g.skillName}
                                                </span>
                                            </span>
                                            <span className="pl-5 text-[11px] text-muted">
                                                {levelLabel(g.userLevel)} → {levelLabel(g.marketLevel)}
                                            </span>
                                        </span>
                                        {/* Pasos ordinales, no porcentaje: de Principiante a Avanzado
                                            son dos niveles, no un 50 %. */}
                                        <span className="shrink-0 text-xs font-medium text-muted">
                                            {g.deficitSteps} {g.deficitSteps === 1 ? 'nivel' : 'niveles'}
                                        </span>
                                    </li>
                                ))}
                            </ol>
                        </div>
                    </div>

                    {/* ── Cursos de Mejora ─────────────────────────────────────────── */}
                    <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                                <span className="w-1 h-5 rounded-full bg-primary shrink-0" />
                                <h2 className="text-lg font-bold text-ink dark:text-white">Cursos de Mejora</h2>
                            </div>
                            {allCourses.length > COURSES_PREVIEW && (
                                <Button variant="secondary" size="sm" onClick={() => setCoursesOpen(true)}>
                                    Ver más
                                </Button>
                            )}
                        </div>

                        {allCourses.length === 0 ? (
                            <p className="text-sm text-muted">No hay cursos recomendados por ahora.</p>
                        ) : (
                            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
                                {allCourses.slice(0, COURSES_PREVIEW).map(course => (
                                    <CourseCard key={course.id} course={course} />
                                ))}
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* ── No comparables ──────────────────────────────────────────────── */}
            {unresolved.length > 0 && (
                <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                        <span className="w-1 h-5 rounded-full bg-slate-400 shrink-0" />
                        <h2 className="text-lg font-bold text-ink dark:text-white">
                            Sin comparar
                        </h2>
                        <span className="rounded-full bg-canvas px-2 py-0.5 text-[11px] font-medium text-muted dark:bg-gray-800">
                            {unresolved.length}
                        </span>
                    </div>
                    <p className="text-sm text-muted">
                        Estas habilidades no entraron en el cálculo de la brecha.
                    </p>
                    <ul className="grid gap-2 sm:grid-cols-2">
                        {unresolved.map(u => (
                            <li
                                key={u.skillName}
                                className="flex items-start gap-2 rounded-xl border border-line bg-surface px-3 py-2.5 dark:border-gray-800 dark:bg-gray-900"
                            >
                                <HelpCircle size={15} className="mt-0.5 shrink-0 text-muted" />
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-medium text-ink dark:text-gray-100">
                                        {u.skillName}
                                    </p>
                                    <p className="text-xs text-muted">
                                        {UNRESOLVED_REASON_LABEL[u.reason] ?? 'No se pudo comparar'}
                                    </p>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Todos los cursos, en una ventana amplia con su propia paginación */}
            <GalleryDialog
                open={coursesOpen}
                title="Cursos de Mejora"
                description={`${allCourses.length} ${allCourses.length === 1 ? 'curso recomendado' : 'cursos recomendados'}`}
                items={allCourses}
                perPage={COURSES_PER_PAGE}
                onClose={() => setCoursesOpen(false)}
                keyOf={course => course.id}
                renderItem={course => <CourseCard course={course} />}
            />

            {dialog}
        </div>
    );
}
