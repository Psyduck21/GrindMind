import { db } from '../../db/db';
import { XP_TABLE } from '../../constants/xpConfig';

/**
 * Returns the total lifetime XP for a user.
 */
export const getTotalXp = (userId: string): number => {
  const row = db.getFirstSync<any>(
    'SELECT SUM(xp_awarded) as total FROM task_completions WHERE user_id = ?',
    [userId]
  );
  // Also include XP from badge rewards
  const badgeRow = db.getFirstSync<any>(
    'SELECT SUM(xp_awarded) as total FROM achievements WHERE user_id = ?',
    [userId]
  );
  return (row?.total || 0) + (badgeRow?.total || 0);
};

/**
 * Calculates XP for a given task completion.
 */
export const calcTaskXp = (priority: string, isRecovery: boolean): number => {
  if (isRecovery) return XP_TABLE.recovery;
  return (XP_TABLE as any)[priority] ?? 10;
};

/**
 * Awards streak milestone bonuses to task_completions.
 * Called after each completion to check if streak milestone was hit.
 */
export const checkStreakBonus = (userId: string, currentStreak: number): number => {
  let bonus = 0;
  if (currentStreak === 7) bonus = XP_TABLE.daily_streak_7;
  if (currentStreak === 30) bonus = XP_TABLE.daily_streak_30;

  if (bonus > 0) {
    // Log a streak bonus entry in analytics_events so it's traceable
    db.runSync(
      `INSERT INTO analytics_events (id, user_id, event_name, properties, created_at)
       VALUES (hex(randomblob(16)), ?, 'streak_bonus', json_object('streak', ?, 'xp', ?), ?)`,
      [userId, currentStreak, bonus, Date.now()]
    );
  }
  return bonus;
};
