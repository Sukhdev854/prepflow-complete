import { useState, useEffect, useRef, useMemo } from 'react';
import { StudentProfile, ProgressEntry, StreakData } from '../App';
import { getSubjectColor } from '../utils/subjectColors';
import { getSubjectByCode } from '../data/subjects';
import {
  TrendingUp, TrendingDown, Target, Flame, Zap, BookOpen,
  Award, ChevronRight, BarChart2, Activity, Star, ArrowRight,
  CheckCircle, Clock, AlertCircle, RefreshCw
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, Cell
} from 'recharts';

// ─── Types ────────────────────────────────────────────────────────────────────
interface DashboardProps {
  profile: StudentProfile;
  progress: ProgressEntry[];
  streak: StreakData;
  onNavigate?: (page: string) => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function gradeFromPercent(pct: number): string {
  if (pct >= 90) return 'A*';
  if (pct >= 80) return 'A';
  if (pct >= 70) return 'B';
  if (pct >= 60) return 'C';
  if (pct >= 50) return 'D';
  if (pct >= 40) return 'E';
  return 'U';
}

function gradeColor(grade: string): string {
  if (grade === 'A*' || grade === 'A') return 'var(--accent-emerald)';
  if (grade === 'B') return 'var(--accent-cyan)';
  if (grade === 'C') return 'var(--accent-amber)';
  return 'var(--accent-red)';
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function formatDate() {
  return new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
}

// ─── Animated Counter ─────────────────────────────────────────────────────────
function Counter({ to, duration = 1200, suffix = '' }: { to: number; duration?: number; suffix?: string }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let start: number | null = null;
    const step = (ts: number) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setVal(Math.round(eased * to));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [to, duration]);
  return <>{val}{suffix}</>;
}

// ─── Glow Ring Progress ───────────────────────────────────────────────────────
function GlowRing({
  pct, size = 100, stroke = 8, color, label, sublabel
}: { pct: number; size?: number; stroke?: number; color: string; label: string; sublabel?: string }) {
  const [drawn, setDrawn] = useState(0);
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (drawn / 100) * circ;

  useEffect(() => {
    const t = setTimeout(() => {
      let frame: number;
      let start: number | null = null;
      const animate = (ts: number) => {
        if (!start) start = ts;
        const p = Math.min((ts - start) / 1000, 1);
        setDrawn(Math.round((1 - Math.pow(1 - p, 3)) * pct));
        if (p < 1) frame = requestAnimationFrame(animate);
      };
      frame = requestAnimationFrame(animate);
      return () => cancelAnimationFrame(frame);
    }, 200);
    return () => clearTimeout(t);
  }, [pct]);

  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none"
          stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
        <circle cx={size/2} cy={size/2} r={r} fill="none"
          stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset}
          style={{
            filter: `drop-shadow(0 0 6px ${color})`,
            transition: 'stroke-dashoffset 0.05s linear',
          }} />
      </svg>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex',
        flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
      }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: size > 90 ? 18 : 14, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>
          {drawn}%
        </span>
        {sublabel && <span style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2 }}>{sublabel}</span>}
      </div>
    </div>
  );
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
      borderRadius: 10, padding: '10px 14px', fontSize: 13,
    }}>
      <p style={{ color: 'var(--text-muted)', marginBottom: 4 }}>{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color || 'var(--text-primary)', fontWeight: 600 }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toFixed(1) : p.value}
          {p.name?.includes('%') || p.name?.includes('Score') ? '%' : ''}
        </p>
      ))}
    </div>
  );
}

