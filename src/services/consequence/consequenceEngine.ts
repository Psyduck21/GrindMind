import { db } from '../../db/db';
import uuid from 'react-native-uuid';
import { TaskItem } from '../../components/dashboard/TaskRow';

import { getLocalYYYYMMDD } from '../../utils/date';

export const processTaskMiss = (task: TaskItem, userId: string, skipReason: string) => {
  const now = Date.now();
  const dateStr = getLocalYYYYMMDD();
  
  // 1. Log the skip in task_completions
  db.runSync(
    `INSERT INTO task_completions (id, task_id, user_id, date, state, skip_reason, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [uuid.v4(), task.id, userId, dateStr, 'skipped', skipReason, now]
  );
  
  // 2. Update task status
  db.runSync(`UPDATE tasks SET status = 'skipped', updated_at = ? WHERE id = ?`, [now, task.id]);
  
  // 3. Determine Consequence based on priority (Deterministic rules)
  // TRD Logic:
  // critical: moderate (+15 min), 2nd miss = strong
  // high: light (short task), 2nd miss = moderate
  // medium: optional make-up
  // low: none
  
  const pastMisses = db.getAllSync<any>(`SELECT id FROM task_completions WHERE task_id = ? AND state = 'skipped'`, [task.id]).length;
  
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
    
    db.runSync(
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

    // Also push a real task into the schedule for tomorrow
    db.runSync(
      `INSERT INTO tasks (id, routine_id, title, description, priority, category, scheduled_time, estimated_duration_minutes, is_recovery_task, created_at, updated_at)
       SELECT ?, routine_id, ?, ?, 'high', category, '06:00', ?, 1, ?, ?
       FROM tasks WHERE id = ?`,
       [uuid.v4(), `[RECOVERY] ${task.title}`, `You owe this time. Get it done.`, penaltyMinutes, now, now, task.id]
    );
  }
};
