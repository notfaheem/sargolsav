import { createClient } from '@supabase/supabase-js';

// Default / fallback credentials ensuring immediate out-of-the-box connectivity
const FALLBACK_SUPABASE_URL = 'https://vmxszvgtyyboyeojjsnk.supabase.co';
const FALLBACK_SUPABASE_KEY = 'sb_publishable_u8bIDf8RceSX6m5UMg6sIA_Y39v7sqt';

const supabaseUrl =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) ||
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SUPABASE_URL) ||
  FALLBACK_SUPABASE_URL;

const supabaseAnonKey =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) ||
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) ||
  FALLBACK_SUPABASE_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
