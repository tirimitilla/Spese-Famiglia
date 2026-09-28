import express from "express";
import { GoogleGenAI, Type } from "@google/genai";

export function setupApiRoutes(app: express.Express) {
  // Helper per inizializzare l'SDK Gemini lato server con telemetria corretta
  const getAIClient = () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("Configurazione incompleta: la chiave d'ambiente GEMINI_API_KEY non è configurata sul server.");
    }
    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  };

  // Helper resiliente con fallback sui modelli approvati in caso di picchi o indisponibilità
  const callWithModelFallback = async <T>(generateFn: (model: string) => Promise<T>): Promise<T> => {
    const models = ['gemini-3.1-flash-lite', 'gemini-flash-latest', 'gemini-3.8-flash'];
    let lastError: any = null;
    for (const model of models) {
      try {
        return await generateFn(model);
      } catch (err: any) {
        lastError = err;
        console.warn(`Tentativo con ${model} non riuscito (${err?.status || err?.message || 'errore'}), provo modello alternativo...`);
      }
    }
    throw lastError || new Error("I modelli IA sono temporaneamente occupati. Riprova tra pochi secondi.");
  };

  // 1. Endpoint per la categorizzazione automatica delle singole spese
  app.post("/api/categorize", async (req, res) => {
    try {
      const { product, store } = req.body;
      const ai = getAIClient();
      const response = await callWithModelFallback((model) =>
        ai.models.generateContent({
          model,
          contents: `Categorizza "${product || 'spesa'}" acquistato da "${store || 'negozio'}". Scegli tra: Alimentari, Trasporti, Casa, Salute, Svago, Abbigliamento, Utenze, Altro. Restituisci SOLO il nome esatto della categoria.`,
        })
      );
      res.json({ category: response.text?.trim() || "Alimentari" });
    } catch (error: any) {
      console.error("Errore categorizzazione server:", error);
      res.status(500).json({ error: error.message || "Errore sconosciuto", category: "Alimentari" });
    }
  });

  // 2. Endpoint per l'analisi intelligente del budget familiare
  app.post("/api/spending-analysis", async (req, res) => {
    try {
      const { expenses } = req.body;
      if (!expenses || expenses.length === 0) {
        return res.json({ analysis: "Nessuna spesa registrata per ricevere consigli." });
      }
      const ai = getAIClient();
      const summary = expenses.slice(0, 40).map((e: any) => `${e.product} (€${e.total})`).join(', ');
      const response = await callWithModelFallback((model) =>
        ai.models.generateContent({
          model,
          contents: `Analizza queste spese e fornisci 2 brevi consigli pratici di risparmio in italiano: ${summary}`,
        })
      );
      res.json({ analysis: response.text?.trim() || "Analisi non disponibile al momento." });
    } catch (error: any) {
      console.error("Errore analisi server:", error);
      res.status(500).json({ error: error.message || "Impossibile generare l'analisi.", analysis: "Analisi temporaneamente non disponibile." });
    }
  });

  // 3. Endpoint per l'OCR degli scontrini tramite fotocamera/galleria
  app.post("/api/parse-receipt", async (req, res) => {
    try {
      const { base64Image, mimeType = 'image/jpeg' } = req.body;
      if (!base64Image) {
        return res.status(400).json({ error: "Nessuna immagine caricata." });
      }

      // Sanitizzazione base64 rimuovendo eventuale data:image prefix e spazi
      let cleanBase64 = base64Image;
      if (typeof cleanBase64 === "string" && cleanBase64.includes(",")) {
        cleanBase64 = cleanBase64.split(",")[1];
      }
      cleanBase64 = cleanBase64.replace(/\s/g, "");

      const ai = getAIClient();
      const response = await callWithModelFallback((model) =>
        ai.models.generateContent({
          model,
          contents: {
            parts: [
              { inlineData: { mimeType: mimeType || 'image/jpeg', data: cleanBase64 } },
              { text: "Analizza questa immagine di scontrino fiscale in modo accurato. Estrai il nome del negozio, la data se presente e TUTTI i prodotti acquistati con quantità, prezzo unitario, totale e categoria (Alimentari, Trasporti, Casa, Salute, Svago, Abbigliamento, Utenze, Altro). Se quantità o prezzo unitario non sono chiari, usa il totale e imposta quantità a 1." }
            ]
          },
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                store: { type: Type.STRING, description: "Nome del negozio o supermercato" },
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
        })
      );

      let text = response.text?.trim() || "";
      if (text.startsWith("```json")) {
        text = text.replace(/^```json\s*/, "").replace(/\s*```$/, "");
      } else if (text.startsWith("```")) {
        text = text.replace(/^```\s*/, "").replace(/\s*```$/, "");
      }

      if (!text) {
        return res.status(500).json({ error: "Scontrino elaborato ma risposta vuota dal modello IA" });
      }

      try {
        const parsedData = JSON.parse(text);
        return res.json(parsedData);
      } catch (parseErr) {
        console.error("Errore parsing JSON output Gemini:", text);
        return res.status(500).json({ error: "Formato scontrino non riconosciuto. Prova con una foto più nitida." });
      }
    } catch (error: any) {
      console.error("Errore server parse scontrino:", error);
      res.status(500).json({ error: error.message || "Errore di elaborazione scontrino" });
    }
  });
}