// ─── MAIN DASHBOARD ───────────────────────────────────────────────────────────
export function Dashboard({ profile, progress, streak, onNavigate }: DashboardProps) {
  const [activeSubject, setActiveSubject] = useState<string | null>(null);
  const [liveTime, setLiveTime] = useState(new Date());

  // Live clock
  useEffect(() => {
    const t = setInterval(() => setLiveTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // ── Computed stats ──────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const done = progress.filter(p => p.status === 'done');
    const totalScore = done.reduce((s, p) => s + p.score, 0);
    const totalMax = done.reduce((s, p) => s + p.maxScore, 0);
    const avgPct = totalMax > 0 ? (totalScore / totalMax) * 100 : 0;

    // Per-subject stats
    const subjectStats = profile.subjects.map(subj => {
      const sp = done.filter(p => p.subjectCode === subj.code);
      const sScore = sp.reduce((s, p) => s + p.score, 0);
      const sMax = sp.reduce((s, p) => s + p.maxScore, 0);
      const avgP = sMax > 0 ? (sScore / sMax) * 100 : 0;
      const totalPapers = subj.components.length * 3 * (subj.yearsRange.to - subj.yearsRange.from + 1);
      return {
        code: subj.code, name: subj.name,
        avgPct: avgP, completed: sp.length, total: totalPapers,
        completionRate: totalPapers > 0 ? sp.length / totalPapers : 0,
        grade: gradeFromPercent(avgP),
        color: getSubjectColor(subj.code).hex,
      };
    });

    // Recent activity (last 7 entries)
    const recent = [...progress]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 6);

    // Weekly score trend (last 8 weeks)
    const now = Date.now();
    const weeks: { week: string; avg: number; count: number }[] = [];
    for (let w = 7; w >= 0; w--) {
      const start = new Date(now - (w + 1) * 7 * 86400000);
      const end = new Date(now - w * 7 * 86400000);
      const wp = done.filter(p => {
        const d = new Date(p.date);
        return d >= start && d < end;
      });
      const wMax = wp.reduce((s, p) => s + p.maxScore, 0);
      weeks.push({
        week: `W${8 - w}`,
        avg: wMax > 0 ? (wp.reduce((s, p) => s + p.score, 0) / wMax) * 100 : 0,
        count: wp.length,
      });
    }

    // Focus recommendation: lowest avg subject with progress
    const focus = subjectStats.filter(s => s.completed > 0).sort((a, b) => a.avgPct - b.avgPct)[0]
      || subjectStats[0];

    // Pending count
    const pending = progress.filter(p => !p.status || p.status === 'not-started' || p.status === 'in-progress' || p.status === 'to-mark' || p.status === 'to-review').length;

    return { done: done.length, avgPct, subjectStats, recent, weeks, focus, pending, totalPapers: progress.length };
  }, [progress, profile]);

  const clockStr = liveTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const hasSubjects = profile.subjects.length > 0;

  // ── No subjects onboarded yet ───────────────────────────────────────────────
  if (!hasSubjects) {
    return (
      <div style={{ padding: '40px 32px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '70vh', gap: 20 }}>
        <div style={{ width: 72, height: 72, borderRadius: 20, background: 'linear-gradient(135deg, var(--accent-violet), var(--accent-cyan))', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 40px var(--glow-violet)', animation: 'float 4s ease-in-out infinite' }}>
          <BookOpen size={32} color="#fff" />
        </div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', color: 'var(--text-primary)', textAlign: 'center' }}>
          Let's set up your subjects
        </h2>
        <p style={{ color: 'var(--text-muted)', textAlign: 'center', maxWidth: 360, fontSize: 15 }}>
          Go to Settings to add your subjects and target grade — then your dashboard will come alive.
        </p>
        <button className="btn-primary" onClick={() => onNavigate?.('settings')} style={{ marginTop: 8 }}>
          <span>Go to Settings</span> <ArrowRight size={16} />
        </button>
      </div>
    );
  }

  // ─── MAIN RENDER ──────────────────────────────────────────────────────────
  return (
    <div style={{ padding: '32px 28px', display: 'flex', flexDirection: 'column', gap: 28, maxWidth: 1200 }}>

      {/* ── Hero Banner ── */}
      <div className="glass gradient-border animate-fade-up" style={{
        padding: '28px 32px',
        background: 'linear-gradient(135deg, rgba(124,58,237,0.12) 0%, rgba(6,182,212,0.06) 100%)',
        borderRadius: 'var(--radius-xl)',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Decorative blobs */}
        <div style={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,0.15), transparent)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -30, right: 120, width: 150, height: 150, borderRadius: '50%', background: 'radial-gradient(circle, rgba(6,182,212,0.12), transparent)', pointerEvents: 'none' }} />

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, position: 'relative' }}>
          <div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 6, letterSpacing: '0.04em' }}>
              {formatDate()}
            </p>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.6rem,3vw,2.2rem)', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.15 }}>
              {getGreeting()}, <span className="gradient-text">{profile.name || profile.subjects[0]?.name?.split(' ')[0] || 'Scholar'}</span> 👋
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
              <span className="badge badge-violet">{profile.level}</span>
              <span className="badge badge-cyan">Target: {profile.targetGrade}</span>
              {streak.currentStreak > 0 && (
                <span className="badge badge-amber">
                  <Flame size={10} /> {streak.currentStreak} day streak
                </span>
              )}
            </div>
          </div>

          {/* Live clock */}
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1 }}>
              {clockStr}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
              {streak.totalXP} XP earned
            </div>
          </div>
        </div>
      </div>

      {/* ── Stat Cards Row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        {[
          {
            icon: <CheckCircle size={20} />, label: 'Papers Done',
            value: stats.done, suffix: '',
            color: 'var(--accent-emerald)', glow: 'rgba(16,185,129,0.3)',
            sub: `of ${stats.totalPapers} logged`,
            delay: '0s',
          },
          {
            icon: <TrendingUp size={20} />, label: 'Overall Average',
            value: Math.round(stats.avgPct), suffix: '%',
            color: stats.avgPct >= 70 ? 'var(--accent-emerald)' : stats.avgPct >= 50 ? 'var(--accent-amber)' : 'var(--accent-red)',
            glow: stats.avgPct >= 70 ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)',
            sub: gradeFromPercent(stats.avgPct) === 'U' ? 'Keep going!' : `Grade ${gradeFromPercent(stats.avgPct)}`,
            delay: '0.05s',
          },
          {
            icon: <Flame size={20} />, label: 'Study Streak',
            value: streak.currentStreak, suffix: ' days',
            color: 'var(--accent-amber)', glow: 'rgba(245,158,11,0.3)',
            sub: `Best: ${streak.longestStreak} days`,
            delay: '0.1s',
          },
          {
            icon: <Clock size={20} />, label: 'Pending Papers',
            value: stats.pending, suffix: '',
            color: stats.pending > 0 ? 'var(--accent-violet-bright)' : 'var(--accent-emerald)',
            glow: 'rgba(124,58,237,0.3)',
            sub: stats.pending > 0 ? 'Need attention' : 'All clear!',
            delay: '0.15s',
          },
        ].map((card, i) => (
          <div key={i} className="glass glow-card gradient-border animate-fade-up"
            style={{
              padding: '20px 22px', borderRadius: 'var(--radius-lg)',
              animationDelay: card.delay,
              transition: 'transform 0.2s, box-shadow 0.2s',
              cursor: 'default',
            }}
            onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-3px)')}
            onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{card.label}</span>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: `${card.glow}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: card.color }}>
                {card.icon}
              </div>
            </div>
            <div className="stat-number" style={{ fontSize: '2rem', color: card.color, WebkitTextFillColor: card.color, background: 'none' }}>
              <Counter to={card.value} />{card.suffix}
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>{card.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Main grid: charts + rings ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 }}>

        {/* Weekly trend chart */}
        <div className="glass glow-card animate-fade-up stagger-2" style={{ padding: '24px', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <h3 className="section-title" style={{ fontSize: '1.1rem' }}>Weekly Score Trend</h3>
              <p className="section-subtitle">Average score % per week</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)' }}>
              <Activity size={14} /> Last 8 weeks
            </div>
          </div>

          {stats.done === 0 ? (
            <div style={{ height: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              <BarChart2 size={32} color="var(--text-dim)" />
              <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Record papers to see your trend</p>
              <button className="btn-ghost" style={{ fontSize: 12, padding: '7px 14px' }} onClick={() => onNavigate?.('record')}>
                Record a paper <ArrowRight size={12} />
              </button>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={stats.weeks} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent-violet)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="var(--accent-violet)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="week" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 100]} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="avg" name="Avg Score" stroke="var(--accent-violet-bright)" strokeWidth={2.5}
                  fill="url(#areaGrad)" dot={{ fill: 'var(--accent-violet-bright)', r: 3 }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Subject Progress Rings */}
        <div className="glass glow-card animate-fade-up stagger-3" style={{ padding: '24px', borderRadius: 'var(--radius-lg)' }}>
          <h3 className="section-title" style={{ fontSize: '1.1rem', marginBottom: 4 }}>Subject Progress</h3>
          <p className="section-subtitle" style={{ marginBottom: 18 }}>Completion & avg score</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {stats.subjectStats.slice(0, 4).map((s, i) => (
              <div key={s.code} style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '10px 12px', borderRadius: 10,
                background: activeSubject === s.code ? 'rgba(124,58,237,0.08)' : 'rgba(255,255,255,0.02)',
                border: `1px solid ${activeSubject === s.code ? 'rgba(124,58,237,0.2)' : 'transparent'}`,
                cursor: 'pointer', transition: 'all 0.2s',
                animation: `fade-up 0.4s ${0.05 * i}s both`,
              }}
                onClick={() => setActiveSubject(activeSubject === s.code ? null : s.code)}
              >
                <GlowRing pct={Math.round(s.completionRate * 100)} size={56} stroke={5} color={s.color} label="" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{s.completed}/{s.total} done</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, color: gradeColor(s.grade) }}>{s.grade}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.avgPct.toFixed(0)}%</div>
                </div>
              </div>
            ))}
            {stats.subjectStats.length > 4 && (
              <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>+{stats.subjectStats.length - 4} more subjects</p>
            )}
          </div>
        </div>
      </div>

      {/* ── Per-Subject Bar Chart + Focus Panel ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20 }}>

        {/* Average score by subject */}
        <div className="glass glow-card animate-fade-up stagger-4" style={{ padding: '24px', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ marginBottom: 20 }}>
            <h3 className="section-title" style={{ fontSize: '1.1rem' }}>Average Score by Subject</h3>
            <p className="section-subtitle">Based on completed papers</p>
          </div>

          {stats.done === 0 ? (
            <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No completed papers yet</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={stats.subjectStats} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false}
                  tickFormatter={n => n.split(' ')[0]} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 100]} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="avgPct" name="Avg Score" radius={[6, 6, 0, 0]} maxBarSize={40}>
                  {stats.subjectStats.map((s) => (
                    <Cell key={s.code} fill={s.color}
                      style={{ filter: `drop-shadow(0 0 6px ${s.color}80)` }} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Focus Today panel */}
        <div className="glass glow-card animate-fade-up stagger-5" style={{ padding: '24px', borderRadius: 'var(--radius-lg)', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Star size={16} color="var(--accent-amber)" />
              <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--accent-amber)' }}>Focus Today</span>
            </div>
            <h3 className="section-title" style={{ fontSize: '1.05rem' }}>Smart Recommendation</h3>
          </div>

          {stats.focus ? (
            <div>
              <div style={{
                padding: '16px', borderRadius: 12,
                background: `linear-gradient(135deg, ${stats.focus.color}20, ${stats.focus.color}08)`,
                border: `1px solid ${stats.focus.color}30`,
                marginBottom: 14,
              }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{stats.focus.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>{stats.focus.code}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: 'var(--text-muted)' }}>Avg</span>
                  <span style={{ fontWeight: 700, color: stats.focus.color }}>{stats.focus.avgPct.toFixed(1)}%</span>
                </div>
                <div className="progress-track" style={{ marginTop: 8 }}>
                  <div className="progress-fill" style={{ width: `${stats.focus.avgPct}%`, background: stats.focus.color }} />
                </div>
              </div>

              <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 14 }}>
                {stats.focus.avgPct < 50
                  ? 'This subject needs the most attention. Focus here today!'
                  : stats.focus.avgPct < 70
                  ? 'Almost there — a few more papers will push you to a B!'
                  : 'Great progress! Keep the streak alive in this subject.'}
              </p>

              <button className="btn-primary" style={{ width: '100%', padding: '11px 0' }} onClick={() => onNavigate?.('record')}>
                <span>Record a Paper</span> <ArrowRight size={14} />
              </button>
            </div>
          ) : (
            <div style={{ textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              <BookOpen size={28} color="var(--text-dim)" />
              <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Record your first paper to get recommendations</p>
              <button className="btn-primary" style={{ padding: '10px 20px' }} onClick={() => onNavigate?.('record')}>
                <span>Start Now</span> <ArrowRight size={14} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Recent Activity ── */}
      <div className="glass glow-card animate-fade-up stagger-6" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-dim)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h3 className="section-title" style={{ fontSize: '1.1rem' }}>Recent Activity</h3>
            <p className="section-subtitle">Your last 6 recorded papers</p>
          </div>
          <button className="btn-ghost" style={{ fontSize: 12, padding: '7px 14px' }} onClick={() => onNavigate?.('record')}>
            View All <ChevronRight size={14} />
          </button>
        </div>

        {stats.recent.length === 0 ? (
          <div style={{ padding: '40px 24px', textAlign: 'center' }}>
            <RefreshCw size={28} color="var(--text-dim)" style={{ marginBottom: 10 }} />
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No activity yet — record your first paper to start</p>
          </div>
        ) : (
          <div>
            {stats.recent.map((entry, i) => {
              const subj = profile.subjects.find(s => s.code === entry.subjectCode);
              const color = getSubjectColor(entry.subjectCode).hex;
              const pct = entry.maxScore > 0 ? (entry.score / entry.maxScore) * 100 : 0;
              const statusColors: Record<string, string> = {
                done: 'var(--accent-emerald)', 'in-progress': 'var(--accent-cyan)',
                'to-mark': 'var(--accent-violet-bright)', 'to-review': 'var(--accent-amber)',
                'not-started': 'var(--text-muted)',
              };
              return (
                <div key={entry.id} style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '14px 24px',
                  borderBottom: i < stats.recent.length - 1 ? '1px solid var(--border-dim)' : 'none',
                  transition: 'background 0.15s',
                  animation: `fade-up 0.4s ${0.04 * i}s both`,
                }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  {/* Color dot */}
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0, boxShadow: `0 0 8px ${color}` }} />

                  {/* Subject & component */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {subj?.name || entry.subjectCode}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
                      Paper {entry.component} · {entry.year} {entry.session}
                    </div>
                  </div>

                  {/* Mini progress */}
                  <div style={{ width: 80, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div className="progress-track">
                      <div className="progress-fill" style={{ width: `${pct}%`, background: pct >= 70 ? 'var(--accent-emerald)' : pct >= 50 ? 'var(--accent-amber)' : 'var(--accent-red)' }} />
                    </div>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{entry.score}/{entry.maxScore}</span>
                  </div>

                  {/* Score badge */}
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, color: pct >= 70 ? 'var(--accent-emerald)' : pct >= 50 ? 'var(--accent-amber)' : 'var(--accent-red)' }}>
                      {pct.toFixed(0)}%
                    </span>
                    <div style={{ fontSize: 10, color: statusColors[entry.status || 'done'] || 'var(--text-muted)', marginTop: 1, textTransform: 'capitalize' }}>
                      {entry.status || 'done'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── XP / Gamification bar ── */}
      {streak.totalXP > 0 && (
        <div className="glass gradient-border animate-fade-up" style={{
          padding: '20px 24px', borderRadius: 'var(--radius-lg)',
          background: 'linear-gradient(135deg, rgba(245,158,11,0.08), rgba(124,58,237,0.06))',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(245,158,11,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Zap size={22} color="var(--accent-amber)" />
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  <Counter to={streak.totalXP} /> XP
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {streak.longestStreak > 0 ? `Best streak: ${streak.longestStreak} days` : 'Start your streak!'}
                </div>
              </div>
            </div>

            {/* XP bar towards next milestone */}
            <div style={{ flex: 1, maxWidth: 300, minWidth: 160 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>
                <span>Level {Math.floor(streak.totalXP / 500) + 1}</span>
                <span>{streak.totalXP % 500}/500 XP to next level</span>
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${(streak.totalXP % 500) / 5}%`, background: 'linear-gradient(90deg, var(--accent-amber), var(--accent-violet-bright))' }} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[
                { icon: '🔥', label: 'Streak Master', unlocked: streak.longestStreak >= 7 },
                { icon: '📚', label: 'Paper Crusher', unlocked: stats.done >= 10 },
                { icon: '⭐', label: 'High Scorer',   unlocked: stats.avgPct >= 80 },
              ].map(badge => (
                <div key={badge.label} style={{
                  padding: '6px 12px', borderRadius: 99, fontSize: 12, fontWeight: 600,
                  background: badge.unlocked ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${badge.unlocked ? 'rgba(245,158,11,0.3)' : 'var(--border-dim)'}`,
                  color: badge.unlocked ? '#fbbf24' : 'var(--text-dim)',
                  display: 'flex', alignItems: 'center', gap: 5,
                  transition: 'all 0.2s',
                  opacity: badge.unlocked ? 1 : 0.5,
                }}>
                  {badge.icon} {badge.label}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
