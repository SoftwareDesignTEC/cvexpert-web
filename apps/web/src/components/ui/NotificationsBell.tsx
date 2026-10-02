import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Sparkles } from 'lucide-react';
import { CompanyLogo } from './Avatar';
import { jobService } from '../../services/otherServices';
import type { JobOffer } from '../../types/models';

// Al abrir la aplicación se avisa de la oferta con mayor compatibilidad. No hay
// endpoint de notificaciones todavía, así que se deriva de las ofertas existentes.
const FETCH_SIZE = 50;

export default function NotificationsBell() {
    const navigate = useNavigate();
    const [job, setJob] = useState<JobOffer | null>(null);
    const [open, setOpen] = useState(false);
    const [seen, setSeen] = useState(false);
    const panelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            try {
                const res = await jobService.getAll({ page: 1, pageSize: FETCH_SIZE });
                if (cancelled) return;
                // La más compatible es la que vale la pena anunciar
                const best = [...(res.items ?? [])]
                    .sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0))[0];
                setJob(best ?? null);
            } catch {
                // Sin ofertas no hay nada que notificar; la campana queda apagada
            }
        };
        load();

        return () => { cancelled = true; };
    }, []);

    // Un clic fuera del panel lo cierra
    useEffect(() => {
        if (!open) return;
        const onClick = (e: MouseEvent) => {
            if (!panelRef.current?.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', onClick);
        return () => document.removeEventListener('mousedown', onClick);
    }, [open]);

    const toggle = () => {
        setOpen(v => !v);
        setSeen(true);
    };

    return (
        <div className="relative" ref={panelRef}>
            <button
                onClick={toggle}
                title="Notificaciones"
                aria-label="Notificaciones"
                className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
                <Bell size={18} />
                {job && !seen && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-surface dark:ring-gray-900" />
                )}
            </button>

            {open && (
                <div className="absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-line dark:border-gray-800 bg-surface dark:bg-gray-900 shadow-xl z-30 overflow-hidden">
                    <div className="border-b border-line dark:border-gray-800 px-4 py-3">
                        <h3 className="text-sm font-bold text-ink dark:text-white">Notificaciones</h3>
                    </div>

                    {job ? (
                        <div className="flex flex-col gap-3 p-4">
                            <div className="flex items-start gap-2">
                                <span className="w-7 h-7 rounded-lg bg-primary-tint text-primary flex items-center justify-center shrink-0 dark:bg-primary/15">
                                    <Sparkles size={14} />
                                </span>
                                <p className="text-sm font-medium text-ink dark:text-gray-100">
                                    Nueva oferta compatible con tu perfil
                                </p>
                            </div>

                            <div className="flex items-center gap-3 rounded-xl bg-canvas/70 dark:bg-gray-800/60 p-3">
                                <CompanyLogo
                                    src={job.companyLogoUrl}
                                    name={job.company}
                                    className="w-10 h-10 rounded-lg bg-surface text-primary text-xs dark:bg-gray-900"
                                />
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-semibold text-ink dark:text-white truncate">{job.title}</p>
                                    <p className="text-xs text-muted truncate">{job.company}</p>
                                </div>
                                {job.matchScore !== undefined && (
                                    <span className="text-xs font-bold text-primary shrink-0">{job.matchScore}%</span>
                                )}
                            </div>

                            <button
                                onClick={() => { setOpen(false); navigate('/jobs'); }}
                                className="w-full rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white hover:bg-primary-dark transition-colors"
                            >
                                Ver
                            </button>
                        </div>
                    ) : (
                        <p className="px-4 py-6 text-sm text-muted text-center">No tenés notificaciones.</p>
                    )}
                </div>
            )}
        </div>
    );
}
