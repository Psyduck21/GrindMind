-- 001_create_extensions_and_tables.sql
-- Enables helpful extensions and creates application tables used by the app

-- Enable pgcrypto for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()::text),
  name TEXT NOT NULL,
  age INTEGER,
  primary_goal TEXT,
  secondary_goal TEXT,
  available_daily_minutes INTEGER,
  wake_time TEXT,
  sleep_time TEXT,
  work_schedule TEXT,
  motivation_level INTEGER CHECK (motivation_level BETWEEN 1 AND 10),
  fitness_level TEXT,
  accountability_mode TEXT DEFAULT 'Coach',
  notification_style TEXT DEFAULT 'balanced',
  created_at BIGINT NOT NULL DEFAULT (extract(epoch from now())::bigint),
  updated_at BIGINT NOT NULL DEFAULT (extract(epoch from now())::bigint)
);

-- Routines
CREATE TABLE IF NOT EXISTS public.routines (
  id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()::text),
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  goal TEXT NOT NULL,
  version INTEGER DEFAULT 1,
  status TEXT DEFAULT 'active',
  routine_type TEXT,
  ai_generated_at BIGINT,
  created_at BIGINT NOT NULL DEFAULT (extract(epoch from now())::bigint),
  updated_at BIGINT NOT NULL DEFAULT (extract(epoch from now())::bigint)
);

-- Tasks
CREATE TABLE IF NOT EXISTS public.tasks (
  id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()::text),
  routine_id TEXT NOT NULL REFERENCES public.routines(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT DEFAULT 'medium',
  category TEXT,
  scheduled_time TEXT,
  estimated_duration_minutes INTEGER,
  dependency_id TEXT REFERENCES public.tasks(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'not_started',
  consequence_weight REAL DEFAULT 1.0,
  recovery_weight REAL DEFAULT 1.0,
  is_recovery_task BOOLEAN DEFAULT FALSE,
  recurrence_rule TEXT,
  created_at BIGINT NOT NULL DEFAULT (extract(epoch from now())::bigint),
  updated_at BIGINT NOT NULL DEFAULT (extract(epoch from now())::bigint)
);

-- Habits
CREATE TABLE IF NOT EXISTS public.habits (
  id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()::text),
  routine_id TEXT NOT NULL REFERENCES public.routines(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  recurrence_rule TEXT NOT NULL,
  streak_count INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  completion_count INTEGER DEFAULT 0,
  last_completed_at BIGINT,
  created_at BIGINT NOT NULL DEFAULT (extract(epoch from now())::bigint),
  updated_at BIGINT NOT NULL DEFAULT (extract(epoch from now())::bigint)
);

-- Task Completions
CREATE TABLE IF NOT EXISTS public.task_completions (
  id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()::text),
  task_id TEXT NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  completed_at BIGINT,
  skip_reason TEXT,
  state TEXT NOT NULL,
  recovery_generated BOOLEAN DEFAULT FALSE,
  xp_awarded INTEGER DEFAULT 0,
  created_at BIGINT NOT NULL DEFAULT (extract(epoch from now())::bigint)
);

-- Recovery tasks
CREATE TABLE IF NOT EXISTS public.recovery_tasks (
  id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()::text),
  source_task_id TEXT NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  scheduled_date TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  severity TEXT DEFAULT 'light',
  created_at BIGINT NOT NULL DEFAULT (extract(epoch from now())::bigint),
  updated_at BIGINT NOT NULL DEFAULT (extract(epoch from now())::bigint)
);

-- Weekly reports
CREATE TABLE IF NOT EXISTS public.weekly_reports (
  id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()::text),
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
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
  ai_generated BOOLEAN DEFAULT FALSE,
  created_at BIGINT NOT NULL DEFAULT (extract(epoch from now())::bigint)
);

-- Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()::text),
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  scheduled_at BIGINT NOT NULL,
  sent_at BIGINT,
  status TEXT DEFAULT 'scheduled',
  created_at BIGINT NOT NULL DEFAULT (extract(epoch from now())::bigint)
);

-- Achievements
CREATE TABLE IF NOT EXISTS public.achievements (
  id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()::text),
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  badge_name TEXT NOT NULL,
  achieved_at BIGINT NOT NULL,
  xp_awarded INTEGER DEFAULT 0
);

-- Analytics events
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()::text),
  user_id TEXT,
  event_name TEXT NOT NULL,
  properties JSONB,
  created_at BIGINT NOT NULL DEFAULT (extract(epoch from now())::bigint)
);

-- Routine versions
CREATE TABLE IF NOT EXISTS public.routine_versions (
  id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()::text),
  routine_id TEXT NOT NULL REFERENCES public.routines(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  snapshot JSONB NOT NULL,
  reason TEXT,
  created_at BIGINT NOT NULL DEFAULT (extract(epoch from now())::bigint)
);

-- Indexes commonly used
CREATE INDEX IF NOT EXISTS idx_task_completions_user_date ON public.task_completions (user_id, date);
CREATE INDEX IF NOT EXISTS idx_tasks_routine ON public.tasks (routine_id);
CREATE INDEX IF NOT EXISTS idx_habits_routine ON public.habits (routine_id);
