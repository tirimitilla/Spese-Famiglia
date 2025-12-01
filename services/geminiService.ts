
import { GoogleGenAI } from "@google/genai";
import { Expense, FlyerOffer } from "../types";

// Initialize the client. API_KEY must be set in Vercel environment variables.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- UTILS ---
const cleanJsonString = (str: string) => {
  return str.replace(/```json\n?|```/g, '').trim();
};

// --- CATEGORIZATION ---
export const categorizeExpense = async (product: string, store: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Categorize the product "${product}" bought at "${store}" into exactly one of these categories: Alimentari, Trasporti, Casa, Salute, Svago, Abbigliamento, Utenze, Altro. Return ONLY the category name.`,
    });
    return response.text?.trim() || "Generale";
  } catch (error) {
    console.error("AI Categorization failed:", error);
    return "Generale";
  }
};

// --- SPENDING ANALYSIS ---
export const getSpendingAnalysis = async (expenses: Expense[]): Promise<string> => {
  if (expenses.length === 0) return "Nessuna spesa da analizzare.";
  
  // Simplify data for token limit
  const summary = expenses.map(e => `${e.date.split('T')[0]}: ${e.product} (€${e.total})`).join('\n');
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Analizza queste spese familiari recenti e fornisci 3 consigli brevi e pratici in italiano per risparmiare. Sii diretto e amichevole.\n\n${summary}`,
    });
    return response.text || "Analisi non disponibile al momento.";
  } catch (error) {
    console.error("AI Analysis failed:", error);
    return "Impossibile generare l'analisi al momento.";
  }
};

// --- OFFERS FINDER (Simple Link Generation) ---
export const findFlyerOffers = async (city: string, stores: string[]): Promise<FlyerOffer[]> => {
    // Generate static Google Search links for flyers
    // This avoids API permission issues and is always reliable
    const offers: FlyerOffer[] = stores.map(store => ({
        storeName: store,
        flyerLink: `https://www.google.com/search?q=volantino+${encodeURIComponent(store)}+${encodeURIComponent(city)}+attuale`,
        validUntil: 'Vedi volantino',
        topOffers: [] // No extraction without advanced API
    }));
    
    // Simulate async delay
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

export const parseReceiptImage = async (base64Image: string): Promise<ReceiptScanResult> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: base64Image
            }
          },
          {
            text: `Analyze this receipt image. Extract the store name, date, and list of items purchased.
            For each item extract: product name, quantity (default to 1 if missing), unit price, and total price.
            Also assign a category to each item (Alimentari, Casa, etc.).
            
            Return the result in this JSON format:
            {
              "store": "Store Name",
              "date": "YYYY-MM-DD",
              "items": [
                { "product": "Item Name", "quantity": 1, "unitPrice": 10.00, "total": 10.00, "category": "Category" }
              ]
            }
            Return ONLY raw JSON, no markdown blocks.`
          }
        ]
      }
    });

    const text = response.text;
    if (!text) throw new Error("Empty response from AI");

    const cleanJson = cleanJsonString(text);
    const data: ReceiptData = JSON.parse(cleanJson);

    // Basic Validation
    if (!data.items || !Array.isArray(data.items)) {
       throw new Error("Invalid JSON structure received");
    }

    return { success: true, data };

  } catch (error) {
    console.error("Receipt parsing error:", error);
    return { 
      success: false, 
      error: "Non sono riuscito a leggere lo scontrino. Assicurati che la foto sia ben illuminata e a fuoco, oppure inserisci i dati manualmente." 
    };
  }
};
