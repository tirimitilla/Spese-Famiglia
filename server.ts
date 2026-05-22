import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Configura i limiti per gestire immagini base64 pesanti degli scontrini
  app.use(express.json({ limit: "15mb" }));
  app.use(express.urlencoded({ extended: true, limit: "15mb" }));

  // Helper per inizializzare l'SDK Gemini lato server usando la variabile d'ambiente di sistema
  const getAIClient = () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("Configurazione incompleta: la chiave d'ambiente GEMINI_API_KEY non è configurata sul server.");
    }
    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build-server',
        }
      }
    });
  };

  // 1. Endpoint per la categorizzazione automatica delle singole spese
  app.post("/api/categorize", async (req, res) => {
    try {
      const { product, store } = req.body;
      const ai = getAIClient();
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: `Categorizza "${product}" acquistato da "${store}". Scegli tra: Alimentari, Trasporti, Casa, Salute, Svago, Abbigliamento, Utenze, Altro. Restituisci SOLO il nome della categoria.`,
      });
      res.json({ category: response.text?.trim() || "Alimentari" });
    } catch (error: any) {
      console.error("Errore categorizzazione server:", error);
      res.status(500).json({ error: error.message || "Errore sconosciuto" });
    }
  });

  // 2. Endpoint per l'analisi intelligente del budget familiare
  app.post("/api/spending-analysis", async (req, res) => {
    try {
      const { expenses } = req.body;
      if (!expenses || expenses.length === 0) {
        return res.json({ analysis: "Nessuna spesa da analizzare per ricevere consigli." });
      }
      const ai = getAIClient();
      const summary = expenses.map((e: any) => `${e.product} (€${e.total})`).join(', ');
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: `Analizza queste spese e dai 2 consigli di risparmio brevi in italiano: ${summary}`,
      });
      res.json({ analysis: response.text || "Analisi non disponibile." });
    } catch (error: any) {
      console.error("Errore analisi server:", error);
      res.status(500).json({ error: error.message || "Impossibile generare l'analisi." });
    }
  });

  // 3. Endpoint per l'OCR degli scontrini tramite fotocamera/galleria
  app.post("/api/parse-receipt", async (req, res) => {
    try {
      const { base64Image, mimeType = 'image/jpeg' } = req.body;
      if (!base64Image) {
        return res.status(400).json({ error: "Nessuna immagine caricata." });
      }
      const ai = getAIClient();
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: {
          parts: [
            { inlineData: { mimeType, data: base64Image } },
            { text: "Analizza questa immagine di uno scontrino in modo estremamente dettagliato. Estrai TUTTI i prodotti elencati, senza saltarne nessuno. Se un prezzo o quantità non è chiaro, usa 0 o 1 come default. Categorizza ogni prodotto in una delle seguenti categorie: Alimentari, Trasporti, Casa, Salute, Svago, Abbigliamento, Utenze, Altro." }
          ]
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              store: { type: Type.STRING, description: "Nome del negozio" },
              date: { type: Type.STRING, description: "Data nel formato YYYY-MM-DD" },
              items: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    product: { type: Type.STRING },
                    quantity: { type: Type.NUMBER },
                    unitPrice: { type: Type.NUMBER },
                    total: { type: Type.NUMBER },
                    category: { type: Type.STRING }
                  },
                  required: ["product", "quantity", "unitPrice", "total", "category"]
                }
              }
            },
            required: ["store", "items"]
          }
        }
      });

      const text = response.text;
      if (!text) {
        return res.status(500).json({ error: "Scontrino elaborato ma risposta vuota dal modello IA" });
      }
      res.json(JSON.parse(text));
    } catch (error: any) {
      console.error("Errore server parse scontrino:", error);
      res.status(500).json({ error: error.message || "Errore di elaborazione scontrino" });
    }
  });

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
