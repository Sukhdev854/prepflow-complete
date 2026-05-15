import { useState, useEffect } from 'react';
import { AuthPage } from './components/AuthPage';
import { Sidebar, Page } from './components/Sidebar';
import { WelcomePage } from './components/WelcomePage';
import { getCurrentSession, signOut, AuthSession } from './utils/localAuth';
import { Loader } from 'lucide-react';

export interface SelectedSubject {
  name: string;
  code: string;
  components: string[];
  yearsRange: { from: number; to: number };
}

export interface StudentProfile {
  name: string;
  level: 'IGCSE' | 'A Level';
  subjects: SelectedSubject[];
  targetGrade: string;
  yearsRange: { from: number; to: number };
}

export interface ProgressEntry {
  id: string;
  subjectCode: string;
  component: string;
  year: number;
  session: string;
  score: number;
  maxScore: number;
  date: string;
  status?: 'done' | 'in-progress' | 'to-mark' | 'to-review' | 'not-started';
  difficulty?: 1 | 2 | 3 | 4 | 5;
}

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastStudyDate: string;
  totalXP: number;
  studyDates: string[];
}

import { Dashboard } from './components/Dashboard';
import { ProgressRecorder } from './components/ProgressRecorder';
import { PendingPapers } from './components/PendingPapers';
import { PredictedGrades } from './components/PredictedGrades';
import { SettingsPage } from './components/SettingsPage';
import { GamificationPage } from './components/GamificationPage';
import { HardestPapers } from './components/HardestPapers';

// ─── Apply saved theme/font preferences ──────────────────────────────────────
function applyStoredPrefs() {
  try {
    const prefs = JSON.parse(localStorage.getItem('prepflow_prefs') || '{}');
    const root  = document.documentElement;

    // Theme — directly set CSS variables on :root
    const THEME_VARS: Record<string, [string, string, string]> = {
      violet:  ['#7c3aed', '#a855f7', 'rgba(124,58,237,0.35)'],
      cyan:    ['#0891b2', '#22d3ee', 'rgba(6,182,212,0.35)'],
      emerald: ['#059669', '#34d399', 'rgba(16,185,129,0.35)'],
      rose:    ['#e11d48', '#fb7185', 'rgba(244,63,94,0.35)'],
      amber:   ['#d97706', '#fbbf24', 'rgba(245,158,11,0.35)'],
    };
    const theme = prefs.theme || 'violet';
    const [v, vb, glow] = THEME_VARS[theme] || THEME_VARS.violet;
    root.style.setProperty('--accent-violet',        v);
    root.style.setProperty('--accent-violet-bright', vb);
    root.style.setProperty('--glow-violet',          glow);

    // Font — toggle body class
    const body = document.body;
    body.classList.remove('font-inter', 'font-mono', 'font-rounded');
    if (prefs.font && prefs.font !== 'default') body.classList.add(`font-${prefs.font}`);

    // Compact
    if (prefs.compact) body.classList.add('compact-mode');
    else body.classList.remove('compact-mode');
  } catch {}
}
// Run on import
applyStoredPrefs();

function getDefaultStreak(): StreakData {
  return { currentStreak: 0, longestStreak: 0, lastStudyDate: '', totalXP: 0, studyDates: [] };
}

