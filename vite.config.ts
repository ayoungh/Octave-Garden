import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({ plugins: [react()], build: { rollupOptions: { output: { manualChunks: { audio: ['tone'] } } } }, server: { host: 'localhost', port: 5184, strictPort: true }, preview: { host: 'localhost', port: 5184, strictPort: true } });
