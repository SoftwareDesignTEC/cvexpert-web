/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from 'react';
import { notificationService } from '../services/notificationService';

interface NotificationAdminContextValue {
    // null = todavía se está revisando; true = GET /notifications/templates respondió 200
    canEditTemplates: boolean | null;
}

const NotificationAdminContext = createContext<NotificationAdminContextValue | null>(null);

// La web no recibe el rol del usuario: lo agrega APIM como X-User-Role sólo en las rutas
// de administración. Por eso se pregunta directo al endpoint, una sola vez al montar el
// layout (que sólo se monta con sesión), y el Sidebar y la ruta comparten la respuesta.
export function NotificationAdminProvider({ children }: { children: React.ReactNode }) {
    const [canEditTemplates, setCanEditTemplates] = useState<boolean | null>(null);

    useEffect(() => {
        let cancelled = false;

        notificationService.getTemplates()
            .then(() => { if (!cancelled) setCanEditTemplates(true); })
            // 403 (no es admin), 404 (ruta aún no publicada en APIM) o sin red: la
            // sección simplemente no existe para este usuario y no se muestra error.
            // Un 401 ya disparó auth:unauthorized en http.ts.
            .catch(() => { if (!cancelled) setCanEditTemplates(false); });

        return () => { cancelled = true; };
    }, []);

    return (
        <NotificationAdminContext.Provider value={{ canEditTemplates }}>
            {children}
        </NotificationAdminContext.Provider>
    );
}

export function useNotificationAdmin(): NotificationAdminContextValue {
    const ctx = useContext(NotificationAdminContext);
    if (!ctx) throw new Error('useNotificationAdmin debe usarse dentro de <NotificationAdminProvider>');
    return ctx;
}
