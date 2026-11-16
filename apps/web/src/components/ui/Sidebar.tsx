import { NavLink } from 'react-router-dom';
import logo from '../../assets/logo.png';
import {
    Menu, LayoutDashboard, FileText, User, TrendingUp, GraduationCap, Layout, Briefcase, Kanban, MessageSquareText, Settings,
} from 'lucide-react';
import { useNotificationAdmin } from '../../context/NotificationAdminContext';
import { useLocale } from '../../i18n/LocaleContext';
import type { LucideIcon } from 'lucide-react';
import type { Dict } from '../../i18n/dictionary';

interface NavItem {
    to: string;
    icon: LucideIcon;
    /** Clave del diccionario, no el texto: se resuelve con el idioma activo */
    key: keyof Dict['nav'];
    /** Sólo para quien puede editar las plantillas de avisos */
    adminOnly?: boolean;
}

// `key` en lugar del texto: la etiqueta se resuelve al dibujar, con el idioma
// activo. adminOnly sólo se muestra a quien puede editar plantillas de avisos.
const navItems: NavItem[] = [
    { to: '/',             icon: LayoutDashboard,  key: 'dashboard'  },
    { to: '/cvs',          icon: FileText,         key: 'cvs'        },
    { to: '/profile',      icon: User,             key: 'profile'    },
    { to: '/skills-gap',   icon: TrendingUp,       key: 'skillsGap'  },
    { to: '/courses',      icon: GraduationCap,    key: 'courses'    },
    { to: '/templates',    icon: Layout,           key: 'templates'  },
    { to: '/jobs',         icon: Briefcase,        key: 'jobs'       },
    { to: '/applications', icon: Kanban,           key: 'applications' },
    { to: '/admin/notification-templates', icon: MessageSquareText, key: 'notificationTemplates', adminOnly: true },
    { to: '/settings',     icon: Settings,         key: 'settings'   },
];

interface SidebarProps {
    onClose: () => void;
    /** Se llama al entrar a una sección; cierra sólo si la barra tapa el contenido */
    onNavigate?: () => void;
}

export default function Sidebar({ onClose, onNavigate }: SidebarProps) {
    const { canEditTemplates } = useNotificationAdmin();
    const { t } = useLocale();
    const visibleItems = navItems.filter(item => !item.adminOnly || canEditTemplates === true);

    return (
        <aside className="w-64 h-full bg-surface dark:bg-gray-900 border-r border-line dark:border-gray-800 flex flex-col">
            {/* Header del sidebar con botón cerrar */}
            <div className="h-16 flex items-center justify-between px-5 border-b border-line dark:border-gray-800">
                <div className="flex items-center gap-2 min-w-0">
                    <img src={logo} alt="" aria-hidden="true" className="w-9 h-9 shrink-0 object-contain" />
                    <div className="flex flex-col min-w-0">
                        <span className="text-ink dark:text-white font-bold text-base tracking-tight leading-tight">CVExpert</span>
                        <span className="text-muted text-[11px] leading-tight truncate">{t.nav.tagline}</span>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    title={t.nav.closeMenu}
                    aria-label={t.nav.closeMenu}
                    className="shrink-0 rounded-lg p-2 text-muted transition-colors hover:bg-canvas hover:text-ink dark:hover:bg-gray-800 dark:hover:text-white"
                >
                    {/* El mismo icono que lo abre: es un interruptor, no dos
                        acciones distintas. */}
                    <Menu size={20} />
                </button>
            </div>

            {/* Navegación */}
            <nav className="flex-1 py-4 px-3 overflow-y-auto flex flex-col gap-1">
                {visibleItems.map(({ to, icon: Icon, key }) => (
                    <NavLink
                        key={to}
                        to={to}
                        end={to === '/'}
                        onClick={onNavigate}
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
              ${isActive
                                ? 'bg-primary-tint text-primary dark:bg-primary/15'
                                : 'text-body dark:text-gray-400 hover:bg-primary-tint/60 hover:text-primary dark:hover:bg-gray-800'
                            }`
                        }
                    >
                        <Icon size={18} />
                        {t.nav[key]}
                    </NavLink>
                ))}
            </nav>

            {/* Version publicada: coincide con el tag de Git que crea el pipeline */}
            <div className="px-5 py-3 border-t border-line dark:border-gray-800">
                <span className="text-xs text-muted">{t.nav.version} {__APP_VERSION__}</span>
            </div>
        </aside>
    );
}
