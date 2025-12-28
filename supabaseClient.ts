import { createClient } from '@supabase/supabase-js';

// Credenziali del progetto
const SUPABASE_URL = 'https://zjsfnjmtepwjbtcmkzxh.supabase.co';
const SUPABASE_KEY = 'sb_publishable_RpSR4UGtvuyxbrgEVl5P-w_71czodm6';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);