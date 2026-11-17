import { useLocale } from '../../i18n/LocaleContext';
import { formatMessage } from '../../i18n/formatMessage';
import { MapPin } from 'lucide-react';
import type { JobOffer } from '../../types/models';
import { CompanyLogo } from './Avatar';
import Badge from './Badge';
import Button from './Button';

interface JobCardProps {
    job: JobOffer;
    onViewDetails?: () => void;
    preview?: boolean;
}

export default function JobCard({ job, onViewDetails, preview = false }: JobCardProps) {
    const { locale, t } = useLocale();
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
            {job.matchScore}% {t.jobs.match}
          </span>
                )}
            </div>

            {/* Detalles */}
            <div className="flex flex-wrap gap-2">
                {t.modality[job.modality] && <Badge label={t.modality[job.modality]} variant="info" />}
                {job.typeProvided !== false && t.availability[job.type] && <Badge label={t.availability[job.type]} variant="gray" />}
                <div className="flex items-center gap-1 text-xs text-gray-400">
                    <MapPin size={12} />
                    <span>{job.location}</span>
                </div>
            </div>

            {preview && <>
                {job.description && <p className="text-xs text-muted line-clamp-2">{job.description}</p>}
                {(job.skills?.length || job.requirements?.length) ? <p className="text-xs text-muted line-clamp-2">{(job.skills?.length ? job.skills : job.requirements)?.slice(0, 3).join(' · ')}</p> : null}
                {job.postedAt && !Number.isNaN(Date.parse(job.postedAt)) && <p className="text-[11px] text-muted">{formatMessage(t.offerPicker.publishedOn, { date: new Date(job.postedAt).toLocaleDateString(locale === 'en' ? 'en-US' : 'es-CR') })}</p>}
            </>}

            <Button variant="secondary" size="sm" onClick={onViewDetails}>
                {t.offerPicker.viewDetails}
            </Button>
        </div>
    );
}
