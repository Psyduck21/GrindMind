import { db } from '../../db/db';
import { IntentGraph, IntentAction } from '../ai/schema';
import { queueOperation } from '../sync/syncEngine';
import { getLocalYYYYMMDD } from '../../utils/date';
import { scheduleDailyNotifications } from '../notification/notificationScheduler';

/**
 * Calculates time addition (HH:MM + minutes)
 */
const addMinutes = (timeStr: string, mins: number): string => {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':').map(Number);
  const totalMins = h * 60 + m + mins;
  const newH = Math.floor(totalMins / 60);
  const newM = totalMins % 60;
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
};

/**
 * Converts HH:MM to minutes since midnight for comparison
 */
const timeToMins = (timeStr: string): number => {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
};

const PRIORITY_WEIGHTS: Record<string, number> = {
  'critical': 4,
  'high': 3,
  'medium': 2,
  'low': 1
};

export const applyIntentGraph = async (intent: IntentGraph) => {
  const affectedDates = new Set<string>();

  for (const action of intent.intents) {
    if (action.action === 'MOVE' && action.task_id) {
      // 1. Get current task
      const task = await db.getFirstAsync<any>('SELECT * FROM tasks WHERE id = ?', [action.task_id]);
      if (!task) continue;

      affectedDates.add(task.scheduled_date); // Old date might need resolving
      
      const newDate = action.new_scheduled_date || task.scheduled_date;
      const newTime = action.new_scheduled_time || task.scheduled_time;
      
      await db.runAsync(
        'UPDATE tasks SET scheduled_date = ?, scheduled_time = ?, updated_at = ? WHERE id = ?',
        [newDate, newTime, Date.now(), task.id]
      );
      queueOperation('tasks', 'UPDATE', {
        id: task.id, scheduled_date: newDate, scheduled_time: newTime, updated_at: Date.now()
      });

      affectedDates.add(newDate); // New date needs resolving
    }
  }

  // 2. Resolve constraints for all affected dates
  for (const date of Array.from(affectedDates)) {
    if (date) {
      await resolveCascadingShifts(date);
    }
  }

  // 3. Reschedule Push Notifications
  try {
    const user = await db.getFirstAsync<any>('SELECT * FROM users LIMIT 1');
    if (user) {
      await scheduleDailyNotifications({
        userId: user.id,
        accountabilityMode: user.accountability_mode || 'coach',
        wakeTime: user.wake_time || '06:00',
        sleepTime: user.sleep_time || '23:00',
      });
    }
  } catch (e) {
    console.warn('[TimeBlockManager] Failed to reschedule notifications:', e);
  }
};

/**
 * The Tetris Algorithm
 */
export const resolveCascadingShifts = async (targetDate: string) => {
  const rawTasks = await db.getAllAsync<any>(
    `SELECT * FROM tasks WHERE scheduled_date = ? AND status = 'not_started' ORDER BY scheduled_time ASC`,
    [targetDate]
  );

  // OPTIMIZATION: Pre-calculate _startMins for O(1) loop operations
  const tasks = rawTasks.map(t => ({
    ...t,
    _startMins: t.scheduled_time ? timeToMins(t.scheduled_time) : 0,
    _durationMins: t.estimated_duration_minutes || 30
  }));

  let collisionFound = true;
  let safetyCounter = 0;

  // Bumped to 2000 based on stress test metrics: 50 overlapping tasks require ~1226 loops
  while (collisionFound && safetyCounter < 2000) {
    collisionFound = false;
    safetyCounter++;

    tasks.sort((a, b) => a._startMins - b._startMins);

    for (let i = 0; i < tasks.length - 1; i++) {
      const current = tasks[i];
      const next = tasks[i + 1];

      if (!current.scheduled_time || !next.scheduled_time) continue;

      const currentEndMins = current._startMins + current._durationMins;
      const nextStartMins = next._startMins;

      if (currentEndMins > nextStartMins) {
        // COLLISION DETECTED!
        collisionFound = true;

        const currentPrio = PRIORITY_WEIGHTS[current.priority] || 2;
        const nextPrio = PRIORITY_WEIGHTS[next.priority] || 2;

        const currentLocked = current.is_time_locked === 1;
        const nextLocked = next.is_time_locked === 1;

        // Determine who gets pushed
        if (nextLocked && !currentLocked) {
          current._startMins = next._startMins + next._durationMins;
        } else if (currentLocked && !nextLocked) {
          next._startMins = currentEndMins;
        } else if (currentPrio >= nextPrio) {
          next._startMins = currentEndMins;
        } else {
          current._startMins = next._startMins + next._durationMins;
        }
        
        break; // Break and re-sort
      }
    }
  }

  // OPTIMIZATION: Re-hydrate HH:MM strings only once at the end
  tasks.forEach(t => {
    const h = Math.floor(t._startMins / 60);
    const m = t._startMins % 60;
    t.scheduled_time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  });

  // Handle spillover (if any task was pushed past 23:59)
  await commitChangesAndHandleSpillover(tasks, targetDate);
};

const commitChangesAndHandleSpillover = async (tasks: any[], targetDate: string) => {
  const now = Date.now();
  
  for (const task of tasks) {
    if (!task.scheduled_time) continue;
    const startMins = timeToMins(task.scheduled_time);
    
    let finalDate = task.scheduled_date;
    let finalTime = task.scheduled_time;

    if (startMins >= 24 * 60) { // Spilled over to next day
      const d = new Date(task.scheduled_date);
      d.setDate(d.getDate() + 1);
      finalDate = getLocalYYYYMMDD(d);
      
      const spilledMins = startMins - (24 * 60);
      // Give it a fresh start at 8 AM + spilled offset, or just 8 AM
      finalTime = addMinutes('08:00', spilledMins); 
    }

    // Only update if it actually changed
    const originalTask = await db.getFirstAsync<any>('SELECT scheduled_time, scheduled_date FROM tasks WHERE id = ?', [task.id]);
    if (originalTask && (originalTask.scheduled_time !== finalTime || originalTask.scheduled_date !== finalDate)) {
      await db.runAsync(
        'UPDATE tasks SET scheduled_date = ?, scheduled_time = ?, updated_at = ? WHERE id = ?',
        [finalDate, finalTime, now, task.id]
      );
      queueOperation('tasks', 'UPDATE', {
        id: task.id, scheduled_date: finalDate, scheduled_time: finalTime, updated_at: now
      });
    }
  }
};
