/**
 * XP Configuration
 * TRD §11 — Gamification
 */

export const XP_TABLE = {
  critical: 50,
  high: 30,
  medium: 15,
  low: 5,
  optional: 2,
  recovery: 25,
  habit: 10,
  daily_streak_7: 100,  // Bonus at 7-day streak
  daily_streak_30: 500, // Bonus at 30-day streak
  perfect_day: 75,
} as const;

export const LEVELS = [
  { level: 1, title: 'Starter',     minXp: 0    },
  { level: 2, title: 'Committed',   minXp: 200  },
  { level: 3, title: 'Consistent',  minXp: 500  },
  { level: 4, title: 'Disciplined', minXp: 1000 },
  { level: 5, title: 'Elite',       minXp: 2000 },
] as const;

export const getLevelInfo = (totalXp: number) => {
  let current: typeof LEVELS[number] = LEVELS[0];
  for (const lvl of LEVELS) {
    if (totalXp >= lvl.minXp) current = lvl;
  }
  const nextIdx = LEVELS.findIndex((l) => l.level === current.level + 1);
  const next = nextIdx !== -1 ? LEVELS[nextIdx] : null;
  const progress = next
    ? (totalXp - current.minXp) / (next.minXp - current.minXp)
    : 1;
  return { current, next, progress: Math.min(1, progress) };
};
