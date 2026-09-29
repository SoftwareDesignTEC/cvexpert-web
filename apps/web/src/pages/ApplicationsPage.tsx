import { useEffect, useMemo, useState } from 'react';
import {
    DndContext,
    PointerSensor,
    useDraggable,
    useDroppable,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { Briefcase, MapPin } from 'lucide-react';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import { ErrorMessage, LoadingSpinner } from '../components/ui/Feedback';
import { applicationService } from '../services/otherServices';
import type { ApplicationStatus, JobApplication } from '../types/models';

// Cuántas postulaciones se muestran por columna antes de "Ver Todo"
const INITIAL_VISIBLE = 3;

// applicationService.getAll no filtra por status, así que se descargan todas
// las páginas y se reparten en las 4 columnas en el frontend.
const FETCH_PAGE_SIZE = 50;
const MAX_PAGES = 20; // salvavidas contra bucles si el endpoint ignora la paginación

const COLUMNS: { status: ApplicationStatus; label: string }[] = [
    { status: 'applied',     label: 'Aplicado' },
    { status: 'in-progress', label: 'En Proceso' },
    { status: 'interview',   label: 'Entrevista' },
    { status: 'rejected',    label: 'Rechazado' },
];

const modalityLabel: Record<JobApplication['modality'], string> = {
    'remote':  'Remoto',
    'on-site': 'Presencial',
    'hybrid':  'Híbrido',
};

async function fetchAllApplications(): Promise<{ items: JobApplication[]; total: number }> {
    const all: JobApplication[] = [];
    let total = 0;
    for (let page = 1; page <= MAX_PAGES; page++) {
        const res = await applicationService.getAll({ page, pageSize: FETCH_PAGE_SIZE });
        all.push(...res.items);
        total = res.totalRecords;
        if (res.items.length === 0 || all.length >= res.totalRecords) break;
    }
    return { items: all, total };
}

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('es-CR', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ── Contenido visual de la card (compartido entre desktop y mobile) ──────────
function ApplicationCardContent({ application, dimmed }: { application: JobApplication; dimmed?: boolean }) {
    return (
        <div
            className={`bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-3 flex flex-col gap-2 transition-opacity
                ${dimmed ? 'opacity-50' : ''}`}
        >
            <div className="flex items-start gap-2">
                <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0 overflow-hidden">
                    {application.companyLogoUrl ? (
                        <img src={application.companyLogoUrl} alt={application.company} className="w-full h-full object-cover" />
                    ) : (
                        <Briefcase size={16} className="text-gray-400" />
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-semibold text-gray-900 dark:text-white truncate">{application.jobTitle}</h4>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">{application.company}</p>
                    <div className="flex items-center gap-1 text-[10px] text-gray-400 mt-0.5">
                        <MapPin size={10} className="shrink-0" />
                        <span className="truncate">{application.location}</span>
                    </div>
                    <div className="mt-1">
                        <Badge label={modalityLabel[application.modality]} variant="info" />
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                <span className="text-[10px] text-gray-400">{formatDate(application.appliedAt)}</span>
                {/* Sin funcionalidad por ahora: no navega a ningún lado */}
                <Button variant="secondary" size="sm" disabled className="text-[10px] px-2 py-1">
                    Detalles
                </Button>
            </div>
        </div>
    );
}

// ── Card arrastrable (solo desktop) ───────────────────────────────────────────
function DraggableApplicationCard({ application, disabled }: { application: JobApplication; disabled: boolean }) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: application.id,
        disabled,
    });

    const style = transform
        ? { transform: `translate(${transform.x}px, ${transform.y}px)`, zIndex: 10 }
        : undefined;

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            className={`touch-none ${isDragging ? 'opacity-70' : ''} ${disabled ? 'cursor-wait' : 'cursor-grab active:cursor-grabbing'}`}
        >
            <ApplicationCardContent application={application} dimmed={disabled} />
        </div>
    );
}

// ── Columna del Kanban (droppable, solo desktop) ──────────────────────────────
function KanbanColumn({
                          status, label, items, pendingId,
                      }: {
    status: ApplicationStatus;
    label: string;
    items: JobApplication[];
    pendingId: string | null;
}) {
    const { setNodeRef, isOver } = useDroppable({ id: status });
    const [expanded, setExpanded] = useState(false);
    const visible = expanded ? items : items.slice(0, INITIAL_VISIBLE);

    return (
        <div
            ref={setNodeRef}
            className={`flex flex-col gap-2 rounded-xl p-2 min-h-[160px] transition-colors
                ${isOver ? 'bg-blue-50 dark:bg-blue-900/10' : 'bg-gray-50 dark:bg-gray-800/40'}`}
        >
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white px-1">{label}</h3>

            {visible.length === 0 ? (
                <p className="text-xs text-gray-400 px-1">Sin postulaciones.</p>
            ) : (
                visible.map(app => (
                    <DraggableApplicationCard
                        key={app.id}
                        application={app}
                        disabled={pendingId === app.id}
                    />
                ))
            )}

            {!expanded && items.length > INITIAL_VISIBLE && (
                <Button variant="secondary" size="sm" onClick={() => setExpanded(true)}>
                    Ver Todo
                </Button>
            )}
        </div>
    );
}

