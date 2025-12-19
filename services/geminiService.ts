import { GoogleGenAI } from "@google/genai";
import { Expense, FlyerOffer } from "../types";

// --- CLIENT INITIALIZATION ---
const getAI = () => {
  // Verifichiamo che la chiave esista e non sia una stringa vuota o "undefined"
  const apiKey = process.env.API_KEY;
  if (!apiKey || apiKey === "" || apiKey === "undefined") {
    return null;
  }
  try {
    return new GoogleGenAI({ apiKey });
  } catch (e) {
    console.error("Errore inizializzazione Gemini:", e);
    return null;
  }
};

// --- UTILS ---
const cleanJsonString = (str: string) => {
  return str.replace(/```json\n?|```/g, '').trim();
};

// --- CATEGORIZATION ---
export const categorizeExpense = async (product: string, store: string): Promise<string> => {
  try {
    const ai = getAI();
    if (!ai) return "Alimentari"; // Fallback se IA non configurata

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Categorize the product "${product}" bought at "${store}" into exactly one of these categories: Alimentari, Trasporti, Casa, Salute, Svago, Abbigliamento, Utenze, Altro. Return ONLY the category name.`,
    });
    return response.text?.trim() || "Alimentari";
  } catch (error) {
    console.error("AI Categorization failed:", error);
    return "Alimentari";
  }
};

// --- SPENDING ANALYSIS ---
export const getSpendingAnalysis = async (expenses: Expense[]): Promise<string> => {
  if (expenses.length === 0) return "Nessuna spesa da analizzare.";
  
  try {
    const ai = getAI();
    if (!ai) return "Configura la API_KEY su Vercel per attivare i consigli dell'IA.";

    const summary = expenses.map(e => `${e.date.split('T')[0]}: ${e.product} (€${e.total})`).join('\n');
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `Analizza queste spese familiari recenti e fornisci 3 consigli brevi e pratici in italiano per risparmiare. Sii diretto e amichevole.\n\n${summary}`,
    });
    return response.text || "Analisi non disponibile.";
  } catch (error) {
    console.error("AI Analysis failed:", error);
    return "Impossibile generare l'analisi al momento.";
  }
};

// --- OFFERS FINDER ---
export const findFlyerOffers = async (city: string, stores: string[]): Promise<FlyerOffer[]> => {
    // Funzione mock per ora
    const offers: FlyerOffer[] = stores.map(store => ({
        storeName: store,
        flyerLink: `https://www.google.com/search?q=volantino+${encodeURIComponent(store)}+${encodeURIComponent(city)}+attuale`,
        validUntil: 'Vedi volantino',
        topOffers: []
    }));
    return new Promise(resolve => setTimeout(() => resolve(offers), 500));
};

// --- RECEIPT SCANNING ---
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

export interface ReceiptScanResult {
  success: boolean;
  data?: ReceiptData;
  error?: string;
}

export const parseReceiptImage = async (base64Image: string, mimeType: string = 'image/jpeg'): Promise<ReceiptScanResult> => {
  try {
    const ai = getAI();
    if (!ai) return { success: false, error: "IA non configurata. Aggiungi la API_KEY nelle impostazioni di Vercel." };

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Image
            }
          },
          {
            text: `Analyze this receipt image. Return JSON: { "store": "Name", "date": "YYYY-MM-DD", "items": [{ "product": "Name", "quantity": 1, "unitPrice": 0, "total": 0, "category": "Alimentari" }] }`
          }
        ]
      }
    });

    const text = response.text;
    if (!text) throw new Error("Risposta vuota");

    const data: ReceiptData = JSON.parse(cleanJsonString(text));
    return { success: true, data };

  } catch (error) {
    console.error("Receipt parsing error:", error);
    return { success: false, error: "Errore nella lettura dello scontrino." };
  }
};