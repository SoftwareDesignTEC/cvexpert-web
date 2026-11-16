import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, CalendarDays, Check, ExternalLink, MapPin, Percent } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';
import { CompanyLogo } from './Avatar';
import { applicationService } from '../../services/otherServices';
import { describeError } from '../../services/http';
import { useLocale } from '../../i18n/LocaleContext';
import type { ApplicationStatus, JobApplication, JobOffer } from '../../types/models';

// Las columnas donde tiene sentido guardar una oferta recién vista. Las otras
// dos del tablero —entrevista y rechazado— describen algo que ya pasó, así que
// no se ofrecen al agregarla.
const DESTINOS: { status: ApplicationStatus; key: 'Interested' | 'Applied' | 'InProgress' }[] = [
    { status: 'interested',  key: 'Interested' },
    { status: 'applied',     key: 'Applied' },
    { status: 'in-progress', key: 'InProgress' },
];


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

interface JobDetailDialogProps {
    job: JobOffer | null;
    onClose: () => void;
    /** Se avisa con la postulación ya creada para que quien lo abrió la agregue
     *  a su lista sin volver a pedirle todo al servidor. */
    onAdded?: (application: JobApplication) => void;
}

/**
 * Todo lo que el diálogo recuerda —si ya se guardó, el error, el selector de
 * columna— es de la oferta que se está mirando, no del diálogo. Sin esto, al
 * abrir una segunda oferta seguía diciendo que ya estaba en el tablero, porque
 * el estado sobrevivía al cambio de oferta.
 *
 * La `key` obliga a volver a montar el contenido cuando cambia la oferta, que
 * es la forma de garantizar que empiece de cero sin tener que acordarse de
 * reiniciar cada dato a mano cada vez que se agregue uno nuevo.
 */
export default function JobDetailDialog(props: JobDetailDialogProps) {
    return <JobDetailDialogContent key={props.job?.id ?? 'sin-oferta'} {...props} />;
}

function JobDetailDialogContent({ job, onClose, onAdded }: JobDetailDialogProps) {
    const { t } = useLocale();
    const navigate = useNavigate();
    const posted = formatDate(job?.postedAt);
    const [applying, setApplying] = useState(false);
    const [applied, setApplied] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [popupBlocked, setPopupBlocked] = useState(false);
    const [eligiendo, setEligiendo] = useState(false);

    /**
     * Guarda la oferta en el tablero, en la columna elegida.
     *
     * Primero se guarda y después se abre el sitio de origen: si se abriera
     * antes, un fallo al guardar pasaría inadvertido con el usuario ya fuera
     * de la aplicación. Si el navegador bloquea la pestaña, queda el enlace a
     * la vista para abrirla a mano.
     *
     * El sitio sólo se abre al postularse de verdad. Guardar algo como "me
     * interesa" no es postularse, así que mandar al usuario al formulario de
     * la empresa en ese caso sería contradecir lo que acaba de elegir.
     */
    const guardar = async (destino: ApplicationStatus) => {
        if (!job) return;
        setApplying(true);
        setError(null);
        try {
            const creada = await applicationService.create({
                jobOfferId: job.id,
                jobTitle: job.title,
                company: job.company,
                companyLogoUrl: job.companyLogoUrl,
                location: job.location,
                modality: job.modality,
                status: destino,
            } as Parameters<typeof applicationService.create>[0], destino);
            setApplied(true);
            setEligiendo(false);
            onAdded?.(creada);

            if (destino === 'applied' && job.applyUrl) {
                const win = window.open(job.applyUrl, '_blank', 'noopener,noreferrer');
                if (!win) setPopupBlocked(true);
            }
        } catch (err) {
            setError(describeError(err, 'guardar la oferta'));
            setEligiendo(false);
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
                                {t.modality[job.modality]} · {t.availability[job.type]}
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
                            <h3 className="text-xs font-bold uppercase tracking-wider text-muted">{t.dialogs.jobDescription}</h3>
                            <p className="text-sm text-body dark:text-gray-300 whitespace-pre-line">
                                {job.description}
                            </p>
                        </div>
                    )}

                    <TagList title={t.dialogs.jobRequirements} values={job.requirements} />
                    <TagList title={t.dialogs.jobSkills} values={job.skills} />

                    {job.salary && (
                        <div className="flex flex-col gap-2">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-muted">Salario</h3>
                            <p className="text-sm text-body dark:text-gray-300">
                                {job.salary.currency} {job.salary.min.toLocaleString('es-CR')} – {job.salary.max.toLocaleString('es-CR')}
                            </p>
                        </div>
                    )}

                    {error && <p className="text-sm text-rose-500">{error}</p>}

                    {/* Se pregunta la columna en vez de asumir: guardar algo
                        para mirarlo después no es lo mismo que postularse. */}
                    {eligiendo && !applied && (
                        <div className="flex flex-col gap-2 rounded-xl border border-line bg-canvas/60 p-3 dark:border-gray-800 dark:bg-gray-800/60">
                            <p className="text-sm font-medium text-ink dark:text-white">
                                {t.dialogs.whereToSave}
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {DESTINOS.map(({ status, key }) => (
                                    <button
                                        key={status}
                                        type="button"
                                        disabled={applying}
                                        onClick={() => guardar(status)}
                                        className="flex flex-col items-start gap-0.5 rounded-lg border border-line px-3 py-2 text-left transition-colors hover:border-primary disabled:opacity-60 dark:border-gray-700"
                                    >
                                        <span className="text-xs font-semibold text-ink dark:text-white">
                                            {t.dialogs[`dest${key}`]}
                                        </span>
                                        <span className="text-[11px] text-muted">
                                            {t.dialogs[`dest${key}Hint`]}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {applied && (
                        <div className="flex flex-col gap-1 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2.5 dark:border-emerald-500/40 dark:bg-emerald-500/10">
                            <p className="flex items-center gap-2 text-sm text-emerald-800 dark:text-emerald-300">
                                <Check size={15} className="shrink-0" />
                                {t.dialogs.savedToBoard}
                            </p>
                            {popupBlocked && job.applyUrl && (
                                <p className="text-xs text-emerald-800 dark:text-emerald-300">
                                    {t.dialogs.popupBlocked}{' '}
                                    <a
                                        href={job.applyUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="underline"
                                    >
                                        {t.dialogs.openOfferHere}
                                    </a>{' '}
                                    para completar la postulación en el sitio.
                                </p>
                            )}
                        </div>
                    )}

                    <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                        <Button variant="secondary" size="sm" onClick={onClose}>{t.dialogs.close}</Button>

                        {/* Lleva la brecha a compararse contra esta oferta */}
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                                onClose();
                                navigate(`/skills-gap?${new URLSearchParams({ jobId: job.id })}`);
                            }}
                        >
                            {t.dialogs.analyzeWithCv}
                        </Button>

                        {/* Sin applyUrl no hay a dónde mandar al usuario; se omite */}
                        {job.applyUrl && (
                            <a
                                href={job.applyUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-sm font-medium text-body transition-colors hover:border-primary hover:text-primary dark:border-gray-700 dark:text-gray-300"
                            >
                                {t.dialogs.viewOriginal} <ExternalLink size={14} />
                            </a>
                        )}

                        <Button
                            size="sm"
                            onClick={() => setEligiendo(true)}
                            disabled={applying || applied || eligiendo}
                        >
                            {applied
                                ? t.dialogs.alreadyOnBoard
                                : applying ? t.common.saving : t.dialogs.addToBoard}
                        </Button>
                    </div>
                </div>
            )}
        </Modal>
    );
}
