import Card, { CardHeader, CardBody } from '../components/ui/Card';
import Button from '../components/ui/Button';
import CVCard from '../components/ui/CVCard';
import SkillsRadar from '../components/ui/SkillsRadar';
import { PlusCircle, Briefcase, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { CV, JobOffer, SkillGapItem } from '../types/models';
import Badge from '../components/ui/Badge';

// ── Datos de ejemplo ──────────────────────────────────────────────────────────
const MOCK_CVS: CV[] = [
    {
        id: '1', userId: 'u1', title: 'CV Desarrollador Frontend',
        templateId: 't1',
        createdAt: '2026-09-01T10:00:00Z',
        updatedAt: '2026-09-20T15:30:00Z',
        personalInfo: {} as CV['personalInfo'],
        workExperiences: [], education: [], skills: [], languages: [],
    },
    {
        id: '2', userId: 'u1', title: 'CV Diseñador UX',
        templateId: 't2',
        createdAt: '2026-08-15T09:00:00Z',
        updatedAt: '2026-09-18T11:00:00Z',
        personalInfo: {} as CV['personalInfo'],
        workExperiences: [], education: [], skills: [], languages: [],
    },
    {
        id: '3', userId: 'u1', title: 'CV Pasantía',
        templateId: 't1',
        createdAt: '2026-07-01T08:00:00Z',
        updatedAt: '2026-09-10T09:00:00Z',
        personalInfo: {} as CV['personalInfo'],
        workExperiences: [], education: [], skills: [], languages: [],
    },
];

const MOCK_JOBS: JobOffer[] = [
    {
        id: 'j1', title: 'Frontend Developer', company: 'TechCorp CR',
        location: 'San José, CR', modality: 'hybrid', type: 'full-time',
        sector: 'Tecnología', description: '', requirements: [],
        matchScore: 92, postedAt: '2026-09-20T00:00:00Z',
    },
    {
        id: 'j2', title: 'UX Designer Intern', company: 'StartupLab',
        location: 'Remoto', modality: 'remote', type: 'internship',
        sector: 'Diseño', description: '', requirements: [],
        matchScore: 78, postedAt: '2026-09-19T00:00:00Z',
    },
    {
        id: 'j3', title: 'React Developer', company: 'GlobalSoft',
        location: 'Heredia, CR', modality: 'on-site', type: 'part-time',
        sector: 'Tecnología', description: '', requirements: [],
        matchScore: 65, postedAt: '2026-09-18T00:00:00Z',
    },
];

const MOCK_SKILLS: SkillGapItem[] = [
    { name: 'React',      userLevel: 85, marketLevel: 90 },
    { name: 'TypeScript', userLevel: 70, marketLevel: 85 },
    { name: 'Node.js',    userLevel: 60, marketLevel: 75 },
    { name: 'SQL',        userLevel: 55, marketLevel: 70 },
    { name: 'Docker',     userLevel: 40, marketLevel: 65 },
];

const modalityLabel: Record<JobOffer['modality'], string> = {
    'remote':  'Remoto',
    'on-site': 'Presencial',
    'hybrid':  'Híbrido',
};

export default function DashboardPage() {
    const navigate = useNavigate();

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
                {/* Botón visible solo en desktop */}
                <Button onClick={() => navigate('/cvs/new')} className="hidden sm:inline-flex">
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
                            {/* 3 columnas siempre — tarjetas pequeñas en mobile */}
                            <div className="grid grid-cols-3 gap-2 sm:gap-4">
                                {MOCK_CVS.map(cv => (
                                    <CVCard key={cv.id} cv={cv} onClick={() => navigate(`/cvs/${cv.id}`)} />
                                ))}
                            </div>
                        </CardBody>
                    </Card>
                </div>

                {/* Botón "Crear CV" en mobile — va debajo de los CVs, encima del radar */}
                <Button
                    onClick={() => navigate('/cvs/new')}
                    className="sm:hidden w-full"
                >
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
                            <div className="flex items-start gap-3 lg:flex-col">
                                <div className="shrink-0">
                                    <SkillsRadar skills={MOCK_SKILLS} size={120} />
                                </div>
                                <div className="flex flex-col gap-1 flex-1 min-w-0">
                                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                                        Habilidades por mejorar
                                    </p>
                                    {MOCK_SKILLS.filter(s => s.userLevel < s.marketLevel).map(s => (
                                        <div key={s.name} className="flex items-center justify-between gap-1 text-xs">
                                            <span className="text-gray-700 dark:text-gray-300 truncate">{s.name}</span>
                                            <span className="text-amber-500 font-medium shrink-0">{s.userLevel}%</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
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
                    {/* Mobile: lista compacta. Desktop: cards en 3 columnas */}
                    <div className="flex flex-col divide-y divide-gray-100 dark:divide-gray-800 sm:hidden">
                        {MOCK_JOBS.map(job => (
                            <div
                                key={job.id}
                                onClick={() => navigate(`/jobs/${job.id}`)}
                                className="flex items-center gap-3 py-2.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 -mx-1 px-1 rounded-lg transition-colors"
                            >
                                <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
                                    <Briefcase size={14} className="text-gray-400" />
                                </div>
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
                                    <span className="shrink-0 text-[10px] font-bold text-[#2F7FD4]">
                    {job.matchScore}% match
                  </span>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Desktop: cards en grid */}
                    <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {MOCK_JOBS.map(job => (
                            <div
                                key={job.id}
                                onClick={() => navigate(`/jobs/${job.id}`)}
                                className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 flex flex-col gap-3 hover:shadow-md hover:border-[#2F7FD4] dark:hover:border-[#2F7FD4] transition-all cursor-pointer"
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
                                            <Briefcase size={18} className="text-gray-400" />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">{job.title}</h4>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">{job.company}</p>
                                        </div>
                                    </div>
                                    {job.matchScore !== undefined && (
                                        <span className="shrink-0 text-xs font-bold text-[#2F7FD4] bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-lg">
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
                </CardBody>
            </Card>

        </div>
    );
}