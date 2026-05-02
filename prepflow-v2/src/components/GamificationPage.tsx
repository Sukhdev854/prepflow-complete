import { useState, useEffect, useMemo, useRef } from 'react';
import { ProgressEntry, StreakData } from '../App';
import {
  ACHIEVEMENTS, LEVELS, RARITY_CONFIG,
  getLevelFromXP, getXPProgress, getUnlockedAchievements,
  type Achievement
} from '../utils/gamification';
import { Flame, Trophy, Star, Zap, Calendar, TrendingUp, Lock, ChevronRight } from 'lucide-react';

interface Props {
  progress: ProgressEntry[];
  streak: StreakData;
  username: string;
  onNavigate?: (page: string) => void;
}

// ─── Animated counter ─────────────────────────────────────────────────────────
function Counter({ to, duration = 1200 }: { to: number; duration?: number }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let frame: number;
    let start: number | null = null;
    const step = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      setVal(Math.round((1 - Math.pow(1 - p, 3)) * to));
      if (p < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [to, duration]);
  return <>{val}</>;
}

// ─── Streak calendar ──────────────────────────────────────────────────────────
function StreakCalendar({ studyDates }: { studyDates: string[] }) {
  const dateSet = new Set(studyDates);
  const today = new Date();
  const days: { date: string; label: string; studied: boolean; isToday: boolean }[] = [];

  for (let i = 27; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    days.push({
      date: iso,
      label: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
      studied: dateSet.has(iso),
      isToday: iso === today.toISOString().slice(0, 10),
    });
  }

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
          <div key={d} style={{ fontSize: 9, color: 'var(--text-dim)', textAlign: 'center', marginBottom: 4, fontWeight: 600 }}>{d}</div>
        ))}
        {/* Offset for first day */}
        {Array.from({ length: (new Date(days[0].date).getDay() + 6) % 7 }).map((_, i) => (
          <div key={`off-${i}`} />
        ))}
        {days.map(d => (
          <div key={d.date} title={d.label}
            style={{
              aspectRatio: '1', borderRadius: 4,
              background: d.studied
                ? 'linear-gradient(135deg, var(--accent-violet), var(--accent-cyan))'
                : d.isToday
                ? 'rgba(124,58,237,0.2)'
                : 'rgba(255,255,255,0.04)',
              border: d.isToday ? '1px solid rgba(124,58,237,0.5)' : '1px solid transparent',
              boxShadow: d.studied ? '0 0 6px rgba(124,58,237,0.4)' : 'none',
              transition: 'all 0.2s',
              cursor: 'default',
            }}
          />
        ))}
      </div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 10, fontSize: 11, color: 'var(--text-muted)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 10, height: 10, borderRadius: 2, background: 'rgba(255,255,255,0.08)' }} />
          No activity
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 10, height: 10, borderRadius: 2, background: 'linear-gradient(135deg, var(--accent-violet), var(--accent-cyan))' }} />
          Studied
        </div>
      </div>
    </div>
  );
}

