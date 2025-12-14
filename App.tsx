
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
  Tag
} from 'lucide-react';

type View = 'dashboard' | 'history' | 'shopping' | 'offers' | 'recurring' | 'analytics' | 'budget' | 'categories';

function App() {
  // --- STATE ---
  const [familyProfile, setFamilyProfile] = useState<FamilyProfile | null>(() => {
    const saved = localStorage.getItem('familyProfile');
    return saved ? JSON.parse(saved) : null;
  });
  
  const [isAuthenticated, setIsAuthenticated] = useState(!!familyProfile);

  // Load Initial Data from LocalStorage
  const [expenses, setExpenses] = useState<Expense[]>(() => {
    const saved = localStorage.getItem('expenses');
    return saved ? JSON.parse(saved) : [];
  });

  const [incomes, setIncomes] = useState<Income[]>(() => {
    const saved = localStorage.getItem('incomes');
    return saved ? JSON.parse(saved) : [];
  });

  const [stores, setStores] = useState<Store[]>(() => {
    const saved = localStorage.getItem('stores');
    return saved ? JSON.parse(saved) : DEFAULT_STORES;
  });

  const [categories, setCategories] = useState<CategoryDefinition[]>(() => {
    const saved = localStorage.getItem('categories');
    return saved ? JSON.parse(saved) : DEFAULT_CATEGORIES;
  });

  const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>(() => {
    const saved = localStorage.getItem('recurringExpenses');
    return saved ? JSON.parse(saved) : [];
  });

  const [shoppingList, setShoppingList] = useState<ShoppingItem[]>(() => {
    const saved = localStorage.getItem('shoppingList');
    return saved ? JSON.parse(saved) : [];
  });

  // Local preferences
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
  const [copiedCode, setCopiedCode] = useState(false);

  // --- PERSISTENCE EFFECT ---
  useEffect(() => {
    localStorage.setItem('expenses', JSON.stringify(expenses));
  }, [expenses]);

  useEffect(() => {
    localStorage.setItem('incomes', JSON.stringify(incomes));
  }, [incomes]);

  useEffect(() => {
    localStorage.setItem('stores', JSON.stringify(stores));
  }, [stores]);

  useEffect(() => {
    localStorage.setItem('categories', JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    localStorage.setItem('recurringExpenses', JSON.stringify(recurringExpenses));
  }, [recurringExpenses]);

  useEffect(() => {
    localStorage.setItem('shoppingList', JSON.stringify(shoppingList));
  }, [shoppingList]);

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
    // Merge existing categories in DB with those defined in settings to ensure dropdowns work
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

  // Logic updated to use reminderDays
  const dueRecurringExpenses = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize today

    return recurringExpenses.filter(r => {
        const dueDate = new Date(r.nextDueDate);
        dueDate.setHours(0, 0, 0, 0); // Normalize due date
        
        // Calculate the "Alert Date" (Due Date - Reminder Days)
        const reminderDays = r.reminderDays || 0;
        const alertDate = new Date(dueDate);
        alertDate.setDate(dueDate.getDate() - reminderDays);

        // Show if today is on or after the alert date
        return today >= alertDate;
    }).sort((a, b) => new Date(a.nextDueDate).getTime() - new Date(b.nextDueDate).getTime());
  }, [recurringExpenses]);

  const productHistoryMap = useMemo(() => {
    const map: Record<string, string> = {};
    expenses.forEach(e => {
        map[e.product] = e.store;
    });
    return map;
  }, [expenses]);

  // --- HANDLERS ---
  const handleLogin = () => setIsAuthenticated(true);
  
  const handleSetupComplete = (profile: FamilyProfile) => {
    setFamilyProfile(profile);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setFamilyProfile(null);
    localStorage.removeItem('familyProfile');
    setIsMenuOpen(false);
  };

  const handleResetProfile = () => {
    handleLogout();
  };

  const handleOfferPrefsChange = (city: string, stores: string[], notificationsEnabled: boolean) => {
    setOfferPrefs(prev => ({ ...prev, city, selectedStores: stores, hasEnabledNotifications: notificationsEnabled }));
  };

  const handleAddExpense = async (product: string, quantity: number, unitPrice: number, total: number, store: string) => {
    setIsAIProcessing(true);
    const category = await categorizeExpense(product, store);
    const newExpense: Expense = {
      id: crypto.randomUUID(),
      product, quantity, unitPrice, total, store,
      date: new Date().toISOString(),
      category
    };
    setExpenses(prev => [newExpense, ...prev]);
    setIsAIProcessing(false);
  };

  const handleAddIncome = async (source: string, amount: number, date: string) => {
    const newIncome: Income = {
      id: crypto.randomUUID(),
      source,
      amount,
      date
    };
    setIncomes(prev => [newIncome, ...prev]);
  };

  const handleDeleteIncome = async (id: string) => {
    setIncomes(prev => prev.filter(i => i.id !== id));
  };

  const handleUpdateExpense = async (updated: Expense) => {
    setExpenses(prev => prev.map(e => e.id === updated.id ? updated : e));
  };

  const handleDeleteExpense = async (id: string) => {
    if (confirm('Sei sicuro di voler eliminare questa spesa?')) {
      setExpenses(prev => prev.filter(e => e.id !== id));
    }
  };

  const handleScanComplete = (data: ReceiptData) => {
    const storeExists = stores.some(s => s.name.toLowerCase() === data.store.toLowerCase());
    if (!storeExists && data.store) handleAddStore(data.store);

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
    if (!stores.find(s => s.name.toLowerCase() === name.toLowerCase())) {
        const newStore = { id: crypto.randomUUID(), name };
        setStores(prev => [...prev, newStore]);
    }
  };

  const handleAddRecurring = async (product: string, amount: number, store: string, frequency: Frequency, nextDate: string, reminderDays: number) => {
    const newItem: RecurringExpense = { 
        id: crypto.randomUUID(), 
        product, amount, store, frequency, 
        nextDueDate: nextDate,
        reminderDays
    };
    setRecurringExpenses(prev => [...prev, newItem]);
  };

  const handleDeleteRecurring = async (id: string) => {
    setRecurringExpenses(prev => prev.filter(r => r.id !== id));
  };

  const handleProcessRecurring = async (recExpense: RecurringExpense) => {
    await handleAddExpense(recExpense.product, 1, recExpense.amount, recExpense.amount, recExpense.store);
    
    const nextDate = new Date(recExpense.nextDueDate);
    if (recExpense.frequency === 'settimanale') nextDate.setDate(nextDate.getDate() + 7);
    if (recExpense.frequency === 'mensile') nextDate.setMonth(nextDate.getMonth() + 1);
    if (recExpense.frequency === 'annuale') nextDate.setFullYear(nextDate.getFullYear() + 1);
    
    const updated = { ...recExpense, nextDueDate: nextDate.toISOString().split('T')[0] };
    setRecurringExpenses(prev => prev.map(r => r.id === updated.id ? updated : r));
  };

  const handleAddShoppingItem = async (product: string, store: string) => {
    const newItem = { id: crypto.randomUUID(), product, store, completed: false };
    setShoppingList(prev => [...prev, newItem]);
  };

  const handleToggleShoppingItem = async (id: string) => {
    setShoppingList(prev => prev.map(i => i.id === id ? { ...i, completed: !i.completed } : i));
  };

  const handleDeleteShoppingItem = async (id: string) => {
    setShoppingList(prev => prev.filter(i => i.id !== id));
  };

  // Sync Import Handler
  const handleImportData = (data: SyncData) => {
    setExpenses(data.expenses || []);
    setIncomes(data.incomes || []);
    setStores(data.stores || DEFAULT_STORES);
    setRecurringExpenses(data.recurringExpenses || []);
    setShoppingList(data.shoppingList || []);
    if (data.categories) setCategories(data.categories);
    
    // Ensure ID is present if missing from legacy data
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
            <CategoryManager categories={categories} onUpdateCategories={setCategories} />
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
                    <span className="text-lg">Sincronizza Dati</span>
                 </button>

                 <button onClick={() => { setShowGoogleSheet(true); setIsMenuOpen(false); }} className="w-full flex items-center gap-4 px-5 py-4 rounded-xl text-gray-700 hover:bg-gray-100 font-medium">
                    <Table className="w-6 h-6" />
                    <span className="text-lg">Backup su Google Sheets</span>
                 </button>

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
