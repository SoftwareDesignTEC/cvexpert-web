import { useEffect, useState } from 'react';
import Card, { CardHeader, CardBody } from '../components/ui/Card';
import Button from '../components/ui/Button';
import CVCard from '../components/ui/CVCard';
import { CompanyLogo } from '../components/ui/Avatar';
import SkillsRadar from '../components/ui/SkillsRadar';
import { PlusCircle, MapPin, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { CV, JobOffer } from '../types/models';
import Badge from '../components/ui/Badge';
import { cvService } from '../services/cvService';
import { jobService } from '../services/otherServices';
import { skillsGapService } from '../services/skillsGapService';
import type { SkillGapApiItem } from '../services/skillsGapService';

const modalityLabel: Record<JobOffer['modality'], string> = {
    'remote':  'Remoto',
    'on-site': 'Presencial',
    'hybrid':  'Híbrido',
};

export default function DashboardPage() {
    const navigate = useNavigate();

    const [cvs, setCvs]         = useState<CV[]>([]);
    const [jobs, setJobs]       = useState<JobOffer[]>([]);
    const [loadingCvs, setLoadingCvs]   = useState(true);
    const [loadingJobs, setLoadingJobs] = useState(true);
    const [errorCvs, setErrorCvs]       = useState<string | null>(null);
    const [errorJobs, setErrorJobs]     = useState<string | null>(null);
    const [skills, setSkills]           = useState<SkillGapApiItem[]>([]);
    const [loadingSkills, setLoadingSkills] = useState(true);
    const [errorSkills, setErrorSkills]     = useState<string | null>(null);

    useEffect(() => {
        cvService.getAll({ page: 1, pageSize: 3 })
            .then(res => setCvs(res.items ?? []))
            .catch(() => setErrorCvs('No se pudieron cargar los currículums.'))
            .finally(() => setLoadingCvs(false));
    }, []);

    useEffect(() => {
        jobService.getAll({ page: 1, pageSize: 3 })
            .then(res => setJobs(res.items ?? []))
            .catch(() => setErrorJobs('No se pudieron cargar las ofertas.'))
            .finally(() => setLoadingJobs(false));
    }, []);

    useEffect(() => {
        skillsGapService.getAll()
            .then(res => setSkills(res.items ?? []))
            .catch(() => setErrorSkills('No se pudo cargar el análisis de brecha.'))
            .finally(() => setLoadingSkills(false));
    }, []);

    return (
        <div className="flex flex-col gap-3 sm:gap-6">

            {/* ── Bienvenida ─────────────────────────────────────────────────── */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-lg font-bold text-gray-900 dark:text-white sm:text-2xl">
                        Panel Principal
                    </h1>
                    <p className="text-xs text-gray-500 dark:text-gray-400 sm:text-sm">
                        ¡Bienvenido! Aquí está tu resumen...
                    </p>
                </div>
                <Button onClick={() => navigate('/cvs')} className="hidden sm:inline-flex">
                    <PlusCircle size={16} />
                    Crear CV con IA
                </Button>
            </div>

            {/* ── Fila 1: CVs + Radar ────────────────────────────────────────── */}
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:gap-6">

                {/* CVs */}
                <div className="flex-1 min-w-0">
                    <Card>
                        <CardHeader
                            title="Currículums Recientes"
                            action={
                                <Button variant="secondary" size="sm" onClick={() => navigate('/cvs')}>
                                    Ver todos
                                </Button>
                            }
                        />
                        <CardBody>
                            {loadingCvs ? (
                                <div className="flex items-center justify-center py-6 text-gray-400">
                                    <Loader2 size={20} className="animate-spin" />
                                </div>
                            ) : errorCvs ? (
                                <p className="text-xs text-red-500 text-center py-4">{errorCvs}</p>
                            ) : cvs.length === 0 ? (
                                <p className="text-xs text-gray-400 text-center py-4">No tienes currículums aún.</p>
                            ) : (
                                <div className="grid grid-cols-3 gap-2 sm:gap-4">
                                    {cvs.map(cv => (
                                        <CVCard key={cv.id} cv={cv} onClick={() => navigate(`/cvs/${cv.id}`)} />
                                    ))}
                                </div>
                            )}
                        </CardBody>
                    </Card>
                </div>

                {/* Botón "Crear CV" en mobile */}
                <Button onClick={() => navigate('/cvs')} className="sm:hidden w-full">
                    <PlusCircle size={16} />
                    Crear CV con IA
                </Button>

                {/* Radar */}
                <div className="w-full lg:w-80 shrink-0">
                    <Card>
                        <CardHeader
                            title="Análisis de Brecha"
                            action={
                                <Button variant="secondary" size="sm" onClick={() => navigate('/skills-gap')}>
                                    Ver análisis
                                </Button>
                            }
                        />
                        <CardBody>
                            {loadingSkills ? (
                                <div className="flex items-center justify-center py-6 text-gray-400">
                                    <Loader2 size={20} className="animate-spin" />
                                </div>
                            ) : errorSkills ? (
                                <p className="text-xs text-red-500 text-center py-4">{errorSkills}</p>
                            ) : skills.length === 0 ? (
                                <p className="text-xs text-gray-400 text-center py-4">Aún no hay análisis de brecha.</p>
                            ) : (
                                <div className="flex items-start gap-3 lg:flex-col">
                                    <div className="shrink-0">
                                        {/* SkillsRadar espera `name`; APIM devuelve `skillName` */}
                                        <SkillsRadar
                                            skills={skills.map(s => ({
                                                name: s.skillName,
                                                userLevel: s.userLevel,
                                                marketLevel: s.marketLevel,
                                            }))}
                                            size={120}
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1 flex-1 min-w-0">
                                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                                            Habilidades por mejorar
                                        </p>
                                        {skills.filter(s => s.userLevel < s.marketLevel).map(s => (
                                            <div key={s.skillName} className="flex items-center justify-between gap-1 text-xs">
                                                <span className="text-gray-700 dark:text-gray-300 truncate">{s.skillName}</span>
                                                <span className="text-amber-500 font-medium shrink-0">{s.userLevel}%</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </CardBody>
                    </Card>
                </div>

            </div>

            {/* ── Fila 2: Ofertas laborales ───────────────────────────────────── */}
            <Card>
                <CardHeader
                    title="Recomendación Ofertas Laborales"
                    action={
                        <Button variant="secondary" size="sm" onClick={() => navigate('/jobs')}>
                            Ver todas las ofertas
                        </Button>
                    }
                />
                <CardBody>
                    {loadingJobs ? (
                        <div className="flex items-center justify-center py-6 text-gray-400">
                            <Loader2 size={20} className="animate-spin" />
                        </div>
                    ) : errorJobs ? (
                        <p className="text-xs text-red-500 text-center py-4">{errorJobs}</p>
                    ) : (
                        <>
                            {/* Mobile: lista compacta */}
                            <div className="flex flex-col divide-y divide-gray-100 dark:divide-gray-800 sm:hidden">
                                {jobs.map(job => (
                                    <div
                                        key={job.id}
                                        onClick={() => navigate(`/jobs/${job.id}`)}
                                        className="flex items-center gap-3 py-2.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 -mx-1 px-1 rounded-lg transition-colors"
                                    >
                                        <CompanyLogo
                                            src={job.companyLogoUrl}
                                            name={job.company}
                                            className="w-8 h-8 rounded-lg bg-primary-tint text-primary text-[11px] dark:bg-gray-800"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">{job.title}</p>
                                            <div className="flex items-center gap-1 text-[10px] text-gray-400 mt-0.5">
                                                <span>{job.company}</span>
                                                <span>·</span>
                                                <MapPin size={9} />
                                                <span className="truncate">{job.location}</span>
                                            </div>
                                        </div>
                                        {job.matchScore !== undefined && (
                                            <span className="shrink-0 text-[10px] font-bold text-primary">
                                                {job.matchScore}% match
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Desktop: cards en grid */}
                            <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {jobs.map(job => (
                                    <div
                                        key={job.id}
                                        onClick={() => navigate(`/jobs/${job.id}`)}
                                        className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 flex flex-col gap-3 hover:shadow-md hover:border-primary dark:hover:border-primary transition-all cursor-pointer"
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex items-center gap-3">
                                                <CompanyLogo
                                                    src={job.companyLogoUrl}
                                                    name={job.company}
                                                    className="w-10 h-10 rounded-lg bg-primary-tint text-primary text-sm dark:bg-gray-800"
                                                />
                                                <div>
                                                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white">{job.title}</h4>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">{job.company}</p>
                                                </div>
                                            </div>
                                            {job.matchScore !== undefined && (
                                                <span className="shrink-0 text-xs font-bold text-primary bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-lg">
                                                    {job.matchScore}% match
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <Badge label={modalityLabel[job.modality]} variant="info" />
                                            <div className="flex items-center gap-1 text-xs text-gray-400">
                                                <MapPin size={12} />
                                                <span>{job.location}</span>
                                            </div>
                                        </div>
                                        <Button variant="secondary" size="sm" onClick={e => { e.stopPropagation(); navigate(`/jobs/${job.id}`); }}>
                                            Ver detalles
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </CardBody>
            </Card>

        </div>
    );
}