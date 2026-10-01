import { Menu, Moon, Sun, LogOut, Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';

interface HeaderProps {
    onMenuClick: () => void;
}

// Iniciales para el avatar cuando el perfil no trae foto
function initials(name?: string) {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/).slice(0, 2);
    return parts.map(p => p[0]?.toUpperCase() ?? '').join('') || '?';
}

export default function Header({ onMenuClick }: HeaderProps) {
    const navigate = useNavigate();
    const { theme, toggleTheme } = useTheme();
    const { isAuthenticated, profile, logout } = useAuth();

    return (
        <header className="h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-6 shrink-0">

            {/* Izquierda: hamburguesa + logo (vuelve al Dashboard) + estado online */}
            <div className="flex items-center gap-4">
                <button
                    onClick={onMenuClick}
                    className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    title="Menú"
                >
                    <Menu size={20} />
                </button>

                {/* Marca: el recuadro azul queda listo para recibir el logo real;
                    mientras tanto muestra la inicial. */}
                <button
                    onClick={() => navigate('/')}
                    className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-primary-tint dark:hover:bg-gray-800 transition-colors"
                    title="Ir al Panel Principal"
                >
                    <span className="w-8 h-8 rounded-lg bg-primary text-white font-bold text-lg flex items-center justify-center shrink-0">
                        C
                    </span>
                    <span className="text-base font-bold text-ink dark:text-white">CVExpert</span>
                </button>

            </div>

            {/* Derecha: notificaciones (decorativo) + usuario + tema */}
            <div className="flex items-center gap-3">
                {/* Campanita — meramente decorativa por ahora */}
                <button
                    disabled
                    className="p-2 rounded-lg text-gray-500 cursor-not-allowed"
                    title="Notificaciones"
                >
                    <Bell size={18} />
                </button>

                {isAuthenticated && (
                    <div className="flex items-center gap-2 rounded-full border border-line dark:border-gray-800 bg-surface dark:bg-gray-900 py-1 pl-1 pr-2 shadow-sm">
                        {/* Nombre y foto vienen del APIM, no del token: sin conexión no se muestran.
                            Mientras tanto se usan las iniciales para no dejar el hueco vacío. */}
                        {profile?.photoUrl ? (
                            <img src={profile.photoUrl} alt={profile.name} className="w-8 h-8 rounded-full object-cover shrink-0" />
                        ) : (
                            <span className="w-8 h-8 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center shrink-0">
                                {initials(profile?.name)}
                            </span>
                        )}
                        <span className="text-sm font-medium text-ink dark:text-gray-200 hidden sm:block max-w-[12rem] truncate">
                            {profile?.name ?? 'Mi cuenta'}
                        </span>
                        <button
                            onClick={logout}
                            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            title="Cerrar sesión"
                        >
                            <LogOut size={18} />
                        </button>
                    </div>
                )}

                <button
                    onClick={toggleTheme}
                    className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    title={theme === 'light' ? 'Modo oscuro' : 'Modo claro'}
                >
                    {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
                </button>
            </div>
        </header>
    );
}