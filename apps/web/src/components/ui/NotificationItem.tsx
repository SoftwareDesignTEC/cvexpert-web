import { Bell, Briefcase, FileText, GraduationCap, Kanban } from 'lucide-react';
import type { AppNotification } from '../../types/models';
import { useLocale } from '../../i18n/LocaleContext';
import type { Dict } from '../../i18n/dictionary';
import type { Locale } from '../cv/cvLabels';

// El mismo ícono que la sección del Sidebar a la que lleva cada tipo
function renderIcon(type: AppNotification['type']) {
    switch (type) {
        case 'application.status_changed': return <Kanban size={15} />;
        case 'job.new':                    return <Briefcase size={15} />;
        case 'cv.generated':               return <FileText size={15} />;
        case 'course.recommended':         return <GraduationCap size={15} />;
        // Un tipo que se agregue en el servidor antes que acá
        default:                           return <Bell size={15} />;
    }
}

// Las fechas llegan en epoch ms. Lo reciente se dice en relativo; lo viejo, con
// fecha, en la zona horaria del dispositivo: es un instante, no un día del
// almanaque. El formato de fecha sigue el idioma activo.
function formatWhen(epochMs: number, t: Dict['notifications'], locale: Locale): string {
    const minutes = Math.floor((Date.now() - epochMs) / 60_000);
    if (!Number.isFinite(minutes)) return '';
    if (minutes < 1) return t.justNow;
    if (minutes < 60) return t.minutesAgo.replace('{n}', String(minutes));
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return t.hoursAgo.replace('{n}', String(hours));
    return new Date(epochMs).toLocaleDateString(
        locale === 'en' ? 'en-US' : 'es-CR',
        { day: '2-digit', month: 'short', year: 'numeric' },
    );
}

interface NotificationItemProps {
    notification: AppNotification;
    // En la campana el mensaje se recorta a dos líneas
    compact?: boolean;
    // Si está, el contenido es un botón (abrir el aviso)
    onOpen?: () => void;
    // Botón a la derecha, p. ej. "Marcar leída"
    action?: React.ReactNode;
}

export default function NotificationItem({ notification, compact, onOpen, action }: NotificationItemProps) {
    const { locale, t } = useLocale();
    const unread = !notification.read;

    const content = (
        <>
            <p className={`text-sm truncate ${unread ? 'font-semibold text-ink dark:text-white' : 'font-medium text-body dark:text-gray-300'}`}>
                {notification.title}
            </p>
            {notification.body && (
                <p className={`text-xs text-muted ${compact ? 'line-clamp-2' : ''}`}>{notification.body}</p>
            )}
            <p className="mt-0.5 text-[11px] text-muted">{formatWhen(notification.createdAt, t.notifications, locale)}</p>
        </>
    );

    return (
        <div className="flex items-start gap-3">
            <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0
                ${unread ? 'bg-primary text-white' : 'bg-primary-tint text-primary dark:bg-primary/15'}`}
            >
                {renderIcon(notification.type)}
            </span>

            {onOpen ? (
                <button type="button" onClick={onOpen} className="flex-1 min-w-0 flex flex-col text-left hover:opacity-80 transition-opacity">
                    {content}
                </button>
            ) : (
                <div className="flex-1 min-w-0 flex flex-col">{content}</div>
            )}

            {unread && (
                <span className="mt-1.5 w-2 h-2 rounded-full bg-rose-500 shrink-0" aria-label="Sin leer" />
            )}
            {action && <div className="shrink-0">{action}</div>}
        </div>
    );
}