function updateStreakOnRecord(streak: StreakData): StreakData {
  const today     = new Date().toISOString().slice(0, 10);
  if (streak.studyDates.includes(today)) return streak;
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const newStreak = streak.lastStudyDate === yesterday || streak.lastStudyDate === today
    ? streak.currentStreak + 1 : 1;
  return {
    currentStreak: newStreak,
    longestStreak: Math.max(streak.longestStreak, newStreak),
    lastStudyDate: today,
    totalXP: streak.totalXP + 50,
    studyDates: [...streak.studyDates, today],
  };
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [authSession,  setAuthSession]  = useState<AuthSession | null>(null);
  const [profile,      setProfile]      = useState<StudentProfile | null>(null);
  const [progress,     setProgress]     = useState<ProgressEntry[]>([]);
  const [streak,       setStreak]       = useState<StreakData>(getDefaultStreak());
  const [currentPage,  setCurrentPage]  = useState<Page>('dashboard');
  const [loading,      setLoading]      = useState(true);
  // showAuth: true = show sign-in/up page, false = show welcome landing
  const [showAuth,     setShowAuth]     = useState(false);

  useEffect(() => {
    const session = getCurrentSession();
    if (session) { setAuthSession(session); loadUserData(session.userId); }
    setLoading(false);
  }, []);

  const loadUserData = (userId: string) => {
    try {
      const p  = localStorage.getItem(`prepflow_profile_${userId}`);
      const pr = localStorage.getItem(`prepflow_progress_${userId}`);
      const s  = localStorage.getItem(`prepflow_streak_${userId}`);
      if (p)  setProfile(JSON.parse(p));
      if (pr) setProgress(JSON.parse(pr));
      if (s)  setStreak(JSON.parse(s));
    } catch (e) { console.error('Failed to load data', e); }
  };

  const saveProfile = (p: StudentProfile) => {
    if (!authSession) return;
    setProfile(p);
    localStorage.setItem(`prepflow_profile_${authSession.userId}`, JSON.stringify(p));
    applyStoredPrefs(); // re-apply prefs after save
  };

  const addProgress = (entry: ProgressEntry) => {
    if (!authSession) return;
    const updated = progress.filter(e =>
      !(e.subjectCode === entry.subjectCode && e.component === entry.component &&
        e.year === entry.year && e.session === entry.session)
    );
    updated.push(entry);
    setProgress(updated);
    localStorage.setItem(`prepflow_progress_${authSession.userId}`, JSON.stringify(updated));
    const newStreak = updateStreakOnRecord(streak);
    setStreak(newStreak);
    localStorage.setItem(`prepflow_streak_${authSession.userId}`, JSON.stringify(newStreak));
  };

  const updateProgress = (entries: ProgressEntry[]) => {
    if (!authSession) return;
    setProgress(entries);
    localStorage.setItem(`prepflow_progress_${authSession.userId}`, JSON.stringify(entries));
  };

  const handleAuthSuccess = (session: AuthSession) => {
    setAuthSession(session);
    setShowAuth(false);
    loadUserData(session.userId);
    setCurrentPage('dashboard');
  };

  const handleSignOut = () => {
    signOut();
    setAuthSession(null);
    setProfile(null);
    setProgress([]);
    setStreak(getDefaultStreak());
    setCurrentPage('dashboard');
    setShowAuth(false);
  };

  // ── Loading ──
  if (loading) return (
    <div style={{ minHeight:'100vh', background:'var(--bg-void)', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ width:52, height:52, borderRadius:'50%', border:'2px solid var(--border-dim)', borderTopColor:'var(--accent-violet)', animation:'spin 0.9s linear infinite', boxShadow:'0 0 30px var(--glow-violet)' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  // ── Auth page (sign in / sign up) ──
  if (!authSession && showAuth) return (
    <AuthPage
      onAuthSuccess={handleAuthSuccess}
      onBack={() => setShowAuth(false)}
    />
  );

  // ── Welcome / landing page (logged out) ──
  if (!authSession) return (
    <WelcomePage onGetStarted={() => setShowAuth(true)} />
  );

  // ── Default profile if none set yet ──
  const defaultProfile: StudentProfile = {
    name: authSession.username, level: 'A Level',
    subjects: [], targetGrade: 'A*',
    yearsRange: { from: 2017, to: 2026 },
  };

  const renderPage = () => {
    const p = profile || defaultProfile;
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard profile={p} progress={progress} streak={streak} onNavigate={(page) => setCurrentPage(page as Page)} />;
      case 'record':
        return <ProgressRecorder profile={p} progress={progress} onAddProgress={addProgress} onUpdateProgress={updateProgress} />;
      case 'pending':
        return <PendingPapers profile={p} progress={progress} onUpdateProgress={updateProgress} />;
      case 'achievements':
        return <GamificationPage progress={progress} streak={streak} username={authSession.username} onNavigate={(page) => setCurrentPage(page as any)} />;
      case 'grades':
        return <PredictedGrades profile={p} progress={progress} onNavigate={(page) => setCurrentPage(page as Page)} />;
      case 'hardest':
        return <HardestPapers />;
      case 'settings':
        return <SettingsPage profile={profile} onUpdateProfile={saveProfile} username={authSession.username} onPrefsChange={applyStoredPrefs} />;
      default:
        return <Dashboard profile={p} progress={progress} streak={streak} onNavigate={(page) => setCurrentPage(page as Page)} />;
    }
  };

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg-void)' }}>
      <div className="app-bg"><div className="app-bg-grid" /></div>
      <Sidebar
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        onSignOut={handleSignOut}
        username={authSession.username}
        streak={streak.currentStreak}
        onHome={() => setCurrentPage('dashboard')}
      />
      <main className="main-content page-enter">{renderPage()}</main>
    </div>
  );
}
