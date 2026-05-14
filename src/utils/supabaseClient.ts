// Supabase client setup
// IMPORTANT: Replace these with your actual Supabase project credentials from https://supabase.com/dashboard
// Go to: Project Settings > API > Project URL and anon key

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL_HERE';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY_HERE';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export type { User, Session } from '@supabase/supabase-js';
