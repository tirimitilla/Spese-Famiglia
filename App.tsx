import React, { useState, useEffect, useMemo } from 'react';
import { DEFAULT_STORES, Expense, Store, RecurringExpense, Frequency, FamilyProfile, SyncData, ShoppingItem, FlyerOffer } from './types';
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
import { categorizeExpense, ReceiptData } from './services/geminiService';
import { WalletCards, Calculator, Download, Share2, LogOut, Table, Menu } from 'lucide-react';

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

  // --- STATE: UI ---
  const [filters, setFilters] = useState<FilterState>({
    store: '',
    category: '',
    startDate: '',
    endDate: ''
  });

  const [isAIProcessing, setIsAIProcessing] = useState(false);
  const [showSync, setShowSync] = useState(false);
  const [showGoogleSheet, setShowGoogleSheet] = useState(false);

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
    localStorage.setItem('familyProfile', JSON.stringify(familyProfile));
  }, [familyProfile]);

  useEffect(() => {
    localStorage.setItem('shoppingList', JSON.stringify(shoppingList));
  }, [shoppingList]);

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
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [expenses, filters]);

  const filteredTotal = useMemo(() => {
    return filteredExpenses.reduce((sum, e) => sum + e.total, 0);
  }, [filteredExpenses]);

  const dueRecurringExpenses = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return recurringExpenses.filter(r => new Date(r.nextDueDate) <= today);
  }, [recurringExpenses]);

  // Map product name to last used store for smart shopping list
  const productHistoryMap = useMemo(() => {
    const map: Record<string, string> = {};
    expenses.forEach(e => {
        map[e.product] = e.store;
    });
    return map;
  }, [expenses]);

  // --- HANDLERS: AUTH ---
  const handleLogin = () => setIsAuthenticated(true);
  
  const handleSetupProfile = (profile: FamilyProfile) => {
    setFamilyProfile(profile);
    setIsAuthenticated(true);
  };

  const handleUpdateProfile = (updated: FamilyProfile) => {
    setFamilyProfile(updated);
  };

  const handleLogout = () => setIsAuthenticated(false);

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
  };

  const handleUpdateExpense = (updated: Expense) => {
    setExpenses(prev => prev.map(e => e.id === updated.id ? updated : e));
  };

  const handleDeleteExpense = (id: string) => {
    if (confirm('Sei sicuro di voler eliminare questa spesa?')) {
      setExpenses(prev => prev.filter(e => e.id !== id));
    }
  };

  const handleScanComplete = (data: ReceiptData) => {
    // Add store if new
    const storeExists = stores.some(s => s.name.toLowerCase() === data.store.toLowerCase());
    if (!storeExists && data.store) {
      handleAddStore(data.store);
    }

    // Add expenses batch
    const newExpenses: Expense[] = data.items.map(item => ({
      id: crypto.randomUUID(),
      product: item.product,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      total: item.total,
      store: data.store || 'Non specificato',
      date: data.date || new Date().toISOString(),
      category: item.category, // AI provided category
      memberId: familyProfile?.members[0]?.id // Default to first member or let user edit later
    }));

    setExpenses(prev => [...newExpenses, ...prev]);
  };

  const handleExportCSV = () => {
    const headers = ["Data", "Prodotto", "Negozio", "Categoria", "Quantità", "Prezzo Unit.", "Totale", "Membro"];
    const rows = expenses.map(e => {
       const memberName = familyProfile?.members.find(m => m.id === e.memberId)?.name || 'N/A';
       return [
        new Date(e.date).toLocaleDateString(),
        `"${e.product.replace(/"/g, '""')}"`, // Escape quotes
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

  // --- HANDLERS: STORES ---
  const handleAddStore = (name: string) => {
    if (!stores.find(s => s.name.toLowerCase() === name.toLowerCase())) {
      setStores(prev => [...prev, { id: crypto.randomUUID(), name }]);
    }
  };

  // --- HANDLERS: RECURRING ---
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
    // 1. Add to expenses
    await handleAddExpense(
        recExpense.product, 
        1, 
        recExpense.amount, 
        recExpense.amount, 
        recExpense.store, 
        familyProfile?.members[0]?.id || ''
    );

    // 2. Update next due date
    const nextDate = new Date(recExpense.nextDueDate);
    if (recExpense.frequency === 'settimanale') nextDate.setDate(nextDate.getDate() + 7);
    if (recExpense.frequency === 'mensile') nextDate.setMonth(nextDate.getMonth() + 1);
    if (recExpense.frequency === 'annuale') nextDate.setFullYear(nextDate.getFullYear() + 1);

    setRecurringExpenses(prev => prev.map(r => 
      r.id === recExpense.id ? { ...r, nextDueDate: nextDate.toISOString().split('T')[0] } : r
    ));
  };

  // --- HANDLERS: SHOPPING LIST ---
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

  // --- HANDLERS: SYNC ---
  const handleSyncImport = (data: SyncData) => {
    if (confirm('Attenzione: Stai per sovrascrivere i dati locali con quelli importati. Continuare?')) {
      setExpenses(data.expenses);
      setStores(data.stores);
      setRecurringExpenses(data.recurringExpenses);
      setShoppingList(data.shoppingList || []); // Support legacy sync
      setFamilyProfile(data.familyProfile);
    }
  };

  // --- RENDER ---

  if (!isAuthenticated) {
    return (
      <LoginScreen 
        existingProfile={familyProfile} 
        onLogin={handleLogin} 
        onSetupComplete={handleSetupProfile} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans pb-20 safe-area-top">
      
      {/* HEADER */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="bg-emerald-100 p-2 rounded-lg flex-shrink-0">
              <WalletCards className="w-6 h-6 text-emerald-600" />
            </div>
            <div className="min-w-0">
                <h1 className="font-bold text-lg leading-tight text-gray-800 truncate">Spese Familiari</h1>
                <p className="text-xs text-gray-500 font-medium truncate">Famiglia {familyProfile?.familyName}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-1 md:gap-2">
            {familyProfile && (
                <>
                    <button 
                        onClick={() => setShowGoogleSheet(true)}
                        className="p-2 text-gray-500 hover:bg-emerald-50 hover:text-emerald-600 rounded-lg transition-colors"
                        title="Backup su Google Sheets"
                    >
                        <Table className="w-5 h-5" />
                    </button>
                    <button 
                        onClick={() => setShowSync(true)}
                        className="p-2 text-gray-500 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors"
                        title="Sincronizza Famiglia"
                    >
                        <Share2 className="w-5 h-5" />
                    </button>
                </>
            )}
            <button 
                onClick={handleLogout}
                className="p-2 text-gray-400 hover:bg-red-50 hover:text-red-500 rounded-lg transition-colors"
                title="Esci"
            >
                <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* MODALS */}
      {showSync && familyProfile && (
        <DataSync 
            data={{ expenses, stores, recurringExpenses, familyProfile }} 
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

      <main className="max-w-5xl mx-auto px-2 sm:px-4 py-6">
        
        {/* DASHBOARD LAYOUT */}
        {/* Mobile: Stack with Main Content FIRST. Desktop: Sidebar Left, Main Right */}
        <div className="flex flex-col md:grid md:grid-cols-12 gap-6">
            
            {/* RIGHT COLUMN (Main Content) - Primary on Mobile (Order 1) */}
            <div className="order-1 md:order-2 md:col-span-8 space-y-6">
                
                {/* Alerts */}
                <DueExpensesAlert 
                    dueExpenses={dueRecurringExpenses}
                    onProcessExpense={handleProcessRecurring}
                />

                {/* Analytics */}
                <div className="grid grid-cols-1 gap-6">
                    <Analytics expenses={filteredExpenses} />
                </div>

                {/* AI Insight */}
                <AIInsight expenses={filteredExpenses} />

                {/* New Expense Inputs */}
                <div className="grid grid-cols-1 gap-6">
                    <ReceiptScanner onScanComplete={handleScanComplete} />
                    <ExpenseForm 
                        stores={stores} 
                        members={familyProfile?.members || []}
                        existingProducts={Array.from(new Set(expenses.map(e => e.product)))}
                        onAddExpense={handleAddExpense} 
                        isAnalyzing={isAIProcessing}
                    />
                </div>

                {/* Filtered List */}
                <div id="transaction-history">
                    <div className="flex justify-between items-end mb-2 px-1">
                        <h2 className="text-lg font-bold text-gray-800">Storico Transazioni</h2>
                        {expenses.length > 0 && (
                            <button 
                                onClick={handleExportCSV}
                                className="flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100 transition-colors"
                            >
                                <Download className="w-3 h-3" /> <span className="hidden sm:inline">Esporta CSV</span>
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

                    {/* Filtered Total Display */}
                    {(filters.store || filters.category || filters.startDate || filters.endDate) && (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 mb-4 flex justify-between items-center animate-in fade-in">
                            <span className="text-sm text-emerald-800 font-medium">Totale spese filtrate:</span>
                            <span className="text-lg font-bold text-emerald-700">€{filteredTotal.toFixed(2)}</span>
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
            </div>

            {/* LEFT COLUMN (Tools) - Secondary on Mobile (Order 2) */}
            <div className="order-2 md:order-1 md:col-span-4 space-y-6">
                 {/* Smart Shopping List */}
                 <ShoppingListManager 
                    items={shoppingList}
                    stores={stores}
                    productHistory={productHistoryMap}
                    onAddItem={handleAddShoppingItem}
                    onToggleItem={handleToggleShoppingItem}
                    onDeleteItem={handleDeleteShoppingItem}
                 />

                 {/* Offers Finder */}
                 <OffersFinder stores={stores} />

                 {/* Store Manager */}
                 <StoreManager onAddStore={handleAddStore} />

                 {/* Recurring Manager */}
                 <RecurringManager 
                    recurringExpenses={recurringExpenses}
                    stores={stores}
                    onAddRecurring={handleAddRecurring}
                    onDeleteRecurring={handleDeleteRecurring}
                 />
            </div>

        </div>

      </main>
    </div>
  );
}

export default App;