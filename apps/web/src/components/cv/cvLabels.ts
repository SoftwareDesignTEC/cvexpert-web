// Textos del documento. El layout NO trae títulos: el cliente los pone según
// `source`. La aplicación todavía no tiene infraestructura de i18n, así que el
// diccionario vive acá con español por defecto; cuando se agregue, basta con
// pasarle el idioma activo al renderizador.

import type { ListSource } from '../../types/cvLayout';

export type Locale = 'es' | 'en';

export const SECTION_TITLE: Record<Locale, Record<ListSource, string>> = {
    es: {
        workExperiences: 'Experiencia',
        education: 'Educación',
        skills: 'Habilidades',
        languages: 'Idiomas',
        certifications: 'Certificaciones',
    },
    en: {
        workExperiences: 'Experience',
        education: 'Education',
        skills: 'Skills',
        languages: 'Languages',
        certifications: 'Certifications',
    },
};

// Los enums llegan en inglés desde el servicio; se traducen acá
export const SKILL_LEVEL: Record<Locale, Record<string, string>> = {
    es: { beginner: 'Principiante', intermediate: 'Intermedio', advanced: 'Avanzado', expert: 'Experto' },
    en: { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced', expert: 'Expert' },
};

export const LANGUAGE_LEVEL: Record<Locale, Record<string, string>> = {
    es: { basic: 'Básico', intermediate: 'Intermedio', advanced: 'Avanzado', native: 'Nativo' },
    en: { basic: 'Basic', intermediate: 'Intermediate', advanced: 'Advanced', native: 'Native' },
};

export const WORK_TYPE: Record<Locale, Record<string, string>> = {
    es: {
        formal: 'Formal',
        freelance: 'Independiente',
        volunteer: 'Voluntariado',
        'school-project': 'Proyecto académico',
        informal: 'Informal',
    },
    en: {
        formal: 'Full-time',
        freelance: 'Freelance',
        volunteer: 'Volunteer',
        'school-project': 'School project',
        informal: 'Informal',
    },
};

export const UI_TEXT: Record<Locale, { present: string; noLayout: string }> = {
    es: { present: 'Actualidad', noLayout: 'Esta plantilla todavía no tiene diseño estructurado.' },
    en: { present: 'Present', noLayout: 'This template has no structured layout yet.' },
};

const DATE_LOCALE: Record<Locale, string> = { es: 'es-CR', en: 'en-US' };

/**
 * Las fechas del contrato son epoch en milisegundos (entero). Se aceptan
 * también cadenas por tolerancia —hay respuestas antiguas con ISO y números
 * que viajan como texto—, pero el caso correcto es el numérico.
 */
export function toDate(value: unknown): Date | null {
    if (value == null || value === '') return null;

    if (typeof value === 'number') {
        const d = new Date(value);
        return Number.isNaN(d.getTime()) ? null : d;
    }

    if (typeof value === 'string') {
        // Un epoch que viaja como texto: "1762550400000"
        if (/^\d+$/.test(value)) {
            const d = new Date(Number(value));
            return Number.isNaN(d.getTime()) ? null : d;
        }
        const d = new Date(value);
        return Number.isNaN(d.getTime()) ? null : d;
    }

    return null;
}

/**
 * Hay dos clases de fecha en el sistema y se muestran distinto.
 *
 * Un INSTANTE es un momento que ocurrió: cuándo se editó un currículum, cuándo
 * llegó una notificación. Se muestra en la zona horaria del dispositivo, para
 * que diga la hora que el usuario vivió.
 *
 * Una FECHA DE CALENDARIO es un día del almanaque: el nacimiento, el inicio de
 * un puesto, la emisión de un certificado. No tiene hora ni lugar. El editor
 * las guarda como la medianoche UTC de ese día, así que hay que mostrarlas en
 * UTC: aplicarles la zona del dispositivo las corre.
 *
 * No es teórico. En Costa Rica, que va seis horas detrás de UTC, un "1 de marzo
 * de 2024" guardado a medianoche UTC cae a las 18:00 del 29 de febrero en hora
 * local. El usuario elegía marzo de 2024 y el currículum le decía feb 2024.
 */
const DIA_DEL_ALMANAQUE = { timeZone: 'UTC' } as const;

/** "mar 2024" — la granularidad que usa un currículum. Fecha de calendario. */
export function formatMonthYear(value: unknown, locale: Locale = 'es'): string | null {
    const d = toDate(value);
    return d && d.toLocaleDateString(DATE_LOCALE[locale], {
        month: 'short', year: 'numeric', ...DIA_DEL_ALMANAQUE,
    });
}

/** "01 mar 2024" para una fecha de calendario: nacimiento, emisión, vencimiento. */
export function formatCalendarDate(value: unknown, locale: Locale = 'es'): string | null {
    const d = toDate(value);
    return d && d.toLocaleDateString(DATE_LOCALE[locale], {
        day: '2-digit', month: 'short', year: 'numeric', ...DIA_DEL_ALMANAQUE,
    });
}

/** "01 mar 2024" para un instante, en la zona horaria del dispositivo. */
export function formatLongDate(value: unknown, locale: Locale = 'es'): string | null {
    const d = toDate(value);
    return d && d.toLocaleDateString(DATE_LOCALE[locale], { day: '2-digit', month: 'short', year: 'numeric' });
}

/**
 * Rango de un puesto o estudio. Con `current: true` y `endDate` nulo se escribe
 * "Actualidad" en lugar de una fecha, como pide el contrato.
 */
export function formatRange(
    start: unknown, end: unknown, current: unknown, locale: Locale = 'es',
): string | null {
    const from = formatMonthYear(start, locale);
    const to = current === true && end == null
        ? UI_TEXT[locale].present
        : formatMonthYear(end, locale);

    if (!from && !to) return null;
    if (from && to) return `${from} — ${to}`;
    return from ?? to;
}
