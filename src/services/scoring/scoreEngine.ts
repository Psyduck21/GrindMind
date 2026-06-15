import { db } from '../../db/db';

/**
 * Deterministic scoring per TRD §6:
 * DailyScore =
 *   (critical_completed / critical_total) * 0.40 +
 *   (high_completed / high_total)         * 0.25 +
 *   (medium_completed / medium_total)     * 0.15 +
 *   (recovery_completed / recovery_total) * 0.10 +
 *   (habit_completed / habit_total)       * 0.10
 * ) * 100
 */
export const calculateDailyScore = async (routineId: string): Promise<number> => {
  // Only calculate score based on gamified tasks (TRD strict enforcement)
  const tasks = await db.getAllAsync<any>('SELECT * FROM tasks WHERE routine_id = ? AND is_gamified = 1', [routineId]);

  const weightConfig: Record<string, number> = {
    critical: 0.40,
    high: 0.25,
    medium: 0.15,
  };

  let score = 0;

  for (const [priority, weight] of Object.entries(weightConfig)) {
    const group = tasks.filter((t: any) => t.priority === priority && !t.is_recovery_task);
    const total = group.length;
    const completed = group.filter((t: any) => t.status === 'completed').length;
    if (total > 0) {
      score += (completed / total) * weight * 100;
    }
  }

  // Recovery weight: 0.10
  const recoveryTasks = tasks.filter((t: any) => t.is_recovery_task === 1);
  const recoveryTotal = recoveryTasks.length;
  const recoveryCompleted = recoveryTasks.filter((t: any) => t.status === 'completed').length;
  if (recoveryTotal > 0) {
    score += (recoveryCompleted / recoveryTotal) * 0.10 * 100;
  }

  return Math.min(100, Math.round(score));
};

/**
 * PromiseKeptRate = tasks_completed / (tasks_completed + tasks_skipped) * 100
 */
export const calculatePromiseKeptRate = async (userId: string): Promise<number> => {
  const row = await db.getFirstAsync<any>(
    `SELECT
       SUM(CASE WHEN tc.state = 'completed' THEN 1 ELSE 0 END) as completed,
       SUM(CASE WHEN tc.state = 'skipped' THEN 1 ELSE 0 END)   as skipped
     FROM task_completions tc
     JOIN tasks t ON tc.task_id = t.id
     WHERE tc.user_id = ? AND t.is_gamified = 1`,
    [userId]
  );
  if (!row) return 0;
  const total = (row.completed || 0) + (row.skipped || 0);
  if (total === 0) return 0;
  return Math.round((row.completed / total) * 100);
};
