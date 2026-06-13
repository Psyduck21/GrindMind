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

export const useAllActiveRoutines = (userId?: string) => {
  return useQuery({
    queryKey: ['routines', userId],
    queryFn: () => {
      if (!userId) return [];
      return db.getAllSync<any>('SELECT * FROM routines WHERE user_id = ? AND status = "active"', [userId]);
    },
    enabled: !!userId,
  });
};

export const useRoutine = (routineId?: string) => {
  return useQuery({
    queryKey: ['routine_detail', routineId],
    queryFn: () => {
      if (!routineId) return null;
      return db.getFirstSync<any>('SELECT * FROM routines WHERE id = ?', [routineId]) || null;
    },
    enabled: !!routineId,
  });
};

export const useAllTasksForToday = (userId?: string) => {
  return useQuery({
    queryKey: ['tasks', 'all', 'today', userId],
    queryFn: () => {
      if (!userId) return [];
      const routines = db.getAllSync<any>('SELECT * FROM routines WHERE user_id = ? AND status = "active"', [userId]);
      const targetDay = new Date().toLocaleDateString('en-US', { weekday: 'long' });
      
      let allTasks: any[] = [];
      
      for (const r of routines) {
        let targetWeek = 1;
        if (r.ai_generated_at) {
          const diffDays = Math.floor((Date.now() - r.ai_generated_at) / (1000 * 60 * 60 * 24));
          targetWeek = Math.floor(diffDays / 7) + 1;
        }
        
        const tasks = db.getAllSync<any>(
          'SELECT * FROM tasks WHERE routine_id = ? AND target_week = ? AND target_day = ? ORDER BY scheduled_time ASC',
          [r.id, targetWeek, targetDay]
        );
        
        const enrichedTasks = tasks.map(task => {
          const subtasks = db.getAllSync<any>('SELECT * FROM subtasks WHERE task_id = ? ORDER BY created_at ASC', [task.id]);
          return { ...task, subtasks, routine_title: r.title, routine_type: r.routine_type };
        });
        
        allTasks = [...allTasks, ...enrichedTasks];
      }
      
      return allTasks;
    },
    enabled: !!userId,
  });
};

export const useTasks = (routineId?: string, targetWeek?: number, targetDay?: string) => {
  return useQuery({
    queryKey: ['tasks', routineId, targetWeek, targetDay],
    queryFn: () => {
      if (!routineId) return [];
      
      let query = 'SELECT * FROM tasks WHERE routine_id = ?';
      const args: any[] = [routineId];
      
      if (targetWeek) {
        query += ' AND target_week = ?';
        args.push(targetWeek);
      }
      if (targetDay) {
        query += ' AND target_day = ?';
        args.push(targetDay);
      }
      
      query += ' ORDER BY scheduled_time ASC';
      const tasks = db.getAllSync<any>(query, args);
      
      const enrichedTasks = tasks.map(task => {
        const subtasks = db.getAllSync<any>('SELECT * FROM subtasks WHERE task_id = ? ORDER BY created_at ASC', [task.id]);
        return { ...task, subtasks };
      });
      return enrichedTasks;
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

export const useRoutineWeeks = (routineId?: string) => {
  return useQuery({
    queryKey: ['routine_weeks', routineId],
    queryFn: () => {
      if (!routineId) return [];
      return db.getAllSync<any>('SELECT * FROM routine_weeks WHERE routine_id = ? AND is_completed = 1', [routineId]);
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

export const useWeeklyCompletions = (userId?: string) => {
  return useQuery({
    queryKey: ['completions', 'weekly', userId],
    queryFn: () => {
      if (!userId) return [];
      // We want to fetch completions from the last 7 days
      // For MVP we just fetch all and filter/aggregate in JS, since SQLite dates might be tricky.
      const allCompletions = db.getAllSync<any>(
        'SELECT * FROM task_completions WHERE user_id = ? AND state = "completed"',
        [userId]
      );
      
      const countsByDate: Record<string, number> = {};
      allCompletions.forEach((c) => {
        countsByDate[c.date] = (countsByDate[c.date] || 0) + 1;
      });

      // Generate last 7 days array
      const result = [];
      const today = new Date();
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        // format YYYY-MM-DD
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
        
        result.push({
          date: dateStr,
          dayName,
          count: countsByDate[dateStr] || 0
        });
      }
      return result;
    },
    enabled: !!userId,
  });
};
