// Definición estructurada de una plantilla de CV, tal como la devuelve
// cvexpert-ms-cvs en Template.layout. El backend NO genera el PDF: cada cliente
// dibuja el documento, así que el armado manual funciona sin conexión.
// Android renderiza lo mismo con PdfDocument; no se busca paridad al píxel,
// sí el mismo contenido y el mismo orden.

export type ColorSchemeName = 'blue' | 'green' | 'purple' | 'gray';

export interface ColorRoles {
    accent: string;
    text: string;
    secondary: string;
    divider: string;
}

// Hex fijos por rol: no son colores libres. Tienen que coincidir con Android,
// y por eso tampoco cambian con el tema claro/oscuro de la aplicación: el CV
// es un documento, no interfaz.
export const COLOR_SCHEMES: Record<ColorSchemeName, ColorRoles> = {
    blue:   { accent: '#2563EB', text: '#1F2937', secondary: '#6B7280', divider: '#E5E7EB' },
    green:  { accent: '#059669', text: '#1F2937', secondary: '#6B7280', divider: '#E5E7EB' },
    purple: { accent: '#7C3AED', text: '#1F2937', secondary: '#6B7280', divider: '#E5E7EB' },
    gray:   { accent: '#374151', text: '#111827', secondary: '#6B7280', divider: '#D1D5DB' },
};

export const DEFAULT_SCHEME: ColorSchemeName = 'blue';

// ── Secciones ─────────────────────────────────────────────────────────────────
export type ListSource =
    | 'workExperiences'
    | 'education'
    | 'skills'
    | 'languages'
    | 'certifications';

export interface HeaderSection {
    type: 'header';
    /** Rutas tipo "personalInfo.fullName" */
    fields: string[];
    column?: 1 | 2;
}

export interface ListSection {
    type: 'list';
    source: ListSource;
    /** Campos de cada elemento, en el orden en que se dibujan */
    itemFields: string[];
    column?: 1 | 2;
}

export type LayoutSection = HeaderSection | ListSection;

export interface CvLayout {
    columns: 1 | 2;
    colorScheme: ColorSchemeName;
    /** Arreglo ordenado: se dibuja en este orden, sin posiciones libres */
    sections: LayoutSection[];
}

// ── Listas blancas ────────────────────────────────────────────────────────────
// El contrato pide ignorar lo que no se reconozca en vez de romper el render,
// porque pueden agregarse campos nuevos más adelante.

export const HEADER_FIELDS = [
    'fullName', 'email', 'phone', 'address', 'photoUrl', 'bio', 'birthDate',
] as const;

export const LIST_SOURCES: ListSource[] = [
    'workExperiences', 'education', 'skills', 'languages', 'certifications',
];

export const ITEM_FIELDS: Record<ListSource, readonly string[]> = {
    workExperiences: ['company', 'position', 'startDate', 'endDate', 'current', 'description', 'type'],
    education:       ['institution', 'degree', 'field', 'startDate', 'endDate', 'current'],
    skills:          ['name', 'level', 'category'],
    languages:       ['name', 'level'],
    certifications:  ['name', 'issuer', 'issuedAt', 'expiresAt', 'credentialUrl'],
};

// Campos con fecha: epoch en milisegundos, nunca cadenas ISO
export const DATE_FIELDS = new Set(['startDate', 'endDate', 'issuedAt', 'expiresAt']);

export function isColorScheme(v: unknown): v is ColorSchemeName {
    return typeof v === 'string' && v in COLOR_SCHEMES;
}

export function isListSource(v: unknown): v is ListSource {
    return typeof v === 'string' && (LIST_SOURCES as string[]).includes(v);
}

/**
 * Valida la forma mínima del layout. Devuelve null cuando no sirve, para que
 * quien lo use caiga en la vista de imagen de siempre en vez de romperse.
 */
export function parseLayout(raw: unknown): CvLayout | null {
    if (!raw || typeof raw !== 'object') return null;
    const l = raw as Partial<CvLayout>;
    if (!Array.isArray(l.sections)) return null;

    const sections = l.sections.filter((s): s is LayoutSection => {
        if (!s || typeof s !== 'object') return false;
        if (s.type === 'header') return Array.isArray((s as HeaderSection).fields);
        if (s.type === 'list') {
            const ls = s as ListSection;
            return isListSource(ls.source) && Array.isArray(ls.itemFields);
        }
        // type desconocido: se ignora, no invalida el layout entero
        return false;
    });

    return {
        columns: l.columns === 2 ? 2 : 1,
        colorScheme: isColorScheme(l.colorScheme) ? l.colorScheme : DEFAULT_SCHEME,
        sections,
    };
}

/**
 * Qué datos usa realmente una plantilla.
 *
 * El editor lo consulta para no pedir cosas que esa plantilla no va a dibujar:
 * Harvard, por ejemplo, no lleva foto, así que ofrecerla sería prometer algo
 * que no se cumple. Sale del propio layout, así que las plantillas que se
 * agreguen después funcionan sin tocar el formulario.
 */
export interface DeclaredData {
    /** Campos de personalInfo que pide el encabezado */
    personal: Set<string>;
    /** Listas que la plantilla dibuja */
    sources: Set<ListSource>;
}

export function declaredData(raw: unknown): DeclaredData | null {
    const layout = parseLayout(raw);
    if (!layout) return null;

    const personal = new Set<string>();
    const sources = new Set<ListSource>();

    for (const s of layout.sections) {
        if (s.type === 'header') {
            for (const path of s.fields) {
                const [root, leaf] = path.split('.');
                if (root === 'personalInfo' && leaf) personal.add(leaf);
            }
        } else {
            sources.add(s.source);
        }
    }

    return { personal, sources };
}
