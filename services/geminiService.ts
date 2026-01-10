import { GoogleGenAI, Type } from "@google/genai";
import { Expense, FlyerOffer } from "../types";

export interface ReceiptItem {
  product: string;
  quantity: number;
  unitPrice: number;
  total: number;
  category: string;
}

export interface ReceiptData {
  store: string;
  date: string;
  items: ReceiptItem[];
}

// Helper per ottenere l'istanza AI garantendo che la chiave sia presente
const getAIClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("Configurazione incompleta: API_KEY non trovata nell'ambiente.");
  }
  return new GoogleGenAI({ apiKey });
};

export const categorizeExpense = async (product: string, store: string): Promise<string> => {
  try {
    const ai = getAIClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Categorizza "${product}" acquistato da "${store}". Scegli tra: Alimentari, Trasporti, Casa, Salute, Svago, Abbigliamento, Utenze, Altro. Restituisci SOLO il nome della categoria.`,
    });
    return response.text?.trim() || "Alimentari";
  } catch (error) {
    console.error("Errore categorizzazione:", error);
    return "Alimentari";
  }
};

export const getSpendingAnalysis = async (expenses: Expense[]): Promise<string> => {
  if (expenses.length === 0) return "Nessuna spesa.";
  try {
    const ai = getAIClient();
    const summary = expenses.map(e => `${e.product} (€${e.total})`).join(', ');
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Analizza queste spese e dai 2 consigli di risparmio brevi in italiano: ${summary}`,
    });
    return response.text || "Analisi non disponibile.";
  } catch (error) {
    return "Impossibile generare l'analisi.";
  }
};

export const findFlyerOffers = async (city: string, stores: string[]): Promise<FlyerOffer[]> => {
    return stores.map(store => ({
        storeName: store,
        flyerLink: `https://www.google.com/search?q=volantino+${encodeURIComponent(store)}+${encodeURIComponent(city)}`,
        validUntil: 'Vedi volantino',
        topOffers: []
    }));
};

export const parseReceiptImage = async (base64Image: string, mimeType: string = 'image/jpeg'): Promise<{ success: boolean; data?: ReceiptData; error?: string }> => {
  try {
    const ai = getAIClient();

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { mimeType, data: base64Image } },
          { text: "Estrai i dati da questo scontrino. Se un prezzo o quantità non è chiaro, usa 0 o 1 come default. Categorizza ogni prodotto in una delle seguenti categorie: Alimentari, Trasporti, Casa, Salute, Svago, Abbigliamento, Utenze, Altro." }
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
    if (!text) throw new Error("Risposta vuota dall'IA");
    
    return { success: true, data: JSON.parse(text) };
  } catch (error: any) {
    console.error("Errore Parse Scontrino:", error);
    if (error.message?.includes("API_KEY")) {
        return { success: false, error: "La chiave API non è stata configurata correttamente su Vercel. Controlla le Environment Variables." };
    }
    return { success: false, error: error.message || "Errore durante l'analisi dell'immagine." };
  }
};