/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { HubConnection } from '@microsoft/signalr';
import Toast from '../components/ui/Toast';
import { useAuth } from './AuthContext';
import { notificationService } from '../services/notificationService';
import type { AppNotification } from '../types/models';

// Un aviso en vivo se lee con más calma que la confirmación de un botón
const LIVE_TOAST_MS = 4000;

interface NotificationsContextValue {
    // null = el servicio no respondió (p. ej. la API aún no está publicada en el APIM).
    // La campana lo usa para ocultar el contador en vez de mostrar un cero falso.
    unreadCount: number | null;
    // Sube con cada aviso en vivo o reconexión; la campana y la página recargan su lista
    liveVersion: number;
    refreshUnreadCount: () => void;
    // Resuelve con la notificación que devuelve el servidor, ya leída y con su readAt
    markAsRead: (id: string) => Promise<AppNotification>;
    markAllAsRead: () => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
    const { userId } = useAuth();
    const [unreadCount, setUnreadCount] = useState<number | null>(null);
    const [countKey, setCountKey] = useState(0);
    const [liveVersion, setLiveVersion] = useState(0);
    const [toast, setToast] = useState<{ id: number; message: string } | null>(null);

    const refreshUnreadCount = useCallback(() => setCountKey(k => k + 1), []);
    const dismissToast = useCallback(() => setToast(null), []);

    // Contador inicial por HTTP; también se repite al reconectar el hub
    useEffect(() => {
        if (!userId) return;
        let cancelled = false;

        const load = async () => {
            try {
                const count = await notificationService.getUnreadCount();
                if (!cancelled) setUnreadCount(count);
            } catch {
                // 404 o sin red: el contador se oculta. Un 401 ya cerró la sesión en http.ts.
                if (!cancelled) setUnreadCount(null);
            }
        };
        load();

        return () => { cancelled = true; };
    }, [userId, countKey]);

    // Avisos en vivo. La librería se carga recién acá para no sumarla al bundle principal.
    useEffect(() => {
        if (!userId) return;
        let cancelled = false;
        let connection: HubConnection | null = null;

        const connect = async () => {
            try {
                const signalR = await import('@microsoft/signalr');
                if (cancelled) return;

                connection = new signalR.HubConnectionBuilder()
                    .withUrl(notificationService.hubUrl, {
                        // Se lee en cada intento para que una reconexión use el token vigente
                        accessTokenFactory: () => localStorage.getItem('id_token') ?? '',
                        // La autenticación va en el token, no en cookies: así el CORS del
                        // APIM no necesita Access-Control-Allow-Credentials.
                        withCredentials: false,
                    })
                    .withAutomaticReconnect()
                    .configureLogging(signalR.LogLevel.Warning)
                    .build();

                // Mismo esquema que un item de GET /notifications (llega con read: false)
                connection.on('notification', (notification: AppNotification) => {
                    setUnreadCount(c => (c ?? 0) + 1);
                    setLiveVersion(v => v + 1);
                    setToast({ id: Date.now(), message: notification?.title || 'Tenés una notificación nueva.' });
                });

                // Lo que llegó mientras no había conexión no se recibió por el hub
                connection.onreconnected(() => {
                    setCountKey(k => k + 1);
                    setLiveVersion(v => v + 1);
                });

                await connection.start();
            } catch {
                // Negotiate rechazado, sin red o chunk sin descargar: se sigue sin tiempo
                // real. No se dispara auth:unauthorized desde acá: la conexión final va a
                // Azure SignalR con su propio token, y un rechazo ahí no prueba que la
                // sesión de Google haya vencido. Los 401 del APIM ya los atiende http.ts.
            }
        };
        connect();

        return () => {
            cancelled = true;
            connection?.stop().catch(() => {});
        };
    }, [userId]);

    const markAsRead = useCallback(async (id: string) => {
        const updated = await notificationService.markAsRead(id);
        setUnreadCount(c => (c === null ? c : Math.max(0, c - 1)));
        return updated;
    }, []);

    const markAllAsRead = useCallback(async () => {
        await notificationService.markAllAsRead();
        setUnreadCount(0);
    }, []);

    const value = useMemo<NotificationsContextValue>(
        () => ({ unreadCount, liveVersion, refreshUnreadCount, markAsRead, markAllAsRead }),
        [unreadCount, liveVersion, refreshUnreadCount, markAsRead, markAllAsRead],
    );

    return (
        <NotificationsContext.Provider value={value}>
            {children}
            {toast && (
                <Toast
                    key={toast.id}
                    message={toast.message}
                    onDismiss={dismissToast}
                    visibleMs={LIVE_TOAST_MS}
                    className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 max-w-[calc(100vw-2rem)]"
                />
            )}
        </NotificationsContext.Provider>
    );
}

export function useNotifications(): NotificationsContextValue {
    const ctx = useContext(NotificationsContext);
    if (!ctx) throw new Error('useNotifications debe usarse dentro de <NotificationsProvider>');
    return ctx;
}
