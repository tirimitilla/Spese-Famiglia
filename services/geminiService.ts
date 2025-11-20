
import { GoogleGenAI, Type } from "@google/genai";
import { Expense, FlyerOffer } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const categorizeExpense = async (product: string, store: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Categorizza il seguente prodotto acquistato in una singola parola o breve frase (max 2 parole). 
      Esempi di categorie: Alimentari, Casa, Salute, Trasporti, Intrattenimento, Abbigliamento, Tecnologia, Altro.
      
      Prodotto: ${product}
      Negozio: ${store}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            category: {
              type: Type.STRING,
            },
          },
          required: ["category"],
        },
      },
    });

    const jsonStr = response.text;
    if (!jsonStr) return "Altro";
    
    const data = JSON.parse(jsonStr);
    return data.category || "Altro";
  } catch (error) {
    console.error("Error categorizing expense:", error);
    return "Non categorizzato";
  }
};

export const getSpendingAnalysis = async (expenses: Expense[]): Promise<string> => {
  if (expenses.length === 0) return "Nessuna spesa registrata per generare un'analisi.";

  // Summarize data for the prompt to save tokens
  const summary = expenses.map(e => `${e.product} (${e.category}): €${e.total} presso ${e.store}`).join("\n");

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Analizza brevemente le seguenti spese familiari. Fornisci 3 consigli puntati per risparmiare o notare trend interessanti. Sii amichevole e conciso. Rispondi in Italiano.
      
      Lista Spese:
      ${summary}`,
    });

    return response.text || "Impossibile generare l'analisi al momento.";
  } catch (error) {
    console.error("Error analyzing expenses:", error);
    return "Errore durante l'analisi delle spese.";
  }
};

export const findFlyerOffers = async (city: string, stores: string[]): Promise<FlyerOffer[]> => {
  if (!city || stores.length === 0) return [];

  const storeList = stores.join(", ");
  const prompt = `Trova i link ai volantini attuali o le offerte della settimana per i seguenti negozi nella città di ${city}: ${storeList}.
  
  Restituisci ESCLUSIVAMENTE un array JSON valido (senza markdown) con la seguente struttura per ogni negozio trovato:
  [
    {
      "storeName": "Nome Negozio",
      "flyerLink": "URL diretto al volantino o alla pagina offerte",
      "validUntil": "Data scadenza offerte (se trovata, altrimenti stringa vuota)",
      "topOffers": ["Offerta 1", "Offerta 2"]
    }
  ]
  
  Se non trovi nulla per un negozio, ignoralo.`;

  try {
    // We use googleSearch tool for grounding
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        // Note: responseMimeType JSON is often incompatible with googleSearch in some contexts, 
        // but we instructed the model in text to return JSON. We'll clean it manually.
      },
    });

    const text = response.text;
    if (!text) return [];

    const cleanedJson = cleanJsonString(text);
    try {
      const offers = JSON.parse(cleanedJson) as FlyerOffer[];
      return offers;
    } catch (e) {
      console.error("Failed to parse flyer JSON", e);
      return [];
    }

  } catch (error) {
    console.error("Error finding flyers:", error);
    return [];
  }
};

// Interface for Receipt Response
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

// Helper to clean JSON string from Markdown code blocks
const cleanJsonString = (text: string): string => {
  let cleaned = text.trim();
  // Remove ```json and ``` wrapper if present
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json/, '').replace(/```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```/, '').replace(/```$/, '');
  }
  return cleaned.trim();
};

export const parseReceiptImage = async (base64Image: string): Promise<ReceiptScanResult> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          inlineData: {
            mimeType: "image/jpeg",
            data: base64Image
          }
        },
        {
          text: `Analizza questo scontrino. Estrai il nome del negozio, la data (formato YYYY-MM-DD, se non c'è usa oggi) e la lista degli articoli acquistati.
          
          Per ogni articolo:
          1. Estrai il nome del prodotto.
          2. Estrai la quantità (se non specificata, assumi 1).
          3. Estrai il prezzo unitario e il prezzo totale.
          4. ASSEGNA UNA CATEGORIA al prodotto (es: Alimentari, Casa, Abbigliamento, etc.).
          
          Se l'immagine è sfocata o non è uno scontrino, restituisci un array di items vuoto.
          Ignora sconti, subtotali parziali o righe non pertinenti.
          Rispondi SOLO con JSON.`
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            store: { type: Type.STRING },
            date: { type: Type.STRING },
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  product: { type: Type.STRING },
                  quantity: { type: Type.NUMBER },
                  unitPrice: { type: Type.NUMBER },
                  total: { type: Type.NUMBER },
                  category: { type: Type.STRING },
                },
                required: ["product", "total", "category"]
              }
            }
          },
          required: ["store", "items"]
        }
      }
    });

    const text = response.text;
    if (!text) {
      return { success: false, error: "L'IA non ha restituito alcun dato." };
    }

    try {
      const cleanedText = cleanJsonString(text);
      const data = JSON.parse(cleanedText) as ReceiptData;

      if (!data.items || data.items.length === 0) {
         return { success: false, error: "Non sono riuscito a identificare prodotti nello scontrino. Prova con una foto più nitida." };
      }

      return { success: true, data };
    } catch (parseError) {
      console.error("JSON Parse error:", parseError, text);
      return { success: false, error: "Errore nel formato dei dati ricevuti. Riprova." };
    }

  } catch (error) {
    console.error("Error parsing receipt:", error);
    return { success: false, error: "Errore di comunicazione con il servizio IA." };
  }
};
