import { useEffect, useRef, useState } from 'react';
import { ChevronDown, LogOut, Menu, Settings, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Avatar } from './Avatar';
import logo from '../../assets/logo.png';
import NotificationsBell from './NotificationsBell';

interface HeaderProps {
    onMenuClick: () => void;
    /** Con la barra abierta, el botón para cerrarla vive dentro de ella */
    showMenuButton?: boolean;
}

// Las dos pantallas de cuenta. Están también en el menú lateral, que resalta
// la activa por su cuenta, así que al entrar desde acá se ve dónde se quedó.
const CUENTA = [
    { to: '/profile',  icon: User,     label: 'Mi Perfil' },
    { to: '/settings', icon: Settings, label: 'Configuración' },
];

export default function Header({ onMenuClick, showMenuButton = true }: HeaderProps) {
    const navigate = useNavigate();
    const { isAuthenticated, profile, logout } = useAuth();
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Cerrar al pulsar fuera o con Escape, como cualquier menú
    useEffect(() => {
        if (!menuOpen) return;
        const alPulsar = (e: MouseEvent) => {
            if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
        };
        const alTeclear = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false); };
        document.addEventListener('mousedown', alPulsar);
        document.addEventListener('keydown', alTeclear);
        return () => {
            document.removeEventListener('mousedown', alPulsar);
            document.removeEventListener('keydown', alTeclear);
        };
    }, [menuOpen]);

    return (
        <header className="h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-6 shrink-0">

            {/* Izquierda: hamburguesa + logo (vuelve al Dashboard) + estado online */}
            <div className="flex items-center gap-4">
                {/* Sólo cuando la barra está cerrada: con ella abierta, el
                    botón de cerrarla está adentro y dos harían lo mismo. */}
                {showMenuButton && (
                    <button
                        onClick={onMenuClick}
                        className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        title="Abrir el menú"
                        aria-label="Abrir el menú"
                    >
                        <Menu size={20} />
                    </button>
                )}

                {/* Marca: el recuadro azul queda listo para recibir el logo real;
                    mientras tanto muestra la inicial. */}
                <button
                    onClick={() => navigate('/')}
                    className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-primary-tint dark:hover:bg-gray-800 transition-colors"
                    title="Ir al Panel Principal"
                >
                    <img src={logo} alt="" aria-hidden="true" className="w-9 h-9 shrink-0 object-contain" />
                    <span className="text-base font-bold text-ink dark:text-white">CVExpert</span>
                </button>

            </div>

            {/* Derecha: notificaciones + cuenta.
                El tema se cambia desde Configuración, y cerrar sesión pasó al
                menú de la cuenta: tres botones sueltos competían entre sí. */}
            <div className="flex items-center gap-3">
                <NotificationsBell />

                {isAuthenticated && (
                    <div ref={menuRef} className="relative">
                        {/* Nombre y foto vienen del APIM, no del token: sin conexión no se
                            muestran, y mientras tanto se usan las iniciales. */}
                        <button
                            onClick={() => setMenuOpen(v => !v)}
                            title="Mi cuenta"
                            aria-haspopup="menu"
                            aria-expanded={menuOpen}
                            className="flex items-center gap-2 rounded-full border border-line dark:border-gray-800 bg-surface dark:bg-gray-900 py-1 pl-1 pr-2 shadow-sm hover:border-primary transition-colors"
                        >
                            <Avatar src={profile?.photoUrl} name={profile?.name ?? 'Mi cuenta'} size={32} />
                            <span className="text-sm font-medium text-ink dark:text-gray-200 hidden sm:block max-w-[12rem] truncate">
                                {profile?.name ?? 'Mi cuenta'}
                            </span>
                            <ChevronDown size={14} className="text-muted shrink-0" />
                        </button>

                        {menuOpen && (
                            <div
                                role="menu"
                                className="absolute right-0 top-full z-40 mt-1 min-w-[12rem] overflow-hidden rounded-xl border border-line bg-surface py-1 shadow-lg dark:border-gray-700 dark:bg-gray-900"
                            >
                                {CUENTA.map(({ to, icon: Icon, label }) => (
                                    <button
                                        key={to}
                                        role="menuitem"
                                        onClick={() => { setMenuOpen(false); navigate(to); }}
                                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium text-body transition-colors hover:bg-canvas dark:text-gray-300 dark:hover:bg-gray-800"
                                    >
                                        <Icon size={15} />
                                        {label}
                                    </button>
                                ))}

                                <div className="my-1 border-t border-line dark:border-gray-700" />

                                <button
                                    role="menuitem"
                                    onClick={() => { setMenuOpen(false); logout(); }}
                                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10"
                                >
                                    <LogOut size={15} />
                                    Cerrar sesión
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </header>
    );
}