-- ==========================================
-- SCRIPT DI RESET E CREAZIONE TABELLE SUPABASE (100% IN INGLESE)
-- ==========================================

-- 1. ELIMINA TUTTE LE TABELLE ESISTENTI (RESET TOTALE PER EVITARE CONFLITTI)
DROP TABLE IF EXISTS shopping_list CASCADE;
DROP TABLE IF EXISTS recurring_expenses CASCADE;
DROP TABLE IF EXISTS expenses CASCADE;
DROP TABLE IF EXISTS incomes CASCADE;
DROP TABLE IF EXISTS stores CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS members CASCADE;
DROP TABLE IF EXISTS families CASCADE;

-- 2. TABELLA FAMIGLIE (families)
CREATE TABLE families (
    id UUID PRIMARY KEY,
    family_name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. TABELLA MEMBRI (members) - Relazione Utenti-Famiglie
CREATE TABLE members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID REFERENCES families(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    is_admin BOOLEAN DEFAULT false,
    color TEXT DEFAULT 'bg-emerald-500',
    joined_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(family_id, user_id)
);

-- 4. TABELLA SPESE (expenses)
CREATE TABLE expenses (
    id UUID PRIMARY KEY,
    family_id UUID REFERENCES families(id) ON DELETE CASCADE,
    product TEXT NOT NULL,
    quantity NUMERIC DEFAULT 1,
    unit_price NUMERIC DEFAULT 0,
    total NUMERIC NOT NULL,
    store TEXT,
    category TEXT,
    date TIMESTAMPTZ DEFAULT now(),
    member_id UUID DEFAULT NULL
);

-- 5. TABELLA ENTRATE (incomes)
CREATE TABLE incomes (
    id UUID PRIMARY KEY,
    family_id UUID REFERENCES families(id) ON DELETE CASCADE,
    source TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    date TIMESTAMPTZ DEFAULT now()
);

-- 6. TABELLA NEGOZI (stores)
CREATE TABLE stores (
    id UUID PRIMARY KEY,
    family_id UUID REFERENCES families(id) ON DELETE CASCADE,
    name TEXT NOT NULL
);

-- 7. TABELLA CATEGORIE PERSONALIZZATE (categories)
CREATE TABLE categories (
    id UUID PRIMARY KEY,
    family_id UUID REFERENCES families(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    icon TEXT,
    color TEXT
);

-- 8. TABELLA SPESE RICORRENTI (recurring_expenses)
CREATE TABLE recurring_expenses (
    id UUID PRIMARY KEY,
    family_id UUID REFERENCES families(id) ON DELETE CASCADE,
    product TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    store TEXT,
    frequency TEXT NOT NULL,
    next_due_date DATE,
    reminder_days INTEGER DEFAULT 0,
    custom_fields JSONB DEFAULT '[]'::jsonb
);

-- 9. TABELLA LISTA DELLA SPESA (shopping_list)
CREATE TABLE shopping_list (
    id UUID PRIMARY KEY,
    family_id UUID REFERENCES families(id) ON DELETE CASCADE,
    product TEXT NOT NULL,
    store TEXT,
    completed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ==========================================
-- REGOLAZIONI DI SICUREZZA E POLICY RLS (Semplificate per evitare loop/ricorsioni di caricamento)
-- ==========================================

ALTER TABLE families ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE incomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_list ENABLE ROW LEVEL SECURITY;

-- REGOLE DI ACCESSO DI BASE (Permettono ai membri registrati e loggati di operare)
CREATE POLICY "auth_all" ON families FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON members FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON expenses FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON incomes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON stores FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON categories FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON recurring_expenses FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON shopping_list FOR ALL TO authenticated USING (true) WITH CHECK (true);
