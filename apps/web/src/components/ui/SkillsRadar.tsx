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
                            {/* Nivel del mercado, de fondo */}
                            <div
                                className="absolute inset-y-0 left-0 rounded-full bg-[#93C5FD]"
                                style={{ width: `${Math.min(s.marketLevel, 100)}%` }}
                            />
                            {/* Nivel del usuario, encima */}
                            <div
                                className="absolute inset-y-0 left-0 rounded-full bg-[#2F7FD4]"
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

    const cx = size / 2;
    const cy = size / 2;
    const radius = size * 0.38;
    const levels = 4;
    const n = skills.length;

    // Calcular punto en el polígono
    const point = (value: number, index: number, r: number) => {
        const angle = (Math.PI * 2 * index) / n - Math.PI / 2;
        return {
            x: cx + r * (value / 100) * Math.cos(angle),
            y: cy + r * (value / 100) * Math.sin(angle),
        };
    };

    // Polígono de fondo (cada nivel)
    const bgPolygon = (level: number) => {
        const r = radius * (level / levels);
        return Array.from({ length: n }, (_, i) => {
            const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
            return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
        }).join(' ');
    };

    // Polígono de datos del usuario
    const userPolygon = skills
        .map((s, i) => { const p = point(s.userLevel, i, radius); return `${p.x},${p.y}`; })
        .join(' ');

    // Polígono del mercado
    const marketPolygon = skills
        .map((s, i) => { const p = point(s.marketLevel, i, radius); return `${p.x},${p.y}`; })
        .join(' ');

    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            {/* Niveles de fondo */}
            {Array.from({ length: levels }, (_, i) => (
                <polygon
                    key={i}
                    points={bgPolygon(i + 1)}
                    fill="none"
                    stroke="#D1D5DB"
                    strokeWidth="1"
                />
            ))}

            {/* Líneas de ejes */}
            {skills.map((_, i) => {
                const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
                return (
                    <line
                        key={i}
                        x1={cx} y1={cy}
                        x2={cx + radius * Math.cos(angle)}
                        y2={cy + radius * Math.sin(angle)}
                        stroke="#D1D5DB"
                        strokeWidth="1"
                    />
                );
            })}

            {/* Área del mercado */}
            <polygon points={marketPolygon} fill="#93C5FD" fillOpacity="0.2" stroke="#93C5FD" strokeWidth="1.5" />

            {/* Área del usuario */}
            <polygon points={userPolygon} fill="#2F7FD4" fillOpacity="0.4" stroke="#2F7FD4" strokeWidth="2" />

            {/* Etiquetas */}
            {skills.map((s, i) => {
                const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
                const labelR = radius + 18;
                const x = cx + labelR * Math.cos(angle);
                const y = cy + labelR * Math.sin(angle);
                return (
                    <text key={i} x={x} y={y} textAnchor="middle" dominantBaseline="middle"
                          fontSize="11" fontWeight="600" fill="#374151">
                        {s.name}
                    </text>
                );
            })}
        </svg>
    );
}
