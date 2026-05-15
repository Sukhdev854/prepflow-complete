import { useState, useRef, useCallback } from 'react';
import { StudentProfile, ProgressEntry } from '../App';
import { getSubjectByCode } from '../data/subjects';
import { getSubjectColor } from '../utils/subjectColors';
import {
  Plus, Trash2, ChevronRight, ChevronLeft, CheckCircle,
  BookOpen, Search, TrendingUp, X, LayoutGrid, List, ArrowLeft
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
export interface GradeThreshold {
  subjectCode: string; component: string; year: number; session: string;
  maxMarks: number; aStar?: number; a: number; b: number; c: number; d: number; e: number;
}

const THRESHOLDS: Record<string, GradeThreshold> = {
  '9706_w_2025_12': { subjectCode:'9706', component:'12', year:2025, session:'w', maxMarks:30, a:22, b:18, c:15, d:12, e:10 },
  '9706_w_2025_13': { subjectCode:'9706', component:'13', year:2025, session:'w', maxMarks:30, a:23, b:18, c:15, d:13, e:11 },
  '9706_w_2025_11': { subjectCode:'9706', component:'11', year:2025, session:'w', maxMarks:30, a:24, b:19, c:16, d:14, e:12 },
  '9706_s_2025_11': { subjectCode:'9706', component:'11', year:2025, session:'s', maxMarks:30, a:21, b:16, c:14, d:12, e:11 },
  '9706_s_2025_13': { subjectCode:'9706', component:'13', year:2025, session:'s', maxMarks:30, a:21, b:16, c:14, d:12, e:11 },
  '9706_s_2025_12': { subjectCode:'9706', component:'12', year:2025, session:'s', maxMarks:30, a:22, b:18, c:15, d:13, e:11 },
  '9706_m_2025_22': { subjectCode:'9706', component:'22', year:2025, session:'m', maxMarks:30, a:22, b:18, c:15, d:13, e:11 },
  '9609_w_2025_11': { subjectCode:'9609', component:'11', year:2025, session:'w', maxMarks:30, a:22, b:17, c:14, d:12, e:10 },
  '9609_w_2025_12': { subjectCode:'9609', component:'12', year:2025, session:'w', maxMarks:30, a:21, b:16, c:13, d:11, e:9 },
  '9708_w_2025_11': { subjectCode:'9708', component:'11', year:2025, session:'w', maxMarks:30, a:24, b:19, c:16, d:14, e:12 },
  '9709_w_2025_11': { subjectCode:'9709', component:'11', year:2025, session:'w', maxMarks:75, aStar:65, a:55, b:45, c:37, d:29, e:22 },
};

export function getThreshold(subjectCode: string, session: string, year: number, component: string): GradeThreshold | null {
  return THRESHOLDS[`${subjectCode}_${session}_${year}_${component}`] || null;
}

export function gradeFromThreshold(score: number, t: GradeThreshold): string {
  if (t.aStar !== undefined && score >= t.aStar) return 'A*';
  if (score >= t.a) return 'A';
  if (score >= t.b) return 'B';
  if (score >= t.c) return 'C';
  if (score >= t.d) return 'D';
  if (score >= t.e) return 'E';
  return 'U';
}

export function gradeFromPct(pct: number): string {
  if (pct >= 90) return 'A*';
  if (pct >= 80) return 'A';
  if (pct >= 70) return 'B';
  if (pct >= 60) return 'C';
  if (pct >= 50) return 'D';
  if (pct >= 40) return 'E';
  return 'U';
}

export function gradeColor(g: string): string {
  if (g === 'A*' || g === 'A') return 'var(--accent-emerald)';
  if (g === 'B') return 'var(--accent-cyan)';
  if (g === 'C') return 'var(--accent-amber)';
  return 'var(--accent-red)';
}

// ─── Feb/March: only variant-2 components (ending in 2) ─────────────────────
function filterComponentsForSession(components: string[], session: string): string[] {
  if (session === 'm') return components.filter(c => c.endsWith('2'));
  return components;
}

// ─── Confetti ─────────────────────────────────────────────────────────────────
function ConfettiExplosion({ onDone }: { onDone: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const doneRef = useRef(false);
  useCallback(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    const COLORS = ['#7c3aed','#06b6d4','#a855f7','#10b981','#f59e0b','#ec4899'];
    const particles = Array.from({ length: 90 }, (_, i) => ({
      id: i, x: canvas.width / 2, y: canvas.height / 2,
      color: COLORS[i % COLORS.length],
      size: Math.random() * 8 + 4, vx: (Math.random() - 0.5) * 16,
      vy: (Math.random() - 0.8) * 14, life: 1,
    }));
    let animId: number;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;
      particles.forEach(p => {
        p.vy += 0.45; p.x += p.vx; p.y += p.vy; p.life -= 0.016;
        if (p.life > 0) { alive = true; ctx.globalAlpha = p.life; ctx.fillStyle = p.color; ctx.beginPath(); ctx.roundRect(p.x, p.y, p.size, p.size * 0.5, 2); ctx.fill(); }
      });
      ctx.globalAlpha = 1;
      if (alive) { animId = requestAnimationFrame(draw); }
      else if (!doneRef.current) { doneRef.current = true; onDone(); }
    };
    animId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animId);
  }, [onDone])();
  return <canvas ref={canvasRef} style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:9999 }} />;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<Status, { label: string; color: string; bg: string; icon: string }> = {
  'done':        { label:'Done',        color:'var(--accent-emerald)',       bg:'rgba(16,185,129,0.12)',  icon:'✓'  },
  'in-progress': { label:'In Progress', color:'var(--accent-cyan)',          bg:'rgba(6,182,212,0.12)',   icon:'⟳'  },
  'to-mark':     { label:'To Mark',     color:'var(--accent-violet-bright)', bg:'rgba(168,85,247,0.12)', icon:'📝' },
  'to-review':   { label:'To Review',   color:'var(--accent-amber)',         bg:'rgba(245,158,11,0.12)', icon:'👀' },
  'not-started': { label:'Not Started', color:'var(--text-muted)',           bg:'rgba(255,255,255,0.04)', icon:'○'  },
};

