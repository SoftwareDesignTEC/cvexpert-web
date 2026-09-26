import Card, { CardHeader, CardBody } from '../components/ui/Card';
import Button from '../components/ui/Button';
import CVCard from '../components/ui/CVCard';
import JobCard from '../components/ui/JobCard';
import SkillsRadar from '../components/ui/SkillsRadar';
import { PlusCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { CV, JobOffer, SkillGapItem } from '../types/models';

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

export default function DashboardPage() {
    const navigate = useNavigate();

    return (
        <div className="flex flex-col gap-4 sm:gap-6">

            {/* ── Bienvenida ─────────────────────────────────────────────────── */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white sm:text-2xl">
                        Panel Principal
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        ¡Bienvenido! Aquí está tu resumen...
                    </p>
                </div>
                <Button onClick={() => navigate('/cvs/new')} className="w-full sm:w-auto">
                    <PlusCircle size={16} />
                    Crear CV con IA
                </Button>
            </div>

            {/* ── Fila 1: CVs + Radar (side-by-side en desktop, stacked en mobile) ── */}
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-6">

                {/* CVs — ocupa el espacio disponible */}
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
                            {/* 2 col en mobile → 3 col en desktop */}
                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                                {MOCK_CVS.map(cv => (
                                    <CVCard key={cv.id} cv={cv} onClick={() => navigate(`/cvs/${cv.id}`)} />
                                ))}
                            </div>
                        </CardBody>
                    </Card>
                </div>

                {/* Radar — ancho fijo en desktop, full-width en mobile */}
                <div className="w-full lg:w-64 shrink-0">
                    <Card>
                        <CardHeader
                            title="Brecha de Habilidades"
                            action={
                                <Button variant="secondary" size="sm" onClick={() => navigate('/skills-gap')}>
                                    Ver análisis
                                </Button>
                            }
                        />
                        <CardBody>
                            {/* En mobile: radar + skills en fila. En desktop: columna */}
                            <div className="flex items-start gap-4 lg:flex-col">
                                <div className="shrink-0">
                                    <SkillsRadar skills={MOCK_SKILLS} size={130} />
                                </div>
                                <div className="flex flex-col gap-1 min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
                                        <span className="w-2.5 h-2.5 rounded-sm bg-[#2F7FD4]/40 border border-[#2F7FD4] shrink-0" />
                                        Tu nivel
                                    </div>
                                    <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
                                        <span className="w-2.5 h-2.5 rounded-sm bg-[#63B3ED]/30 border border-[#63B3ED] shrink-0" />
                                        Mercado
                                    </div>
                                    {MOCK_SKILLS.map(s => (
                                        <div key={s.name} className="flex items-center justify-between gap-1 text-xs">
                                            <span className="text-gray-700 dark:text-gray-300 truncate">{s.name}</span>
                                            <span className={`font-medium shrink-0 ${
                                                s.userLevel >= s.marketLevel
                                                    ? 'text-green-500 dark:text-green-400'
                                                    : 'text-amber-500'
                                            }`}>
                        {s.userLevel}%
                      </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </CardBody>
                    </Card>
                </div>

            </div>

            {/* ── Fila 2: Ofertas laborales (full-width) ─────────────────────── */}
            <Card>
                <CardHeader
                    title="Recomendación de Ofertas Laborales"
                    action={
                        <Button variant="secondary" size="sm" onClick={() => navigate('/jobs')}>
                            Ver todas
                        </Button>
                    }
                />
                <CardBody>
                    {/* 1 col en mobile → 2 en sm → 3 en lg */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {MOCK_JOBS.map(job => (
                            <JobCard
                                key={job.id}
                                job={job}
                                onViewDetails={() => navigate(`/jobs/${job.id}`)}
                            />
                        ))}
                    </div>
                </CardBody>
            </Card>

        </div>
    );
}