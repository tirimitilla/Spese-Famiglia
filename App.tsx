import React, { useState, useEffect, useMemo } from 'react';
import { DEFAULT_STORES, DEFAULT_CATEGORIES, Expense, Store, RecurringExpense, Frequency, FamilyProfile, SyncData, ShoppingItem, OfferPreferences, Income, CategoryDefinition } from './types';
import { ExpenseForm } from './components/ExpenseForm';
import { ExpenseList } from './components/ExpenseList';
import { StoreManager } from './components/StoreManager';
import { RecurringManager } from './components/RecurringManager';
import { DueExpensesAlert } from './components/DueExpensesAlert';
import { Analytics } from './components/Analytics';
import { AIInsight } from './components/AIInsight';
import { ExpenseFilters, FilterState } from './components/ExpenseFilters';
import { ReceiptScanner } from './components/ReceiptScanner';
import { LoginScreen } from './components/LoginScreen';
import { DataSync } from './components/DataSync';
import { GoogleSheetSync } from './components/GoogleSheetSync';
import { ShoppingListManager } from './components/ShoppingListManager';
import { OffersFinder } from './components/OffersFinder';
import { IncomeManager } from './components/IncomeManager';
import { CategoryManager } from './components/CategoryManager';
import { FamilyManager } from './components/FamilyManager';
import { categorizeExpense, ReceiptData, findFlyerOffers } from './services/geminiService';
import { supabase } from './src/supabaseClient';
import * as SupabaseService from './services/supabaseService';
import { 
  WalletCards, 
  Download, 
  Share2, 
  LogOut, 
  Table, 
  Menu, 
  X,
  Home,
  History,
  ShoppingCart,
  Percent,
  Repeat,
  BarChart3,
  ChevronRight,
  Coins,
  Tag,
  Github,
  Cloud,
  User,
  Loader2,
  Users
} from 'lucide-react';

type View = 'dashboard' | 'history' | 'shopping' | 'offers' | 'recurring' | 'analytics' | 'budget' | 'categories' | 'profile';

