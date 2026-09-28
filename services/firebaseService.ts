import { 
  collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, writeBatch, query, orderBy 
} from 'firebase/firestore';
import { 
  auth, db, googleProvider, signInWithPopup, fbSignOut, 
  signInWithEmailAndPassword, createUserWithEmailAndPassword 
} from '../firebase';
import { 
  Expense, Income, Store, RecurringExpense, ShoppingItem, FamilyProfile, Member 
} from '../types';

/* --- ERROR HANDLING AS PER SPEC --- */
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/* --- AUTHENTICATION --- */
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    if (result.user) {
      await ensureUserProfile(result.user.uid, result.user.email || '');
    }
    return result;
  } catch (error) {
    console.error("Google Sign-In Error:", error);
    throw error;
  }
};

export const signUpWithEmail = async (email: string, pass: string) => {
  const cred = await createUserWithEmailAndPassword(auth, email, pass);
  if (cred.user) {
    await ensureUserProfile(cred.user.uid, cred.user.email || email);
  }
  return cred;
};

export const signInWithEmail = async (email: string, pass: string) => {
  const cred = await signInWithEmailAndPassword(auth, email, pass);
  if (cred.user) {
    await ensureUserProfile(cred.user.uid, cred.user.email || email);
  }
  return cred;
};

export const signOut = async () => {
  return await fbSignOut(auth);
};

export const getCurrentUser = () => {
  return auth.currentUser;
};

