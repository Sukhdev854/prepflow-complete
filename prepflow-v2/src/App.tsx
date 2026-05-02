import { useState, useEffect } from 'react';
import { AuthPage } from './components/AuthPage';
import { Sidebar, Page } from './components/Sidebar';
import { getCurrentSession, signOut, AuthSession } from './utils/localAuth';
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

// Placeholder for pages not yet built (Batches 3–4)
function PlaceholderPage({ name }: { name: string }) {
  return (
    <div style={{ padding: '40px 32px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 16 }}>
      <div style={{ width: 64, height: 64, borderRadius: 16, background: 'linear-gradient(135deg, var(--accent-violet), var(--accent-cyan))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, boxShadow: '0 0 30px var(--glow-violet)' }}>⚡</div>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: 'var(--text-primary)' }}>{name}</h2>
      <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Coming in the next batch — stay tuned!</p>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getDefaultStreak(): StreakData {
  return { currentStreak: 0, longestStreak: 0, lastStudyDate: '', totalXP: 0, studyDates: [] };
}

function updateStreakOnRecord(streak: StreakData): StreakData {
  const today = new Date().toISOString().slice(0, 10);
  if (streak.studyDates.includes(today)) return streak;

  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const newStreak = streak.lastStudyDate === yesterday || streak.lastStudyDate === today
    ? streak.currentStreak + 1
    : 1;

  return {
    currentStreak: newStreak,
    longestStreak: Math.max(streak.longestStreak, newStreak),
    lastStudyDate: today,
    totalXP: streak.totalXP + 50,
    studyDates: [...streak.studyDates, today],
  };
}

// ─── App ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [authSession, setAuthSession] = useState<AuthSession | null>(null);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [progress, setProgress] = useState<ProgressEntry[]>([]);
  const [streak, setStreak] = useState<StreakData>(getDefaultStreak());
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [loading, setLoading] = useState(true);

  // ── Restore session on mount ──
  useEffect(() => {
    const session = getCurrentSession();
    if (session) {
      setAuthSession(session);
      loadUserData(session.userId);
    }
    setLoading(false);
  }, []);

  const loadUserData = (userId: string) => {
    try {
      const savedProfile = localStorage.getItem(`prepflow_profile_${userId}`);
      if (savedProfile) setProfile(JSON.parse(savedProfile));

      const savedProgress = localStorage.getItem(`prepflow_progress_${userId}`);
      if (savedProgress) setProgress(JSON.parse(savedProgress));

      const savedStreak = localStorage.getItem(`prepflow_streak_${userId}`);
      if (savedStreak) setStreak(JSON.parse(savedStreak));
    } catch (e) {
      console.error('Failed to load user data', e);
    }
  };

  const saveProfile = (p: StudentProfile) => {
    if (!authSession) return;
    setProfile(p);
    localStorage.setItem(`prepflow_profile_${authSession.userId}`, JSON.stringify(p));
  };

  const addProgress = (entry: ProgressEntry) => {
    if (!authSession) return;
    const updated = [...progress, entry];
    setProgress(updated);
    localStorage.setItem(`prepflow_progress_${authSession.userId}`, JSON.stringify(updated));

    // Update streak & XP
    const newStreak = updateStreakOnRecord(streak);
    setStreak(newStreak);
    localStorage.setItem(`prepflow_streak_${authSession.userId}`, JSON.stringify(newStreak));
  };

  const deleteProgress = (id: string) => {
    if (!authSession) return;
    const updated = progress.filter(e => e.id !== id);
    setProgress(updated);
    localStorage.setItem(`prepflow_progress_${authSession.userId}`, JSON.stringify(updated));
  };

  const updateProgress = (entries: ProgressEntry[]) => {
    if (!authSession) return;
    setProgress(entries);
    localStorage.setItem(`prepflow_progress_${authSession.userId}`, JSON.stringify(entries));
  };

  const handleAuthSuccess = (session: AuthSession) => {
    setAuthSession(session);
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
  };

  // ── Loading spinner ──
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

  // ── Not authenticated ──
  if (!authSession) {
    return (
      <>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <AuthPage onAuthSuccess={handleAuthSuccess} />
      </>
    );
  }

  // ── Render page content ──
  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return (
          <Dashboard
            profile={profile || { name: authSession.username, level: 'IGCSE', subjects: [], targetGrade: 'A*', yearsRange: { from: 2020, to: 2024 } }}
            progress={progress}
            streak={streak}
            onNavigate={(page) => setCurrentPage(page as Page)}
          />
        );
      case 'record':
        return (
          <ProgressRecorder
            profile={profile || { name: authSession.username, level: 'IGCSE', subjects: [], targetGrade: 'A*', yearsRange: { from: 2020, to: 2024 } }}
            progress={progress}
            onAddProgress={addProgress}
            onUpdateProgress={updateProgress}
          />
        );
      case 'pending':
        return (
          <PendingPapers
            profile={profile || { name: authSession.username, level: 'IGCSE', subjects: [], targetGrade: 'A*', yearsRange: { from: 2020, to: 2024 } }}
            progress={progress}
            onUpdateProgress={updateProgress}
          />
        );
      case 'achievements':
        return (
          <GamificationPage
            progress={progress}
            streak={streak}
            username={authSession.username}
            onNavigate={(page) => setCurrentPage(page as any)}
          />
        );
      case 'grades':
        return (
          <PredictedGrades
            profile={profile || { name: authSession.username, level: 'IGCSE', subjects: [], targetGrade: 'A*', yearsRange: { from: 2020, to: 2024 } }}
            progress={progress}
            onNavigate={(page) => setCurrentPage(page as Page)}
          />
        );
      case 'settings':
        return (
          <SettingsPage
            profile={profile}
            onUpdateProfile={saveProfile}
            username={authSession.username}
          />
        );
      default:
        return <PlaceholderPage name="Dashboard" />;
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-void)' }}>
      {/* Animated background */}
      <div className="app-bg"><div className="app-bg-grid" /></div>

      {/* Sidebar */}
      <Sidebar
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        onSignOut={handleSignOut}
        username={authSession.username}
        streak={streak.currentStreak}
      />

      {/* Main content */}
      <main className="main-content page-enter">
        {renderPage()}
      </main>
    </div>
  );
}
