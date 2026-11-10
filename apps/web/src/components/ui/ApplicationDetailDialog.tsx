import { useState } from 'react';
import { ArrowLeftRight, Briefcase, CalendarDays, Clock, MapPin, Trash2 } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';
import { CompanyLogo } from './Avatar';
import { describeError } from '../../services/http';
import type { ApplicationStatus, JobApplication } from '../../types/models';

const modalityLabel: Record<JobApplication['modality'], string> = {
    'remote':  'Remoto',
    'on-site': 'Presencial',
    'hybrid':  'Híbrido',
};

function formatDate(iso?: string) {
    if (!iso) return null;
    const d = new Date(iso);
    return Number.isNaN(d.getTime())
        ? null
        : d.toLocaleDateString('es-CR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function Fact({ icon: Icon, children }: { icon: typeof MapPin; children: React.ReactNode }) {
    return (
        <span className="inline-flex items-center gap-1.5 text-sm text-body dark:text-gray-300">
            <Icon size={14} className="text-muted shrink-0" />
            {children}
        </span>
    );
}

export default function ApplicationDetailDialog({
    application, statusLabel, statusTone, onClose, onChangeStatus, onWithdraw,
}: {
    application: JobApplication | null;
    /** Etiqueta en español del estado, p. ej. "Entrevista" */
    statusLabel: (status: ApplicationStatus) => string;
    /** Clases de color del estado, para pintar la insignia */
    statusTone: (status: ApplicationStatus) => string;
    onClose: () => void;
    /** Retira la postulación; recibe el id para borrarla en el servicio */
    onWithdraw?: (id: string) => Promise<void>;
    onChangeStatus: () => void;
}) {
    const applied = formatDate(application?.appliedAt);
    const updated = formatDate(application?.updatedAt);

    // Retirar es irreversible, así que el botón pide confirmación antes de borrar
    const [confirming, setConfirming] = useState(false);
    const [withdrawing, setWithdrawing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    return (
        <Modal
            open={application !== null}
            size="lg"
            title={application?.jobTitle ?? ''}
            description={application?.company}
            onClose={onClose}
        >
            {application && (
                <div className="flex flex-col gap-5">

                    <div className="flex items-center gap-3">
                        <CompanyLogo
                            src={application.companyLogoUrl}
                            name={application.company}
                            className="w-14 h-14 rounded-xl bg-primary-tint text-primary dark:bg-gray-800"
                        />
                        <div className="flex flex-wrap gap-x-4 gap-y-1 min-w-0">
                            <Fact icon={MapPin}>{application.location}</Fact>
                            <Fact icon={Briefcase}>{modalityLabel[application.modality]}</Fact>
                            {applied && <Fact icon={CalendarDays}>Postulación del {applied}</Fact>}
                            {updated && updated !== applied && (
                                <Fact icon={Clock}>Actualizada el {updated}</Fact>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-muted">Estado</h3>
                        <span className={`self-start rounded-full px-3 py-1 text-sm font-semibold ${statusTone(application.status)}`}>
                            {statusLabel(application.status)}
                        </span>
                    </div>

                    {application.notes && (
                        <div className="flex flex-col gap-2">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-muted">Notas</h3>
                            <p className="text-sm text-body dark:text-gray-300 whitespace-pre-line">
                                {application.notes}
                            </p>
                        </div>
                    )}

                    <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                        {error && <p className="w-full text-sm text-rose-500">{error}</p>}
                        <Button variant="secondary" size="sm" onClick={onClose}>Cerrar</Button>
                        {onWithdraw && (
                            confirming ? (
                                <Button
                                    variant="danger"
                                    size="sm"
                                    disabled={withdrawing}
                                    onClick={async () => {
                                        setWithdrawing(true);
                                        setError(null);
                                        try {
                                            await onWithdraw(application.id);
                                        } catch (err) {
                                            setError(describeError(err, 'retirar la postulación'));
                                            setWithdrawing(false);
                                            setConfirming(false);
                                        }
                                    }}
                                >
                                    {withdrawing ? 'Retirando…' : '¿Seguro? Retirar'}
                                </Button>
                            ) : (
                                <Button variant="danger" size="sm" onClick={() => setConfirming(true)}>
                                    <Trash2 size={14} /> Retirar
                                </Button>
                            )
                        )}
                        <Button size="sm" onClick={onChangeStatus}>
                            <ArrowLeftRight size={14} />
                            Cambiar de estado
                        </Button>
                    </div>
                </div>
            )}
        </Modal>
    );
}
