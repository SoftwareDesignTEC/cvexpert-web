import { useNavigate, useRouteError } from 'react-router-dom';
import { AlertTriangle, Home, RotateCw } from 'lucide-react';
import Button from '../components/ui/Button';

// Reemplaza la pantalla de error cruda de React Router. Sin esto, cualquier fallo
// inesperado deja al usuario frente a un volcado de la pila.
export default function ErrorPage() {
    const error = useRouteError();
    const navigate = useNavigate();

    const detail = error instanceof Error ? error.message : null;

    return (
        <div className="min-h-screen flex items-center justify-center px-4">
            <div className="w-full max-w-md bg-surface dark:bg-gray-900 border border-line dark:border-gray-800 rounded-2xl shadow-sm p-6 flex flex-col items-center gap-4 text-center">
                <span className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center">
                    <AlertTriangle size={22} className="text-amber-500" />
                </span>

                <div>
                    <h1 className="text-lg font-bold text-ink dark:text-white">Algo salió mal</h1>
                    <p className="text-sm text-muted mt-1">
                        No pudimos mostrar esta pantalla. Probá recargar; si sigue pasando, volvé al panel principal.
                    </p>
                </div>

                {/* El detalle técnico se muestra plegado para no asustar, pero sirve al reportar */}
                {detail && (
                    <details className="w-full text-left">
                        <summary className="text-xs text-muted cursor-pointer">Detalle técnico</summary>
                        <p className="mt-2 rounded-lg bg-canvas dark:bg-gray-800 p-3 text-xs text-body dark:text-gray-300 break-words">
                            {detail}
                        </p>
                    </details>
                )}

                <div className="flex flex-col gap-2 w-full sm:flex-row">
                    <Button variant="secondary" className="w-full" onClick={() => window.location.reload()}>
                        <RotateCw size={15} />
                        Recargar
                    </Button>
                    <Button className="w-full" onClick={() => navigate('/')}>
                        <Home size={15} />
                        Ir al panel
                    </Button>
                </div>
            </div>
        </div>
    );
}
