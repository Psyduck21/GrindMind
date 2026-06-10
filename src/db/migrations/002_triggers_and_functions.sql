-- 002_triggers_and_functions.sql
-- Trigger functions: sync auth.users -> public.users, auto update timestamps

-- Function: create user row when a new auth user is created
CREATE OR REPLACE FUNCTION public.handle_auth_user_created()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, name, created_at, updated_at)
  VALUES (
    NEW.id::text,
    COALESCE(
      (CASE WHEN NEW.raw_user_meta_data IS NOT NULL THEN NEW.raw_user_meta_data->> 'full_name' END),
      (CASE WHEN NEW.user_metadata IS NOT NULL THEN NEW.user_metadata->> 'full_name' END),
      NEW.email
    ),
    extract(epoch from now())::bigint,
    extract(epoch from now())::bigint
  ) ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to auth.users (fires when Supabase Auth creates a user)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_handle_auth_user_created'
  ) THEN
    CREATE TRIGGER trg_handle_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW
      EXECUTE PROCEDURE public.handle_auth_user_created();
  END IF;
END$$;

-- Generic updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = extract(epoch from now())::bigint;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create BEFORE UPDATE triggers on tables that have updated_at
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_set_updated_at_users') THEN
    CREATE TRIGGER trg_set_updated_at_users BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_set_updated_at_routines') THEN
    CREATE TRIGGER trg_set_updated_at_routines BEFORE UPDATE ON public.routines FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_set_updated_at_tasks') THEN
    CREATE TRIGGER trg_set_updated_at_tasks BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_set_updated_at_habits') THEN
    CREATE TRIGGER trg_set_updated_at_habits BEFORE UPDATE ON public.habits FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_set_updated_at_recovery_tasks') THEN
    CREATE TRIGGER trg_set_updated_at_recovery_tasks BEFORE UPDATE ON public.recovery_tasks FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_set_updated_at_routine_versions') THEN
    CREATE TRIGGER trg_set_updated_at_routine_versions BEFORE UPDATE ON public.routine_versions FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();
  END IF;
END$$;
