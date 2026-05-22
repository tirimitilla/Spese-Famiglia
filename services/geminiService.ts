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
    
    if (!response.ok) {
      throw new Error(`Server returned status ${response.status}`);
    }
    
    const data = await response.json();
    return data.category || "Alimentari";
  } catch (error) {
    console.error("Errore categorizzazione client:", error);
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

    if (!response.ok) {
      throw new Error(`Server returned status ${response.status}`);
    }

    const data = await response.json();
    return data.analysis || "Analisi non disponibile.";
  } catch (error) {
    console.error("Errore analisi client:", error);
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
    const response = await fetch('/api/parse-receipt', {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ base64Image, mimeType })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Server error status: ${response.status}`);
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error: any) {
    console.error("Errore Parse Scontrino client:", error);
    return { success: false, error: error.message || "Errore durante l'analisi dell'immagine dallo scontrino." };
  }
};
