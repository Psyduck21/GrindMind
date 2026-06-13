import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { db } from '../../db/db';
import { getRoastMessage, RoastIntensity } from '../../constants/roastMessages';
import uuid from 'react-native-uuid';

// ─── Configure how notifications appear when app is foregrounded ─────────────
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// ─── Permission request ───────────────────────────────────────────────────────
export const requestNotificationPermissions = async (): Promise<boolean> => {
  if (Platform.OS === 'web') return false;
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  if (existingStatus === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
};

// ─── Types ────────────────────────────────────────────────────────────────────
export interface ScheduleOptions {
  userId: string;
  accountabilityMode: RoastIntensity;
  wakeTime: string;  // "HH:MM"
  sleepTime: string; // "HH:MM"
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const parseTime = (timeStr: string): { hour: number; minute: number } => {
  const [h, m] = timeStr.split(':').map(Number);
  return { hour: h, minute: m };
};

const isWithinQuietHours = (
  hour: number,
  wakeHour: number,
  sleepHour: number
): boolean => {
  // Quiet hours = before wake or after sleep
  if (sleepHour > wakeHour) {
    // Same day: quiet if before wake or after sleep
    return hour < wakeHour || hour >= sleepHour;
  } else {
    // Wraps midnight: quiet if after sleep AND before wake
    return hour >= sleepHour && hour < wakeHour;
  }
};

// ─── Cancel all scheduled notifications ──────────────────────────────────────
export const cancelAllNotifications = async () => {
  await Notifications.cancelAllScheduledNotificationsAsync();
};

// ─── Schedule today's daily batch ────────────────────────────────────────────

const getTodaysPendingTasks = (userId: string) => {
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
      'SELECT * FROM tasks WHERE routine_id = ? AND target_week = ? AND target_day = ? AND status != "completed" AND status != "skipped" ORDER BY scheduled_time ASC',
      [r.id, targetWeek, targetDay]
    );

    allTasks = [...allTasks, ...tasks];
  }

  return allTasks;
};

/**
 * Schedules 3 notifications for the day + specific task reminders:
 * 1. Morning motivator — at wake time (dynamically includes today's tasks)
 * 2. Midday check-in — midpoint between wake and sleep
 * 3. Evening review — 1 hour before sleep
 * 4. Task Reminders — precise triggers for each scheduled task
 */
export const scheduleDailyNotifications = async (opts: ScheduleOptions) => {
  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) return;

  await cancelAllNotifications();

  const { hour: wakeH, minute: wakeM } = parseTime(opts.wakeTime);
  const { hour: sleepH } = parseTime(opts.sleepTime);

  const now = new Date();
  const scheduleTime = (hour: number, minute: number, message: string) => {
    // Skip if within quiet hours
    if (isWithinQuietHours(hour, wakeH, sleepH)) return;

    const trigger = new Date();
    trigger.setHours(hour, minute, 0, 0);
    // If time already passed today, schedule for tomorrow
    if (trigger <= now) {
      trigger.setDate(trigger.getDate() + 1);
    }

    Notifications.scheduleNotificationAsync({
      content: {
        title: 'GrindMind',
        body: message,
        data: { type: 'daily', userId: opts.userId },
      },
      trigger: {
        date: trigger,
        type: Notifications.SchedulableTriggerInputTypes.DATE,
      },
    });

    // Log to SQLite
    logNotification(opts.userId, 'reminder', message, trigger.getTime());
  };

  // Fetch today's tasks
  const pendingTasks = getTodaysPendingTasks(opts.userId);

  // 1. Morning — at wake time
  let morningMessage = getRoastMessage(opts.accountabilityMode, 'morning');
  if (pendingTasks.length > 0) {
    const titles = pendingTasks.slice(0, 3).map(t => t.title).join(', ');
    const extra = pendingTasks.length > 3 ? ` and ${pendingTasks.length - 3} more` : '';
    morningMessage = `Wake up! You have ${pendingTasks.length} tasks today: ${titles}${extra}.\n\n${morningMessage}`;
  } else {
    morningMessage = `Wake up! You have a free day today. Enjoy the rest.\n\n${morningMessage}`;
  }

  scheduleTime(wakeH, wakeM, morningMessage);

  // Schedule task-specific reminders for each pending task
  for (const task of pendingTasks) {
    if (task.scheduled_time) {
      await scheduleTaskReminder(task, opts.accountabilityMode, opts.wakeTime, opts.sleepTime, opts.userId);
    }
  }

  // Calculate day length
  const startMins = wakeH * 60 + wakeM;
  const endMins = sleepH < wakeH ? (sleepH + 24) * 60 : sleepH * 60; // Handle wrapping past midnight
  const dayDurationMins = endMins - startMins;

  // 2. Mid-morning — 25% of the day
  const q1Mins = startMins + Math.floor(dayDurationMins * 0.25);
  scheduleTime(
    Math.floor(q1Mins / 60) % 24,
    q1Mins % 60,
    getRoastMessage(opts.accountabilityMode, 'missed_task')
  );

  // 3. Midday — 50% of the day
  const midMins = startMins + Math.floor(dayDurationMins * 0.5);
  scheduleTime(
    Math.floor(midMins / 60) % 24,
    midMins % 60,
    getRoastMessage(opts.accountabilityMode, 'missed_task')
  );

  // 4. Afternoon — 75% of the day
  const q3Mins = startMins + Math.floor(dayDurationMins * 0.75);
  scheduleTime(
    Math.floor(q3Mins / 60) % 24,
    q3Mins % 60,
    getRoastMessage(opts.accountabilityMode, 'recovery_pending')
  );

  // 5. Evening — 1 hour before sleep
  const eveningH = sleepH > 0 ? sleepH - 1 : 23;
  scheduleTime(
    eveningH,
    0,
    getRoastMessage(opts.accountabilityMode, 'evening')
  );
};

// ─── Schedule a task-specific reminder ───────────────────────────────────────
export const scheduleTaskReminder = async (
  task: { id: string; title: string; scheduled_time: string },
  accountabilityMode: RoastIntensity,
  wakeTime: string,
  sleepTime: string,
  userId: string
) => {
  const { hour, minute } = parseTime(task.scheduled_time || '08:00');
  const { hour: wakeH } = parseTime(wakeTime);
  const { hour: sleepH } = parseTime(sleepTime);

  if (isWithinQuietHours(hour, wakeH, sleepH)) return;

  const trigger = new Date();
  trigger.setHours(hour, minute, 0, 0);
  if (trigger <= new Date()) trigger.setDate(trigger.getDate() + 1);

  const body = `⏰ Time to start: ${task.title}`;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'GrindMind',
      body,
      data: { type: 'task_reminder', taskId: task.id, userId },
    },
    trigger: {
      date: trigger,
      type: Notifications.SchedulableTriggerInputTypes.DATE,
    },
  });

  logNotification(userId, 'reminder', body, trigger.getTime());
};

// ─── Log notification to SQLite ───────────────────────────────────────────────
const logNotification = (
  userId: string,
  type: string,
  message: string,
  scheduledAt: number
) => {
  try {
    db.runSync(
      `INSERT INTO notifications (id, user_id, type, message, scheduled_at, status, created_at)
       VALUES (?, ?, ?, ?, ?, 'scheduled', ?)`,
      [uuid.v4() as string, userId, type, message, scheduledAt, Date.now()]
    );
  } catch {
    // Silent fail — notification logging is non-critical
  }
};
