-- ============================================================================
-- LABSYNC DATABASE MIGRATION — STEP 01: CORE SCHEMA DEFINITION
-- Purpose: Creates extensions, tables, foreign key constraints, and indexes.
-- Target: Clean Supabase PostgreSQL database
-- Safety: Uses IF NOT EXISTS; safe and non-destructive.
-- ============================================================================

-- 1. Enable Cryptographic Extensions
create extension if not exists pgcrypto;

-- 2. Profiles Table (Linked to Supabase auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null default '',
  usn text,
  department text,
  semester text,
  role text not null default 'student' check (role in ('student', 'admin')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

-- 3. Equipment Inventory Table
create table if not exists public.equipment (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  asset_code text not null unique,
  category text,
  description text,
  icon text default '▦',
  total_quantity integer not null check(total_quantity >= 0),
  available_quantity integer not null check(available_quantity >= 0 and available_quantity <= total_quantity),
  created_at timestamptz not null default now()
);

-- 4. Booking Requests Table (Student Requisitions)
create table if not exists public.booking_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  equipment_id uuid not null references public.equipment(id) on delete restrict,
  purpose text not null,
  requested_return_date date not null,
  status text not null default 'pending' check(status in ('pending', 'approved', 'rejected', 'cancelled')),
  created_at timestamptz not null default now()
);

-- 5. Loans Table (Active, Overdue, Returned, or Damaged Issues)
create table if not exists public.loans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  equipment_id uuid not null references public.equipment(id) on delete restrict,
  request_id uuid unique references public.booking_requests(id) on delete set null,
  issued_at timestamptz not null default now(),
  due_at timestamptz not null,
  returned_at timestamptz,
  status text not null default 'issued' check(status in ('issued', 'returned', 'damaged')),
  damage_note text
);

-- 6. Activity Log Table (System & User Audit Trail)
create table if not exists public.activity_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid default auth.uid() references public.profiles(id) on delete set null,
  description text not null,
  created_at timestamptz not null default now()
);

-- 7. Admin Settings Table (Automation thresholds & governance rules)
create table if not exists public.admin_settings (
  id text primary key default 'current',
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by text not null default 'admin'
);

-- 8. Notifications Table (In-app student and faculty alerts)
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  message text not null,
  type text not null default 'info' check (type in ('info', 'success', 'warning', 'alert')),
  read boolean not null default false,
  created_at timestamptz not null default now()
);

-- 9. Performance Indexes
create index if not exists idx_profiles_email on public.profiles(email);
create index if not exists idx_profiles_role_status on public.profiles(role, status);
create index if not exists idx_equipment_asset_code on public.equipment(asset_code);
create index if not exists idx_equipment_category on public.equipment(category);
create index if not exists idx_booking_requests_user_status on public.booking_requests(user_id, status);
create index if not exists idx_booking_requests_equipment on public.booking_requests(equipment_id);
create index if not exists idx_loans_user_status on public.loans(user_id, status);
create index if not exists idx_loans_equipment on public.loans(equipment_id);
create index if not exists idx_loans_request on public.loans(request_id);
create index if not exists idx_notifications_user_read on public.notifications(user_id, read);
create index if not exists idx_activity_log_created_at on public.activity_log(created_at desc);
