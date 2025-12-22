import React, { useState, useEffect, useMemo } from 'react';
import { DEFAULT_STORES, DEFAULT_CATEGORIES, Expense, Store, FamilyProfile, Income, CategoryDefinition, ShoppingItem, OfferPreferences, RecurringExpense, SyncData } from './types';
import { ExpenseForm } from './components/ExpenseForm';
import { ExpenseList } from './components/ExpenseList';
import { StoreManager } from './components/StoreManager';
import { LoginScreen } from './components/LoginScreen';
import { IncomeManager } from './components/IncomeManager';
import { CategoryManager } from './components/CategoryManager';
import { FamilyManager } from './components/FamilyManager';
import { ReceiptScanner } from './components/ReceiptScanner';
import { ShoppingListManager } from './components/ShoppingListManager';
import { OffersFinder } from './components/OffersFinder';
import { RecurringManager } from './components/RecurringManager';
import { DueExpensesAlert } from './components/DueExpensesAlert';
import { Analytics } from './components/Analytics';
import { AIInsight } from './components/AIInsight';
import { DataSync } from './components/DataSync';
import { ReceiptData } from './services/geminiService';
import { categorizeExpense } from './services/geminiService';
import { supabase } from './src/supabaseClient';
import * as SupabaseService from './services/supabaseService';
import { 
  WalletCards, LogOut, Menu, X, Home, History, ChevronRight, Coins, Tag, Cloud, User, Loader2, Users, Database, Sparkles, ShoppingCart, Percent, Repeat, BarChart3, Bell, Share2
} from 'lucide-react';

type View = 'dashboard' | 'shopping' | 'offers' | 'recurring' | 'analytics' | 'history' | 'budget' | 'categories' | 'profile';

