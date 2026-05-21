
import React, { useState, useEffect, useMemo } from 'react';
import { 
  DEFAULT_STORES, DEFAULT_CATEGORIES, Expense, Store, FamilyProfile, 
  Income, CategoryDefinition, ShoppingItem, RecurringExpense, CustomField 
} from './types';
import * as SupabaseService from './services/supabaseService';
import { supabase } from './supabaseClient';
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
  
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>([]);
  const [shoppingList, setShoppingList] = useState<ShoppingItem[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [stores, setStores] = useState<Store[]>(DEFAULT_STORES);
  
  const [offerPreferences, setOfferPreferences] = useState({
    city: '',
    selectedStores: [] as string[],
    notificationsEnabled: false,
  });

  const [isReady, setIsReady] = useState(false);
  const [isLocalMode, setIsLocalMode] = useState<boolean>(() => localStorage.getItem('familyApp_isLocalMode') === 'true');
  const [connectionError, setConnectionError] = useState(false);
  const [showOfflineFallback, setShowOfflineFallback] = useState(false);

  useEffect(() => {
    if (!isReady) {
      const timer = setTimeout(() => {
        setShowOfflineFallback(true);
      }, 15000);
      return () => clearTimeout(timer);
    } else {
      setShowOfflineFallback(false);
    }
  }, [isReady]);

  useEffect(() => {
    try {
      const savedPrefs = localStorage.getItem('familyAppOfferPreferences');
      if (savedPrefs) {
        setOfferPreferences(JSON.parse(savedPrefs));
      }
    } catch(e) {
      console.error("Failed to load offer preferences", e);
    }
  }, []);

  const loadLocalData = () => {
    try {
      const localExps = localStorage.getItem('familyApp_expenses');
      const localRecs = localStorage.getItem('familyApp_recurringExpenses');
      const localShops = localStorage.getItem('familyApp_shoppingList');
      const localIncs = localStorage.getItem('familyApp_incomes');
      const localStrs = localStorage.getItem('familyApp_stores');
      const localProfile = localStorage.getItem('familyApp_familyProfile');
      
      setExpenses(localExps ? JSON.parse(localExps) : []);
      setRecurringExpenses(localRecs ? JSON.parse(localRecs) : []);
      setShoppingList(localShops ? JSON.parse(localShops) : []);
      setIncomes(localIncs ? JSON.parse(localIncs) : []);
      if (localStrs) {
        setStores(JSON.parse(localStrs));
      } else {
        setStores(DEFAULT_STORES);
      }

      const defaultProfile: FamilyProfile = {
        id: 'local-family-id',
        familyName: 'Offline (Locale)',
        members: [
          { id: '1', name: 'Utente Locale', color: 'bg-emerald-500', isAdmin: true, userId: 'local-user' }
        ],
        createdAt: Date.now()
      };
      setFamilyProfile(localProfile ? JSON.parse(localProfile) : defaultProfile);
      setUser({ id: 'local-user', email: 'locale@dispositivo', isLocal: true });
    } catch (e) {
      console.error("Errore nel caricamento dei dati locali:", e);
    }
  };

  const enableLocalMode = () => {
    localStorage.setItem('familyApp_isLocalMode', 'true');
    setIsLocalMode(true);
    
    if (!localStorage.getItem('familyApp_familyProfile')) {
      const defaultProfile: FamilyProfile = {
        id: 'local-family-id',
        familyName: 'Offline (Locale)',
        members: [
          { id: '1', name: 'Utente Locale', color: 'bg-emerald-500', isAdmin: true, userId: 'local-user' }
        ],
        createdAt: Date.now()
      };
      localStorage.setItem('familyApp_familyProfile', JSON.stringify(defaultProfile));
    }
    
    loadLocalData();
  };

  const disableLocalMode = () => {
    localStorage.removeItem('familyApp_isLocalMode');
    setIsLocalMode(false);
    setUser(null);
    setFamilyProfile(null);
    setExpenses([]);
    setRecurringExpenses([]);
    setShoppingList([]);
    setIncomes([]);
    setStores(DEFAULT_STORES);
  };

  // Persistenza LocalStorage in Modalità Locale
  useEffect(() => {
    if (isLocalMode) {
      localStorage.setItem('familyApp_expenses', JSON.stringify(expenses));
      localStorage.setItem('familyApp_recurringExpenses', JSON.stringify(recurringExpenses));
      localStorage.setItem('familyApp_shoppingList', JSON.stringify(shoppingList));
      localStorage.setItem('familyApp_incomes', JSON.stringify(incomes));
      localStorage.setItem('familyApp_stores', JSON.stringify(stores));
    }
  }, [isLocalMode, expenses, recurringExpenses, shoppingList, incomes, stores]);

  // Inizializzazione Sessione e Listener Auth o LocalMode
  useEffect(() => {
    const handleAuthChange = async (session: any) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        try {
          const fetchPromise = SupabaseService.getFamilyForUser(currentUser.id);
          const timeoutPromise = new Promise<any>((_, reject) => setTimeout(() => reject(new Error("Timeout")), 20000));
          const { data: memberData } = await Promise.race([fetchPromise, timeoutPromise]);
          if (memberData?.family_id) {
            await loadFamilyData(memberData.family_id);
          } else {
            setFamilyProfile(null);
          }
        } catch (err) {
          console.error("Errore nel caricamento dati famiglia:", err);
          setFamilyProfile(null);
          setConnectionError(true);
        }
      } else {
        setFamilyProfile(null);
      }
      setIsReady(true);
    };

    const initAuth = async () => {
      setIsReady(false);
      
      const isLocalModeSaved = localStorage.getItem('familyApp_isLocalMode') === 'true';
      if (isLocalModeSaved) {
        setIsLocalMode(true);
        loadLocalData();
        setIsReady(true);
        // Ritorniamo un mock unsubscribe
        return { subscription: { unsubscribe: () => {} } };
      }

      try {
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise<any>((_, reject) => setTimeout(() => reject(new Error("Timeout")), 3000));
        const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise]);
        await handleAuthChange(session);
      } catch (err: any) {
        console.error("Errore durante getSession:", err);
        setConnectionError(true);
        setIsReady(true);
      }

      const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
        if (localStorage.getItem('familyApp_isLocalMode') !== 'true') {
          await handleAuthChange(session);
        }
      });

      return authListener;
    };

    const authInit = initAuth();

    return () => {
      authInit.then(res => res?.subscription.unsubscribe());
    };
  }, []);

  const loadFamilyData = async (familyId: string) => {
    try {
      const fetchPromise = Promise.all([
        SupabaseService.getFamilyProfile(familyId),
        SupabaseService.fetchExpenses(familyId),
        SupabaseService.fetchRecurring(familyId),
        SupabaseService.fetchShoppingList(familyId),
        SupabaseService.fetchStores(familyId),
        SupabaseService.fetchIncomes(familyId)
      ]);
      const timeoutPromise = new Promise<any>((_, reject) => setTimeout(() => reject(new Error("Timeout")), 25000));
      
      const [profileRes, exps, recs, shops, strs, incs] = await Promise.race([fetchPromise, timeoutPromise]);

      if (profileRes?.error) {
        throw profileRes.error;
      }

      if (profileRes?.data) {
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
      } else {
        setFamilyProfile(null);
      }
    } catch (err) {
      console.error("Errore caricamento dati:", err);
      setConnectionError(true);
    }
  };

  const handleSetupComplete = async (profile: FamilyProfile) => {
    await loadFamilyData(profile.id);
  };

  const handlePreferencesChange = (city: string, selectedStores: string[], notificationsEnabled: boolean) => {
    const newPrefs = { city, selectedStores, notificationsEnabled };
    setOfferPreferences(newPrefs);
    try {
      localStorage.setItem('familyAppOfferPreferences', JSON.stringify(newPrefs));
    } catch(e) {
      console.error("Failed to save offer preferences", e);
    }
  };
  
  const handleProcessRecurringExpense = async (recurringItem: RecurringExpense) => {
     if (!familyProfile) return;
 
     // Save state for potential rollback
     const originalExpenses = [...expenses];
     const originalRecurringExpenses = [...recurringExpenses];
 
     // 1. Optimistic UI Update: Create a new expense and update the recurring item
     const currentMember = familyProfile.members.find(m => m.userId === user.id);
     const memberId = currentMember?.id;

     const newExpense: Expense = {
       id: crypto.randomUUID(),
       product: `Pagamento: ${recurringItem.product}`,
       quantity: 1,
       unitPrice: recurringItem.amount,
       total: recurringItem.amount,
       store: recurringItem.store,
       date: new Date().toISOString(),
       category: 'Utenze', // Default category
       memberId: memberId
     };
 
     const currentDueDate = new Date(recurringItem.nextDueDate);
     let newDueDate = new Date(currentDueDate);
     const today = new Date();
     if (newDueDate < today) newDueDate = today;
 
     if (recurringItem.frequency === 'mensile') newDueDate.setMonth(newDueDate.getMonth() + 1);
     else if (recurringItem.frequency === 'settimanale') newDueDate.setDate(newDueDate.getDate() + 7);
     else if (recurringItem.frequency === 'annuale') newDueDate.setFullYear(newDueDate.getFullYear() + 1);
 
     const updatedRecurringItem = { ...recurringItem, nextDueDate: newDueDate.toISOString().split('T')[0] };
 
     setExpenses(prev => [newExpense, ...prev]);
     setRecurringExpenses(prev => prev.map(r => r.id === updatedRecurringItem.id ? updatedRecurringItem : r));

     if (isLocalMode) return;
 
     try {
       // 2. Perform backend operations
       await SupabaseService.addExpenseToSupabase(familyProfile.id, newExpense);
       await SupabaseService.updateRecurringInSupabase(updatedRecurringItem);
     } catch (error: any) {
       // 3. Rollback UI on failure
       console.error("Errore durante il processamento della spesa ricorrente:", error);
       alert("Errore: " + (error.message || "Impossibile registrare il pagamento."));
       setExpenses(originalExpenses);
       setRecurringExpenses(originalRecurringExpenses);
     }
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center max-w-sm w-full bg-white p-8 rounded-3xl border border-gray-100 shadow-xl">
          <Loader2 className="w-12 h-12 text-emerald-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-800 font-bold tracking-tight text-lg mb-1">Inizializzazione...</p>
          <p className="text-gray-400 text-xs mb-6">Verifica della sessione e connessione al cloud</p>
          
          {showOfflineFallback && (
            <div className="pt-5 border-t border-gray-100 animate-in fade-in duration-500">
              <p className="text-amber-600 font-bold text-xs mb-4">La connessione sta impiegando più tempo del previsto.</p>
              <button 
                onClick={enableLocalMode}
                className="w-full bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/50 py-3.5 rounded-2xl font-bold text-xs uppercase tracking-tight transition-all"
              >
                Usa la Modalità Locale (Offline)
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Se non c'è utente o se l'utente è loggato ma non ha ancora un profilo famiglia
  if (!user || !familyProfile) {
    return <LoginScreen 
      user={user}
      onSetupComplete={handleSetupComplete} 
      onUserLogin={(u) => { 
        setUser(u);
        SupabaseService.getFamilyForUser(u.id).then(({data}) => {
          if (data?.family_id) loadFamilyData(data.family_id);
        }).catch(err => {
          console.error("Errore check famiglia:", err);
          setConnectionError(true);
        });
      }} 
      isSupabaseAuth={!!user} 
      onEnterLocalMode={enableLocalMode}
      connectionError={connectionError}
    />;
  }

  const renderView = () => {
    switch (activeView) {
      case 'dashboard':
        return (
          <div className="space-y-6 animate-in fade-in duration-300">
            <ReceiptScanner onScanComplete={async (data) => {
              const currentMember = familyProfile.members.find(m => m.userId === user.id);
              const memberId = currentMember?.id;
              
              // Base date for all items in the receipt
              const baseDate = data.date ? new Date(data.date) : new Date();
              
              // Create unique expenses for each item
              const newExpenses: Expense[] = data.items.map((item, index) => {
                // Add index milliseconds to ensure unique timestamps for items from the same receipt
                const itemDate = new Date(baseDate.getTime() + index);
                
                return {
                  id: crypto.randomUUID(),
                  product: item.product,
                  quantity: item.quantity,
                  unitPrice: item.unitPrice,
                  total: item.total,
                  store: data.store || 'Negozio',
                  date: itemDate.toISOString(),
                  category: item.category || 'Altro',
                  memberId: memberId
                };
              });

              console.log(`Aggiunta di ${newExpenses.length} spese dalla scansione...`);
              setExpenses(prev => [...newExpenses, ...prev]);

              if (isLocalMode) return;

              try {
                // Salva tutte le spese in un'unica operazione bulk per maggiore affidabilità
                await SupabaseService.addExpensesToSupabase(familyProfile.id, newExpenses);
                console.log("Salvataggio bulk completato con successo.");
              } catch (e: any) {
                console.error("Errore durante il salvataggio delle spese scansionate:", e);
                alert("Errore nel salvataggio di alcune spese: " + (e.message || "Errore sconosciuto"));
                // In caso di errore critico, ricarichiamo i dati per essere sicuri della consistenza
                await loadFamilyData(familyProfile.id);
              }
            }} />
            <DueExpensesAlert 
              dueExpenses={recurringExpenses.filter(r => new Date(r.nextDueDate) <= new Date())} 
              onProcessExpense={handleProcessRecurringExpense}
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
              if (isLocalMode) return;
              try {
                await SupabaseService.addShoppingItemToSupabase(familyProfile.id, newItem);
              } catch (e) {
                console.error(e);
              }
            }}
            onToggleItem={async (id) => {
              const item = shoppingList.find(i => i.id === id);
              if (item) {
                const updated = { ...item, completed: !item.completed };
                setShoppingList(prev => prev.map(i => i.id === id ? updated : i));
                if (isLocalMode) return;
                try {
                  await SupabaseService.updateShoppingItemInSupabase(updated);
                } catch (e) {
                  console.error(e);
                }
              }
            }}
            onDeleteItem={async (id) => {
              setShoppingList(prev => prev.filter(i => i.id !== id));
              if (isLocalMode) return;
              try {
                await SupabaseService.deleteShoppingItemFromSupabase(id);
              } catch (e) {
                console.error(e);
              }
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
                const currentMember = familyProfile.members.find(m => m.userId === user.id);
                const memberId = currentMember?.id;
                
                const newExp: Expense = {
                  id: crypto.randomUUID(), product: p, quantity: q, unitPrice: u, total: t, store: s,
                  date: new Date().toISOString(), category: 'Altro', memberId: memberId
                };
                setExpenses(prev => [newExp, ...prev]);
                if (isLocalMode) return;
                try {
                  await SupabaseService.addExpenseToSupabase(familyProfile.id, newExp);
                } catch (e: any) {
                  alert("Errore salvataggio spesa: " + e.message);
                  setExpenses(prev => prev.filter(exp => exp.id !== newExp.id));
                }
              }} 
              isAnalyzing={false}
            />
            <ExpenseList 
              expenses={expenses} stores={stores} 
              onDelete={async (id) => {
                setExpenses(prev => prev.filter(e => e.id !== id));
                if (isLocalMode) return;
                try {
                  await SupabaseService.deleteExpenseFromSupabase(id);
                } catch (e) {
                  console.error(e);
                }
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
              if (isLocalMode) return;
              try {
                await SupabaseService.addIncomeToSupabase(familyProfile.id, newInc);
              } catch (e) {
                console.error(e);
              }
            }}
            onDeleteIncome={async (id) => {
              setIncomes(prev => prev.filter(i => i.id !== id));
              if (isLocalMode) return;
              try {
                await SupabaseService.deleteIncomeFromSupabase(id);
              } catch (e) {
                console.error(e);
              }
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
              if (isLocalMode) return;
              try {
                await SupabaseService.addRecurringToSupabase(familyProfile.id, newItem);
              } catch (error: any) {
                console.error("Errore salvataggio ricorrente:", error);
                alert(`ERRORE SUPABASE: ${error.message || "Errore sconosciuto"}`);
                setRecurringExpenses(prev => prev.filter(item => item.id !== newItem.id));
              }
            }}            
            onUpdateRecurring={async (updatedItem) => {
                const originalItem = recurringExpenses.find(item => item.id === updatedItem.id);
                setRecurringExpenses(prev => prev.map(item => item.id === updatedItem.id ? updatedItem : item));
                if (isLocalMode) return;
                try {
                    await SupabaseService.updateRecurringInSupabase(updatedItem);
                } catch(error: any) {
                    if (originalItem) {
                        setRecurringExpenses(prev => prev.map(item => item.id === originalItem.id ? originalItem : item));
                    }
                    const errorMessage = error?.message || 'Si è verificato un errore sconosciuto durante l\'aggiornamento.';
                    alert("Errore aggiornamento: " + errorMessage);
                }
            }}
            onDeleteRecurring={async (id) => {
              const itemToDelete = recurringExpenses.find(r => r.id === id);
              if (!itemToDelete) return;
              setRecurringExpenses(prev => prev.filter(r => r.id !== id));
              if (isLocalMode) return;
              try {
                await SupabaseService.deleteRecurringFromSupabase(id);
              } catch(error: any) {
                console.error(error);
                alert("Errore eliminazione: " + error.message);
                setRecurringExpenses(prev => [...prev, itemToDelete]);
              }
            }}
          />
        );
      case 'analisi':
        return <Analytics expenses={expenses} />;
      case 'offerte':
        return <OffersFinder 
          stores={stores} 
          savedCity={offerPreferences.city} 
          savedStores={offerPreferences.selectedStores} 
          notificationsEnabled={offerPreferences.notificationsEnabled} 
          onPreferencesChange={handlePreferencesChange} 
        />;
      case 'famiglia':
        return (
          <div className="space-y-6">
            <FamilyManager familyProfile={familyProfile} />
            <StoreManager onAddStore={async (name) => {
              const newStore = { id: crypto.randomUUID(), name };
              setStores(prev => [...prev, newStore]);
              if (isLocalMode) return;
              try {
                await SupabaseService.addStoreToSupabase(familyProfile.id, newStore);
              } catch (e) {
                console.error(e);
              }
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
           <h1 className="font-black tracking-tight">{familyProfile?.familyName || 'App Spese'}</h1>
        </div>
        <button onClick={() => setIsSidebarOpen(true)} className="p-2 bg-emerald-700 rounded-xl"><Menu className="w-6 h-6" /></button>
      </header>

      <aside className={`fixed inset-0 z-50 md:relative md:flex md:w-72 bg-white border-r border-gray-100 flex-col shadow-2xl md:shadow-none transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="p-6 flex justify-between items-center border-b border-gray-50">
          <div className="flex items-center gap-3">
             <div className="bg-emerald-600 p-2.5 rounded-2xl shadow-lg shadow-emerald-100 text-white"><LayoutDashboard className="w-6 h-6" /></div>
             <div>
               <h1 className="font-black text-gray-800 tracking-tighter">{familyProfile?.familyName || 'App Spese'}</h1>
               <div className="flex flex-col gap-0.5 mt-0.5">
                 <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-none">{user?.email?.split('@')[0] || 'Utente'}</span>
                 {isLocalMode ? (
                   <span className="inline-flex items-center self-start text-[8px] font-black tracking-tight text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/50 mt-1 uppercase leading-none">
                     ● Locale (No Cloud)
                   </span>
                 ) : (
                   <span className="inline-flex items-center self-start text-[8px] font-black tracking-tight text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/50 mt-1 uppercase leading-none">
                     ● Cloud Attivo
                   </span>
                 )}
               </div>
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
          <button 
            onClick={async () => { 
              if (isLocalMode) {
                disableLocalMode();
              } else {
                await SupabaseService.signOut(); 
                window.location.reload(); 
              }
            }} 
            className="w-full flex items-center gap-3 px-4 py-3 text-red-500 font-bold text-sm hover:bg-red-50 rounded-xl transition-colors"
          >
            <LogOut className="w-5 h-5" /> {isLocalMode ? "Esci (Modalità Locale)" : "Esci dall'App"}
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
