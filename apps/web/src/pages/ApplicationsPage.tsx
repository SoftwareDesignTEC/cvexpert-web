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
import { MapPin } from 'lucide-react';
import { CompanyLogo } from '../components/ui/Avatar';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import { ErrorMessage, LoadingSpinner } from '../components/ui/Feedback';
import PageHeader from '../components/ui/PageHeader';
import { applicationService } from '../services/otherServices';
import type { ApplicationStatus, JobApplication } from '../types/models';

// Cuántas postulaciones se muestran por columna antes de "Ver Todo"
const INITIAL_VISIBLE = 3;

// applicationService.getAll no filtra por status, así que se descargan todas
// las páginas y se reparten en las 4 columnas en el frontend.
const FETCH_PAGE_SIZE = 50;
const MAX_PAGES = 20; // salvavidas contra bucles si el endpoint ignora la paginación

interface ColumnTone {
    column: string;   // borde superior y marco de la columna
    header: string;   // fondo de la cabecera
    title: string;
    dot: string;
    badge: string;
    card: string;     // borde de cada tarjeta
    action: string;   // botones "Detalles" y "Ver Todo"
    avatar: string;
    over: string;     // resaltado al arrastrar encima
    tab: string;      // pestaña activa en movil
}

const COLUMNS: { status: ApplicationStatus; label: string; tone: ColumnTone }[] = [
    {
        status: 'applied', label: 'Aplicado',
        tone: {
            column: 'border-t-4 border-t-blue-500 border border-blue-200 dark:border-blue-900',
            header: 'bg-blue-50 dark:bg-blue-950/30',
            title:  'text-blue-700 dark:text-blue-300',
            dot:    'bg-blue-500',
            badge:  'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
            card:   'border-blue-200 dark:border-blue-900',
            action: 'bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300',
            avatar: 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300',
            over:   'bg-blue-100/60 dark:bg-blue-900/20',
            tab:    'bg-blue-500 text-white border-blue-500',
        },
    },
    {
        status: 'in-progress', label: 'En Proceso',
        tone: {
            column: 'border-t-4 border-t-cyan-500 border border-cyan-200 dark:border-cyan-900',
            header: 'bg-cyan-50 dark:bg-cyan-950/30',
            title:  'text-cyan-700 dark:text-cyan-300',
            dot:    'bg-cyan-500',
            badge:  'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300',
            card:   'border-cyan-200 dark:border-cyan-900',
            action: 'bg-cyan-50 text-cyan-700 hover:bg-cyan-100 dark:bg-cyan-950/40 dark:text-cyan-300',
            avatar: 'bg-cyan-50 text-cyan-600 dark:bg-cyan-950/40 dark:text-cyan-300',
            over:   'bg-cyan-100/60 dark:bg-cyan-900/20',
            tab:    'bg-cyan-500 text-white border-cyan-500',
        },
    },
    {
        status: 'interview', label: 'Entrevista',
        tone: {
            column: 'border-t-4 border-t-emerald-600 border border-emerald-200 dark:border-emerald-900',
            header: 'bg-emerald-50 dark:bg-emerald-950/30',
            title:  'text-emerald-700 dark:text-emerald-300',
            dot:    'bg-emerald-600',
            badge:  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
            card:   'border-emerald-200 dark:border-emerald-900',
            action: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300',
            avatar: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300',
            over:   'bg-emerald-100/60 dark:bg-emerald-900/20',
            tab:    'bg-emerald-600 text-white border-emerald-600',
        },
    },
    {
        status: 'rejected', label: 'Rechazado',
        tone: {
            column: 'border-t-4 border-t-rose-500 border border-rose-200 dark:border-rose-900',
            header: 'bg-rose-50 dark:bg-rose-950/30',
            title:  'text-rose-700 dark:text-rose-300',
            dot:    'bg-rose-500',
            badge:  'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
            card:   'border-rose-200 dark:border-rose-900',
            action: 'bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300',
            avatar: 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300',
            over:   'bg-rose-100/60 dark:bg-rose-900/20',
            tab:    'bg-rose-500 text-white border-rose-500',
        },
    },
];

