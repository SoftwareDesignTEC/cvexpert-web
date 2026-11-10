import { useEffect, useState } from 'react';
import { cvService, toCvInput } from '../services/cvService';
import type { CvInput } from '../services/cvService';

export interface CvSuggestions {
    /** Datos personales del currículum más reciente */
    personalInfo?: CvInput['personalInfo'];
    /** Idiomas ya declarados, sin repetir */
    languages: CvInput['languages'];
    /** De qué currículum salieron, para poder decirlo */
    fromTitle?: string;
    /** Nombres de idiomas usados antes, para el autocompletado */
    languageNames: string[];
}

const EMPTY: CvSuggestions = { languages: [], languageNames: [] };

function toMillis(v: unknown): number {
    if (typeof v === 'number') return v;
    if (typeof v === 'string') {
        const n = /^\d+$/.test(v) ? Number(v) : Date.parse(v);
        return Number.isFinite(n) ? n : 0;
    }
    return 0;
}

/**
 * Datos que el usuario ya escribió en otros currículums.
 *
 * El nombre, el teléfono o la dirección no cambian entre un currículum y otro,
 * así que volver a escribirlos en cada uno es trabajo repetido. Se toman del
 * más reciente y se ofrecen al crear uno nuevo.
 *
 * Sólo tiene sentido al crear: al editar, los datos ya están en el currículum.
 */
export function useCvSuggestions(enabled: boolean): CvSuggestions {
    const [suggestions, setSuggestions] = useState<CvSuggestions>(EMPTY);

    useEffect(() => {
        if (!enabled) return;
        let cancelled = false;

        const load = async () => {
            try {
                const res = await cvService.getAll({ page: 1, pageSize: 20 });
                if (cancelled) return;

                const cvs = res.items ?? [];
                if (cvs.length === 0) return;

                // El más reciente es el que mejor refleja los datos actuales
                const reciente = [...cvs].sort(
                    (a, b) => toMillis(b.updatedAt) - toMillis(a.updatedAt),
                )[0];
                const input = toCvInput(reciente);

                // Los idiomas se juntan de todos, no sólo del último: alguien
                // puede haber declarado portugués en uno y francés en otro.
                const porNombre = new Map<string, CvInput['languages'][number]>();
                for (const cv of cvs) {
                    for (const l of cv.languages ?? []) {
                        const nombre = l.name?.trim();
                        if (nombre && !porNombre.has(nombre.toLowerCase())) {
                            porNombre.set(nombre.toLowerCase(), { name: nombre, level: l.level });
                        }
                    }
                }

                setSuggestions({
                    personalInfo: input.personalInfo,
                    languages: [...porNombre.values()],
                    languageNames: [...porNombre.values()].map(l => l.name),
                    fromTitle: reciente.title,
                });
            } catch {
                // Sin sugerencias se escribe todo a mano: no es un error que mostrar
                if (!cancelled) setSuggestions(EMPTY);
            }
        };
        load();

        return () => { cancelled = true; };
    }, [enabled]);

    return suggestions;
}
