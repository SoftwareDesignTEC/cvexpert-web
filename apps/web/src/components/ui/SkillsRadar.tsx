import type { SkillGapItem } from '../../types/models';

interface SkillsRadarProps {
    skills: SkillGapItem[];
    size?: number;
}

export default function SkillsRadar({ skills, size = 200 }: SkillsRadarProps) {
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
