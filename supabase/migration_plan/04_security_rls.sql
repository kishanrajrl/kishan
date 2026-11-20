-- ============================================================================
-- LABSYNC DATABASE MIGRATION — STEP 04: ROW LEVEL SECURITY (RLS) & POLICIES
-- Purpose: Enforces multi-tenant isolation, student restrictions, and admin roles.
-- Target: Clean Supabase PostgreSQL database
-- Safety: Uses DROP POLICY IF EXISTS; idempotent and safe.
-- ============================================================================

-- 1. Enable Row Level Security across all 7 tables
alter table public.profiles enable row level security;
alter table public.equipment enable row level security;
alter table public.booking_requests enable row level security;
alter table public.loans enable row level security;
alter table public.activity_log enable row level security;
alter table public.admin_settings enable row level security;
alter table public.notifications enable row level security;

-- 2. Grant Schema Usage to authenticated and anon roles
grant usage on schema public to authenticated, anon;

-- ============================================================================
-- POLICIES: PROFILES TABLE
-- ============================================================================
drop policy if exists "profiles read own or admin" on public.profiles;
create policy "profiles read own or admin" on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_lab_admin());

drop policy if exists "admin update profiles" on public.profiles;
create policy "admin update profiles" on public.profiles
  for update to authenticated
  using (public.is_lab_admin())
  with check (
    public.is_lab_admin()
    and (role <> 'admin' or lower(email) in ('admin577528@gmail.com', 'harshritesh6360@gmail.com'))
  );

grant select, update on public.profiles to authenticated;

-- ============================================================================
-- POLICIES: EQUIPMENT TABLE
-- ============================================================================
drop policy if exists "equipment read approved" on public.equipment;
create policy "equipment read approved" on public.equipment
  for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.status = 'approved'));

drop policy if exists "admin equipment insert" on public.equipment;
create policy "admin equipment insert" on public.equipment
  for insert to authenticated
  with check (public.is_lab_admin());

drop policy if exists "admin equipment update" on public.equipment;
create policy "admin equipment update" on public.equipment
  for update to authenticated
  using (public.is_lab_admin())
  with check (public.is_lab_admin());

drop policy if exists "admin equipment delete" on public.equipment;
create policy "admin equipment delete" on public.equipment
  for delete to authenticated
  using (public.is_lab_admin());

grant select, insert, update, delete on public.equipment to authenticated;

-- ============================================================================
-- POLICIES: BOOKING REQUESTS TABLE
-- ============================================================================
drop policy if exists "requests read own or admin" on public.booking_requests;
create policy "requests read own or admin" on public.booking_requests
  for select to authenticated
  using (user_id = auth.uid() or public.is_lab_admin());

drop policy if exists "students create own requests" on public.booking_requests;
create policy "students create own requests" on public.booking_requests
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and status = 'pending'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'student' and p.status = 'approved'
    )
  );

drop policy if exists "admin or student cancel update requests" on public.booking_requests;
create policy "admin or student cancel update requests" on public.booking_requests
  for update to authenticated
  using (
    public.is_lab_admin()
    or (user_id = auth.uid() and status in ('pending', 'approved'))
  )
  with check (
    public.is_lab_admin()
    or (user_id = auth.uid() and status = 'cancelled')
  );

grant select, insert, update on public.booking_requests to authenticated;

-- ============================================================================
-- POLICIES: LOANS TABLE
-- ============================================================================
drop policy if exists "loans read own or admin" on public.loans;
create policy "loans read own or admin" on public.loans
  for select to authenticated
  using (user_id = auth.uid() or public.is_lab_admin());

drop policy if exists "admin manage loans" on public.loans;
create policy "admin manage loans" on public.loans
  for all to authenticated
  using (public.is_lab_admin())
  with check (public.is_lab_admin());

grant select, insert, update, delete on public.loans to authenticated;

-- ============================================================================
-- POLICIES: ACTIVITY LOG TABLE
-- ============================================================================
drop policy if exists "activity read admin" on public.activity_log;
create policy "activity read admin" on public.activity_log
  for select to authenticated
  using (public.is_lab_admin());

drop policy if exists "activity insert authenticated" on public.activity_log;
create policy "activity insert authenticated" on public.activity_log
  for insert to authenticated
  with check (actor_id = auth.uid() or actor_id is null or public.is_lab_admin());

grant select, insert on public.activity_log to authenticated;

-- ============================================================================
-- POLICIES: ADMIN SETTINGS TABLE
-- ============================================================================
drop policy if exists "admin_settings read admin" on public.admin_settings;
create policy "admin_settings read admin" on public.admin_settings
  for select to authenticated
  using (public.is_lab_admin());

drop policy if exists "admin_settings write admin" on public.admin_settings;
create policy "admin_settings write admin" on public.admin_settings
  for all to authenticated
  using (public.is_lab_admin())
  with check (public.is_lab_admin());

grant select, update on public.admin_settings to authenticated;

-- ============================================================================
-- POLICIES: NOTIFICATIONS TABLE
-- ============================================================================
drop policy if exists "notifications read own or admin" on public.notifications;
create policy "notifications read own or admin" on public.notifications
  for select to authenticated
  using (user_id = auth.uid() or public.is_lab_admin());

drop policy if exists "notifications update own or admin" on public.notifications;
create policy "notifications update own or admin" on public.notifications
  for update to authenticated
  using (user_id = auth.uid() or public.is_lab_admin())
  with check (user_id = auth.uid() or public.is_lab_admin());

drop policy if exists "notifications insert admin" on public.notifications;
create policy "notifications insert admin" on public.notifications
  for insert to authenticated
  with check (public.is_lab_admin());

grant select, update, insert on public.notifications to authenticated;

-- ============================================================================
-- FUNCTION EXECUTION PRIVILEGES
-- ============================================================================
grant execute on function public.is_lab_admin() to authenticated;
grant execute on function public.approve_booking(uuid, date) to authenticated;
grant execute on function public.return_loan(uuid, boolean, text) to authenticated;
grant execute on function public.process_expired_bookings() to authenticated;
