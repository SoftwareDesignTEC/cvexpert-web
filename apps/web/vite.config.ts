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
})