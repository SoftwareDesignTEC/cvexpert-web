import { useCallback, useEffect, useRef, useState } from 'react';

// Dictado con el reconocimiento de voz del navegador. Se hace acá y no en el
// servidor para que el audio no salga del dispositivo: al microservicio le
// llega sólo texto, igual que si se hubiera escrito. Eso evita un endpoint de
// subida, el límite de tamaño de APIM y un proveedor de transcripción aparte.
//
// Chrome y Edge lo soportan; Firefox no. Como es un extra sobre un campo de
// texto que se puede escribir a mano, que falte no rompe nada: el botón
// simplemente no aparece.

interface SpeechResultAlternative { transcript: string }
interface SpeechResult { 0: SpeechResultAlternative; isFinal: boolean; length: number }
interface SpeechResultList { length: number; [i: number]: SpeechResult }
interface SpeechEvent { resultIndex: number; results: SpeechResultList }
interface SpeechErrorEvent { error: string }

interface Recognition {
    lang: string;
    continuous: boolean;
    interimResults: boolean;
    start(): void;
    stop(): void;
    abort(): void;
    onresult: ((e: SpeechEvent) => void) | null;
    onerror: ((e: SpeechErrorEvent) => void) | null;
    onend: (() => void) | null;
}

type RecognitionCtor = new () => Recognition;

function getCtor(): RecognitionCtor | null {
    const w = window as unknown as {
        SpeechRecognition?: RecognitionCtor;
        webkitSpeechRecognition?: RecognitionCtor;
    };
    return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const MENSAJE: Record<string, string> = {
    'not-allowed': 'No nos diste permiso para usar el micrófono.',
    'service-not-allowed': 'El navegador bloqueó el micrófono.',
    'no-speech': 'No se escuchó nada. Probá de nuevo.',
    'audio-capture': 'No encontramos un micrófono conectado.',
    network: 'El reconocimiento de voz necesita conexión.',
};

export function useDictation(onText: (texto: string) => void) {
    const [listening, setListening] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const recog = useRef<Recognition | null>(null);

    // Se guarda en una referencia para que el reconocimiento, que vive entre
    // renders, siempre llame a la versión actual sin tener que reiniciarse.
    // Se actualiza en un efecto: escribir en una ref durante el render no vale.
    const onTextRef = useRef(onText);
    useEffect(() => { onTextRef.current = onText; }, [onText]);

    const supported = getCtor() !== null;

    const stop = useCallback(() => {
        recog.current?.stop();
        setListening(false);
    }, []);

    const start = useCallback(() => {
        const Ctor = getCtor();
        if (!Ctor) return;

        setError(null);
        const r = new Ctor();
        r.lang = 'es-CR';
        r.continuous = true;
        r.interimResults = false;

        r.onresult = e => {
            // Sólo los tramos definitivos: los provisionales cambian mientras
            // se habla y agregarlos duplicaría palabras.
            let texto = '';
            for (let i = e.resultIndex; i < e.results.length; i++) {
                if (e.results[i].isFinal) texto += e.results[i][0].transcript;
            }
            if (texto.trim()) onTextRef.current(texto.trim());
        };

        r.onerror = e => {
            setError(MENSAJE[e.error] ?? 'No pudimos usar el micrófono.');
            setListening(false);
        };

        r.onend = () => setListening(false);

        recog.current = r;
        r.start();
        setListening(true);
    }, []);

    // Si el diálogo se cierra mientras escucha, hay que soltar el micrófono
    useEffect(() => () => recog.current?.abort(), []);

    return { supported, listening, error, start, stop };
}
