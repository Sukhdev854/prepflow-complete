import { useState, useEffect } from 'react';
import { AuthPage } from './components/AuthPage';
import { Sidebar, Page } from './components/Sidebar';
import { getCurrentSession, signOut, loadStudentProfile, loadProgress, loadStreak, saveAllProgress, saveStreak, saveStudentProfile, AuthSession } from './utils/cloudAuth';
import { Loader } from 'lucide-react';

// ─── Types (exported for use in child components) ─────────────────────────────

export interface SelectedSubject {
  name: string;
  code: string;
  components: string[];
  yearsRange: { from: number; to: number };
}

export interface StudentProfile {
  name: string;
  level: 'IGCSE' | 'AS Level' | 'A Level';
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

function getDefaultStreak(): StreakData {
  return { currentStreak: 0, longestStreak: 0, lastStudyDate: '', totalXP: 0, studyDates: [] };
}

function updateStreakOnRecord(streak: StreakData): StreakData {
  const today = new Date().toISOString().slice(0, 10);
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

export default function App() {
  const [authSession, setAuthSession] = useState<AuthSession | null>(null);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [progress, setProgress] = useState<ProgressEntry[]>([]);
  const [streak, setStreak] = useState<StreakData>(getDefaultStreak());
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const session = getCurrentSession();
    if (session) {
      setAuthSession(session);
      loadUserData(session.userId).then(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const loadUserData = async (userId: string) => {
    try {
      const [p, prog, s] = await Promise.all([
        loadStudentProfile(userId),
        loadProgress(userId),
        loadStreak(userId),
      ]);
      if (p) setProfile(p);
      if (prog.length > 0) setProgress(prog);
      if (s) setStreak(s);
    } catch (e) {
      console.error('Failed to load user data', e);
    }
  };

  const saveProfile = async (p: StudentProfile) => {
    if (!authSession) return;
    setProfile(p);
    await saveStudentProfile(authSession.userId, p);
  };

  const addProgress = async (entry: ProgressEntry) => {
    if (!authSession) return;
    const updated = progress.filter(e =>
      !(e.subjectCode === entry.subjectCode && e.component === entry.component &&
        e.year === entry.year && e.session === entry.session)
    );
    updated.push(entry);
    setProgress(updated);
    await saveAllProgress(authSession.userId, updated);

    const newStreak = updateStreakOnRecord(streak);
    setStreak(newStreak);
    await saveStreak(authSession.userId, newStreak);
  };

  const updateProgress = async (entries: ProgressEntry[]) => {
    if (!authSession) return;
    setProgress(entries);
    await saveAllProgress(authSession.userId, entries);
  };

  const handleAuthSuccess = (session: AuthSession) => {
    setAuthSession(session);
    loadUserData(session.userId);
    setCurrentPage('dashboard');
  };

  const handleSignOut = async () => {
    await signOut();
    setAuthSession(null);
    setProfile(null);
    setProgress([]);
    setStreak(getDefaultStreak());
    setCurrentPage('dashboard');
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-void)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', border: '2px solid var(--border-dim)', borderTopColor: 'var(--accent-violet)', animation: 'spin 0.9s linear infinite', boxShadow: '0 0 30px var(--glow-violet)' }} />
          <p style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-display)', fontSize: 13, letterSpacing: '0.1em' }}>LOADING</p>
        </div>
      </div>
    );
  }

  if (!authSession) {
    return (
      <>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <AuthPage onAuthSuccess={handleAuthSuccess} />
      </>
    );
  }

  const defaultProfile: StudentProfile = {
    name: authSession.name,
    level: 'IGCSE',
    subjects: [],
    targetGrade: 'A*',
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
        return <SettingsPage profile={profile} onUpdateProfile={saveProfile} username={authSession.username} />;
      default:
        return <Dashboard profile={p} progress={progress} streak={streak} onNavigate={(page) => setCurrentPage(page as Page)} />;
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-void)' }}>
      <div className="app-bg"><div className="app-bg-grid" /></div>
      <Sidebar
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        onSignOut={handleSignOut}
        username={authSession.username}
        streak={streak.currentStreak}
      />
      <main className="main-content page-enter">{renderPage()}</main>
    </div>
  );
}
