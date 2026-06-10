import { db } from '../../db/db';

/**
 * Returns the current consecutive-day completion streak for a user.
 * A day counts toward the streak if at least one task was completed on that date.
 */
export const calculateStreak = (userId: string): number => {
  const rows = db.getAllSync<any>(
    `SELECT DISTINCT date FROM task_completions
     WHERE user_id = ? AND state = 'completed'
     ORDER BY date DESC`,
    [userId]
  );

  if (!rows || rows.length === 0) return 0;

  let streak = 0;
  let cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  for (const row of rows) {
    const rowDate = new Date(row.date);
    rowDate.setHours(0, 0, 0, 0);

    const diffDays = Math.round((cursor.getTime() - rowDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0 || diffDays === 1) {
      streak++;
      cursor = rowDate;
    } else {
      break; // Gap in consecutive days
    }
  }

  return streak;
};

/**
 * Awards XP for a completed task and returns the amount awarded.
 */
const XP_TABLE: Record<string, number> = {
  critical: 50,
  high: 30,
  medium: 15,
  low: 5,
  recovery: 25,
};

export const getXpForTask = (priority: string, isRecovery: boolean): number => {
  if (isRecovery) return XP_TABLE.recovery;
  return XP_TABLE[priority] || 10;
};

/**
 * Calculates user level from total XP.
 * Level thresholds per TRD §11.
 */
const LEVEL_THRESHOLDS = [0, 200, 500, 1000, 2000];
const LEVEL_TITLES = ['Starter', 'Committed', 'Consistent', 'Disciplined', 'Elite'];

export const getLevelFromXp = (xp: number): { level: number; title: string; nextThreshold: number } => {
  let level = 1;
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i]) {
      level = i + 1;
      break;
    }
  }
  return {
    level,
    title: LEVEL_TITLES[level - 1],
    nextThreshold: LEVEL_THRESHOLDS[level] ?? LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1],
  };
};