function App() {
  const [session, setSession] = useState<any>(null);
  const [familyProfile, setFamilyProfile] = useState<FamilyProfile | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [shoppingItems, setShoppingItems] = useState<ShoppingItem[]>([]);
  const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>([]);
  const [stores, setStores] = useState<Store[]>(DEFAULT_STORES);
  const [categories, setCategories] = useState<CategoryDefinition[]>(DEFAULT_CATEGORIES);
  const [offerPrefs, setOfferPrefs] = useState<OfferPreferences>({
    city: '',
    selectedStores: [],
    lastCheckDate: Date.now(),
    hasEnabledNotifications: false
  });

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [isAIProcessing, setIsAIProcessing] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const productHistory = useMemo(() => {
    const history: Record<string, string> = {};
    [...expenses].reverse().forEach(exp => {
      history[exp.product] = exp.store;
    });
    return history;
  }, [expenses]);

  const existingProducts = useMemo(() => Object.keys(productHistory), [productHistory]);
  const activeShoppingCount = useMemo(() => shoppingItems.filter(i => !i.completed).length, [shoppingItems]);

  const dueRecurring = useMemo(() => {
    const today = new Date();
    today.setHours(0,0,0,0);
    return recurringExpenses.filter(exp => {
      const dueDate = new Date(exp.nextDueDate);
      dueDate.setHours(0,0,0,0);
      const diffTime = dueDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= exp.reminderDays;
    });
  }, [recurringExpenses]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) checkUserFamily(session.user.id);
      else setIsLoadingAuth(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        checkUserFamily(session.user.id);
      } else {
        setIsAuthenticated(false);
        setFamilyProfile(null);
        setIsLoadingAuth(false);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const checkUserFamily = async (userId: string) => {
    try {
      const membership = await SupabaseService.getFamilyForUser(userId);
      if (membership) {
        const profile = await SupabaseService.getFamilyProfile(membership.familyId);
        if (profile) {
          setFamilyProfile(profile);
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
        }
      } else {
        setIsAuthenticated(false);
      }
    } catch (e: any) {
      console.error("Errore inizializzazione:", e);
      setError("Errore sincronizzazione profilo.");
    } finally {
      setIsLoadingAuth(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && familyProfile?.id) {
      const loadAllData = async () => {
        setIsLoadingData(true);
        try {
          const [exp, inc, sto, cat, shop, rec] = await Promise.all([
            SupabaseService.fetchExpenses(familyProfile.id),
            SupabaseService.fetchIncomes(familyProfile.id),
            SupabaseService.fetchStores(familyProfile.id),
            SupabaseService.fetchCategories(familyProfile.id),
            SupabaseService.fetchShoppingList(familyProfile.id),
            SupabaseService.fetchRecurring(familyProfile.id)
          ]);
          setExpenses(exp || []);
          setIncomes(inc || []);
          setShoppingItems(shop || []);
          setRecurringExpenses(rec || []);
          if (sto && sto.length > 0) setStores(sto);
          if (cat && cat.length > 0) setCategories(cat);
        } catch (e: any) { 
          console.error("Errore caricamento dati:", e);
        } finally {
          setIsLoadingData(false);
        }
      };
      loadAllData();
    }
  }, [isAuthenticated, familyProfile?.id]);

  const handleSetupComplete = async (profile: FamilyProfile) => {
    if (!session?.user) return;
    setIsLoadingData(true);
    try {
      await SupabaseService.createFamilyProfile(profile);
      const name = session.user.user_metadata.full_name || session.user.email?.split('@')[0] || 'Utente';
      await SupabaseService.joinFamily(session.user.id, profile.id, name, true);
      setFamilyProfile(profile);
      setIsAuthenticated(true);
    } catch (e: any) {
      alert(`Errore: ${e.message}`);
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleLogout = async () => {
    await SupabaseService.signOut();
    setIsAuthenticated(false);
    setFamilyProfile(null);
    setExpenses([]);
    setIncomes([]);
    setShoppingItems([]);
    setRecurringExpenses([]);
    setIsMenuOpen(false);
    setError(null);
  };

  const handleAddExpense = async (product: string, quantity: number, unitPrice: number, total: number, store: string) => {
    if (!familyProfile) return;
    setIsAIProcessing(true);
    try {
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
        memberId: session?.user?.id 
      };
      setExpenses(prev => [newExpense, ...prev]);
      await SupabaseService.addExpenseToSupabase(familyProfile.id, newExpense);
    } catch (e: any) {
      console.error("Errore salvataggio spesa:", e);
    } finally {
      setIsAIProcessing(false);
    }
  };

  const handleScanComplete = async (data: ReceiptData) => {
    if (!familyProfile) return;
    setIsAIProcessing(true);
    try {
      const newExpenses: Expense[] = [];
      for (const item of data.items) {
        const newExpense: Expense = {
          id: crypto.randomUUID(),
          product: item.product,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.total,
          store: data.store || 'Sconosciuto',
          date: data.date ? new Date(data.date).toISOString() : new Date().toISOString(),
          category: item.category || 'Alimentari',
          memberId: session?.user?.id
        };
        await SupabaseService.addExpenseToSupabase(familyProfile.id, newExpense);
        newExpenses.push(newExpense);
      }
      setExpenses(prev => [...newExpenses, ...prev]);
      if (data.store && !stores.some(s => s.name.toLowerCase() === data.store.toLowerCase())) {
        const newStore = { id: crypto.randomUUID(), name: data.store };
        await SupabaseService.addStoreToSupabase(familyProfile.id, newStore);
        setStores(prev => [...prev, newStore]);
      }
    } catch (err) {
      console.error("Errore scansione:", err);
    } finally {
      setIsAIProcessing(false);
    }
  };

  const handleAddShoppingItem = async (product: string, store: string) => {
    if (!familyProfile) return;
    const newItem: ShoppingItem = { id: crypto.randomUUID(), product, store, completed: false };
    setShoppingItems(prev => [newItem, ...prev]);
    await SupabaseService.addShoppingItemToSupabase(familyProfile.id, newItem);
  };

  const handleAddIncome = async (source: string, amount: number, date: string) => {
    if (!familyProfile) return;
    const newIncome: Income = { id: crypto.randomUUID(), source, amount, date };
    setIncomes(prev => [newIncome, ...prev]);
    await SupabaseService.addIncomeToSupabase(familyProfile.id, newIncome);
  };

  const handleAddRecurring = async (product: string, amount: number, store: string, frequency: any, nextDate: string, reminderDays: number) => {
    if (!familyProfile) return;
    const newItem: RecurringExpense = { id: crypto.randomUUID(), product, amount, store, frequency, nextDueDate: nextDate, reminderDays };
    setRecurringExpenses(prev => [...prev, newItem]);
    await SupabaseService.addRecurringToSupabase(familyProfile.id, newItem);
  };

  const handleUpdateRecurring = async (updated: RecurringExpense) => {
    setRecurringExpenses(prev => prev.map(r => r.id === updated.id ? updated : r));
    await SupabaseService.updateRecurringInSupabase(updated);
  };

  const handleProcessRecurring = async (rec: RecurringExpense) => {
    await handleAddExpense(rec.product, 1, rec.amount, rec.amount, rec.store);
    const next = new Date(rec.nextDueDate);
    if (rec.frequency === 'mensile') next.setMonth(next.getMonth() + 1);
    else if (rec.frequency === 'settimanale') next.setDate(next.getDate() + 7);
    else if (rec.frequency === 'annuale') next.setFullYear(next.getFullYear() + 1);
    const updated = { ...rec, nextDueDate: next.toISOString().split('T')[0] };
    handleUpdateRecurring(updated);
  };

  const handleImportData = (syncData: SyncData) => {
      setExpenses(syncData.expenses);
      setIncomes(syncData.incomes || []);
      setStores(syncData.stores);
      setRecurringExpenses(syncData.recurringExpenses);
      setShoppingItems(syncData.shoppingList);
      if (syncData.categories) setCategories(syncData.categories);
      alert("Dati importati con successo!");
  };

  const MenuButton = ({ view, icon, label, badge, colorClass = "" }: { view: View, icon: any, label: string, badge?: number, colorClass?: string }) => (
    <button 
      onClick={() => { setCurrentView(view); setIsMenuOpen(false); }} 
      className={`w-full flex items-center gap-4 px-5 py-4 rounded-xl transition-all ${currentView === view ? 'bg-emerald-100 text-emerald-800 font-bold scale-[1.02]' : 'text-gray-700 hover:bg-gray-100'}`}
    >
      <div className={`relative ${colorClass}`}>
        {React.cloneElement(icon, { className: 'w-6 h-6' })}
        {badge ? (
            <span className="absolute -top-2 -right-2 bg-orange-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center border-2 border-white">
                {badge}
            </span>
        ) : null}
      </div>
      <span className="text-lg">{label}</span>
      {currentView === view && <ChevronRight className="w-5 h-5 ml-auto text-emerald-600" />}
    </button>
  );

  if (isLoadingAuth) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <Loader2 className="w-10 h-10 text-emerald-600 animate-spin" />
    </div>
  );

  if (!session) return <LoginScreen onSetupComplete={handleSetupComplete} />;
  if (!isAuthenticated && !isLoadingData) return <LoginScreen onSetupComplete={handleSetupComplete} isSupabaseAuth={true} />;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans pb-24 safe-area-top">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <button onClick={() => setIsMenuOpen(true)} className="p-2 -ml-2 text-gray-700 hover:bg-gray-100 rounded-xl">
                <Menu className="w-6 h-6" />
             </button>
             <div className="flex items-center gap-2 cursor-pointer" onClick={() => setCurrentView('dashboard')}>
                <WalletCards className="w-6 h-6 text-emerald-600" />
                <h1 className="font-bold text-base text-gray-800 truncate max-w-[150px]">
                  {familyProfile?.familyName || 'Famiglia'}
                </h1>
             </div>
          </div>
          <div className="flex items-center gap-2">
            {dueRecurring.length > 0 && (
                <button onClick={() => setCurrentView('recurring')} className="p-2 text-orange-500 bg-orange-50 rounded-full animate-pulse">
                    <Bell className="w-5 h-5" />
                </button>
            )}
            <button onClick={() => setCurrentView('profile')} className="bg-gray-100 p-1 rounded-full border border-gray-200 overflow-hidden">
               {session?.user?.user_metadata?.avatar_url ? (
                 <img src={session.user.user_metadata.avatar_url} className="w-7 h-7" alt="User" />
               ) : ( <User className="w-5 h-5 text-gray-500 m-1" /> )}
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
                   <span className="text-xs text-emerald-600 font-medium flex items-center gap-1 mt-1"><Cloud className="w-3 h-3" /> Sincronizzato</span>
                 </div>
                 <button onClick={() => setIsMenuOpen(false)} className="p-2 hover:bg-gray-200 rounded-full"><X className="w-6 h-6 text-gray-500" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-1">
                 <MenuButton view="dashboard" icon={<Home />} label="Dashboard" />
                 <MenuButton view="shopping" icon={<ShoppingCart />} label="Lista Spesa" badge={activeShoppingCount} colorClass="text-orange-500" />
                 <MenuButton view="offers" icon={<Percent />} label="Caccia Offerte" colorClass="text-red-500" />
                 <MenuButton view="recurring" icon={<Repeat />} label="Scadenze & Ricorrenti" badge={dueRecurring.length} colorClass="text-purple-600" />
                 
                 <div className="my-2 border-t border-gray-100"></div>
                 
                 <MenuButton view="analytics" icon={<BarChart3 />} label="Analisi & Report" colorClass="text-blue-600" />
                 <MenuButton view="budget" icon={<Coins />} label="Bilancio & Entrate" colorClass="text-emerald-600" />
                 <MenuButton view="history" icon={<History />} label="Storico Spese" />
                 
                 <div className="my-2 border-t border-gray-100"></div>
                 
                 <MenuButton view="profile" icon={<Users />} label="Membri Famiglia" />
                 <MenuButton view="categories" icon={<Tag />} label="Categorie Spesa" />
                 
                 <button onClick={handleLogout} className="w-full flex items-center gap-4 px-5 py-4 rounded-xl text-red-600 hover:bg-red-50 mt-4 font-bold transition-colors">
                   <LogOut className="w-6 h-6" /> Esci
                 </button>
              </div>
           </div>
        </div>
      )}

      <main className="max-w-2xl mx-auto px-4 py-6">
        {isLoadingData ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mb-4" />
          </div>
        ) : (
          <div className="animate-in fade-in duration-300">
            {currentView === 'dashboard' && (
                <div className="space-y-6">
                    <DueExpensesAlert dueExpenses={dueRecurring} onProcessExpense={handleProcessRecurring} />
                    <ReceiptScanner onScanComplete={handleScanComplete} />
                    <AIInsight expenses={expenses} />
                    <ExpenseForm 
                      stores={stores} 
                      members={[]} 
                      existingProducts={existingProducts} 
                      productHistory={productHistory} 
                      onAddExpense={handleAddExpense} 
                      isAnalyzing={isAIProcessing} 
                    />
                    <StoreManager onAddStore={(name) => SupabaseService.addStoreToSupabase(familyProfile!.id, {id: crypto.randomUUID(), name}).then(() => setStores(prev => [...prev, {id: crypto.randomUUID(), name}]))} />
                </div>
            )}

            {currentView === 'shopping' && (
                <ShoppingListManager items={shoppingItems} stores={stores} productHistory={productHistory} onAddItem={handleAddShoppingItem} onToggleItem={SupabaseService.updateShoppingItemInSupabase} onDeleteItem={SupabaseService.deleteShoppingItemFromSupabase} />
            )}

            {currentView === 'offers' && (
                <OffersFinder stores={stores} savedCity={offerPrefs.city} savedStores={offerPrefs.selectedStores} notificationsEnabled={offerPrefs.hasEnabledNotifications} onPreferencesChange={(city, selectedStores, hasEnabledNotifications) => setOfferPrefs({ ...offerPrefs, city, selectedStores, hasEnabledNotifications })} />
            )}

            {currentView === 'recurring' && (
                <RecurringManager recurringExpenses={recurringExpenses} stores={stores} onAddRecurring={handleAddRecurring} onUpdateRecurring={handleUpdateRecurring} onDeleteRecurring={(id) => SupabaseService.deleteRecurringFromSupabase(id).then(() => setRecurringExpenses(prev => prev.filter(r => r.id !== id)))} />
            )}

            {currentView === 'analytics' && (
                <div className="space-y-6">
                    <Analytics expenses={expenses} />
                    <AIInsight expenses={expenses} />
                </div>
            )}

            {currentView === 'history' && (
              <ExpenseList expenses={expenses} stores={stores} categories={categories} onDelete={(id) => SupabaseService.deleteExpenseFromSupabase(id).then(() => setExpenses(prev => prev.filter(e => e.id !== id)))} onEdit={(updated) => setExpenses(prev => prev.map(e => e.id === updated.id ? updated : e))} />
            )}

            {currentView === 'budget' && (
              <IncomeManager incomes={incomes} expenses={expenses} onAddIncome={handleAddIncome} onDeleteIncome={(id) => SupabaseService.deleteIncomeFromSupabase(id).then(() => setIncomes(prev => prev.filter(i => i.id !== id)))} />
            )}

            {currentView === 'categories' && (
              <CategoryManager categories={categories} onUpdateCategories={(cats) => {setCategories(cats); SupabaseService.syncCategoriesToSupabase(familyProfile!.id, cats);}} />
            )}

            {currentView === 'profile' && familyProfile && (
              <div className="space-y-6">
                <FamilyManager familyProfile={familyProfile} />
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <Share2 className="w-5 h-5 text-emerald-600" /> Backup & Sincronizzazione manuale
                    </h3>
                    <p className="text-sm text-gray-500 mb-4">Usa questa funzione per trasferire velocemente i dati tra dispositivi diversi tramite codice.</p>
                    <button 
                        onClick={() => setIsSyncModalOpen(true)}
                        className="w-full bg-emerald-50 text-emerald-700 font-bold py-3 rounded-xl border border-emerald-100 hover:bg-emerald-100 transition-all flex items-center justify-center gap-2"
                    >
                        Apri Gestione Sincronizzazione
                    </button>
                </div>
                {isSyncModalOpen && (
                    <DataSync 
                        data={{
                            expenses,
                            incomes,
                            stores,
                            recurringExpenses,
                            shoppingList: shoppingItems,
                            familyProfile,
                            categories
                        }}
                        onImport={handleImportData}
                        onClose={() => setIsSyncModalOpen(false)}
                    />
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;