import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../components/ui/Sidebar';
import Header from '../components/ui/Header';
import { NotificationsProvider } from '../context/NotificationsContext';
import { NotificationAdminProvider } from '../context/NotificationAdminContext';

// A partir de este ancho la barra cabe al lado del contenido sin apretarlo.
// Coincide con el `lg` de Tailwind.
const ANCHO_ESCRITORIO = '(min-width: 1024px)';

// Pantallas que necesitan todo el ancho y no toleran que la barra les quite
// espacio. En el tablero de postulaciones son cinco columnas que tienen que
// entrar enteras: con la barra fija al lado, quedaban apretadas. Acá la barra
// se superpone al abrirse en vez de empujar, y arranca cerrada.
const ANCHO_COMPLETO = ['/applications'];

export default function MainLayout() {
    const { pathname } = useLocation();

    const [esEscritorio, setEsEscritorio] = useState(
        () => window.matchMedia(ANCHO_ESCRITORIO).matches,
    );

    // Al cruzar el umbral cambia el modo de la barra
    useEffect(() => {
        const mq = window.matchMedia(ANCHO_ESCRITORIO);
        const alCambiar = (e: MediaQueryListEvent) => setEsEscritorio(e.matches);
        mq.addEventListener('change', alCambiar);
        return () => mq.removeEventListener('change', alCambiar);
    }, []);

    // `fija` es el modo en el que la barra ocupa su propio espacio y empuja el
    // contenido. Fuera de él se superpone.
    const fija = esEscritorio && !ANCHO_COMPLETO.includes(pathname);

    // Dos estados separados en vez de uno solo que haya que reiniciar al cambiar
    // de modo: así pasar por una pantalla de ancho completo no hace olvidar que
    // la barra estaba desplegada, y al volver sigue como estaba.
    const [cerradaFija, setCerradaFija] = useState(false);
    const [abiertaSuperpuesta, setAbiertaSuperpuesta] = useState(false);

    const abierta = fija ? !cerradaFija : abiertaSuperpuesta;
    const abrir  = () => (fija ? setCerradaFija(false) : setAbiertaSuperpuesta(true));
    const cerrar = () => (fija ? setCerradaFija(true)  : setAbiertaSuperpuesta(false));

    // Navegar cierra la superpuesta, que tapa el contenido. La fija se queda:
    // cerrarla en cada clic obligaría a abrirla de nuevo a cada paso.
    const alNavegar = () => setAbiertaSuperpuesta(false);

    const clasesBarra = fija
        ? `static z-auto translate-x-0 ${abierta ? 'w-64' : 'w-0'}`
        : `fixed top-0 left-0 z-20 w-64 ${abierta ? 'translate-x-0' : '-translate-x-full'}`;

    // Las notificaciones sólo existen con sesión, y este layout sólo se monta con sesión
    return (
        <NotificationsProvider>
        <NotificationAdminProvider>
            <div className="flex h-screen overflow-hidden">

                {/* El fondo oscuro sólo hace falta cuando la barra se superpone */}
                {abierta && !fija && (
                    <div className="fixed inset-0 z-10 bg-black/50" onClick={cerrar} />
                )}

                <div className={`h-full shrink-0 transition-all duration-300 ${clasesBarra}`}>
                    <div className="h-full overflow-hidden">
                        <Sidebar onClose={cerrar} onNavigate={alNavegar} />
                    </div>
                </div>

                {/* Área principal */}
                <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
                    <Header onMenuClick={abrir} showMenuButton={!abierta} />
                    <main className="flex-1 overflow-y-auto p-6">
                        <Outlet />
                    </main>
                </div>

            </div>
        </NotificationAdminProvider>
        </NotificationsProvider>
    );
}
