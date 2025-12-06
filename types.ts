
export interface Member {
  id: string;
  name: string;
  color: string;
}

export interface FamilyProfile {
  familyName: string;
  pin: string;
  members: Member[]; // Manteniamo per retrocompatibilità profilo, ma non usiamo nell'UI spese
  googleSheetUrl?: string;
}

export interface Income {
  id: string;
  source: string; // Fonte (es. Stipendio)
  amount: number;
  date: string;
}

export interface Expense {
  id: string;
  product: string;
  quantity: number;
  unitPrice: number;
  total: number;
  store: string;
  date: string;
  category: string;
  memberId?: string;
}

export interface Store {
  id: string;
  name: string;
}

export interface AIAnalysisResponse {
  category: string;
}

export type Frequency = 'settimanale' | 'mensile' | 'annuale';

export interface RecurringExpense {
  id: string;
  product: string;
  amount: number;
  store: string;
  frequency: Frequency;
  nextDueDate: string;
}

export interface ShoppingItem {
  id: string;
  product: string;
  store: string;
  completed: boolean;
}

export interface FlyerOffer {
  storeName: string;
  flyerLink: string;
  validUntil: string;
  topOffers: string[];
}

export interface OfferPreferences {
  city: string;
  selectedStores: string[];
  lastCheckDate: number;
  hasEnabledNotifications: boolean;
}

// Payload for Sync
export interface SyncData {
  expenses: Expense[];
  incomes: Income[]; // NUOVO CAMPO
  stores: Store[];
  recurringExpenses: RecurringExpense[];
  shoppingList: ShoppingItem[];
  familyProfile: FamilyProfile;
  timestamp: number;
}

export const DEFAULT_STORES: Store[] = [
  { id: '1', name: 'Supermercato' },
  { id: '2', name: 'Farmacia' },
  { id: '3', name: 'Benzinaio' },
  { id: '4', name: 'Online (Amazon/Ebay)' },
  { id: '5', name: 'Abbigliamento' },
];
