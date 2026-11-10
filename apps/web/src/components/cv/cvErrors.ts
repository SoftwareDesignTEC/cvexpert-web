// El servicio devuelve los errores con la ruta del campo, p. ej.
// "workExperiences.0.startDate": "Field required". Eso es la estructura interna
// del contrato, no algo que el usuario pueda entender ni corregir.
// Acá se traduce a una frase que nombra la sección, la fila y el campo.

const SECTION_LABEL: Record<string, string> = {
    personalInfo: 'Datos personales',
    workExperiences: 'Experiencia',
    education: 'Educación',
    skills: 'Habilidades',
    languages: 'Idiomas',
    certifications: 'Certificaciones',
};

const FIELD_LABEL: Record<string, string> = {
    // Datos personales
    fullName: 'el nombre completo',
    email: 'el correo',
    phone: 'el teléfono',
    address: 'la dirección',
    photoUrl: 'la foto',
    bio: 'el perfil profesional',
    birthDate: 'la fecha de nacimiento',
    // Experiencia
    company: 'la empresa',
    position: 'el puesto',
    startDate: 'la fecha de inicio',
    endDate: 'la fecha de fin',
    description: 'la descripción',
    type: 'el tipo',
    // Educación
    institution: 'la institución',
    degree: 'el título',
    field: 'el área',
    // Habilidades e idiomas
    name: 'el nombre',
    level: 'el nivel',
    category: 'la categoría',
    // Certificaciones
    issuer: 'el emisor',
    issuedAt: 'la fecha de emisión',
    expiresAt: 'la fecha de vencimiento',
    credentialUrl: 'el enlace',
    // Raíz
    title: 'el título del currículum',
    templateId: 'la plantilla',
};

// Los mensajes del servicio vienen en inglés y con jerga de validación
function motivo(mensaje: string): string {
    const m = mensaje.toLowerCase();
    if (m.includes('required')) return 'falta completar';
    if (m.includes('not found') || m.includes('exist')) return 'no existe';
    if (m.includes('invalid') || m.includes('valid')) return 'no es válido';
    return mensaje;
}

/**
 * Pasa el detalle por campo a frases legibles.
 * "workExperiences.0.startDate: Field required"
 *   → "Experiencia, fila 1: falta completar la fecha de inicio"
 */
export function humanizeFieldErrors(errors: Record<string, string>): string[] {
    return Object.entries(errors).map(([ruta, mensaje]) => {
        const partes = ruta.split('.');
        const razon = motivo(mensaje);

        // raiz: "title", "templateId"
        if (partes.length === 1) {
            const campo = FIELD_LABEL[partes[0]] ?? partes[0];
            return `Falta completar ${campo}.`;
        }

        // bloque simple: "personalInfo.fullName"
        if (partes.length === 2) {
            const seccion = SECTION_LABEL[partes[0]] ?? partes[0];
            const campo = FIELD_LABEL[partes[1]] ?? partes[1];
            return `${seccion}: ${razon} ${campo}.`;
        }

        // lista: "workExperiences.0.startDate" — la fila se cuenta desde 1
        const [raiz, indice, ...resto] = partes;
        const seccion = SECTION_LABEL[raiz] ?? raiz;
        const campo = FIELD_LABEL[resto.join('.')] ?? resto.join('.');
        const fila = Number(indice);

        return Number.isFinite(fila)
            ? `${seccion}, fila ${fila + 1}: ${razon} ${campo}.`
            : `${seccion}: ${razon} ${campo}.`;
    });
}

/**
 * Quita las filas en blanco de una lista repetible.
 *
 * El editor agrega filas vacías al pulsar "Agregar", y si el usuario no las
 * completa igual viajaban al servicio, que las rechazaba campo por campo. Una
 * fila sin ningún dato es una fila que el usuario no llegó a llenar, no un
 * error que deba reportarse.
 */
export function dropEmptyRows<T extends Record<string, unknown>>(rows: T[]): T[] {
    return rows.filter(row =>
        Object.entries(row).some(([key, value]) => {
            if (key === 'id') return false;              // lo arrastra la fila, no lo escribió el usuario
            if (value === false) return false;           // una casilla sin marcar no es contenido
            return value !== undefined && value !== null && value !== '';
        }));
}

// ── Validación previa ─────────────────────────────────────────────────────────
// Campos que el servicio exige en cada fila. Salen de la forma del contrato:
// son los que no admiten nulo. `current` no está porque es una casilla: el
// servicio la pide presente, no marcada, y se normaliza a false al enviar.
export const REQUIRED_BY_SOURCE: Record<string, readonly string[]> = {
    workExperiences: ['position', 'company', 'startDate', 'description', 'type'],
    education: ['degree', 'institution', 'field', 'startDate'],
    skills: ['name', 'category', 'level'],
    languages: ['name', 'level'],
    certifications: ['name', 'issuer'],
};

function vacio(v: unknown): boolean {
    return v === undefined || v === null || (typeof v === 'string' && v.trim() === '');
}

export function isRequired(source: string, field: string): boolean {
    return (REQUIRED_BY_SOURCE[source] ?? []).includes(field);
}

/** Qué le falta a cada fila a medias, nombrado como lo ve el usuario. */
export function missingInRows(
    source: string,
    rows: Record<string, unknown>[],
): string[] {
    const seccion = SECTION_LABEL[source] ?? source;
    const requeridos = REQUIRED_BY_SOURCE[source] ?? [];

    return rows.flatMap((row, i) => {
        const faltan = requeridos.filter(f => vacio(row[f]));
        if (faltan.length === 0) return [];
        const nombres = faltan.map(f => FIELD_LABEL[f] ?? f).join(', ');
        return [`${seccion}, fila ${i + 1}: ${nombres}`];
    });
}
