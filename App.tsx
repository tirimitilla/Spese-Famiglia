import React, { useState, useEffect } from 'react';
import { DEFAULT_STORES, DEFAULT_CATEGORIES, Expense, Store, FamilyProfile, Income, CategoryDefinition } from './types';
import { ExpenseForm } from './components/ExpenseForm';
import { ExpenseList } from './components/ExpenseList';
import { StoreManager } from './components/StoreManager';
import { LoginScreen } from './components/LoginScreen';
import { IncomeManager } from './components/IncomeManager';
import { CategoryManager } from './components/CategoryManager';
import { FamilyManager } from './components/FamilyManager';
import { categorizeExpense } from './services/geminiService';
import { supabase } from './src/supabaseClient';
import * as SupabaseService from './services/supabaseService';
import { 
  WalletCards, LogOut, Menu, X, Home, History, ChevronRight, Coins, Tag, Cloud, User, Loader2, Users, Database
} from 'lucide-react';

type View = 'dashboard' | 'history' | 'budget' | 'categories' | 'profile';

function App() {
  const [session, setSession] = useState<any>(null);
  const [familyProfile, setFamilyProfile] = useState<FamilyProfile | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [stores, setStores] = useState<Store[]>(DEFAULT_STORES);
  const [categories, setCategories] = useState<CategoryDefinition[]>(DEFAULT_CATEGORIES);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [isAIProcessing, setIsAIProcessing] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      if (e.message && e.message.includes('recursion')) {
        setError("Errore ricorsione database. Per favore esegui lo script SQL 'Tabula Rasa'.");
      }
    } finally {
      setIsLoadingAuth(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && familyProfile?.id) {
      const loadAllData = async () => {
        setIsLoadingData(true);
        try {
          const [exp, inc, sto, cat] = await Promise.all([
            SupabaseService.fetchExpenses(familyProfile.id),
            SupabaseService.fetchIncomes(familyProfile.id),
            SupabaseService.fetchStores(familyProfile.id),
            SupabaseService.fetchCategories(familyProfile.id)
          ]);
          setExpenses(exp || []);
          setIncomes(inc || []);
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

  const handleAddIncome = async (source: string, amount: number, date: string) => {
    if (!familyProfile) return;
    try {
      const newIncome: Income = { id: crypto.randomUUID(), source, amount, date };
      setIncomes(prev => [newIncome, ...prev]);
      await SupabaseService.addIncomeToSupabase(familyProfile.id, newIncome);
    } catch (e) {
      console.error("Errore salvataggio entrata:", e);
    }
  };

  const MenuButton = ({ view, icon, label }: { view: View, icon: any, label: string }) => (
    <button 
      onClick={() => { setCurrentView(view); setIsMenuOpen(false); }} 
      className={`w-full flex items-center gap-4 px-5 py-4 rounded-xl transition-colors ${currentView === view ? 'bg-emerald-100 text-emerald-800 font-bold' : 'text-gray-700 hover:bg-gray-100'}`}
    >
      {React.cloneElement(icon, { className: 'w-6 h-6' })}
      <span className="text-lg">{label}</span>
      {currentView === view && <ChevronRight className="w-5 h-5 ml-auto text-emerald-600" />}
    </button>
  );

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <Loader2 className="w-10 h-10 text-emerald-600 animate-spin" />
        <p className="mt-4 text-gray-500 font-medium">Verifica profilo...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full border border-red-100 text-center">
          <Database className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">Problema Database</h2>
          <p className="text-gray-600 text-sm mb-6">{error}</p>
          <div className="space-y-3">
            <button onClick={() => window.location.reload()} className="w-full bg-emerald-600 text-white font-bold py-3 rounded-xl shadow-md">Ricarica App</button>
            <button onClick={handleLogout} className="w-full bg-gray-100 text-gray-700 font-bold py-3 rounded-xl">Disconnetti</button>
          </div>
        </div>
      </div>
    );
  }

  if (!session) return <LoginScreen onSetupComplete={handleSetupComplete} />;
  
  if (!isAuthenticated && !isLoadingData) {
    return <LoginScreen onSetupComplete={handleSetupComplete} isSupabaseAuth={true} />;
  }

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
                  {familyProfile?.familyName || 'Spese Famiglia'}
                </h1>
             </div>
          </div>
          <button onClick={() => setCurrentView('profile')} className="bg-gray-100 p-1 rounded-full border border-gray-200">
             {session?.user?.user_metadata?.avatar_url ? (
               <img src={session.user.user_metadata.avatar_url} className="w-7 h-7 rounded-full" alt="User" />
             ) : (
               <User className="w-4 h-4 text-gray-500 m-1" />
             )}
          </button>
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
                 <button onClick={() => setIsMenuOpen(false)} className="p-2 hover:bg-gray-200 rounded-full"><X className="w-6 h-6 text-gray-500" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-1">
                 <MenuButton view="dashboard" icon={<Home />} label="Home & Aggiungi" />
                 <MenuButton view="budget" icon={<Coins />} label="Bilancio & Guadagni" />
                 <MenuButton view="history" icon={<History />} label="Storico Transazioni" />
                 <div className="my-2 border-t border-gray-100"></div>
                 <MenuButton view="profile" icon={<Users />} label="Profilo Famiglia" />
                 <MenuButton view="categories" icon={<Tag />} label="Gestisci Categorie" />
                 <button onClick={handleLogout} className="w-full flex items-center gap-4 px-5 py-4 rounded-xl text-red-600 hover:bg-red-50 mt-4 font-bold transition-colors">
                   <LogOut className="w-6 h-6" /> Esci dall'App
                 </button>
              </div>
           </div>
        </div>
      )}

      <main className="max-w-2xl mx-auto px-4 py-6">
        {isLoadingData ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mb-4" />
            <p className="text-gray-500 font-medium">Sincronizzazione dati...</p>
          </div>
        ) : (
          <div className="animate-in fade-in duration-300">
            {currentView === 'dashboard' && (
                <div className="space-y-6">
                    <ExpenseForm 
                      stores={stores} 
                      members={[]} 
                      existingProducts={[]} 
                      productHistory={{}} 
                      onAddExpense={handleAddExpense} 
                      isAnalyzing={isAIProcessing} 
                    />
                    <StoreManager onAddStore={(name) => SupabaseService.addStoreToSupabase(familyProfile!.id, {id: crypto.randomUUID(), name}).then(() => setStores(prev => [...prev, {id: crypto.randomUUID(), name}]))} />
                </div>
            )}
            {currentView === 'history' && (
              <ExpenseList 
                expenses={expenses} 
                stores={stores} 
                categories={categories} 
                onDelete={(id) => SupabaseService.deleteExpenseFromSupabase(id).then(() => setExpenses(prev => prev.filter(e => e.id !== id)))} 
                onEdit={(updated) => {
                  setExpenses(prev => prev.map(e => e.id === updated.id ? updated : e));
                }} 
              />
            )}
            {currentView === 'budget' && (
              <IncomeManager 
                incomes={incomes} 
                expenses={expenses} 
                onAddIncome={handleAddIncome} 
                onDeleteIncome={(id) => SupabaseService.deleteIncomeFromSupabase(id).then(() => setIncomes(prev => prev.filter(i => i.id !== id)))} 
              />
            )}
            {currentView === 'categories' && (
              <CategoryManager 
                categories={categories} 
                onUpdateCategories={(cats) => {setCategories(cats); SupabaseService.syncCategoriesToSupabase(familyProfile!.id, cats);}} 
              />
            )}
            {currentView === 'profile' && familyProfile && (
              <FamilyManager familyProfile={familyProfile} />
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;