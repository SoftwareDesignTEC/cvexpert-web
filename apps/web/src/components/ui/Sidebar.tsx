import { NavLink } from 'react-router-dom';
import { X, LayoutDashboard, FileText, User, TrendingUp, Layout, Briefcase, Kanban, Settings, PlusCircle } from 'lucide-react';

const navItems = [
    { to: '/',             icon: LayoutDashboard, label: 'Panel Principal'      },
    { to: '/cvs',          icon: FileText,         label: 'Mis Currículums'      },
    { to: '/cvs/new',      icon: PlusCircle,       label: 'Crear CV'             },
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
        <aside className="w-64 h-full bg-[#1A3A6B] dark:bg-gray-900 flex flex-col">
            {/* Header del sidebar con botón cerrar */}
            <div className="h-16 flex items-center justify-between px-6 border-b border-white/10">
                <span className="text-white font-bold text-xl tracking-tight">CV Master</span>
                <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
                    <X size={20} />
                </button>
            </div>

            {/* Navegación */}
            <nav className="flex-1 py-4 overflow-y-auto">
                {navItems.map(({ to, icon: Icon, label }) => (
                    <NavLink
                        key={to}
                        to={to}
                        end={to === '/'}
                        onClick={onClose}
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-6 py-3 text-sm font-medium transition-colors
              ${isActive
                                ? 'bg-white/20 text-white'
                                : 'text-white/70 hover:bg-white/10 hover:text-white'
                            }`
                        }
                    >
                        <Icon size={18} />
                        {label}
                    </NavLink>
                ))}
            </nav>
        </aside>
    );
}
