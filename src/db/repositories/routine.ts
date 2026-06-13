import { db } from '../db';
import uuid from 'react-native-uuid';
import { GeneratedRoutine } from '../../services/ai/schema';
import { queueOperation } from '../../services/sync/syncEngine';

export const buildRoutinePayload = (userId: string, generated: GeneratedRoutine) => {
  const routineId = uuid.v4() as string;
  const now = Date.now();

  const routine_payload = {
    id: routineId,
    user_id: userId,
    title: generated.routine.title,
    goal: generated.routine.goal,
    version: 1,
    status: 'active',
    routine_type: generated.routine.routine_type || null,
    ai_generated_at: now,
    created_at: now,
    updated_at: now
  };

  const tasks_payload: any[] = [];
  const subtasks_payload: any[] = [];

  generated.tasks.forEach((task) => {
    const taskId = uuid.v4() as string;
    
    tasks_payload.push({
      id: taskId,
      routine_id: routineId,
      title: task.title,
      description: task.description,
      priority: task.priority,
      category: task.category,
      scheduled_time: task.scheduled_time || '',
      estimated_duration_minutes: task.estimated_duration_minutes,
      consequence_weight: task.consequence_weight || 1.0,
      recurrence_rule: task.recurrence_rule || '',
      target_week: task.target_week,
      target_day: task.target_day,
      created_at: now,
      updated_at: now
    });

    if (task.subtasks && task.subtasks.length > 0) {
      task.subtasks.forEach((subtaskTitle) => {
        const subtaskId = uuid.v4() as string;
        subtasks_payload.push({
          id: subtaskId,
          task_id: taskId,
          title: subtaskTitle,
          is_completed: 0,
          created_at: now
        });
      });
    }
  });

  return { routineId, routine_payload, tasks_payload, subtasks_payload };
};

export const getActiveRoutine = (userId: string) => {
  return db.getFirstSync<any>(`SELECT * FROM routines WHERE user_id = ? AND status = 'active'`, [userId]);
};

export const getTasksForRoutine = (routineId: string) => {
  return db.getAllSync<any>(`SELECT * FROM tasks WHERE routine_id = ? ORDER BY scheduled_time ASC`, [routineId]);
};
