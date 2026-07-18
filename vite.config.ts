import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import { compression } from 'vite-plugin-compression2';

function pdfWorkerCopy(): import('vite').Plugin {
  return {
    name: 'pdf-worker-copy',
    generateBundle() {
      const src = path.resolve(__dirname, 'node_modules/pdfjs-dist/build/pdf.worker.mjs');
      const dest = path.resolve(__dirname, 'dist/pdf.worker.js');
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, dest);
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), pdfWorkerCopy(), compression()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    chunkSizeWarningLimit: 1100,
    rollupOptions: {
      output: {
        manualChunks: {
          'pdf-lib': ['@cantoo/pdf-lib'],
          'pdfjs': ['pdfjs-dist'],
          'xlsx-chunk': ['xlsx'],
          'pptx-chunk': ['pptxgenjs'],
        },
      },
    },
  },
});
