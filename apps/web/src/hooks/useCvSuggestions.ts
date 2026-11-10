import { useEffect, useState } from 'react';
import { cvService } from '../services/cvService';
import type { CV } from '../types/models';

/** Valores ya escritos, por campo, para ofrecerlos mientras se escribe. */
export interface CvSuggestions {
    fullName: string[];
    email: string[];
    phone: string[];
    address: string[];
    languageNames: string[];
}

const EMPTY: CvSuggestions = {
    fullName: [], email: [], phone: [], address: [], languageNames: [],
};

function toMillis(v: unknown): number {
    if (typeof v === 'number') return v;
    if (typeof v === 'string') {
        const n = /^\d+$/.test(v) ? Number(v) : Date.parse(v);
        return Number.isFinite(n) ? n : 0;
    }
    return 0;
}

/** Valores distintos de un campo, sin vacíos y sin repetir, respetando el orden. */
function distintos(valores: (string | undefined)[]): string[] {
    const vistos = new Set<string>();
    const salida: string[] = [];
    for (const v of valores) {
        const limpio = v?.trim();
        if (!limpio) continue;
        const clave = limpio.toLowerCase();
        if (vistos.has(clave)) continue;
        vistos.add(clave);
        salida.push(limpio);
    }
    return salida;
}

/**
 * Lo que el usuario ya escribió en sus otros currículums.
 *
 * El nombre, el teléfono o la dirección se repiten entre currículums, y alguien
 * puede usar más de una variante —el nombre completo en uno y el corto en otro—.
 * Por eso se ofrecen todos los valores usados, no sólo el último, y ordenados
 * del currículum más reciente al más viejo: el de arriba es el más probable.
 *
 * Sólo se piden al crear; al editar, los datos ya están en el currículum.
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

                const cvs = [...(res.items ?? [])].sort(
                    (a, b) => toMillis(b.updatedAt) - toMillis(a.updatedAt),
                );
                if (cvs.length === 0) return;

                // personalInfo llega crudo del servicio, con los nombres del contrato
                const personal = cvs.map(
                    cv => (cv.personalInfo ?? {}) as unknown as Record<string, string | undefined>,
                );

                setSuggestions({
                    fullName: distintos(personal.map(p => p.fullName)),
                    email: distintos(personal.map(p => p.email)),
                    phone: distintos(personal.map(p => p.phone)),
                    address: distintos(personal.map(p => p.address)),
                    languageNames: distintos(
                        cvs.flatMap((cv: CV) => (cv.languages ?? []).map(l => l.name)),
                    ),
                });
            } catch {
                // Sin sugerencias se escribe a mano: no es un error que mostrar
                if (!cancelled) setSuggestions(EMPTY);
            }
        };
        load();

        return () => { cancelled = true; };
    }, [enabled]);

    return suggestions;
}
