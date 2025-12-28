
import React, { useState, useEffect, useMemo } from 'react';
import { 
  DEFAULT_STORES, DEFAULT_CATEGORIES, Expense, Store, FamilyProfile, 
  Income, CategoryDefinition, ShoppingItem, RecurringExpense, CustomField 
} from './types';
import * as SupabaseService from './services/supabaseService';
import { LoginScreen } from './components/LoginScreen';
import { ExpenseForm } from './components/ExpenseForm';
import { ExpenseList } from './components/ExpenseList';
import { Analytics } from './components/Analytics';
import { AIInsight } from './components/AIInsight';
import { StoreManager } from './components/StoreManager';
import { RecurringManager } from './components/RecurringManager';
import { DueExpensesAlert } from './components/DueExpensesAlert';
import { ShoppingListManager } from './components/ShoppingListManager';
import { IncomeManager } from './components/IncomeManager';
import { FamilyManager } from './components/FamilyManager';
import { OffersFinder } from './components/OffersFinder';
import { ReceiptScanner } from './components/ReceiptScanner';
import { 
  LayoutDashboard, ShoppingCart, Receipt, Repeat, BarChart3, 
  Wallet, Percent, Users, LogOut, Menu, X, Loader2 
} from 'lucide-react';

type View = 'dashboard' | 'shopping' | 'spese' | 'ricorrenti' | 'analisi' | 'bilancio' | 'offerte' | 'famiglia';

