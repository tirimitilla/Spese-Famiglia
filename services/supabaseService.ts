
import { supabase } from '../supabaseClient';
import { Expense, Income, Store, RecurringExpense, ShoppingItem, FamilyProfile, Member } from '../types';

/* --- AUTHENTICATION --- */
export const signInWithGoogle = async () => {
  return await supabase.auth.signInWithOAuth({ provider: 'google' });
};

export const signUpWithEmail = async (email: string, password: string) => {
  return await supabase.auth.signUp({ email, password });
};

export const signInWithEmail = async (email: string, password: string) => {
  return await supabase.auth.signInWithPassword({ email, password });
};

export const signOut = async () => {
  return await supabase.auth.signOut();
};

export const getCurrentUser = async () => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) return null;
    return user;
  } catch (err) {
    return null;
  }
};

/* --- FAMILY & MEMBERS --- */
export const getFamilyForUser = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('members')
      .select('family_id')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (error) {
      console.error("Errore recupero associazione famiglia:", error.message);
      return { data: null, error };
    }
    return { data, error: null };
  } catch (err: any) {
    return { data: null, error: err };
  }
};

export const getFamilyProfile = async (familyId: string) => {
  return await supabase.from('families').select('*').eq('id', familyId).maybeSingle();
};

export const fetchFamilyMembers = async (familyId: string) => {
  const { data, error } = await supabase.from('members').select('*').eq('family_id', familyId);
  if (error) {
    console.error("Errore recupero membri:", error.message);
    return [];
  }
  return (data || []).map((m: any) => ({
    id: m.id,
    name: m.name,
    color: m.color,
    userId: m.user_id,
    isAdmin: m.is_admin
  }));
};

export const createFamilyAndJoin = async (userId: string, familyName: string, userEmail: string) => {
  const { data: existing } = await getFamilyForUser(userId);
  if (existing?.family_id) return existing.family_id;

  const familyId = crypto.randomUUID();
  
  const { error: famError } = await supabase.from('families').insert({
    id: familyId,
    family_name: familyName,
    created_at: new Date().toISOString()
  });

  if (famError) throw famError;

  const { error: memError } = await supabase.from('members').insert({
    user_id: userId,
    family_id: familyId,
    name: userEmail.split('@')[0],
    is_admin: true,
    color: 'bg-emerald-500'
  });

  if (memError) throw memError;

  return familyId;
};

export const joinFamily = async (userId: string, familyId: string, name: string, isAdmin: boolean = false) => {
  const { data: existing } = await getFamilyForUser(userId);
  if (existing) return { data: existing, error: null };

  return await supabase.from('members').insert({
    user_id: userId,
    family_id: familyId,
    name,
    is_admin: isAdmin,
    color: 'bg-emerald-500'
  });
};

/* --- DATA FETCHING --- */
export const fetchExpenses = async (familyId: string) => {
  const { data, error } = await supabase.from('expenses').select('*').eq('family_id', familyId).order('date', { ascending: false });
  if (error) return [];
  return (data || []).map((e: any) => ({
    id: e.id, product: e.product, quantity: e.quantity, unitPrice: e.unit_price, total: e.total,
    store: e.store, date: e.date, category: e.category, memberId: e.member_id
  }));
};

export const addExpenseToSupabase = async (familyId: string, expense: Expense) => {
  const { error } = await supabase.from('expenses').insert({
    id: expense.id, family_id: familyId, product: expense.product, quantity: expense.quantity,
    unit_price: expense.unitPrice, total: expense.total, store: expense.store, date: expense.date,
    category: expense.category, member_id: expense.memberId
  });
  if (error) throw error;
};

export const deleteExpenseFromSupabase = async (id: string) => {
  const { error } = await supabase.from('expenses').delete().eq('id', id);
  if (error) throw error;
};

export const fetchIncomes = async (familyId: string) => {
  const { data, error } = await supabase.from('incomes').select('*').eq('family_id', familyId);
  if (error) return [];
  return (data || []).map((i: any) => ({ id: i.id, source: i.source, amount: i.amount, date: i.date }));
};

export const addIncomeToSupabase = async (familyId: string, income: Income) => {
  const { error } = await supabase.from('incomes').insert({
    id: income.id, family_id: familyId, source: income.source, amount: income.amount, date: income.date
  });
  if (error) throw error;
};

export const deleteIncomeFromSupabase = async (id: string) => {
  const { error } = await supabase.from('incomes').delete().eq('id', id);
  if (error) throw error;
};

export const fetchStores = async (familyId: string) => {
  const { data, error } = await supabase.from('stores').select('*').eq('family_id', familyId);
  if (error) return [];
  return data || [];
};

export const addStoreToSupabase = async (familyId: string, store: Store) => {
  const { error } = await supabase.from('stores').insert({ id: store.id, family_id: familyId, name: store.name });
  if (error) throw error;
};

export const fetchRecurring = async (familyId: string): Promise<RecurringExpense[]> => {
  const { data, error } = await supabase.from('recurring_expenses').select('*').eq('family_id', familyId);
  if (error) return [];
  return (data || []).map((r: any) => ({ 
    id: r.id, product: r.product, amount: Number(r.amount), store: r.store, frequency: r.frequency, 
    nextDueDate: r.next_due_date, reminder_days: r.reminder_days, customFields: r.custom_fields || [] 
  }));
};

export const addRecurringToSupabase = async (familyId: string, item: RecurringExpense) => {
  // Prepariamo un payload pulito
  const payload: any = { 
    id: item.id, 
    family_id: familyId, 
    product: item.product, 
    amount: Number(item.amount), 
    store: item.store, 
    frequency: item.frequency, 
    next_due_date: item.nextDueDate, 
    reminder_days: Number(item.reminderDays) || 0
  };
  
  // Aggiungiamo i campi personalizzati solo se popolati, per retrocompatibilità schema
  if (item.customFields && item.customFields.length > 0) {
    payload.custom_fields = item.customFields;
  }

  const { error } = await supabase.from('recurring_expenses').insert(payload);
  
  if (error) {
    console.error("DEBUG - Errore Tecnico Supabase:", error);
    throw error;
  }
};

export const deleteRecurringFromSupabase = async (id: string) => {
  const { error } = await supabase.from('recurring_expenses').delete().eq('id', id);
  if (error) throw error;
};

export const fetchShoppingList = async (familyId: string) => {
  const { data, error } = await supabase.from('shopping_list').select('*').eq('family_id', familyId);
  if (error) return [];
  return (data || []).map((s: any) => ({ id: s.id, product: s.product, store: s.store, completed: s.completed }));
};

export const addShoppingItemToSupabase = async (familyId: string, item: ShoppingItem) => {
  const { error } = await supabase.from('shopping_list').insert({
    id: item.id, family_id: familyId, product: item.product, store: item.store, completed: item.completed
  });
  if (error) throw error;
};

export const updateShoppingItemInSupabase = async (item: ShoppingItem) => {
  const { error } = await supabase.from('shopping_list').update({ completed: item.completed }).eq('id', item.id);
  if (error) throw error;
};

export const deleteShoppingItemFromSupabase = async (id: string) => {
  const { error } = await supabase.from('shopping_list').delete().eq('id', id);
  if (error) throw error;
};
