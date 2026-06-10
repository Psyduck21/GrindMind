import { db } from '../db';
import uuid from 'react-native-uuid';
import { GeneratedRoutine } from '../../services/ai/schema';

export const saveGeneratedRoutine = (userId: string, generated: GeneratedRoutine) => {
  const routineId = uuid.v4() as string;
  const now = Date.now();

  db.withTransactionSync(() => {
    db.runSync(
      `INSERT INTO routines (id, user_id, title, goal, version, status, ai_generated_at, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        routineId,
        userId,
        generated.routine.title,
        generated.routine.goal,
        1,
        'active',
        now,
        now,
        now
      ]
    );

    generated.tasks.forEach((task) => {
      const taskId = uuid.v4() as string;
      db.runSync(
        `INSERT INTO tasks (id, routine_id, title, description, priority, category, scheduled_time, estimated_duration_minutes, consequence_weight, recurrence_rule, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          taskId,
          routineId,
          task.title,
          task.description,
          task.priority,
          task.category,
            task.scheduled_time,
          task.estimated_duration_minutes,
          task.consequence_weight,
            task.recurrence_rule ?? '',
          now,
          now
        ]
      );
    });
  });

  return routineId;
};

export const getActiveRoutine = (userId: string) => {
  return db.getFirstSync<any>(`SELECT * FROM routines WHERE user_id = ? AND status = 'active'`, [userId]);
};

export const getTasksForRoutine = (routineId: string) => {
  return db.getAllSync<any>(`SELECT * FROM tasks WHERE routine_id = ? ORDER BY scheduled_time ASC`, [routineId]);
};
