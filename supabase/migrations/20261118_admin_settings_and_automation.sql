-- ============================================================================
-- LabSync Database Migration: Admin Settings, Automation & Notification Tables
-- Execute this script in the Supabase SQL Editor (Dashboard -> SQL Editor)
-- ============================================================================

-- 1. Create dedicated admin_settings table
create table if not exists public.admin_settings (
  id text primary key default 'current',
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by text not null default 'admin'
);

-- Enable Row Level Security
alter table public.admin_settings enable row level security;

-- Only authenticated lab administrators can read settings
drop policy if exists "admin_settings_read_admin" on public.admin_settings;
create policy "admin_settings_read_admin" on public.admin_settings
  for select to authenticated
  using (public.is_lab_admin());

-- Only authenticated lab administrators can update settings
drop policy if exists "admin_settings_write_admin" on public.admin_settings;
create policy "admin_settings_write_admin" on public.admin_settings
  for all to authenticated
  using (public.is_lab_admin())
  with check (public.is_lab_admin());

-- Seed default configuration if empty
insert into public.admin_settings (id, settings, updated_by)
values (
  'current',
  '{
    "autoCancelPendingEnabled": true,
    "pendingExpiryDays": 3,
    "autoCancelApprovedEnabled": true,
    "approvedExpiryHours": 24,
    "defaultLoanDurationDays": 7,
    "returnReminderDays": 1,
    "overdueFrequency": "daily",
    "overdueDetection": "immediate",
    "requireDamageNote": true,
    "maxActiveBookingsPerStudent": 3,
    "maxQuantityPerBooking": 1,
    "allowStudentCancelPending": true,
    "allowStudentCancelApproved": true,
    "blockIfOverdue": true,
    "notifyOnBooking": true,
    "notifyOnApproval": true,
    "notifyOnRejection": true,
    "notifyOnCollectionReminder": true,
    "notifyOnReturnReminder": true,
    "notifyOnOverdue": true,
    "notifyOnDamage": true,
    "lastAutomationRun": null,
    "lastAutomationCount": 0,
    "lastAutomationStatus": "idle",
    "lastAutomationError": null
  }'::jsonb,
  'System Migration'
)
on conflict (id) do nothing;

-- 2. Create in-app notifications table
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  message text not null,
  type text not null default 'info' check (type in ('info','success','warning','alert')),
  read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;

drop policy if exists "notifications_read_own" on public.notifications;
create policy "notifications_read_own" on public.notifications
  for select to authenticated
  using (user_id = auth.uid() or public.is_lab_admin());

drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own" on public.notifications
  for update to authenticated
  using (user_id = auth.uid() or public.is_lab_admin())
  with check (user_id = auth.uid() or public.is_lab_admin());

drop policy if exists "notifications_insert_admin" on public.notifications;
create policy "notifications_insert_admin" on public.notifications
  for insert to authenticated
  with check (public.is_lab_admin());

-- 3. Stored Procedure: Atomic Cancellation & Stock Restoration Engine
create or replace function public.process_expired_bookings()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_settings jsonb;
  v_pending_enabled boolean := true;
  v_pending_days integer := 3;
  v_approved_enabled boolean := true;
  v_approved_hours integer := 24;
  v_pending_cancelled integer := 0;
  v_approved_cancelled integer := 0;
  r record;
begin
  -- Fetch current settings
  select settings into v_settings from public.admin_settings where id = 'current';
  if v_settings is not null then
    v_pending_enabled := coalesce((v_settings->>'autoCancelPendingEnabled')::boolean, true);
    v_pending_days := coalesce((v_settings->>'pendingExpiryDays')::integer, 3);
    v_approved_enabled := coalesce((v_settings->>'autoCancelApprovedEnabled')::boolean, true);
    v_approved_hours := coalesce((v_settings->>'approvedExpiryHours')::integer, 24);
  end if;

  -- A. Cancel Expired Pending Requests
  if v_pending_enabled then
    for r in
      select br.id, br.user_id, e.name as eq_name, e.asset_code
      from public.booking_requests br
      join public.equipment e on e.id = br.equipment_id
      where br.status = 'pending'
        and br.created_at <= (now() - (v_pending_days || ' days')::interval)
      for update of br
    loop
      update public.booking_requests
      set status = 'cancelled',
          purpose = purpose || ' [Auto-cancelled: Expired after ' || v_pending_days || ' days without approval]'
      where id = r.id;

      insert into public.activity_log(description)
      values ('AUTOMATION: Expired pending requisition #' || substr(r.id::text, 1, 8) || ' for ' || r.eq_name || ' (' || r.asset_code || ') auto-cancelled.');

      v_pending_cancelled := v_pending_cancelled + 1;
    end loop;
  end if;

  -- B. Cancel Approved But Uncollected Bookings
  if v_approved_enabled then
    for r in
      select br.id, br.user_id, br.equipment_id, l.id as loan_id, e.name as eq_name, e.asset_code, e.total_quantity, e.available_quantity
      from public.booking_requests br
      join public.loans l on l.request_id = br.id
      join public.equipment e on e.id = br.equipment_id
      where br.status = 'approved'
        and l.status = 'issued'
        and l.returned_at is null
        and l.issued_at <= (now() - (v_approved_hours || ' hours')::interval)
      for update of br, l, e
    loop
      -- Cancel booking request
      update public.booking_requests
      set status = 'cancelled',
          purpose = purpose || ' [Auto-cancelled: Uncollected after ' || v_approved_hours || ' hours]'
      where id = r.id;

      -- Delete / void the uncollected loan
      delete from public.loans where id = r.loan_id;

      -- Restore reserved equipment stock exactly once
      update public.equipment
      set available_quantity = least(total_quantity, available_quantity + 1)
      where id = r.equipment_id;

      insert into public.activity_log(description)
      values ('AUTOMATION: Uncollected approved requisition #' || substr(r.id::text, 1, 8) || ' for ' || r.eq_name || ' (' || r.asset_code || ') cancelled. Reserved unit restored (+1).');

      v_approved_cancelled := v_approved_cancelled + 1;
    end loop;
  end if;

  -- Update settings execution metadata
  update public.admin_settings
  set settings = jsonb_set(
        jsonb_set(
          jsonb_set(settings, '{lastAutomationRun}', to_jsonb(now()::text)),
          '{lastAutomationCount}', to_jsonb(v_pending_cancelled + v_approved_cancelled)
        ),
        '{lastAutomationStatus}', '"success"'::jsonb
      ),
      updated_at = now()
  where id = 'current';

  return jsonb_build_object(
    'success', true,
    'cancelled_pending', v_pending_cancelled,
    'cancelled_approved', v_approved_cancelled,
    'total_cancelled', v_pending_cancelled + v_approved_cancelled,
    'timestamp', now()
  );
end;
$$;

-- Grant execution to authenticated users
grant select, update on public.admin_settings to authenticated;
grant select, update, insert on public.notifications to authenticated;
grant execute on function public.process_expired_bookings() to authenticated;

-- Optional: Enable pg_cron if supported by the Supabase project
-- create extension if not exists pg_cron;
-- select cron.schedule('labsync-hourly-auto-cancel', '0 * * * *', 'select public.process_expired_bookings();');
