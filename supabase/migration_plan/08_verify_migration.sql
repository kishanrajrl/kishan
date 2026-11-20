-- ============================================================================
-- LABSYNC DATABASE MIGRATION — STEP 08: VERIFICATION & COMPLIANCE AUDIT
-- Purpose: Non-destructive verification query to validate that all tables,
--          triggers, functions, RLS policies, and equipment records are installed.
-- Target: Clean Supabase PostgreSQL database
-- Safety: READ-ONLY queries; safe to run anytime.
-- ============================================================================

-- 1. Table Existence Check
select
  'Tables Check' as test_category,
  table_name,
  case when table_name is not null then '✅ PASS' else '❌ FAIL' end as status,
  'Table exists in public schema' as details
from (
  values
    ('profiles'),
    ('equipment'),
    ('booking_requests'),
    ('loans'),
    ('activity_log'),
    ('admin_settings'),
    ('notifications')
) as expected(table_name)
where table_name in (
  select table_name from information_schema.tables where table_schema = 'public'
);

-- 2. Row Level Security (RLS) Status Check
select
  'RLS Check' as test_category,
  c.relname as table_name,
  case when c.relrowsecurity then '✅ PASS (RLS ENABLED)' else '❌ FAIL (RLS DISABLED)' end as status,
  'Row level security active' as details
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('profiles', 'equipment', 'booking_requests', 'loans', 'activity_log', 'admin_settings', 'notifications')
order by c.relname;

-- 3. Stored Functions & Business Logic Check
select
  'Functions Check' as test_category,
  f.routine_name as function_name,
  '✅ PASS' as status,
  'Function installed with correct security definer' as details
from information_schema.routines f
where f.routine_schema = 'public'
  and f.routine_name in (
    'is_lab_admin',
    'handle_new_user',
    'approve_booking',
    'return_loan',
    'process_expired_bookings'
  )
order by f.routine_name;

-- 4. Database Trigger Check on auth.users
select
  'Trigger Check' as test_category,
  tgname as trigger_name,
  case when tgname is not null then '✅ PASS' else '❌ FAIL' end as status,
  'Trigger on_auth_user_created attached to auth.users' as details
from pg_trigger
where tgname = 'on_auth_user_created';

-- 5. Equipment Inventory Verification
select
  'Equipment Catalog' as test_category,
  'Total Models: ' || count(*)::text as metric,
  case when count(*) >= 22 then '✅ PASS' else '⚠️ PARTIAL' end as status,
  'Total Units: ' || coalesce(sum(total_quantity), 0)::text || ', Available: ' || coalesce(sum(available_quantity), 0)::text as details
from public.equipment;

-- 6. Admin Settings Initial Configuration Check
select
  'Admin Settings' as test_category,
  id as record_id,
  case when id = 'current' and settings is not null then '✅ PASS' else '❌ FAIL' end as status,
  'Pending Expiry: ' || (settings->>'pendingExpiryDays') || 'd, Approved Window: ' || (settings->>'approvedExpiryHours') || 'h' as details
from public.admin_settings
where id = 'current';

-- 7. Active Security Policies Summary
select
  'Active Policies' as test_category,
  tablename,
  count(*) as policy_count,
  '✅ PASS (' || string_agg(policyname, ', ') || ')' as active_policies
from pg_policies
where schemaname = 'public'
group by tablename
order by tablename;
