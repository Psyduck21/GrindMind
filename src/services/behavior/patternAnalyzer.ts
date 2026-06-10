import { db } from '../../db/db';

export interface FailurePattern {
  worstDayOfWeek: string | null;    // e.g. "Monday"
  worstTimeOfDay: string | null;    // e.g. "morning" | "afternoon" | "evening"
  mostSkippedCategory: string | null;
  consecutiveMissDays: number;
  skipRate: number;                 // 0–1
  missedCriticalCount: number;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const getTimeBucket = (time: string | null): string => {
  if (!time) return 'unknown';
  const [h] = time.split(':').map(Number);
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
};

/**
 * Analyzes the last 14 days of task completion data to detect failure patterns.
 * Fully deterministic — no AI involved.
 */
export const analyzePatterns = (userId: string): FailurePattern => {
  // ─── Skip rate ───────────────────────────────────────────────────────────
  const completions = db.getAllSync<any>(
    `SELECT tc.*, t.priority, t.category, t.scheduled_time
     FROM task_completions tc
     JOIN tasks t ON tc.task_id = t.id
     WHERE tc.user_id = ?
     ORDER BY tc.created_at DESC LIMIT 200`,
    [userId]
  );

  const total = completions.length;
  const skipped = completions.filter((c) => c.state === 'skipped').length;
  const skipRate = total > 0 ? skipped / total : 0;

  // ─── Worst day of week ────────────────────────────────────────────────────
  const dayMisses: Record<number, number> = {};
  completions
    .filter((c) => c.state === 'skipped')
    .forEach((c) => {
      const day = new Date(c.date).getDay();
      dayMisses[day] = (dayMisses[day] || 0) + 1;
    });
  const worstDay = Object.entries(dayMisses).sort((a, b) => b[1] - a[1])[0];
  const worstDayOfWeek = worstDay ? DAY_NAMES[parseInt(worstDay[0])] : null;

  // ─── Worst time of day ────────────────────────────────────────────────────
  const timeMisses: Record<string, number> = {};
  completions
    .filter((c) => c.state === 'skipped' && c.scheduled_time)
    .forEach((c) => {
      const bucket = getTimeBucket(c.scheduled_time);
      timeMisses[bucket] = (timeMisses[bucket] || 0) + 1;
    });
  const worstTime = Object.entries(timeMisses).sort((a, b) => b[1] - a[1])[0];
  const worstTimeOfDay = worstTime ? worstTime[0] : null;

  // ─── Most skipped category ────────────────────────────────────────────────
  const catMisses: Record<string, number> = {};
  completions
    .filter((c) => c.state === 'skipped' && c.category)
    .forEach((c) => {
      catMisses[c.category] = (catMisses[c.category] || 0) + 1;
    });
  const worstCat = Object.entries(catMisses).sort((a, b) => b[1] - a[1])[0];
  const mostSkippedCategory = worstCat ? worstCat[0] : null;

  // ─── Consecutive miss days ────────────────────────────────────────────────
  const missDates = db.getAllSync<any>(
    `SELECT DISTINCT date FROM task_completions
     WHERE user_id = ? AND state = 'skipped'
     ORDER BY date DESC`,
    [userId]
  );
  let consecutiveMissDays = 0;
  let cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  for (const row of missDates) {
    const d = new Date(row.date);
    d.setHours(0, 0, 0, 0);
    const diff = Math.round((cursor.getTime() - d.getTime()) / 86400000);
    if (diff === 0 || diff === 1) { consecutiveMissDays++; cursor = d; }
    else break;
  }

  // ─── Missed critical count ────────────────────────────────────────────────
  const missedCriticalCount = completions.filter(
    (c) => c.state === 'skipped' && c.priority === 'critical'
  ).length;

  return {
    worstDayOfWeek,
    worstTimeOfDay,
    mostSkippedCategory,
    consecutiveMissDays,
    skipRate,
    missedCriticalCount,
  };
};
