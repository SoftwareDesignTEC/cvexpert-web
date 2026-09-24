import Card, { CardHeader, CardBody } from '../components/ui/Card';
import Button from '../components/ui/Button';
import CVCard from '../components/ui/CVCard';
import JobCard from '../components/ui/JobCard';
import { PlusCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { CV, JobOffer } from '../types/models';

// ── Datos de ejemplo — se reemplazan por llamadas reales al APIM ─────────────
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

export default function DashboardPage() {
    const navigate = useNavigate();

    return (
        <div className="flex flex-col gap-6">
            {/* Bienvenida */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Panel Principal</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Bienvenido de vuelta — aquí está tu resumen
                    </p>
                </div>
                <Button onClick={() => navigate('/cvs/new')}>
                    <PlusCircle size={16} />
                    Crear CV con IA
                </Button>
            </div>

            {/* CVs recientes */}
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {MOCK_CVS.map(cv => (
                            <CVCard key={cv.id} cv={cv} onClick={() => navigate(`/cvs/${cv.id}`)} />
                        ))}
                    </div>
                </CardBody>
            </Card>

            {/* Ofertas recomendadas */}
            <Card>
                <CardHeader
                    title="Recomendación de Ofertas Laborales"
                    action={
                        <Button variant="secondary" size="sm" onClick={() => navigate('/jobs')}>
                            Ver todas las ofertas
                        </Button>
                    }
                />
                <CardBody>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {MOCK_JOBS.map(job => (
                            <JobCard key={job.id} job={job} onViewDetails={() => navigate(`/jobs/${job.id}`)} />
                        ))}
                    </div>
                </CardBody>
            </Card>
        </div>
    );
}