const DIFFICULTY_CONFIG = [
  { value:1 as Difficulty, label:'Very Easy', emoji:'😊', color:'var(--accent-emerald)' },
  { value:2 as Difficulty, label:'Easy',      emoji:'🙂', color:'#86efac' },
  { value:3 as Difficulty, label:'Medium',    emoji:'😐', color:'var(--accent-amber)' },
  { value:4 as Difficulty, label:'Hard',      emoji:'😰', color:'#fb923c' },
  { value:5 as Difficulty, label:'Very Hard', emoji:'😱', color:'var(--accent-red)' },
];

const SESSION_LABELS: Record<string, string> = { m:'Feb/Mar', s:'May/Jun', w:'Oct/Nov' };
const YEARS = Array.from({ length: 2026 - 2017 + 1 }, (_, i) => 2017 + i);

// ─── LOG PAPER PAGE (replaces modal) ─────────────────────────────────────────
function LogPaperPage({
  profile, onAdd, onBack,
}: {
  profile: StudentProfile;
  onAdd: (entry: ProgressEntry) => void;
  onBack: () => void;
}) {
  const [step, setStep] = useState(1);
  const [subjectCode, setSubjectCode] = useState('');
  const [component, setComponent]     = useState('');
  const [year, setYear]               = useState(2025);
  const [session, setSession]         = useState<'m'|'s'|'w'>('s');
  const [score, setScore]             = useState('');
  const [status, setStatus]           = useState<Status>('done');
  const [difficulty, setDifficulty]   = useState<Difficulty | undefined>(undefined);
  const [showConfetti, setShowConfetti] = useState(false);
  const [saved, setSaved]             = useState(false);

  const subj     = profile.subjects.find(s => s.code === subjectCode);
  const subjData = subjectCode ? getSubjectByCode(subjectCode) : null;
  const compData = subjData?.components.find(c => c.code === component);

  // Feb/March: only variant-2 components
  const availableComponents = subjData?.components
    .filter(c => subj?.components.includes(c.code))
    .filter(c => filterComponentsForSession([c.code], session).length > 0) || [];

  const handleSessionChange = (s: 'm'|'s'|'w') => {
    const valid = filterComponentsForSession(subj?.components || [], s);
    setSession(s);
    if (!valid.includes(component)) setComponent('');
  };

  const scoreNum = parseFloat(score);
  const maxMarks = compData?.maxMarks ?? 100;
  const pct = !isNaN(scoreNum) && maxMarks > 0 ? Math.min((scoreNum / maxMarks) * 100, 100) : 0;
  const threshold = subjectCode && component && year && session
    ? getThreshold(subjectCode, session, year, component) : null;
  const grade = !isNaN(scoreNum)
    ? threshold ? gradeFromThreshold(scoreNum, threshold) : gradeFromPct(pct)
    : '';
  const color = subjectCode ? getSubjectColor(subjectCode).hex : 'var(--accent-violet)';

  const canStep1 = !!subjectCode;
  const canStep2 = !!component && !!year && !!session;
  const canStep3 = !!score && !isNaN(scoreNum) && scoreNum >= 0 && scoreNum <= maxMarks;

  const handleSave = () => {
    if (!canStep3 || !compData || !subj) return;
    const entry: ProgressEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      subjectCode, component, year, session,
      score: scoreNum, maxScore: maxMarks,
      date: new Date().toISOString(),
      status, difficulty,
    };
    onAdd(entry);
    setSaved(true);
    if (status === 'done') setShowConfetti(true);
    else setTimeout(onBack, 900);
  };

  const STEP_LABELS = ['Subject', 'Details', 'Score'];

  if (saved) {
    return (
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:'60vh', gap:16, padding:32, textAlign:'center' }}>
        {showConfetti && <ConfettiExplosion onDone={onBack} />}
        <div style={{ fontSize:72 }}>🎉</div>
        <h2 style={{ fontFamily:'var(--font-display)', fontSize:'1.8rem', fontWeight:800, color:'var(--text-primary)' }}>Paper Logged!</h2>
        {grade && (
          <div style={{ fontFamily:'var(--font-display)', fontSize:'3rem', fontWeight:900, color:gradeColor(grade) }}>{grade}</div>
        )}
        <p style={{ color:'var(--text-muted)', fontSize:14 }}>{score}/{maxMarks} · {pct.toFixed(1)}%</p>
        <button className="btn-primary" onClick={onBack} style={{ marginTop:8, padding:'12px 28px' }}>
          <ArrowLeft size={15} /> Back to Progress
        </button>
      </div>
    );
  }

  return (
    <div className="log-paper-page">
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:14 }}>
        <button className="btn-ghost" onClick={onBack} style={{ padding:'10px 14px', display:'flex', alignItems:'center', gap:6 }}>
          <ArrowLeft size={15} /> Back
        </button>
        <div>
          <h1 style={{ fontFamily:'var(--font-display)', fontSize:'1.6rem', fontWeight:800, color:'var(--text-primary)', letterSpacing:'-0.02em' }}>
            Log a Paper
          </h1>
          <p style={{ color:'var(--text-muted)', fontSize:13 }}>Step {step} of 3 — {STEP_LABELS[step-1]}</p>
        </div>
      </div>

      {/* Step progress bar */}
      <div style={{ display:'flex', gap:6 }}>
        {STEP_LABELS.map((label, i) => (
          <div key={label} style={{ flex:1, display:'flex', flexDirection:'column', gap:5 }}>
            <div style={{ height:3, borderRadius:99, background: i < step ? `linear-gradient(90deg, ${color}, var(--accent-cyan))` : 'rgba(255,255,255,0.08)', transition:'background 0.4s' }} />
            <span style={{ fontSize:10, color: i < step ? 'var(--text-secondary)' : 'var(--text-dim)', fontWeight: i+1 === step ? 700 : 400 }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Card */}
      <div className="glass-bright" style={{ borderRadius:'var(--radius-xl)', padding:28, boxShadow:'0 8px 40px rgba(0,0,0,0.4)' }}>

        {/* ── Step 1: Subject ── */}
        {step === 1 && (
          <div style={{ display:'flex', flexDirection:'column', gap:10, animation:'fade-up 0.3s both' }}>
            <p style={{ fontSize:14, fontWeight:600, color:'var(--text-primary)', marginBottom:4 }}>Choose the subject for this paper</p>
            {profile.subjects.map(s => {
              const c = getSubjectColor(s.code).hex;
              const sel = subjectCode === s.code;
              return (
                <button key={s.code} onClick={() => { setSubjectCode(s.code); setComponent(''); }}
                  style={{ padding:'14px 16px', borderRadius:12, cursor:'pointer', border:'none', textAlign:'left', background: sel ? `${c}18` : 'rgba(255,255,255,0.03)', outline: sel ? `2px solid ${c}` : '1px solid var(--border-dim)', transition:'all 0.15s', display:'flex', alignItems:'center', gap:12 }}>
                  <div style={{ width:10, height:10, borderRadius:'50%', background:c, boxShadow: sel ? `0 0 10px ${c}` : 'none', flexShrink:0 }} />
                  <div>
                    <div style={{ fontSize:14, fontWeight:600, color:'var(--text-primary)' }}>{s.name}</div>
                    <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:1 }}>{s.code} · {s.components.length} components</div>
                  </div>
                  {sel && <CheckCircle size={16} color={c} style={{ marginLeft:'auto' }} />}
                </button>
              );
            })}
          </div>
        )}

        {/* ── Step 2: Details ── */}
        {step === 2 && (
          <div style={{ display:'flex', flexDirection:'column', gap:16, animation:'fade-up 0.3s both' }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <div>
                <label style={{ display:'block', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--text-muted)', marginBottom:8 }}>Year</label>
                <select value={year} onChange={e => setYear(Number(e.target.value))} className="input-field">
                  {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display:'block', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--text-muted)', marginBottom:8 }}>Session</label>
                <select value={session} onChange={e => handleSessionChange(e.target.value as any)} className="input-field">
                  <option value="m">Feb/March (m)</option>
                  <option value="s">May/June (s)</option>
                  <option value="w">Oct/Nov (w)</option>
                </select>
              </div>
            </div>

            <div>
              <label style={{ display:'block', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--text-muted)', marginBottom:8 }}>
                Component
                {session === 'm' && <span style={{ marginLeft:8, fontSize:10, fontWeight:400, color:'var(--accent-amber)', textTransform:'none' }}>⚠ Feb/March: only variant 2 papers</span>}
              </label>
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {availableComponents.length === 0 ? (
                  <div style={{ padding:'12px 14px', borderRadius:10, background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.2)', fontSize:13, color:'var(--accent-amber)' }}>
                    No components available for this session
                  </div>
                ) : availableComponents.map(c => {
                  const sel = component === c.code;
                  const hasTh = !!getThreshold(subjectCode, session, year, c.code);
                  return (
                    <button key={c.code} onClick={() => setComponent(c.code)}
                      style={{ padding:'11px 14px', borderRadius:10, cursor:'pointer', border:'none', textAlign:'left', background: sel ? `${color}18` : 'rgba(255,255,255,0.03)', outline: sel ? `2px solid ${color}` : '1px solid var(--border-dim)', transition:'all 0.15s', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <span style={{ fontSize:13, color:'var(--text-primary)', fontWeight: sel ? 600 : 400 }}>Paper {c.code} — {c.name}</span>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        {hasTh && <span style={{ fontSize:9, fontWeight:700, padding:'2px 6px', borderRadius:99, background:'rgba(16,185,129,0.15)', color:'var(--accent-emerald)', letterSpacing:'0.04em' }}>THRESHOLD</span>}
                        <span style={{ fontSize:11, color:'var(--text-muted)' }}>/{c.maxMarks}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── Step 3: Score ── */}
        {step === 3 && (
          <div style={{ display:'flex', flexDirection:'column', gap:20, animation:'fade-up 0.3s both' }}>
            {/* Live grade preview */}
            {canStep3 && grade && (
              <div style={{ padding:'16px 20px', borderRadius:14, background:`linear-gradient(135deg, ${color}15, ${color}05)`, border:`1px solid ${color}30`, display:'flex', alignItems:'center', justifyContent:'space-between', position:'relative', overflow:'hidden' }}>
                <div>
                  <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:3 }}>{threshold ? '📊 Based on real thresholds' : '📐 Based on percentage'}</div>
                  <div style={{ fontFamily:'var(--font-display)', fontSize:'2.2rem', fontWeight:900, color:gradeColor(grade) }}>{grade}</div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontFamily:'var(--font-display)', fontSize:'1.4rem', fontWeight:700, color:'var(--text-primary)' }}>{pct.toFixed(1)}%</div>
                  <div style={{ fontSize:12, color:'var(--text-muted)' }}>{score}/{maxMarks}</div>
                </div>
                <div style={{ position:'absolute', left:0, bottom:0, height:3, borderRadius:'0 0 14px 14px', background:`linear-gradient(90deg, ${color}, var(--accent-cyan))`, width:`${pct}%`, transition:'width 0.3s' }} />
              </div>
            )}

            {/* Threshold guide */}
            {threshold && (
              <div style={{ padding:'12px 16px', borderRadius:12, background:'rgba(255,255,255,0.03)', border:'1px solid var(--border-dim)' }}>
                <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', marginBottom:8, letterSpacing:'0.05em', textTransform:'uppercase' }}>
                  Thresholds — Paper {component} {year} {SESSION_LABELS[session]}
                </div>
                <div style={{ display:'flex', gap:7, flexWrap:'wrap' }}>
                  {threshold.aStar !== undefined && (
                    <div style={{ padding:'4px 10px', borderRadius:8, background:'rgba(16,185,129,0.15)', border:'1px solid rgba(16,185,129,0.3)', fontSize:12, fontWeight:700, color:'var(--accent-emerald)' }}>A* ≥{threshold.aStar}</div>
                  )}
                  {[{g:'A',v:threshold.a,c:'var(--accent-emerald)',bg:'rgba(16,185,129,0.1)'},{g:'B',v:threshold.b,c:'var(--accent-cyan)',bg:'rgba(6,182,212,0.1)'},{g:'C',v:threshold.c,c:'var(--accent-amber)',bg:'rgba(245,158,11,0.1)'},{g:'D',v:threshold.d,c:'#fb923c',bg:'rgba(251,146,60,0.1)'},{g:'E',v:threshold.e,c:'var(--accent-red)',bg:'rgba(239,68,68,0.1)'}].map(t => (
                    <div key={t.g} style={{ padding:'4px 10px', borderRadius:8, background:t.bg, border:`1px solid ${t.c}40`, fontSize:12, fontWeight:600, color:t.c }}>{t.g} ≥{t.v}</div>
                  ))}
                </div>
              </div>
            )}

            {/* Score input */}
            <div>
              <label style={{ display:'block', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--text-muted)', marginBottom:8 }}>
                Score (out of {maxMarks})
              </label>
              <input type="number" min={0} max={maxMarks} value={score} onChange={e => setScore(e.target.value)} className="input-field" placeholder={`0 – ${maxMarks}`}
                style={{ fontSize:22, fontWeight:700, textAlign:'center' }} autoFocus />
              <input type="range" min={0} max={maxMarks} value={isNaN(scoreNum) ? 0 : scoreNum} onChange={e => setScore(e.target.value)}
                style={{ width:'100%', accentColor:color, cursor:'pointer', marginTop:10 }} />
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'var(--text-dim)', marginTop:2 }}>
                <span>0</span><span>{Math.round(maxMarks*0.5)}</span><span>{maxMarks}</span>
              </div>
            </div>

            {/* Status */}
            <div>
              <label style={{ display:'block', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--text-muted)', marginBottom:8 }}>Status</label>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                {(Object.entries(STATUS_CONFIG) as [Status, typeof STATUS_CONFIG[Status]][]).map(([val, cfg]) => (
                  <button key={val} onClick={() => setStatus(val)}
                    style={{ padding:'8px 13px', borderRadius:99, fontSize:12, fontWeight:600, cursor:'pointer', border:'none', background: status===val ? cfg.bg : 'rgba(255,255,255,0.04)', color: status===val ? cfg.color : 'var(--text-muted)', outline: status===val ? `2px solid ${cfg.color}60` : '1px solid var(--border-dim)', transition:'all 0.15s' }}>
                    {cfg.icon} {cfg.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Difficulty */}
            <div>
              <label style={{ display:'block', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--text-muted)', marginBottom:8 }}>Difficulty (optional)</label>
              <div style={{ display:'flex', gap:6 }}>
                {DIFFICULTY_CONFIG.map(d => (
                  <button key={d.value} onClick={() => setDifficulty(difficulty===d.value ? undefined : d.value)} title={d.label}
                    style={{ flex:1, padding:'10px 4px', borderRadius:10, fontSize:18, cursor:'pointer', border:'none', background: difficulty===d.value ? `${d.color}20` : 'rgba(255,255,255,0.04)', outline: difficulty===d.value ? `2px solid ${d.color}70` : '1px solid var(--border-dim)', transition:'all 0.15s' }}>
                    {d.emoji}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Nav buttons */}
        <div style={{ display:'flex', gap:10, marginTop:24 }}>
          {step > 1 && (
            <button className="btn-ghost" onClick={() => setStep(s => s-1)} style={{ flex:1 }}>
              <ChevronLeft size={16} /> Back
            </button>
          )}
          {step < 3 ? (
            <button className="btn-primary" disabled={step===1 ? !canStep1 : !canStep2} onClick={() => setStep(s => s+1)}
              style={{ flex:2, opacity:(step===1?!canStep1:!canStep2)?0.5:1 }}>
              Continue <ChevronRight size={16} />
            </button>
          ) : (
            <button className="btn-primary" disabled={!canStep3} onClick={handleSave} style={{ flex:2, opacity:!canStep3?0.5:1 }}>
              Save Paper <CheckCircle size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export function ProgressRecorder({ profile, progress, onAddProgress, onUpdateProgress }: Props) {
  const [showLogPage, setShowLogPage] = useState(false);
  const [search, setSearch]           = useState('');
  const [filterSubject, setFilterSubject] = useState('all');
  const [filterStatus,  setFilterStatus]  = useState<Status | 'all'>('all');
  const [sortBy, setSortBy]           = useState<'date'|'score'|'subject'>('date');
  const [viewMode, setViewMode]       = useState<'list'|'grid'>('list');

  const getEntryGrade = (entry: ProgressEntry) => {
    const pct = entry.maxScore > 0 ? (entry.score / entry.maxScore) * 100 : 0;
    const th = getThreshold(entry.subjectCode, entry.session, entry.year, entry.component);
    return th ? gradeFromThreshold(entry.score, th) : gradeFromPct(pct);
  };

  const filtered = progress
    .filter(e => {
      const subj = profile.subjects.find(s => s.code === e.subjectCode);
      if (!subj) return false;
      if (filterSubject !== 'all' && e.subjectCode !== filterSubject) return false;
      if (filterStatus  !== 'all' && e.status !== filterStatus) return false;
      if (search) {
        const q = search.toLowerCase();
        return subj.name.toLowerCase().includes(q) || e.component.includes(q) || String(e.year).includes(q);
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'date')    return new Date(b.date).getTime() - new Date(a.date).getTime();
      if (sortBy === 'score')   return (b.score/b.maxScore) - (a.score/a.maxScore);
      return a.subjectCode.localeCompare(b.subjectCode);
    });

  const bySubject = profile.subjects.map(s => {
    const sp   = progress.filter(p => p.subjectCode === s.code);
    const done = sp.filter(p => p.status === 'done');
    const avgPct = done.length > 0
      ? (done.reduce((acc,p) => acc+p.score,0) / done.reduce((acc,p) => acc+p.maxScore,0)) * 100 : 0;
    return { ...s, count:sp.length, done:done.length, avgPct, color:getSubjectColor(s.code).hex };
  });

  if (showLogPage) {
    return (
      <LogPaperPage
        profile={profile}
        onAdd={entry => { onAddProgress(entry); setShowLogPage(false); }}
        onBack={() => setShowLogPage(false)}
      />
    );
  }

  return (
    <div style={{ padding:'32px 28px', display:'flex', flexDirection:'column', gap:24, maxWidth:1100 }}>

      {/* Header */}
      <div className="animate-fade-up" style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:16 }}>
        <div>
          <h1 style={{ fontFamily:'var(--font-display)', fontSize:'clamp(1.5rem,3vw,2rem)', fontWeight:800, color:'var(--text-primary)', letterSpacing:'-0.02em' }}>
            Record Progress
          </h1>
          <p style={{ color:'var(--text-muted)', marginTop:4, fontSize:14 }}>
            {progress.length} papers logged · {progress.filter(p=>p.status==='done').length} completed
          </p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <div style={{ display:'flex', background:'rgba(255,255,255,0.04)', border:'1px solid var(--border-dim)', borderRadius:10, padding:4, gap:4 }}>
            {(['list','grid'] as const).map(mode => (
              <button key={mode} onClick={() => setViewMode(mode)}
                style={{ padding:'7px 12px', borderRadius:7, fontSize:12, fontWeight:600, cursor:'pointer', border:'none', transition:'all 0.2s', background: viewMode===mode ? 'linear-gradient(135deg, var(--accent-violet), #6d28d9)' : 'transparent', color: viewMode===mode ? '#fff' : 'var(--text-muted)', boxShadow: viewMode===mode ? '0 0 16px var(--glow-violet)' : 'none', display:'flex', alignItems:'center', gap:5 }}>
                {mode==='list' ? <List size={14}/> : <LayoutGrid size={14}/>}
                {mode==='list' ? 'List' : 'Grid'}
              </button>
            ))}
          </div>
          <button className="btn-primary" onClick={() => setShowLogPage(true)} style={{ padding:'12px 22px' }}>
            <Plus size={16}/> <span>Log a Paper</span>
          </button>
        </div>
      </div>

      {/* Subject chips */}
      {bySubject.length > 0 && (
        <div className="animate-fade-up stagger-1" style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
          {bySubject.map((s,i) => (
            <div key={s.code}
              style={{ padding:'10px 16px', borderRadius:12, cursor:'pointer', background: filterSubject===s.code ? `${s.color}18` : 'rgba(255,255,255,0.03)', border:`1px solid ${filterSubject===s.code ? s.color+'50' : 'var(--border-dim)'}`, transition:'all 0.2s', animation:`fade-up 0.4s ${0.04*i}s both` }}
              onClick={() => setFilterSubject(filterSubject===s.code ? 'all' : s.code)}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <div style={{ width:8, height:8, borderRadius:'50%', background:s.color }} />
                <span style={{ fontSize:13, fontWeight:600, color:'var(--text-primary)' }}>{s.name.split(' ')[0]}</span>
                <span className={`badge ${s.done>0?'badge-emerald':'badge-violet'}`} style={{ fontSize:10, padding:'1px 7px' }}>{s.done}/{s.count}</span>
                {s.done>0 && <span style={{ fontSize:11, fontWeight:700, color:gradeColor(gradeFromPct(s.avgPct)) }}>{gradeFromPct(s.avgPct)}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filters bar */}
      {progress.length > 0 && (
        <div className="glass animate-fade-up stagger-2" style={{ padding:'14px 18px', borderRadius:'var(--radius-md)', display:'flex', gap:12, flexWrap:'wrap', alignItems:'center' }}>
          <div style={{ position:'relative', flex:'1 1 200px', minWidth:160 }}>
            <Search size={14} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)' }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search papers..." className="input-field" style={{ paddingLeft:34 }} />
          </div>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)} className="input-field" style={{ flex:'0 0 auto', width:'auto', padding:'9px 12px', fontSize:13 }}>
            <option value="all">All Statuses</option>
            {(Object.entries(STATUS_CONFIG) as [Status, typeof STATUS_CONFIG[Status]][]).map(([val,cfg]) => (
              <option key={val} value={val}>{cfg.icon} {cfg.label}</option>
            ))}
          </select>
          <select value={sortBy} onChange={e => setSortBy(e.target.value as any)} className="input-field" style={{ flex:'0 0 auto', width:'auto', padding:'9px 12px', fontSize:13 }}>
            <option value="date">Sort: Date</option>
            <option value="score">Sort: Score</option>
            <option value="subject">Sort: Subject</option>
          </select>
          {(filterSubject!=='all' || filterStatus!=='all' || search) && (
            <button className="btn-ghost" style={{ padding:'8px 12px', fontSize:12 }}
              onClick={() => { setFilterSubject('all'); setFilterStatus('all'); setSearch(''); }}>
              <X size={13}/> Clear
            </button>
          )}
          <span style={{ fontSize:12, color:'var(--text-muted)', marginLeft:'auto' }}>{filtered.length} result{filtered.length!==1?'s':''}</span>
        </div>
      )}

      {/* ── LIST VIEW ── */}
      {filtered.length > 0 && viewMode === 'list' && (
        <div className="glass glow-card animate-fade-up stagger-3" style={{ borderRadius:'var(--radius-lg)', overflow:'hidden' }}>
          {filtered.map((entry, i) => {
            const subj  = profile.subjects.find(s => s.code === entry.subjectCode);
            const color = getSubjectColor(entry.subjectCode).hex;
            const pct   = entry.maxScore > 0 ? (entry.score / entry.maxScore) * 100 : 0;
            const grade = getEntryGrade(entry);
            const statusCfg = STATUS_CONFIG[entry.status as Status] || STATUS_CONFIG['done'];
            return (
              <div key={entry.id}
                style={{ display:'flex', alignItems:'center', gap:16, padding:'14px 20px', borderBottom: i<filtered.length-1 ? '1px solid var(--border-dim)' : 'none', transition:'background 0.15s', animation:`fade-up 0.35s ${Math.min(i*0.03,0.25)}s both` }}
                onMouseEnter={e => (e.currentTarget.style.background='rgba(255,255,255,0.025)')}
                onMouseLeave={e => (e.currentTarget.style.background='transparent')}
              >
                <div style={{ width:4, height:40, borderRadius:99, background:color, flexShrink:0, boxShadow:`0 0 8px ${color}80` }} />
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4, flexWrap:'wrap' }}>
                    <span style={{ fontSize:14, fontWeight:600, color:'var(--text-primary)' }}>{subj?.name || entry.subjectCode}</span>
                    <span style={{ fontSize:11, color:'var(--text-muted)' }}>Paper {entry.component}</span>
                    <span style={{ fontSize:11, color:'var(--text-muted)' }}>{entry.year} · {SESSION_LABELS[entry.session]||entry.session}</span>
                    <span style={{ padding:'2px 8px', borderRadius:99, fontSize:10, fontWeight:600, background:statusCfg.bg, color:statusCfg.color }}>{statusCfg.icon} {statusCfg.label}</span>
                  </div>
                  <div style={{ width:'100%', maxWidth:180 }}>
                    <div className="progress-track" style={{ height:4 }}>
                      <div className="progress-fill" style={{ width:`${pct}%`, background: pct>=70?'var(--accent-emerald)':pct>=50?'var(--accent-amber)':'var(--accent-red)' }} />
                    </div>
                  </div>
                </div>
                <div style={{ textAlign:'right', flexShrink:0 }}>
                  <div style={{ fontFamily:'var(--font-display)', fontSize:16, fontWeight:800, color:gradeColor(grade) }}>{grade}</div>
                  <div style={{ fontSize:11, color:'var(--text-muted)' }}>{entry.score}/{entry.maxScore} ({pct.toFixed(0)}%)</div>
                  <div style={{ fontSize:10, color:'var(--text-dim)', marginTop:2 }}>{new Date(entry.date).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'2-digit'})}</div>
                </div>
                <button onClick={() => onUpdateProgress(progress.filter(e=>e.id!==entry.id))}
                  style={{ background:'none', border:'1px solid transparent', borderRadius:8, padding:8, cursor:'pointer', color:'var(--text-dim)', transition:'all 0.15s', flexShrink:0 }}
                  onMouseEnter={e => { e.currentTarget.style.color='var(--accent-red)'; e.currentTarget.style.borderColor='rgba(239,68,68,0.2)'; e.currentTarget.style.background='rgba(239,68,68,0.08)'; }}
                  onMouseLeave={e => { e.currentTarget.style.color='var(--text-dim)'; e.currentTarget.style.borderColor='transparent'; e.currentTarget.style.background='none'; }}>
                  <Trash2 size={15}/>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* ── GRID VIEW (fixed using .grid-card CSS class) ── */}
      {filtered.length > 0 && viewMode === 'grid' && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(220px, 1fr))', gap:16 }}>
          {filtered.map((entry, i) => {
            const subj  = profile.subjects.find(s => s.code === entry.subjectCode);
            const color = getSubjectColor(entry.subjectCode).hex;
            const pct   = entry.maxScore > 0 ? (entry.score / entry.maxScore) * 100 : 0;
            const grade = getEntryGrade(entry);
            const statusCfg = STATUS_CONFIG[entry.status as Status] || STATUS_CONFIG['done'];
            const diffCfg   = entry.difficulty ? DIFFICULTY_CONFIG[entry.difficulty-1] : null;
            return (
              /* Use CSS class .grid-card so hover doesn't get clipped */
              <div key={entry.id} className="grid-card"
                style={{ animationDelay:`${Math.min(i*0.03,0.3)}s`, animation:'fade-up 0.35s both' }}>
                <div className="grid-card-inner">
                  {/* Accent bar */}
                  <div style={{ height:4, background:`linear-gradient(90deg, ${color}, ${color}60)` }} />
                  <div style={{ padding:'14px 14px 12px', background:'var(--bg-card)' }}>
                    {/* Top row */}
                    <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:10 }}>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:12, fontWeight:700, color:'var(--text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                          {subj?.name?.split(' ').slice(0,3).join(' ') || entry.subjectCode}
                        </div>
                        <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:2 }}>
                          Paper {entry.component} · {entry.year} · {(SESSION_LABELS[entry.session]||entry.session).slice(0,3)}
                        </div>
                      </div>
                      <div style={{ width:40, height:40, borderRadius:10, flexShrink:0, marginLeft:8, background:`${color}18`, border:`1px solid ${color}40`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                        <span style={{ fontFamily:'var(--font-display)', fontSize:16, fontWeight:800, color:gradeColor(grade), lineHeight:1 }}>{grade}</span>
                      </div>
                    </div>
                    {/* Progress bar */}
                    <div style={{ marginBottom:10 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'var(--text-muted)', marginBottom:4 }}>
                        <span>{entry.score}/{entry.maxScore}</span>
                        <span style={{ fontWeight:600, color: pct>=70?'var(--accent-emerald)':pct>=50?'var(--accent-amber)':'var(--accent-red)' }}>{pct.toFixed(0)}%</span>
                      </div>
                      <div className="progress-track" style={{ height:5 }}>
                        <div className="progress-fill" style={{ width:`${pct}%`, background: pct>=70?'var(--accent-emerald)':pct>=50?'var(--accent-amber)':'var(--accent-red)', borderRadius:99 }} />
                      </div>
                    </div>
                    {/* Footer row */}
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                      <span style={{ padding:'3px 8px', borderRadius:99, fontSize:10, fontWeight:600, background:statusCfg.bg, color:statusCfg.color }}>
                        {statusCfg.icon} {statusCfg.label}
                      </span>
                      <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                        {diffCfg && <span title={diffCfg.label} style={{ fontSize:14 }}>{diffCfg.emoji}</span>}
                        <button onClick={() => onUpdateProgress(progress.filter(e=>e.id!==entry.id))}
                          style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-dim)', padding:2, transition:'color 0.15s', lineHeight:1 }}
                          onMouseEnter={e => (e.currentTarget.style.color='var(--accent-red)')}
                          onMouseLeave={e => (e.currentTarget.style.color='var(--text-dim)')}>
                          <Trash2 size={13}/>
                        </button>
                      </div>
                    </div>
                    <div style={{ fontSize:9, color:'var(--text-dim)', marginTop:6 }}>
                      {new Date(entry.date).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'2-digit'})}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="glass animate-fade-up stagger-3" style={{ padding:'60px 24px', textAlign:'center', borderRadius:'var(--radius-lg)' }}>
          <div style={{ fontSize:48, marginBottom:16 }}>📝</div>
          <h3 style={{ fontFamily:'var(--font-display)', fontSize:'1.2rem', color:'var(--text-primary)', marginBottom:8 }}>
            {progress.length===0 ? 'No papers logged yet' : 'No papers match your filter'}
          </h3>
          <p style={{ color:'var(--text-muted)', fontSize:14, marginBottom:20 }}>
            {progress.length===0 ? 'Start by logging your first past paper' : 'Try clearing the filters'}
          </p>
          {progress.length===0 && (
            <button className="btn-primary" onClick={() => setShowLogPage(true)}>
              <Plus size={16}/> <span>Log First Paper</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
