import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { db } from '../../db/db';
import { getRoastMessage, RoastIntensity } from '../../constants/roastMessages';
import uuid from 'react-native-uuid';
import { TicketPercent } from 'lucide-react-native';

// ─── Configure how notifications appear when app is foregrounded ─────────────
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// ─── Permission request & Channel Setup ──────────────────────────────────────
export const requestNotificationPermissions = async (): Promise<boolean> => {
  if (Platform.OS === 'web') return false;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('grindmind_alerts_3', {
      name: 'GrindMind Alerts',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#0D5C4A'
    });
  }

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
const parseTime = (timeStr: string): { hour: number; minute: number; mins: number } => {
  const [h, m] = timeStr.split(':').map(Number);
  return { hour: h, minute: m, mins: h * 60 + m };
};

const isWithinQuietHours = (
  timeMins: number,
  wakeMins: number,
  sleepMins: number
): boolean => {
  // timeMins, wakeMins, sleepMins are minutes from 00:00 (0 - 1439)
  if (sleepMins > wakeMins) {
    // Same day: quiet if before wake or after sleep
    return timeMins < wakeMins || timeMins >= sleepMins;
  } else {
    // Wraps midnight: quiet if after sleep AND before wake
    return timeMins >= sleepMins && timeMins < wakeMins;
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
      const startOfRoutineDay = new Date(r.ai_generated_at);
      startOfRoutineDay.setHours(0, 0, 0, 0);
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const diffDays = Math.round((startOfToday.getTime() - startOfRoutineDay.getTime()) / (1000 * 60 * 60 * 24));
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

  const wake = parseTime(opts.wakeTime);
  const sleep = parseTime(opts.sleepTime);

  const now = new Date();
  const scheduleTime = (hour: number, minute: number, message: string, tasktitle: string) => {
    // Skip if within quiet hours
    if (isWithinQuietHours(hour * 60 + minute, wake.mins, sleep.mins)) return;

    const trigger = new Date();
    trigger.setHours(hour, minute, 0, 0);
    // If time already passed today, schedule for tomorrow
    if (trigger <= now) {
      trigger.setDate(trigger.getDate() + 1);
    }

    Notifications.scheduleNotificationAsync({
      content: {
        title: tasktitle ? tasktitle : 'GrindMind',
        body: message,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: trigger,
        channelId: 'grindmind_alerts_3',
      },
    });

    // Log to SQLite
    logNotification(opts.userId, 'reminder', message, trigger.getTime());
  };

  // Fetch today's tasks
  const pendingTasks = getTodaysPendingTasks(opts.userId);
  const floatingTasks = pendingTasks.filter((t: any) => !t.scheduled_time);

  // 1. Morning — at wake time
  const morningMessage = getRoastMessage(opts.accountabilityMode, 'morning');
  scheduleTime(wake.hour, wake.minute, morningMessage, "");

  // Schedule task-specific reminders for each pending task
  for (const task of pendingTasks) {
    if (task.scheduled_time) {
      await scheduleTaskReminder(task, opts.accountabilityMode, opts.wakeTime, opts.sleepTime, opts.userId);
    }
  }

  // Calculate day length
  const endMins = sleep.mins < wake.mins ? sleep.mins + 24 * 60 : sleep.mins;
  const dayDurationMins = endMins - wake.mins;

  // Floating tasks — 4 intervals (20%, 40%, 60%, 80%) of the day
  const intervals = [0.2, 0.4, 0.6, 0.8];

  intervals.forEach((fraction, index) => {
    const triggerMins = wake.mins + Math.floor(dayDurationMins * fraction);
    const triggerH = Math.floor(triggerMins / 60) % 24;
    const triggerM = triggerMins % 60;

    // Pick a floating task to nag about, or use default roast
    let message = getRoastMessage(opts.accountabilityMode, 'missed_task');
    let taskTitle = "";
    if (floatingTasks.length > 0) {
      const taskIndex = index % floatingTasks.length;
      taskTitle = `⏰ Chal shuru kar: ${floatingTasks[taskIndex].title}`;
    } else if (index >= 2) {
      message = getRoastMessage(opts.accountabilityMode, 'recovery_pending');
    }

    scheduleTime(triggerH, triggerM, message, taskTitle);
  });

  // Evening — 1 hour before sleep
  const eveningMins = endMins - 60;
  const eveningH = Math.floor(eveningMins / 60) % 24;
  const eveningM = (eveningMins % 60 + 60) % 60; // ensure positive
  scheduleTime(eveningH, eveningM, getRoastMessage(opts.accountabilityMode, 'evening'), "");
};

// ─── Schedule a task-specific reminder ───────────────────────────────────────
export const scheduleTaskReminder = async (
  task: { id: string; title: string; scheduled_time: string },
  accountabilityMode: RoastIntensity,
  wakeTime: string,
  sleepTime: string,
  userId: string
) => {
  const tTime = parseTime(task.scheduled_time || '08:00');
  const wake = parseTime(wakeTime);
  const sleep = parseTime(sleepTime);

  if (isWithinQuietHours(tTime.mins, wake.mins, sleep.mins)) return;

  const trigger = new Date();
  trigger.setHours(tTime.hour, tTime.minute, 0, 0);

  // Do NOT schedule for tomorrow if time already passed today
  if (trigger <= new Date()) return;

  // Trick getRoastMessage into giving a completely random roast by passing an invalid context
  const body = getRoastMessage(accountabilityMode, 'general' as any);
  const title = `⏰ Chal shuru kar: ${task.title}`;

  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: trigger,
      channelId: 'grindmind_alerts_3',
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

// ─── Send Test Notification ───────────────────────────────────────────────────
export const sendTestNotification = async () => {
  try {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      console.log('No notification permissions');
      return;
    }

    console.log('Permissions granted, scheduling test notification...');

    // Schedule for 2 seconds from now
    const trigger = new Date(Date.now() + 2000);

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'GrindMind Test',
        body: 'Testing notifications. Did you hear the roast?',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 2,
        channelId: 'grindmind_alerts_3',
      },
    });
    console.log('Test notification scheduled for 2 seconds from now!');
  } catch (error) {
    console.error('Failed to schedule test notification:', error);
    throw error;
  }
};
