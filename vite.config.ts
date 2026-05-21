
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Carica le variabili d'ambiente dall'ambiente di sistema (es. Vercel) e dai file .env
  // Fixed: Cast process to any to bypass "Property 'cwd' does not exist on type 'Process'" if environment types are strictly browser-focused.
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  // Identifica la chiave API cercando i nomi più comuni usati nelle configurazioni
  const apiKey = env.GEMINI_API_KEY || env.VITE_API_KEY || env.API_KEY || "";

  return {
    plugins: [react()],
    define: {
      // Inietta il valore della chiave direttamente in process.env per il runtime dell'app
      'process.env.GEMINI_API_KEY': JSON.stringify(apiKey),
      'process.env.API_KEY': JSON.stringify(apiKey) // Mantieni per compatibilità se necessario
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      sourcemap: false
    }
  };
});
