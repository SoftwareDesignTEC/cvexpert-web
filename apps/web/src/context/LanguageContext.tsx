/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { NotificationLanguage } from '../types/models';

// Idioma en que el servicio de notificaciones redacta los avisos. Es una preferencia
// del dispositivo, como el tema: se guarda en localStorage y AuthProvider la sincroniza
// con el directorio del servicio cada vez que cambia.
const STORAGE_KEY = 'notification_language';
const DEFAULT_LANGUAGE: NotificationLanguage = 'es';

export const NOTIFICATION_LANGUAGES: { value: NotificationLanguage; label: string }[] = [
    { value: 'es', label: 'Español' },
    { value: 'en', label: 'Inglés' },
];

function isLanguage(value: unknown): value is NotificationLanguage {
    return NOTIFICATION_LANGUAGES.some(l => l.value === value);
}

function readSavedLanguage(): NotificationLanguage {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        return isLanguage(saved) ? saved : DEFAULT_LANGUAGE;
    } catch {
        return DEFAULT_LANGUAGE;
    }
}

interface LanguageContextValue {
    notificationLanguage: NotificationLanguage;
    setNotificationLanguage: (language: NotificationLanguage) => void;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
    const [notificationLanguage, setLanguageState] = useState<NotificationLanguage>(readSavedLanguage);

    const setNotificationLanguage = useCallback((language: NotificationLanguage) => {
        setLanguageState(language);
        try {
            localStorage.setItem(STORAGE_KEY, language);
        } catch {
            // Sin almacenamiento la preferencia dura hasta recargar, igual se envía al servidor
        }
    }, []);

    const value = useMemo(
        () => ({ notificationLanguage, setNotificationLanguage }),
        [notificationLanguage, setNotificationLanguage],
    );

    return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
    const ctx = useContext(LanguageContext);
    if (!ctx) throw new Error('useLanguage debe usarse dentro de <LanguageProvider>');
    return ctx;
}
