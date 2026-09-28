// @ts-check
import { defineConfig } from 'astro/config';
import fullReload from 'vite-plugin-full-reload';

// https://astro.build/config
export default defineConfig({
    compressHTML: true,

    vite: {
        plugins: [
            // Observa qualquer coisa dentro de /public e força reload quando mudar
            fullReload(['public/**/*']),
        ],
    },
});
