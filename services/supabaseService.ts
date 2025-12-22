import { supabase } from '../src/supabaseClient';
import { Expense, Income, Store, RecurringExpense, ShoppingItem, FamilyProfile, CategoryDefinition, Member } from '../types';

// --- AUTH ---
export const signInWithGoogle = async () => {
  let redirectUrl = window.location.origin;
  if (redirectUrl.endsWith('/')) {
    redirectUrl = redirectUrl.slice(0, -1);
  }
  
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectUrl,
    },
  });
  
  if (error) throw error;
};

export const signUpWithEmail = async (email: string, password: string) => {
  return await supabase.auth.signUp({ email, password });
};

export const signInWithEmail = async (email: string, password: string) => {
  return await supabase.auth.signInWithPassword({ email, password });
};

export const signOut = async () => {
  await supabase.auth.signOut();
};

export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

// --- FAMILY & MEMBERSHIP ---
export const getFamilyForUser = async (userId: string): Promise<{ familyId: string, isAdmin: boolean } | null> => {
  try {
    const { data, error } = await supabase
      .from('family_members')
      .select('family_id, is_admin')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error("Errore query membership:", error.message);
      return null;
    }
    if (!data) return null;
    return { familyId: data.family_id, isAdmin: data.is_admin };
  } catch (err) {
    return null;
  }
};

export const fetchFamilyMembers = async (familyId: string): Promise<Member[]> => {
  const { data, error } = await supabase
    .from('family_members')
    .select('user_id, name, is_admin')
    .eq('family_id', familyId);

  if (error) return [];
  return data.map(m => ({
    id: m.user_id,
    name: m.name,
    color: 'bg-emerald-100 text-emerald-600',
    isAdmin: m.is_admin,
    userId: m.user_id
  }));
};

export const joinFamily = async (userId: string, familyId: string, name: string, isAdmin: boolean = false) => {
  const { error } = await supabase
    .from('family_members')
    .upsert({
      family_id: familyId,
      user_id: userId,
      name: name,
      is_admin: isAdmin
    });
  
  if (error) {
    throw error;
  }
};

export const getFamilyProfile = async (familyId: string): Promise<FamilyProfile | null> => {
  const { data, error } = await supabase
    .from('families')
    .select('*')
    .eq('id', familyId)
    .maybeSingle();

  if (error || !data) return null;

  return {
    id: data.id,
    familyName: data.family_name,
    members: data.members || [], 
    createdAt: new Date(data.created_at).getTime()
  };
};

export const createFamilyProfile = async (profile: FamilyProfile): Promise<void> => {
  const { error } = await supabase
    .from('families')
    .insert({
      id: profile.id,
      family_name: profile.familyName,
      members: profile.members
    });
  
  if (error && error.code !== '23505') {
    throw error;
  }
};

// --- EXPENSES ---
export const fetchExpenses = async (familyId: string): Promise<Expense[]> => {
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('family_id', familyId)
    .order('date', { ascending: false });

  if (error) return [];
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
  await supabase.from('expenses').insert({
    id: expense.id,
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
};

export const deleteExpenseFromSupabase = async (id: string): Promise<void> => {
  await supabase.from('expenses').delete().eq('id', id);
};

export const fetchIncomes = async (familyId: string): Promise<Income[]> => {
  const { data, error } = await supabase.from('incomes').select('*').eq('family_id', familyId).order('date', { ascending: false });
  return (data || []).map((i: any) => ({ id: i.id, source: i.source, amount: Number(i.amount), date: i.date }));
};

export const addIncomeToSupabase = async (familyId: string, income: Income): Promise<void> => {
  await supabase.from('incomes').insert({ id: income.id, family_id: familyId, source: income.source, amount: income.amount, date: income.date });
};

export const deleteIncomeFromSupabase = async (id: string): Promise<void> => {
  await supabase.from('incomes').delete().eq('id', id);
};

export const fetchStores = async (familyId: string): Promise<Store[]> => {
  const { data } = await supabase.from('stores').select('*').eq('family_id', familyId);
  return (data || []).map((s: any) => ({ id: s.id, name: s.name }));
};

export const addStoreToSupabase = async (familyId: string, store: Store): Promise<void> => {
  await supabase.from('stores').insert({ id: store.id, family_id: familyId, name: store.name });
};

export const fetchCategories = async (familyId: string): Promise<CategoryDefinition[]> => {
  const { data } = await supabase.from('categories').select('*').eq('family_id', familyId);
  return (data || []).map((c: any) => ({ id: c.id, name: c.name, icon: c.icon, color: c.color }));
};

export const syncCategoriesToSupabase = async (familyId: string, categories: CategoryDefinition[]): Promise<void> => {
    const rows = categories.map(c => ({ id: c.id, family_id: familyId, name: c.name, icon: c.icon, color: c.color }));
    await supabase.from('categories').upsert(rows);
};

export const fetchRecurring = async (familyId: string): Promise<RecurringExpense[]> => {
  const { data } = await supabase.from('recurring_expenses').select('*').eq('family_id', familyId);
  return (data || []).map((r: any) => ({ 
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

export const fetchShoppingList = async (familyId: string): Promise<ShoppingItem[]> => {
  const { data, error } = await supabase
    .from('shopping_list')
    .select('*')
    .eq('family_id', familyId)
    .order('created_at', { ascending: false });
  
  if (error) return [];
  return (data || []).map((s: any) => ({ 
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