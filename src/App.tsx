import { useState, useEffect, useCallback, useRef } from 'react';
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
// cloudLoad returns progress = null when the request FAILED (so we never mistake an
// error for "no data"), and an array (possibly empty) when it succeeded.
async function cloudLoad(userId: string) {
  try {
    const [pdRes, prRes] = await Promise.all([
      supabase.from('student_profiles').select('profile_data,streak_data').eq('user_id',userId).maybeSingle(),
      supabase.from('progress_entries').select('entry_data').eq('user_id',userId),
    ]);
    const pd = pdRes.error ? null : pdRes.data;
    return {
      profile:  (pd?.profile_data ?? null) as StudentProfile | null,
      streak:   (pd?.streak_data  ?? null) as StreakData | null,
      progress: prRes.error ? null : ((prRes.data ?? []) as any[]).map(r => r.entry_data as ProgressEntry),
    };
  } catch (e) { console.error('cloudLoad error', e); return { profile:null, streak:null, progress:null as ProgressEntry[]|null }; }
}

async function cloudSaveProfile(userId: string, profile: StudentProfile): Promise<boolean> {
  try {
    const { error } = await supabase.from('student_profiles')
      .upsert({ user_id:userId, profile_data:profile, updated_at:new Date().toISOString() }, { onConflict:'user_id' });
    if (error) { console.error('cloudSaveProfile error', error); return false; }
    return true;
  } catch(e) { console.error('cloudSaveProfile error',e); return false; }
}

async function cloudSaveStreak(userId: string, streak: StreakData): Promise<boolean> {
  try {
    const { error } = await supabase.from('student_profiles')
      .upsert({ user_id:userId, streak_data:streak, updated_at:new Date().toISOString() }, { onConflict:'user_id' });
    if (error) { console.error('cloudSaveStreak error', error); return false; }
    return true;
  } catch(e) { console.error('cloudSaveStreak error',e); return false; }
}

// ── Safe progress sync ──
// Old behaviour: DELETE every row, then INSERT everything (a failure in between = data loss).
// New behaviour: only upsert what changed, and only delete what the user actually removed.
// `cloudKnown` remembers what the cloud currently holds (entry id -> JSON).
let cloudKnown = new Map<string, string>();
const setCloudKnown = (entries: ProgressEntry[]) => { cloudKnown = new Map(entries.map(e => [e.id, JSON.stringify(e)])); };
let syncChain: Promise<unknown> = Promise.resolve();

