import { Menu, Moon, Sun, LogOut, Wifi, WifiOff } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

interface HeaderProps {
    onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
    const { theme, toggleTheme } = useTheme();
    const { user, logout } = useAuth();
    const isOnline = useOnlineStatus();

    return (
        <header className="h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-6 shrink-0">

            {/* Izquierda: hamburguesa + estado online */}
            <div className="flex items-center gap-4">
                <button
                    onClick={onMenuClick}
                    className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    title="Menú"
                >
                    <Menu size={20} />
                </button>

                <div className={`flex items-center gap-1.5 text-sm font-medium
          ${isOnline ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}
                >
                    {isOnline ? <Wifi size={15} /> : <WifiOff size={15} />}
                    <span>{isOnline ? 'Online' : 'Offline'}</span>
                </div>
            </div>

            {/* Derecha: toggle tema + usuario */}
            <div className="flex items-center gap-3">
                <button
                    onClick={toggleTheme}
                    className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    title={theme === 'light' ? 'Modo oscuro' : 'Modo claro'}
                >
                    {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
                </button>

                {user && (
                    <div className="flex items-center gap-2">
                        <img src={user.picture} alt={user.name} className="w-8 h-8 rounded-full" />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-200 hidden sm:block">
              {user.name}
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
            </div>
        </header>
    );
}
