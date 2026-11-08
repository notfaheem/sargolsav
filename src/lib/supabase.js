import { createClient } from '@supabase/supabase-js';

// Default / fallback credentials ensuring immediate out-of-the-box connectivity on Vercel
const FALLBACK_SUPABASE_URL = 'https://vmxszvgtyyboyeojjsnk.supabase.co';
const FALLBACK_SUPABASE_KEY = 'sb_publishable_u8bIDf8RceSX6m5UMg6sIA_Y39v7sqt';

let rawUrl = '';
if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) {
  rawUrl = String(import.meta.env.VITE_SUPABASE_URL).trim();
}

// Guarantee a valid HTTP/HTTPS URL at all times
export const supabaseUrl = (rawUrl && rawUrl.startsWith('http') ? rawUrl : FALLBACK_SUPABASE_URL).trim();

let rawKey = '';
if (typeof import.meta !== 'undefined') {
  rawKey = String(
    import.meta.env?.VITE_SUPABASE_ANON_KEY ||
    import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY ||
    ''
  ).trim();
}

export const supabaseAnonKey = (rawKey && rawKey.length > 15 ? rawKey : FALLBACK_SUPABASE_KEY).trim();

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