/* --- USER PROFILE & WORKSPACE MAPPING --- */
export const ensureUserProfile = async (userId: string, email: string) => {
  const path = `users/${userId}`;
  try {
    const userDocRef = doc(db, 'users', userId);
    const snap = await getDoc(userDocRef);
    if (!snap.exists()) {
      await setDoc(userDocRef, {
        id: userId,
        email: email || '',
        createdAt: new Date().toISOString()
      }, { merge: true });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const getFamilyForUser = async (userId: string): Promise<{ data: { family_id: string } | null; error: any }> => {
  if (!userId) return { data: null, error: new Error("UserID mancante") };
  const path = `users/${userId}`;
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (userDoc.exists()) {
      const data = userDoc.data();
      if (data?.familyId) {
        return { data: { family_id: data.familyId }, error: null };
      }
    }
    return { data: null, error: null };
  } catch (error: any) {
    console.warn("Avviso lettura profilo utente da Firestore:", error);
    return { data: null, error };
  }
};

/* --- FAMILY & MEMBERS --- */
export const getFamilyProfile = async (familyId: string) => {
  const path = `families/${familyId}`;
  try {
    const snap = await getDoc(doc(db, 'families', familyId));
    if (snap.exists()) {
      return { data: snap.data() as any, error: null };
    }
    return { data: null, error: new Error("Famiglia non trovata") };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
};

export const fetchFamilyMembers = async (familyId: string): Promise<Member[]> => {
  const path = `families/${familyId}/members`;
  try {
    const snap = await getDocs(collection(db, 'families', familyId, 'members'));
    return snap.docs.map(d => {
      const data = d.data();
      return {
        id: data.id || d.id,
        name: data.name || 'Membro',
        color: data.color || 'bg-emerald-500',
        userId: data.userId || d.id,
        isAdmin: !!data.isAdmin
      };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
};

export const createFamilyAndJoin = async (userId: string, familyName: string, userEmail: string, customFamilyId?: string): Promise<string> => {
  let familyId = 'fam_' + crypto.randomUUID().replace(/-/g, '').slice(0, 12);
  const cleanCustom = customFamilyId?.trim();
  if (cleanCustom && cleanCustom.length >= 2 && /^[a-zA-Z0-9_\-]+$/.test(cleanCustom)) {
    // Check if the chosen custom ID already exists
    try {
      const existingFam = await getDoc(doc(db, 'families', cleanCustom));
      if (existingFam.exists()) {
        throw new Error("Il codice gruppo scelto è già in uso. Scegline un altro o lascialo vuoto per generarne uno automatico.");
      }
      familyId = cleanCustom;
    } catch (checkErr: any) {
      if (checkErr.message?.includes("già in uso")) throw checkErr;
      // otherwise use cleanCustom
      familyId = cleanCustom;
    }
  }

  const famPath = `families/${familyId}`;
  
  try {
    // 1. Create family document
    await setDoc(doc(db, 'families', familyId), {
      id: familyId,
      familyName: familyName.trim(),
      createdBy: userId,
      createdAt: new Date().toISOString()
    });

    // 2. Add creator as admin member
    await setDoc(doc(db, 'families', familyId, 'members', userId), {
      id: userId,
      userId: userId,
      name: userEmail.split('@')[0] || 'Admin',
      isAdmin: true,
      color: 'bg-emerald-500',
      joinedAt: new Date().toISOString()
    });

    // 3. Update user profile with active familyId
    await setDoc(doc(db, 'users', userId), {
      id: userId,
      email: userEmail,
      familyId: familyId,
      createdAt: new Date().toISOString()
    }, { merge: true });

    return familyId;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, famPath);
  }
};

export const joinFamily = async (userId: string, familyId: string, name: string, isAdmin: boolean = false) => {
  const cleanFamilyId = familyId.trim();
  const famPath = `families/${cleanFamilyId}`;
  
  try {
    let famSnap;
    try {
      famSnap = await getDoc(doc(db, 'families', cleanFamilyId));
    } catch (readErr: any) {
      if (readErr?.message?.includes('permission') || readErr?.code === 'permission-denied') {
        throw new Error("Codice gruppo non trovato o non valido. Verifica il codice inserito.");
      }
      throw readErr;
    }

    if (!famSnap.exists()) {
      throw new Error("Gruppo famiglia non trovato. Verifica il codice inserito.");
    }

    // Add as member
    await setDoc(doc(db, 'families', cleanFamilyId, 'members', userId), {
      id: userId,
      userId: userId,
      name: name.trim() || 'Membro',
      isAdmin: isAdmin,
      color: 'bg-emerald-500',
      joinedAt: new Date().toISOString()
    });

    // Update user profile
    const currentUser = auth.currentUser;
    await setDoc(doc(db, 'users', userId), {
      id: userId,
      email: currentUser?.email || '',
      familyId: cleanFamilyId
    }, { merge: true });

    return { success: true, family: famSnap.data() };
  } catch (error: any) {
    if (error.message && (
      error.message.includes("Gruppo famiglia non trovato") ||
      error.message.includes("Codice gruppo non trovato") ||
      error.message.includes("già in uso")
    )) {
      throw error;
    }
    handleFirestoreError(error, OperationType.WRITE, famPath);
  }
};

/* --- EXPENSES --- */
export const fetchExpenses = async (familyId: string): Promise<Expense[]> => {
  const path = `families/${familyId}/expenses`;
  try {
    const q = query(collection(db, 'families', familyId, 'expenses'), orderBy('date', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => {
      const data = d.data();
      return {
        id: data.id || d.id,
        product: data.product || '',
        quantity: Number(data.quantity) || 1,
        unitPrice: Number(data.unitPrice) || 0,
        total: Number(data.total) || 0,
        store: data.store || '',
        date: data.date || '',
        category: data.category || 'Altro',
        memberId: data.memberId
      };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
};

export const addExpenseToFirebase = async (familyId: string, expense: Expense) => {
  const path = `families/${familyId}/expenses/${expense.id}`;
  try {
    await setDoc(doc(db, 'families', familyId, 'expenses', expense.id), {
      id: expense.id,
      product: expense.product,
      quantity: Number(expense.quantity) || 1,
      unitPrice: Number(expense.unitPrice) || 0,
      total: Number(expense.total) || 0,
      store: expense.store,
      date: expense.date,
      category: expense.category,
      ...(expense.memberId ? { memberId: expense.memberId } : {}),
      createdAt: new Date().toISOString()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
};

export const addExpensesToFirebase = async (familyId: string, expenses: Expense[]) => {
  const path = `families/${familyId}/expenses`;
  try {
    const batch = writeBatch(db);
    for (const exp of expenses) {
      const ref = doc(db, 'families', familyId, 'expenses', exp.id);
      batch.set(ref, {
        id: exp.id,
        product: exp.product,
        quantity: Number(exp.quantity) || 1,
        unitPrice: Number(exp.unitPrice) || 0,
        total: Number(exp.total) || 0,
        store: exp.store,
        date: exp.date,
        category: exp.category,
        ...(exp.memberId ? { memberId: exp.memberId } : {}),
        createdAt: new Date().toISOString()
      });
    }
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const deleteExpenseFromFirebase = async (familyId: string, id: string) => {
  const path = `families/${familyId}/expenses/${id}`;
  try {
    await deleteDoc(doc(db, 'families', familyId, 'expenses', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

/* --- INCOMES --- */
export const fetchIncomes = async (familyId: string): Promise<Income[]> => {
  const path = `families/${familyId}/incomes`;
  try {
    const snap = await getDocs(collection(db, 'families', familyId, 'incomes'));
    return snap.docs.map(d => {
      const data = d.data();
      return {
        id: data.id || d.id,
        source: data.source || '',
        amount: Number(data.amount) || 0,
        date: data.date || ''
      };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
};

export const addIncomeToFirebase = async (familyId: string, income: Income) => {
  const path = `families/${familyId}/incomes/${income.id}`;
  try {
    await setDoc(doc(db, 'families', familyId, 'incomes', income.id), {
      id: income.id,
      source: income.source,
      amount: Number(income.amount) || 0,
      date: income.date,
      createdAt: new Date().toISOString()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
};

export const deleteIncomeFromFirebase = async (familyId: string, id: string) => {
  const path = `families/${familyId}/incomes/${id}`;
  try {
    await deleteDoc(doc(db, 'families', familyId, 'incomes', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

/* --- STORES --- */
export const fetchStores = async (familyId: string): Promise<Store[]> => {
  const path = `families/${familyId}/stores`;
  try {
    const snap = await getDocs(collection(db, 'families', familyId, 'stores'));
    return snap.docs.map(d => {
      const data = d.data();
      return {
        id: data.id || d.id,
        name: data.name || ''
      };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
};

export const addStoreToFirebase = async (familyId: string, store: Store) => {
  const path = `families/${familyId}/stores/${store.id}`;
  try {
    await setDoc(doc(db, 'families', familyId, 'stores', store.id), {
      id: store.id,
      name: store.name,
      createdAt: new Date().toISOString()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
};

/* --- RECURRING EXPENSES --- */
export const fetchRecurring = async (familyId: string): Promise<RecurringExpense[]> => {
  const path = `families/${familyId}/recurring_expenses`;
  try {
    const snap = await getDocs(collection(db, 'families', familyId, 'recurring_expenses'));
    return snap.docs.map(d => {
      const data = d.data();
      return {
        id: data.id || d.id,
        product: data.product || '',
        amount: Number(data.amount) || 0,
        store: data.store || '',
        frequency: data.frequency || 'mensile',
        nextDueDate: data.nextDueDate || '',
        reminderDays: Number(data.reminderDays) || 0,
        customFields: data.customFields || []
      };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
};

export const addRecurringToFirebase = async (familyId: string, item: RecurringExpense) => {
  const path = `families/${familyId}/recurring_expenses/${item.id}`;
  try {
    await setDoc(doc(db, 'families', familyId, 'recurring_expenses', item.id), {
      id: item.id,
      product: item.product,
      amount: Number(item.amount) || 0,
      store: item.store,
      frequency: item.frequency,
      nextDueDate: item.nextDueDate,
      reminderDays: Number(item.reminderDays) || 0,
      customFields: item.customFields || [],
      createdAt: new Date().toISOString()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
};

export const updateRecurringInFirebase = async (familyId: string, item: RecurringExpense) => {
  const path = `families/${familyId}/recurring_expenses/${item.id}`;
  try {
    await updateDoc(doc(db, 'families', familyId, 'recurring_expenses', item.id), {
      product: item.product,
      amount: Number(item.amount) || 0,
      store: item.store,
      frequency: item.frequency,
      nextDueDate: item.nextDueDate,
      reminderDays: Number(item.reminderDays) || 0,
      customFields: item.customFields || []
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
};

export const deleteRecurringFromFirebase = async (familyId: string, id: string) => {
  const path = `families/${familyId}/recurring_expenses/${id}`;
  try {
    await deleteDoc(doc(db, 'families', familyId, 'recurring_expenses', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

/* --- SHOPPING LIST --- */
export const fetchShoppingList = async (familyId: string): Promise<ShoppingItem[]> => {
  const path = `families/${familyId}/shopping_list`;
  try {
    const snap = await getDocs(collection(db, 'families', familyId, 'shopping_list'));
    return snap.docs.map(d => {
      const data = d.data();
      return {
        id: data.id || d.id,
        product: data.product || '',
        store: data.store || '',
        completed: !!data.completed
      };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
};

export const addShoppingItemToFirebase = async (familyId: string, item: ShoppingItem) => {
  const path = `families/${familyId}/shopping_list/${item.id}`;
  try {
    await setDoc(doc(db, 'families', familyId, 'shopping_list', item.id), {
      id: item.id,
      product: item.product,
      store: item.store,
      completed: !!item.completed,
      createdAt: new Date().toISOString()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
};

export const updateShoppingItemInFirebase = async (familyId: string, item: ShoppingItem) => {
  const path = `families/${familyId}/shopping_list/${item.id}`;
  try {
    await updateDoc(doc(db, 'families', familyId, 'shopping_list', item.id), {
      completed: !!item.completed
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
};

export const deleteShoppingItemFromFirebase = async (familyId: string, id: string) => {
  const path = `families/${familyId}/shopping_list/${id}`;
  try {
    await deleteDoc(doc(db, 'families', familyId, 'shopping_list', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};
