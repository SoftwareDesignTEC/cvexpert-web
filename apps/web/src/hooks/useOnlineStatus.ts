import { useEffect, useState } from 'react';

// Detecta la conectividad de red automáticamente usando navigator.onLine
// Se actualiza en tiempo real cuando el dispositivo pierde o recupera conexión
export function useOnlineStatus(): boolean {
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    useEffect(() => {
        const goOnline  = () => setIsOnline(true);
        const goOffline = () => setIsOnline(false);

        window.addEventListener('online',  goOnline);
        window.addEventListener('offline', goOffline);

        return () => {
            window.removeEventListener('online',  goOnline);
            window.removeEventListener('offline', goOffline);
        };
    }, []);

    return isOnline;
}