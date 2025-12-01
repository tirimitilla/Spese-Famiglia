
export interface Member {
  id: string;
  name: string;
  color: string; // Hex color code for UI avatar
}

export interface FamilyProfile {
  familyName: string;
  pin: string;
  members: Member[];
  googleSheetUrl?: string; // URL of the Google Apps Script Web App
}

export interface Expense {
  id: string;
  product: string;
  quantity: number;
  unitPrice: number;
  total: number;
  store: string;
  date: string;
  category: string; // AI determined
  memberId?: string; // ID of the family member who made the purchase
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
  nextDueDate: string; // ISO Date string
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
  validUntil?: string;
  topOffers: string[];
}

export interface OfferPreferences {
  city: string;
  selectedStores: string[];
  lastCheckDate: number; // Timestamp
  hasEnabledNotifications: boolean;
}

// Payload for the Sync functionality
export interface SyncData {
  expenses: Expense[];
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
