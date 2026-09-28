import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { setupApiRoutes } from "./apiRoutes";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Configura i limiti per gestire immagini base64 pesanti degli scontrini
  app.use(express.json({ limit: "15mb" }));
  app.use(express.urlencoded({ extended: true, limit: "15mb" }));

  // Configura gli endpoint API server-side per Gemini
  setupApiRoutes(app);

  // Servizio Vite in Development, file statici compilati in Production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server avviato correttamente sulla porta ${PORT}`);
  });
}

startServer();
