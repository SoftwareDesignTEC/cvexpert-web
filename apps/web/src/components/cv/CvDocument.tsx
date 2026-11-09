import {
    COLOR_SCHEMES,
    DATE_FIELDS,
    HEADER_FIELDS,
    ITEM_FIELDS,
    parseLayout,
} from '../../types/cvLayout';
import type { ColorRoles, CvLayout, HeaderSection, ListSection, ListSource } from '../../types/cvLayout';
import {
    LANGUAGE_LEVEL,
    SECTION_TITLE,
    SKILL_LEVEL,
    UI_TEXT,
    WORK_TYPE,
    formatLongDate,
    formatRange,
} from './cvLabels';
import type { Locale } from './cvLabels';

// El CV llega crudo de GET /cvs/{id}: se recorre por nombre de campo contra las
// listas blancas del contrato, así que no hace falta un tipo cerrado y los
// campos nuevos que aparezcan se ignoran solos.
type Raw = Record<string, unknown>;

export interface CvDocumentProps {
    cv: Raw;
    layout: unknown;
    locale?: Locale;
}

// El contrato nombra los campos personales como fullName y address. El resto de
// la aplicación los traduce a name y location al leer /profiles, así que se
// aceptan los dos nombres: según de dónde venga el objeto llega uno u otro.
const PERSONAL_ALIASES: Record<string, string[]> = {
    fullName: ['fullName', 'name'],
    address: ['address', 'location'],
};

function readPersonal(personal: Raw, leaf: string): unknown {
    for (const key of PERSONAL_ALIASES[leaf] ?? [leaf]) {
        const v = personal[key];
        if (v != null && v !== '') return v;
    }
    return undefined;
}

function asText(v: unknown): string | null {
    if (v == null) return null;
    if (typeof v === 'string') return v.trim() || null;
    if (typeof v === 'number' || typeof v === 'boolean') return String(v);
    return null;
}

// ── Encabezado ────────────────────────────────────────────────────────────────
function Header({ section, cv, colors, locale }: {
    section: HeaderSection; cv: Raw; colors: ColorRoles; locale: Locale;
}) {
    const personal = (cv.personalInfo ?? {}) as Raw;

    // Sólo rutas personalInfo.<campo conocido>; lo demás se ignora
    const leaves = section.fields
        .map(path => {
            const [root, leaf] = path.split('.');
            return root === 'personalInfo' && (HEADER_FIELDS as readonly string[]).includes(leaf)
                ? leaf
                : null;
        })
        .filter((l): l is string => l !== null);

    const photo = leaves.includes('photoUrl') ? asText(readPersonal(personal, 'photoUrl')) : null;
    const name = leaves.includes('fullName') ? asText(readPersonal(personal, 'fullName')) : null;
    const bio = leaves.includes('bio') ? asText(readPersonal(personal, 'bio')) : null;

    // El resto va en una línea de contacto, en el orden en que lo pidió el layout
    const contact = leaves
        .filter(l => !['photoUrl', 'fullName', 'bio'].includes(l))
        .map(l => (l === 'birthDate'
            ? formatLongDate(readPersonal(personal, l), locale)
            : asText(readPersonal(personal, l))))
        .filter((v): v is string => !!v);

    if (!photo && !name && !bio && contact.length === 0) return null;

    return (
        <header className="flex items-start gap-4" style={{ borderBottom: `2px solid ${colors.accent}`, paddingBottom: 12 }}>
            {photo && (
                <img
                    src={photo}
                    alt=""
                    className="h-20 w-20 shrink-0 rounded-full object-cover"
                    style={{ border: `2px solid ${colors.divider}` }}
                />
            )}
            <div className="min-w-0 flex-1">
                {name && (
                    <h1 className="text-2xl font-bold leading-tight" style={{ color: colors.accent }}>
                        {name}
                    </h1>
                )}
                {contact.length > 0 && (
                    <p className="mt-1 text-[11px] leading-relaxed" style={{ color: colors.secondary }}>
                        {contact.join(' · ')}
                    </p>
                )}
                {bio && (
                    <p className="mt-2 text-xs leading-relaxed" style={{ color: colors.text }}>
                        {bio}
                    </p>
                )}
            </div>
        </header>
    );
}