function App() {
  // --- AUTH STATE ---
  const [session, setSession] = useState<any>(null);
  const [familyProfile, setFamilyProfile] = useState<FamilyProfile | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  // App Data State
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [stores, setStores] = useState<Store[]>(DEFAULT_STORES);
  const [categories, setCategories] = useState<CategoryDefinition[]>(DEFAULT_CATEGORIES);
  const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>([]);
  const [shoppingList, setShoppingList] = useState<ShoppingItem[]>([]);

  // UI State
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAIProcessing, setIsAIProcessing] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [showSync, setShowSync] = useState(false);
  const [showGoogleSheet, setShowGoogleSheet] = useState(false);
  const [newOffersCount, setNewOffersCount] = useState(0);
  
  const [filters, setFilters] = useState<FilterState>({
    store: '', category: '', startDate: '', endDate: ''
  });

  const [offerPrefs, setOfferPrefs] = useState<OfferPreferences>(() => {
    const saved = localStorage.getItem('offerPrefs');
    return saved ? JSON.parse(saved) : { city: '', selectedStores: [], lastCheckDate: 0, hasEnabledNotifications: false };
  });

  // --- SUPABASE AUTH LISTENER ---
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) checkUserFamily(session.user.id);
      else setIsLoadingAuth(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) checkUserFamily(session.user.id);
      else {
        setIsAuthenticated(false);
        setFamilyProfile(null);
        setIsLoadingAuth(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkUserFamily = async (userId: string) => {
    setIsLoadingData(true);
    const membership = await SupabaseService.getFamilyForUser(userId);
    if (membership) {
      const profile = await SupabaseService.getFamilyProfile(membership.familyId);
      if (profile) {
        setFamilyProfile(profile);
        setIsAuthenticated(true);
      }
    }
    setIsLoadingAuth(false);
    setIsLoadingData(false);
  };

  // --- DATA LOADING EFFECT ---
  useEffect(() => {
    if (isAuthenticated && familyProfile?.id) {
      const loadAllData = async () => {
        setIsLoadingData(true);
        try {
          const [exp, inc, sto, cat, rec, shop] = await Promise.all([
            SupabaseService.fetchExpenses(familyProfile.id),
            SupabaseService.fetchIncomes(familyProfile.id),
            SupabaseService.fetchStores(familyProfile.id),
            SupabaseService.fetchCategories(familyProfile.id),
            SupabaseService.fetchRecurring(familyProfile.id),
            SupabaseService.fetchShoppingList(familyProfile.id)
          ]);
          setExpenses(exp);
          setIncomes(inc);
          if (sto.length > 0) setStores(sto);
          if (cat.length > 0) setCategories(cat);
          setRecurringExpenses(rec);
          setShoppingList(shop);
        } catch (e) { console.error(e); }
        setIsLoadingData(false);
      };
      loadAllData();
    }
  }, [isAuthenticated, familyProfile?.id]);

  // --- HANDLERS ---
  const handleSetupComplete = async (profile: FamilyProfile) => {
    if (!session?.user) return;
    
    // Verifica se la famiglia esiste già sul DB (caso "Join") o se va creata
    const existing = await SupabaseService.getFamilyProfile(profile.id);
    if (!existing) {
        await SupabaseService.createFamilyProfile(profile);
    }
    
    // Associa utente loggato
    await SupabaseService.joinFamily(session.user.id, profile.id, session.user.user_metadata.full_name || 'Membro', !existing);
    
    setFamilyProfile(profile);
    setIsAuthenticated(true);
  };

  const handleLogout = async () => {
    await SupabaseService.signOut();
    setIsAuthenticated(false);
    setFamilyProfile(null);
    setExpenses([]);
    setIncomes([]);
    setIsMenuOpen(false);
  };

  const handleAddExpense = async (product: string, quantity: number, unitPrice: number, total: number, store: string) => {
    if (!familyProfile) return;
    setIsAIProcessing(true);
    const category = await categorizeExpense(product, store);
    const newExpense: Expense = { id: crypto.randomUUID(), product, quantity, unitPrice, total, store, date: new Date().toISOString(), category, memberId: session?.user?.id };
    setExpenses(prev => [newExpense, ...prev]);
    setIsAIProcessing(false);
    await SupabaseService.addExpenseToSupabase(familyProfile.id, newExpense);
  };

  const handleUpdateExpense = async (updated: Expense) => {
    if (!familyProfile) return;
    setExpenses(prev => prev.map(e => e.id === updated.id ? updated : e));
    await SupabaseService.updateExpenseInSupabase(familyProfile.id, updated);
  };

  const handleDeleteExpense = async (id: string) => {
    if (confirm('Sei sicuro di voler eliminare questa spesa?')) {
      setExpenses(prev => prev.filter(e => e.id !== id));
      await SupabaseService.deleteExpenseFromSupabase(id);
    }
  };

  const handleAddIncome = async (source: string, amount: number, date: string) => {
    if (!familyProfile) return;
    const newIncome: Income = { id: crypto.randomUUID(), source, amount, date };
    setIncomes(prev => [newIncome, ...prev]);
    await SupabaseService.addIncomeToSupabase(familyProfile.id, newIncome);
  };

  const handleDeleteIncome = async (id: string) => {
    setIncomes(prev => prev.filter(i => i.id !== id));
    await SupabaseService.deleteIncomeFromSupabase(id);
  };

  const handleAddStore = async (name: string) => {
    if (!familyProfile) return;
    if (!stores.find(s => s.name.toLowerCase() === name.toLowerCase())) {
        const newStore = { id: crypto.randomUUID(), name };
        setStores(prev => [...prev, newStore]);
        await SupabaseService.addStoreToSupabase(familyProfile.id, newStore);
    }
  };

  const handleCategoriesUpdate = (newCats: CategoryDefinition[]) => {
    if (!familyProfile) return;
    setCategories(newCats);
    SupabaseService.syncCategoriesToSupabase(familyProfile.id, newCats);
  };

  // --- MEMOS & FILTERS ---
  const filteredExpenses = useMemo(() => {
    return expenses.filter(expense => {
      const matchStore = filters.store ? expense.store === filters.store : true;
      const matchCategory = filters.category ? expense.category === filters.category : true;
      const matchStartDate = filters.startDate ? new Date(expense.date) >= new Date(filters.startDate) : true;
      const matchEndDate = filters.endDate ? new Date(expense.date) <= new Date(filters.endDate + 'T23:59:59') : true;
      return matchStore && matchCategory && matchStartDate && matchEndDate;
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [expenses, filters]);

  const MenuButton = ({ view, icon, label, badge }: { view: View, icon: any, label: string, badge?: number }) => (
    <button onClick={() => { setCurrentView(view); setIsMenuOpen(false); }} className={`w-full flex items-center gap-4 px-5 py-4 rounded-xl transition-colors ${currentView === view ? 'bg-emerald-100 text-emerald-800 font-bold' : 'text-gray-700 hover:bg-gray-100'}`}>
      {React.cloneElement(icon, { className: 'w-6 h-6' })}
      <span className="text-lg">{label}</span>
      {badge ? <span className="ml-auto bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{badge}</span> : null}
      {currentView === view && <ChevronRight className="w-5 h-5 ml-auto text-emerald-600" />}
    </button>
  );

  if (isLoadingAuth) return <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50"><Loader2 className="w-10 h-10 text-emerald-600 animate-spin" /><p className="mt-4 text-gray-500 font-medium">Caricamento sessione...</p></div>;
  if (!session) return <LoginScreen existingProfile={null} onLogin={() => {}} onSetupComplete={handleSetupComplete} onResetProfile={() => {}} />;
  if (!isAuthenticated) return <LoginScreen existingProfile={null} onLogin={() => {}} onSetupComplete={handleSetupComplete} onResetProfile={() => {}} isSupabaseAuth={true} />;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans pb-24 safe-area-top">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 h-18 flex items-center justify-between py-3">
          <div className="flex items-center gap-3">
             <button onClick={() => setIsMenuOpen(true)} className="p-3 -ml-2 text-gray-700 hover:bg-gray-100 rounded-xl relative">
                <Menu className="w-7 h-7" />
                {newOffersCount > 0 && <span className="absolute top-2 right-2 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>}
             </button>
             <div className="flex items-center gap-3" onClick={() => setCurrentView('dashboard')}>
                <div className="bg-emerald-100 p-2 rounded-xl"><WalletCards className="w-6 h-6 text-emerald-600" /></div>
                <h1 className="font-bold text-lg text-gray-800 truncate">Spese {familyProfile?.familyName}</h1>
             </div>
          </div>
          <div className="flex items-center gap-2">
             <button onClick={() => setCurrentView('profile')} className="bg-gray-100 p-1.5 rounded-full hover:bg-emerald-50 transition-colors" title="Il mio profilo">
                {session.user.user_metadata.avatar_url ? (
                    <img src={session.user.user_metadata.avatar_url} className="w-8 h-8 rounded-full" alt="User" />
                ) : <User className="w-5 h-5 text-gray-500 m-1" />}
             </button>
          </div>
        </div>
      </header>

      {isMenuOpen && (
        <div className="fixed inset-0 z-50 flex">
           <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsMenuOpen(false)}></div>
           <div className="relative w-[85%] max-w-xs bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-left duration-200">
              <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                 <div>
                     <h2 className="font-bold text-xl text-gray-800">Menù</h2>
                     <span className="text-xs text-emerald-600 font-medium flex items-center gap-1 mt-1"><Cloud className="w-3 h-3" /> Cloud Sync Attivo</span>
                 </div>
                 <button onClick={() => setIsMenuOpen(false)} className="p-3 hover:bg-gray-200 rounded-full"><X className="w-6 h-6 text-gray-500" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                 <MenuButton view="dashboard" icon={<Home />} label="Home & Scansione" />
                 <MenuButton view="budget" icon={<Coins />} label="Bilancio & Guadagni" />
                 <MenuButton view="shopping" icon={<ShoppingCart />} label="Lista Spesa" />
                 <MenuButton view="history" icon={<History />} label="Storico Transazioni" />
                 <MenuButton view="analytics" icon={<BarChart3 />} label="Analisi & Grafici" />
                 <div className="my-2 border-t border-gray-100"></div>
                 <MenuButton view="profile" icon={<Users />} label="Profilo Famiglia" />
                 <MenuButton view="categories" icon={<Tag />} label="Gestisci Categorie" />
                 <div className="my-2 border-t border-gray-100"></div>
                 <button onClick={handleLogout} className="w-full flex items-center gap-4 px-5 py-4 rounded-xl text-red-600 hover:bg-red-50 mt-4 font-bold">
                    <LogOut className="w-6 h-6" />
                    <span className="text-lg">Esci / Logout</span>
                 </button>
              </div>
           </div>
        </div>
      )}

      <main className="max-w-2xl mx-auto px-4 py-6">
        {isLoadingData ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mb-4" />
            <p className="text-gray-500 font-medium">Sincronizzazione Cloud...</p>
          </div>
        ) : (
          <>
            {currentView === 'dashboard' && (
                <div className="space-y-6 animate-in fade-in">
                    <ReceiptScanner onScanComplete={() => {}} />
                    <ExpenseForm stores={stores} members={[]} existingProducts={[]} productHistory={{}} onAddExpense={handleAddExpense} isAnalyzing={isAIProcessing} />
                    <StoreManager onAddStore={handleAddStore} />
                </div>
            )}
            {currentView === 'history' && <ExpenseList expenses={filteredExpenses} stores={stores} members={[]} onDelete={handleDeleteExpense} onEdit={handleUpdateExpense} categories={categories} />}
            {currentView === 'budget' && <IncomeManager incomes={incomes} expenses={expenses} onAddIncome={handleAddIncome} onDeleteIncome={handleDeleteIncome} />}
            {currentView === 'categories' && <CategoryManager categories={categories} onUpdateCategories={handleCategoriesUpdate} />}
            {currentView === 'profile' && familyProfile && <FamilyManager familyProfile={familyProfile} />}
          </>
        )}
      </main>
    </div>
  );
}

export default App;