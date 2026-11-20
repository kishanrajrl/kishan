-- ============================================================================
-- LABSYNC DATABASE MIGRATION — STEP 07: DEMO ACTIVITY LOGS & WORKFLOW DATA
-- Purpose: Seeds initial audit logs, and conditionally links sample bookings &
--          loans if student profiles are present in the new Supabase project.
-- Target: Clean Supabase PostgreSQL database
-- Safety: Uses dynamic existence checks; safe to run before or after student signup.
-- ============================================================================

-- 1. Seed Realistic System Audit Trail Logs (Always Safe - actor_id is nullable)
insert into public.activity_log (description, created_at)
values
  ('System initialization: Core equipment inventory verified and calibrated across 8 lab bays.', now() - interval '5 days'),
  ('Governance: Default administrative loan duration set to 7 days with automated overdue alerts.', now() - interval '4 days'),
  ('Routine inventory check completed: Oscilloscopes and logic analyzers inspected for academic term.', now() - interval '3 days'),
  ('Calibration: Multi-channel bench power supplies tested and certified for undergraduate labs.', now() - interval '2 days'),
  ('Maintenance: Electronics component stock replenished; 22 hardware asset categories catalogued.', now() - interval '1 day')
on conflict do nothing;

-- 2. Conditional Booking Requests & Loans Seeder
-- Note: Foreign key constraints require user_id to exist in public.profiles (and auth.users).
-- This block dynamically attaches sample workflow data to any registered student accounts.
do $$
declare
  v_student_1 uuid;
  v_student_2 uuid;
  v_student_3 uuid;
  v_esp32_id uuid;
  v_oled_id uuid;
  v_rpi_id uuid;
  v_scope_id uuid;
  v_logic_id uuid;
  v_hc05_id uuid;
  v_req_1 uuid;
  v_req_2 uuid;
  v_req_3 uuid;
  v_req_4 uuid;
begin
  -- Look for existing student profiles
  select id into v_student_1 from public.profiles where role = 'student' order by created_at asc limit 1;
  select id into v_student_2 from public.profiles where role = 'student' order by created_at asc offset 1 limit 1;
  select id into v_student_3 from public.profiles where role = 'student' order by created_at asc offset 2 limit 1;

  -- Fall back to first student if fewer than 3 exist
  v_student_2 := coalesce(v_student_2, v_student_1);
  v_student_3 := coalesce(v_student_3, v_student_1);

  if v_student_1 is null then
    raise notice 'ℹ️  NOTE: No student accounts found in public.profiles yet.';
    raise notice 'ℹ️  Core tables, audit logs, and 22 equipment models are ready!';
    raise notice 'ℹ️  To seed demo student logins and bookings, run:';
    raise notice '       npm run bootstrap:demo';
    raise notice '       node scripts/seed-more-demo-data.mjs';
    return;
  end if;

  -- Fetch equipment IDs by asset code
  select id into v_esp32_id from public.equipment where asset_code = 'LS-1002';
  select id into v_oled_id from public.equipment where asset_code = 'LS-1015';
  select id into v_rpi_id from public.equipment where asset_code = 'LS-1012';
  select id into v_scope_id from public.equipment where asset_code = 'LS-1013';
  select id into v_logic_id from public.equipment where asset_code = 'LS-1014';
  select id into v_hc05_id from public.equipment where asset_code = 'LS-1018';

  -- A. Sample Pending Requisition (Ready for admin to click Approve)
  if v_esp32_id is not null and not exists (select 1 from public.booking_requests where purpose like 'DEMO: Smart Attendance%') then
    insert into public.booking_requests (user_id, equipment_id, purpose, requested_return_date, status, created_at)
    values (v_student_1, v_esp32_id, 'DEMO: Smart Attendance System using RFID & Cloud Telemetry', (current_date + interval '5 days')::date, 'pending', now() - interval '2 hours');
  end if;

  -- B. Sample Pending Requisition (Ready for admin to click Approve)
  if v_oled_id is not null and not exists (select 1 from public.booking_requests where purpose like 'DEMO: Digital Voltmeter%') then
    insert into public.booking_requests (user_id, equipment_id, purpose, requested_return_date, status, created_at)
    values (v_student_2, v_oled_id, 'DEMO: Digital Voltmeter GUI and Waveform Display', (current_date + interval '4 days')::date, 'pending', now() - interval '5 hours');
  end if;

  -- C. Sample Approved Awaiting Collection (Stock reserved, ready for admin to click '⚡ Issue Hardware' at counter)
  if v_rpi_id is not null and not exists (select 1 from public.booking_requests where purpose like 'DEMO: Autonomous Obstacle Rover%') then
    insert into public.booking_requests (user_id, equipment_id, purpose, requested_return_date, status, created_at)
    values (v_student_3, v_rpi_id, 'DEMO: Autonomous Obstacle Rover with Computer Vision (Ready for collection)', (current_date + interval '7 days')::date, 'approved', now() - interval '1 day')
    returning id into v_req_3;

    -- Reserve 1 unit in equipment inventory
    update public.equipment set available_quantity = greatest(0, available_quantity - 1) where id = v_rpi_id;
  end if;

  -- D. Sample Active Loan (In progress, plenty of time remaining)
  if v_scope_id is not null and not exists (select 1 from public.loans where damage_note = 'DEMO: Active loan (Oscilloscope in signals lab)') then
    insert into public.loans (user_id, equipment_id, due_at, status, damage_note, issued_at)
    values (v_student_2, v_scope_id, now() + interval '3 days', 'issued', 'DEMO: Active loan (Oscilloscope in signals lab)', now() - interval '2 days');

    update public.equipment set available_quantity = greatest(0, available_quantity - 1) where id = v_scope_id;
  end if;

  -- E. Sample Overdue Loan (Overdue by 2 days — triggers urgent red alerts in UI)
  if v_logic_id is not null and not exists (select 1 from public.loans where damage_note = 'DEMO: Overdue loan (Logic Analyzer SPI protocol test)') then
    insert into public.loans (user_id, equipment_id, due_at, status, damage_note, issued_at)
    values (v_student_1, v_logic_id, now() - interval '2 days', 'issued', 'DEMO: Overdue loan (Logic Analyzer SPI protocol test)', now() - interval '9 days');

    update public.equipment set available_quantity = greatest(0, available_quantity - 1) where id = v_logic_id;
  end if;

  -- F. Sample Damaged Return (Displays condition report and quarantine handling)
  if v_hc05_id is not null and not exists (select 1 from public.loans where damage_note like 'INSPECTION REPORT:%') then
    insert into public.loans (user_id, equipment_id, due_at, returned_at, status, damage_note, issued_at)
    values (v_student_3, v_hc05_id, now() - interval '4 days', now() - interval '1 day', 'damaged',
            'INSPECTION REPORT: Bent RX pin header and trace cracked during breadboard insertion; quarantined for PCB rework.',
            now() - interval '8 days');
  end if;

  raise notice '✅ Demo requisitions and loans successfully linked to student accounts!';
end;
$$;
