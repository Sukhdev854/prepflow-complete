// Cloud authentication using Supabase
// This replaces localAuth.ts to provide cross-device sync

import { supabase } from './supabaseClient';
import { StudentProfile, ProgressEntry, StreakData } from '../App';

export interface AuthSession {
  userId: string;
  username: string;
  name: string;
  createdAt: string;
}

// ─── Sign Up ──────────────────────────────────────────────────────────────────
export async function signUp(
  username: string,
  password: string,
  email: string,
  name: string
): Promise<{ success: boolean; error?: string; session?: AuthSession }> {
  try {
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      return { success: false, error: 'Username must be 3–20 characters (letters, numbers, underscores)' };
    }
    if (password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters' };
    }

    // Check username taken
    const { data: existing } = await supabase
      .from('profiles')
      .select('username')
      .eq('username', username.toLowerCase())
      .maybeSingle();

    if (existing) return { success: false, error: 'Username already taken — please choose another' };

    // Create Supabase auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username: username.toLowerCase(), name } },
    });

    if (authError || !authData.user) {
      return { success: false, error: authError?.message || 'Failed to create account' };
    }

    // Insert into profiles table
    await supabase.from('profiles').insert({
      id: authData.user.id,
      username: username.toLowerCase(),
      name,
      created_at: new Date().toISOString(),
    });

    const session: AuthSession = {
      userId: authData.user.id,
      username: username.toLowerCase(),
      name,
      createdAt: new Date().toISOString(),
    };

    saveSessionLocally(session);
    return { success: true, session };
  } catch (e: any) {
    return { success: false, error: e.message || 'An unexpected error occurred' };
  }
}

// ─── Sign In ──────────────────────────────────────────────────────────────────
export async function signIn(
  usernameOrEmail: string,
  password: string
): Promise<{ success: boolean; error?: string; session?: AuthSession }> {
  try {
    let email = usernameOrEmail;

    // If not an email, look up email by username
    if (!usernameOrEmail.includes('@')) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('email, id, name, username')
        .eq('username', usernameOrEmail.toLowerCase())
        .maybeSingle();

      if (!profile) return { success: false, error: 'Username not found' };
      email = profile.email;
    }

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError || !authData.user) {
      return { success: false, error: 'Incorrect username or password' };
    }

    // Fetch profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('username, name')
      .eq('id', authData.user.id)
      .maybeSingle();

    const session: AuthSession = {
      userId: authData.user.id,
      username: profile?.username || usernameOrEmail.toLowerCase(),
      name: profile?.name || usernameOrEmail,
      createdAt: authData.user.created_at,
    };

    saveSessionLocally(session);
    return { success: true, session };
  } catch (e: any) {
    return { success: false, error: e.message || 'Sign in failed' };
  }
}

// ─── Sign Out ─────────────────────────────────────────────────────────────────
export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
  clearSessionLocally();
}

// ─── Session helpers ──────────────────────────────────────────────────────────
export function getCurrentSession(): AuthSession | null {
  const s = localStorage.getItem('prepflow_session');
  return s ? JSON.parse(s) : null;
}

function saveSessionLocally(session: AuthSession) {
  localStorage.setItem('prepflow_session', JSON.stringify(session));
}

function clearSessionLocally() {
  localStorage.removeItem('prepflow_session');
}

// ─── Cloud Data: Profile ──────────────────────────────────────────────────────
export async function loadStudentProfile(userId: string): Promise<StudentProfile | null> {
  const { data } = await supabase
    .from('student_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (!data) return null;
  return data.profile_data as StudentProfile;
}

export async function saveStudentProfile(userId: string, profile: StudentProfile): Promise<void> {
  await supabase.from('student_profiles').upsert({
    user_id: userId,
    profile_data: profile,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' });
}

// ─── Cloud Data: Progress ─────────────────────────────────────────────────────
export async function loadProgress(userId: string): Promise<ProgressEntry[]> {
  const { data } = await supabase
    .from('progress_entries')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (!data) return [];
  return data.map((row: any) => row.entry_data as ProgressEntry);
}

export async function saveAllProgress(userId: string, entries: ProgressEntry[]): Promise<void> {
  // Delete existing and re-insert (simple approach)
  await supabase.from('progress_entries').delete().eq('user_id', userId);

  if (entries.length === 0) return;

  await supabase.from('progress_entries').insert(
    entries.map(entry => ({
      user_id: userId,
      entry_id: entry.id,
      entry_data: entry,
      created_at: entry.date,
    }))
  );
}

// ─── Cloud Data: Streak ───────────────────────────────────────────────────────
export async function loadStreak(userId: string): Promise<any | null> {
  const { data } = await supabase
    .from('student_profiles')
    .select('streak_data')
    .eq('user_id', userId)
    .maybeSingle();

  return data?.streak_data || null;
}

export async function saveStreak(userId: string, streak: any): Promise<void> {
  await supabase.from('student_profiles').upsert({
    user_id: userId,
    streak_data: streak,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' });
}
