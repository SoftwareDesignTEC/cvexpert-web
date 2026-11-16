/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { DICCIONARIO } from './dictionary';
import type { Dict } from './dictionary';
import type { Locale } from '../components/cv/cvLabels';

/**
 * Idioma de la interfaz.
 *
 * Es distinto del idioma de las notificaciones, que vive en `LanguageContext`:
 * aquel viaja al servicio, que es quien redacta los avisos, y éste sólo decide
 * qué texto dibuja el navegador. Se mantienen separados porque son dos cosas
 * distintas, aunque en Configuración se cambien con un solo control: tener dos
 * selectores de idioma en la misma pantalla no le sirve a nadie.
 *
 * Se guarda en el dispositivo, igual que el tema. No es un dato de la persona
 * —no dice nada de ella ni sirve para identificarla—, así que no cae en la
 * regla de no conservar datos del usuario entre sesiones.
 */
const STORAGE_KEY = 'app_locale';
const POR_DEFECTO: Locale = 'es';

export const LOCALES: { value: Locale; labelKey: 'es' | 'en' }[] = [
    { value: 'es', labelKey: 'es' },
    { value: 'en', labelKey: 'en' },
];

function esLocale(v: unknown): v is Locale {
    return v === 'es' || v === 'en';
}

function leerGuardado(): Locale {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        return esLocale(saved) ? saved : POR_DEFECTO;
    } catch {
        // Navegador con el almacenamiento bloqueado: se usa el idioma por defecto
        return POR_DEFECTO;
    }
}

interface LocaleContextValue {
    locale: Locale;
    setLocale: (l: Locale) => void;
    /** Los textos del idioma activo, ya resueltos */
    t: Dict;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
    const [locale, setLocaleState] = useState<Locale>(leerGuardado);

    const setLocale = useCallback((l: Locale) => {
        setLocaleState(l);
        try {
            localStorage.setItem(STORAGE_KEY, l);
        } catch {
            // Sin almacenamiento la elección dura hasta recargar
        }
        // El atributo `lang` del documento: lo usan los lectores de pantalla
        // para elegir la pronunciación, y el navegador para la corrección
        // ortográfica de los campos de texto.
        document.documentElement.lang = l;
    }, []);

    const value = useMemo(
        () => ({ locale, setLocale, t: DICCIONARIO[locale] }),
        [locale, setLocale],
    );

    return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
    const ctx = useContext(LocaleContext);
    if (!ctx) throw new Error('useLocale debe usarse dentro de <LocaleProvider>');
    return ctx;
}