// ── Página ────────────────────────────────────────────────────────────────────
export default function ApplicationsPage() {
    const [applications, setApplications] = useState<JobApplication[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [reloadKey, setReloadKey] = useState(0); // sube al presionar "Reintentar"

    // Estado del arrastre: se espera la confirmación de APIM antes de mover la card
    const [pendingId, setPendingId] = useState<string | null>(null);
    const [moveError, setMoveError] = useState<string | null>(null);

    // Mobile: pestañas en vez de columnas lado a lado
    const [activeTab, setActiveTab] = useState<ApplicationStatus>('applied');
    const [mobileExpanded, setMobileExpanded] = useState(false);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    );

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(null);

        fetchAllApplications()
            .then(({ items, total }) => {
                if (cancelled) return;
                setApplications(items);
                setTotal(total);
            })
            .catch(err => {
                if (cancelled) return;
                setError(err instanceof Error ? err.message : 'No se pudieron cargar las postulaciones');
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => { cancelled = true; };
    }, [reloadKey]);

    const columns = useMemo(
        () => COLUMNS.map(c => ({ ...c, items: applications.filter(a => a.status === c.status) })),
        [applications],
    );

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over) return;

        const appId = String(active.id);
        const newStatus = over.id as ApplicationStatus;
        const app = applications.find(a => a.id === appId);
        if (!app || app.status === newStatus) return;

        setMoveError(null);
        setPendingId(appId);
        try {
            await applicationService.updateStatus(appId, newStatus);
            // Recién ahora que APIM confirmó el cambio se mueve la card visualmente
            setApplications(prev => prev.map(a => (a.id === appId ? { ...a, status: newStatus } : a)));
        } catch (err) {
            setMoveError(err instanceof Error ? err.message : 'No se pudo actualizar el estado de la postulación');
        } finally {
            setPendingId(null);
        }
    };

    if (loading) return <LoadingSpinner />;
    if (error) return <ErrorMessage message={error} onRetry={() => setReloadKey(k => k + 1)} />;

    const activeColumnItems = applications.filter(a => a.status === activeTab);
    const visibleMobile = mobileExpanded ? activeColumnItems : activeColumnItems.slice(0, INITIAL_VISIBLE);

    return (
        <div className="flex flex-col gap-3 sm:gap-6">

            {/* ── Título + contador + acción (decorativa) ────────────────────── */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
                <h1 className="text-lg font-bold text-gray-900 dark:text-white sm:text-2xl">
                    Rastreador de Postulaciones
                </h1>
                <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-full px-3 py-1">
                        Postulaciones: {total}
                    </span>
                    {/* Sin funcionalidad por ahora: no navega a ningún lado */}
                    <Button size="sm" disabled>
                        + Agregar Postulación
                    </Button>
                </div>
            </div>

            {moveError && <ErrorMessage message={moveError} />}

            {/* ── Desktop: tablero Kanban con arrastrar y soltar ─────────────── */}
            <div className="hidden lg:block">
                <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
                    <div className="grid grid-cols-4 gap-4">
                        {columns.map(col => (
                            <KanbanColumn
                                key={col.status}
                                status={col.status}
                                label={col.label}
                                items={col.items}
                                pendingId={pendingId}
                            />
                        ))}
                    </div>
                </DndContext>
            </div>

            {/* ── Mobile/tablet: pestañas + lista (sin arrastrar y soltar) ───── */}
            <div className="lg:hidden flex flex-col gap-3">
                <div className="flex gap-2 overflow-x-auto pb-1">
                    {COLUMNS.map(c => (
                        <button
                            key={c.status}
                            onClick={() => { setActiveTab(c.status); setMobileExpanded(false); }}
                            className={`shrink-0 text-xs font-medium px-3 py-1.5 rounded-full border transition-colors
                                ${activeTab === c.status
                                ? 'bg-[#2F7FD4] text-white border-[#2F7FD4]'
                                : 'text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900'
                            }`}
                        >
                            {c.label}
                        </button>
                    ))}
                </div>

                {activeColumnItems.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400">Sin postulaciones en esta columna.</p>
                ) : (
                    <div className="flex flex-col gap-2">
                        {visibleMobile.map(app => (
                            <ApplicationCardContent key={app.id} application={app} />
                        ))}

                        {!mobileExpanded && activeColumnItems.length > INITIAL_VISIBLE && (
                            <Button variant="secondary" className="w-full" onClick={() => setMobileExpanded(true)}>
                                Ver Todo
                            </Button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}