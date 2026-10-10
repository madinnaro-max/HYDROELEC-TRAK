import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' : l'appli fonctionne à la racine d'un domaine, dans un sous-dossier (GitHub Pages : /mon-depot/)
// et à l'intérieur de l'appli native Capacitor, sans rien reconfigurer.
export default defineConfig({
  base: './',
  plugins: [react()],
  server: { host: true, port: 5173 },
  build: { sourcemap: false, chunkSizeWarningLimit: 1200 },
});
