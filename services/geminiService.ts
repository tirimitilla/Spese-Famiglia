import { GoogleGenAI } from "@google/genai";
import { Expense, FlyerOffer } from "../types";

// Fix: Exported ReceiptItem and ReceiptData interfaces to be used in components like ReceiptScanner.
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

// --- CLIENT INITIALIZATION ---
const getAI = () => {
  const apiKey = process.env.API_KEY;
  // Controllo rigoroso della chiave
  if (!apiKey || apiKey === "" || apiKey === "undefined" || apiKey.length < 10) {
    return null;
  }
  try {
    return new GoogleGenAI({ apiKey });
  } catch (e) {
    return null;
  }
};

const cleanJsonString = (str: string) => str.replace(/```json\n?|```/g, '').trim();

export const categorizeExpense = async (product: string, store: string): Promise<string> => {
  try {
    const ai = getAI();
    if (!ai) return "Alimentari";
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Categorize "${product}" from "${store}": Alimentari, Trasporti, Casa, Salute, Svago, Abbigliamento, Utenze, Altro. Return ONLY category name.`,
    });
    return response.text?.trim() || "Alimentari";
  } catch (error) {
    return "Alimentari";
  }
};

export const getSpendingAnalysis = async (expenses: Expense[]): Promise<string> => {
  if (expenses.length === 0) return "Nessuna spesa.";
  try {
    const ai = getAI();
    if (!ai) return "Configura API_KEY su Vercel per i consigli.";
    const summary = expenses.map(e => `${e.product} (€${e.total})`).join(', ');
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `Analizza brevemente queste spese e dai 2 consigli di risparmio in italiano: ${summary}`,
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

// Fix: Added explicit return type using the newly defined ReceiptData interface.
export const parseReceiptImage = async (base64Image: string, mimeType: string = 'image/jpeg'): Promise<{ success: boolean; data?: ReceiptData; error?: string }> => {
  try {
    const ai = getAI();
    if (!ai) return { success: false, error: "API_KEY mancante su Vercel." };
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: {
        parts: [{ inlineData: { mimeType, data: base64Image } }, { text: `Return JSON: { "store": "Name", "date": "YYYY-MM-DD", "items": [{ "product": "Name", "quantity": 1, "unitPrice": 0, "total": 0, "category": "Alimentari" }] }` }]
      }
    });
    return { success: true, data: JSON.parse(cleanJsonString(response.text || '')) };
  } catch (error) {
    return { success: false, error: "Errore lettura scontrino." };
  }
};