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

export const categorizeExpense = async (product: string, store: string): Promise<string> => {
  try {
    const response = await fetch('/api/categorize', {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ product, store })
    });
    
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      return "Alimentari";
    }

    const data = await response.json();
    return data.category || "Alimentari";
  } catch (error) {
    console.warn("Categorizzazione automatica non disponibile, uso default:", error);
    return "Alimentari";
  }
};

export const getSpendingAnalysis = async (expenses: Expense[]): Promise<string> => {
  if (expenses.length === 0) return "Nessuna spesa.";
  try {
    const response = await fetch('/api/spending-analysis', {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ expenses })
    });

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      return "Analisi temporaneamente non disponibile.";
    }

    const data = await response.json();
    return data.analysis || "Analisi non disponibile.";
  } catch (error) {
    console.error("Errore analisi client:", error);
    return "Impossibile generare l'analisi al momento.";
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
    const response = await fetch('/api/parse-receipt', {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ base64Image, mimeType })
    });

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      const rawText = await response.text().catch(() => "");
      console.error("Risposta non-JSON ricevuta dal server:", rawText.slice(0, 200));
      return {
        success: false,
        error: "Il server non ha risposto in formato JSON. Verifica che il server sia attivo e che GEMINI_API_KEY sia configurata."
      };
    }

    const data = await response.json();
    if (!response.ok) {
      return {
        success: false,
        error: data.error || `Errore del server (Codice ${response.status})`
      };
    }

    return { success: true, data };
  } catch (error: any) {
    console.error("Errore Parse Scontrino client:", error);
    return {
      success: false,
      error: error.message || "Errore di connessione durante l'analisi dello scontrino."
    };
  }
};
