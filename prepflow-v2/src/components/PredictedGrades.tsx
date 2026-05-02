import { useState, useEffect, useMemo } from 'react';
import { StudentProfile, ProgressEntry } from '../App';
import { getSubjectColor } from '../utils/subjectColors';
import { TrendingUp, TrendingDown, Minus, ArrowRight, CheckCircle, AlertCircle } from 'lucide-react';

interface Props {
  profile: StudentProfile;
  progress: ProgressEntry[];
  onNavigate?: (page: string) => void;
}

function gradeFromPct(pct: number) {
  if (pct >= 90) return 'A*';
  if (pct >= 80) return 'A';
  if (pct >= 70) return 'B';
  if (pct >= 60) return 'C';
  if (pct >= 50) return 'D';
  if (pct >= 40) return 'E';
  return 'U';
}
function pctForGrade(g: string) {
  const map: Record<string, number> = { 'A*': 90, 'A': 80, 'B': 70, 'C': 60, 'D': 50, 'E': 40, 'U': 0 };
  return map[g] ?? 0;
}
function gradeColor(g: string) {
  if (g === 'A*') return '#a855f7';
  if (g === 'A')  return 'var(--accent-emerald)';
  if (g === 'B')  return 'var(--accent-cyan)';
  if (g === 'C')  return 'var(--accent-amber)';
  return 'var(--accent-red)';
}
const GRADES = ['A*', 'A', 'B', 'C', 'D', 'E', 'U'];

function GradeGauge({ pct, grade, color, size = 140 }: { pct: number; grade: string; color: string; size?: number }) {
  const [drawn, setDrawn] = useState(0);
  const stroke = 10;
  const r = (size - stroke) / 2;
  const circ = Math.PI * r;
  const offset = circ - (drawn / 100) * circ;
  useEffect(() => {
    let frame: number;
    let start: number | null = null;
    const animate = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / 1100, 1);
      setDrawn(Math.round((1 - Math.pow(1 - p, 3)) * pct));
      if (p < 1) frame = requestAnimationFrame(animate);
    };
    const t = setTimeout(() => { frame = requestAnimationFrame(animate); }, 150);
    return () => { clearTimeout(t); cancelAnimationFrame(frame); };
  }, [pct]);
  return (
    <div style={{ position: 'relative', width: size, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <svg width={size} height={size / 2 + stroke} viewBox={`0 0 ${size} ${size / 2 + stroke}`} style={{ overflow: 'visible' }}>
        <path d={`M ${stroke/2} ${size/2} A ${r} ${r} 0 0 1 ${size - stroke/2} ${size/2}`}
          fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} strokeLinecap="round" />
        <path d={`M ${stroke/2} ${size/2} A ${r} ${r} 0 0 1 ${size - stroke/2} ${size/2}`}
          fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset}
          style={{ filter: `drop-shadow(0 0 8px ${color})`, transition: 'stroke-dashoffset 0.04s linear' }} />
      </svg>
      <div style={{ marginTop: 4, textAlign: 'center' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: size > 120 ? 30 : 22, fontWeight: 800, color, lineHeight: 1 }}>{grade}</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{drawn}%</div>
      </div>
    </div>
  );
}

