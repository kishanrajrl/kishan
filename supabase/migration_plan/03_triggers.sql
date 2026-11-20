-- ============================================================================
-- LABSYNC DATABASE MIGRATION — STEP 03: DATABASE TRIGGERS
-- Purpose: Binds triggers on auth.users to synchronize profiles automatically.
-- Target: Clean Supabase PostgreSQL database
-- Safety: Uses DROP TRIGGER IF EXISTS; safe and idempotent.
-- ============================================================================

-- Trigger on auth.users to create a student profile on signup
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
