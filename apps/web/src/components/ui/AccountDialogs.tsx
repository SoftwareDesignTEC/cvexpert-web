import { useEffect, useState } from 'react';
import { Check, Copy, Monitor, Smartphone } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';
import { LoadingSpinner } from './Feedback';
import { profileService } from '../../services/profileService';
import type { ActiveSession, DataExport } from '../../services/profileService';

function formatDateTime(iso: string) {
    const d = new Date(iso);
    return Number.isNaN(d.getTime())
        ? iso
        : d.toLocaleString('es-CR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ── Sesiones activas ──────────────────────────────────────────────────────────
export function ActiveSessionsDialog({
    open, userId, onClose,
}: {
    open: boolean;
    userId: string | null;
    onClose: () => void;
}) {
    const [sessions, setSessions] = useState<ActiveSession[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!open || !userId) return;
        let cancelled = false;

        const load = async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await profileService.getSessions(userId);
                if (!cancelled) setSessions(res);
            } catch {
                if (!cancelled) setError('No se pudieron cargar las sesiones.');
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        load();

        return () => { cancelled = true; };
    }, [open, userId]);

    return (
        <Modal
            open={open}
            title="Sesiones Activas"
            description="Dispositivos donde tu cuenta está abierta."
            onClose={onClose}
        >
            <div className="flex flex-col gap-4">
                {loading ? (
                    <LoadingSpinner />
                ) : error ? (
                    <p className="text-sm text-rose-500">{error}</p>
                ) : sessions.length === 0 ? (
                    <p className="text-sm text-muted">No hay sesiones registradas.</p>
                ) : (
                    <div className="flex flex-col gap-2">
                        {sessions.map(s => {
                            // El cliente indica si es la app móvil o el navegador
                            const isMobile = /android|ios|mobile/i.test(`${s.platform} ${s.client}`);
                            const Icon = isMobile ? Smartphone : Monitor;
                            return (
                                <div
                                    key={s.id}
                                    className={`flex items-start gap-3 rounded-xl border px-4 py-3
                                        ${s.current
                                        ? 'border-primary bg-primary-tint/60 dark:bg-primary/10'
                                        : 'border-line dark:border-gray-800'
                                    }`}
                                >
                                    <span className="w-9 h-9 rounded-lg bg-surface dark:bg-gray-800 text-primary flex items-center justify-center shrink-0">
                                        <Icon size={16} />
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <p className="text-sm font-medium text-ink dark:text-gray-100">{s.deviceName}</p>
                                            {s.current && (
                                                <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-white">
                                                    Este dispositivo
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-muted">{s.platform} · {s.client}</p>
                                        <p className="text-xs text-muted">Última actividad: {formatDateTime(s.lastActiveAt)}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                <div className="flex justify-end">
                    <Button variant="secondary" size="sm" onClick={onClose}>Cerrar</Button>
                </div>
            </div>
        </Modal>
    );
}

// ── Descargar mis datos ───────────────────────────────────────────────────────
export function ExportDataDialog({
    open, userId, onClose,
}: {
    open: boolean;
    userId: string | null;
    onClose: () => void;
}) {
    const [data, setData] = useState<DataExport | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (!open || !userId) return;
        let cancelled = false;

        const load = async () => {
            setLoading(true);
            setError(null);
            setCopied(false);
            try {
                const res = await profileService.exportData(userId);
                if (!cancelled) setData(res);
            } catch {
                if (!cancelled) setError('No se pudieron obtener tus datos.');
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        load();

        return () => { cancelled = true; };
    }, [open, userId]);

    useEffect(() => {
        if (!copied) return;
        const t = setTimeout(() => setCopied(false), 1800);
        return () => clearTimeout(t);
    }, [copied]);

    // El archivo se arma en el navegador: no hay endpoint que devuelva el adjunto
    const download = () => {
        if (!data) return;
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `cvexpert-datos-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const copy = async () => {
        if (!data) return;
        try {
            await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
            setCopied(true);
        } catch {
            // Algunos navegadores bloquean el portapapeles; queda la descarga
        }
    };

    return (
        <Modal
            open={open}
            size="lg"
            title="Descargar mis datos"
            description="Una copia de tu perfil, currículums y postulaciones."
            onClose={onClose}
        >
            <div className="flex flex-col gap-4">
                {loading ? (
                    <LoadingSpinner />
                ) : error ? (
                    <p className="text-sm text-rose-500">{error}</p>
                ) : data ? (
                    <>
                        <div className="grid grid-cols-3 gap-3">
                            {[
                                { label: 'Perfil', value: data.profile ? 1 : 0 },
                                { label: 'Currículums', value: data.cvs?.length ?? 0 },
                                { label: 'Postulaciones', value: data.applications?.length ?? 0 },
                            ].map(x => (
                                <div key={x.label} className="rounded-xl bg-canvas/70 dark:bg-gray-800/60 px-3 py-2.5 text-center">
                                    <p className="text-lg font-bold text-ink dark:text-white">{x.value}</p>
                                    <p className="text-xs text-muted">{x.label}</p>
                                </div>
                            ))}
                        </div>

                        <pre className="max-h-64 overflow-auto rounded-xl bg-canvas dark:bg-gray-800 p-3 text-xs text-body dark:text-gray-300">
                            {JSON.stringify(data, null, 2)}
                        </pre>
                    </>
                ) : null}

                <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                    <Button variant="secondary" size="sm" onClick={copy} disabled={!data}>
                        {copied ? <Check size={14} /> : <Copy size={14} />}
                        {copied ? 'Copiado' : 'Copiar'}
                    </Button>
                    <Button size="sm" onClick={download} disabled={!data}>
                        Descargar JSON
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
