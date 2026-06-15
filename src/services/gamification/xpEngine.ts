import { db } from '../../db/db';
import { XP_TABLE } from '../../constants/xpConfig';

/**
 * Returns the total lifetime XP for a user.
 */
export const getTotalXp = async (userId: string): Promise<number> => {
  const row = await db.getFirstAsync<any>(
    'SELECT SUM(xp_awarded) as total FROM task_completions WHERE user_id = ?',
    [userId]
  );
  // Also include XP from badge rewards
  const badgeRow = await db.getFirstAsync<any>(
    'SELECT SUM(xp_awarded) as total FROM achievements WHERE user_id = ?',
    [userId]
  );
  return (row?.total || 0) + (badgeRow?.total || 0);
};


/**
 * Awards streak milestone bonuses to task_completions.
 * Called after each completion to check if streak milestone was hit.
 */
export const checkStreakBonus = async (userId: string, currentStreak: number): Promise<number> => {
  let bonus = 0;
  if (currentStreak === 7) bonus = XP_TABLE.daily_streak_7;
  if (currentStreak === 30) bonus = XP_TABLE.daily_streak_30;

  if (bonus > 0) {
    // Log a streak bonus entry in analytics_events so it's traceable
    await db.runAsync(
      `INSERT INTO analytics_events (id, user_id, event_name, properties, created_at)
       VALUES (hex(randomblob(16)), ?, 'streak_bonus', json_object('streak', ?, 'xp', ?), ?)`,
      [userId, currentStreak, bonus, Date.now()]
    );
  }
  return bonus;
};
