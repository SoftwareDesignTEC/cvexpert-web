import { useState } from 'react';
import { Briefcase, CalendarDays, Check, ExternalLink, MapPin, Percent } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';
import { CompanyLogo } from './Avatar';
import { applicationService } from '../../services/otherServices';
import { describeError } from '../../services/http';
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

// `values` puede faltar: skills es opcional y hay ofertas sin requisitos
function TagList({ title, values }: { title: string; values?: string[] }) {
    if (!values || values.length === 0) return null;
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
    const [applying, setApplying] = useState(false);
    const [applied, setApplied] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [popupBlocked, setPopupBlocked] = useState(false);

    // Primero se guarda la postulación y después se abre el sitio de origen: si
    // se abriera antes, un fallo al guardar pasaría inadvertido con el usuario
    // ya fuera de la aplicación. Si el navegador bloquea la pestaña, queda el
    // enlace a la vista para que la abra a mano.
    const apply = async () => {
        if (!job) return;
        setApplying(true);
        setError(null);
        try {
            await applicationService.create({
                jobOfferId: job.id,
                jobTitle: job.title,
                company: job.company,
                companyLogoUrl: job.companyLogoUrl,
                location: job.location,
                modality: job.modality,
                status: 'applied',
            } as Parameters<typeof applicationService.create>[0]);
            setApplied(true);

            if (job.applyUrl) {
                const win = window.open(job.applyUrl, '_blank', 'noopener,noreferrer');
                if (!win) setPopupBlocked(true);
            }
        } catch (err) {
            setError(describeError(err, 'guardar tu postulación'));
        } finally {
            setApplying(false);
        }
    };

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

                    <TagList title="Requisitos" values={job.requirements} />
                    <TagList title="Habilidades" values={job.skills} />

                    {job.salary && (
                        <div className="flex flex-col gap-2">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-muted">Salario</h3>
                            <p className="text-sm text-body dark:text-gray-300">
                                {job.salary.currency} {job.salary.min.toLocaleString('es-CR')} – {job.salary.max.toLocaleString('es-CR')}
                            </p>
                        </div>
                    )}

                    {error && <p className="text-sm text-rose-500">{error}</p>}

                    {applied && (
                        <div className="flex flex-col gap-1 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2.5 dark:border-emerald-500/40 dark:bg-emerald-500/10">
                            <p className="flex items-center gap-2 text-sm text-emerald-800 dark:text-emerald-300">
                                <Check size={15} className="shrink-0" />
                                Guardamos la postulación en tu tablero.
                            </p>
                            {popupBlocked && job.applyUrl && (
                                <p className="text-xs text-emerald-800 dark:text-emerald-300">
                                    El navegador bloqueó la pestaña nueva.{' '}
                                    <a
                                        href={job.applyUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="underline"
                                    >
                                        Abrí la oferta acá
                                    </a>{' '}
                                    para completar la postulación en el sitio.
                                </p>
                            )}
                        </div>
                    )}

                    <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                        <Button variant="secondary" size="sm" onClick={onClose}>Cerrar</Button>

                        {/* Sin applyUrl no hay a dónde mandar al usuario; se omite */}
                        {job.applyUrl && (
                            <a
                                href={job.applyUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-sm font-medium text-body transition-colors hover:border-primary hover:text-primary dark:border-gray-700 dark:text-gray-300"
                            >
                                Ver oferta original <ExternalLink size={14} />
                            </a>
                        )}

                        <Button size="sm" onClick={apply} disabled={applying || applied}>
                            {applied ? 'Ya te postulaste' : applying ? 'Guardando…' : 'Postularme'}
                        </Button>
                    </div>
                </div>
            )}
        </Modal>
    );
}
