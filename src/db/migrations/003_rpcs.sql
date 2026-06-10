-- 003_rpcs.sql
-- Example RPCs for common multi-step operations used by the app

-- Mark a task as completed (inserts into task_completions and returns the created row as JSON)
CREATE OR REPLACE FUNCTION public.mark_task_completed(
  _user_id TEXT,
  _task_id TEXT,
  _date TEXT,
  _completed_at BIGINT,
  _state TEXT,
  _skip_reason TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  inserted RECORD;
BEGIN
  INSERT INTO public.task_completions (id, task_id, user_id, date, completed_at, state, skip_reason, created_at)
  VALUES (gen_random_uuid()::text, _task_id, _user_id, _date, _completed_at, _state, _skip_reason, extract(epoch from now())::bigint)
  RETURNING * INTO inserted;

  RETURN row_to_json(inserted)::jsonb;
END;
$$ LANGUAGE plpgsql;

-- Simple habit completion updater (increments completion_count and streak)
CREATE OR REPLACE FUNCTION public.complete_habit(_habit_id TEXT, _completed_at BIGINT)
RETURNS JSONB AS $$
DECLARE
  h RECORD;
BEGIN
  UPDATE public.habits
  SET
    completion_count = COALESCE(completion_count,0) + 1,
    streak_count = COALESCE(streak_count,0) + 1,
    longest_streak = GREATEST(COALESCE(longest_streak,0), COALESCE(streak_count,0) + 1),
    last_completed_at = _completed_at,
    updated_at = extract(epoch from now())::bigint
  WHERE id = _habit_id
  RETURNING * INTO h;

  RETURN row_to_json(h)::jsonb;
END;
$$ LANGUAGE plpgsql;

-- Generate a weekly report (basic aggregation example)
CREATE OR REPLACE FUNCTION public.generate_weekly_report(_user_id TEXT, _week_start TEXT, _week_end TEXT)
RETURNS JSONB AS $$
DECLARE
  rec RECORD;
  inserted RECORD;
BEGIN
  SELECT
    COALESCE((SELECT COUNT(*) FROM public.task_completions tc WHERE tc.user_id = _user_id AND tc.date >= _week_start AND tc.date <= _week_end AND tc.state = 'completed'), 0) AS tasks_completed,
    COALESCE((SELECT COUNT(*) FROM public.task_completions tc WHERE tc.user_id = _user_id AND tc.date >= _week_start AND tc.date <= _week_end AND tc.state IN ('missed','failed')), 0) AS tasks_missed,
    COALESCE((SELECT COUNT(*) FROM public.recovery_tasks rt WHERE rt.user_id = _user_id AND rt.scheduled_date >= _week_start AND rt.scheduled_date <= _week_end AND rt.status = 'completed'), 0) AS recovery_completed
  INTO rec;

  INSERT INTO public.weekly_reports (id, user_id, week_start, week_end, tasks_completed, tasks_missed, recovery_completed, created_at)
  VALUES (gen_random_uuid()::text, _user_id, _week_start, _week_end, rec.tasks_completed, rec.tasks_missed, rec.recovery_completed, extract(epoch from now())::bigint)
  RETURNING * INTO inserted;

  RETURN row_to_json(inserted)::jsonb;
END;
$$ LANGUAGE plpgsql;
