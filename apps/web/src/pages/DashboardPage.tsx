import { useNavigate } from 'react-router-dom';
import { FileText, Clock, MapPin, Briefcase } from 'lucide-react';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import SkillsRadar from '../components/ui/SkillsRadar';
import type { CV, JobOffer, SkillGapItem } from '../types/models';

// ── Datos de ejemplo ─────────────────────────────────────────────────────────
const MOCK_CVS: CV[] = [
    { id: '1', userId: 'u1', title: 'CV Desarrollador Frontend', templateId: 't1',
        createdAt: '2026-09-01T10:00:00Z', updatedAt: '2026-09-20T15:30:00Z',
        personalInfo: {} as CV['personalInfo'], workExperiences: [], education: [], skills: [], languages: [] },
    { id: '2', userId: 'u1', title: 'CV Diseñador UX', templateId: 't2',
        createdAt: '2026-08-15T09:00:00Z', updatedAt: '2026-09-18T11:00:00Z',
        personalInfo: {} as CV['personalInfo'], workExperiences: [], education: [], skills: [], languages: [] },
    { id: '3', userId: 'u1', title: 'CV Pasantía', templateId: 't1',
        createdAt: '2026-07-01T08:00:00Z', updatedAt: '2026-09-10T09:00:00Z',
        personalInfo: {} as CV['personalInfo'], workExperiences: [], education: [], skills: [], languages: [] },
];

const MOCK_JOBS: JobOffer[] = [
    { id: 'j1', title: 'Frontend Developer', company: 'TechCorp CR',
        location: 'San José, CR', modality: 'hybrid', type: 'full-time',
        sector: 'Tecnología', description: '', requirements: [],
        matchScore: 92, postedAt: '2026-09-20T00:00:00Z' },
    { id: 'j2', title: 'UX Designer Intern', company: 'StartupLab',
        location: 'Remoto', modality: 'remote', type: 'internship',
        sector: 'Diseño', description: '', requirements: [],
        matchScore: 78, postedAt: '2026-09-19T00:00:00Z' },
    { id: 'j3', title: 'React Developer', company: 'GlobalSoft',
        location: 'Heredia, CR', modality: 'on-site', type: 'part-time',
        sector: 'Tecnología', description: '', requirements: [],
        matchScore: 65, postedAt: '2026-09-18T00:00:00Z' },
];

const MOCK_SKILLS: SkillGapItem[] = [
    { name: 'A', userLevel: 80, marketLevel: 90 },
    { name: 'B', userLevel: 60, marketLevel: 85 },
    { name: 'C', userLevel: 70, marketLevel: 75 },
    { name: 'D', userLevel: 50, marketLevel: 80 },
    { name: 'E', userLevel: 65, marketLevel: 70 },
    { name: 'F', userLevel: 75, marketLevel: 65 },
    { name: 'G', userLevel: 55, marketLevel: 60 },
];

const modalityLabel: Record<JobOffer['modality'], string> = {
    remote: 'Remoto', 'on-site': 'Presencial', hybrid: 'Híbrido',
};

export default function DashboardPage() {
    const navigate = useNavigate();

    return (
        <div className="flex flex-col gap-2 h-full">

            {/* Fila superior: CVs + Radar */}
            <div className="flex gap-4 flex-1">

                {/* Panel izquierdo — CVs recientes + botón crear */}
                <div className="flex-[2] bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-3 flex flex-col gap-2">
                    <h2 className="text-base font-semibold text-gray-900 dark:text-white">Currículums Recientes</h2>

                    {/* 3 cards de CV */}
                    <div className="grid grid-cols-3 gap-3 flex-1">
                        {MOCK_CVS.map(cv => (
                            <div
                                key={cv.id}
                                onClick={() => navigate(`/cvs/${cv.id}`)}
                                className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 flex flex-col gap-2 hover:border-[#2F7FD4] hover:shadow-sm transition-all cursor-pointer"
                            >
                                {/* Preview */}
                                <div className="w-full aspect-[4/3] bg-gray-100 dark:bg-gray-800 rounded flex items-center justify-center">
                                    <FileText size={28} className="text-gray-300 dark:text-gray-600" />
                                </div>
                                {/* Info */}
                                <p className="text-xs font-semibold text-gray-800 dark:text-white truncate">{cv.title}</p>
                                <div className="flex items-center gap-1 text-[10px] text-gray-400">
                                    <Clock size={10} />
                                    <span>{new Date(cv.updatedAt).toLocaleDateString('es-CR', { day: '2-digit', month: 'short' })}</span>
                                </div>
                                {/* Botones */}
                                <div className="flex gap-1 mt-auto">
                                    <Button size="sm" className="flex-1 text-[10px] py-1">Ver/Editar</Button>
                                    <Button size="sm" variant="secondary" className="flex-1 text-[10px] py-1">Descargar</Button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Botón crear CV */}
                    <div className="bg-[#2F7FD4]/10 dark:bg-[#2F7FD4]/20 rounded-xl p-3 flex items-center justify-between gap-3">
                        <span className="text-sm font-semibold text-[#1A3A6B] dark:text-blue-300">Crear Nuevo Currículum</span>
                        <div className="flex gap-2">
                            <Button size="sm" onClick={() => navigate('/cvs/new')}>IA</Button>
                            <Button size="sm" variant="secondary" onClick={() => navigate('/templates')}>Offline</Button>
                        </div>
                    </div>
                </div>

                {/* Panel derecho — Análisis de Habilidades */}
                <div className="flex-1 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 flex flex-col gap-3">
                    <h2 className="text-base font-semibold text-gray-900 dark:text-white">Análisis de Habilidades</h2>
                    <div className="flex-1 flex items-center justify-center">
                        <SkillsRadar skills={MOCK_SKILLS} size={220} />
                    </div>
                    <Button variant="secondary" size="sm" onClick={() => navigate('/skills-gap')}>
                        Ver Áreas de Mejora
                    </Button>
                </div>

            </div>

            {/* Fila inferior — Ofertas (lista, sin scroll, solo 3) */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-base font-semibold text-gray-900 dark:text-white">Recomendación Ofertas Laborales</h2>
                    <Button variant="secondary" size="sm" onClick={() => navigate('/jobs')}>
                        Ver todas las Ofertas
                    </Button>
                </div>

                <div className="flex flex-col divide-y divide-gray-100 dark:divide-gray-800">
                    {MOCK_JOBS.map(job => (
                        <div key={job.id} className="flex items-center gap-4 py-3">
                            {/* Logo */}
                            <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
                                <Briefcase size={18} className="text-gray-400" />
                            </div>
                            {/* Info */}
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-900 dark:text-white">{job.company}</p>
                                <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                                    <span>{job.title}</span>
                                    <Badge label={modalityLabel[job.modality]} variant="info" />
                                    <div className="flex items-center gap-1">
                                        <MapPin size={10} />
                                        <span>{job.location}</span>
                                    </div>
                                </div>
                            </div>
                            {/* Match + botón */}
                            {job.matchScore !== undefined && (
                                <span className="text-sm font-bold text-green-600 dark:text-green-400 shrink-0">
                  {job.matchScore}% de compatibilidad
                </span>
                            )}
                            <Button size="sm" variant="secondary" onClick={() => navigate(`/jobs/${job.id}`)}>
                                Ver detalles
                            </Button>
                        </div>
                    ))}
                </div>
            </div>

        </div>
    );
}
