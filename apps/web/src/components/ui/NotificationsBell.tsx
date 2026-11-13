import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import NotificationItem from './NotificationItem';
import { LoadingSpinner } from './Feedback';
import { useNotifications } from '../../context/NotificationsContext';
import { internalLink } from '../../services/notificationService';
import type { AppNotification } from '../../types/models';

export default function NotificationsBell() {
    const navigate = useNavigate();
    // Las últimas llegan precargadas y al día con los avisos en vivo desde el contexto
    const { unreadCount, latest: items, latestLoaded, latestError, refreshLatest, markAsRead } = useNotifications();
    const [open, setOpen] = useState(false);
    const panelRef = useRef<HTMLDivElement>(null);

    // Al abrir se muestra lo que ya hay y se refresca por detrás, sin spinner
    useEffect(() => {
        if (open) refreshLatest();
    }, [open, refreshLatest]);

    // Un clic fuera del panel lo cierra
    useEffect(() => {
        if (!open) return;
        const onClick = (e: MouseEvent) => {
            if (!panelRef.current?.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', onClick);
        return () => document.removeEventListener('mousedown', onClick);
    }, [open]);

    const goTo = (path: string) => {
        setOpen(false);
        navigate(path);
    };

    const openNotification = (notification: AppNotification) => {
        if (!notification.read) {
            // Si falla queda sin leer; desde el centro de notificaciones se puede reintentar
            markAsRead(notification.id).catch(() => {});
        }
        goTo(internalLink(notification.type) ?? '/notifications');
    };

    // null = el servicio no respondió: no se muestra un número que no sabemos
    const badge = unreadCount !== null && unreadCount > 0 ? (unreadCount > 9 ? '9+' : String(unreadCount)) : null;

    return (
        <div className="relative" ref={panelRef}>
            <button
                onClick={() => setOpen(v => !v)}
                title="Notificaciones"
                aria-label={badge ? `Notificaciones, ${unreadCount} sin leer` : 'Notificaciones'}
                aria-expanded={open}
                className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
                <Bell size={18} />
                {badge && (
                    <span className="absolute top-0.5 right-0.5 min-w-[1.1rem] h-[1.1rem] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold leading-[1.1rem] text-center ring-2 ring-surface dark:ring-gray-900">
                        {badge}
                    </span>
                )}
            </button>

            {open && (
                <div className="fixed inset-x-3 top-16 z-40 rounded-2xl border border-line dark:border-gray-800 bg-surface dark:bg-gray-900 shadow-xl overflow-hidden sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-80 sm:z-30">
                    <div className="flex items-center justify-between gap-2 border-b border-line dark:border-gray-800 px-4 py-3">
                        <h3 className="text-sm font-bold text-ink dark:text-white">Notificaciones</h3>
                        {badge && <span className="text-xs font-medium text-primary">{unreadCount} sin leer</span>}
                    </div>

                    <div className="max-h-[60vh] overflow-y-auto">
                        {/* Lo último que se cargó bien se sigue mostrando aunque el refresco
                            falle. El spinner y el error sólo aparecen si nunca hubo una carga. */}
                        {items.length > 0 ? (
                            <ul className="divide-y divide-line dark:divide-gray-800">
                                {items.map(n => (
                                    <li key={n.id} className="px-4 py-3">
                                        <NotificationItem notification={n} compact onOpen={() => openNotification(n)} />
                                    </li>
                                ))}
                            </ul>
                        ) : latestLoaded ? (
                            <p className="px-4 py-6 text-sm text-muted text-center">No tenés notificaciones.</p>
                        ) : latestError ? (
                            // Sin la API publicada (404) o sin red el panel lo explica; el Header sigue igual
                            <p className="px-4 py-6 text-sm text-muted text-center">{latestError}</p>
                        ) : (
                            <LoadingSpinner />
                        )}
                    </div>

                    <button
                        onClick={() => goTo('/notifications')}
                        className="w-full border-t border-line dark:border-gray-800 px-4 py-3 text-sm font-semibold text-primary hover:bg-primary-tint/60 dark:hover:bg-gray-800 transition-colors"
                    >
                        Ver todas las notificaciones
                    </button>
                </div>
            )}
        </div>
    );
}
