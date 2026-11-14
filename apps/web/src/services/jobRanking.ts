import type { JobOffer, UserProfile } from '../types/models';

/**
 * Orden de las ofertas según lo que el usuario dijo que busca.
 *
 * Vive acá, y no dentro de una pantalla, porque son dos los lugares que
 * sugieren ofertas: la pantalla de Ofertas Laborales y el atajo para agregar
 * una postulación desde el tablero. Si cada uno ordenara por su cuenta, tarde o
 * temprano mostrarían cosas distintas diciendo lo mismo.
 */

export interface JobPreferences {
    types: UserProfile['types'];
    modalities: UserProfile['modalities'];
}

export const SIN_PREFERENCIAS: JobPreferences = { types: [], modalities: [] };

export function leerPreferencias(profile: UserProfile | null): JobPreferences {
    return {
        types: profile?.types ?? [],
        modalities: profile?.modalities ?? [],
    };
}

/** Si el usuario eligió al menos una preferencia. */
export function hayPreferencias(prefs: JobPreferences): boolean {
    return prefs.types.length > 0 || prefs.modalities.length > 0;
}

/**
 * Cuántas preferencias cumple una oferta: 0, 1 ó 2.
 *
 * Una lista vacía no suma ni resta. Quien no eligió modalidad no está diciendo
 * que le dé igual una u otra, está diciendo que no lo especificó, así que
 * tratarlo como un incumplimiento castigaría a todas por igual y sería lo
 * mismo que no ordenar.
 */
export function afinidad(job: JobOffer, prefs: JobPreferences): number {
    let puntos = 0;
    if (prefs.modalities.length > 0 && prefs.modalities.includes(job.modality)) puntos++;
    if (prefs.types.length > 0 && prefs.types.includes(job.type)) puntos++;
    return puntos;
}

/**
 * Ordena por afinidad y, a igualdad de afinidad, por la compatibilidad que
 * calcula el servicio.
 *
 * Las preferencias mandan sobre el puntaje porque son una elección explícita
 * del usuario: si pidió remoto, una presencial con 90% de compatibilidad no es
 * lo que quiere ver primero. El puntaje desempata dentro de cada grupo.
 */
export function ordenarPorPreferencias(ofertas: JobOffer[], prefs: JobPreferences): JobOffer[] {
    return [...ofertas].sort((a, b) => {
        const dif = afinidad(b, prefs) - afinidad(a, prefs);
        if (dif !== 0) return dif;
        return (b.matchScore ?? 0) - (a.matchScore ?? 0);
    });
}
