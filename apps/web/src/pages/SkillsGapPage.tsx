import { useEffect, useMemo, useState } from 'react';
import { ExternalLink, GraduationCap } from 'lucide-react';
import SkillsRadar from '../components/ui/SkillsRadar';
import { ErrorMessage, LoadingSpinner } from '../components/ui/Feedback';
import { skillsGapService } from '../services/skillsGapService';
import type { SkillGapApiItem } from '../services/skillsGapService';

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
                if (!cancelled) setItems(res.items);
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
            <h1 className="text-lg font-bold text-gray-900 dark:text-white sm:text-2xl">
                Análisis de Brecha
            </h1>

            {items.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    Todavía no hay un análisis de brecha disponible.
                </p>
            ) : (
                <>
                    {/* ── Radar + Puntos a Mejorar ────────────────────────────────── */}
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:gap-4">
                        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 flex flex-col items-center gap-2 lg:w-80 shrink-0">
                            <h2 className="text-sm font-semibold text-gray-900 dark:text-white self-start">
                                Tu Perfil vs Mercado Objetivo
                            </h2>
                            <SkillsRadar skills={radarData} size={220} />
                            <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                                <span className="flex items-center gap-1">
                                    <span className="w-2.5 h-2.5 rounded-full bg-[#2F7FD4]" /> Tu Perfil
                                </span>
                                <span className="flex items-center gap-1">
                                    <span className="w-2.5 h-2.5 rounded-full bg-blue-300" /> Mercado Objetivo
                                </span>
                            </div>
                        </div>

                        <div className="flex-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 flex flex-col gap-3">
                            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                                Puntos a Mejorar
                            </h2>
                            {gaps.length === 0 ? (
                                <p className="text-xs text-gray-400">
                                    Tu perfil ya alcanza el nivel del mercado en todas las habilidades evaluadas.
                                </p>
                            ) : (
                                <div className="flex flex-col gap-2">
                                    {gaps.map(g => (
                                        <div key={g.skillName} className="flex items-center justify-between gap-2 text-sm">
                                            <span className="text-gray-700 dark:text-gray-300">{g.skillName}</span>
                                            <span className="text-amber-500 font-medium shrink-0">-{g.gap}% brecha</span>
                                        </div>
                                    ))}
                                </div>
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
                                            <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
                                                <GraduationCap size={16} className="text-gray-400" />
                                            </div>
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
                                            className="mt-auto inline-flex items-center justify-center gap-1 text-xs font-medium text-[#2F7FD4] border border-[#2F7FD4] rounded-lg px-2 py-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
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