import { useEffect, useRef, useState } from 'react';
import { MoreVertical } from 'lucide-react';

export interface MoreMenuItem {
    label: string;
    icon: React.ComponentType<{ size?: number }>;
    onSelect: () => void;
    /** Lo pinta en rojo: acciones que no se pueden deshacer */
    danger?: boolean;
}

/**
 * Menú de acciones secundarias detrás de tres puntos.
 *
 * Deja a la vista sólo lo que se usa seguido y guarda lo demás: con cuatro
 * botones del mismo tamaño, borrar pesaba igual que ver, y en una tarjeta
 * angosta no entraban sin apretarse.
 */
export default function MoreMenu({ items, label = 'Más acciones' }: {
    items: MoreMenuItem[];
    label?: string;
}) {
    const [open, setOpen] = useState(false);
    const caja = useRef<HTMLDivElement>(null);

    // Cerrar al pulsar fuera o con Escape, que es lo que se espera de un menú
    useEffect(() => {
        if (!open) return;

        const alPulsar = (e: MouseEvent) => {
            if (!caja.current?.contains(e.target as Node)) setOpen(false);
        };
        const alTeclear = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setOpen(false);
        };

        document.addEventListener('mousedown', alPulsar);
        document.addEventListener('keydown', alTeclear);
        return () => {
            document.removeEventListener('mousedown', alPulsar);
            document.removeEventListener('keydown', alTeclear);
        };
    }, [open]);

    return (
        <div ref={caja} className="relative shrink-0">
            <button
                type="button"
                onClick={() => setOpen(v => !v)}
                title={label}
                aria-label={label}
                aria-haspopup="menu"
                aria-expanded={open}
                className="rounded-lg border border-line px-2 py-2 text-muted transition-colors hover:border-primary hover:text-primary dark:border-gray-700"
            >
                <MoreVertical size={13} />
            </button>

            {open && (
                <div
                    role="menu"
                    // Se abre hacia arriba y a la izquierda: en la última fila de
                    // la rejilla, hacia abajo quedaría fuera de la pantalla.
                    className="absolute bottom-full right-0 z-30 mb-1 min-w-[11rem] overflow-hidden rounded-xl border border-line bg-surface py-1 shadow-lg dark:border-gray-700 dark:bg-gray-900"
                >
                    {items.map(({ label: texto, icon: Icon, onSelect, danger }) => (
                        <button
                            key={texto}
                            type="button"
                            role="menuitem"
                            onClick={() => { setOpen(false); onSelect(); }}
                            className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium transition-colors
                                ${danger
                                ? 'text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10'
                                : 'text-body hover:bg-canvas dark:text-gray-300 dark:hover:bg-gray-800'
                            }`}
                        >
                            <Icon size={14} />
                            {texto}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
