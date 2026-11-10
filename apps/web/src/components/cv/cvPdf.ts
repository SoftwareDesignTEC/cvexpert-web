import { jsPDF } from 'jspdf';
import { COLOR_SCHEMES, HEADER_FIELDS, ITEM_FIELDS, parseLayout } from '../../types/cvLayout';
import type { ColorRoles, ListSource } from '../../types/cvLayout';
import {
    LANGUAGE_LEVEL, SECTION_TITLE, SKILL_LEVEL, WORK_TYPE, formatLongDate, formatRange,
} from './cvLabels';
import type { Locale } from './cvLabels';

// Se genera el PDF dibujando el documento, no capturando la pantalla: así el
// texto queda seleccionable y buscable —lo que necesita cualquier filtro
// automático de currículums— y el archivo pesa unos pocos kilobytes.
// Es el mismo enfoque que usa Android con PdfDocument.

type Raw = Record<string, unknown>;

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 15;
const BOTTOM = PAGE_H - MARGIN;

function hexToRgb(hex: string): [number, number, number] {
    const h = hex.replace('#', '');
    return [
        parseInt(h.slice(0, 2), 16),
        parseInt(h.slice(2, 4), 16),
        parseInt(h.slice(4, 6), 16),
    ];
}

function text(v: unknown): string | null {
    if (v == null) return null;
    if (typeof v === 'string') return v.trim() || null;
    if (typeof v === 'number' || typeof v === 'boolean') return String(v);
    return null;
}

/** Lleva la posición vertical y abre página nueva cuando ya no cabe. */
class Flow {
    y = MARGIN;
    page = 1;
    // Campos explícitos: la configuración del proyecto no admite propiedades
    // declaradas en los parámetros del constructor
    readonly doc: jsPDF;
    readonly x: number;
    readonly width: number;

    constructor(doc: jsPDF, x: number, width: number) {
        this.doc = doc;
        this.x = x;
        this.width = width;
    }

    need(alto: number) {
        if (this.y + alto <= BOTTOM) return;
        this.page += 1;
        if (this.doc.getNumberOfPages() < this.page) this.doc.addPage();
        this.doc.setPage(this.page);
        this.y = MARGIN;
    }

    /** Escribe respetando el ancho de la columna y devuelve lo que ocupó. */
    write(contenido: string, size: number, style: 'normal' | 'bold', color: string, gap = 1.8) {
        this.doc.setFont('helvetica', style);
        this.doc.setFontSize(size);
        this.doc.setTextColor(...hexToRgb(color));

        const lineas = this.doc.splitTextToSize(contenido, this.width) as string[];
        // El tamaño va en puntos y la página en milímetros: 0.3528 es la
        // conversión, y 1.35 la altura de línea de un documento que se lee
        // cómodo. Con 1.2 todo quedaba pegado.
        const alto = lineas.length * size * 0.3528 * 1.35;
        this.need(alto);
        this.doc.text(lineas, this.x, this.y);
        this.y += alto + gap;
    }

    line(color: string) {
        this.need(2);
        this.doc.setDrawColor(...hexToRgb(color));
        this.doc.setLineWidth(0.3);
        this.doc.line(this.x, this.y, this.x + this.width, this.y);
        this.y += 2;
    }

    /** Fecha alineada a la derecha, en la misma línea que el título anterior. */
    rightAt(contenido: string, yBase: number, size: number, color: string) {
        this.doc.setFont('helvetica', 'normal');
        this.doc.setFontSize(size);
        this.doc.setTextColor(...hexToRgb(color));
        this.doc.text(contenido, this.x + this.width, yBase, { align: 'right' });
    }
}

const PHOTO_MM = 22;

