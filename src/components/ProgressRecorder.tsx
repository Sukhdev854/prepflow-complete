import { useState, useEffect, useRef, useCallback } from 'react';
import { StudentProfile, ProgressEntry } from '../App';
import { getSubjectByCode } from '../data/subjects';
import { getSubjectColor } from '../utils/subjectColors';
import {
  Plus, Trash2, ChevronRight, ChevronLeft, CheckCircle,
  BookOpen, Calendar, Target, Star, Zap, Search, Filter,
  TrendingUp, Clock, AlertCircle, X, LayoutGrid, List
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Props {
  profile: StudentProfile;
  progress: ProgressEntry[];
  onAddProgress: (entry: ProgressEntry) => void;
  onUpdateProgress: (entries: ProgressEntry[]) => void;
}

type Status = 'done' | 'in-progress' | 'to-mark' | 'to-review' | 'not-started';
type Difficulty = 1 | 2 | 3 | 4 | 5;

// ─── Grade Thresholds ─────────────────────────────────────────────────────────
// Real Cambridge grade threshold structure per component
// Format: { year, session, component, astar, a, b, c, d, e, max }
// We store thresholds keyed by "code_session_year_component"
export interface GradeThreshold {
  subjectCode: string;
  component: string;
  year: number;
  session: string; // m | s | w
  maxMarks: number;
  aStar?: number;
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
}

// Sample thresholds dataset — real data for popular subjects
// In production, load this from a JSON file or API
// Format: code_session_year_component → threshold
const THRESHOLDS: Record<string, GradeThreshold> = {
  // Accounting 9706 W25
  '9706_w_2025_12': { subjectCode:'9706', component:'12', year:2025, session:'w', maxMarks:30, a:22, b:18, c:15, d:12, e:10 },
  '9706_w_2025_13': { subjectCode:'9706', component:'13', year:2025, session:'w', maxMarks:30, a:23, b:18, c:15, d:13, e:11 },
  '9706_w_2025_11': { subjectCode:'9706', component:'11', year:2025, session:'w', maxMarks:30, a:24, b:19, c:16, d:14, e:12 },
  '9706_s_2025_11': { subjectCode:'9706', component:'11', year:2025, session:'s', maxMarks:30, a:21, b:16, c:14, d:12, e:11 },
  '9706_s_2025_13': { subjectCode:'9706', component:'13', year:2025, session:'s', maxMarks:30, a:21, b:16, c:14, d:12, e:11 },
  '9706_s_2025_12': { subjectCode:'9706', component:'12', year:2025, session:'s', maxMarks:30, a:22, b:18, c:15, d:13, e:11 },
  '9706_m_2025_22': { subjectCode:'9706', component:'22', year:2025, session:'m', maxMarks:30, a:22, b:18, c:15, d:13, e:11 },
};

function getThresholdKey(subjectCode: string, session: string, year: number, component: string) {
  return `${subjectCode}_${session}_${year}_${component}`;
}

export function getThreshold(subjectCode: string, session: string, year: number, component: string): GradeThreshold | null {
  return THRESHOLDS[getThresholdKey(subjectCode, session, year, component)] || null;
}

// Grade from actual thresholds
export function gradeFromThreshold(score: number, threshold: GradeThreshold): string {
  if (threshold.aStar !== undefined && score >= threshold.aStar) return 'A*';
  if (score >= threshold.a) return 'A';
  if (score >= threshold.b) return 'B';
  if (score >= threshold.c) return 'C';
  if (score >= threshold.d) return 'D';
  if (score >= threshold.e) return 'E';
  return 'U';
}

// Fallback grade from percentage
export function gradeFromPct(pct: number) {
  if (pct >= 90) return 'A*';
  if (pct >= 80) return 'A';
  if (pct >= 70) return 'B';
  if (pct >= 60) return 'C';
  if (pct >= 50) return 'D';
  if (pct >= 40) return 'E';
  return 'U';
}

export function gradeColor(g: string) {
  if (g === 'A*' || g === 'A') return 'var(--accent-emerald)';
  if (g === 'B') return 'var(--accent-cyan)';
  if (g === 'C') return 'var(--accent-amber)';
  return 'var(--accent-red)';
}

// ─── March/February components rule ──────────────────────────────────────────
// In Feb/March session, only components ending in 2 exist (12, 22, 32, 42, etc.)
function filterComponentsForSession(components: string[], session: string): string[] {
  if (session === 'm') {
    // Only allow components ending in 2 (e.g. 12, 22, 32, 42, 52, 62)
    return components.filter(c => c.endsWith('2'));
  }
  return components;
}

// ─── Confetti ─────────────────────────────────────────────────────────────────
interface Confetto { id: number; x: number; y: number; color: string; size: number; vx: number; vy: number; life: number; }

function ConfettiExplosion({ onDone }: { onDone: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const COLORS = ['#7c3aed','#06b6d4','#a855f7','#10b981','#f59e0b','#ec4899'];
    const particles: Confetto[] = Array.from({ length: 80 }, (_, i) => ({
      id: i, x: canvas.width / 2, y: canvas.height / 2,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      size: Math.random() * 8 + 4, vx: (Math.random() - 0.5) * 14,
      vy: (Math.random() - 0.7) * 14, life: 1,
    }));
    let animId: number;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;
      particles.forEach(p => {
        p.vy += 0.4; p.x += p.vx; p.y += p.vy; p.life -= 0.018;
        if (p.life > 0) {
          alive = true;
          ctx.globalAlpha = p.life;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.roundRect(p.x, p.y, p.size, p.size * 0.5, 2);
          ctx.fill();
        }
      });
      ctx.globalAlpha = 1;
      if (alive) animId = requestAnimationFrame(draw);
      else { cancelAnimationFrame(animId); onDone(); }
    };
    animId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animId);
  }, [onDone]);
  return <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9999 }} />;
}

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<Status, { label: string; color: string; bg: string; icon: string }> = {
  'done':        { label: 'Done',        color: 'var(--accent-emerald)',       bg: 'rgba(16,185,129,0.12)',  icon: '✓'  },
  'in-progress': { label: 'In Progress', color: 'var(--accent-cyan)',          bg: 'rgba(6,182,212,0.12)',   icon: '⟳'  },
  'to-mark':     { label: 'To Mark',     color: 'var(--accent-violet-bright)', bg: 'rgba(168,85,247,0.12)', icon: '📝' },
  'to-review':   { label: 'To Review',   color: 'var(--accent-amber)',         bg: 'rgba(245,158,11,0.12)', icon: '👀' },
  'not-started': { label: 'Not Started', color: 'var(--text-muted)',           bg: 'rgba(255,255,255,0.04)', icon: '○'  },
};

