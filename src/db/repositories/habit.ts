import { db } from '../db';
import uuid from 'react-native-uuid';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface HabitItem {
  id: string;
  title: string;
  recurrence_rule: string;
  streak_count: number;
  longest_streak: number;
  completion_count: number;
  last_completed_at: number | null;
}

// ─── Read ─────────────────────────────────────────────────────────────────────
export const getHabitsForRoutine = async (routineId: string): Promise<HabitItem[]> => {
  return await db.getAllAsync<HabitItem>(
    'SELECT * FROM habits WHERE routine_id = ? ORDER BY title ASC',
    [routineId]
  );
};

// ─── Complete a habit ─────────────────────────────────────────────────────────
/**
 * Marks a habit as completed for today.
 * Updates streak_count, longest_streak, completion_count, last_completed_at.
 * Streak is consecutive calendar days.
 */
export const completeHabit = async (habitId: string) => {
  const habit = await db.getFirstAsync<HabitItem>('SELECT * FROM habits WHERE id = ?', [habitId]);
  if (!habit) return;

  const now = Date.now();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  // Determine if last completion was yesterday (to extend streak) or gap (reset to 1)
  let newStreak = 1;
  if (habit.last_completed_at) {
    const lastDate = new Date(habit.last_completed_at);
    lastDate.setHours(0, 0, 0, 0);
    const diffDays = Math.round(
      (todayStart.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (diffDays === 1) {
      newStreak = habit.streak_count + 1;
    } else if (diffDays === 0) {
      // Already completed today — do nothing
      return;
    }
  }

  const newLongest = Math.max(newStreak, habit.longest_streak);

  await db.runAsync(
    `UPDATE habits
     SET streak_count = ?, longest_streak = ?, completion_count = completion_count + 1, last_completed_at = ?, updated_at = ?
     WHERE id = ?`,
    [newStreak, newLongest, now, now, habitId]
  );
};

// ─── Check if habit was completed today ───────────────────────────────────────
export const isHabitCompletedToday = (habit: HabitItem): boolean => {
  if (!habit.last_completed_at) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const lastDate = new Date(habit.last_completed_at);
  lastDate.setHours(0, 0, 0, 0);
  return lastDate.getTime() === today.getTime();
};

// ─── Seed default habits from AI routine ─────────────────────────────────────
export const saveHabitsForRoutine = async (
  routineId: string,
  habits: Array<{ title: string; recurrence_rule: string }>
) => {
  const now = Date.now();
  for (const h of habits) {
    await db.runAsync(
      `INSERT OR IGNORE INTO habits (id, routine_id, title, recurrence_rule, streak_count, longest_streak, completion_count, created_at, updated_at)
       VALUES (?, ?, ?, ?, 0, 0, 0, ?, ?)`,
      [uuid.v4() as string, routineId, h.title, h.recurrence_rule, now, now]
    );
  }
};
