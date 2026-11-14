import { useRef, useState } from 'react';
import { Trash2, Upload, User } from 'lucide-react';
import Button from '../ui/Button';
import { cvService } from '../../services/cvService';
import { describeError } from '../../services/http';

// La foto ya no viaja dentro del JSON del currículum: se sube aparte y lo que
// se guarda en el documento es el enlace.
//
// Aun así se reduce en el navegador antes de subirla. No por un límite de
// tamaño —el servicio acepta hasta 5 MB— sino porque no sirve de nada: en la
// hoja la foto ocupa 22 mm, así que subir los seis megas de una cámara sólo
// gastaría los datos del usuario y haría la espera más larga. 512 px alcanzan
// para que se vea nítida incluso en el PDF.
const MAX_SIDE = 512;
const QUALITY = 0.82;

function readAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('no se pudo leer el archivo'));
        reader.readAsDataURL(file);
    });
}

function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('el archivo no es una imagen válida'));
        img.src = src;
    });
}

function toJpeg(canvas: HTMLCanvasElement): Promise<Blob> {
    return new Promise((resolve, reject) => {
        canvas.toBlob(
            blob => (blob ? resolve(blob) : reject(new Error('el navegador no pudo procesar la imagen'))),
            'image/jpeg',
            QUALITY,
        );
    });
}

/** Recorta al cuadrado por el centro y reduce a MAX_SIDE. */
async function shrink(file: File): Promise<Blob> {
    const img = await loadImage(await readAsDataUrl(file));

    const lado = Math.min(img.width, img.height);
    const sx = (img.width - lado) / 2;
    const sy = (img.height - lado) / 2;

    const canvas = document.createElement('canvas');
    canvas.width = MAX_SIDE;
    canvas.height = MAX_SIDE;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('el navegador no pudo procesar la imagen');
    ctx.drawImage(img, sx, sy, lado, lado, 0, 0, MAX_SIDE, MAX_SIDE);

    return toJpeg(canvas);
}

type Fase = 'quieto' | 'procesando' | 'subiendo';

const ETIQUETA: Record<Fase, string> = {
    quieto: 'Elegir del dispositivo',
    procesando: 'Preparando…',
    subiendo: 'Subiendo…',
};

export default function PhotoField({ value, onChange }: {
    value?: string;
    onChange: (v: string | undefined) => void;
}) {
    const input = useRef<HTMLInputElement>(null);
    const [error, setError] = useState<string | null>(null);
    // Se distinguen las dos esperas porque duran cosas distintas: recortar es
    // instantáneo y subir depende de la red. Un solo "Procesando…" dejaría al
    // usuario sin saber si se quedó pegado.
    const [fase, setFase] = useState<Fase>('quieto');

    const pick = async (file: File | undefined) => {
        if (!file) return;
        setError(null);
        try {
            setFase('procesando');
            const recortada = await shrink(file);
            setFase('subiendo');
            onChange(await cvService.uploadPhoto(recortada));
        } catch (err) {
            setError(describeError(err, 'subir la foto'));
        } finally {
            setFase('quieto');
            // Permite volver a elegir el mismo archivo si hizo falta corregir
            if (input.current) input.current.value = '';
        }
    };

    const ocupado = fase !== 'quieto';

    return (
        <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-medium text-body dark:text-gray-300">Foto de perfil</span>

            <div className="flex items-center gap-3">
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full border border-line bg-canvas dark:border-gray-700 dark:bg-gray-800">
                    {/* `value` puede ser el enlace nuevo o una foto incrustada de
                        un currículum viejo: las dos formas se muestran igual. */}
                    {value ? (
                        <img src={value} alt="" className="h-full w-full object-cover" />
                    ) : (
                        <div className="flex h-full w-full items-center justify-center text-muted">
                            <User size={22} />
                        </div>
                    )}
                </div>

                <div className="flex flex-wrap gap-2">
                    <input
                        ref={input}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        hidden
                        onChange={e => pick(e.target.files?.[0])}
                    />
                    <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        disabled={ocupado}
                        onClick={() => input.current?.click()}
                    >
                        <Upload size={14} /> {ETIQUETA[fase]}
                    </Button>
                    {value && !ocupado && (
                        <Button type="button" variant="secondary" size="sm" onClick={() => onChange(undefined)}>
                            <Trash2 size={14} /> Quitar
                        </Button>
                    )}
                </div>
            </div>

            <p className="text-[11px] text-muted">
                Se recorta al centro y se guarda aparte del currículum. Formatos JPG, PNG o WebP.
            </p>

            {error && <p className="text-[11px] text-rose-500">{error}</p>}
        </div>
    );
}
