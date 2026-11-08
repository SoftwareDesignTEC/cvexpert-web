import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

// Aviso flotante que se desvanece solo. Se puede cerrar antes con la equis.
const VISIBLE_MS = 1700;   // tiempo en pantalla antes de empezar a desaparecer
const FADE_MS = 300;       // duración del desvanecido

interface ToastProps {
    message: string;
    onDismiss: () => void;
    // Ubicación. Por defecto queda centrado abajo del contenedor posicionado más
    // cercano, que es como lo usan los diálogos de plantillas.
    className?: string;
    visibleMs?: number;
}

export default function Toast({
    message,
    onDismiss,
    className = 'absolute bottom-4 left-1/2 -translate-x-1/2',
    visibleMs = VISIBLE_MS,
}: ToastProps) {
    const [leaving, setLeaving] = useState(false);

    useEffect(() => {
        const fade = setTimeout(() => setLeaving(true), visibleMs);
        const remove = setTimeout(onDismiss, visibleMs + FADE_MS);
        return () => { clearTimeout(fade); clearTimeout(remove); };
    }, [onDismiss, visibleMs]);

    return (
        <div
            role="status"
            className={`${className} flex items-center gap-3 rounded-xl bg-ink px-4 py-2.5 shadow-lg transition-opacity
                ${leaving ? 'opacity-0' : 'opacity-100'}`}
            style={{ transitionDuration: `${FADE_MS}ms` }}
        >
            <span className="text-sm text-white">{message}</span>
            <button
                onClick={onDismiss}
                aria-label="Cerrar aviso"
                className="shrink-0 text-white/60 hover:text-white transition-colors"
            >
                <X size={15} />
            </button>
        </div>
    );
}
