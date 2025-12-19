import React, { useState, useEffect, useMemo } from 'react';
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
  WalletCards, LogOut, Menu, X, Home, History, BarChart3, ChevronRight, Coins, Tag, Cloud, User, Loader2, Users
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
    try {
      const membership = await SupabaseService.getFamilyForUser(userId);
      if (membership) {
        const profile = await SupabaseService.getFamilyProfile(membership.familyId);
        if (profile) {
          setFamilyProfile(profile);
          setIsAuthenticated(true);
        }
      }
    } catch (e) {
      console.error("Errore database:", e);
      setError("Il database non è pronto. Assicurati di aver creato le tabelle su Supabase.");
    } finally {
      setIsLoadingAuth(false);
      setIsLoadingData(false);
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
          setExpenses(exp);
          setIncomes(inc);
          if (sto.length > 0) setStores(sto);
          if (cat.length > 0) setCategories(cat);
        } catch (e) { console.error("Errore caricamento dati:", e); }
        setIsLoadingData(false);
      };
      loadAllData();
    }
  }, [isAuthenticated, familyProfile?.id]);

  const handleSetupComplete = async (profile: FamilyProfile) => {
    if (!session?.user) return;
    try {
      setIsLoadingData(true);
      const existing = await SupabaseService.getFamilyProfile(profile.id);
      if (!existing) await SupabaseService.createFamilyProfile(profile);
      await SupabaseService.joinFamily(session.user.id, profile.id, session.user.user_metadata.full_name || 'Membro', !existing);
      setFamilyProfile(profile);
      setIsAuthenticated(true);
    } catch (e) {
      alert("Errore durante la creazione della famiglia. Verifica di aver creato le tabelle SQL su Supabase.");
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

  // Fix: Added handleAddIncome function to resolve the 'Cannot find name' error and handle adding new income records.
  const handleAddIncome = async (source: string, amount: number, date: string) => {
    if (!familyProfile) return;
    const newIncome: Income = { id: crypto.randomUUID(), source, amount, date };
    setIncomes(prev => [newIncome, ...prev]);
    await SupabaseService.addIncomeToSupabase(familyProfile.id, newIncome);
  };

  const MenuButton = ({ view, icon, label }: { view: View, icon: any, label: string }) => (
    <button onClick={() => { setCurrentView(view); setIsMenuOpen(false); }} className={`w-full flex items-center gap-4 px-5 py-4 rounded-xl transition-colors ${currentView === view ? 'bg-emerald-100 text-emerald-800 font-bold' : 'text-gray-700 hover:bg-gray-100'}`}>
      {React.cloneElement(icon, { className: 'w-6 h-6' })}
      <span className="text-lg">{label}</span>
      {currentView === view && <ChevronRight className="w-5 h-5 ml-auto text-emerald-600" />}
    </button>
  );

  if (isLoadingAuth) return <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50"><Loader2 className="w-10 h-10 text-emerald-600 animate-spin" /><p className="mt-4 text-gray-500 font-medium">Caricamento sessione...</p></div>;
  if (error) return <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center"><div className="bg-red-50 p-6 rounded-2xl border border-red-200"><h2 className="text-red-700 font-bold text-xl mb-2">Errore Configurazione</h2><p className="text-red-600 mb-4">{error}</p><button onClick={() => window.location.reload()} className="bg-red-600 text-white px-6 py-2 rounded-xl">Riprova</button></div></div>;
  if (!session) return <LoginScreen onSetupComplete={handleSetupComplete} />;
  if (!isAuthenticated) return <LoginScreen onSetupComplete={handleSetupComplete} isSupabaseAuth={true} />;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans pb-24 safe-area-top">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 h-18 flex items-center justify-between py-3">
          <div className="flex items-center gap-3">
             <button onClick={() => setIsMenuOpen(true)} className="p-3 -ml-2 text-gray-700 hover:bg-gray-100 rounded-xl relative">
                <Menu className="w-7 h-7" />
             </button>
             <div className="flex items-center gap-3 cursor-pointer" onClick={() => setCurrentView('dashboard')}>
                <div className="bg-emerald-100 p-2 rounded-xl"><WalletCards className="w-6 h-6 text-emerald-600" /></div>
                <h1 className="font-bold text-lg text-gray-800 truncate">Spese {familyProfile?.familyName}</h1>
             </div>
          </div>
          <button onClick={() => setCurrentView('profile')} className="bg-gray-100 p-1.5 rounded-full hover:bg-emerald-50">
             {session.user.user_metadata.avatar_url ? <img src={session.user.user_metadata.avatar_url} className="w-8 h-8 rounded-full" alt="User" /> : <User className="w-5 h-5 text-gray-500 m-1" />}
          </button>
        </div>
      </header>

      {isMenuOpen && (
        <div className="fixed inset-0 z-50 flex">
           <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsMenuOpen(false)}></div>
           <div className="relative w-[85%] max-w-xs bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-left duration-200">
              <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                 <div><h2 className="font-bold text-xl text-gray-800">Menù</h2><span className="text-xs text-emerald-600 font-medium flex items-center gap-1 mt-1"><Cloud className="w-3 h-3" /> Cloud Sync Attivo</span></div>
                 <button onClick={() => setIsMenuOpen(false)} className="p-3 hover:bg-gray-200 rounded-full"><X className="w-6 h-6 text-gray-500" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                 <MenuButton view="dashboard" icon={<Home />} label="Home & Aggiungi" />
                 <MenuButton view="budget" icon={<Coins />} label="Bilancio & Guadagni" />
                 <MenuButton view="history" icon={<History />} label="Storico Transazioni" />
                 <div className="my-2 border-t border-gray-100"></div>
                 <MenuButton view="profile" icon={<Users />} label="Profilo Famiglia" />
                 <MenuButton view="categories" icon={<Tag />} label="Gestisci Categorie" />
                 <button onClick={handleLogout} className="w-full flex items-center gap-4 px-5 py-4 rounded-xl text-red-600 hover:bg-red-50 mt-4 font-bold"><LogOut className="w-6 h-6" /> Esci</button>
              </div>
           </div>
        </div>
      )}

      <main className="max-w-2xl mx-auto px-4 py-6">
        {isLoadingData ? (
          <div className="flex flex-col items-center justify-center py-20"><Loader2 className="w-12 h-12 text-emerald-500 animate-spin mb-4" /><p className="text-gray-500 font-medium">Sincronizzazione Cloud...</p></div>
        ) : (
          <>
            {currentView === 'dashboard' && (
                <div className="space-y-6 animate-in fade-in">
                    <ExpenseForm stores={stores} members={[]} existingProducts={[]} productHistory={{}} onAddExpense={handleAddExpense} isAnalyzing={isAIProcessing} />
                    <StoreManager onAddStore={(name) => SupabaseService.addStoreToSupabase(familyProfile!.id, {id: crypto.randomUUID(), name})} />
                </div>
            )}
            {currentView === 'history' && <ExpenseList expenses={expenses} stores={stores} categories={categories} onDelete={(id) => SupabaseService.deleteExpenseFromSupabase(id).then(() => setExpenses(prev => prev.filter(e => e.id !== id)))} onEdit={() => {}} />}
            {currentView === 'budget' && <IncomeManager incomes={incomes} expenses={expenses} onAddIncome={handleAddIncome} onDeleteIncome={(id) => SupabaseService.deleteIncomeFromSupabase(id).then(() => setIncomes(prev => prev.filter(i => i.id !== id)))} />}
            {currentView === 'categories' && <CategoryManager categories={categories} onUpdateCategories={(cats) => {setCategories(cats); SupabaseService.syncCategoriesToSupabase(familyProfile!.id, cats);}} />}
            {currentView === 'profile' && familyProfile && <FamilyManager familyProfile={familyProfile} />}
          </>
        )}
      </main>
    </div>
  );
}

export default App;