import { useState } from 'react';
import { ExternalLink, GraduationCap } from 'lucide-react';
import type { Course } from '../../services/courseService';
import { publishedCourse, validCourse } from '../../services/courseService';
import { useLocale } from '../../i18n/LocaleContext';

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



export default function CourseCard({ course }: { course: Course & { skillName?: string } }) {
    // Antes del descarte: un hook no puede quedar después de un return.
    const { t } = useLocale();

    if (!validCourse(course) || !publishedCourse(course)) return null;
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
                    {course.isPaid ? t.courses.pricePaid : t.courses.priceFree}
                </span>
            </div>

            <h3 className="text-xs font-semibold text-ink dark:text-white line-clamp-2">
                {course.title}
            </h3>
            <p className="text-[11px] text-muted">{meta}</p>
            {course.skills.length > 0 && <p className="text-[11px] text-muted break-words">{t.courses.skills}: {course.skills.join(' · ')}</p>}

            <a
                href={course.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Ver curso ${course.title} en ${course.platform}`}
                className="mt-auto inline-flex items-center justify-center gap-1 text-xs font-medium text-primary border border-primary rounded-lg px-2 py-1.5 hover:bg-primary-tint dark:hover:bg-primary/10 transition-colors"
            >
                {t.courses.viewCourse} <ExternalLink size={12} />
            </a>
        </div>
    );
}


