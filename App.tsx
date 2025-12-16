import React, { useState, useEffect, useMemo, useRef } from 'react';
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
import { categorizeExpense, ReceiptData, findFlyerOffers } from './services/geminiService';
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
  Copy,
  Check,
  Tag,
  Github,
  Cloud
} from 'lucide-react';

type View = 'dashboard' | 'history' | 'shopping' | 'offers' | 'recurring' | 'analytics' | 'budget' | 'categories';

function App() {
  // --- STATE ---
  const [familyProfile, setFamilyProfile] = useState<FamilyProfile | null>(() => {
    const saved = localStorage.getItem('familyProfile');
    return saved ? JSON.parse(saved) : null;
  });
  
  const [isAuthenticated, setIsAuthenticated] = useState(!!familyProfile);
  const [isLoadingData, setIsLoadingData] = useState(false);

  // Initial Data (Empty initially, populated from Supabase)
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [stores, setStores] = useState<Store[]>(DEFAULT_STORES);
  const [categories, setCategories] = useState<CategoryDefinition[]>(DEFAULT_CATEGORIES);
  const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>([]);
  const [shoppingList, setShoppingList] = useState<ShoppingItem[]>([]);

  // Local preferences (keep local as they are per-device)
  const [offerPrefs, setOfferPrefs] = useState<OfferPreferences>(() => {
    const saved = localStorage.getItem('offerPrefs');
    return saved ? JSON.parse(saved) : { 
      city: '', 
      selectedStores: [], 
      lastCheckDate: 0, 
      hasEnabledNotifications: false 
    };
  });
  
  const [newOffersCount, setNewOffersCount] = useState(0);
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  const [filters, setFilters] = useState<FilterState>({
    store: '', category: '', startDate: '', endDate: ''
  });

  const [isAIProcessing, setIsAIProcessing] = useState(false);
  const [showSync, setShowSync] = useState(false);
  const [showGoogleSheet, setShowGoogleSheet] = useState(false);

  // --- SUPABASE LOAD EFFECT ---
  useEffect(() => {
    if (familyProfile?.id) {
      setIsLoadingData(true);
      const loadData = async () => {
        try {
          // Verify profile exists on server
          const serverProfile = await SupabaseService.getFamilyProfile(familyProfile.id);
          if (!serverProfile) {
            // If it doesn't exist (first sync of a local profile), create it
            await SupabaseService.createFamilyProfile(familyProfile);
          }

          // Parallel Fetch
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

        } catch (error) {
          console.error("Failed to load data from Supabase", error);
        } finally {
          setIsLoadingData(false);
        }
      };
      loadData();
    }
  }, [familyProfile?.id]);


  // --- PERSISTENCE EFFECT (Local Backup / Profile) ---
  useEffect(() => {
    if (familyProfile) localStorage.setItem('familyProfile', JSON.stringify(familyProfile));
    else localStorage.removeItem('familyProfile');
  }, [familyProfile]);
  
  useEffect(() => { 
    localStorage.setItem('offerPrefs', JSON.stringify(offerPrefs)); 
  }, [offerPrefs]);

  // --- OFFERS CHECK ---
  useEffect(() => {
    const checkOffersInBackground = async () => {
      if (!offerPrefs.city || offerPrefs.selectedStores.length === 0) return;
      const now = Date.now();
      if (now - offerPrefs.lastCheckDate > (24 * 60 * 60 * 1000)) {
        try {
          const results = await findFlyerOffers(offerPrefs.city, offerPrefs.selectedStores);
          if (results.length > 0) {
            setNewOffersCount(results.length);
          }
          setOfferPrefs(prev => ({ ...prev, lastCheckDate: now }));
        } catch (e) {}
      }
    };
    const timer = setTimeout(() => { checkOffersInBackground(); }, 5000);
    return () => clearTimeout(timer);
  }, [offerPrefs.city, offerPrefs.selectedStores, offerPrefs.lastCheckDate]);

  // --- MEMOS ---
  const uniqueCategoryNames = useMemo(() => {
    const fromExpenses = new Set(expenses.map(e => e.category));
    const fromSettings = new Set(categories.map(c => c.name));
    return Array.from(new Set([...fromExpenses, ...fromSettings])).sort();
  }, [expenses, categories]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter(expense => {
      const matchStore = filters.store ? expense.store === filters.store : true;
      const matchCategory = filters.category ? expense.category === filters.category : true;
      const matchStartDate = filters.startDate ? new Date(expense.date) >= new Date(filters.startDate) : true;
      const matchEndDate = filters.endDate ? new Date(expense.date) <= new Date(filters.endDate + 'T23:59:59') : true;
      return matchStore && matchCategory && matchStartDate && matchEndDate;
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [expenses, filters]);

  const filteredTotal = useMemo(() => {
    return filteredExpenses.reduce((sum, e) => sum + e.total, 0);
  }, [filteredExpenses]);

  const dueRecurringExpenses = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return recurringExpenses.filter(r => {
        const dueDate = new Date(r.nextDueDate);
        dueDate.setHours(0, 0, 0, 0);
        
        const reminderDays = r.reminderDays || 0;
        const alertDate = new Date(dueDate);
        alertDate.setDate(dueDate.getDate() - reminderDays);

        return today >= alertDate;
    }).sort((a, b) => new Date(a.nextDueDate).getTime() - new Date(b.nextDueDate).getTime());
  }, [recurringExpenses]);

  const productHistoryMap = useMemo(() => {
    const map: Record<string, string> = {};
    // Iterate from oldest to newest (assuming expenses are sorted DESC by date, i.e., newest first)
    // Actually expenses from fetchExpenses are sorted date DESC.
    // So expenses[0] is newest.
    // If we use forEach (0 to length), we set newest first, then overwrite with older.
    // We want the newest store. So we should iterate in reverse order (oldest -> newest).
    for (let i = expenses.length - 1; i >= 0; i--) {
        const e = expenses[i];
        map[e.product] = e.store;
    }
    return map;
  }, [expenses]);

  // --- HANDLERS ---
  const handleLogin = () => setIsAuthenticated(true);
  
  const handleSetupComplete = (profile: FamilyProfile) => {
    setFamilyProfile(profile);
    // Create profile in Supabase immediately
    SupabaseService.createFamilyProfile(profile);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setFamilyProfile(null);
    localStorage.removeItem('familyProfile');
    // Clear data on logout
    setExpenses([]);
    setIncomes([]);
    setIsMenuOpen(false);
  };

  const handleResetProfile = () => {
    handleLogout();
  };

  const handleOfferPrefsChange = (city: string, stores: string[], notificationsEnabled: boolean) => {
    setOfferPrefs(prev => ({ ...prev, city, selectedStores: stores, hasEnabledNotifications: notificationsEnabled }));
  };

  const handleAddExpense = async (product: string, quantity: number, unitPrice: number, total: number, store: string) => {
    if (!familyProfile) return;
    setIsAIProcessing(true);
    const category = await categorizeExpense(product, store);
    const newExpense: Expense = {
      id: crypto.randomUUID(),
      product, quantity, unitPrice, total, store,
      date: new Date().toISOString(),
      category
    };
    
    // Optimistic Update
    setExpenses(prev => [newExpense, ...prev]);
    setIsAIProcessing(false);

    // Cloud Sync
    await SupabaseService.addExpenseToSupabase(familyProfile.id, newExpense);
  };

  const handleAddIncome = async (source: string, amount: number, date: string) => {
    if (!familyProfile) return;
    const newIncome: Income = {
      id: crypto.randomUUID(),
      source,
      amount,
      date
    };
    setIncomes(prev => [newIncome, ...prev]);
    await SupabaseService.addIncomeToSupabase(familyProfile.id, newIncome);
  };

  const handleDeleteIncome = async (id: string) => {
    setIncomes(prev => prev.filter(i => i.id !== id));
    await SupabaseService.deleteIncomeFromSupabase(id);
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

  const handleScanComplete = (data: ReceiptData) => {
    if (!familyProfile) return;

    // Check store
    const storeExists = stores.some(s => s.name.toLowerCase() === data.store.toLowerCase());
    if (!storeExists && data.store) handleAddStore(data.store);

    // Create expenses
    const newExpenses = data.items.map(item => ({
        id: crypto.randomUUID(),
        product: item.product,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.total,
        store: data.store || 'Non specificato',
        date: data.date || new Date().toISOString(),
        category: item.category
    }));

    setExpenses(prev => [...newExpenses, ...prev]);
    alert(`Aggiunti ${data.items.length} prodotti con successo!`);

    // Cloud Sync Batch (Iterate for now)
    newExpenses.forEach(exp => SupabaseService.addExpenseToSupabase(familyProfile.id, exp));
  };

  const handleExportCSV = () => {
    const headers = ["Data", "Prodotto", "Negozio", "Categoria", "Quantità", "Prezzo Unit.", "Totale"];
    const rows = expenses.map(e => {
       return [
        new Date(e.date).toLocaleDateString(),
        `"${e.product.replace(/"/g, '""')}"`, `"${e.store}"`, e.category, e.quantity, e.unitPrice.toFixed(2), e.total.toFixed(2)
      ].join(",");
    });
    const blob = new Blob([[headers.join(","), ...rows].join("\n")], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `spese_${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
  };

  const handleAddStore = async (name: string) => {
    if (!familyProfile) return;
    if (!stores.find(s => s.name.toLowerCase() === name.toLowerCase())) {
        const newStore = { id: crypto.randomUUID(), name };
        setStores(prev => [...prev, newStore]);
        await SupabaseService.addStoreToSupabase(familyProfile.id, newStore);
    }
  };

  const handleAddRecurring = async (product: string, amount: number, store: string, frequency: Frequency, nextDate: string, reminderDays: number) => {
    if (!familyProfile) return;
    const newItem: RecurringExpense = { 
        id: crypto.randomUUID(), 
        product, amount, store, frequency, 
        nextDueDate: nextDate,
        reminderDays
    };
    setRecurringExpenses(prev => [...prev, newItem]);
    await SupabaseService.addRecurringToSupabase(familyProfile.id, newItem);
  };

  const handleDeleteRecurring = async (id: string) => {
    setRecurringExpenses(prev => prev.filter(r => r.id !== id));
    await SupabaseService.deleteRecurringFromSupabase(id);
  };

  const handleProcessRecurring = async (recExpense: RecurringExpense) => {
    if (!familyProfile) return;
    // Add real expense
    await handleAddExpense(recExpense.product, 1, recExpense.amount, recExpense.amount, recExpense.store);
    
    // Update next date
    const nextDate = new Date(recExpense.nextDueDate);
    if (recExpense.frequency === 'settimanale') nextDate.setDate(nextDate.getDate() + 7);
    if (recExpense.frequency === 'mensile') nextDate.setMonth(nextDate.getMonth() + 1);
    if (recExpense.frequency === 'annuale') nextDate.setFullYear(nextDate.getFullYear() + 1);
    
    const updated = { ...recExpense, nextDueDate: nextDate.toISOString().split('T')[0] };
    setRecurringExpenses(prev => prev.map(r => r.id === updated.id ? updated : r));
    await SupabaseService.updateRecurringInSupabase(familyProfile.id, updated);
  };

  const handleAddShoppingItem = async (product: string, store: string) => {
    if (!familyProfile) return;
    const newItem = { id: crypto.randomUUID(), product, store, completed: false };
    setShoppingList(prev => [...prev, newItem]);
    await SupabaseService.addShoppingItemToSupabase(familyProfile.id, newItem);
  };

  const handleToggleShoppingItem = async (id: string) => {
    const item = shoppingList.find(i => i.id === id);
    if (!item) return;
    
    const updated = { ...item, completed: !item.completed };
    setShoppingList(prev => prev.map(i => i.id === id ? updated : i));
    await SupabaseService.updateShoppingItemInSupabase(updated);
  };

  const handleDeleteShoppingItem = async (id: string) => {
    setShoppingList(prev => prev.filter(i => i.id !== id));
    await SupabaseService.deleteShoppingItemFromSupabase(id);
  };

  const handleCategoriesUpdate = (newCats: CategoryDefinition[]) => {
    if (!familyProfile) return;
    setCategories(newCats);
    SupabaseService.syncCategoriesToSupabase(familyProfile.id, newCats);
  };

  // Sync Import Handler (Legacy Local Sync)
  const handleImportData = (data: SyncData) => {
    setExpenses(data.expenses || []);
    setIncomes(data.incomes || []);
    setStores(data.stores || DEFAULT_STORES);
    setRecurringExpenses(data.recurringExpenses || []);
    setShoppingList(data.shoppingList || []);
    if (data.categories) setCategories(data.categories);
    
    const profile = data.familyProfile;
    if (profile && !profile.id) profile.id = "LOCAL";
    setFamilyProfile(profile);
  };

  const MenuButton: React.FC<{ view: View, icon: React.ReactNode, label: string, badge?: number }> = ({ view, icon, label, badge }) => (
    <button 
      onClick={() => { setCurrentView(view); if(view === 'offers') setNewOffersCount(0); setIsMenuOpen(false); }}
      className={`w-full flex items-center gap-4 px-5 py-4 rounded-xl transition-colors relative ${
        currentView === view ? 'bg-emerald-100 text-emerald-800 font-bold' : 'text-gray-700 hover:bg-gray-100 font-medium'
      }`}
    >
      {React.cloneElement(icon as React.ReactElement<any>, { className: 'w-6 h-6' })}
      <span className="text-lg">{label}</span>
      {badge ? <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full absolute right-10">{badge}</span> : null}
      {currentView === view && <ChevronRight className="w-5 h-5 ml-auto text-emerald-600" />}
    </button>
  );

  const renderContent = () => {
    if (isLoadingData) {
      return (
        <div className="flex flex-col items-center justify-center py-20">
          <Cloud className="w-12 h-12 text-emerald-500 animate-bounce mb-4" />
          <p className="text-gray-500 font-medium">Sincronizzazione Cloud...</p>
        </div>
      );
    }

    switch(currentView) {
      case 'dashboard': return (
          <div className="space-y-6 animate-in fade-in">
             <DueExpensesAlert dueExpenses={dueRecurringExpenses} onProcessExpense={handleProcessRecurring} />
             <ReceiptScanner onScanComplete={handleScanComplete} />
             <ExpenseForm 
                stores={stores} members={familyProfile?.members || []}
                existingProducts={Array.from(new Set(expenses.map(e => e.product)))}
                productHistory={productHistoryMap}
                onAddExpense={handleAddExpense} isAnalyzing={isAIProcessing}
             />
             <StoreManager onAddStore={handleAddStore} />
          </div>
        );
      case 'history': return (
          <div className="space-y-4 animate-in fade-in">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3"><History className="w-7 h-7 text-emerald-600" /> Storico Transazioni</h2>
                {expenses.length > 0 && <button onClick={handleExportCSV} className="flex items-center gap-2 text-sm font-bold text-emerald-600 bg-emerald-50 px-4 py-3 rounded-xl border border-emerald-100"><Download className="w-5 h-5" /> Esporta</button>}
            </div>
            <ExpenseFilters stores={stores} categories={uniqueCategoryNames} filters={filters} onFilterChange={(k, v) => setFilters(p => ({ ...p, [k]: v }))} onClearFilters={() => setFilters({ store: '', category: '', startDate: '', endDate: '' })} />
            {(filters.store || filters.category || filters.startDate || filters.endDate) && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-4 flex justify-between items-center">
                    <span className="text-base text-emerald-800 font-bold">Totale spese filtrate:</span>
                    <span className="text-xl font-extrabold text-emerald-700">€{filteredTotal.toFixed(2)}</span>
                </div>
            )}
            <ExpenseList expenses={filteredExpenses} members={familyProfile?.members || []} stores={stores} categories={categories} onDelete={handleDeleteExpense} onEdit={handleUpdateExpense} />
          </div>
        );
      case 'shopping': return (
           <div className="animate-in fade-in">
             <div className="mb-6"><h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3"><ShoppingCart className="w-7 h-7 text-orange-500" /> Lista della Spesa</h2></div>
             <ShoppingListManager items={shoppingList} stores={stores} productHistory={productHistoryMap} onAddItem={handleAddShoppingItem} onToggleItem={handleToggleShoppingItem} onDeleteItem={handleDeleteShoppingItem} />
           </div>
        );
      case 'offers': return (
          <div className="animate-in fade-in">
            <div className="mb-6"><h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3"><Percent className="w-7 h-7 text-red-500" /> Caccia alle Offerte</h2></div>
            <OffersFinder stores={stores} savedCity={offerPrefs.city} savedStores={offerPrefs.selectedStores} notificationsEnabled={offerPrefs.hasEnabledNotifications} onPreferencesChange={handleOfferPrefsChange} />
          </div>
        );
      case 'recurring': return (
          <div className="animate-in fade-in">
            <div className="mb-6"><h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3"><Repeat className="w-7 h-7 text-purple-600" /> Spese Ricorrenti</h2></div>
             <RecurringManager recurringExpenses={recurringExpenses} stores={stores} onAddRecurring={handleAddRecurring} onDeleteRecurring={handleDeleteRecurring} />
          </div>
        );
      case 'analytics': return (
          <div className="animate-in fade-in">
             <div className="mb-6"><h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3"><BarChart3 className="w-7 h-7 text-indigo-600" /> Analisi & Consigli</h2></div>
             <Analytics expenses={filteredExpenses} />
             <AIInsight expenses={filteredExpenses} />
          </div>
        );
      case 'budget': return (
          <div className="animate-in fade-in">
              <div className="mb-6"><h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3"><Coins className="w-7 h-7 text-yellow-500" /> Bilancio & Guadagni</h2></div>
              <IncomeManager incomes={incomes} expenses={expenses} onAddIncome={handleAddIncome} onDeleteIncome={handleDeleteIncome} />
          </div>
      );
      case 'categories': return (
        <div className="animate-in fade-in">
            <CategoryManager categories={categories} onUpdateCategories={handleCategoriesUpdate} />
        </div>
      );
      default: return null;
    }
  };

  if (!isAuthenticated) return <LoginScreen existingProfile={familyProfile} onLogin={handleLogin} onSetupComplete={handleSetupComplete} onResetProfile={handleResetProfile} />;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans pb-24 safe-area-top">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 h-18 flex items-center justify-between py-3">
          <div className="flex items-center gap-3">
             <button onClick={() => setIsMenuOpen(true)} className="p-3 -ml-2 text-gray-700 hover:bg-gray-100 rounded-xl transition-colors active:scale-95 relative">
                <Menu className="w-7 h-7" />
                {newOffersCount > 0 && <span className="absolute top-2 right-2 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>}
             </button>
             <div className="flex items-center gap-3 overflow-hidden" onClick={() => setCurrentView('dashboard')}>
                <div className="bg-emerald-100 p-2 rounded-xl flex-shrink-0"><WalletCards className="w-6 h-6 text-emerald-600" /></div>
                <div className="min-w-0 cursor-pointer">
                    <h1 className="font-bold text-lg leading-tight text-gray-800 truncate">Spese {familyProfile?.familyName}</h1>
                </div>
             </div>
          </div>
          <div className="flex items-center gap-2">
             <div className="hidden md:flex items-center gap-2">
               <button onClick={() => setCurrentView('shopping')} className="p-3 text-gray-500 hover:text-emerald-600" title="Lista Spesa"><ShoppingCart className="w-6 h-6" /></button>
               <button onClick={() => setCurrentView('history')} className="p-3 text-gray-500 hover:text-emerald-600" title="Storico"><History className="w-6 h-6" /></button>
             </div>
          </div>
        </div>
      </header>

      {isMenuOpen && (
        <div className="fixed inset-0 z-50 flex">
           <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setIsMenuOpen(false)}></div>
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
                 <MenuButton view="offers" icon={<Percent />} label="Caccia alle Offerte" badge={newOffersCount} />
                 <MenuButton view="recurring" icon={<Repeat />} label="Spese Ricorrenti" />
                 <MenuButton view="analytics" icon={<BarChart3 />} label="Analisi & Grafici" />
                 
                 <div className="my-2 border-t border-gray-100"></div>
                 <MenuButton view="categories" icon={<Tag />} label="Gestisci Categorie" />
                 <div className="my-2 border-t border-gray-100"></div>

                 <button onClick={() => { setShowSync(true); setIsMenuOpen(false); }} className="w-full flex items-center gap-4 px-5 py-4 rounded-xl text-gray-700 hover:bg-gray-100 font-medium">
                    <Share2 className="w-6 h-6" />
                    <span className="text-lg">Importa/Esporta Legacy</span>
                 </button>

                 <button onClick={() => { setShowGoogleSheet(true); setIsMenuOpen(false); }} className="w-full flex items-center gap-4 px-5 py-4 rounded-xl text-gray-700 hover:bg-gray-100 font-medium">
                    <Table className="w-6 h-6" />
                    <span className="text-lg">Backup su Google Sheets</span>
                 </button>

                 <a href="https://github.com/tirimitilla/Spese-Famiglia" target="_blank" rel="noopener noreferrer" className="w-full flex items-center gap-4 px-5 py-4 rounded-xl text-gray-700 hover:bg-gray-100 font-medium">
                    <Github className="w-6 h-6" />
                    <span className="text-lg">Repository GitHub</span>
                 </a>

                 <button onClick={handleLogout} className="w-full flex items-center gap-4 px-5 py-4 rounded-xl text-red-600 hover:bg-red-50 mt-4 font-bold">
                    <LogOut className="w-6 h-6" />
                    <span className="text-lg">Esci / Reset Famiglia</span>
                 </button>
              </div>
           </div>
        </div>
      )}

      {showSync && familyProfile && <DataSync data={{ expenses, incomes, stores, recurringExpenses, shoppingList, familyProfile, categories }} onImport={handleImportData} onClose={() => setShowSync(false)} />}
      {showGoogleSheet && familyProfile && <GoogleSheetSync expenses={expenses} familyProfile={familyProfile} onUpdateProfile={(p) => setFamilyProfile(p)} onClose={() => setShowGoogleSheet(false)} />}
      <main className="max-w-2xl mx-auto px-4 py-6">{renderContent()}</main>
    </div>
  );
}

export default App;