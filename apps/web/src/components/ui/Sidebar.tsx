import { NavLink } from 'react-router-dom';
import { X, LayoutDashboard, FileText, User, TrendingUp, Layout, Briefcase, Kanban, Settings } from 'lucide-react';

const navItems = [
    { to: '/',             icon: LayoutDashboard, label: 'Panel Principal'      },
    { to: '/cvs',          icon: FileText,         label: 'Mis Currículums'      },
    { to: '/profile',      icon: User,             label: 'Mi Perfil'            },
    { to: '/skills-gap',   icon: TrendingUp,       label: 'Análisis de Brechas'  },
    { to: '/templates',    icon: Layout,           label: 'Plantillas / Offline' },
    { to: '/jobs',         icon: Briefcase,        label: 'Ofertas Laborales'    },
    { to: '/applications', icon: Kanban,           label: 'Postulaciones'        },
    { to: '/settings',     icon: Settings,         label: 'Configuración'        },
];

interface SidebarProps {
    onClose: () => void;
}

export default function Sidebar({ onClose }: SidebarProps) {
    return (
        <aside className="w-64 h-full bg-surface dark:bg-gray-900 border-r border-line dark:border-gray-800 flex flex-col">
            {/* Header del sidebar con botón cerrar */}
            <div className="h-16 flex items-center justify-between px-5 border-b border-line dark:border-gray-800">
                <div className="flex items-center gap-2 min-w-0">
                    <span className="w-8 h-8 rounded-lg bg-primary text-white font-bold text-lg flex items-center justify-center shrink-0">
                        C
                    </span>
                    <div className="flex flex-col min-w-0">
                        <span className="text-ink dark:text-white font-bold text-base tracking-tight leading-tight">CVExpert</span>
                        <span className="text-muted text-[11px] leading-tight truncate">Tu carrera, más clara</span>
                    </div>
                </div>
                <button onClick={onClose} className="text-muted hover:text-ink dark:hover:text-white transition-colors">
                    <X size={20} />
                </button>
            </div>

            {/* Navegación */}
            <nav className="flex-1 py-4 px-3 overflow-y-auto flex flex-col gap-1">
                {navItems.map(({ to, icon: Icon, label }) => (
                    <NavLink
                        key={to}
                        to={to}
                        end={to === '/'}
                        onClick={onClose}
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
              ${isActive
                                ? 'bg-primary-tint text-primary dark:bg-primary/15'
                                : 'text-body dark:text-gray-400 hover:bg-primary-tint/60 hover:text-primary dark:hover:bg-gray-800'
                            }`
                        }
                    >
                        <Icon size={18} />
                        {label}
                    </NavLink>
                ))}
            </nav>

            {/* Version publicada: coincide con el tag de Git que crea el pipeline */}
            <div className="px-5 py-3 border-t border-line dark:border-gray-800">
                <span className="text-xs text-muted">Versión {__APP_VERSION__}</span>
            </div>
        </aside>
    );
}
