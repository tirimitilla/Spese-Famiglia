
import React, { useState, useEffect, useMemo } from 'react';
import { DEFAULT_STORES, DEFAULT_CATEGORIES, Expense, Store, FamilyProfile, Income, CategoryDefinition, ShoppingItem, OfferPreferences, RecurringExpense, SyncData, CustomField, Member } from './types';
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
import { Loader2 } from 'lucide-react';

function App() {
  const [user, setUser] = useState<any>(null);
  const [familyProfile, setFamilyProfile] = useState<FamilyProfile | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>([]);
  const [shoppingList, setShoppingList] = useState<ShoppingItem[]>([]);
  const [stores, setStores] = useState<Store[]>(DEFAULT_STORES);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // 1. Controllo sessione all'avvio
  useEffect(() => {
    const checkSession = async () => {
      const currentUser = await SupabaseService.getCurrentUser();
      if (currentUser) {
        setUser(currentUser);
        const { data: memberData } = await SupabaseService.getFamilyForUser(currentUser.id);
        if (memberData?.family_id) {
          await loadFamilyData(memberData.family_id);
        }
      }
      setInitialLoading(false);
    };
    checkSession();
  }, []);

  const loadFamilyData = async (familyId: string) => {
    try {
      const [profile, exps, recs, shops, strs] = await Promise.all([
        SupabaseService.getFamilyProfile(familyId),
        SupabaseService.fetchExpenses(familyId),
        SupabaseService.fetchRecurring(familyId),
        SupabaseService.fetchShoppingList(familyId),
        SupabaseService.fetchStores(familyId)
      ]);

      if (profile.data) {
        const members = await SupabaseService.fetchFamilyMembers(familyId);
        setFamilyProfile({
          id: profile.data.id,
          familyName: profile.data.family_name,
          members: members,
          createdAt: new Date(profile.data.created_at).getTime()
        });
      }
      setExpenses(exps);
      setRecurringExpenses(recs);
      setShoppingList(shops);
      if (strs && strs.length > 0) setStores(strs);
    } catch (err) {
      console.error("Errore caricamento dati:", err);
    }
  };

  const productHistory = useMemo(() => {
    const history: Record<string, string> = {};
    [...expenses].reverse().forEach(exp => {
      history[exp.product] = exp.store;
    });
    return history;
  }, [expenses]);

  const handleAddShoppingItem = async (product: string, store: string) => {
    if (!familyProfile) return;
    const newItem: ShoppingItem = { id: crypto.randomUUID(), product, store, completed: false };
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

  const handleAddRecurring = async (product: string, amount: number, store: string, frequency: any, nextDate: string, reminderDays: number, customFields: CustomField[]) => {
    if (!familyProfile) return;
    const newItem: RecurringExpense = { 
      id: crypto.randomUUID(), 
      product, 
      amount, 
      store, 
      frequency, 
      nextDueDate: nextDate, 
      reminderDays,
      customFields
    };
    setRecurringExpenses(prev => [...prev, newItem]);
    await SupabaseService.addRecurringToSupabase(familyProfile.id, newItem);
  };

  const handleUpdateRecurring = async (updated: RecurringExpense) => {
    setRecurringExpenses(prev => prev.map(r => r.id === updated.id ? updated : r));
    await SupabaseService.updateRecurringInSupabase(updated);
  };

  const handleDeleteRecurring = async (id: string) => {
    setRecurringExpenses(prev => prev.filter(r => r.id !== id));
    await SupabaseService.deleteRecurringFromSupabase(id);
  };

  const handleSetupComplete = async (profile: FamilyProfile) => {
    // Quando l'utente crea o si unisce a una famiglia
    setFamilyProfile(profile);
    if (user) {
      // Se l'utente è nuovo, lo aggiungiamo come membro
      const { data: memberExists } = await SupabaseService.getFamilyForUser(user.id);
      if (!memberExists) {
        await SupabaseService.joinFamily(user.id, profile.id, user.email.split('@')[0], true);
      }
    }
    await loadFamilyData(profile.id);
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-10 h-10 text-emerald-600 animate-spin" />
      </div>
    );
  }

  if (!user || !familyProfile) {
    return <LoginScreen 
      onSetupComplete={handleSetupComplete} 
      onUserLogin={setUser}
      isSupabaseAuth={!!user} 
    />;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-emerald-600 text-white p-6 shadow-lg mb-8">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">{familyProfile.familyName}</h1>
            <p className="text-xs text-emerald-100 opacity-80">{user?.email}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm bg-white/20 px-3 py-1 rounded-full backdrop-blur-sm hidden sm:block">
               ID: <code className="font-mono">{familyProfile.id.split('-')[0]}</code>
            </div>
            <button 
              onClick={async () => {
                await SupabaseService.signOut();
                window.location.reload();
              }}
              className="text-xs font-bold bg-red-500/20 hover:bg-red-500/40 px-3 py-1 rounded-lg transition-colors"
            >
              Esci
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <ShoppingListManager 
              items={shoppingList}
              stores={stores}
              productHistory={productHistory}
              onAddItem={handleAddShoppingItem}
              onToggleItem={handleToggleShoppingItem}
              onDeleteItem={handleDeleteShoppingItem}
            />
            
            <DueExpensesAlert 
              dueExpenses={recurringExpenses.filter(r => new Date(r.nextDueDate) <= new Date())} 
              onProcessExpense={() => {}} 
            />
            
            <ExpenseForm 
              stores={stores} 
              members={familyProfile.members} 
              existingProducts={Object.keys(productHistory)} 
              productHistory={productHistory} 
              onAddExpense={async (p, q, u, t, s) => {
                  const newExp: Expense = {
                      id: crypto.randomUUID(),
                      product: p, quantity: q, unitPrice: u, total: t, store: s,
                      date: new Date().toISOString(), category: 'Altro'
                  };
                  setExpenses(prev => [newExp, ...prev]);
                  await SupabaseService.addExpenseToSupabase(familyProfile.id, newExp);
              }} 
              isAnalyzing={isAnalyzing} 
            />
            
            <ExpenseList 
              expenses={expenses} 
              stores={stores} 
              onDelete={async (id) => {
                  setExpenses(prev => prev.filter(e => e.id !== id));
                  await SupabaseService.deleteExpenseFromSupabase(id);
              }} 
              onEdit={() => {}} 
            />
          </div>
          
          <div className="space-y-6">
            <RecurringManager 
              recurringExpenses={recurringExpenses}
              stores={stores}
              onAddRecurring={handleAddRecurring}
              onUpdateRecurring={handleUpdateRecurring}
              onDeleteRecurring={handleDeleteRecurring}
            />
            <StoreManager onAddStore={async (name) => {
              const newStore = { id: crypto.randomUUID(), name };
              setStores(prev => [...prev, newStore]);
              await SupabaseService.addStoreToSupabase(familyProfile.id, newStore);
            }} />
          </div>
        </div>
        <Analytics expenses={expenses} />
        <AIInsight expenses={expenses} />
      </main>
    </div>
  );
}

export default App;
