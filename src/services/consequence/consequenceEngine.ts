import { db } from '../../db/db';
import uuid from 'react-native-uuid';
import { TaskItem } from '../../components/dashboard/TaskRow';
import { getLocalYYYYMMDD } from '../../utils/date';
import { queueOperation } from '../sync/syncEngine';

export const processTaskMiss = async (task: TaskItem, userId: string, skipReason: string) => {
  const now = Date.now();
  const dateStr = getLocalYYYYMMDD();
  
  // 1. Log the skip in task_completions
  const completionId = uuid.v4();
  await db.runAsync(
    `INSERT INTO task_completions (id, task_id, user_id, date, state, skip_reason, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [completionId, task.id, userId, dateStr, 'skipped', skipReason, now]
  );
  queueOperation('task_completions', 'INSERT', {
    id: completionId, task_id: task.id, user_id: userId, date: dateStr, state: 'skipped', skip_reason: skipReason, created_at: now
  });
  
  // 2. Update task status
  await db.runAsync(`UPDATE tasks SET status = 'skipped', updated_at = ? WHERE id = ?`, [now, task.id]);
  queueOperation('tasks', 'UPDATE', { id: task.id, status: 'skipped', updated_at: now });
  
  // 3. Determine Consequence based on priority (Deterministic rules)
  const pastMisses = (await db.getAllAsync<any>(`SELECT id FROM task_completions WHERE task_id = ? AND state = 'skipped'`, [task.id])).length;
  
  let recoverySeverity = 'none';
  let penaltyMinutes = 0;
  
  if (task.priority === 'critical') {
    recoverySeverity = pastMisses > 1 ? 'strong' : 'moderate';
    penaltyMinutes = pastMisses > 1 ? 30 : 15;
  } else if (task.priority === 'high') {
    recoverySeverity = pastMisses > 1 ? 'moderate' : 'light';
    penaltyMinutes = pastMisses > 1 ? 15 : 10;
  } else if (task.priority === 'medium') {
    recoverySeverity = 'light';
    penaltyMinutes = 5;
  }

  // 4. Generate recovery task if severity > none
  if (recoverySeverity !== 'none' && penaltyMinutes > 0) {
    const recoveryId = uuid.v4();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = getLocalYYYYMMDD(tomorrow);
    
    await db.runAsync(
      `INSERT INTO recovery_tasks (id, source_task_id, user_id, title, description, scheduled_date, severity, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        recoveryId,
        task.id,
        userId,
        `MAKE-UP: ${task.title}`,
        `Penalty for skipping. Original reason: ${skipReason}`,
        tomorrowStr,
        recoverySeverity,
        now,
        now
      ]
    );
    queueOperation('recovery_tasks', 'INSERT', {
      id: recoveryId, source_task_id: task.id, user_id: userId, title: `MAKE-UP: ${task.title}`, description: `Penalty for skipping. Original reason: ${skipReason}`, scheduled_date: tomorrowStr, severity: recoverySeverity, created_at: now, updated_at: now
    });

    const tomorrowDayName = tomorrow.toLocaleDateString('en-US', { weekday: 'long' });
    const fullTask = await db.getFirstAsync<any>('SELECT * FROM tasks WHERE id = ?', [task.id]);
    
    let nextWeek = fullTask?.target_week || 1;
    if (tomorrowDayName === 'Monday' && fullTask?.target_day === 'Sunday') {
      nextWeek += 1;
    }

    // Also push a real task into the schedule for tomorrow
    const newTaskId = uuid.v4();
    await db.runAsync(
      `INSERT INTO tasks (id, routine_id, title, description, priority, category, scheduled_time, scheduled_date, estimated_duration_minutes, is_recovery_task, is_backlog, target_week, target_day, is_time_locked, is_gamified, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'high', ?, '06:00', ?, ?, 1, 0, ?, ?, 0, 1, ?, ?)`,
       [newTaskId, fullTask.routine_id, `[RECOVERY] ${task.title}`, `You owe this time. Get it done.`, fullTask.category, tomorrowStr, penaltyMinutes, nextWeek, tomorrowDayName, now, now]
    );
    queueOperation('tasks', 'INSERT', {
      id: newTaskId, routine_id: fullTask.routine_id, title: `[RECOVERY] ${task.title}`, description: `You owe this time. Get it done.`, priority: 'high', category: fullTask.category, scheduled_time: '06:00', scheduled_date: tomorrowStr, estimated_duration_minutes: penaltyMinutes, is_recovery_task: 1, is_backlog: 0, target_week: nextWeek, target_day: tomorrowDayName, is_time_locked: 0, is_gamified: 1, created_at: now, updated_at: now
    });
  }
};