function TrendBadge({ current, previous }: { current: number; previous: number }) {
  const diff = current - previous;
  if (Math.abs(diff) < 2) return <span style={{ color: 'var(--text-muted)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 3 }}><Minus size={12} /> Stable</span>;
  if (diff > 0) return <span style={{ color: 'var(--accent-emerald)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 3 }}><TrendingUp size={12} /> +{diff.toFixed(1)}%</span>;
  return <span style={{ color: 'var(--accent-red)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 3 }}><TrendingDown size={12} /> {diff.toFixed(1)}%</span>;
}

function NeedCalculator({ currentPct, currentCount, targetGrade }: { currentPct: number; currentCount: number; targetGrade: string }) {
  const [papersLeft, setPapersLeft] = useState(5);
  const targetPct = pctForGrade(targetGrade);
  if (currentPct >= targetPct) return (
    <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', fontSize: 13, color: '#34d399', display: 'flex', alignItems: 'center', gap: 8 }}>
      <CheckCircle size={14} /> Already on track for {targetGrade}!
    </div>
  );
  const neededAvg = papersLeft > 0 ? ((targetPct * (currentCount + papersLeft)) - currentPct * currentCount) / papersLeft : null;
  const achievable = neededAvg !== null && neededAvg <= 100;
  return (
    <div style={{ padding: '14px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-dim)' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>What you need for {targetGrade}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', flexShrink: 0 }}>Papers left:</span>
        <input type="range" min={1} max={20} value={papersLeft} onChange={e => setPapersLeft(Number(e.target.value))}
          style={{ flex: 1, accentColor: 'var(--accent-violet)', cursor: 'pointer' }} />
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', minWidth: 20 }}>{papersLeft}</span>
      </div>
      {neededAvg !== null && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Need avg of</span>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, color: achievable ? 'var(--accent-emerald)' : 'var(--accent-red)' }}>
            {neededAvg > 100 ? '> 100%' : `${neededAvg.toFixed(1)}%`}
          </span>
          <span style={{ fontSize: 11, color: achievable ? 'var(--accent-emerald)' : 'var(--accent-red)' }}>
            {achievable ? '✓ Achievable' : '✗ Too few papers'}
          </span>
        </div>
      )}
    </div>
  );
}

export function PredictedGrades({ profile, progress, onNavigate }: Props) {
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);

  const subjectStats = useMemo(() => profile.subjects.map(subj => {
    const done = progress.filter(p => p.subjectCode === subj.code && p.status === 'done');
    const ts = done.reduce((s, p) => s + p.score, 0);
    const tm = done.reduce((s, p) => s + p.maxScore, 0);
    const avgPct = tm > 0 ? (ts / tm) * 100 : 0;
    const byComponent = subj.components.map(compCode => {
      const cp = done.filter(p => p.component === compCode);
      const cs = cp.reduce((s,p) => s + p.score, 0);
      const cm = cp.reduce((s,p) => s + p.maxScore, 0);
      return { code: compCode, count: cp.length, avgPct: cm > 0 ? (cs/cm)*100 : 0 };
    });
    const sorted = [...done].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const r3 = sorted.slice(0,3); const p3 = sorted.slice(3,6);
    const recentAvg = r3.length > 0 ? r3.reduce((s,p) => s + (p.score/p.maxScore)*100,0)/r3.length : avgPct;
    const prevAvg   = p3.length > 0 ? p3.reduce((s,p) => s + (p.score/p.maxScore)*100,0)/p3.length : avgPct;
    const grade = gradeFromPct(avgPct);
    const color = getSubjectColor(subj.code).hex;
    const targetPct = pctForGrade(profile.targetGrade);
    return { subj, done: done.length, avgPct, grade, color, byComponent, recentAvg, prevAvg, gap: targetPct - avgPct, onTrack: avgPct >= targetPct };
  }), [profile, progress]);

  const donePapers = progress.filter(p => p.status === 'done');
  const ts = donePapers.reduce((s,p) => s + p.score, 0);
  const tm = donePapers.reduce((s,p) => s + p.maxScore, 0);
  const overallAvgPct = tm > 0 ? (ts/tm)*100 : 0;
  const overallGrade  = gradeFromPct(overallAvgPct);
  const targetPct     = pctForGrade(profile.targetGrade);
  const overallOnTrack = overallAvgPct >= targetPct;

  return (
    <div style={{ padding: '32px 28px', display: 'flex', flexDirection: 'column', gap: 28, maxWidth: 1100 }}>

      {/* Header */}
      <div className="animate-fade-up">
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.5rem,3vw,2rem)', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Predicted Grades</h1>
        <p style={{ color: 'var(--text-muted)', marginTop: 4, fontSize: 14 }}>Based on {donePapers.length} completed papers</p>
      </div>

      {/* Overall card */}
      <div className="glass gradient-border animate-fade-up stagger-1" style={{
        padding: '28px 32px', borderRadius: 'var(--radius-xl)',
        background: `linear-gradient(135deg, ${gradeColor(overallGrade)}10, rgba(6,182,212,0.04))`,
        display: 'flex', alignItems: 'center', gap: 32, flexWrap: 'wrap',
      }}>
        <GradeGauge pct={Math.round(overallAvgPct)} grade={overallGrade} color={gradeColor(overallGrade)} size={150} />
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Overall Predicted Grade</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>
            {overallAvgPct > 0 ? `Averaging ${overallAvgPct.toFixed(1)}% across all subjects` : 'Record papers to see predictions'}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
            <span className={`badge ${overallOnTrack ? 'badge-emerald' : 'badge-amber'}`}>
              {overallOnTrack ? <CheckCircle size={10} /> : <AlertCircle size={10} />}
              {overallOnTrack ? `On track for ${profile.targetGrade}` : `${(targetPct - overallAvgPct).toFixed(1)}% below target`}
            </span>
            <span className="badge badge-violet">Target: {profile.targetGrade}</span>
          </div>
          {/* Grade scale */}
          <div style={{ display: 'flex', gap: 4 }}>
            {GRADES.map(g => (
              <div key={g} style={{
                flex: g === overallGrade ? 2 : 1, height: g === overallGrade ? 28 : 20,
                borderRadius: 6, background: g === overallGrade ? gradeColor(g) : `${gradeColor(g)}22`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: g === overallGrade ? 12 : 10, fontWeight: 700,
                color: g === overallGrade ? '#fff' : gradeColor(g),
                transition: 'all 0.3s',
                boxShadow: g === overallGrade ? `0 0 14px ${gradeColor(g)}60` : 'none',
              }}>{g}</div>
            ))}
          </div>
        </div>
        {donePapers.length === 0 && (
          <button className="btn-primary" onClick={() => onNavigate?.('record')}><span>Record Papers</span><ArrowRight size={14} /></button>
        )}
      </div>

      {/* Subject cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
        {subjectStats.map((s, i) => (
          <div key={s.subj.code} className="glass glow-card animate-fade-up"
            style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden', cursor: 'pointer', animationDelay: `${0.06*i}s`, transition: 'transform 0.2s', outline: selectedSubject === s.subj.code ? `2px solid ${s.color}` : 'none' }}
            onClick={() => setSelectedSubject(selectedSubject === s.subj.code ? null : s.subj.code)}
            onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-3px)')}
            onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}>
            <div style={{ height: 4, background: `linear-gradient(90deg, ${s.color}, ${s.color}40)` }} />
            <div style={{ padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.subj.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{s.subj.code} · {s.done} papers done</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, color: s.done > 0 ? gradeColor(s.grade) : 'var(--text-dim)', lineHeight: 1 }}>{s.done > 0 ? s.grade : '—'}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.done > 0 ? `${s.avgPct.toFixed(1)}%` : 'No data'}</div>
                </div>
              </div>
              {s.done > 0 ? (
                <>
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginBottom: 5 }}>
                      <span>Score average</span>
                      <TrendBadge current={s.recentAvg} previous={s.prevAvg} />
                    </div>
                    <div className="progress-track"><div className="progress-fill" style={{ width: `${s.avgPct}%`, background: s.color }} /></div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ padding: '4px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600, background: s.onTrack ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)', color: s.onTrack ? '#34d399' : '#fbbf24', border: `1px solid ${s.onTrack ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)'}` }}>
                      {s.onTrack ? '✓ On track' : `${s.gap.toFixed(0)}% to target`}
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>{selectedSubject === s.subj.code ? '▲ collapse' : '▼ expand'}</span>
                  </div>
                  {selectedSubject === s.subj.code && (
                    <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10, animation: 'fade-up 0.25s both' }}>
                      <div style={{ height: 1, background: 'var(--border-dim)' }} />
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>By Component</div>
                      {s.byComponent.filter(c => c.count > 0).length > 0
                        ? s.byComponent.filter(c => c.count > 0).map(c => (
                          <div key={c.code} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ fontSize: 11, color: 'var(--text-secondary)', width: 60, flexShrink: 0 }}>Paper {c.code}</span>
                            <div className="progress-track" style={{ flex: 1 }}><div className="progress-fill" style={{ width: `${c.avgPct}%`, background: s.color }} /></div>
                            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)', width: 42, textAlign: 'right', flexShrink: 0 }}>{c.avgPct.toFixed(0)}%</span>
                          </div>
                        ))
                        : <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>No component breakdown yet</p>
                      }
                      <div style={{ height: 1, background: 'var(--border-dim)', margin: '4px 0' }} />
                      <NeedCalculator currentPct={s.avgPct} currentCount={s.done} targetGrade={profile.targetGrade} />
                    </div>
                  )}
                </>
              ) : (
                <button className="btn-ghost" style={{ width: '100%', fontSize: 12, padding: '9px 0' }} onClick={e => { e.stopPropagation(); onNavigate?.('record'); }}>
                  Record papers to predict →
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {profile.subjects.length === 0 && (
        <div className="glass animate-fade-up" style={{ padding: '60px 24px', textAlign: 'center', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🎯</div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', color: 'var(--text-primary)', marginBottom: 8 }}>No subjects set up yet</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 20 }}>Add subjects in Settings to see predictions</p>
          <button className="btn-primary" onClick={() => onNavigate?.('settings')}><span>Go to Settings</span><ArrowRight size={14} /></button>
        </div>
      )}
    </div>
  );
}
