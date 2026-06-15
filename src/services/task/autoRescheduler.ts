import { db } from '../../db/db';
import uuid from 'react-native-uuid';
import { getLocalYYYYMMDD } from '../../utils/date';
import { queueOperation } from '../sync/syncEngine';

const DAY_ORDER: Record<string, number> = {
  'Monday': 1,
  'Tuesday': 2,
  'Wednesday': 3,
  'Thursday': 4,
  'Friday': 5,
  'Saturday': 6,
  'Sunday': 7
};

export const autoRescheduleMissedTasks = async () => {
  try {
    const users = await db.getAllAsync<any>('SELECT * FROM users');
    if (!users || users.length === 0) return;
    const user = users[0];
    const userId = user.id;

    const routines = await db.getAllAsync<any>('SELECT * FROM routines WHERE user_id = ? AND status = "active"', [userId]);
    const currentDayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    const currentDayIndex = DAY_ORDER[currentDayName] || 1;
    const todayDate = getLocalYYYYMMDD();
    const now = Date.now();

    for (const r of routines) {
      let currentWeek = 1;
      if (r.ai_generated_at) {
        const startOfRoutineDay = new Date(r.ai_generated_at);
        startOfRoutineDay.setHours(0, 0, 0, 0);
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const diffDays = Math.round((startOfToday.getTime() - startOfRoutineDay.getTime()) / (1000 * 60 * 60 * 24));
        currentWeek = Math.floor(diffDays / 7) + 1;
      }

      // Get all 'not_started' tasks for this routine
      const tasks = await db.getAllAsync<any>(
        'SELECT * FROM tasks WHERE routine_id = ? AND status = "not_started"',
        [r.id]
      );

      for (const task of tasks) {
        const taskWeek = task.target_week;
        const taskDayIndex = DAY_ORDER[task.target_day] || 1;

        const isPast = taskWeek < currentWeek || (taskWeek === currentWeek && taskDayIndex < currentDayIndex);

        if (isPast) {
          // Mark as missed in completions
          const completionId = uuid.v4() as string;
          try {
            await db.runAsync(
              `INSERT INTO task_completions (id, task_id, user_id, date, state, created_at)
               VALUES (?, ?, ?, ?, ?, ?)`,
              [completionId, task.id, userId, todayDate, 'missed', now]
            );
            queueOperation('task_completions', 'INSERT', {
              id: completionId, task_id: task.id, user_id: userId, date: todayDate, state: 'missed', created_at: now
            });
          } catch (e) {
            console.log('Completion insert failed or exists', e);
          }

          // Reschedule to today
          await db.runAsync(
            'UPDATE tasks SET target_week = ?, target_day = ?, scheduled_date = ?, updated_at = ? WHERE id = ?',
            [currentWeek, currentDayName, todayDate, now, task.id]
          );
          queueOperation('tasks', 'UPDATE', {
            id: task.id, target_week: currentWeek, target_day: currentDayName, scheduled_date: todayDate, updated_at: now
          });
        }
      }
    }
  } catch (error) {
    console.error('Error auto-rescheduling missed tasks:', error);
  }
};
