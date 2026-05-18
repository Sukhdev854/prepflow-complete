import { useState, useEffect, useCallback } from 'react';
import { AuthPage } from './components/AuthPage';
import { Sidebar, Page } from './components/Sidebar';
import { WelcomePage } from './components/WelcomePage';
import { supabase } from './utils/supabaseClient';
import { getCurrentSession, signOut, AuthSession } from './utils/cloudAuth';

export interface SelectedSubject {
  name: string; code: string; components: string[];
  yearsRange: { from: number; to: number };
}
export interface StudentProfile {
  name: string; level: 'IGCSE' | 'A Level'; subjects: SelectedSubject[];
  targetGrade: string; yearsRange: { from: number; to: number };
}
export interface ProgressEntry {
  id: string; subjectCode: string; component: string; year: number; session: string;
  score: number; maxScore: number; date: string;
  status?: 'done' | 'in-progress' | 'to-mark' | 'to-review' | 'not-started';
  difficulty?: 1 | 2 | 3 | 4 | 5;
}
export interface StreakData {
  currentStreak: number; longestStreak: number; lastStudyDate: string;
  totalXP: number; studyDates: string[];
}

import { Dashboard }        from './components/Dashboard';
import { ProgressRecorder } from './components/ProgressRecorder';
import { PendingPapers }    from './components/PendingPapers';
import { PredictedGrades }  from './components/PredictedGrades';
import { SettingsPage }     from './components/SettingsPage';
import { GamificationPage } from './components/GamificationPage';
import { HardestPapers }    from './components/HardestPapers';

// ─── Theme prefs (device-local only) ─────────────────────────────────────────
export function applyStoredPrefs() {
  try {
    const prefs = JSON.parse(localStorage.getItem('prepflow_prefs') || '{}');
    const root  = document.documentElement;
    const THEMES: Record<string, [string,string,string]> = {
      violet:  ['#7c3aed','#a855f7','rgba(124,58,237,0.35)'],
      cyan:    ['#0891b2','#22d3ee','rgba(6,182,212,0.35)'],
      emerald: ['#059669','#34d399','rgba(16,185,129,0.35)'],
      rose:    ['#e11d48','#fb7185','rgba(244,63,94,0.35)'],
      amber:   ['#d97706','#fbbf24','rgba(245,158,11,0.35)'],
    };
    const [v,vb,glow] = THEMES[prefs.theme||'violet'] || THEMES.violet;
    root.style.setProperty('--accent-violet',        v);
    root.style.setProperty('--accent-violet-bright', vb);
    root.style.setProperty('--glow-violet',          glow);
    const body = document.body;
    body.classList.remove('font-inter','font-mono','font-rounded');
    if (prefs.font && prefs.font !== 'default') body.classList.add(`font-${prefs.font}`);
    if (prefs.compact) body.classList.add('compact-mode');
    else body.classList.remove('compact-mode');
  } catch {}
}
applyStoredPrefs();

// ─── localStorage cache (fast reads on same device) ──────────────────────────
const lc = {
  get: <T,>(key: string): T | null => { try { const v=localStorage.getItem(key); return v?JSON.parse(v):null; } catch { return null; } },
  set: (key: string, val: unknown) => { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} },
  del: (key: string) => { try { localStorage.removeItem(key); } catch {} },
};
const cacheKey = (uid: string, type: string) => `pf_${type}_${uid}`;

// ─── Supabase cloud functions ─────────────────────────────────────────────────
async function cloudLoad(userId: string) {
  try {
    const [{ data: pd }, { data: pr }] = await Promise.all([
      supabase.from('student_profiles').select('profile_data,streak_data').eq('user_id',userId).maybeSingle(),
      supabase.from('progress_entries').select('entry_data').eq('user_id',userId),
    ]);
    return {
      profile:  (pd?.profile_data  ?? null) as StudentProfile | null,
      streak:   (pd?.streak_data   ?? null) as StreakData | null,
      progress: ((pr ?? []) as any[]).map(r => r.entry_data as ProgressEntry),
    };
  } catch (e) { console.error('cloudLoad error', e); return { profile:null, streak:null, progress:[] }; }
}

async function cloudSaveProfile(userId: string, profile: StudentProfile) {
  try {
    await supabase.from('student_profiles')
      .upsert({ user_id:userId, profile_data:profile, updated_at:new Date().toISOString() }, { onConflict:'user_id' });
  } catch(e) { console.error('cloudSaveProfile error',e); }
}

