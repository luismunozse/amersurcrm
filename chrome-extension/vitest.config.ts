import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

/**
 * Suite de la extensión, SEPARADA de la del CRM.
 *
 * Vive en su propio config porque el alias `@` choca: acá apunta a
 * `chrome-extension/src` y en el root a `src/`. El `vitest.config.ts` del root
 * además excluye `chrome-extension` explícitamente, así que sin este archivo
 * la extensión no tenía ninguna cobertura.
 *
 * Se corre con `npm run test:extension` desde el root (y también dentro de
 * `npm test`, que encadena las dos suites). vitest/jsdom se resuelven desde el
 * node_modules del root — la extensión no necesita instalarlos.
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    root: __dirname,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    setupFiles: ['./vitest.setup.ts'],
  },
});
