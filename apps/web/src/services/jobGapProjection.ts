import type { CV, Language, Skill } from '../types/models';

type ProjectedSkill = Pick<Skill, 'name' | 'level'>;

// Identidad de nombres, no búsqueda parcial: conserva ñ y puntuación como el contrato.
const nameKey = (name: string) => name.trim().replace(/\s+/gu, ' ').toLowerCase()
    .normalize('NFD').replace(/[\u0300\u0301\u0302\u0308]/gu, '').normalize('NFC');

// Lista acotada de idiomas del editor. No asocia lenguajes de programación ni términos compuestos.
const languageNames = [
    ['Inglés', 'English'], ['Español', 'Spanish'], ['Francés', 'French'],
    ['Portugués', 'Portuguese'], ['Alemán', 'German'], ['Italiano', 'Italian'],
    ['Ruso', 'Russian'], ['Mandarín', 'Mandarin'], ['Japonés', 'Japanese'],
    ['Coreano', 'Korean'], ['Árabe', 'Arabic'],
    ['Lengua de señas costarricense', 'Costa Rican Sign Language'],
];
const aliases = new Map(languageNames.flatMap(([id, ...names]) =>
    [id, ...names].map(name => [nameKey(name), nameKey(id)] as const)));
const identity = (name: string) => aliases.get(nameKey(name)) ?? nameKey(name);

/** Nativo ocupa el cuarto escalón SOLO para adaptar el contrato: no equivale universalmente a experto. */
const languageLevels: Record<Language['level'], Skill['level']> = {
    basic: 'beginner', intermediate: 'intermediate', advanced: 'advanced', native: 'expert',
};
const skillLevels = new Set(['beginner', 'intermediate', 'advanced', 'expert']);

/**
 * Proyección efímera para ambos POST. No modifica el CV ni deriva niveles de la oferta.
 * skills tiene precedencia; entre repeticiones de idioma prevalece la primera entrada.
 * Solo se agregan idiomas exigidos. Los idiomas sin alias conocido requieren el mismo nombre.
 */
export function projectCvForJob(cv: Pick<CV, 'id' | 'skills' | 'languages'>, required: readonly string[]) {
    if (!Array.isArray(cv.skills) || !Array.isArray(cv.languages) || !Array.isArray(required) ||
        required.some(name => typeof name !== 'string')) {
        throw new Error('Los datos del CV o de la oferta no son compatibles con el análisis.');
    }
    const sources = new Map<string, ProjectedSkill & { language: boolean }>();
    for (const skill of cv.skills) {
        if (!skill || typeof skill.name !== 'string' || !skill.name.trim() || !skillLevels.has(skill.level)) {
            throw new Error('El CV contiene habilidades o niveles inválidos. Corregilos en Mis Currículums antes de analizar.');
        }
        const key = identity(skill.name);
        const existing = sources.get(key);
        // No resuelve conflictos en habilidades técnicas eligiendo un máximo o descartando información.
        if (existing && !aliases.has(nameKey(skill.name)) && existing.level !== skill.level) {
            throw new Error('El CV contiene niveles contradictorios para una habilidad. Revisalo en Mis Currículums.');
        }
        if (!existing) sources.set(key, { name: skill.name, level: skill.level, language: aliases.has(nameKey(skill.name)) });
    }
    for (const language of cv.languages) {
        if (!language || typeof language.name !== 'string' || !language.name.trim() ||
            !Object.hasOwn(languageLevels, language.level)) {
            throw new Error('El CV contiene idiomas o niveles de idioma inválidos. Revisalos en Mis Currículums.');
        }
        const key = identity(language.name);
        if (!sources.has(key) && required.some(name => identity(name) === key)) {
            sources.set(key, { name: language.name, level: languageLevels[language.level], language: true });
        }
    }
    const projected = new Map<string, ProjectedSkill>();
    for (const [key, source] of sources) {
        const names = source.language ? required.filter(name => identity(name) === key) : [];
        for (const name of names.length ? names : [source.name]) {
            if (!projected.has(nameKey(name))) projected.set(nameKey(name), { name, level: source.level });
        }
    }
    return { id: cv.id, skills: [...projected.values()] };
}