async function cloudSaveStreak(userId: string, streak: StreakData) {
  try {
    await supabase.from('student_profiles')
      .upsert({ user_id:userId, streak_data:streak, updated_at:new Date().toISOString() }, { onConflict:'user_id' });
  } catch(e) { console.error('cloudSaveStreak error',e); }
}

async function cloudSaveProgress(userId: string, entries: ProgressEntry[]) {
  try {
    await supabase.from('progress_entries').delete().eq('user_id', userId);
    if (entries.length > 0) {
      await supabase.from('progress_entries').insert(
        entries.map(e => ({ user_id:userId, entry_id:e.id, entry_data:e, created_at:e.date }))
      );
    }
  } catch(e) { console.error('cloudSaveProgress error',e); }
}

// ─── Streak helpers ───────────────────────────────────────────────────────────
const defaultStreak = (): StreakData => ({ currentStreak:0, longestStreak:0, lastStudyDate:'', totalXP:0, studyDates:[] });

function bumpStreak(s: StreakData): StreakData {
  const today = new Date().toISOString().slice(0,10);
  if (s.studyDates.includes(today)) return s;
  const yesterday = new Date(Date.now()-86400000).toISOString().slice(0,10);
  const n = (s.lastStudyDate===yesterday||s.lastStudyDate===today) ? s.currentStreak+1 : 1;
  return { currentStreak:n, longestStreak:Math.max(s.longestStreak,n), lastStudyDate:today, totalXP:s.totalXP+50, studyDates:[...s.studyDates,today] };
}

