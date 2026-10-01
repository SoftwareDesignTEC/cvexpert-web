import { useEffect, useMemo, useState } from 'react';
import { ExternalLink, GraduationCap } from 'lucide-react';
import SkillsRadar from '../components/ui/SkillsRadar';
import { ErrorMessage, LoadingSpinner } from '../components/ui/Feedback';
import PageHeader from '../components/ui/PageHeader';
import { skillsGapService } from '../services/skillsGapService';
import type { SkillGapApiItem } from '../services/skillsGapService';

// El logo de la plataforma viene del APIM; si falta o la URL falla, se usa el icono.
function CoursePlatformLogo({ logoUrl, platform }: { logoUrl?: string; platform: string }) {
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

export default function SkillsGapPage() {
    const [items, setItems] = useState<SkillGapApiItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [reloadKey, setReloadKey] = useState(0); // sube al presionar "Reintentar"

    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await skillsGapService.getAll();
                if (!cancelled) setItems(res.items ?? []);
            } catch (err) {
                if (!cancelled) {
                    setError(err instanceof Error ? err.message : 'No se pudo cargar el análisis de brecha');
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        load();

        return () => { cancelled = true; };
    }, [reloadKey]);

    // SkillsRadar espera { name, userLevel, marketLevel } (SkillGapItem) — se adapta
    // acá el `skillName` de APIM sin tocar ese componente, porque también lo usa el Dashboard.
    const radarData = useMemo(
        () => items.map(i => ({ name: i.skillName, userLevel: i.userLevel, marketLevel: i.marketLevel })),
        [items],
    );

    // Habilidades donde el mercado pide más de lo que tiene el usuario, ordenadas por brecha
    const gaps = useMemo(
        () => items
            .map(i => ({ skillName: i.skillName, gap: i.marketLevel - i.userLevel }))
            .filter(i => i.gap > 0)
            .sort((a, b) => b.gap - a.gap),
        [items],
    );

    // Todos los cursos recomendados, con la habilidad a la que ayudan
    const allCourses = useMemo(
        () => items.flatMap(i => i.courses.map(c => ({ ...c, skillName: i.skillName }))),
        [items],
    );

    if (loading) return <LoadingSpinner />;
    if (error) return <ErrorMessage message={error} onRetry={() => setReloadKey(k => k + 1)} />;

    return (
        <div className="flex flex-col gap-3 sm:gap-6">
            <PageHeader
                eyebrow="Crecimiento profesional"
                title="Análisis de Brecha"
                action={
                    <span className="inline-block rounded-full border border-line dark:border-gray-800 bg-surface dark:bg-gray-900 px-4 py-2 text-sm text-body dark:text-gray-300 shadow-sm">
                        Actualizado hoy
                    </span>
                }
            />

            {items.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    Todavía no hay un análisis de brecha disponible.
                </p>
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
                                <SkillsRadar skills={radarData} size={220} />
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
                            {gaps.length === 0 ? (
                                <p className="text-sm text-muted">
                                    Tu perfil ya alcanza el nivel del mercado en todas las habilidades evaluadas.
                                </p>
                            ) : (
                                <ol className="flex flex-col gap-3">
                                    {/* El fondo se aclara al bajar en la lista, para que la brecha
                                        mayor sea la que más pesa visualmente, como en el mockup. */}
                                    {gaps.map((g, i) => (
                                        <li
                                            key={g.skillName}
                                            className="flex items-center justify-between gap-3 rounded-lg border-l-4 border-primary bg-surface dark:bg-gray-800/60 px-4 py-3 shadow-sm"
                                            style={{ backgroundColor: i < 3 ? `rgba(37, 99, 235, ${0.10 - i * 0.035})` : undefined }}
                                        >
                                            <span className="flex items-center gap-2 min-w-0">
                                                <span className="text-sm font-bold text-primary shrink-0">{i + 1}.</span>
                                                <span className="text-sm font-semibold text-ink dark:text-gray-100 truncate">
                                                    {g.skillName}
                                                </span>
                                            </span>
                                            <span className="text-xs font-medium text-muted shrink-0">
                                                -{g.gap}% brecha
                                            </span>
                                        </li>
                                    ))}
                                </ol>
                            )}
                        </div>
                    </div>

                    {/* ── Cursos de Mejora ─────────────────────────────────────────── */}
                    <div className="flex flex-col gap-3">
                        <h2 className="text-base font-semibold text-gray-900 dark:text-white sm:text-lg">
                            Cursos de Mejora
                        </h2>

                        {allCourses.length === 0 ? (
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                No hay cursos recomendados por ahora.
                            </p>
                        ) : (
                            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                                {allCourses.map(course => (
                                    <div
                                        key={course.id}
                                        className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-3 flex flex-col gap-2"
                                    >
                                        <div className="flex items-center gap-2">
                                            <CoursePlatformLogo logoUrl={course.logoUrl} platform={course.platform} />
                                            <span className="text-[11px] text-gray-400 truncate">{course.platform}</span>
                                        </div>

                                        <h3 className="text-xs font-semibold text-gray-900 dark:text-white line-clamp-2">
                                            {course.title}
                                        </h3>
                                        <p className="text-[11px] text-gray-500 dark:text-gray-400">
                                            {course.durationHours} h · {course.skillName}
                                        </p>

                                        {/* Costo aún no viene en la respuesta de APIM — se omite en vez de inventarlo */}
                                        <a
                                            href={course.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="mt-auto inline-flex items-center justify-center gap-1 text-xs font-medium text-primary border border-primary rounded-lg px-2 py-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                                        >
                                            Ver Curso <ExternalLink size={12} />
                                        </a>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}