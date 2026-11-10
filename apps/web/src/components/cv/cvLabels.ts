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

/** "mar 2024" — la granularidad que usa un currículum */
export function formatMonthYear(value: unknown, locale: Locale = 'es'): string | null {
    const d = toDate(value);
    return d && d.toLocaleDateString(DATE_LOCALE[locale], { month: 'short', year: 'numeric' });
}

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
