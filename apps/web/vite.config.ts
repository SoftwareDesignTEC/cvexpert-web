import { readFileSync } from 'node:fs'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// La version sale de package.json, que es tambien la que el pipeline usa para
// crear el tag: asi lo que se ve en pantalla y el tag de Git nunca se separan.
const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8'))

export default defineConfig({
    plugins: [
        react(),
        tailwindcss(),
    ],
    define: {
        __APP_VERSION__: JSON.stringify(version),
    },
    build: {
        rollupOptions: {
            output: {
                // React y el router van en su propio chunk: cambian poco, así que el
                // navegador los conserva en caché entre versiones, y el bundle de la
                // aplicación queda por debajo del límite de 500 kB de Vite. Se siguen
                // cargando al inicio (modulepreload), no cambia cuándo está lista la app.
                manualChunks(id) {
                    if (/[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/.test(id)) {
                        return 'react';
                    }
                },
            },
        },
    },
})