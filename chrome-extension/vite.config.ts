import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { copyFileSync } from 'fs';

// Plugin para copiar archivos estáticos después del build
function copyStaticFiles() {
  return {
    name: 'copy-static-files',
    writeBundle() {
      // Copiar manifest.json
      copyFileSync(
        resolve(__dirname, 'manifest.json'),
        resolve(__dirname, 'dist/manifest.json')
      );
      // Copiar content.css
      copyFileSync(
        resolve(__dirname, 'src/content.css'),
        resolve(__dirname, 'dist/content.css')
      );
    }
  };
}

export default defineConfig({
  plugins: [react(), copyStaticFiles()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        content: resolve(__dirname, 'src/content.ts'),
        background: resolve(__dirname, 'src/background.ts'),
        sidebar: resolve(__dirname, 'src/sidebar.tsx'),
        popup: resolve(__dirname, 'src/popup.tsx'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]',
      },
    },
  },
});
