import { Briefcase, CalendarDays, MapPin, Percent } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';
import { CompanyLogo } from './Avatar';
import type { JobOffer } from '../../types/models';

const modalityLabel: Record<JobOffer['modality'], string> = {
    'remote':  'Remoto',
    'on-site': 'Presencial',
    'hybrid':  'Híbrido',
};

const typeLabel: Record<JobOffer['type'], string> = {
    'full-time':  'Tiempo completo',
    'part-time':  'Medio tiempo',
    'freelance':  'Freelance',
    'internship': 'Práctica profesional',
};

function formatDate(iso?: string) {
    if (!iso) return null;
    const d = new Date(iso);
    return Number.isNaN(d.getTime())
        ? null
        : d.toLocaleDateString('es-CR', { day: '2-digit', month: 'long', year: 'numeric' });
}

// Fila de dato con icono, sólo si hay algo que mostrar
function Fact({ icon: Icon, children }: { icon: typeof MapPin; children: React.ReactNode }) {
    return (
        <span className="inline-flex items-center gap-1.5 text-sm text-body dark:text-gray-300">
            <Icon size={14} className="text-muted shrink-0" />
            {children}
        </span>
    );
}

function TagList({ title, values }: { title: string; values: string[] }) {
    if (values.length === 0) return null;
    return (
        <div className="flex flex-col gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted">{title}</h3>
            <div className="flex flex-wrap gap-2">
                {values.map(v => (
                    <span
                        key={v}
                        className="rounded-full bg-primary-soft px-3 py-1 text-xs font-medium text-primary-dark dark:bg-primary/15 dark:text-primary"
                    >
                        {v}
                    </span>
                ))}
            </div>
        </div>
    );
}

export default function JobDetailDialog({
    job, onClose,
}: {
    job: JobOffer | null;
    onClose: () => void;
}) {
    const posted = formatDate(job?.postedAt);

    return (
        <Modal
            open={job !== null}
            size="lg"
            title={job?.title ?? ''}
            description={job?.company}
            onClose={onClose}
        >
            {job && (
                <div className="flex flex-col gap-5">

                    <div className="flex items-center gap-3">
                        <CompanyLogo
                            src={job.companyLogoUrl}
                            name={job.company}
                            className="w-14 h-14 rounded-xl bg-primary-tint text-primary dark:bg-gray-800"
                        />
                        <div className="flex flex-wrap gap-x-4 gap-y-1 min-w-0">
                            <Fact icon={MapPin}>{job.location}</Fact>
                            <Fact icon={Briefcase}>
                                {modalityLabel[job.modality]} · {typeLabel[job.type]}
                            </Fact>
                            {posted && <Fact icon={CalendarDays}>Publicada el {posted}</Fact>}
                            {job.matchScore !== undefined && (
                                <Fact icon={Percent}>
                                    <span className="font-semibold text-primary">{job.matchScore}% de compatibilidad</span>
                                </Fact>
                            )}
                        </div>
                    </div>

                    {job.description && (
                        <div className="flex flex-col gap-2">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-muted">Descripción</h3>
                            <p className="text-sm text-body dark:text-gray-300 whitespace-pre-line">
                                {job.description}
                            </p>
                        </div>
                    )}

                    <TagList title="Habilidades buscadas" values={job.skills ?? []} />
                    <TagList title="Requisitos" values={job.requirements} />

                    {job.salary && (
                        <div className="flex flex-col gap-2">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-muted">Salario</h3>
                            <p className="text-sm text-body dark:text-gray-300">
                                {job.salary.currency} {job.salary.min.toLocaleString('es-CR')} – {job.salary.max.toLocaleString('es-CR')}
                            </p>
                        </div>
                    )}

                    <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                        <Button variant="secondary" size="sm" onClick={onClose}>Cerrar</Button>
                        {/* Postular todavía no está implementado */}
                        <Button size="sm" disabled title="Todavía no disponible">Postularme</Button>
                    </div>
                </div>
            )}
        </Modal>
    );
}
