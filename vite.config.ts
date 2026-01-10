
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Fix: Explicitly cast process to any to resolve 'cwd' property error in environments where node types are not fully loaded in the editor/compiler context.
  const env = loadEnv(mode, (process as any).cwd(), '');

  // Cerca la chiave API, dando priorità allo standard VITE_API_KEY, 
  // ma supportando anche API_KEY per massima compatibilità.
  const apiKey = env.VITE_API_KEY || env.API_KEY;

  return {
    plugins: [react()],
    define: {
      // Inietta la chiave API trovata in process.env.API_KEY per l'uso nell'app
      'process.env.API_KEY': JSON.stringify(apiKey || "")
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
    }
  };
});
