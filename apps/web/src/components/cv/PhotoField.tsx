import { useRef, useState } from 'react';
import { Trash2, Upload, User } from 'lucide-react';
import Button from '../ui/Button';

// No hay endpoint para subir archivos, así que la foto viaja dentro del JSON
// del currículum, que el servicio limita a 100 KiB. Por eso se reduce en el
// navegador antes de guardarla: una foto de cámara sin tocar son varios megas
// y haría fallar el guardado entero con un 413.
const MAX_SIDE = 256;
const QUALITY = 0.72;
const MAX_BYTES = 60 * 1024;

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

/** Recorta al cuadrado por el centro y reduce a MAX_SIDE. */
async function shrink(file: File): Promise<string> {
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

    return canvas.toDataURL('image/jpeg', QUALITY);
}

export default function PhotoField({ value, onChange }: {
    value?: string;
    onChange: (v: string | undefined) => void;
}) {
    const input = useRef<HTMLInputElement>(null);
    const [error, setError] = useState<string | null>(null);
    const [working, setWorking] = useState(false);

    const pick = async (file: File | undefined) => {
        if (!file) return;
        setError(null);
        setWorking(true);
        try {
            const dataUrl = await shrink(file);
            if (dataUrl.length > MAX_BYTES) {
                setError('La imagen sigue siendo muy pesada. Probá con una más simple.');
                return;
            }
            onChange(dataUrl);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'No se pudo procesar la imagen.');
        } finally {
            setWorking(false);
            // Permite volver a elegir el mismo archivo si hizo falta corregir
            if (input.current) input.current.value = '';
        }
    };

    return (
        <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-medium text-body dark:text-gray-300">Foto de perfil</span>

            <div className="flex items-center gap-3">
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full border border-line bg-canvas dark:border-gray-700 dark:bg-gray-800">
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
                        accept="image/*"
                        hidden
                        onChange={e => pick(e.target.files?.[0])}
                    />
                    <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        disabled={working}
                        onClick={() => input.current?.click()}
                    >
                        <Upload size={14} /> {working ? 'Procesando…' : 'Elegir del dispositivo'}
                    </Button>
                    {value && (
                        <Button type="button" variant="secondary" size="sm" onClick={() => onChange(undefined)}>
                            <Trash2 size={14} /> Quitar
                        </Button>
                    )}
                </div>
            </div>

            <p className="text-[11px] text-muted">
                Se recorta al centro y se reduce a 256 px para que entre en el currículum.
            </p>

            {error && <p className="text-[11px] text-rose-500">{error}</p>}
        </div>
    );
}