function drawHeader(f: Flow, fields: string[], cv: Raw, c: ColorRoles, locale: Locale) {
    const personal = (cv.personalInfo ?? {}) as Raw;
    const leaves = fields
        .map(p => { const [root, leaf] = p.split('.'); return root === 'personalInfo' ? leaf : null; })
        .filter((l): l is string => !!l && (HEADER_FIELDS as readonly string[]).includes(l));

    // Sólo se puede incrustar lo que ya está en el documento. Una URL remota
    // habría que descargarla, y esto es síncrono; la foto que carga la web es
    // siempre un data URL, así que ese es el caso que importa.
    const foto = leaves.includes('photoUrl') ? text(personal.photoUrl) : null;
    const fotoIncrustable = foto?.startsWith('data:image') ? foto : null;

    const yInicio = f.y;
    let texto = f;

    if (fotoIncrustable) {
        try {
            f.doc.addImage(fotoIncrustable, 'JPEG', f.x, f.y, PHOTO_MM, PHOTO_MM);
            // El bloque de texto se corre a la derecha de la foto
            texto = new Flow(f.doc, f.x + PHOTO_MM + 5, f.width - PHOTO_MM - 5);
            texto.y = f.y;
            texto.page = f.page;
        } catch {
            // Una imagen ilegible no debe tumbar el PDF entero
            texto = f;
        }
    }

    const nombre = leaves.includes('fullName') ? text(personal.fullName) : null;
    if (nombre) texto.write(nombre, 20, 'bold', c.accent, 2);

    const contacto = leaves
        .filter(l => !['photoUrl', 'fullName', 'bio'].includes(l))
        .map(l => (l === 'birthDate' ? formatLongDate(personal[l], locale) : text(personal[l])))
        .filter((v): v is string => !!v);
    if (contacto.length > 0) texto.write(contacto.join('  ·  '), 9.5, 'normal', c.secondary, 2.5);

    const bio = leaves.includes('bio') ? text(personal.bio) : null;
    if (bio) texto.write(bio, 9.5, 'normal', c.text, 3);

    // La línea va debajo de lo más alto de los dos: foto o texto
    f.y = texto === f
        ? texto.y
        : Math.max(texto.y, yInicio + PHOTO_MM + 2);

    f.line(c.accent);
    f.y += 4;
}

function drawItem(f: Flow, item: Raw, source: ListSource, fields: string[], c: ColorRoles, locale: Locale) {
    const has = (x: string) => fields.includes(x);

    const titulos: Partial<Record<ListSource, string>> = {
        workExperiences: 'position', education: 'degree',
        skills: 'name', languages: 'name', certifications: 'name',
    };
    const subtitulos: Partial<Record<ListSource, string>> = {
        workExperiences: 'company', education: 'institution', certifications: 'issuer',
    };

    const titulo = has(titulos[source] ?? '') ? text(item[titulos[source]!]) : null;
    const nivel = has('level')
        ? (source === 'languages'
            ? LANGUAGE_LEVEL[locale][String(item.level)]
            : SKILL_LEVEL[locale][String(item.level)]) ?? text(item.level)
        : null;

    const rango = (has('startDate') || has('endDate'))
        ? formatRange(item.startDate, item.endDate, item.current, locale)
        : null;
    const emitida = has('issuedAt') ? formatLongDate(item.issuedAt, locale) : null;
    const derecha = [rango, emitida].filter(Boolean).join(' · ');

    if (titulo) {
        const linea = nivel ? `${titulo}  —  ${nivel}` : titulo;
        const yTitulo = f.y;
        f.write(linea, 10.5, 'bold', c.text, 1);
        if (derecha) f.rightAt(derecha, yTitulo, 8.5, c.secondary);
    }

    const extras: string[] = [];
    const sub = has(subtitulos[source] ?? '') ? text(item[subtitulos[source]!]) : null;
    if (sub) extras.push(sub);
    if (has('field')) { const v = text(item.field); if (v) extras.push(v); }
    if (has('type')) { const v = WORK_TYPE[locale][String(item.type)]; if (v) extras.push(v); }
    if (has('expiresAt')) {
        const v = formatLongDate(item.expiresAt, locale);
        if (v) extras.push(`${locale === 'es' ? 'Vence' : 'Expires'} ${v}`);
    }
    if (extras.length > 0) f.write(extras.join('  ·  '), 9, 'normal', c.secondary, 1.2);

    const desc = has('description') ? text(item.description) : null;
    if (desc) f.write(desc, 9, 'normal', c.text, 1.5);

    const enlace = has('credentialUrl') ? text(item.credentialUrl) : null;
    if (enlace) f.write(enlace, 8, 'normal', c.accent, 1);

    f.y += 3;
}

