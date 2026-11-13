import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/ui/Sidebar';
import Header from '../components/ui/Header';
import { NotificationsProvider } from '../context/NotificationsContext';
import { NotificationAdminProvider } from '../context/NotificationAdminContext';

// A partir de este ancho la barra cabe al lado del contenido sin apretarlo.
// Coincide con el `lg` de Tailwind, que es el que usan las clases de abajo.
const ANCHO_ESCRITORIO = '(min-width: 1024px)';

export default function MainLayout() {
    // En escritorio arranca abierta: el contenido de estas pantallas no llena
    // el ancho completo, así que la barra aprovecha ese espacio en vez de
    // esconder la navegación detrás de un botón.
    const [esEscritorio, setEsEscritorio] = useState(
        () => window.matchMedia(ANCHO_ESCRITORIO).matches,
    );
    const [sidebarOpen, setSidebarOpen] = useState(esEscritorio);

    // Al cruzar el umbral cambia el modo: fija en grande, superpuesta en chico
    useEffect(() => {
        const mq = window.matchMedia(ANCHO_ESCRITORIO);
        const alCambiar = (e: MediaQueryListEvent) => {
            setEsEscritorio(e.matches);
            setSidebarOpen(e.matches);
        };
        mq.addEventListener('change', alCambiar);
        return () => mq.removeEventListener('change', alCambiar);
    }, []);

    // Navegar cierra la barra sólo cuando tapa el contenido; si está fija,
    // cerrarla en cada clic obligaría a abrirla de nuevo a cada paso.
    const alNavegar = () => { if (!esEscritorio) setSidebarOpen(false); };

    // Las notificaciones sólo existen con sesión, y este layout sólo se monta con sesión
    return (
        <NotificationsProvider>
        <NotificationAdminProvider>
            <div className="flex h-screen overflow-hidden">

                {/* El fondo oscuro sólo hace falta cuando la barra se superpone */}
                {sidebarOpen && (
                    <div
                        className="fixed inset-0 z-10 bg-black/50 lg:hidden"
                        onClick={() => setSidebarOpen(false)}
                    />
                )}

                {/* Superpuesta en pantallas chicas; en el flujo, empujando el
                    contenido, a partir de lg */}
                <div
                    className={`fixed top-0 left-0 z-20 h-full shrink-0 transition-all duration-300 lg:static lg:z-auto
                        ${sidebarOpen
                        ? 'translate-x-0 lg:w-64'
                        : '-translate-x-full lg:w-0 lg:translate-x-0'
                    }`}
                >
                    <div className="h-full overflow-hidden">
                        <Sidebar
                            onClose={() => setSidebarOpen(false)}
                            onNavigate={alNavegar}
                        />
                    </div>
                </div>

                {/* Área principal */}
                <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
                    <Header onMenuClick={() => setSidebarOpen(prev => !prev)} />
                    <main className="flex-1 overflow-y-auto p-6">
                        <Outlet />
                    </main>
                </div>

            </div>
        </NotificationAdminProvider>
        </NotificationsProvider>
    );
}
