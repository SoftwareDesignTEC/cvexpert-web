import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, CheckCheck } from 'lucide-react';
import Button from '../components/ui/Button';
import { ErrorMessage, LoadingSpinner } from '../components/ui/Feedback';
import NotificationItem from '../components/ui/NotificationItem';
import PageHeader from '../components/ui/PageHeader';
import Pagination from '../components/ui/Pagination';
import { useNotifications } from '../context/NotificationsContext';
import { internalLink, notificationService } from '../services/notificationService';
import { describeError } from '../services/http';
import type { AppNotification } from '../types/models';

const PAGE_SIZE = 10;

type Filter = 'all' | 'unread';

export default function NotificationsPage() {
    const navigate = useNavigate();
    const { unreadCount, liveVersion, markAsRead, markAllAsRead, refreshUnreadCount } = useNotifications();

    const [filter, setFilter] = useState<Filter>('all');
    const [page, setPage] = useState(1);
    const [items, setItems] = useState<AppNotification[]>([]);
    const [totalRecords, setTotalRecords] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [reloadKey, setReloadKey] = useState(0);

    const [busyId, setBusyId] = useState<string | null>(null);
    const [markingAll, setMarkingAll] = useState(false);
    const [actionError, setActionError] = useState<string | null>(null);

    // También se recarga cuando llega un aviso en vivo (liveVersion)
    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await notificationService.getAll({ page, pageSize: PAGE_SIZE, unreadOnly: filter === 'unread' });
                if (cancelled) return;
                // Al marcar leído el último aviso de una página en "No leídas", esa página
                // deja de existir: se vuelve a la anterior en vez de mostrarla vacía.
                if (res.items.length === 0 && page > 1) {
                    setPage(page - 1);
                    return;
                }
                setItems(res.items);
                setTotalRecords(res.totalRecords);
            } catch (err) {
                if (!cancelled) setError(describeError(err, 'cargar tus notificaciones'));
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        load();

        return () => { cancelled = true; };
    }, [filter, page, reloadKey, liveVersion]);

    const changeFilter = (next: Filter) => {
        if (next === filter) return;
        setFilter(next);
        setPage(1);
        setActionError(null);
    };

    const retry = () => {
        setReloadKey(k => k + 1);
        refreshUnreadCount();
    };

    const handleMarkRead = async (notification: AppNotification) => {
        setBusyId(notification.id);
        setActionError(null);
        try {
            const readAt = await markAsRead(notification.id);
            if (filter === 'unread') {
                // Deja de pertenecer a este filtro: se pide la página de nuevo
                setReloadKey(k => k + 1);
            } else {
                setItems(prev => prev.map(n => (n.id === notification.id ? { ...n, readAt } : n)));
            }
        } catch (err) {
            setActionError(describeError(err, 'marcar la notificación como leída'));
        } finally {
            setBusyId(null);
        }
    };

    const handleMarkAll = async () => {
        setMarkingAll(true);
        setActionError(null);
        try {
            await markAllAsRead();
            setReloadKey(k => k + 1);
        } catch (err) {
            setActionError(describeError(err, 'marcar todas las notificaciones como leídas'));
        } finally {
            setMarkingAll(false);
        }
    };

    const openNotification = (notification: AppNotification, link: string) => {
        if (notification.readAt === null) markAsRead(notification.id).catch(() => {});
        navigate(link);
    };

    const totalPages = Math.max(1, Math.ceil(totalRecords / PAGE_SIZE));

    const tabClass = (active: boolean) =>
        `rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${active
            ? 'bg-primary text-white'
            : 'text-body dark:text-gray-300 hover:text-primary'
        }`;

    return (
        <div className="flex flex-col gap-3 sm:gap-6">
            <PageHeader
                eyebrow="Tu actividad"
                title="Notificaciones"
                action={
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleMarkAll}
                        loading={markingAll}
                        disabled={unreadCount === 0 || !!error}
                        className="w-full lg:w-auto"
                    >
                        {!markingAll && <CheckCheck size={15} />}
                        Marcar todas como leídas
                    </Button>
                }
            />

            <div role="tablist" aria-label="Filtrar notificaciones" className="inline-flex self-start gap-1 rounded-xl border border-line dark:border-gray-800 bg-surface dark:bg-gray-900 p-1">
                <button role="tab" aria-selected={filter === 'all'} onClick={() => changeFilter('all')} className={tabClass(filter === 'all')}>
                    Todas
                </button>
                <button role="tab" aria-selected={filter === 'unread'} onClick={() => changeFilter('unread')} className={tabClass(filter === 'unread')}>
                    No leídas{unreadCount ? ` (${unreadCount})` : ''}
                </button>
            </div>

            {actionError && (
                <p role="alert" className="rounded-xl bg-rose-50 dark:bg-rose-950/30 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
                    {actionError}
                </p>
            )}

            {loading ? (
                <LoadingSpinner />
            ) : error ? (
                <ErrorMessage message={error} onRetry={retry} />
            ) : items.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    {filter === 'unread' ? 'No tenés notificaciones sin leer.' : 'Todavía no tenés notificaciones.'}
                </p>
            ) : (
                <div className="flex flex-col gap-3 sm:gap-4">
                    <ul className="flex flex-col gap-2">
                        {items.map(n => {
                            const link = internalLink(n.link);
                            return (
                                <li
                                    key={n.id}
                                    className={`rounded-xl border p-3 sm:p-4 ${n.readAt === null
                                        ? 'border-primary/30 bg-primary-tint/40 dark:border-primary/30 dark:bg-primary/10'
                                        : 'border-line bg-surface dark:border-gray-800 dark:bg-gray-900'
                                    }`}
                                >
                                    <NotificationItem
                                        notification={n}
                                        onOpen={link ? () => openNotification(n, link) : undefined}
                                        action={n.readAt === null && (
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                loading={busyId === n.id}
                                                onClick={() => handleMarkRead(n)}
                                                aria-label={`Marcar "${n.title}" como leída`}
                                            >
                                                {busyId !== n.id && <Check size={14} />}
                                                <span className="hidden sm:inline">Marcar leída</span>
                                            </Button>
                                        )}
                                    />
                                </li>
                            );
                        })}
                    </ul>

                    <Pagination page={page} totalPages={totalPages} onChange={setPage} />
                </div>
            )}
        </div>
    );
}