function App() {
  const [user, setUser] = useState<any>(null);
  const [familyProfile, setFamilyProfile] = useState<FamilyProfile | null>(null);
  const [activeView, setActiveView] = useState<View>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Data States
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>([]);
  const [shoppingList, setShoppingList] = useState<ShoppingItem[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [stores, setStores] = useState<Store[]>(DEFAULT_STORES);
  
  // Loading States
  const [isReady, setIsReady] = useState(false);

  // 1. Inizializzazione Sessione e Caricamento Dati
  useEffect(() => {
    const initApp = async () => {
      try {
        const currentUser = await SupabaseService.getCurrentUser();
        if (currentUser) {
          setUser(currentUser);
          const { data: memberData } = await SupabaseService.getFamilyForUser(currentUser.id);
          if (memberData?.family_id) {
            await loadFamilyData(memberData.family_id);
          }
        }
      } catch (err) {
        console.error("Errore inizializzazione:", err);
      } finally {
        setIsReady(true); // Sblocca SEMPRE l'app qui
      }
    };
    initApp();
  }, []);

  const loadFamilyData = async (familyId: string) => {
    try {
      const [profileRes, exps, recs, shops, strs, incs] = await Promise.all([
        SupabaseService.getFamilyProfile(familyId),
        SupabaseService.fetchExpenses(familyId),
        SupabaseService.fetchRecurring(familyId),
        SupabaseService.fetchShoppingList(familyId),
        SupabaseService.fetchStores(familyId),
        SupabaseService.fetchIncomes(familyId)
      ]);

      if (profileRes.data) {
        const members = await SupabaseService.fetchFamilyMembers(familyId);
        setFamilyProfile({
          id: profileRes.data.id,
          familyName: profileRes.data.family_name,
          members: members,
          createdAt: new Date(profileRes.data.created_at).getTime()
        });
        setExpenses(exps);
        setRecurringExpenses(recs);
        setShoppingList(shops);
        setIncomes(incs);
        if (strs && strs.length > 0) setStores(strs);
      }
    } catch (err) {
      console.error("Errore caricamento dati:", err);
    }
  };

  const handleSetupComplete = async (profile: FamilyProfile) => {
    if (user) {
      const { data: existingLink } = await SupabaseService.getFamilyForUser(user.id);
      if (!existingLink) {
        await SupabaseService.joinFamily(user.id, profile.id, user.email?.split('@')[0] || 'Utente', true);
      }
    }
    await loadFamilyData(profile.id);
  };

  const productHistory = useMemo(() => {
    const history: Record<string, string> = {};
    [...expenses].reverse().forEach(exp => {
      history[exp.product] = exp.store;
    });
    return history;
  }, [expenses]);

  const NavItem = ({ view, icon: Icon, label, badge }: { view: View, icon: any, label: string, badge?: number }) => (
    <button
      onClick={() => { setActiveView(view); setIsSidebarOpen(false); }}
      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${
        activeView === view ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200' : 'text-gray-500 hover:bg-emerald-50 hover:text-emerald-600'
      }`}
    >
      <div className="flex items-center gap-3">
        <Icon className="w-5 h-5" />
        <span className="font-bold text-sm">{label}</span>
      </div>
      {badge !== undefined && badge > 0 && (
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${activeView === view ? 'bg-white text-emerald-600' : 'bg-emerald-600 text-white'}`}>
          {badge}
        </span>
      )}
    </button>
  );

  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-emerald-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-500 font-bold tracking-tight">Sincronizzazione Account...</p>
        </div>
      </div>
    );
  }

  if (!user || !familyProfile) {
    return <LoginScreen 
      onSetupComplete={handleSetupComplete} 
      onUserLogin={(u) => { setUser(u); window.location.reload(); }} // Ricarichiamo per attivare l'init pulito
      isSupabaseAuth={!!user} 
    />;
  }

  const renderView = () => {
    switch (activeView) {
      case 'dashboard':
        return (
          <div className="space-y-6 animate-in fade-in duration-300">
            <ReceiptScanner onScanComplete={async (data) => {
              for (const item of data.items) {
                const newExp: Expense = {
                  id: crypto.randomUUID(),
                  product: item.product, quantity: item.quantity, unitPrice: item.unitPrice, total: item.total,
                  store: data.store || 'Negozio', date: new Date().toISOString(), category: item.category || 'Altro'
                };
                setExpenses(prev => [newExp, ...prev]);
                await SupabaseService.addExpenseToSupabase(familyProfile.id, newExp);
              }
            }} />
            <DueExpensesAlert 
              dueExpenses={recurringExpenses.filter(r => new Date(r.nextDueDate) <= new Date())} 
              onProcessExpense={() => setActiveView('ricorrenti')} 
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                  <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5 text-orange-500" /> Da comprare oggi
                  </h3>
                  {shoppingList.filter(i => !i.completed).length > 0 ? (
                    <div className="space-y-2">
                      {shoppingList.filter(i => !i.completed).slice(0, 3).map(item => (
                        <div key={item.id} className="flex items-center gap-3 text-sm text-gray-600 bg-gray-50 p-3 rounded-xl border border-gray-100">
                           <div className="w-2 h-2 rounded-full bg-orange-400" />
                           {item.product} <span className="text-[10px] text-gray-400 uppercase font-bold ml-auto">{item.store}</span>
                        </div>
                      ))}
                      <button onClick={() => setActiveView('shopping')} className="w-full py-2 text-xs font-bold text-emerald-600 hover:underline">Vedi tutta la lista</button>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 italic">Lista spesa vuota.</p>
                  )}
               </div>
               <AIInsight expenses={expenses} />
            </div>
          </div>
        );
      case 'shopping':
        return (
          <ShoppingListManager 
            items={shoppingList} stores={stores} productHistory={productHistory}
            onAddItem={async (p, s) => {
              const newItem = { id: crypto.randomUUID(), product: p, store: s, completed: false };
              setShoppingList(prev => [...prev, newItem]);
              await SupabaseService.addShoppingItemToSupabase(familyProfile.id, newItem);
            }}
            onToggleItem={async (id) => {
              const item = shoppingList.find(i => i.id === id);
              if (item) {
                const updated = { ...item, completed: !item.completed };
                setShoppingList(prev => prev.map(i => i.id === id ? updated : i));
                await SupabaseService.updateShoppingItemInSupabase(updated);
              }
            }}
            onDeleteItem={async (id) => {
              setShoppingList(prev => prev.filter(i => i.id !== id));
              await SupabaseService.deleteShoppingItemFromSupabase(id);
            }}
          />
        );
      case 'spese':
        return (
          <div className="space-y-6">
            <ExpenseForm 
              stores={stores} members={familyProfile.members} 
              existingProducts={Object.keys(productHistory)} productHistory={productHistory} 
              onAddExpense={async (p, q, u, t, s) => {
                const newExp: Expense = {
                  id: crypto.randomUUID(), product: p, quantity: q, unitPrice: u, total: t, store: s,
                  date: new Date().toISOString(), category: 'Altro'
                };
                setExpenses(prev => [newExp, ...prev]);
                await SupabaseService.addExpenseToSupabase(familyProfile.id, newExp);
              }} 
              isAnalyzing={false}
            />
            <ExpenseList 
              expenses={expenses} stores={stores} 
              onDelete={async (id) => {
                setExpenses(prev => prev.filter(e => e.id !== id));
                await SupabaseService.deleteExpenseFromSupabase(id);
              }} 
              onEdit={async (updated) => {
                setExpenses(prev => prev.map(e => e.id === updated.id ? updated : e));
              }} 
            />
          </div>
        );
      case 'bilancio':
        return (
          <IncomeManager 
            incomes={incomes} expenses={expenses} 
            onAddIncome={async (s, a, d) => {
              const newInc = { id: crypto.randomUUID(), source: s, amount: a, date: d };
              setIncomes(prev => [...prev, newInc]);
              await SupabaseService.addIncomeToSupabase(familyProfile.id, newInc);
            }}
            onDeleteIncome={async (id) => {
              setIncomes(prev => prev.filter(i => i.id !== id));
              await SupabaseService.deleteIncomeFromSupabase(id);
            }}
          />
        );
      case 'ricorrenti':
        return (
          <RecurringManager 
            recurringExpenses={recurringExpenses} stores={stores}
            onAddRecurring={async (p, a, s, f, d, r, c) => {
              const newItem = { id: crypto.randomUUID(), product: p, amount: a, store: s, frequency: f, nextDueDate: d, reminderDays: r, customFields: c };
              setRecurringExpenses(prev => [...prev, newItem]);
              await SupabaseService.addRecurringToSupabase(familyProfile.id, newItem);
            }}
            onUpdateRecurring={async (updated) => {
              setRecurringExpenses(prev => prev.map(r => r.id === updated.id ? updated : r));
              await SupabaseService.updateRecurringInSupabase(updated);
            }}
            onDeleteRecurring={async (id) => {
              setRecurringExpenses(prev => prev.filter(r => r.id !== id));
              await SupabaseService.deleteRecurringFromSupabase(id);
            }}
          />
        );
      case 'analisi':
        return <Analytics expenses={expenses} />;
      case 'offerte':
        return <OffersFinder stores={stores} savedCity="" savedStores={[]} notificationsEnabled={false} onPreferencesChange={() => {}} />;
      case 'famiglia':
        return (
          <div className="space-y-6">
            <FamilyManager familyProfile={familyProfile} />
            <StoreManager onAddStore={async (name) => {
              const newStore = { id: crypto.randomUUID(), name };
              setStores(prev => [...prev, newStore]);
              await SupabaseService.addStoreToSupabase(familyProfile.id, newStore);
            }} />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      <header className="md:hidden bg-emerald-600 text-white p-4 flex justify-between items-center sticky top-0 z-40 shadow-md">
        <div className="flex items-center gap-2">
           <div className="bg-white/20 p-2 rounded-lg"><LayoutDashboard className="w-5 h-5" /></div>
           <h1 className="font-black tracking-tight">{familyProfile.familyName}</h1>
        </div>
        <button onClick={() => setIsSidebarOpen(true)} className="p-2 bg-emerald-700 rounded-xl"><Menu className="w-6 h-6" /></button>
      </header>

      <aside className={`fixed inset-0 z-50 md:relative md:flex md:w-72 bg-white border-r border-gray-100 flex-col shadow-2xl md:shadow-none transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="p-6 flex justify-between items-center border-b border-gray-50">
          <div className="flex items-center gap-3">
             <div className="bg-emerald-600 p-2.5 rounded-2xl shadow-lg shadow-emerald-100 text-white"><LayoutDashboard className="w-6 h-6" /></div>
             <div>
               <h1 className="font-black text-gray-800 tracking-tighter">{familyProfile.familyName}</h1>
               <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{user?.email?.split('@')[0] || 'Utente'}</p>
             </div>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-2 text-gray-400"><X className="w-6 h-6" /></button>
        </div>
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          <NavItem view="dashboard" icon={LayoutDashboard} label="Dashboard" />
          <NavItem view="bilancio" icon={Wallet} label="Bilancio" />
          <NavItem view="spese" icon={Receipt} label="Storico & Spese" />
          <NavItem view="shopping" icon={ShoppingCart} label="Lista Spesa" badge={shoppingList.filter(i => !i.completed).length} />
          <NavItem view="ricorrenti" icon={Repeat} label="Scadenze" badge={recurringExpenses.filter(r => new Date(r.nextDueDate) <= new Date()).length} />
          <NavItem view="analisi" icon={BarChart3} label="Analisi & Report" />
          <NavItem view="offerte" icon={Percent} label="Caccia Offerte" />
          <NavItem view="famiglia" icon={Users} label="Famiglia & Negozi" />
        </nav>
        <div className="p-4 border-t border-gray-50 space-y-2">
          <button onClick={async () => { await SupabaseService.signOut(); window.location.reload(); }} className="w-full flex items-center gap-3 px-4 py-3 text-red-500 font-bold text-sm hover:bg-red-50 rounded-xl transition-colors">
            <LogOut className="w-5 h-5" /> Esci dall'App
          </button>
        </div>
      </aside>

      <main className="flex-1 p-4 md:p-8 max-w-5xl mx-auto w-full pb-24 md:pb-8">
        {renderView()}
      </main>

      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex justify-around items-center p-3 z-40 pb-6 safe-area-bottom shadow-[0_-5px_15px_rgba(0,0,0,0.05)]">
         <button onClick={() => setActiveView('dashboard')} className={`p-3 rounded-2xl transition-all ${activeView === 'dashboard' ? 'bg-emerald-600 text-white' : 'text-gray-400'}`}><LayoutDashboard className="w-6 h-6" /></button>
         <button onClick={() => setActiveView('spese')} className={`p-3 rounded-2xl transition-all ${activeView === 'spese' ? 'bg-emerald-600 text-white' : 'text-gray-400'}`}><Receipt className="w-6 h-6" /></button>
         <button onClick={() => setActiveView('shopping')} className={`relative p-3 rounded-2xl transition-all ${activeView === 'shopping' ? 'bg-emerald-600 text-white' : 'text-gray-400'}`}><ShoppingCart className="w-6 h-6" />{shoppingList.filter(i => !i.completed).length > 0 && <span className="absolute top-2 right-2 w-4 h-4 bg-orange-500 text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-white">{shoppingList.filter(i => !i.completed).length}</span>}</button>
         <button onClick={() => setActiveView('bilancio')} className={`p-3 rounded-2xl transition-all ${activeView === 'bilancio' ? 'bg-emerald-600 text-white' : 'text-gray-400'}`}><Wallet className="w-6 h-6" /></button>
         <button onClick={() => setActiveView('ricorrenti')} className={`p-3 rounded-2xl transition-all ${activeView === 'ricorrenti' ? 'bg-emerald-600 text-white' : 'text-gray-400'}`}><Repeat className="w-6 h-6" /></button>
      </div>
      {isSidebarOpen && <div onClick={() => setIsSidebarOpen(false)} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 md:hidden animate-in fade-in duration-300" />}
    </div>
  );
}

export default App;
