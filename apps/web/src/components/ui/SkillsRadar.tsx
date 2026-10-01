import type { SkillGapItem } from '../../types/models';

interface SkillsRadarProps {
    skills: SkillGapItem[];
    size?: number;
}

export default function SkillsRadar({ skills, size = 200 }: SkillsRadarProps) {
    // Un radar necesita al menos 3 ejes: con menos, el poligono degenera en una linea
    // o un punto. En ese caso se comparan los niveles con barras, que se leen igual de bien.
    if (skills.length < 3) {
        return (
            <div className="flex flex-col gap-3 w-full" style={{ minHeight: size / 2 }}>
                {skills.map(s => (
                    <div key={s.name} className="flex flex-col gap-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-2 text-xs">
                            <span className="font-medium text-gray-700 dark:text-gray-200 truncate">{s.name}</span>
                            <span className="text-gray-400 shrink-0">{s.userLevel}% / {s.marketLevel}%</span>
                        </div>
                        <div className="relative h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700">
                            <div
                                className="absolute inset-y-0 left-0 rounded-full bg-gray-300 dark:bg-gray-600"
                                style={{ width: `${Math.min(s.marketLevel, 100)}%` }}
                            />
                            <div
                                className="absolute inset-y-0 left-0 rounded-full bg-primary"
                                style={{ width: `${Math.min(s.userLevel, 100)}%` }}
                            />
                        </div>
                    </div>
                ))}
                {skills.length === 0 && (
                    <p className="text-xs text-gray-400 text-center py-4">Aun no hay habilidades para comparar.</p>
                )}
            </div>
        );
    }

    // Las etiquetas se dibujan por fuera del poligono, asi que el lienzo necesita un
    // margen propio: sin el, los nombres largos quedaban cortados contra el borde.
    const labelMargin = 42;
    const box = size + labelMargin * 2;
    const cx = box / 2;
    const cy = box / 2;
    const radius = size * 0.42;
    const levels = 4;
    const n = skills.length;

    const angleAt = (index: number) => (Math.PI * 2 * index) / n - Math.PI / 2;

    const point = (value: number, index: number, r: number) => {
        const angle = angleAt(index);
        return {
            x: cx + r * (value / 100) * Math.cos(angle),
            y: cy + r * (value / 100) * Math.sin(angle),
        };
    };

    const ring = (level: number) => {
        const r = radius * (level / levels);
        return Array.from({ length: n }, (_, i) => {
            const angle = angleAt(i);
            return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
        }).join(' ');
    };

    const polygonFor = (pick: (s: SkillGapItem) => number) =>
        skills.map((s, i) => { const p = point(pick(s), i, radius); return `${p.x},${p.y}`; }).join(' ');

    const marketPolygon = polygonFor(s => s.marketLevel);
    const userPolygon = polygonFor(s => s.userLevel);

    return (
        <svg width="100%" viewBox={`0 0 ${box} ${box}`} style={{ maxWidth: box }} role="img">
            {/* Anillos de referencia */}
            {Array.from({ length: levels }, (_, i) => (
                <polygon
                    key={i}
                    points={ring(i + 1)}
                    className="fill-none stroke-line dark:stroke-line-dark"
                    strokeWidth="1"
                />
            ))}

            {/* Ejes */}
            {skills.map((_, i) => {
                const angle = angleAt(i);
                return (
                    <line
                        key={i}
                        x1={cx} y1={cy}
                        x2={cx + radius * Math.cos(angle)}
                        y2={cy + radius * Math.sin(angle)}
                        className="stroke-line dark:stroke-line-dark"
                        strokeWidth="1"
                    />
                );
            })}

            {/* Nivel del mercado, en gris por detras */}
            <polygon
                points={marketPolygon}
                className="fill-slate-300/40 stroke-slate-400 dark:fill-slate-600/30 dark:stroke-slate-500"
                strokeWidth="1.5"
            />

            {/* Nivel del usuario, en azul por delante */}
            <polygon
                points={userPolygon}
                className="fill-primary/25 stroke-primary"
                strokeWidth="2"
                strokeLinejoin="round"
            />

            {/* Un punto por vertice ayuda a leer el valor exacto de cada eje */}
            {skills.map((s, i) => {
                const p = point(s.userLevel, i, radius);
                return <circle key={i} cx={p.x} cy={p.y} r="3.5" className="fill-primary" />;
            })}

            {/* Etiquetas: se alinean segun el lado en el que caen para no pisar el grafico */}
            {skills.map((s, i) => {
                const angle = angleAt(i);
                const x = cx + (radius + 16) * Math.cos(angle);
                const y = cy + (radius + 16) * Math.sin(angle);
                const cos = Math.cos(angle);
                const anchor = Math.abs(cos) < 0.25 ? 'middle' : cos > 0 ? 'start' : 'end';
                return (
                    <text
                        key={i}
                        x={x} y={y}
                        textAnchor={anchor}
                        dominantBaseline="middle"
                        className="fill-muted dark:fill-slate-400"
                        fontSize="11"
                        fontWeight="500"
                    >
                        {s.name}
                    </text>
                );
            })}
        </svg>
    );
}