// ─── App component ────────────────────────────────────────────────────────────
export default function App() {
  const [authSession, setAuthSession] = useState<AuthSession|null>(null);
  const [profile,     setProfile]     = useState<StudentProfile|null>(null);
  const [progress,    setProgress]    = useState<ProgressEntry[]>([]);
  const [streak,      setStreak]      = useState<StreakData>(defaultStreak());
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [loading,     setLoading]     = useState(true);
  const [syncing,     setSyncing]     = useState(false);
  const [showAuth,    setShowAuth]    = useState(false);

  // ── Bootstrap: restore session → load cache → sync cloud ──
  useEffect(() => {
    const session = getCurrentSession();
    if (!session) { setLoading(false); return; }
    setAuthSession(session);

    // Immediately show cached data so app feels instant
    const cp = lc.get<StudentProfile>(cacheKey(session.userId,'profile'));
    const cr = lc.get<ProgressEntry[]>(cacheKey(session.userId,'progress'));
    const cs = lc.get<StreakData>(cacheKey(session.userId,'streak'));
    if (cp) setProfile(cp);
    if (cr) setProgress(cr);
    if (cs) setStreak(cs);
    setLoading(false);

    // Then pull fresh data from Supabase (this is what works on a new device)
    setSyncing(true);
    cloudLoad(session.userId).then(({ profile:p, progress:pr, streak:s }) => {
      if (p)              { setProfile(p);   lc.set(cacheKey(session.userId,'profile'),  p);  }
      if (pr?.length > 0) { setProgress(pr); lc.set(cacheKey(session.userId,'progress'), pr); }
      if (s)              { setStreak(s);    lc.set(cacheKey(session.userId,'streak'),   s);  }
    }).finally(() => setSyncing(false));
  }, []);

  const saveProfile = useCallback((p: StudentProfile) => {
    if (!authSession) return;
    setProfile(p);
    lc.set(cacheKey(authSession.userId,'profile'), p);
    cloudSaveProfile(authSession.userId, p);  // fire and forget
    applyStoredPrefs();
  }, [authSession]);

  const addProgress = useCallback((entry: ProgressEntry) => {
    if (!authSession) return;
    setProgress(prev => {
      const updated = [
        ...prev.filter(e => !(e.subjectCode===entry.subjectCode && e.component===entry.component && e.year===entry.year && e.session===entry.session)),
        entry,
      ];
      lc.set(cacheKey(authSession.userId,'progress'), updated);
      cloudSaveProgress(authSession.userId, updated);
      return updated;
    });
    setStreak(prev => {
      const next = bumpStreak(prev);
      lc.set(cacheKey(authSession.userId,'streak'), next);
      cloudSaveStreak(authSession.userId, next);
      return next;
    });
  }, [authSession]);

  const updateProgress = useCallback((entries: ProgressEntry[]) => {
    if (!authSession) return;
    setProgress(entries);
    lc.set(cacheKey(authSession.userId,'progress'), entries);
    cloudSaveProgress(authSession.userId, entries);
  }, [authSession]);

  const handleAuthSuccess = useCallback((session: AuthSession) => {
    setAuthSession(session);
    setShowAuth(false);
    setCurrentPage('dashboard');

    // Load cache first for instant display
    const cp = lc.get<StudentProfile>(cacheKey(session.userId,'profile'));
    const cr = lc.get<ProgressEntry[]>(cacheKey(session.userId,'progress'));
    const cs = lc.get<StreakData>(cacheKey(session.userId,'streak'));
    if (cp) setProfile(cp);
    if (cr) setProgress(cr);
    if (cs) setStreak(cs);

    // Then sync from cloud — this is what loads all data on a new device
    setSyncing(true);
    cloudLoad(session.userId).then(({ profile:p, progress:pr, streak:s }) => {
      if (p)              { setProfile(p);   lc.set(cacheKey(session.userId,'profile'),  p);  }
      if (pr?.length > 0) { setProgress(pr); lc.set(cacheKey(session.userId,'progress'), pr); }
      if (s)              { setStreak(s);    lc.set(cacheKey(session.userId,'streak'),   s);  }
    }).finally(() => setSyncing(false));
  }, []);

  const handleSignOut = useCallback(() => {
    if (authSession) {
      ['profile','progress','streak'].forEach(t => lc.del(cacheKey(authSession.userId, t)));
    }
    signOut();
    setAuthSession(null); setProfile(null); setProgress([]); setStreak(defaultStreak());
    setCurrentPage('dashboard'); setShowAuth(false);
  }, [authSession]);

  // ── Render ──
  if (loading) return (
    <div style={{ minHeight:'100vh',background:'var(--bg-void)',display:'flex',alignItems:'center',justifyContent:'center' }}>
      <div style={{ width:52,height:52,borderRadius:'50%',border:'2px solid var(--border-dim)',borderTopColor:'var(--accent-violet)',animation:'spin 0.9s linear infinite',boxShadow:'0 0 30px var(--glow-violet)' }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (!authSession && showAuth)  return <AuthPage onAuthSuccess={handleAuthSuccess} onBack={() => setShowAuth(false)} />;
  if (!authSession)              return <WelcomePage onGetStarted={() => setShowAuth(true)} />;

  const p = profile || { name:authSession.username, level:'A Level' as const, subjects:[], targetGrade:'A*', yearsRange:{from:2017,to:2026} };

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':    return <Dashboard profile={p} progress={progress} streak={streak} onNavigate={pg => setCurrentPage(pg as Page)} />;
      case 'record':       return <ProgressRecorder profile={p} progress={progress} onAddProgress={addProgress} onUpdateProgress={updateProgress} />;
      case 'pending':      return <PendingPapers profile={p} progress={progress} onUpdateProgress={updateProgress} />;
      case 'achievements': return <GamificationPage progress={progress} streak={streak} username={authSession.username} onNavigate={pg => setCurrentPage(pg as any)} />;
      case 'grades':       return <PredictedGrades profile={p} progress={progress} onNavigate={pg => setCurrentPage(pg as Page)} />;
      case 'hardest':      return <HardestPapers />;
      case 'settings':     return <SettingsPage profile={profile} onUpdateProfile={saveProfile} username={authSession.username} onPrefsChange={applyStoredPrefs} />;
      default:             return <Dashboard profile={p} progress={progress} streak={streak} onNavigate={pg => setCurrentPage(pg as Page)} />;
    }
  };

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg-void)' }}>
      <div className="app-bg"><div className="app-bg-grid"/></div>

      {/* Cloud sync indicator */}
      {syncing && (
        <div style={{ position:'fixed',bottom:20,right:20,zIndex:999,padding:'7px 14px',borderRadius:99,background:'rgba(124,58,237,0.15)',border:'1px solid rgba(124,58,237,0.3)',fontSize:11,color:'var(--accent-violet-bright)',display:'flex',alignItems:'center',gap:7,backdropFilter:'blur(8px)' }}>
          <div style={{ width:7,height:7,borderRadius:'50%',background:'var(--accent-violet-bright)',animation:'blink 1s ease-in-out infinite' }}/>
          Syncing…
          <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:0.25}}`}</style>
        </div>
      )}

      <Sidebar currentPage={currentPage} onPageChange={setCurrentPage} onSignOut={handleSignOut}
        username={authSession.username} streak={streak.currentStreak} onHome={() => setCurrentPage('dashboard')} />
      <main className="main-content page-enter">{renderPage()}</main>
    </div>
  );
}
