// El selector nativo de fecha obliga a pelear con el formato del sistema y a
// elegir un día que, en un currículum, casi nunca importa. Acá se parte en
// año, mes y día, con el día opcional: si se deja vacío se asume el primero,
// que es lo que se usa para "entré en marzo de 2024".

export const MESES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export interface DateParts {
    year: string;
    month: string;
    day: string;
}

const VACIO: DateParts = { year: '', month: '', day: '' };

/** Epoch ms → las tres partes, en hora UTC para que no corra un día. */
export function toParts(value: unknown): DateParts {
    if (value == null || value === '') return VACIO;
    const ms = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(ms)) return VACIO;

    const d = new Date(ms);
    if (Number.isNaN(d.getTime())) return VACIO;

    return {
        year: String(d.getUTCFullYear()),
        month: String(d.getUTCMonth() + 1),
        day: String(d.getUTCDate()),
    };
}

/**
 * Las tres partes → epoch ms. Devuelve null mientras falte el año o el mes:
 * una fecha a medias no se guarda. El día vacío cuenta como el primero.
 */
export function fromParts(p: DateParts): number | null {
    const year = Number(p.year);
    const month = Number(p.month);
    if (!Number.isInteger(year) || year < 1900 || year > 2200) return null;
    if (!Number.isInteger(month) || month < 1 || month > 12) return null;

    const day = p.day === '' ? 1 : Number(p.day);
    if (!Number.isInteger(day) || day < 1 || day > 31) return null;

    const ms = Date.UTC(year, month - 1, day);
    // Date.UTC corrige de más: un 31 de febrero se convierte en marzo
    const d = new Date(ms);
    return d.getUTCMonth() === month - 1 ? ms : null;
}
