import React, { useState, useEffect, useMemo } from 'react';
import { DEFAULT_STORES, DEFAULT_CATEGORIES, Expense, Store, FamilyProfile, Income, CategoryDefinition, ShoppingItem, OfferPreferences, RecurringExpense, SyncData, CustomField } from './types';
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

function App() {
  const [familyProfile, setFamilyProfile] = useState<FamilyProfile | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>([]);
  const [shoppingList, setShoppingList] = useState<ShoppingItem[]>([]);
  const [stores, setStores] = useState<Store[]>(DEFAULT_STORES);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Deriva lo storico dei prodotti dalle spese reali per alimentare la Shopping List
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

  if (!familyProfile) {
    return <LoginScreen onSetupComplete={setFamilyProfile} isSupabaseAuth={false} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-emerald-600 text-white p-6 shadow-lg mb-8">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold">{familyProfile.familyName}</h1>
          <div className="text-sm bg-white/20 px-3 py-1 rounded-full backdrop-blur-sm">
             ID: <code className="font-mono">{familyProfile.id.split('-')[0]}</code>
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