const toneFor = (status: ApplicationStatus) =>
    COLUMNS.find(c => c.status === status)!.tone;

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
        all.push(...(res.items ?? []));
        total = res.totalRecords;
        if (!res.items?.length || all.length >= (res.totalRecords ?? 0)) break;
    }
    return { items: all, total };
}

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('es-CR', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ── Contenido visual de la card (compartido entre desktop y mobile) ──────────
function ApplicationCardContent({ application, dimmed }: { application: JobApplication; dimmed?: boolean }) {
    const tone = toneFor(application.status);

    return (
        <div
            className={`bg-surface dark:bg-gray-900 border rounded-xl p-3 flex flex-col gap-2 shadow-sm transition-opacity
                ${tone.card} ${dimmed ? 'opacity-50' : ''}`}
        >
            <div className="flex items-start gap-2">
                <CompanyLogo
                    src={application.companyLogoUrl}
                    name={application.company}
                    className={`w-10 h-10 rounded-lg text-sm ${tone.avatar}`}
                />
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

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-line dark:border-gray-800">
                <span className="text-[10px] text-muted">{formatDate(application.appliedAt)}</span>
                {/* Sin funcionalidad por ahora: no navega a ningún lado */}
                <button
                    disabled
                    className={`rounded-md px-2 py-1 text-[10px] font-medium disabled:opacity-60 disabled:cursor-not-allowed ${tone.action}`}
                >
                    Detalles
                </button>
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
                          status, label, tone, items, pendingId,
                      }: {
    status: ApplicationStatus;
    label: string;
    tone: ColumnTone;
    items: JobApplication[];
    pendingId: string | null;
}) {
    const { setNodeRef, isOver } = useDroppable({ id: status });
    const [expanded, setExpanded] = useState(false);
    const visible = expanded ? items : items.slice(0, INITIAL_VISIBLE);

    return (
        <div
            ref={setNodeRef}
            className={`flex flex-col rounded-xl overflow-hidden bg-surface dark:bg-gray-900 min-h-[160px] transition-colors
                ${tone.column} ${isOver ? tone.over : ''}`}
        >
            {/* Cabecera con el color del estado, su punto y el contador */}
            <div className={`flex items-center justify-between gap-2 px-3 py-2.5 ${tone.header}`}>
                <div className="flex items-center gap-2 min-w-0">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${tone.dot}`} />
                    <h3 className={`text-sm font-bold truncate ${tone.title}`}>{label}</h3>
                </div>
                <span className={`text-xs font-semibold rounded-full px-2 py-0.5 shrink-0 ${tone.badge}`}>
                    {items.length}
                </span>
            </div>

            <div className="flex flex-col gap-2 p-2">
                {visible.length === 0 ? (
                    <p className="text-xs text-muted px-1 py-2">Sin postulaciones.</p>
                ) : (
                    visible.map(app => (
                        <DraggableApplicationCard
                            key={app.id}
                            application={app}
                            disabled={pendingId === app.id}
                        />
                    ))
                )}

                {items.length > INITIAL_VISIBLE && (
                    <button
                        onClick={() => setExpanded(v => !v)}
                        className={`w-full rounded-lg px-3 py-2 text-xs font-medium transition-colors ${tone.action}`}
                    >
                        {expanded ? 'Ver menos' : 'Ver Todo'}
                    </button>
                )}
            </div>
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

        const load = async () => {
            setLoading(true);
            setError(null);
            try {
                const { items, total } = await fetchAllApplications();
                if (cancelled) return;
                setApplications(items);
                setTotal(total);
            } catch (err) {
                if (!cancelled) {
                    setError(err instanceof Error ? err.message : 'No se pudieron cargar las postulaciones');
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        load();

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

            <PageHeader
                eyebrow="Tu búsqueda en movimiento"
                title="Rastreador de Postulaciones"
                action={
                    <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-2 rounded-full border border-line dark:border-gray-800 bg-surface dark:bg-gray-900 px-4 py-2 text-sm text-body dark:text-gray-300 shadow-sm">
                            Postulaciones
                            <span className="font-bold text-ink dark:text-white">{total}</span>
                        </span>
                        {/* Sin funcionalidad por ahora: no navega a ningún lado */}
                        <Button size="sm" disabled>
                            + Agregar
                        </Button>
                    </div>
                }
            />

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
                                tone={col.tone}
                                items={col.items}
                                pendingId={pendingId}
                            />
                        ))}
                    </div>
                </DndContext>
            </div>

            {/* ── Mobile/tablet: pestañas + lista (sin arrastrar y soltar) ───── */}
            <div className="lg:hidden flex flex-col gap-3">
                <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {COLUMNS.map(c => (
                        <button
                            key={c.status}
                            onClick={() => { setActiveTab(c.status); setMobileExpanded(false); }}
                            className={`shrink-0 text-xs font-medium px-3 py-1.5 rounded-full border transition-colors
                                ${activeTab === c.status
                                ? c.tone.tab
                                : 'text-body dark:text-gray-300 border-line dark:border-gray-800 bg-surface dark:bg-gray-900'
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