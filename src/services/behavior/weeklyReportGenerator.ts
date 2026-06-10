import { db } from '../../db/db';
import { analyzePatterns } from '../behavior/patternAnalyzer';
import { generateSuggestions } from '../behavior/routineOptimizer';
import { calculateStreak } from '../scoring/streakCalculator';
import { calculatePromiseKeptRate } from '../scoring/scoreEngine';
import uuid from 'react-native-uuid';
import { getLocalYYYYMMDD } from '../../utils/date';

export interface WeeklyReport {
  id: string;
  weekStart: string;
  weekEnd: string;
  tasksCompleted: number;
  tasksMissed: number;
  recoveryCompleted: number;
  consistencyScore: number;
  promiseKeptRate: number;
  streak: number;
  suggestions: ReturnType<typeof generateSuggestions>;
  pattern: ReturnType<typeof analyzePatterns>;
  aiGenerated: boolean;
}

/**
 * Generates a weekly report for the current week (last 7 days).
 * Persists to SQLite and returns the report data.
 */
export const generateWeeklyReport = (userId: string, routineId: string): WeeklyReport => {
  const today = new Date();
  const weekEnd = getLocalYYYYMMDD(today);
  const weekStartDate = new Date(today);
  weekStartDate.setDate(today.getDate() - 6);
  const weekStart = getLocalYYYYMMDD(weekStartDate);

  // ─── Task stats for the week ──────────────────────────────────────────────
  const completions = db.getAllSync<any>(
    `SELECT tc.*, t.is_recovery_task FROM task_completions tc
     JOIN tasks t ON tc.task_id = t.id
     WHERE tc.user_id = ? AND tc.date BETWEEN ? AND ?`,
    [userId, weekStart, weekEnd]
  );

  const tasksCompleted = completions.filter((c) => c.state === 'completed' && !c.is_recovery_task).length;
  const tasksMissed = completions.filter((c) => c.state === 'skipped').length;
  const recoveryCompleted = completions.filter((c) => c.state === 'completed' && c.is_recovery_task === 1).length;

  // ─── Consistency score: avg daily completion over 7 days ─────────────────
  const dayStats = db.getAllSync<any>(
    `SELECT date,
       SUM(CASE WHEN state = 'completed' THEN 1 ELSE 0 END) as done,
       COUNT(*) as total
     FROM task_completions WHERE user_id = ? AND date BETWEEN ? AND ?
     GROUP BY date`,
    [userId, weekStart, weekEnd]
  );
  const dailyScores = dayStats.map((d) =>
    d.total > 0 ? (d.done / d.total) * 100 : 0
  );
  const avgScore = dailyScores.length > 0
    ? dailyScores.reduce((a, b) => a + b, 0) / dailyScores.length
    : 0;
  const consistencyScore = Math.round(avgScore);

  // ─── Behavior analysis ────────────────────────────────────────────────────
  const pattern = analyzePatterns(userId);
  const user = db.getFirstSync<any>('SELECT * FROM users WHERE id = ?', [userId]);
  const suggestions = generateSuggestions(pattern, user?.available_daily_minutes || 90);

  const streak = calculateStreak(userId);
  const promiseKeptRate = calculatePromiseKeptRate(userId);

  // ─── Persist to SQLite ────────────────────────────────────────────────────
  const reportId = uuid.v4() as string;
  db.runSync(
    `INSERT OR REPLACE INTO weekly_reports
     (id, user_id, week_start, week_end, tasks_completed, tasks_missed, recovery_completed,
      streak_change, consistency_score, behavior_summary, suggestions, ai_generated, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
    [
      reportId, userId, weekStart, weekEnd,
      tasksCompleted, tasksMissed, recoveryCompleted,
      streak,
      consistencyScore,
      JSON.stringify(pattern),
      JSON.stringify(suggestions),
      Date.now(),
    ]
  );

  return {
    id: reportId,
    weekStart,
    weekEnd,
    tasksCompleted,
    tasksMissed,
    recoveryCompleted,
    consistencyScore,
    promiseKeptRate,
    streak,
    suggestions,
    pattern,
    aiGenerated: false,
  };
};

/**
 * Loads the most recent weekly report from SQLite.
 */
export const getLatestWeeklyReport = (userId: string): WeeklyReport | null => {
  const row = db.getFirstSync<any>(
    `SELECT * FROM weekly_reports WHERE user_id = ? ORDER BY created_at DESC LIMIT 1`,
    [userId]
  );
  if (!row) return null;
  return {
    id: row.id,
    weekStart: row.week_start,
    weekEnd: row.week_end,
    tasksCompleted: row.tasks_completed,
    tasksMissed: row.tasks_missed,
    recoveryCompleted: row.recovery_completed,
    consistencyScore: row.consistency_score,
    promiseKeptRate: 0,
    streak: row.streak_change,
    suggestions: JSON.parse(row.suggestions || '[]'),
    pattern: JSON.parse(row.behavior_summary || '{}'),
    aiGenerated: row.ai_generated === 1,
  };
};