function drawList(f: Flow, source: ListSource, itemFields: string[], cv: Raw, c: ColorRoles, locale: Locale) {
    const bruto = cv[source];
    const items = Array.isArray(bruto) ? (bruto as Raw[]) : [];
    if (items.length === 0) return;

    const fields = itemFields.filter(x => (ITEM_FIELDS[source] as readonly string[]).includes(x));
    if (fields.length === 0) return;

    f.need(14);
    f.write(SECTION_TITLE[locale][source].toUpperCase(), 9.5, 'bold', c.accent, 1.2);
    f.line(c.divider);
    f.y += 2.5;

    // Las habilidades van agrupadas por categoría, igual que en pantalla
    if (source === 'skills' && fields.includes('category')) {
        const grupos = new Map<string, Raw[]>();
        const sueltas: Raw[] = [];
        for (const it of items) {
            const k = text(it.category);
            if (k) grupos.set(k, [...(grupos.get(k) ?? []), it]);
            else sueltas.push(it);
        }
        for (const [categoria, lista] of grupos) {
            f.write(categoria, 9, 'bold', c.secondary, 1.2);
            lista.forEach(it => drawItem(f, it, source, fields, c, locale));
        }
        sueltas.forEach(it => drawItem(f, it, source, fields, c, locale));
    } else {
        items.forEach(it => drawItem(f, it, source, fields, c, locale));
    }

    f.y += 4;
}

/**
 * Arma el PDF del currículum. Devuelve null si la plantilla no tiene un layout
 * utilizable: sin él no hay nada que dibujar.
 */
export function buildCvPdf(cv: Raw, layout: unknown, locale: Locale = 'es'): jsPDF | null {
    const parsed = parseLayout(layout);
    if (!parsed) return null;

    const c = COLOR_SCHEMES[parsed.colorScheme];
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });

    const dibujar = (f: Flow, secciones: typeof parsed.sections) => {
        for (const s of secciones) {
            if (s.type === 'header') drawHeader(f, s.fields, cv, c, locale);
            else drawList(f, s.source, s.itemFields, cv, c, locale);
        }
    };

    if (parsed.columns === 2) {
        const hueco = 8;
        const anchoTotal = PAGE_W - MARGIN * 2;
        const izq = (anchoTotal - hueco) * 0.62;
        const der = anchoTotal - hueco - izq;

        // Sin `column` se asume la primera, como en el renderizador de pantalla
        const col1 = new Flow(doc, MARGIN, izq);
        dibujar(col1, parsed.sections.filter(s => (s.column ?? 1) === 1));

        // La segunda columna vuelve a empezar arriba de la primera página
        doc.setPage(1);
        const col2 = new Flow(doc, MARGIN + izq + hueco, der);
        dibujar(col2, parsed.sections.filter(s => s.column === 2));
    } else {
        dibujar(new Flow(doc, MARGIN, PAGE_W - MARGIN * 2), parsed.sections);
    }

    return doc;
}

/** Nombre de archivo a partir del título, sin caracteres que molesten. */
export function pdfFileName(title: string): string {
    const limpio = title
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/[^a-zA-Z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .toLowerCase();
    return `${limpio || 'curriculum'}.pdf`;
}

/**
 * Arma y descarga el PDF. Devuelve null si salió bien, o el motivo si no, para
 * que cada pantalla lo muestre a su manera.
 */
export function downloadCvPdf(cv: Raw, layout: unknown, title: string, locale: Locale = 'es'): string | null {
    try {
        const doc = buildCvPdf(cv, layout, locale);
        if (!doc) return 'Esta plantilla no tiene diseño estructurado, así que no se puede generar el PDF.';
        doc.save(pdfFileName(title));
        return null;
    } catch {
        return 'No pudimos generar el PDF. Intentá de nuevo.';
    }
}
