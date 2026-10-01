import { Menu, Moon, Sun, LogOut, Wifi, WifiOff, Bell, UserCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

interface HeaderProps {
    onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
    const navigate = useNavigate();
    const { theme, toggleTheme } = useTheme();
    const { isAuthenticated, profile, logout } = useAuth();
    const isOnline = useOnlineStatus();

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

                {/* Logo — placeholder de texto hasta que exista el logo real de la app */}
                <button
                    onClick={() => navigate('/')}
                    className="text-sm font-bold text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800 rounded-lg px-3 py-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    title="Ir al Panel Principal"
                >
                    CVMaster
                </button>

                <div className={`hidden sm:flex items-center gap-1.5 text-sm font-medium
          ${isOnline ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}
                >
                    {isOnline ? <Wifi size={15} /> : <WifiOff size={15} />}
                    <span>{isOnline ? 'Online' : 'Offline'}</span>
                </div>
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
                    <div className="flex items-center gap-2">
                        {/* Nombre y foto vienen del APIM, no del token: sin conexión no se muestran */}
                        {profile?.photoUrl ? (
                            <img src={profile.photoUrl} alt={profile.name} className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                            <UserCircle2 size={32} className="text-gray-400 dark:text-gray-600" />
                        )}
                        {profile && (
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-200 hidden sm:block">
                                {profile.name}
                            </span>
                        )}
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