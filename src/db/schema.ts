import { db } from './db';

export const setupDatabase = () => {
  // Try to alter existing tasks table to add new columns, ignore errors if they exist
  try { db.execSync('ALTER TABLE tasks ADD COLUMN target_week INTEGER DEFAULT 1;'); } catch (e) {}
  try { db.execSync('ALTER TABLE tasks ADD COLUMN target_day TEXT DEFAULT "Monday";'); } catch (e) {}

  db.execSync(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      age_range TEXT,
      primary_goal TEXT,
      secondary_goal TEXT,
      available_daily_minutes INTEGER,
      wake_time TEXT,
      sleep_time TEXT,
      work_schedule TEXT,
      motivation_level INTEGER CHECK(motivation_level BETWEEN 1 AND 10),
      fitness_level TEXT,
      accountability_mode TEXT DEFAULT 'Coach',
      notification_style TEXT DEFAULT 'balanced',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS routines (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      title TEXT NOT NULL,
      goal TEXT NOT NULL,
      version INTEGER DEFAULT 1,
      status TEXT DEFAULT 'active',
      routine_type TEXT,
      ai_generated_at INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS routine_weeks (
      id TEXT PRIMARY KEY,
      routine_id TEXT NOT NULL REFERENCES routines(id),
      week_number INTEGER NOT NULL,
      is_completed INTEGER DEFAULT 0,
      completed_at INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      UNIQUE(routine_id, week_number)
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      routine_id TEXT NOT NULL REFERENCES routines(id),
      title TEXT NOT NULL,
      description TEXT,
      priority TEXT DEFAULT 'medium',
      category TEXT,
      scheduled_time TEXT,
      estimated_duration_minutes INTEGER,
      dependency_id TEXT REFERENCES tasks(id),
      status TEXT DEFAULT 'not_started',
      consequence_weight REAL DEFAULT 1.0,
      recovery_weight REAL DEFAULT 1.0,
      is_recovery_task INTEGER DEFAULT 0,
      recurrence_rule TEXT,
      target_week INTEGER DEFAULT 1,
      target_day TEXT DEFAULT 'Monday',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS subtasks (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL REFERENCES tasks(id),
      title TEXT NOT NULL,
      is_completed INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS habits (
      id TEXT PRIMARY KEY,
      routine_id TEXT NOT NULL REFERENCES routines(id),
      title TEXT NOT NULL,
      recurrence_rule TEXT NOT NULL,
      streak_count INTEGER DEFAULT 0,
      longest_streak INTEGER DEFAULT 0,
      completion_count INTEGER DEFAULT 0,
      last_completed_at INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS task_completions (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL REFERENCES tasks(id),
      user_id TEXT NOT NULL REFERENCES users(id),
      date TEXT NOT NULL,
      completed_at INTEGER,
      skip_reason TEXT,
      state TEXT NOT NULL,
      recovery_generated INTEGER DEFAULT 0,
      xp_awarded INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS recovery_tasks (
      id TEXT PRIMARY KEY,
      source_task_id TEXT NOT NULL REFERENCES tasks(id),
      user_id TEXT NOT NULL REFERENCES users(id),
      title TEXT NOT NULL,
      description TEXT,
      scheduled_date TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      severity TEXT DEFAULT 'light',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS weekly_reports (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      week_start TEXT NOT NULL,
      week_end TEXT NOT NULL,
      tasks_completed INTEGER DEFAULT 0,
      tasks_missed INTEGER DEFAULT 0,
      recovery_completed INTEGER DEFAULT 0,
      streak_change INTEGER DEFAULT 0,
      consistency_score REAL DEFAULT 0.0,
      behavior_summary TEXT,
      suggestions TEXT,
      routine_sustainability_score REAL,
      ai_generated INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      type TEXT NOT NULL,
      message TEXT NOT NULL,
      scheduled_at INTEGER NOT NULL,
      sent_at INTEGER,
      status TEXT DEFAULT 'scheduled',
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS achievements (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      badge_name TEXT NOT NULL,
      achieved_at INTEGER NOT NULL,
      xp_awarded INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS analytics_events (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      event_name TEXT NOT NULL,
      properties TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS routine_versions (
      id TEXT PRIMARY KEY,
      routine_id TEXT NOT NULL REFERENCES routines(id),
      version INTEGER NOT NULL,
      snapshot TEXT NOT NULL,
      reason TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sync_queue (
      id TEXT PRIMARY KEY,
      table_name TEXT NOT NULL,
      operation TEXT NOT NULL,
      payload TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sync_state (
      id TEXT PRIMARY KEY,
      last_synced_at INTEGER NOT NULL
    );
  `);
};
