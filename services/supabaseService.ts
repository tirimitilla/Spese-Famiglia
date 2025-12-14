import { supabase } from '../src/supabaseClient';
import { Expense, Income, Store, RecurringExpense, ShoppingItem, FamilyProfile, CategoryDefinition } from '../types';

// --- FAMILY ---
export const getFamilyProfile = async (familyId: string): Promise<FamilyProfile | null> => {
  const { data, error } = await supabase
    .from('families')
    .select('*')
    .eq('id', familyId)
    .single();

  if (error) {
    console.error('Error fetching family:', error);
    return null;
  }

  // Mappa i campi database al tipo TypeScript
  return {
    id: data.id,
    familyName: data.family_name,
    members: data.members, // JSONB
    createdAt: new Date(data.created_at).getTime()
  };
};

export const createFamilyProfile = async (profile: FamilyProfile): Promise<void> => {
  const { error } = await supabase
    .from('families')
    .upsert({
      id: profile.id,
      family_name: profile.familyName,
      members: profile.members
    });

  if (error) console.error('Error creating family:', error);
};

// --- EXPENSES ---
export const fetchExpenses = async (familyId: string): Promise<Expense[]> => {
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('family_id', familyId)
    .order('date', { ascending: false });

  if (error) {
    console.error('Error fetching expenses:', error);
    return [];
  }

  return data.map((e: any) => ({
    id: e.id,
    product: e.product,
    quantity: Number(e.quantity),
    unitPrice: Number(e.unit_price),
    total: Number(e.total),
    store: e.store,
    date: e.date,
    category: e.category,
    memberId: e.member_id
  }));
};

export const addExpenseToSupabase = async (familyId: string, expense: Expense): Promise<void> => {
  const { error } = await supabase
    .from('expenses')
    .insert({
      id: expense.id, // Usa l'ID generato dal frontend se vuoi, oppure lascialo generare al DB
      family_id: familyId,
      product: expense.product,
      quantity: expense.quantity,
      unit_price: expense.unitPrice,
      total: expense.total,
      store: expense.store,
      date: expense.date,
      category: expense.category,
      member_id: expense.memberId
    });

  if (error) console.error('Error adding expense:', error);
};

export const deleteExpenseFromSupabase = async (id: string): Promise<void> => {
  const { error } = await supabase.from('expenses').delete().eq('id', id);
  if (error) console.error('Error deleting expense:', error);
};

export const updateExpenseInSupabase = async (familyId: string, expense: Expense): Promise<void> => {
  const { error } = await supabase
    .from('expenses')
    .update({
        product: expense.product,
        quantity: expense.quantity,
        unit_price: expense.unitPrice,
        total: expense.total,
        store: expense.store,
        date: expense.date,
        category: expense.category,
        member_id: expense.memberId
    })
    .eq('id', expense.id);
    
  if (error) console.error('Error updating expense:', error);
};

// --- INCOMES ---
export const fetchIncomes = async (familyId: string): Promise<Income[]> => {
  const { data, error } = await supabase
    .from('incomes')
    .select('*')
    .eq('family_id', familyId)
    .order('date', { ascending: false });

  if (error) return [];

  return data.map((i: any) => ({
    id: i.id,
    source: i.source,
    amount: Number(i.amount),
    date: i.date
  }));
};

export const addIncomeToSupabase = async (familyId: string, income: Income): Promise<void> => {
  const { error } = await supabase.from('incomes').insert({
    id: income.id,
    family_id: familyId,
    source: income.source,
    amount: income.amount,
    date: income.date
  });
  if (error) console.error(error);
};

export const deleteIncomeFromSupabase = async (id: string): Promise<void> => {
  await supabase.from('incomes').delete().eq('id', id);
};

// --- STORES ---
export const fetchStores = async (familyId: string): Promise<Store[]> => {
  const { data, error } = await supabase.from('stores').select('*').eq('family_id', familyId);
  if (error || !data) return [];
  return data.map((s: any) => ({ id: s.id, name: s.name }));
};

export const addStoreToSupabase = async (familyId: string, store: Store): Promise<void> => {
  await supabase.from('stores').insert({ id: store.id, family_id: familyId, name: store.name });
};

// --- CATEGORIES ---
export const fetchCategories = async (familyId: string): Promise<CategoryDefinition[]> => {
  const { data, error } = await supabase.from('categories').select('*').eq('family_id', familyId);
  if (error || !data) return [];
  return data.map((c: any) => ({ id: c.id, name: c.name, icon: c.icon, color: c.color }));
};

export const syncCategoriesToSupabase = async (familyId: string, categories: CategoryDefinition[]): Promise<void> => {
    // Semplificazione: Cancelliamo e reinseriamo o upsert. Upsert è meglio.
    const rows = categories.map(c => ({
        id: c.id,
        family_id: familyId,
        name: c.name,
        icon: c.icon,
        color: c.color
    }));
    
    // Per semplicità nelle categorie personalizzate che possono essere cancellate/modificate,
    // usiamo upsert. Per cancellazioni vere servirebbe logica in più.
    const { error } = await supabase.from('categories').upsert(rows);
    if(error) console.error(error);
};


// --- RECURRING ---
export const fetchRecurring = async (familyId: string): Promise<RecurringExpense[]> => {
  const { data, error } = await supabase.from('recurring_expenses').select('*').eq('family_id', familyId);
  if (error) return [];
  return data.map((r: any) => ({
    id: r.id,
    product: r.product,
    amount: Number(r.amount),
    store: r.store,
    frequency: r.frequency,
    nextDueDate: r.next_due_date,
    reminderDays: r.reminder_days
  }));
};

export const addRecurringToSupabase = async (familyId: string, item: RecurringExpense): Promise<void> => {
  await supabase.from('recurring_expenses').insert({
    id: item.id,
    family_id: familyId,
    product: item.product,
    amount: item.amount,
    store: item.store,
    frequency: item.frequency,
    next_due_date: item.nextDueDate,
    reminder_days: item.reminderDays
  });
};

export const deleteRecurringFromSupabase = async (id: string): Promise<void> => {
  await supabase.from('recurring_expenses').delete().eq('id', id);
};

export const updateRecurringInSupabase = async (familyId: string, item: RecurringExpense): Promise<void> => {
    await supabase.from('recurring_expenses').update({
        next_due_date: item.nextDueDate
    }).eq('id', item.id);
};

// --- SHOPPING LIST ---
export const fetchShoppingList = async (familyId: string): Promise<ShoppingItem[]> => {
  const { data, error } = await supabase.from('shopping_list').select('*').eq('family_id', familyId);
  if (error) return [];
  return data.map((s: any) => ({
    id: s.id,
    product: s.product,
    store: s.store,
    completed: s.completed
  }));
};

export const addShoppingItemToSupabase = async (familyId: string, item: ShoppingItem): Promise<void> => {
  await supabase.from('shopping_list').insert({
    id: item.id,
    family_id: familyId,
    product: item.product,
    store: item.store,
    completed: item.completed
  });
};

export const updateShoppingItemInSupabase = async (item: ShoppingItem): Promise<void> => {
  await supabase.from('shopping_list').update({ completed: item.completed }).eq('id', item.id);
};

export const deleteShoppingItemFromSupabase = async (id: string): Promise<void> => {
  await supabase.from('shopping_list').delete().eq('id', id);
};
