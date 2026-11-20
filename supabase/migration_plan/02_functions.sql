-- ============================================================================
-- LABSYNC DATABASE MIGRATION — STEP 02: STORED PROCEDURES & BUSINESS LOGIC
-- Purpose: Creates core business logic, role verification, and atomic workflows.
-- Target: Clean Supabase PostgreSQL database
-- Safety: Uses CREATE OR REPLACE FUNCTION; safe and non-destructive.
-- ============================================================================

-- 1. Admin Role & Identity Verification
-- Strictly limits administrative authority to the two configured accounts
create or replace function public.is_lab_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
      and p.status = 'approved'
      and lower(p.email) in ('admin577528@gmail.com', 'harshritesh6360@gmail.com')
  );
$$;

-- 2. New User Registration Trigger Procedure
-- Automatically initializes a student profile in 'pending' status when created in auth.users
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    email,
    full_name,
    usn,
    department,
    semester,
    role,
    status
  )
  values (
    new.id,
    lower(new.email),
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.raw_user_meta_data->>'usn',
    new.raw_user_meta_data->>'department',
    new.raw_user_meta_data->>'semester',
    'student',
    'pending'
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = case when excluded.full_name <> '' then excluded.full_name else profiles.full_name end,
    usn = coalesce(excluded.usn, profiles.usn),
    department = coalesce(excluded.department, profiles.department),
    semester = coalesce(excluded.semester, profiles.semester);
  return new;
end;
$$;

-- 3. Stored Procedure: Single-Step Approve Booking & Issue
-- Used by automated tests and direct RPC calls to approve and issue in one transaction
create or replace function public.approve_booking(
  p_request_id uuid,
  p_due_at date
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.booking_requests;
  e public.equipment;
begin
  if not public.is_lab_admin() then
    raise exception 'Admin access required';
  end if;

  select * into r from public.booking_requests where id = p_request_id for update;
  if not found or r.status <> 'pending' then
    raise exception 'Request is not pending';
  end if;

  select * into e from public.equipment where id = r.equipment_id for update;
  if e.available_quantity < 1 then
    raise exception 'No available units';
  end if;

  -- Deduct inventory unit
  update public.equipment
  set available_quantity = available_quantity - 1
  where id = e.id;

  -- Update request status
  update public.booking_requests
  set status = 'approved'
  where id = r.id;

  -- Create active loan
  insert into public.loans (
    user_id,
    equipment_id,
    request_id,
    due_at,
    status
  )
  values (
    r.user_id,
    r.equipment_id,
    r.id,
    p_due_at::timestamptz + interval '23 hours 59 minutes 59 seconds',
    'issued'
  );
end;
$$;

-- 4. Stored Procedure: Return Loan & Condition Processing
-- Manages returns, damage quarantine, and atomic inventory restoration
create or replace function public.return_loan(
  p_loan_id uuid,
  p_damaged boolean default false,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  l public.loans;
begin
  if not public.is_lab_admin() then
    raise exception 'Admin access required';
  end if;

  select * into l from public.loans where id = p_loan_id for update;
  if not found or l.status <> 'issued' then
    raise exception 'Loan is not active';
  end if;

  -- Mark loan status and timestamp
  update public.loans
  set status = case when p_damaged then 'damaged' else 'returned' end,
      returned_at = now(),
      damage_note = case when p_damaged then p_note else null end
  where id = p_loan_id;

  -- If returned undamaged, restore available stock (+1 unit)
  if not p_damaged then
    update public.equipment
    set available_quantity = least(total_quantity, available_quantity + 1)
    where id = l.equipment_id;
  end if;
end;
$$;

-- 5. Stored Procedure: Automated Requisition Expiration & Stock Replenishment
-- Scans for stale pending requisitions and uncollected approved hardware
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
  -- Fetch active settings configuration
  select settings into v_settings from public.admin_settings where id = 'current';
  if v_settings is not null then
    v_pending_enabled := coalesce((v_settings->>'autoCancelPendingEnabled')::boolean, true);
    v_pending_days := coalesce((v_settings->>'pendingExpiryDays')::integer, 3);
    v_approved_enabled := coalesce((v_settings->>'autoCancelApprovedEnabled')::boolean, true);
    v_approved_hours := coalesce((v_settings->>'approvedExpiryHours')::integer, 24);
  end if;

  -- Phase A: Auto-cancel stale pending requests
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

  -- Phase B: Auto-cancel approved requests that were never collected at the counter
  if v_approved_enabled then
    for r in
      select br.id, br.user_id, br.equipment_id, l.id as loan_id, e.name as eq_name, e.asset_code, e.total_quantity, e.available_quantity
      from public.booking_requests br
      left join public.loans l on l.request_id = br.id
      join public.equipment e on e.id = br.equipment_id
      where br.status = 'approved'
        and (l.id is null or (l.status = 'issued' and l.returned_at is null))
        and br.created_at <= (now() - (v_approved_hours || ' hours')::interval)
      for update of br, e
    loop
      -- Cancel booking request
      update public.booking_requests
      set status = 'cancelled',
          purpose = purpose || ' [Auto-cancelled: Uncollected after ' || v_approved_hours || ' hours]'
      where id = r.id;

      -- If an uncollected loan record was created, void it
      if r.loan_id is not null then
        delete from public.loans where id = r.loan_id;
      end if;

      -- Atomically restore reserved inventory (+1 unit)
      update public.equipment
      set available_quantity = least(total_quantity, available_quantity + 1)
      where id = r.equipment_id;

      insert into public.activity_log(description)
      values ('AUTOMATION: Uncollected approved requisition #' || substr(r.id::text, 1, 8) || ' for ' || r.eq_name || ' (' || r.asset_code || ') cancelled. Reserved unit restored (+1).');

      v_approved_cancelled := v_approved_cancelled + 1;
    end loop;
  end if;

  -- Update automation execution timestamp in admin_settings
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
