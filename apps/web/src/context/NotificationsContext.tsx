/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { HubConnection } from '@microsoft/signalr';
import Toast from '../components/ui/Toast';
import { useAuth } from './AuthContext';
import { notificationService } from '../services/notificationService';
import { describeError } from '../services/http';
import type { AppNotification } from '../types/models';

// Un aviso en vivo se lee con más calma que la confirmación de un botón
const LIVE_TOAST_MS = 4000;

// La campana sólo adelanta lo último; el historial completo está en /notifications
const LATEST_COUNT = 5;

// Últimas notificaciones, precargadas para que la campana abra sin esperar al servidor.
// Llevan el usuario al que pertenecen: si cambia la sesión dejan de mostrarse en el
// mismo render, sin esperar a que un efecto las limpie.
interface LatestState {
    userId: string | null;
    items: AppNotification[];
    loaded: boolean;          // hubo al menos una carga exitosa para este usuario
    error: string | null;     // la última carga falló
}

const NO_LATEST: AppNotification[] = [];
const EMPTY_LATEST: LatestState = { userId: null, items: NO_LATEST, loaded: false, error: null };

interface NotificationsContextValue {
    // null = el servicio no respondió (p. ej. la API aún no está publicada en el APIM).
    // La campana lo usa para ocultar el contador en vez de mostrar un cero falso.
    unreadCount: number | null;
    // Sube con cada aviso en vivo o reconexión; el centro de notificaciones recarga su lista
    liveVersion: number;
    refreshUnreadCount: () => void;
    // Las últimas notificaciones (máximo 5), al día con los avisos en vivo y las marcas
    latest: AppNotification[];
    latestLoaded: boolean;
    latestError: string | null;
    // Vuelve a pedir las últimas por detrás, sin vaciar lo que ya se muestra
    refreshLatest: () => void;
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
    const [latestState, setLatestState] = useState<LatestState>(EMPTY_LATEST);
    const [toast, setToast] = useState<{ id: number; message: string } | null>(null);

    // Número de la última petición de "latest". Una respuesta sólo se aplica si sigue
    // siendo la última: un aviso en vivo, una marca local o un cambio de sesión suben
    // el número y dejan sin efecto lo que estaba en camino (traería datos viejos).
    const latestRequest = useRef(0);
    // Usuario cuya lista ya se cargó bien al menos una vez
    const latestLoadedFor = useRef<string | null>(null);

    const refreshUnreadCount = useCallback(() => setCountKey(k => k + 1), []);
    const dismissToast = useCallback(() => setToast(null), []);

    // Aplica un cambio a la lista del usuario indicado (la de otro usuario se descarta)
    const updateLatest = useCallback((owner: string, change: (s: LatestState) => LatestState) => {
        setLatestState(prev => change(prev.userId === owner ? prev : { ...EMPTY_LATEST, userId: owner }));
    }, []);

    const loadLatest = useCallback(async (owner: string) => {
        const request = ++latestRequest.current;
        try {
            const res = await notificationService.getAll({ page: 1, pageSize: LATEST_COUNT });
            if (request !== latestRequest.current) return;
            latestLoadedFor.current = owner;
            setLatestState({ userId: owner, items: res.items.slice(0, LATEST_COUNT), loaded: true, error: null });
        } catch (err) {
            if (request !== latestRequest.current) return;
            // Se conserva la lista anterior: la campana sólo muestra el error si no hay nada
            updateLatest(owner, s => ({ ...s, error: describeError(err, 'cargar tus notificaciones') }));
        }
    }, [updateLatest]);

    // Un cambio local deja viejas las respuestas en camino. Si la lista nunca se cargó,
    // se pide de nuevo para no quedarse sólo con lo que se cambió localmente.
    const invalidateLatestRequests = useCallback((owner: string) => {
        latestRequest.current += 1;
        if (latestLoadedFor.current !== owner) loadLatest(owner);
    }, [loadLatest]);

