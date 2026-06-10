import { useQuery } from '@tanstack/react-query';
import { db } from '../db/db';
import { getLocalYYYYMMDD } from '../utils/date';

export const useUser = () => {
  return useQuery({
    queryKey: ['user'],
    queryFn: () => {
      const user = db.getFirstSync<any>('SELECT * FROM users LIMIT 1');
      return user || null;
    },
  });
};

export const useActiveRoutine = (userId?: string) => {
  return useQuery({
    queryKey: ['routine', userId],
    queryFn: () => {
      if (!userId) return null;
      const routine = db.getFirstSync<any>('SELECT * FROM routines WHERE user_id = ? AND status = "active"', [userId]);
      return routine || null;
    },
    enabled: !!userId,
  });
};

export const useTasks = (routineId?: string) => {
  return useQuery({
    queryKey: ['tasks', routineId],
    queryFn: () => {
      if (!routineId) return [];
      return db.getAllSync<any>('SELECT * FROM tasks WHERE routine_id = ? ORDER BY scheduled_time ASC', [routineId]);
    },
    enabled: !!routineId,
  });
};

// We will also need a query to fetch the user's completions for the current day to calculate progress.
export const useTodayCompletions = (userId?: string) => {
  return useQuery({
    queryKey: ['completions', 'today', userId],
    queryFn: () => {
      if (!userId) return [];
      const todayDate = getLocalYYYYMMDD();
      return db.getAllSync<any>('SELECT * FROM task_completions WHERE user_id = ? AND date = ?', [userId, todayDate]);
    },
    enabled: !!userId,
  });
};

export const useHabits = (routineId?: string) => {
  return useQuery({
    queryKey: ['habits', routineId],
    queryFn: () => {
      if (!routineId) return [];
      return db.getAllSync<any>('SELECT * FROM habits WHERE routine_id = ? ORDER BY title ASC', [routineId]);
    },
    enabled: !!routineId,
  });
};

export const useWeeklyReport = (userId?: string) => {
  return useQuery({
    queryKey: ['weekly_report', userId],
    queryFn: () => {
      if (!userId) return null;
      const row = db.getFirstSync<any>(
        'SELECT * FROM weekly_reports WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
        [userId]
      );
      if (!row) return null;
      return {
        id: row.id,
        weekStart: row.week_start,
        weekEnd: row.week_end,
        tasksCompleted: row.tasks_completed,
        tasksMissed: row.tasks_missed,
        recoveryCompleted: row.recovery_completed,
        consistencyScore: row.consistency_score,
        streak: row.streak_change,
        suggestions: JSON.parse(row.suggestions || '[]'),
        pattern: JSON.parse(row.behavior_summary || '{}'),
      };
    },
    enabled: !!userId,
  });
};