async function syncProgressToCloud(userId: string, entries: ProgressEntry[]): Promise<boolean> {
  try {
    const unique = new Map<string, ProgressEntry>();
    entries.forEach(e => unique.set(e.id, e));
    const toUpsert = [...unique.values()].filter(e => cloudKnown.get(e.id) !== JSON.stringify(e));
    const toDelete = [...cloudKnown.keys()].filter(id => !unique.has(id));

    for (let i = 0; i < toUpsert.length; i += 200) {
      const chunk = toUpsert.slice(i, i + 200);
      const { error } = await supabase.from('progress_entries').upsert(
        chunk.map(e => ({ user_id:userId, entry_id:e.id, entry_data:e, created_at:e.date })),
        { onConflict:'user_id,entry_id' }
      );
      if (error) throw error;
      chunk.forEach(e => cloudKnown.set(e.id, JSON.stringify(e)));
    }
    for (let i = 0; i < toDelete.length; i += 50) {
      const chunk = toDelete.slice(i, i + 50);
      const { error } = await supabase.from('progress_entries').delete().eq('user_id', userId).in('entry_id', chunk);
      if (error) throw error;
      chunk.forEach(id => cloudKnown.delete(id));
    }
    return true;
  } catch (e) { console.error('syncProgressToCloud error', e); return false; }
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
const dirtyKey = (uid: string) => `pf_dirty_${uid}`;

export default function App() {
  const [authSession, setAuthSession] = useState<AuthSession|null>(null);
  const [profile,     setProfile]     = useState<StudentProfile|null>(null);
  const [progress,    setProgress]    = useState<ProgressEntry[]>([]);
  const [streak,      setStreak]      = useState<StreakData>(defaultStreak());
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [loading,     setLoading]     = useState(true);
  const [syncing,     setSyncing]     = useState(false);
  const [syncError,   setSyncError]   = useState(false);
  const [showAuth,    setShowAuth]    = useState(false);

  // Refs always hold the latest values (so callbacks never use stale data)
  const progressRef = useRef<ProgressEntry[]>([]);
  const streakRef   = useRef<StreakData>(defaultStreak());
  const profileRef  = useRef<StudentProfile|null>(null);
  const failing     = useRef<Set<string>>(new Set());
  const syncSeq     = useRef(0);

  const applyProgress = useCallback((list: ProgressEntry[]) => { progressRef.current = list; setProgress(list); }, []);
  const applyStreak   = useCallback((st: StreakData)        => { streakRef.current = st;     setStreak(st); }, []);
  const applyProfile  = useCallback((p: StudentProfile|null) => { profileRef.current = p;    setProfile(p); }, []);

  const markSync = useCallback((kind: string, ok: boolean) => {
    if (ok) failing.current.delete(kind); else failing.current.add(kind);
    setSyncError(failing.current.size > 0);
  }, []);

  // Queue a safe, ordered progress sync. A "dirty" flag is kept on this device until the
  // cloud confirms, so an unsynced change can never be overwritten by an older cloud copy.
  const queueProgressSync = useCallback((userId: string, entries: ProgressEntry[]) => {
    const seq = ++syncSeq.current;
    lc.set(dirtyKey(userId), true);
    syncChain = syncChain.then(() => syncProgressToCloud(userId, entries)).then(ok => {
      markSync('progress', ok as boolean);
      if (ok && seq === syncSeq.current) lc.del(dirtyKey(userId));
    });
  }, [markSync]);

  const loadFromCache = useCallback((userId: string) => {
    const cp = lc.get<StudentProfile>(cacheKey(userId,'profile'));
    const cr = lc.get<ProgressEntry[]>(cacheKey(userId,'progress'));
    const cs = lc.get<StreakData>(cacheKey(userId,'streak'));
    if (cp) applyProfile(cp);
    if (cr) applyProgress(cr);
    if (cs) applyStreak(cs);
  }, [applyProfile, applyProgress, applyStreak]);

  const syncFromCloud = useCallback((userId: string) => {
    setSyncing(true);
    cloudLoad(userId).then(({ profile:p, progress:pr, streak:s }) => {
      if (p) { applyProfile(p); lc.set(cacheKey(userId,'profile'), p); }
      if (s) { applyStreak(s);  lc.set(cacheKey(userId,'streak'),  s); }
      if (pr) {
        setCloudKnown(pr);                       // what the cloud really holds
        if (lc.get<boolean>(dirtyKey(userId))) {
          // This device has changes the cloud never received — keep them and push them up
          queueProgressSync(userId, progressRef.current);
        } else {
          // Cloud is the source of truth — even when it is empty (e.g. cleared on another device)
          applyProgress(pr);
          lc.set(cacheKey(userId,'progress'), pr);
        }
      }
    }).finally(() => setSyncing(false));
  }, [applyProfile, applyProgress, applyStreak, queueProgressSync]);

  // ── Bootstrap: restore session → load cache → sync cloud ──
  useEffect(() => {
    const session = getCurrentSession();
    if (!session) { setLoading(false); return; }
    setAuthSession(session);
    loadFromCache(session.userId);   // instant
    setLoading(false);
    syncFromCloud(session.userId);   // then fresh data (this is what works on a new device)
  }, [loadFromCache, syncFromCloud]);

  const saveProfile = useCallback((p: StudentProfile) => {
    if (!authSession) return;
    applyProfile(p);
    lc.set(cacheKey(authSession.userId,'profile'), p);
    cloudSaveProfile(authSession.userId, p).then(ok => markSync('profile', ok));
    applyStoredPrefs();
  }, [authSession, applyProfile, markSync]);

  const addProgress = useCallback((entry: ProgressEntry) => {
    if (!authSession) return;
    const updated = [
      ...progressRef.current.filter(e => !(e.subjectCode===entry.subjectCode && e.component===entry.component && e.year===entry.year && e.session===entry.session)),
      entry,
    ];
    applyProgress(updated);
    lc.set(cacheKey(authSession.userId,'progress'), updated);
    queueProgressSync(authSession.userId, updated);

    const nextStreak = bumpStreak(streakRef.current);
    applyStreak(nextStreak);
    lc.set(cacheKey(authSession.userId,'streak'), nextStreak);
    cloudSaveStreak(authSession.userId, nextStreak).then(ok => markSync('streak', ok));
  }, [authSession, applyProgress, applyStreak, queueProgressSync, markSync]);

  const updateProgress = useCallback((entries: ProgressEntry[]) => {
    if (!authSession) return;
    applyProgress(entries);
    lc.set(cacheKey(authSession.userId,'progress'), entries);
    queueProgressSync(authSession.userId, entries);
  }, [authSession, applyProgress, queueProgressSync]);

  const handleAuthSuccess = useCallback((session: AuthSession, initialProfile?: StudentProfile) => {
    setAuthSession(session);
    setShowAuth(false);
    setCurrentPage('dashboard');

    if (initialProfile) {
      // Brand-new account: save the subjects picked during sign-up, nothing else to load
      setCloudKnown([]);
      applyProgress([]);
      applyStreak(defaultStreak());
      applyProfile(initialProfile);
      lc.set(cacheKey(session.userId,'profile'), initialProfile);
      cloudSaveProfile(session.userId, initialProfile).then(ok => markSync('profile', ok));
      return;
    }
    loadFromCache(session.userId);
    syncFromCloud(session.userId);
  }, [applyProfile, applyProgress, applyStreak, loadFromCache, syncFromCloud, markSync]);

  const retrySync = useCallback(() => {
    if (!authSession) return;
    queueProgressSync(authSession.userId, progressRef.current);
    if (profileRef.current) cloudSaveProfile(authSession.userId, profileRef.current).then(ok => markSync('profile', ok));
    cloudSaveStreak(authSession.userId, streakRef.current).then(ok => markSync('streak', ok));
  }, [authSession, queueProgressSync, markSync]);

  const handleSignOut = useCallback(() => {
    if (failing.current.size > 0 &&
        !window.confirm("Some of your latest changes haven't synced to the cloud yet. Signing out now will lose them. Sign out anyway?")) return;
    if (authSession) {
      ['profile','progress','streak'].forEach(t => lc.del(cacheKey(authSession.userId, t)));
      lc.del(dirtyKey(authSession.userId));
    }
    signOut();
    setCloudKnown([]); failing.current.clear(); setSyncError(false);
    setAuthSession(null); applyProfile(null); applyProgress([]); applyStreak(defaultStreak());
    setCurrentPage('dashboard'); setShowAuth(false);
  }, [authSession, applyProfile, applyProgress, applyStreak]);

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
      case 'settings':     return <SettingsPage profile={profile} onUpdateProfile={saveProfile} username={authSession.username} onPrefsChange={applyStoredPrefs} progress={progress} onUpdateProgress={updateProgress} />;
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
      {syncError && !syncing && (
        <button onClick={retrySync} title="Tap to retry"
          style={{ position:'fixed',bottom:20,right:20,zIndex:999,padding:'8px 14px',borderRadius:99,background:'rgba(239,68,68,0.15)',border:'1px solid rgba(239,68,68,0.4)',fontSize:11,color:'#f87171',cursor:'pointer',backdropFilter:'blur(8px)' }}>
          ⚠ Couldn't save to cloud — tap to retry
        </button>
      )}

      <Sidebar currentPage={currentPage} onPageChange={setCurrentPage} onSignOut={handleSignOut}
        username={authSession.username} streak={streak.currentStreak} onHome={() => setCurrentPage('dashboard')} />
      <main className="main-content page-enter">{renderPage()}</main>
    </div>
  );
}