    const refreshLatest = useCallback(() => {
        if (userId) loadLatest(userId);
    }, [userId, loadLatest]);

    // Contador y últimas notificaciones, en paralelo, al iniciar sesión. Se repite al
    // reconectar el hub y al reintentar desde el centro de notificaciones (countKey).
    useEffect(() => {
        if (!userId) return;
        let cancelled = false;

        const loadCount = async () => {
            try {
                const count = await notificationService.getUnreadCount();
                if (!cancelled) setUnreadCount(count);
            } catch {
                // 404 o sin red: el contador se oculta. Un 401 ya cerró la sesión en http.ts.
                if (!cancelled) setUnreadCount(null);
            }
        };
        loadCount();
        loadLatest(userId);

        return () => { cancelled = true; };
    }, [userId, countKey, loadLatest]);

    // Avisos en vivo. La librería se carga recién acá para no sumarla al bundle principal.
    useEffect(() => {
        if (!userId) return;
        const owner = userId;
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

                // Mismo esquema que un item de GET /notifications (llega con read: false):
                // se suma arriba de la lista sin volver a pedirla.
                connection.on('notification', (notification: AppNotification) => {
                    setUnreadCount(c => (c ?? 0) + 1);
                    setLiveVersion(v => v + 1);
                    if (notification && typeof notification.id === 'string') {
                        // Antes de pedir otra vez (si hace falta), para que un GET en camino
                        // que no trae este aviso no lo pise al llegar
                        invalidateLatestRequests(owner);
                        updateLatest(owner, s => ({
                            ...s,
                            items: [notification, ...s.items.filter(n => n.id !== notification.id)].slice(0, LATEST_COUNT),
                        }));
                    }
                    setToast({ id: Date.now(), message: notification?.title || 'Tenés una notificación nueva.' });
                });

                // Lo que llegó mientras no había conexión no se recibió por el hub:
                // countKey vuelve a pedir el contador y las últimas
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
    }, [userId, invalidateLatestRequests, updateLatest]);

    const markAsRead = useCallback(async (id: string) => {
        const updated = await notificationService.markAsRead(id);
        setUnreadCount(c => (c === null ? c : Math.max(0, c - 1)));
        if (userId) {
            invalidateLatestRequests(userId);
            // read y readAt salen de la respuesta del PATCH, no del reloj local
            updateLatest(userId, s => ({
                ...s,
                items: s.items.map(n => (n.id === id
                    ? { ...n, read: updated?.read ?? true, readAt: updated?.readAt ?? n.readAt }
                    : n)),
            }));
        }
        return updated;
    }, [userId, invalidateLatestRequests, updateLatest]);

    const markAllAsRead = useCallback(async () => {
        await notificationService.markAllAsRead();
        setUnreadCount(0);
        if (userId) {
            // El 204 no trae la hora; las que ya estaban leídas conservan su readAt,
            // igual que en el servidor
            const now = Date.now();
            invalidateLatestRequests(userId);
            updateLatest(userId, s => ({
                ...s,
                items: s.items.map(n => (n.read ? n : { ...n, read: true, readAt: now })),
            }));
        }
    }, [userId, invalidateLatestRequests, updateLatest]);

    // Sólo cuenta la lista del usuario con sesión
    const ownLatest = latestState.userId !== null && latestState.userId === userId ? latestState : EMPTY_LATEST;

    const value = useMemo<NotificationsContextValue>(
        () => ({
            unreadCount,
            liveVersion,
            refreshUnreadCount,
            latest: ownLatest.items,
            latestLoaded: ownLatest.loaded,
            latestError: ownLatest.error,
            refreshLatest,
            markAsRead,
            markAllAsRead,
        }),
        [unreadCount, liveVersion, refreshUnreadCount, ownLatest, refreshLatest, markAsRead, markAllAsRead],
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
