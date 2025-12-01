
import React, { useState, useEffect, useMemo } from 'react';
import { DEFAULT_STORES, Expense, Store, RecurringExpense, Frequency, FamilyProfile, SyncData, ShoppingItem, OfferPreferences } from './types';
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
  CloudLightning
} from 'lucide-react';

// Define available views
type View = 'dashboard' | 'history' | 'shopping' | 'offers' | 'recurring' | 'analytics';

function App() {
  // --- STATE: AUTH & FAMILY ---
  const [familyProfile, setFamilyProfile] = useState<FamilyProfile | null>(() => {
    const saved = localStorage.getItem('familyProfile');
    return saved ? JSON.parse(saved) : null;
  });
  
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // --- STATE: DATA ---
  const [expenses, setExpenses] = useState<Expense[]>(() => {
    const saved = localStorage.getItem('expenses');
    const parsed = saved ? JSON.parse(saved) : [];
    return parsed.map((e: any) => ({
      ...e,
      unitPrice: e.unitPrice !== undefined ? e.unitPrice : (e.total / (e.quantity || 1))
    }));
  });

  const [stores, setStores] = useState<Store[]>(() => {
    const saved = localStorage.getItem('stores');
    return saved ? JSON.parse(saved) : DEFAULT_STORES;
  });

  const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>(() => {
    const saved = localStorage.getItem('recurringExpenses');
    return saved ? JSON.parse(saved) : [];
  });

  const [shoppingList, setShoppingList] = useState<ShoppingItem[]>(() => {
    const saved = localStorage.getItem('shoppingList');
    return saved ? JSON.parse(saved) : [];
  });

  // --- STATE: OFFERS & NOTIFICATIONS ---
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

  // --- STATE: UI ---
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  const [filters, setFilters] = useState<FilterState>({
    store: '',
    category: '',
    startDate: '',
    endDate: ''
  });

  const [isAIProcessing, setIsAIProcessing] = useState(false);
  const [showSync, setShowSync] = useState(false);
  const [showGoogleSheet, setShowGoogleSheet] = useState(false);
  const [bgSyncStatus, setBgSyncStatus] = useState<'idle' | 'syncing' | 'error'>('idle');

  // --- PERSISTENCE ---
  useEffect(() => {
    localStorage.setItem('expenses', JSON.stringify(expenses));
  }, [expenses]);

  useEffect(() => {
    localStorage.setItem('stores', JSON.stringify(stores));
  }, [stores]);

  useEffect(() => {
    localStorage.setItem('recurringExpenses', JSON.stringify(recurringExpenses));
  }, [recurringExpenses]);

  useEffect(() => {
    if (familyProfile) {
      localStorage.setItem('familyProfile', JSON.stringify(familyProfile));
    } else {
      localStorage.removeItem('familyProfile');
    }
  }, [familyProfile]);

  useEffect(() => {
    localStorage.setItem('shoppingList', JSON.stringify(shoppingList));
  }, [shoppingList]);

  useEffect(() => {
    localStorage.setItem('offerPrefs', JSON.stringify(offerPrefs));
  }, [offerPrefs]);

  // --- NOTIFICATION CHECK LOGIC ---
  useEffect(() => {
    const checkOffersInBackground = async () => {
      // Don't check if no city set or stores empty
      if (!offerPrefs.city || offerPrefs.selectedStores.length === 0) return;

      const now = Date.now();
      const oneDay = 24 * 60 * 60 * 1000;
      
      // Check only if > 24 hours have passed since last check
      if (now - offerPrefs.lastCheckDate > oneDay) {
        console.log("Checking for offers in background...");
        try {
          const results = await findFlyerOffers(offerPrefs.city, offerPrefs.selectedStores);
          
          if (results.length > 0) {
            setNewOffersCount(results.length);
            
            // Send System Notification if enabled
            if (offerPrefs.hasEnabledNotifications && Notification.permission === 'granted') {
              new Notification("Nuove Offerte Disponibili! 🛍️", {
                body: `Trovati ${results.length} nuovi volantini per ${offerPrefs.city}.`,
                icon: "/pwa-192x192.png", // Assuming PWA icon exists or default
                badge: "/pwa-192x192.png"
              });
            }
          }
          
          // Update last check date
          setOfferPrefs(prev => ({ ...prev, lastCheckDate: now }));
        } catch (e) {
          console.error("Background offer check failed", e);
        }
      }
    };

    // Run check 5 seconds after app load to not block initial render
    const timer = setTimeout(() => {
        checkOffersInBackground();
    }, 5000);

    return () => clearTimeout(timer);
  }, [offerPrefs.city, offerPrefs.selectedStores, offerPrefs.lastCheckDate, offerPrefs.hasEnabledNotifications]);


  // --- CALCULATED ---
  const categories = useMemo(() => {
    const unique = new Set(expenses.map(e => e.category));
    return Array.from(unique).sort();
  }, [expenses]);

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
    return recurringExpenses.filter(r => new Date(r.nextDueDate) <= today);
  }, [recurringExpenses]);

  const productHistoryMap = useMemo(() => {
    const map: Record<string, string> = {};
    expenses.forEach(e => {
        map[e.product] = e.store;
    });
    return map;
  }, [expenses]);

  // --- HELPER: SHEET NAME GENERATOR ---
  const getMonthSheetName = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const month = date.toLocaleString('it-IT', { month: 'long' });
      const year = date.getFullYear();
      return `${month.charAt(0).toUpperCase() + month.slice(1)} ${year}`;
    } catch (e) {
      return "Spese Generiche";
    }
  };

  // --- SYNC SERVICE ---
  const syncToGoogleSheet = async (action: 'ADD' | 'UPDATE' | 'DELETE', expense: Expense) => {
    if (!familyProfile?.googleSheetUrl) return;

    setBgSyncStatus('syncing');
    try {
      const dynamicSheetName = getMonthSheetName(expense.date);
      let payloadExpense: any = { id: expense.id };
      
      if (action !== 'DELETE') {
         const memberName = familyProfile.members.find(m => m.id === expense.memberId)?.name || 'Sconosciuto';
         payloadExpense = {
             ...expense,
             date: new Date(expense.date).toLocaleDateString('it-IT'),
             member: memberName
         };
      }

      await fetch(familyProfile.googleSheetUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            action: action,
            sheetName: dynamicSheetName, 
            expense: payloadExpense
        })
      });
      setBgSyncStatus('idle');
    } catch (error) {
      console.error("Sync failed", error);
      setBgSyncStatus('error');
      setTimeout(() => setBgSyncStatus('idle'), 3000);
    }
  };

  // --- HANDLERS: AUTH ---
  const handleLogin = () => setIsAuthenticated(true);
  
  const handleSetupProfile = (profile: FamilyProfile) => {
    setFamilyProfile(profile);
    setIsAuthenticated(true);
  };

  const handleUpdateProfile = (updated: FamilyProfile) => {
    setFamilyProfile(updated);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setIsMenuOpen(false);
  };

  const handleResetProfile = () => {
    setFamilyProfile(null);
    setIsAuthenticated(false);
  };

  // --- HANDLERS: OFFERS PREFS ---
  const handleOfferPrefsChange = (city: string, stores: string[], notificationsEnabled: boolean) => {
    setOfferPrefs(prev => ({
        ...prev,
        city,
        selectedStores: stores,
        hasEnabledNotifications: notificationsEnabled
    }));
  };

  // --- HANDLERS: EXPENSES ---
  const handleAddExpense = async (product: string, quantity: number, unitPrice: number, total: number, store: string, memberId: string) => {
    setIsAIProcessing(true);
    const category = await categorizeExpense(product, store);
    
    const newExpense: Expense = {
      id: crypto.randomUUID(),
      product,
      quantity,
      unitPrice,
      total,
      store,
      date: new Date().toISOString(),
      category,
      memberId
    };

    setExpenses(prev => [newExpense, ...prev]);
    setIsAIProcessing(false);
    syncToGoogleSheet('ADD', newExpense);
  };

  const handleUpdateExpense = (updated: Expense) => {
    setExpenses(prev => prev.map(e => e.id === updated.id ? updated : e));
    syncToGoogleSheet('UPDATE', updated);
  };

  const handleDeleteExpense = (id: string) => {
    const expenseToDelete = expenses.find(e => e.id === id);
    if (!expenseToDelete) return;

    if (confirm('Sei sicuro di voler eliminare questa spesa?')) {
      setExpenses(prev => prev.filter(e => e.id !== id));
      syncToGoogleSheet('DELETE', expenseToDelete);
    }
  };

  const handleScanComplete = (data: ReceiptData) => {
    const storeExists = stores.some(s => s.name.toLowerCase() === data.store.toLowerCase());
    if (!storeExists && data.store) {
      handleAddStore(data.store);
    }

    const newExpenses: Expense[] = data.items.map(item => ({
      id: crypto.randomUUID(),
      product: item.product,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      total: item.total,
      store: data.store || 'Non specificato',
      date: data.date || new Date().toISOString(),
      category: item.category,
      memberId: familyProfile?.members[0]?.id // Default to first member
    }));

    setExpenses(prev => [...newExpenses, ...prev]);
    alert(`Aggiunti ${newExpenses.length} prodotti con successo!`);
    
    newExpenses.forEach(exp => syncToGoogleSheet('ADD', exp));
  };

  const handleExportCSV = () => {
    const headers = ["Data", "Prodotto", "Negozio", "Categoria", "Quantità", "Prezzo Unit.", "Totale", "Membro"];
    const rows = expenses.map(e => {
       const memberName = familyProfile?.members.find(m => m.id === e.memberId)?.name || 'N/A';
       return [
        new Date(e.date).toLocaleDateString(),
        `"${e.product.replace(/"/g, '""')}"`,
        `"${e.store}"`,
        e.category,
        e.quantity,
        e.unitPrice.toFixed(2),
        e.total.toFixed(2),
        memberName
      ].join(",");
    });

    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `spese_familiari_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAddStore = (name: string) => {
    if (!stores.find(s => s.name.toLowerCase() === name.toLowerCase())) {
      setStores(prev => [...prev, { id: crypto.randomUUID(), name }]);
    }
  };

  const handleAddRecurring = (product: string, amount: number, store: string, frequency: Frequency, nextDate: string) => {
    const newRecurring: RecurringExpense = {
      id: crypto.randomUUID(),
      product,
      amount,
      store,
      frequency,
      nextDueDate: nextDate
    };
    setRecurringExpenses(prev => [...prev, newRecurring]);
  };

  const handleDeleteRecurring = (id: string) => {
    setRecurringExpenses(prev => prev.filter(r => r.id !== id));
  };

  const handleProcessRecurring = async (recExpense: RecurringExpense) => {
    await handleAddExpense(
        recExpense.product, 
        1, 
        recExpense.amount, 
        recExpense.amount, 
        recExpense.store, 
        familyProfile?.members[0]?.id || ''
    );

    const nextDate = new Date(recExpense.nextDueDate);
    if (recExpense.frequency === 'settimanale') nextDate.setDate(nextDate.getDate() + 7);
    if (recExpense.frequency === 'mensile') nextDate.setMonth(nextDate.getMonth() + 1);
    if (recExpense.frequency === 'annuale') nextDate.setFullYear(nextDate.getFullYear() + 1);

    setRecurringExpenses(prev => prev.map(r => 
      r.id === recExpense.id ? { ...r, nextDueDate: nextDate.toISOString().split('T')[0] } : r
    ));
  };

  const handleAddShoppingItem = (product: string, store: string) => {
    const newItem: ShoppingItem = {
        id: crypto.randomUUID(),
        product,
        store,
        completed: false
    };
    setShoppingList(prev => [...prev, newItem]);
  };

  const handleToggleShoppingItem = (id: string) => {
    setShoppingList(prev => prev.map(i => i.id === id ? { ...i, completed: !i.completed } : i));
  };

  const handleDeleteShoppingItem = (id: string) => {
    setShoppingList(prev => prev.filter(i => i.id !== id));
  };

  const handleSyncImport = (data: SyncData) => {
    if (confirm('Attenzione: Stai per sovrascrivere i dati locali con quelli importati. Continuare?')) {
      setExpenses(data.expenses);
      setStores(data.stores);
      setRecurringExpenses(data.recurringExpenses);
      setShoppingList(data.shoppingList || []);
      setFamilyProfile(data.familyProfile);
    }
  };

  // --- NAVIGATION HELPERS ---
  const MenuButton: React.FC<{ view: View, icon: React.ReactNode, label: string, badge?: number }> = ({ view, icon, label, badge }) => (
    <button 
      onClick={() => { 
          setCurrentView(view); 
          if(view === 'offers') setNewOffersCount(0); 
          setIsMenuOpen(false); 
      }}
      className={`w-full flex items-center gap-4 px-5 py-4 rounded-xl transition-colors relative ${
        currentView === view ? 'bg-emerald-100 text-emerald-800 font-bold' : 'text-gray-700 hover:bg-gray-100 font-medium'
      }`}
    >
      {React.cloneElement(icon as React.ReactElement<any>, { className: 'w-6 h-6' })}
      <span className="text-lg">{label}</span>
      {badge && badge > 0 && (
          <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full absolute right-10">
              {badge}
          </span>
      )}
      {currentView === view && <ChevronRight className="w-5 h-5 ml-auto text-emerald-600" />}
    </button>
  );

  // --- RENDER CONTENT BASED ON VIEW ---
  const renderContent = () => {
    switch(currentView) {
      case 'dashboard':
        return (
          <div className="space-y-6 animate-in fade-in">
             <DueExpensesAlert 
                dueExpenses={dueRecurringExpenses}
                onProcessExpense={handleProcessRecurring}
             />
             <ReceiptScanner onScanComplete={handleScanComplete} />
             <ExpenseForm 
                stores={stores} 
                members={familyProfile?.members || []}
                existingProducts={Array.from(new Set(expenses.map(e => e.product)))}
                productHistory={productHistoryMap}
                onAddExpense={handleAddExpense} 
                isAnalyzing={isAIProcessing}
             />
             <StoreManager onAddStore={handleAddStore} />
          </div>
        );
      
      case 'history':
        return (
          <div className="space-y-4 animate-in fade-in">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                  <History className="w-7 h-7 text-emerald-600" /> Storico Transazioni
                </h2>
                {expenses.length > 0 && (
                    <button 
                        onClick={handleExportCSV}
                        className="flex items-center gap-2 text-sm font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-4 py-3 rounded-xl border border-emerald-100"
                    >
                        <Download className="w-5 h-5" /> Esporta
                    </button>
                )}
            </div>
            
            <ExpenseFilters 
                stores={stores} 
                categories={categories}
                filters={filters} 
                onFilterChange={(k, v) => setFilters(prev => ({ ...prev, [k]: v }))}
                onClearFilters={() => setFilters({ store: '', category: '', startDate: '', endDate: '' })}
            />

            {(filters.store || filters.category || filters.startDate || filters.endDate) && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-4 flex justify-between items-center">
                    <span className="text-base text-emerald-800 font-bold">Totale spese filtrate:</span>
                    <span className="text-xl font-extrabold text-emerald-700">€{filteredTotal.toFixed(2)}</span>
                </div>
            )}

            <ExpenseList 
                expenses={filteredExpenses} 
                members={familyProfile?.members || []}
                stores={stores}
                onDelete={handleDeleteExpense}
                onEdit={handleUpdateExpense}
            />
          </div>
        );

      case 'shopping':
        return (
           <div className="animate-in fade-in">
             <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                  <ShoppingCart className="w-7 h-7 text-orange-500" /> Lista della Spesa
                </h2>
             </div>
             <ShoppingListManager 
                items={shoppingList}
                stores={stores}
                productHistory={productHistoryMap}
                onAddItem={handleAddShoppingItem}
                onToggleItem={handleToggleShoppingItem}
                onDeleteItem={handleDeleteShoppingItem}
             />
           </div>
        );

      case 'offers':
        return (
          <div className="animate-in fade-in">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                  <Percent className="w-7 h-7 text-red-500" /> Caccia alle Offerte
                </h2>
             </div>
            <OffersFinder 
                stores={stores} 
                savedCity={offerPrefs.city}
                savedStores={offerPrefs.selectedStores}
                notificationsEnabled={offerPrefs.hasEnabledNotifications}
                onPreferencesChange={handleOfferPrefsChange}
            />
          </div>
        );

      case 'recurring':
        return (
          <div className="animate-in fade-in">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                  <Repeat className="w-7 h-7 text-purple-600" /> Spese Ricorrenti
                </h2>
             </div>
             <RecurringManager 
                recurringExpenses={recurringExpenses}
                stores={stores}
                onAddRecurring={handleAddRecurring}
                onDeleteRecurring={handleDeleteRecurring}
             />
          </div>
        );

      case 'analytics':
        return (
          <div className="animate-in fade-in">
             <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                  <BarChart3 className="w-7 h-7 text-indigo-600" /> Analisi & Consigli
                </h2>
             </div>
             <Analytics expenses={filteredExpenses} />
             <AIInsight expenses={filteredExpenses} />
          </div>
        );
      
      default: return null;
    }
  };

  // --- MAIN RENDER ---

  if (!isAuthenticated) {
    return (
      <LoginScreen 
        existingProfile={familyProfile} 
        onLogin={handleLogin} 
        onSetupComplete={handleSetupProfile} 
        onResetProfile={handleResetProfile}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans pb-24 safe-area-top">
      
      {/* HEADER */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 h-18 flex items-center justify-between py-3">
          <div className="flex items-center gap-3">
             {/* Hamburger Button */}
             <button 
                onClick={() => setIsMenuOpen(true)}
                className="p-3 -ml-2 text-gray-700 hover:bg-gray-100 rounded-xl transition-colors active:scale-95 relative"
             >
                <Menu className="w-7 h-7" />
                {newOffersCount > 0 && (
                    <span className="absolute top-2 right-2 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>
                )}
             </button>
             
             <div className="flex items-center gap-3 overflow-hidden" onClick={() => setCurrentView('dashboard')}>
                <div className="bg-emerald-100 p-2 rounded-xl flex-shrink-0">
                  <WalletCards className="w-6 h-6 text-emerald-600" />
                </div>
                <div className="min-w-0 cursor-pointer">
                    <h1 className="font-bold text-lg leading-tight text-gray-800 truncate">Spese Familiari</h1>
                </div>
             </div>
          </div>
          
          <div className="flex items-center gap-2">
             {bgSyncStatus === 'syncing' && (
                 <div className="text-xs font-bold text-emerald-600 flex items-center gap-1 animate-pulse bg-emerald-50 px-2 py-1 rounded-full">
                    <CloudLightning className="w-3 h-3" /> Sync
                 </div>
             )}
             
             {/* Quick Actions (visible only on desktop or large screens) */}
             <div className="hidden md:flex items-center gap-2">
               <button onClick={() => setCurrentView('shopping')} className="p-3 text-gray-500 hover:text-emerald-600" title="Lista Spesa"><ShoppingCart className="w-6 h-6" /></button>
               <button onClick={() => setCurrentView('history')} className="p-3 text-gray-500 hover:text-emerald-600" title="Storico"><History className="w-6 h-6" /></button>
             </div>
          </div>
        </div>
      </header>

      {/* NAVIGATION DRAWER / MENU OVERLAY */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 flex">
           {/* Backdrop */}
           <div 
             className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
             onClick={() => setIsMenuOpen(false)}
           ></div>
           
           {/* Drawer Content */}
           <div className="relative w-[85%] max-w-xs bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-left duration-200">
              <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                 <div>
                    <h2 className="font-bold text-xl text-gray-800">Menù</h2>
                    <p className="text-sm text-gray-500 font-medium">Famiglia {familyProfile?.familyName}</p>
                 </div>
                 <button onClick={() => setIsMenuOpen(false)} className="p-3 hover:bg-gray-200 rounded-full">
                    <X className="w-6 h-6 text-gray-500" />
                 </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                 <MenuButton view="dashboard" icon={<Home />} label="Home & Scansione" />
                 <MenuButton view="history" icon={<History />} label="Storico Transazioni" />
                 <MenuButton view="shopping" icon={<ShoppingCart />} label="Lista Spesa" />
                 <MenuButton view="offers" icon={<Percent />} label="Caccia alle Offerte" badge={newOffersCount} />
                 <MenuButton view="recurring" icon={<Repeat />} label="Spese Ricorrenti" />
                 <MenuButton view="analytics" icon={<BarChart3 />} label="Analisi & Grafici" />
                 
                 <div className="my-6 border-t border-gray-100"></div>
                 
                 {/* System Actions in Menu */}
                 <button 
                    onClick={() => { setShowGoogleSheet(true); setIsMenuOpen(false); }}
                    className="w-full flex items-center gap-4 px-5 py-4 rounded-xl text-gray-700 hover:bg-gray-100 font-medium"
                 >
                    <Table className="w-6 h-6" />
                    <span className="text-lg">Integrazione Google Sheets</span>
                 </button>

                 <button 
                    onClick={() => { setShowSync(true); setIsMenuOpen(false); }}
                    className="w-full flex items-center gap-4 px-5 py-4 rounded-xl text-gray-700 hover:bg-gray-100 font-medium"
                 >
                    <Share2 className="w-6 h-6" />
                    <span className="text-lg">Sincronizza Famiglia</span>
                 </button>

                 <button 
                    onClick={handleLogout}
                    className="w-full flex items-center gap-4 px-5 py-4 rounded-xl text-red-600 hover:bg-red-50 mt-4 font-bold"
                 >
                    <LogOut className="w-6 h-6" />
                    <span className="text-lg">Esci</span>
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* MODALS */}
      {showSync && familyProfile && (
        <DataSync 
            data={{ expenses, stores, recurringExpenses, shoppingList, familyProfile }} 
            onImport={handleSyncImport} 
            onClose={() => setShowSync(false)} 
        />
      )}

      {showGoogleSheet && familyProfile && (
          <GoogleSheetSync 
            expenses={expenses} 
            familyProfile={familyProfile}
            onUpdateProfile={handleUpdateProfile}
            onClose={() => setShowGoogleSheet(false)}
          />
      )}

      <main className="max-w-2xl mx-auto px-4 py-6">
        {renderContent()}
      </main>
    </div>
  );
}

export default App;
