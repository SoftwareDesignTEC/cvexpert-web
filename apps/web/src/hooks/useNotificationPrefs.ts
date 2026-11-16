import { useCallback, useState } from 'react';

/**
 * Qué avisos quiere recibir la persona.
 *
 * Se guarda en el dispositivo porque el servicio de notificaciones todavía no
 * expone dónde dejarlo: no hay endpoint de preferencias. Mientras tanto la
 * elección se respeta en este navegador y no se pierde al recargar; cuando
 * exista el endpoint, esto pasa a ser la caché de lo que diga el servidor y el
 * resto de la pantalla no cambia.
 *
 * No se guarda el estado de las postulaciones: ese lo maneja la persona desde
 * su propio tablero, así que avisarle de un cambio que hizo ella misma no
 * aporta nada.
 */
const STORAGE_KEY = 'notification_prefs';

export interface NotificationPrefs {
    courses: boolean;
    jobs: boolean;
}

const POR_DEFECTO: NotificationPrefs = { courses: true, jobs: true };

function leer(): NotificationPrefs {
    try {
        const crudo = localStorage.getItem(STORAGE_KEY);
        if (!crudo) return POR_DEFECTO;
        const guardado = JSON.parse(crudo) as Partial<NotificationPrefs>;
        return {
            courses: typeof guardado.courses === 'boolean' ? guardado.courses : POR_DEFECTO.courses,
            jobs: typeof guardado.jobs === 'boolean' ? guardado.jobs : POR_DEFECTO.jobs,
        };
    } catch {
        // Almacenamiento bloqueado, o un valor viejo que ya no se entiende
        return POR_DEFECTO;
    }
}

export function useNotificationPrefs() {
    const [prefs, setPrefs] = useState<NotificationPrefs>(leer);

    const set = useCallback((clave: keyof NotificationPrefs, valor: boolean) => {
        setPrefs(previo => {
            const siguiente = { ...previo, [clave]: valor };
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(siguiente));
            } catch {
                // Sin almacenamiento la elección dura hasta recargar
            }
            return siguiente;
        });
    }, []);

    return { prefs, set };
}