// ─── Achievement card ─────────────────────────────────────────────────────────
function AchievementCard({ achievement, unlocked, delay = 0 }: { achievement: Achievement; unlocked: boolean; delay?: number }) {
  const rarity = RARITY_CONFIG[achievement.rarity];
  return (
    <div style={{
      padding: '16px',
      borderRadius: 12,
      background: unlocked ? rarity.bg : 'rgba(255,255,255,0.02)',
      border: `1px solid ${unlocked ? rarity.color + '40' : 'var(--border-dim)'}`,
      transition: 'all 0.2s',
      opacity: unlocked ? 1 : 0.45,
      animation: `fade-up 0.4s ${delay}s both`,
      position: 'relative',
      overflow: 'hidden',
    }}
      onMouseEnter={e => { if (unlocked) (e.currentTarget.style.boxShadow = `0 0 20px ${rarity.glow}`); (e.currentTarget.style.transform = 'translateY(-2px)'); }}
      onMouseLeave={e => { (e.currentTarget.style.boxShadow = 'none'); (e.currentTarget.style.transform = 'translateY(0)'); }}
    >
      {/* Legendary shimmer */}
      {unlocked && achievement.rarity === 'legendary' && (
        <div style={{
          position: 'absolute', inset: 0, borderRadius: 12,
          background: 'linear-gradient(105deg, transparent 40%, rgba(245,158,11,0.08) 50%, transparent 60%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 2.5s linear infinite',
          pointerEvents: 'none',
        }} />
      )}

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12, flexShrink: 0,
          background: unlocked ? `${rarity.color}20` : 'rgba(255,255,255,0.04)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22,
          boxShadow: unlocked ? `0 0 16px ${rarity.glow}` : 'none',
          filter: unlocked ? 'none' : 'grayscale(1)',
        }}>
          {unlocked ? achievement.icon : <Lock size={18} color="var(--text-dim)" />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: unlocked ? 'var(--text-primary)' : 'var(--text-muted)' }}>
              {achievement.title}
            </span>
            <span style={{
              padding: '1px 7px', borderRadius: 99, fontSize: 9, fontWeight: 700,
              letterSpacing: '0.06em', textTransform: 'uppercase',
              background: `${rarity.color}20`, color: rarity.color,
              border: `1px solid ${rarity.color}30`,
            }}>
              {rarity.label}
            </span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.4 }}>{achievement.description}</div>
          {achievement.xpReward > 0 && (
            <div style={{ marginTop: 6, fontSize: 11, fontWeight: 700, color: unlocked ? 'var(--accent-amber)' : 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: 3 }}>
              <Zap size={10} /> +{achievement.xpReward} XP
            </div>
          )}
        </div>
        {unlocked && (
          <div style={{ width: 20, height: 20, borderRadius: '50%', background: `${rarity.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ fontSize: 10 }}>✓</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export function GamificationPage({ progress, streak, username, onNavigate }: Props) {
  const [activeTab, setActiveTab] = useState<'overview' | 'achievements' | 'streaks'>('overview');
  const [filterRarity, setFilterRarity] = useState<'all' | 'common' | 'rare' | 'epic' | 'legendary'>('all');

  const unlockedIds = useMemo(() => getUnlockedAchievements(progress, streak), [progress, streak]);
  const xpInfo = useMemo(() => getXPProgress(streak.totalXP), [streak.totalXP]);
  const donePapers = progress.filter(p => p.status === 'done');

  const totalAchievements = ACHIEVEMENTS.length;
  const unlockedCount = unlockedIds.length;
  const completionPct = Math.round((unlockedCount / totalAchievements) * 100);

  const filtered = ACHIEVEMENTS.filter(a =>
    filterRarity === 'all' || a.rarity === filterRarity
  ).sort((a, b) => {
    const au = unlockedIds.includes(a.id);
    const bu = unlockedIds.includes(b.id);
    if (au && !bu) return -1;
    if (!au && bu) return 1;
    const rarityOrder = { legendary: 0, epic: 1, rare: 2, common: 3 };
    return rarityOrder[a.rarity] - rarityOrder[b.rarity];
  });

  // Weekly activity for the last 8 weeks
  const weeklyActivity = useMemo(() => {
    return Array.from({ length: 8 }, (_, i) => {
      const weekEnd = new Date();
      weekEnd.setDate(weekEnd.getDate() - i * 7);
      const weekStart = new Date(weekEnd);
      weekStart.setDate(weekStart.getDate() - 7);
      const count = progress.filter(p => {
        const d = new Date(p.date);
        return d >= weekStart && d < weekEnd;
      }).length;
      return { label: i === 0 ? 'This week' : `${i}w ago`, count };
    }).reverse();
  }, [progress]);

  const maxWeekly = Math.max(...weeklyActivity.map(w => w.count), 1);

  return (
    <div style={{ padding: '32px 28px', display: 'flex', flexDirection: 'column', gap: 28, maxWidth: 1100 }}>

      {/* ── Header ── */}
      <div className="animate-fade-up">
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.5rem,3vw,2rem)', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
          Progress & Achievements
        </h1>
        <p style={{ color: 'var(--text-muted)', marginTop: 4, fontSize: 14 }}>
          {unlockedCount} of {totalAchievements} achievements unlocked · Level {xpInfo.level.level} {xpInfo.level.icon}
        </p>
      </div>

      {/* ── XP / Level hero card ── */}
      <div className="glass gradient-border animate-fade-up stagger-1" style={{
        padding: '28px 32px', borderRadius: 'var(--radius-xl)',
        background: `linear-gradient(135deg, ${xpInfo.level.color}12, rgba(6,182,212,0.04))`,
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -60, right: -60, width: 200, height: 200, borderRadius: '50%', background: `radial-gradient(circle, ${xpInfo.level.color}15, transparent)`, pointerEvents: 'none' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
          {/* Level badge */}
          <div style={{
            width: 80, height: 80, borderRadius: 20, flexShrink: 0,
            background: `linear-gradient(135deg, ${xpInfo.level.color}, ${xpInfo.level.color}80)`,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 0 30px ${xpInfo.level.color}50`,
            animation: 'glow-pulse 3s ease-in-out infinite',
          }}>
            <span style={{ fontSize: 28 }}>{xpInfo.level.icon}</span>
            <span style={{ fontSize: 10, fontWeight: 800, color: '#fff', letterSpacing: '0.06em' }}>LV {xpInfo.level.level}</span>
          </div>

          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 2 }}>
              {xpInfo.level.title}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 14 }}>@{username} · <Counter to={streak.totalXP} /> total XP</div>

            {/* XP bar */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>
                <span>{xpInfo.current.toLocaleString()} / {xpInfo.needed.toLocaleString()} XP</span>
                {xpInfo.nextLevel && <span>Next: {xpInfo.nextLevel.icon} {xpInfo.nextLevel.title}</span>}
              </div>
              <div style={{ height: 10, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 99,
                  background: `linear-gradient(90deg, ${xpInfo.level.color}, ${xpInfo.level.color}80)`,
                  width: `${xpInfo.pct}%`,
                  transition: 'width 1.2s cubic-bezier(0.4,0,0.2,1)',
                  boxShadow: `0 0 10px ${xpInfo.level.color}60`,
                  position: 'relative',
                }}>
                  <div style={{ position: 'absolute', top: 0, right: 0, width: 30, height: '100%', background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.4))', borderRadius: 99 }} />
                </div>
              </div>
            </div>
          </div>

          {/* Quick stats */}
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {[
              { icon: '🔥', label: 'Streak',      value: streak.currentStreak, suffix: 'd' },
              { icon: '📝', label: 'Papers',       value: progress.length,      suffix: ''  },
              { icon: '✅', label: 'Done',         value: donePapers.length,    suffix: ''  },
              { icon: '🏆', label: 'Achievements', value: unlockedCount,        suffix: ''  },
            ].map(s => (
              <div key={s.label} style={{ textAlign: 'center', minWidth: 60 }}>
                <div style={{ fontSize: 20, marginBottom: 2 }}>{s.icon}</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
                  <Counter to={s.value} />{s.suffix}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tab switcher ── */}
      <div style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-dim)', borderRadius: 'var(--radius-md)', padding: 4, width: 'fit-content' }}>
        {([
          { id: 'overview',      label: 'Overview',      icon: '📊' },
          { id: 'achievements',  label: 'Achievements',  icon: '🏆' },
          { id: 'streaks',       label: 'Streaks',       icon: '🔥' },
        ] as const).map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '9px 18px', borderRadius: 9, fontSize: 13, fontWeight: 600,
              cursor: 'pointer', border: 'none', transition: 'all 0.2s',
              background: activeTab === tab.id ? 'linear-gradient(135deg, var(--accent-violet), #6d28d9)' : 'transparent',
              color: activeTab === tab.id ? '#fff' : 'var(--text-muted)',
              boxShadow: activeTab === tab.id ? '0 0 20px var(--glow-violet)' : 'none',
            }}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ── */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Level roadmap */}
          <div className="glass glow-card animate-fade-up" style={{ padding: 24, borderRadius: 'var(--radius-lg)' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 20 }}>Level Roadmap</h3>
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
              {LEVELS.map(lvl => {
                const isCurrentLevel = xpInfo.level.level === lvl.level;
                const isPast = xpInfo.level.level > lvl.level;
                return (
                  <div key={lvl.level} style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                    minWidth: 70, padding: '12px 8px', borderRadius: 10,
                    background: isCurrentLevel ? `${lvl.color}20` : isPast ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${isCurrentLevel ? lvl.color + '60' : 'transparent'}`,
                    boxShadow: isCurrentLevel ? `0 0 16px ${lvl.color}30` : 'none',
                    transition: 'all 0.2s',
                    opacity: isPast || isCurrentLevel ? 1 : 0.4,
                  }}>
                    <span style={{ fontSize: 20 }}>{lvl.icon}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: isCurrentLevel ? lvl.color : 'var(--text-muted)' }}>Lv.{lvl.level}</span>
                    <span style={{ fontSize: 9, color: 'var(--text-dim)', textAlign: 'center', lineHeight: 1.2 }}>{lvl.title}</span>
                    {isPast && <span style={{ fontSize: 9, color: 'var(--accent-emerald)' }}>✓</span>}
                    {isCurrentLevel && <span style={{ fontSize: 9, color: lvl.color, fontWeight: 700 }}>YOU</span>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Weekly activity chart */}
          <div className="glass glow-card animate-fade-up stagger-1" style={{ padding: 24, borderRadius: 'var(--radius-lg)' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 20 }}>Weekly Activity</h3>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', height: 100 }}>
              {weeklyActivity.map((w, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>{w.count || ''}</div>
                  <div style={{
                    width: '100%', borderRadius: '4px 4px 0 0',
                    height: `${Math.max((w.count / maxWeekly) * 76, w.count > 0 ? 8 : 4)}px`,
                    background: i === weeklyActivity.length - 1
                      ? 'linear-gradient(180deg, var(--accent-violet), #6d28d9)'
                      : w.count > 0
                      ? 'rgba(124,58,237,0.5)'
                      : 'rgba(255,255,255,0.06)',
                    boxShadow: i === weeklyActivity.length - 1 ? '0 0 12px var(--glow-violet)' : 'none',
                    transition: 'height 0.8s cubic-bezier(0.4,0,0.2,1)',
                  }} />
                  <div style={{ fontSize: 9, color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>{w.label.replace(' ago', '')}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Achievement preview */}
          <div className="glass glow-card animate-fade-up stagger-2" style={{ padding: 24, borderRadius: 'var(--radius-lg)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Achievements {unlockedCount}/{totalAchievements}
              </h3>
              <button onClick={() => setActiveTab('achievements')} className="btn-ghost" style={{ fontSize: 12, padding: '6px 12px' }}>
                View All <ChevronRight size={12} />
              </button>
            </div>
            {/* Completion bar */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>
                <span>{completionPct}% complete</span><span>{unlockedCount} unlocked</span>
              </div>
              <div className="progress-track"><div className="progress-fill" style={{ width: `${completionPct}%` }} /></div>
            </div>
            {/* Latest unlocked */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {ACHIEVEMENTS.filter(a => unlockedIds.includes(a.id)).slice(0, 6).map(a => {
                const r = RARITY_CONFIG[a.rarity];
                return (
                  <div key={a.id} title={a.title} style={{
                    width: 44, height: 44, borderRadius: 10,
                    background: r.bg, border: `1px solid ${r.color}40`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 22, boxShadow: `0 0 12px ${r.glow}`,
                    transition: 'transform 0.15s',
                  }}
                    onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.1)')}
                    onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
                  >{a.icon}</div>
                );
              })}
              {unlockedCount === 0 && <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Record papers to unlock achievements!</p>}
            </div>
          </div>
        </div>
      )}

      {/* ── ACHIEVEMENTS TAB ── */}
      {activeTab === 'achievements' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Rarity filter */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {(['all', 'common', 'rare', 'epic', 'legendary'] as const).map(r => {
              const cfg = r === 'all' ? { color: 'var(--accent-violet-bright)', label: 'All' } : { ...RARITY_CONFIG[r], label: RARITY_CONFIG[r].label };
              const active = filterRarity === r;
              return (
                <button key={r} onClick={() => setFilterRarity(r)}
                  style={{
                    padding: '7px 14px', borderRadius: 99, fontSize: 12, fontWeight: 600,
                    cursor: 'pointer', border: 'none', transition: 'all 0.15s',
                    background: active ? `${cfg.color}20` : 'rgba(255,255,255,0.04)',
                    color: active ? cfg.color : 'var(--text-muted)',
                    outline: active ? `1px solid ${cfg.color}50` : '1px solid var(--border-dim)',
                  }}>
                  {cfg.label}
                  {r !== 'all' && (
                    <span style={{ marginLeft: 5, opacity: 0.7 }}>
                      ({ACHIEVEMENTS.filter(a => a.rarity === r && unlockedIds.includes(a.id)).length}/{ACHIEVEMENTS.filter(a => a.rarity === r).length})
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
            {filtered.map((a, i) => (
              <AchievementCard key={a.id} achievement={a} unlocked={unlockedIds.includes(a.id)} delay={Math.min(i * 0.03, 0.3)} />
            ))}
          </div>
        </div>
      )}

      {/* ── STREAKS TAB ── */}
      {activeTab === 'streaks' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Streak stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
            {[
              { emoji: '🔥', label: 'Current Streak', value: streak.currentStreak, suffix: ' days', color: 'var(--accent-amber)' },
              { emoji: '🏆', label: 'Best Streak',    value: streak.longestStreak,  suffix: ' days', color: 'var(--accent-violet-bright)' },
              { emoji: '📅', label: 'Days Studied',   value: streak.studyDates.length, suffix: ' days', color: 'var(--accent-cyan)' },
              { emoji: '⚡', label: 'Total XP',       value: streak.totalXP,        suffix: ' xp',  color: 'var(--accent-emerald)' },
            ].map(s => (
              <div key={s.label} className="glass glow-card animate-fade-up" style={{ padding: '20px', borderRadius: 'var(--radius-lg)', textAlign: 'center' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>{s.emoji}</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 800, color: s.color, lineHeight: 1 }}>
                  <Counter to={s.value} />{s.suffix}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Calendar */}
          <div className="glass glow-card animate-fade-up stagger-1" style={{ padding: 24, borderRadius: 'var(--radius-lg)' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>
              Study Calendar — Last 28 Days
            </h3>
            <StreakCalendar studyDates={streak.studyDates} />
          </div>

          {/* Streak milestone progress */}
          <div className="glass glow-card animate-fade-up stagger-2" style={{ padding: 24, borderRadius: 'var(--radius-lg)' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>
              Streak Milestones
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[3, 7, 14, 30, 60, 100].map(milestone => {
                const best = Math.max(streak.currentStreak, streak.longestStreak);
                const done = best >= milestone;
                const pct = Math.min((best / milestone) * 100, 100);
                return (
                  <div key={milestone} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, background: done ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.04)', border: `1px solid ${done ? 'rgba(245,158,11,0.3)' : 'var(--border-dim)'}` }}>
                      {done ? '🔥' : '⬜'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                        <span style={{ color: done ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: done ? 600 : 400 }}>{milestone} day streak</span>
                        <span style={{ color: done ? 'var(--accent-emerald)' : 'var(--text-dim)', fontSize: 11 }}>{done ? '✓ Done' : `${best}/${milestone}`}</span>
                      </div>
                      <div className="progress-track" style={{ height: 5 }}>
                        <div style={{ height: '100%', borderRadius: 99, width: `${pct}%`, background: done ? 'linear-gradient(90deg, var(--accent-amber), var(--accent-emerald))' : 'linear-gradient(90deg, var(--accent-violet), var(--accent-cyan))', transition: 'width 1s cubic-bezier(0.4,0,0.2,1)', boxShadow: done ? '0 0 8px rgba(245,158,11,0.4)' : 'none' }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* CTA if no streak yet */}
          {streak.currentStreak === 0 && (
            <div className="glass gradient-border animate-fade-up stagger-3" style={{ padding: '28px 24px', borderRadius: 'var(--radius-lg)', textAlign: 'center', background: 'linear-gradient(135deg, rgba(124,58,237,0.08), rgba(6,182,212,0.04))' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🔥</div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: 8 }}>Start your streak today!</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>Log a paper to begin your study streak and unlock fire achievements</p>
              <button className="btn-primary" onClick={() => onNavigate?.('record')}><span>Log a Paper</span><ChevronRight size={14} /></button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