// ── Un elemento de lista ──────────────────────────────────────────────────────
function ListItem({ item, source, fields, colors, locale }: {
    item: Raw; source: ListSource; fields: string[]; colors: ColorRoles; locale: Locale;
}) {
    const has = (f: string) => fields.includes(f);

    // Las fechas se combinan en un rango en vez de imprimirse sueltas, y `current`
    // no es un dato que se muestre: cambia cómo se escribe el final del rango.
    const range = (has('startDate') || has('endDate'))
        ? formatRange(item.startDate, item.endDate, item.current, locale)
        : null;

    // Título y subtítulo según la fuente; el resto cae a texto plano
    const titleField: Partial<Record<ListSource, string>> = {
        workExperiences: 'position',
        education: 'degree',
        skills: 'name',
        languages: 'name',
        certifications: 'name',
    };
    const subtitleField: Partial<Record<ListSource, string>> = {
        workExperiences: 'company',
        education: 'institution',
        certifications: 'issuer',
    };

    const title = has(titleField[source] ?? '') ? asText(item[titleField[source]!]) : null;
    const subtitle = has(subtitleField[source] ?? '') ? asText(item[subtitleField[source]!]) : null;

    // Nivel traducido: los enums llegan en inglés
    const level = has('level')
        ? (source === 'languages'
            ? LANGUAGE_LEVEL[locale][String(item.level)]
            : SKILL_LEVEL[locale][String(item.level)]) ?? asText(item.level)
        : null;

    const extras: string[] = [];
    if (has('field')) { const v = asText(item.field); if (v) extras.push(v); }
    if (has('category')) { const v = asText(item.category); if (v) extras.push(v); }
    if (has('type')) { const v = WORK_TYPE[locale][String(item.type)]; if (v) extras.push(v); }
    if (has('expiresAt')) {
        const v = formatLongDate(item.expiresAt, locale);
        if (v) extras.push(`${locale === 'es' ? 'Vence' : 'Expires'} ${v}`);
    }

    const issued = has('issuedAt') ? formatLongDate(item.issuedAt, locale) : null;
    const description = has('description') ? asText(item.description) : null;
    const credential = has('credentialUrl') ? asText(item.credentialUrl) : null;

    // Campos del contrato que no tienen un lugar propio arriba: se agregan al
    // final para no perderlos si el layout los pide.
    const placed = new Set([
        titleField[source], subtitleField[source], 'startDate', 'endDate', 'current',
        'level', 'field', 'category', 'type', 'issuedAt', 'expiresAt',
        'description', 'credentialUrl',
    ]);
    const rest = fields
        .filter(f => !placed.has(f) && (ITEM_FIELDS[source] as readonly string[]).includes(f))
        .map(f => (DATE_FIELDS.has(f) ? formatLongDate(item[f], locale) : asText(item[f])))
        .filter((v): v is string => !!v);

    const right = [range, issued].filter(Boolean).join(' · ');

    if (!title && !subtitle && !right && !level && extras.length === 0 && !description) return null;

    return (
        <li className="break-inside-avoid">
            <div className="flex items-baseline justify-between gap-3">
                <p className="text-[13px] font-semibold" style={{ color: colors.text }}>
                    {title}
                    {level && (
                        <span className="ml-2 text-[11px] font-normal" style={{ color: colors.accent }}>
                            {level}
                        </span>
                    )}
                </p>
                {right && (
                    <span className="shrink-0 text-[11px]" style={{ color: colors.secondary }}>
                        {right}
                    </span>
                )}
            </div>

            {(subtitle || extras.length > 0) && (
                <p className="text-[11px]" style={{ color: colors.secondary }}>
                    {[subtitle, ...extras].filter(Boolean).join(' · ')}
                </p>
            )}

            {description && (
                <p className="mt-1 text-[11px] leading-relaxed" style={{ color: colors.text }}>
                    {description}
                </p>
            )}

            {credential && (
                <a href={credential} target="_blank" rel="noopener noreferrer"
                   className="text-[11px] underline" style={{ color: colors.accent }}>
                    {credential}
                </a>
            )}

            {rest.length > 0 && (
                <p className="text-[11px]" style={{ color: colors.secondary }}>{rest.join(' · ')}</p>
            )}
        </li>
    );
}

// ── Sección de lista ──────────────────────────────────────────────────────────
function List({ section, cv, colors, locale }: {
    section: ListSection; cv: Raw; colors: ColorRoles; locale: Locale;
}) {
    const raw = cv[section.source];
    const items = Array.isArray(raw) ? (raw as Raw[]) : [];
    if (items.length === 0) return null;

    // Campos desconocidos fuera: el contrato pide ignorarlos, no romper
    const fields = section.itemFields.filter(f =>
        (ITEM_FIELDS[section.source] as readonly string[]).includes(f));
    if (fields.length === 0) return null;

    return (
        <section className="flex flex-col gap-2">
            <h2
                className="text-[11px] font-bold uppercase tracking-[0.14em]"
                style={{ color: colors.accent, borderBottom: `1px solid ${colors.divider}`, paddingBottom: 3 }}
            >
                {SECTION_TITLE[locale][section.source]}
            </h2>
            <ul className="flex flex-col gap-2.5">
                {items.map((item, i) => (
                    <ListItem
                        key={asText(item.id) ?? i}
                        item={item}
                        source={section.source}
                        fields={fields}
                        colors={colors}
                        locale={locale}
                    />
                ))}
            </ul>
        </section>
    );
}

/**
 * Dibuja un CV con la definición estructurada de su plantilla.
 * Devuelve null cuando el layout no sirve: quien lo use debe caer entonces en
 * la vista de imagen (previewUrl) de siempre.
 */
export default function CvDocument({ cv, layout, locale = 'es' }: CvDocumentProps) {
    const parsed: CvLayout | null = parseLayout(layout);
    if (!parsed) return null;

    const colors = COLOR_SCHEMES[parsed.colorScheme];

    const render = (section: LayoutSectionWithKey) =>
        section.type === 'header'
            ? <Header key={section.key} section={section} cv={cv} colors={colors} locale={locale} />
            : <List key={section.key} section={section} cv={cv} colors={colors} locale={locale} />;

    const withKeys: LayoutSectionWithKey[] = parsed.sections.map((s, i) => ({ ...s, key: i }));

    return (
        <article
            className="cv-document mx-auto w-full bg-white p-8"
            style={{ maxWidth: '210mm', color: colors.text }}
            lang={locale}
        >
            {parsed.columns === 2 ? (
                <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-[1.6fr_1fr]">
                    {/* Sin `column` se asume la primera: el contrato la deja opcional */}
                    <div className="flex flex-col gap-4">
                        {withKeys.filter(s => (s.column ?? 1) === 1).map(render)}
                    </div>
                    <div className="flex flex-col gap-4">
                        {withKeys.filter(s => s.column === 2).map(render)}
                    </div>
                </div>
            ) : (
                // Con una columna, `column` se ignora, como dice el contrato
                <div className="flex flex-col gap-4">{withKeys.map(render)}</div>
            )}
        </article>
    );
}

type LayoutSectionWithKey = (HeaderSection | ListSection) & { key: number };

export { UI_TEXT };
