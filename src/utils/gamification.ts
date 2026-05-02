import { ProgressEntry, StreakData } from '../App';

// ─── XP Values ────────────────────────────────────────────────────────────────
export const XP = {
  PAPER_LOGGED:    30,
  PAPER_DONE:      50,
  SCORE_A_STAR:    100,
  SCORE_A:         75,
  SCORE_B:         50,
  STREAK_DAY:      20,
  STREAK_WEEK:     150,
  STREAK_MONTH:    500,
  FIRST_PAPER:     200,
  TENTH_PAPER:     300,
  FIFTIETH_PAPER:  1000,
};

// ─── Levels ───────────────────────────────────────────────────────────────────
export interface Level {
  level: number;
  title: string;
  minXP: number;
  maxXP: number;
  color: string;
  icon: string;
}

export const LEVELS: Level[] = [
  { level: 1,  title: 'Beginner',      minXP: 0,     maxXP: 200,   color: '#6b7280', icon: '🌱' },
  { level: 2,  title: 'Novice',        minXP: 200,   maxXP: 500,   color: '#06b6d4', icon: '📖' },
  { level: 3,  title: 'Student',       minXP: 500,   maxXP: 1000,  color: '#3b82f6', icon: '✏️' },
  { level: 4,  title: 'Practitioner',  minXP: 1000,  maxXP: 2000,  color: '#7c3aed', icon: '📚' },
  { level: 5,  title: 'Scholar',       minXP: 2000,  maxXP: 3500,  color: '#a855f7', icon: '🎓' },
  { level: 6,  title: 'Expert',        minXP: 3500,  maxXP: 5500,  color: '#ec4899', icon: '🧠' },
  { level: 7,  title: 'Master',        minXP: 5500,  maxXP: 8000,  color: '#f59e0b', icon: '⭐' },
  { level: 8,  title: 'Champion',      minXP: 8000,  maxXP: 11000, color: '#10b981', icon: '🏆' },
  { level: 9,  title: 'Legend',        minXP: 11000, maxXP: 15000, color: '#f43f5e', icon: '🔥' },
  { level: 10, title: 'Grandmaster',   minXP: 15000, maxXP: 99999, color: '#a855f7', icon: '👑' },
];

export function getLevelFromXP(xp: number): Level {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].minXP) return LEVELS[i];
  }
  return LEVELS[0];
}

export function getXPProgress(xp: number): { current: number; needed: number; pct: number; level: Level; nextLevel: Level | null } {
  const level = getLevelFromXP(xp);
  const nextLevel = LEVELS.find(l => l.level === level.level + 1) || null;
  const current = xp - level.minXP;
  const needed = level.maxXP - level.minXP;
  return { current, needed, pct: Math.min((current / needed) * 100, 100), level, nextLevel };
}

// ─── Achievement definitions ──────────────────────────────────────────────────
export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  xpReward: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  check: (progress: ProgressEntry[], streak: StreakData) => boolean;
}

