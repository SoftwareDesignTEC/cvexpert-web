import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { cvService } from '../../services/cvService';
import { ApiError, describeError } from '../../services/http';
import type { CV } from '../../types/models';

/**
 * Confirmación para borrar un currículum.
 *
 * Se pide en una ventana aparte y no con un botón de dos toques porque acá no
 * se pierde una fila: se pierde el documento entero, y no hay forma de
 * recuperarlo.
 */
export default function DeleteCvDialog({
    cv, onClose, onDeleted,
}: {
    cv: CV | null;
    onClose: () => void;
    onDeleted: (id: string) => void;
}) {
    const [working, setWorking] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const borrar = async () => {
        if (!cv) return;
        setWorking(true);
        setError(null);
        try {
            await cvService.remove(cv.id);
            onDeleted(cv.id);
        } catch (err) {
            // Un 404 significa que ya no está: el resultado que se buscaba
            if (err instanceof ApiError && err.status === 404) {
                onDeleted(cv.id);
                return;
            }
            setError(describeError(err, 'borrar el currículum'));
            setWorking(false);
        }
    };

    return (
        <Modal
            open={cv !== null}
            title="Borrar currículum"
            onClose={onClose}
        >
            <div className="flex flex-col gap-4">
                <div className="flex gap-2 rounded-xl border border-rose-300 bg-rose-50 px-3 py-2.5 dark:border-rose-500/40 dark:bg-rose-500/10">
                    <AlertTriangle size={16} className="mt-0.5 shrink-0 text-rose-600 dark:text-rose-400" />
                    <p className="text-xs text-rose-900 dark:text-rose-200">
                        Vas a borrar <strong>{cv?.title}</strong> con todo su contenido.
                        No se puede deshacer.
                    </p>
                </div>

                {error && <p className="text-sm text-rose-500">{error}</p>}

                <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                    <Button type="button" variant="secondary" size="sm" onClick={onClose} disabled={working}>
                        Cancelar
                    </Button>
                    <Button type="button" variant="danger" size="sm" onClick={borrar} disabled={working}>
                        {working ? 'Borrando…' : 'Sí, borrarlo'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
