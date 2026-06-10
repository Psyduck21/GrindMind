import { db } from '../../db/db';
import { BADGE_DEFINITIONS, BadgeStats } from '../../constants/badgeDefinitions';
import { XP_TABLE } from '../../constants/xpConfig';
import uuid from 'react-native-uuid';

/**
 * Reads current badge stats for a user from SQLite.
 */
export const getBadgeStats = (userId: string): BadgeStats => {
  const totalCompletedRow = db.getFirstSync<any>(
    "SELECT COUNT(*) as count FROM task_completions WHERE user_id = ? AND state = 'completed'",
    [userId]
  );
  const totalCompleted = totalCompletedRow?.count || 0;

  // Count recovery completions
  const recoveryRow = db.getFirstSync<any>(
    `SELECT COUNT(tc.id) as count FROM task_completions tc
     JOIN tasks t ON tc.task_id = t.id
     WHERE tc.user_id = ? AND tc.state = 'completed' AND t.is_recovery_task = 1`,
    [userId]
  );
  const recoveryCompleted = recoveryRow?.count || 0;

  // Count perfect days (days where all tasks were completed)
  // Simplified: days with at least 1 completed and 0 skipped
  const dayStats = db.getAllSync<any>(
    `SELECT date,
       SUM(CASE WHEN state = 'completed' THEN 1 ELSE 0 END) as done,
       SUM(CASE WHEN state = 'skipped'   THEN 1 ELSE 0 END) as missed
     FROM task_completions WHERE user_id = ? GROUP BY date`,
    [userId]
  );
  const perfectDays = dayStats.filter((d) => d.done > 0 && d.missed === 0).length;

  // Current streak (re-uses streakCalculator logic inline for simplicity)
  const dates = db.getAllSync<any>(
    `SELECT DISTINCT date FROM task_completions WHERE user_id = ? AND state = 'completed' ORDER BY date DESC`,
    [userId]
  );
  let streak = 0;
  let cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  for (const row of dates) {
    const d = new Date(row.date);
    d.setHours(0, 0, 0, 0);
    const diff = Math.round((cursor.getTime() - d.getTime()) / 86400000);
    if (diff === 0 || diff === 1) { streak++; cursor = d; }
    else break;
  }

  // Total XP from completions
  const xpRow = db.getFirstSync<any>(
    'SELECT SUM(xp_awarded) as total FROM task_completions WHERE user_id = ?',
    [userId]
  );
  const totalXp = xpRow?.total || 0;

  return {
    streak,
    totalCompleted,
    totalRecoveryCompleted: recoveryCompleted,
    perfectDays,
    totalXp,
    firstTaskDone: totalCompleted > 0,
  };
};

/**
 * Checks all badge definitions against current stats.
 * Inserts any newly earned badges and returns their names.
 */
export const checkAndAwardBadges = (userId: string): string[] => {
  const stats = getBadgeStats(userId);
  const existing = db.getAllSync<any>(
    'SELECT badge_name FROM achievements WHERE user_id = ?',
    [userId]
  ).map((r) => r.badge_name);

  const newlyUnlocked: string[] = [];

  for (const badge of BADGE_DEFINITIONS) {
    if (existing.includes(badge.id)) continue;
    if (badge.check(stats)) {
      db.runSync(
        `INSERT INTO achievements (id, user_id, badge_name, achieved_at, xp_awarded)
         VALUES (?, ?, ?, ?, ?)`,
        [uuid.v4() as string, userId, badge.id, Date.now(), badge.xpReward]
      );
      newlyUnlocked.push(badge.name);
    }
  }

  return newlyUnlocked;
};

/**
 * Returns all earned achievement records for a user.
 */
export const getAchievements = (userId: string) => {
  return db.getAllSync<any>(
    'SELECT * FROM achievements WHERE user_id = ? ORDER BY achieved_at DESC',
    [userId]
  );
};