const DIFFICULTY_CONFIG = [
  { value: 1 as Difficulty, label: 'Very Easy', emoji: '😊', color: 'var(--accent-emerald)' },
  { value: 2 as Difficulty, label: 'Easy',      emoji: '🙂', color: '#86efac' },
  { value: 3 as Difficulty, label: 'Medium',    emoji: '😐', color: 'var(--accent-amber)' },
  { value: 4 as Difficulty, label: 'Hard',      emoji: '😰', color: '#fb923c' },
  { value: 5 as Difficulty, label: 'Very Hard', emoji: '😱', color: 'var(--accent-red)' },
];

const SESSION_LABELS: Record<string, string> = { m: 'Feb/Mar', s: 'May/June', w: 'Oct/Nov' };

interface FormState {
  subjectCode: string;
  component: string;
  year: number;
  session: 'm' | 's' | 'w';
  score: string;
  status: Status;
  difficulty: Difficulty | undefined;
}

// ─── MULTI-STEP FORM ──────────────────────────────────────────────────────────
function AddEntryModal({
  profile, progress, onAdd, onClose,
}: {
  profile: StudentProfile;
  progress: ProgressEntry[];
  onAdd: (entry: ProgressEntry) => void;
  onClose: () => void;
}) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>({
    subjectCode: '', component: '', year: 2025,
    session: 's', score: '', status: 'done', difficulty: undefined,
  });
  const [showConfetti, setShowConfetti] = useState(false);
  const [saved, setSaved] = useState(false);

  const subj = profile.subjects.find(s => s.code === form.subjectCode);
  const subjData = form.subjectCode ? getSubjectByCode(form.subjectCode) : null;
  const compData = subjData?.components.find(c => c.code === form.component);

  // Apply session-based component filtering
  const availableComponents = subjData?.components
    .filter(c => subj?.components.includes(c.code))
    .filter(c => filterComponentsForSession([c.code], form.session).length > 0) || [];

  // Year range: always 2017–2026
  const years = Array.from({ length: 2026 - 2017 + 1 }, (_, i) => 2017 + i);

  const scoreNum = parseFloat(form.score);
  const maxMarks = compData?.maxMarks ?? 100;
  const pct = !isNaN(scoreNum) && maxMarks > 0 ? Math.min((scoreNum / maxMarks) * 100, 100) : 0;

  // Use real threshold if available, else fallback to percentage
  const threshold = form.subjectCode && form.component && form.year && form.session
    ? getThreshold(form.subjectCode, form.session, form.year, form.component)
    : null;

  const grade = !isNaN(scoreNum)
    ? threshold
      ? gradeFromThreshold(scoreNum, threshold)
      : gradeFromPct(pct)
    : '';

  const color = form.subjectCode ? getSubjectColor(form.subjectCode).hex : 'var(--accent-violet)';
  const canStep1 = !!form.subjectCode;
  const canStep2 = !!form.component && !!form.year && !!form.session;
  const canStep3 = !!form.score && !isNaN(scoreNum) && scoreNum >= 0;

  // When session changes, reset component if no longer valid
  const handleSessionChange = (session: 'm' | 's' | 'w') => {
    const validComponents = filterComponentsForSession(subj?.components || [], session);
    const newComponent = validComponents.includes(form.component) ? form.component : '';
    setForm(f => ({ ...f, session, component: newComponent }));
  };

  const handleSave = () => {
    if (!canStep3 || !compData || !subj) return;
    const scoreVal = parseFloat(form.score);
    if (scoreVal > maxMarks) return;

    const entry: ProgressEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      subjectCode: form.subjectCode, component: form.component,
      year: form.year, session: form.session,
      score: scoreVal, maxScore: maxMarks,
      date: new Date().toISOString(),
      status: form.status, difficulty: form.difficulty,
    };
    onAdd(entry);
    setSaved(true);
    if (form.status === 'done') setShowConfetti(true);
    else { setTimeout(onClose, 900); }
  };

  const STEPS = ['Subject', 'Details', 'Score'];

  return (
    <>
      {showConfetti && <ConfettiExplosion onDone={onClose} />}
      <div
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 400, backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      />
      <div className="glass-bright animate-scale-in" style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '100%', maxWidth: 520,
        zIndex: 500, borderRadius: 'var(--radius-xl)',
        padding: 32,
        boxShadow: '0 32px 100px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.08)',
        maxHeight: '90vh', overflowY: 'auto',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {saved ? '🎉 Paper Logged!' : 'Log a Paper'}
            </h2>
            {!saved && <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>Step {step} of 3 — {STEPS[step - 1]}</p>}
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-dim)', borderRadius: 8, padding: 8, cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X size={16} />
          </button>
        </div>

        {/* Step progress */}
        {!saved && (
          <div style={{ display: 'flex', gap: 6, marginBottom: 28 }}>
            {STEPS.map((s, i) => (
              <div key={s} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
                <div style={{ height: 3, borderRadius: 99, background: i < step ? `linear-gradient(90deg, ${color}, var(--accent-cyan))` : 'rgba(255,255,255,0.08)', transition: 'background 0.4s' }} />
                <span style={{ fontSize: 10, color: i < step ? 'var(--text-secondary)' : 'var(--text-dim)', fontWeight: i + 1 === step ? 700 : 400 }}>{s}</span>
              </div>
            ))}
          </div>
        )}

        {/* ── Step 1: Subject ── */}
        {!saved && step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, animation: 'fade-up 0.3s both' }}>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>Choose the subject for this paper</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 280, overflowY: 'auto' }}>
              {profile.subjects.map(s => {
                const c = getSubjectColor(s.code).hex;
                const sel = form.subjectCode === s.code;
                return (
                  <button key={s.code} onClick={() => setForm(f => ({ ...f, subjectCode: s.code, component: '' }))}
                    style={{ padding: '14px 16px', borderRadius: 12, cursor: 'pointer', border: 'none', textAlign: 'left', background: sel ? `${c}18` : 'rgba(255,255,255,0.03)', outline: sel ? `2px solid ${c}` : '1px solid var(--border-dim)', transition: 'all 0.18s', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: c, boxShadow: sel ? `0 0 10px ${c}` : 'none', flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{s.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{s.code} · {s.components.length} components</div>
                    </div>
                    {sel && <CheckCircle size={16} color={c} style={{ marginLeft: 'auto' }} />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Step 2: Details ── */}
        {!saved && step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, animation: 'fade-up 0.3s both' }}>
            {/* Year + Session first, so component list updates */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>Year</label>
                <select value={form.year} onChange={e => setForm(f => ({ ...f, year: Number(e.target.value) }))} className="input-field">
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>Session</label>
                <select value={form.session} onChange={e => handleSessionChange(e.target.value as any)} className="input-field">
                  <option value="m">Feb/March (m)</option>
                  <option value="s">May/June (s)</option>
                  <option value="w">Oct/Nov (w)</option>
                </select>
              </div>
            </div>

            {/* Component */}
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>
                Component
                {form.session === 'm' && (
                  <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 400, color: 'var(--accent-amber)', textTransform: 'none' }}>
                    ⚠ Feb/March: only variant 2 papers available
                  </span>
                )}
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {availableComponents.length === 0 ? (
                  <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', fontSize: 13, color: 'var(--accent-amber)' }}>
                    No components available for this session
                  </div>
                ) : (
                  availableComponents.map(c => {
                    const sel = form.component === c.code;
                    const hasTh = !!getThreshold(form.subjectCode, form.session, form.year, c.code);
                    return (
                      <button key={c.code} onClick={() => setForm(f => ({ ...f, component: c.code }))}
                        style={{ padding: '11px 14px', borderRadius: 10, cursor: 'pointer', border: 'none', textAlign: 'left', background: sel ? `${color}18` : 'rgba(255,255,255,0.03)', outline: sel ? `2px solid ${color}` : '1px solid var(--border-dim)', transition: 'all 0.15s', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: sel ? 600 : 400 }}>
                          Paper {c.code} — {c.name}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {hasTh && <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 99, background: 'rgba(16,185,129,0.15)', color: 'var(--accent-emerald)', letterSpacing: '0.04em' }}>THRESHOLD</span>}
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>/{c.maxMarks}</span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Step 3: Score ── */}
        {!saved && step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, animation: 'fade-up 0.3s both' }}>
            {/* Live grade preview */}
            {canStep3 && grade && (
              <div style={{ padding: '16px 20px', borderRadius: 14, background: `linear-gradient(135deg, ${color}15, ${color}05)`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', overflow: 'hidden', animation: 'scale-in 0.25s both' }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 3 }}>
                    {threshold ? '📊 Based on real thresholds' : '📐 Based on percentage'}
                  </div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 800, color: gradeColor(grade) }}>{grade}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)' }}>{pct.toFixed(1)}%</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{form.score}/{maxMarks}</div>
                </div>
                <div style={{ position: 'absolute', left: 0, bottom: 0, height: 3, borderRadius: '0 0 14px 14px', background: `linear-gradient(90deg, ${color}, var(--accent-cyan))`, width: `${pct}%`, transition: 'width 0.3s' }} />
              </div>
            )}

            {/* Threshold guide */}
            {threshold && (
              <div style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-dim)' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                  Grade Thresholds — Paper {form.component} {form.year} {SESSION_LABELS[form.session]}
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {threshold.aStar && (
                    <div style={{ padding: '4px 10px', borderRadius: 8, background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', fontSize: 12, fontWeight: 700, color: 'var(--accent-emerald)' }}>
                      A* ≥{threshold.aStar}
                    </div>
                  )}
                  {[
                    { grade: 'A', val: threshold.a, color: 'var(--accent-emerald)', bg: 'rgba(16,185,129,0.1)' },
                    { grade: 'B', val: threshold.b, color: 'var(--accent-cyan)',    bg: 'rgba(6,182,212,0.1)' },
                    { grade: 'C', val: threshold.c, color: 'var(--accent-amber)',   bg: 'rgba(245,158,11,0.1)' },
                    { grade: 'D', val: threshold.d, color: '#fb923c',              bg: 'rgba(251,146,60,0.1)' },
                    { grade: 'E', val: threshold.e, color: 'var(--accent-red)',     bg: 'rgba(239,68,68,0.1)' },
                  ].map(t => (
                    <div key={t.grade} style={{ padding: '4px 10px', borderRadius: 8, background: t.bg, border: `1px solid ${t.color}40`, fontSize: 12, fontWeight: 600, color: t.color }}>
                      {t.grade} ≥{t.val}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Score input + slider */}
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>
                Score (out of {maxMarks})
              </label>
              <input
                type="number" min={0} max={maxMarks}
                value={form.score}
                onChange={e => setForm(f => ({ ...f, score: e.target.value }))}
                className="input-field" placeholder={`0 – ${maxMarks}`}
                style={{ fontSize: 20, fontWeight: 700, textAlign: 'center' }}
              />
              <div style={{ marginTop: 10 }}>
                <input
                  type="range" min={0} max={maxMarks}
                  value={isNaN(scoreNum) ? 0 : scoreNum}
                  onChange={e => setForm(f => ({ ...f, score: e.target.value }))}
                  style={{ width: '100%', accentColor: color, cursor: 'pointer', height: 4 }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-dim)', marginTop: 3 }}>
                  <span>0</span><span>{Math.round(maxMarks * 0.4)}</span><span>{Math.round(maxMarks * 0.7)}</span><span>{maxMarks}</span>
                </div>
              </div>
            </div>

            {/* Status */}
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>Status</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {(Object.entries(STATUS_CONFIG) as [Status, typeof STATUS_CONFIG[Status]][]).map(([val, cfg]) => (
                  <button key={val} onClick={() => setForm(f => ({ ...f, status: val }))}
                    style={{ padding: '8px 13px', borderRadius: 99, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none', background: form.status === val ? cfg.bg : 'rgba(255,255,255,0.04)', color: form.status === val ? cfg.color : 'var(--text-muted)', outline: form.status === val ? `2px solid ${cfg.color}60` : '1px solid var(--border-dim)', transition: 'all 0.15s' }}>
                    {cfg.icon} {cfg.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Difficulty */}
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>Difficulty (optional)</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {DIFFICULTY_CONFIG.map(d => (
                  <button key={d.value} onClick={() => setForm(f => ({ ...f, difficulty: f.difficulty === d.value ? undefined : d.value }))}
                    title={d.label}
                    style={{ flex: 1, padding: '10px 4px', borderRadius: 10, fontSize: 18, cursor: 'pointer', border: 'none', background: form.difficulty === d.value ? `${d.color}20` : 'rgba(255,255,255,0.04)', outline: form.difficulty === d.value ? `2px solid ${d.color}70` : '1px solid var(--border-dim)', transition: 'all 0.15s' }}>
                    {d.emoji}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Saved state ── */}
        {saved && (
          <div style={{ textAlign: 'center', padding: '20px 0', animation: 'scale-in 0.3s both' }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
              Paper saved!
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              {grade && grade !== 'U' ? `You scored ${grade} (${pct.toFixed(1)}%) — great work!` : 'Saved. Keep practising and you\'ll improve!'}
            </div>
            <div style={{ marginTop: 16, fontSize: 12, color: 'var(--text-muted)' }}>Closing…</div>
          </div>
        )}

        {/* ── Navigation buttons ── */}
        {!saved && (
          <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
            {step > 1 && (
              <button className="btn-ghost" onClick={() => setStep(s => s - 1)} style={{ flex: 1 }}>
                <ChevronLeft size={16} /> Back
              </button>
            )}
            {step < 3 ? (
              <button
                className="btn-primary"
                disabled={step === 1 ? !canStep1 : !canStep2}
                onClick={() => setStep(s => s + 1)}
                style={{ flex: 2, opacity: (step === 1 ? !canStep1 : !canStep2) ? 0.5 : 1 }}
              >
                <span>Continue</span> <ChevronRight size={16} />
              </button>
            ) : (
              <button
                className="btn-primary"
                disabled={!canStep3}
                onClick={handleSave}
                style={{ flex: 2, opacity: !canStep3 ? 0.5 : 1 }}
              >
                <span>Save Paper</span> <CheckCircle size={16} />
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export function ProgressRecorder({ profile, progress, onAddProgress, onUpdateProgress }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  const [filterSubject, setFilterSubject] = useState('all');
  const [filterStatus, setFilterStatus] = useState<Status | 'all'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'score' | 'subject'>('date');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  const handleAdd = (entry: ProgressEntry) => {
    onAddProgress(entry);
  };

  const handleDelete = (id: string) => onUpdateProgress(progress.filter(e => e.id !== id));

  const filtered = progress
    .filter(e => {
      const subj = profile.subjects.find(s => s.code === e.subjectCode);
      if (!subj) return false;
      if (filterSubject !== 'all' && e.subjectCode !== filterSubject) return false;
      if (filterStatus !== 'all' && e.status !== filterStatus) return false;
      if (search) {
        const q = search.toLowerCase();
        return subj.name.toLowerCase().includes(q) || e.component.includes(q) || String(e.year).includes(q);
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'date') return new Date(b.date).getTime() - new Date(a.date).getTime();
      if (sortBy === 'score') return (b.score / b.maxScore) - (a.score / a.maxScore);
      return a.subjectCode.localeCompare(b.subjectCode);
    });

  const bySubject = profile.subjects.map(s => {
    const sp = progress.filter(p => p.subjectCode === s.code);
    const done = sp.filter(p => p.status === 'done');
    const avgPct = done.length > 0
      ? (done.reduce((acc, p) => acc + p.score, 0) / done.reduce((acc, p) => acc + p.maxScore, 0)) * 100 : 0;
    return { ...s, count: sp.length, done: done.length, avgPct, color: getSubjectColor(s.code).hex };
  });

  const getEntryGrade = (entry: ProgressEntry) => {
    const pct = entry.maxScore > 0 ? (entry.score / entry.maxScore) * 100 : 0;
    const threshold = getThreshold(entry.subjectCode, entry.session, entry.year, entry.component);
    return threshold ? gradeFromThreshold(entry.score, threshold) : gradeFromPct(pct);
  };

  return (
    <div style={{ padding: '32px 28px', display: 'flex', flexDirection: 'column', gap: 28, maxWidth: 1100 }}>

      {/* ── Header ── */}
      <div className="animate-fade-up" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.5rem,3vw,2rem)', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Record Progress
          </h1>
          <p style={{ color: 'var(--text-muted)', marginTop: 4, fontSize: 14 }}>
            {progress.length} papers logged · {progress.filter(p => p.status === 'done').length} completed
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-dim)', borderRadius: 10, padding: 4, gap: 4 }}>
            {(['list', 'grid'] as const).map(mode => (
              <button key={mode} onClick={() => setViewMode(mode)}
                style={{ padding: '7px 12px', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none', transition: 'all 0.2s', background: viewMode === mode ? 'linear-gradient(135deg, var(--accent-violet), #6d28d9)' : 'transparent', color: viewMode === mode ? '#fff' : 'var(--text-muted)', boxShadow: viewMode === mode ? '0 0 16px var(--glow-violet)' : 'none', display: 'flex', alignItems: 'center', gap: 5 }}>
                {mode === 'list' ? <List size={14} /> : <LayoutGrid size={14} />}
                {mode === 'list' ? 'List' : 'Grid'}
              </button>
            ))}
          </div>
          <button className="btn-primary" onClick={() => setShowModal(true)} style={{ padding: '12px 22px' }}>
            <Plus size={16} /> <span>Log a Paper</span>
          </button>
        </div>
      </div>

      {/* ── Subject summary chips ── */}
      {bySubject.length > 0 && (
        <div className="animate-fade-up stagger-1" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {bySubject.map((s, i) => (
            <div key={s.code}
              style={{ padding: '10px 16px', borderRadius: 12, cursor: 'pointer', background: filterSubject === s.code ? `${s.color}18` : 'rgba(255,255,255,0.03)', border: `1px solid ${filterSubject === s.code ? s.color + '50' : 'var(--border-dim)'}`, transition: 'all 0.2s', animation: `fade-up 0.4s ${0.04 * i}s both` }}
              onClick={() => setFilterSubject(filterSubject === s.code ? 'all' : s.code)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.color }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{s.name.split(' ')[0]}</span>
                <span className={`badge ${s.done > 0 ? 'badge-emerald' : 'badge-violet'}`} style={{ fontSize: 10, padding: '1px 7px' }}>
                  {s.done}/{s.count}
                </span>
                {s.done > 0 && (
                  <span style={{ fontSize: 11, fontWeight: 700, color: gradeColor(gradeFromPct(s.avgPct)) }}>
                    {gradeFromPct(s.avgPct)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Filters bar ── */}
      {progress.length > 0 && (
        <div className="glass animate-fade-up stagger-2" style={{ padding: '14px 18px', borderRadius: 'var(--radius-md)', display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '1 1 200px', minWidth: 160 }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search papers..." className="input-field" style={{ paddingLeft: 34, padding: '9px 12px 9px 34px' }} />
          </div>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)} className="input-field" style={{ flex: '0 0 auto', width: 'auto', padding: '9px 12px', fontSize: 13 }}>
            <option value="all">All Statuses</option>
            {Object.entries(STATUS_CONFIG).map(([val, cfg]) => (
              <option key={val} value={val}>{cfg.icon} {cfg.label}</option>
            ))}
          </select>
          <select value={sortBy} onChange={e => setSortBy(e.target.value as any)} className="input-field" style={{ flex: '0 0 auto', width: 'auto', padding: '9px 12px', fontSize: 13 }}>
            <option value="date">Sort: Date</option>
            <option value="score">Sort: Score</option>
            <option value="subject">Sort: Subject</option>
          </select>
          {(filterSubject !== 'all' || filterStatus !== 'all' || search) && (
            <button className="btn-ghost" style={{ padding: '8px 12px', fontSize: 12 }}
              onClick={() => { setFilterSubject('all'); setFilterStatus('all'); setSearch(''); }}>
              <X size={13} /> Clear
            </button>
          )}
          <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 'auto' }}>
            {filtered.length} result{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* ── Entry list / grid ── */}
      {filtered.length > 0 ? (
        viewMode === 'list' ? (
          <div className="glass glow-card animate-fade-up stagger-3" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
            {filtered.map((entry, i) => {
              const subj = profile.subjects.find(s => s.code === entry.subjectCode);
              const color = getSubjectColor(entry.subjectCode).hex;
              const pct = entry.maxScore > 0 ? (entry.score / entry.maxScore) * 100 : 0;
              const grade = getEntryGrade(entry);
              const status = STATUS_CONFIG[entry.status as Status] || STATUS_CONFIG['done'];
              return (
                <div key={entry.id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 20px', borderBottom: i < filtered.length - 1 ? '1px solid var(--border-dim)' : 'none', transition: 'background 0.15s', animation: `fade-up 0.35s ${Math.min(i * 0.03, 0.25)}s both` }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.025)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <div style={{ width: 4, height: 40, borderRadius: 99, background: color, flexShrink: 0, boxShadow: `0 0 8px ${color}80` }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{subj?.name || entry.subjectCode}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Paper {entry.component}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{entry.year} · {SESSION_LABELS[entry.session] || entry.session}</span>
                      <span style={{ padding: '2px 8px', borderRadius: 99, fontSize: 10, fontWeight: 600, background: status.bg, color: status.color }}>{status.icon} {status.label}</span>
                    </div>
                    <div style={{ width: '100%', maxWidth: 200 }}>
                      <div className="progress-track" style={{ height: 4 }}>
                        <div className="progress-fill" style={{ width: `${pct}%`, background: pct >= 70 ? 'var(--accent-emerald)' : pct >= 50 ? 'var(--accent-amber)' : 'var(--accent-red)' }} />
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 800, color: gradeColor(grade) }}>{grade}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{entry.score}/{entry.maxScore} ({pct.toFixed(0)}%)</div>
                    <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 2 }}>{new Date(entry.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })}</div>
                  </div>
                  <button onClick={() => handleDelete(entry.id)}
                    style={{ background: 'none', border: '1px solid transparent', borderRadius: 8, padding: 8, cursor: 'pointer', color: 'var(--text-dim)', transition: 'all 0.15s', flexShrink: 0 }}
                    onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent-red)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.2)'; e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-dim)'; e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.background = 'none'; }}>
                    <Trash2 size={15} />
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          /* ── GRID VIEW (fixed) ── */
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
            {filtered.map((entry, i) => {
              const subj = profile.subjects.find(s => s.code === entry.subjectCode);
              const color = getSubjectColor(entry.subjectCode).hex;
              const pct = entry.maxScore > 0 ? (entry.score / entry.maxScore) * 100 : 0;
              const grade = getEntryGrade(entry);
              const status = STATUS_CONFIG[entry.status as Status] || STATUS_CONFIG['done'];
              const diffCfg = entry.difficulty ? DIFFICULTY_CONFIG[entry.difficulty - 1] : null;
              return (
                <div key={entry.id}
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border-dim)', borderRadius: 14, overflow: 'hidden', transition: 'transform 0.2s, box-shadow 0.2s', cursor: 'default', animation: `fade-up 0.35s ${Math.min(i * 0.03, 0.3)}s both`, boxShadow: '0 2px 12px rgba(0,0,0,0.3)' }}
                  onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.transform = 'translateY(-3px)'; el.style.boxShadow = `0 8px 28px rgba(0,0,0,0.4), 0 0 0 1px ${color}30`; }}
                  onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.transform = 'translateY(0)'; el.style.boxShadow = '0 2px 12px rgba(0,0,0,0.3)'; }}
                >
                  <div style={{ height: 4, background: `linear-gradient(90deg, ${color}, ${color}50)` }} />
                  <div style={{ padding: '14px 14px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {subj?.name?.split(' ').slice(0, 3).join(' ') || entry.subjectCode}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                          Paper {entry.component} · {entry.year} · {(SESSION_LABELS[entry.session] || entry.session).slice(0, 3)}
                        </div>
                      </div>
                      <div style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0, marginLeft: 8, background: `${color}18`, border: `1px solid ${color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 800, color: gradeColor(grade), lineHeight: 1 }}>{grade}</span>
                      </div>
                    </div>
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>
                        <span>{entry.score}/{entry.maxScore}</span>
                        <span style={{ fontWeight: 600, color: pct >= 70 ? 'var(--accent-emerald)' : pct >= 50 ? 'var(--accent-amber)' : 'var(--accent-red)' }}>{pct.toFixed(0)}%</span>
                      </div>
                      <div className="progress-track" style={{ height: 5 }}>
                        <div className="progress-fill" style={{ width: `${pct}%`, background: pct >= 70 ? 'var(--accent-emerald)' : pct >= 50 ? 'var(--accent-amber)' : 'var(--accent-red)' }} />
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ padding: '3px 8px', borderRadius: 99, fontSize: 10, fontWeight: 600, background: status.bg, color: status.color }}>
                        {status.icon} {status.label}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {diffCfg && <span title={diffCfg.label} style={{ fontSize: 14 }}>{diffCfg.emoji}</span>}
                        <button onClick={() => handleDelete(entry.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', padding: 2, transition: 'color 0.15s', lineHeight: 1 }}
                          onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent-red)')}
                          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-dim)')}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                    <div style={{ fontSize: 9, color: 'var(--text-dim)', marginTop: 8 }}>
                      Logged {new Date(entry.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        <div className="glass animate-fade-up stagger-3" style={{ padding: '60px 24px', textAlign: 'center', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📝</div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', color: 'var(--text-primary)', marginBottom: 8 }}>
            {progress.length === 0 ? 'No papers logged yet' : 'No papers match your filter'}
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 20 }}>
            {progress.length === 0 ? 'Start by logging your first past paper above' : 'Try clearing the filters to see all your papers'}
          </p>
          {progress.length === 0 && (
            <button className="btn-primary" onClick={() => setShowModal(true)}>
              <Plus size={16} /> <span>Log First Paper</span>
            </button>
          )}
        </div>
      )}

      {showModal && (
        <AddEntryModal
          profile={profile}
          progress={progress}
          onAdd={handleAdd}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