export const ACHIEVEMENTS: Achievement[] = [
  // First steps
  {
    id: 'first_paper',
    title: 'First Step',
    description: 'Log your very first paper',
    icon: '🎯',
    xpReward: 200,
    rarity: 'common',
    check: (p) => p.length >= 1,
  },
  {
    id: 'five_papers',
    title: 'Getting Started',
    description: 'Log 5 papers',
    icon: '📝',
    xpReward: 150,
    rarity: 'common',
    check: (p) => p.length >= 5,
  },
  {
    id: 'ten_papers',
    title: 'In the Zone',
    description: 'Log 10 papers',
    icon: '📚',
    xpReward: 300,
    rarity: 'common',
    check: (p) => p.length >= 10,
  },
  {
    id: 'twenty_five_papers',
    title: 'Dedicated',
    description: 'Log 25 papers',
    icon: '💪',
    xpReward: 500,
    rarity: 'rare',
    check: (p) => p.length >= 25,
  },
  {
    id: 'fifty_papers',
    title: 'Paper Machine',
    description: 'Log 50 papers',
    icon: '🏭',
    xpReward: 1000,
    rarity: 'rare',
    check: (p) => p.length >= 50,
  },
  {
    id: 'hundred_papers',
    title: 'Century',
    description: 'Log 100 papers — absolute legend',
    icon: '💯',
    xpReward: 2500,
    rarity: 'legendary',
    check: (p) => p.length >= 100,
  },
  // Score achievements
  {
    id: 'first_astar',
    title: 'Star Performer',
    description: 'Score an A* on any paper',
    icon: '⭐',
    xpReward: 300,
    rarity: 'rare',
    check: (p) => p.some(e => e.maxScore > 0 && (e.score / e.maxScore) >= 0.9),
  },
  {
    id: 'five_astars',
    title: 'On Fire',
    description: 'Score A* on 5 papers',
    icon: '🔥',
    xpReward: 600,
    rarity: 'rare',
    check: (p) => p.filter(e => e.maxScore > 0 && (e.score / e.maxScore) >= 0.9).length >= 5,
  },
  {
    id: 'ten_astars',
    title: 'Grade God',
    description: 'Score A* on 10 papers',
    icon: '🌟',
    xpReward: 1200,
    rarity: 'epic',
    check: (p) => p.filter(e => e.maxScore > 0 && (e.score / e.maxScore) >= 0.9).length >= 10,
  },
  {
    id: 'perfect_score',
    title: 'Perfectionist',
    description: 'Score 100% on any paper',
    icon: '💎',
    xpReward: 500,
    rarity: 'epic',
    check: (p) => p.some(e => e.maxScore > 0 && e.score === e.maxScore),
  },
  // Streak achievements
  {
    id: 'streak_3',
    title: 'Consistent',
    description: 'Study 3 days in a row',
    icon: '🎯',
    xpReward: 100,
    rarity: 'common',
    check: (_, s) => s.currentStreak >= 3 || s.longestStreak >= 3,
  },
  {
    id: 'streak_7',
    title: 'Week Warrior',
    description: 'Study 7 days in a row',
    icon: '🗓️',
    xpReward: 300,
    rarity: 'rare',
    check: (_, s) => s.currentStreak >= 7 || s.longestStreak >= 7,
  },
  {
    id: 'streak_14',
    title: 'Fortnight Force',
    description: 'Study 14 days in a row',
    icon: '⚡',
    xpReward: 600,
    rarity: 'epic',
    check: (_, s) => s.currentStreak >= 14 || s.longestStreak >= 14,
  },
  {
    id: 'streak_30',
    title: 'Unstoppable',
    description: 'Study 30 days in a row',
    icon: '🔱',
    xpReward: 1500,
    rarity: 'legendary',
    check: (_, s) => s.currentStreak >= 30 || s.longestStreak >= 30,
  },
  // Subject mastery
  {
    id: 'multi_subject',
    title: 'Polymath',
    description: 'Log papers across 3+ different subjects',
    icon: '🧩',
    xpReward: 400,
    rarity: 'rare',
    check: (p) => new Set(p.map(e => e.subjectCode)).size >= 3,
  },
  {
    id: 'improver',
    title: 'Improver',
    description: 'Beat your previous score in the same paper',
    icon: '📈',
    xpReward: 250,
    rarity: 'common',
    check: (p) => {
      const byPaper = new Map<string, number[]>();
      p.forEach(e => {
        const key = `${e.subjectCode}-${e.component}-${e.year}-${e.session}`;
        const pct = e.maxScore > 0 ? e.score / e.maxScore : 0;
        if (!byPaper.has(key)) byPaper.set(key, []);
        byPaper.get(key)!.push(pct);
      });
      for (const scores of byPaper.values()) {
        if (scores.length >= 2 && scores[scores.length - 1] > scores[0]) return true;
      }
      return false;
    },
  },
  {
    id: 'xp_1000',
    title: 'XP Collector',
    description: 'Earn 1,000 XP total',
    icon: '💰',
    xpReward: 0,
    rarity: 'common',
    check: (_, s) => s.totalXP >= 1000,
  },
  {
    id: 'xp_5000',
    title: 'XP Hunter',
    description: 'Earn 5,000 XP total',
    icon: '💎',
    xpReward: 0,
    rarity: 'epic',
    check: (_, s) => s.totalXP >= 5000,
  },
];

export const RARITY_CONFIG = {
  common:    { label: 'Common',    color: '#9ca3af', glow: 'rgba(156,163,175,0.3)',  bg: 'rgba(156,163,175,0.1)'  },
  rare:      { label: 'Rare',      color: '#3b82f6', glow: 'rgba(59,130,246,0.3)',   bg: 'rgba(59,130,246,0.1)'   },
  epic:      { label: 'Epic',      color: '#a855f7', glow: 'rgba(168,85,247,0.4)',   bg: 'rgba(168,85,247,0.12)'  },
  legendary: { label: 'Legendary', color: '#f59e0b', glow: 'rgba(245,158,11,0.5)',   bg: 'rgba(245,158,11,0.15)'  },
};

export function getUnlockedAchievements(progress: ProgressEntry[], streak: StreakData): string[] {
  return ACHIEVEMENTS.filter(a => a.check(progress, streak)).map(a => a.id);
}

export function computeTotalXP(progress: ProgressEntry[], streak: StreakData): number {
  let xp = streak.totalXP;

  // Bonus XP from achievements
  const unlocked = getUnlockedAchievements(progress, streak);
  unlocked.forEach(id => {
    const ach = ACHIEVEMENTS.find(a => a.id === id);
    if (ach) xp += ach.xpReward;
  });

  return xp;
}
