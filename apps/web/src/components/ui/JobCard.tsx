import { MapPin } from 'lucide-react';
import type { JobOffer } from '../../types/models';
import { CompanyLogo } from './Avatar';
import Badge from './Badge';
import Button from './Button';

interface JobCardProps {
    job: JobOffer;
    onViewDetails?: () => void;
}

const modalityLabel: Record<JobOffer['modality'], string> = {
    'remote':   'Remoto',
    'on-site':  'Presencial',
    'hybrid':   'Híbrido',
};

const typeLabel: Record<JobOffer['type'], string> = {
    'full-time':  'Tiempo completo',
    'part-time':  'Medio tiempo',
    'freelance':  'Freelance',
    'internship': 'Pasantía',
};

export default function JobCard({ job, onViewDetails }: JobCardProps) {
    return (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 flex flex-col gap-3">
            {/* Header: logo + empresa + match */}
            <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                    {/* Logo placeholder */}
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

                {/* % de compatibilidad */}
                {job.matchScore !== undefined && (
                    <span className="shrink-0 text-xs font-bold text-primary bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-lg">
            {job.matchScore}% match
          </span>
                )}
            </div>

            {/* Detalles */}
            <div className="flex flex-wrap gap-2">
                <Badge label={modalityLabel[job.modality]} variant="info" />
                <Badge label={typeLabel[job.type]} variant="gray" />
                <div className="flex items-center gap-1 text-xs text-gray-400">
                    <MapPin size={12} />
                    <span>{job.location}</span>
                </div>
            </div>

            <Button variant="secondary" size="sm" onClick={onViewDetails}>
                Ver detalles
            </Button>
        </div>
    );
}
