
export interface Member {
  id: string;
  name: string;
  color: string;
}

export interface FamilyProfile {
  id: string; // ID univoco del documento Firebase (il "Codice Famiglia")
  familyName: string;
  members: Member[];
  googleSheetUrl?: string; // Manteniamo opzionale se vuoi ancora usarlo per backup
  createdAt?: number;
}

export interface CategoryDefinition {
  id: string;
  name: string;
  icon: string; // Nome dell'icona (es. "shopping-cart")
  color: string; // Classe Tailwind o codice hex (es. "bg-emerald-100 text-emerald-600")
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
  reminderDays: number; // Giorni di preavviso prima della scadenza
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

// Payload for Sync (Legacy/Backup)
export interface SyncData {
  expenses: Expense[];
  incomes: Income[];
  stores: Store[];
  recurringExpenses: RecurringExpense[];
  shoppingList: ShoppingItem[];
  familyProfile: FamilyProfile;
  categories?: CategoryDefinition[]; // Aggiunto per sync
  timestamp: number;
}

export const DEFAULT_STORES: Store[] = [
  { id: '1', name: 'Supermercato' },
  { id: '2', name: 'Farmacia' },
  { id: '3', name: 'Benzinaio' },
  { id: '4', name: 'Online (Amazon/Ebay)' },
  { id: '5', name: 'Abbigliamento' },
];

export const DEFAULT_CATEGORIES: CategoryDefinition[] = [
  { id: '1', name: 'Alimentari', icon: 'shopping-cart', color: 'bg-emerald-100 text-emerald-600' },
  { id: '2', name: 'Trasporti', icon: 'car', color: 'bg-blue-100 text-blue-600' },
  { id: '3', name: 'Casa', icon: 'home', color: 'bg-orange-100 text-orange-600' },
  { id: '4', name: 'Salute', icon: 'heart-pulse', color: 'bg-red-100 text-red-600' },
  { id: '5', name: 'Svago', icon: 'gamepad-2', color: 'bg-purple-100 text-purple-600' },
  { id: '6', name: 'Abbigliamento', icon: 'shirt', color: 'bg-pink-100 text-pink-600' },
  { id: '7', name: 'Utenze', icon: 'zap', color: 'bg-yellow-100 text-yellow-600' },
  { id: '8', name: 'Altro', icon: 'help-circle', color: 'bg-gray-100 text-gray-600' },
];
