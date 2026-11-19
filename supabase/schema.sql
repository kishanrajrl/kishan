-- LabSync database schema. Run this in Supabase SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null default '',
  usn text,
  department text,
  semester text,
  role text not null default 'student' check (role in ('student','admin')),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now()
);

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

create table if not exists public.booking_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  equipment_id uuid not null references public.equipment(id),
  purpose text not null,
  requested_return_date date not null,
  status text not null default 'pending' check(status in ('pending','approved','rejected','cancelled')),
  created_at timestamptz not null default now()
);

create table if not exists public.loans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  equipment_id uuid not null references public.equipment(id),
  request_id uuid unique references public.booking_requests(id),
  issued_at timestamptz not null default now(),
  due_at timestamptz not null,
  returned_at timestamptz,
  status text not null default 'issued' check(status in ('issued','returned','damaged')),
  damage_note text
);

create table if not exists public.activity_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid default auth.uid() references public.profiles(id),
  description text not null,
  created_at timestamptz not null default now()
);

-- Keep admin privilege limited to these exact addresses.
create or replace function public.is_lab_admin()
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
      and p.status = 'approved'
      and lower(p.email) in ('admin577528@gmail.com','harshritesh6360@gmail.com')
  );
$$;

-- Create a student profile on signup. Admins are provisioned only by the server-side bootstrap script.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles(id,email,full_name,usn,department,semester,role,status)
  values (
    new.id,
    lower(new.email),
    coalesce(new.raw_user_meta_data->>'full_name',''),
    new.raw_user_meta_data->>'usn',
    new.raw_user_meta_data->>'department',
    new.raw_user_meta_data->>'semester',
    'student',
    'pending'
  )
  on conflict (id) do update set email=excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.approve_booking(p_request_id uuid, p_due_at date)
returns void language plpgsql security definer set search_path=public
as $$
declare r public.booking_requests; e public.equipment;
begin
  if not public.is_lab_admin() then raise exception 'Admin access required'; end if;
  select * into r from public.booking_requests where id=p_request_id for update;
  if not found or r.status <> 'pending' then raise exception 'Request is not pending'; end if;
  select * into e from public.equipment where id=r.equipment_id for update;
  if e.available_quantity < 1 then raise exception 'No available units'; end if;
  update public.equipment set available_quantity=available_quantity-1 where id=e.id;
  update public.booking_requests set status='approved' where id=r.id;
  insert into public.loans(user_id,equipment_id,request_id,due_at)
  values(r.user_id,r.equipment_id,r.id,p_due_at::timestamptz + interval '23 hours 59 minutes');
end;
$$;

create or replace function public.return_loan(p_loan_id uuid, p_damaged boolean default false, p_note text default null)
returns void language plpgsql security definer set search_path=public
as $$
declare l public.loans;
begin
  if not public.is_lab_admin() then raise exception 'Admin access required'; end if;
  select * into l from public.loans where id=p_loan_id for update;
  if not found or l.status <> 'issued' then raise exception 'Loan is not active'; end if;
  update public.loans set status=case when p_damaged then 'damaged' else 'returned' end,
    returned_at=now(), damage_note=case when p_damaged then p_note else null end
  where id=p_loan_id;
  if not p_damaged then
    update public.equipment set available_quantity=least(total_quantity,available_quantity+1) where id=l.equipment_id;
  end if;
end;
$$;

alter table public.profiles enable row level security;
alter table public.equipment enable row level security;
alter table public.booking_requests enable row level security;
alter table public.loans enable row level security;
alter table public.activity_log enable row level security;

drop policy if exists "profiles read own or admin" on public.profiles;
create policy "profiles read own or admin" on public.profiles for select to authenticated
using (id=auth.uid() or public.is_lab_admin());
drop policy if exists "admin update profiles" on public.profiles;
create policy "admin update profiles" on public.profiles for update to authenticated
using (public.is_lab_admin()) with check (
  public.is_lab_admin()
  and (role <> 'admin' or lower(email) in ('admin577528@gmail.com','harshritesh6360@gmail.com'))
);
drop policy if exists "equipment read approved" on public.equipment;
create policy "equipment read approved" on public.equipment for select to authenticated
using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.status='approved'));
drop policy if exists "admin equipment insert" on public.equipment;
create policy "admin equipment insert" on public.equipment for insert to authenticated
with check(public.is_lab_admin());
drop policy if exists "admin equipment update" on public.equipment;
create policy "admin equipment update" on public.equipment for update to authenticated
using(public.is_lab_admin()) with check(public.is_lab_admin());
drop policy if exists "admin equipment delete" on public.equipment;
create policy "admin equipment delete" on public.equipment for delete to authenticated using(public.is_lab_admin());

drop policy if exists "requests read own or admin" on public.booking_requests;
create policy "requests read own or admin" on public.booking_requests for select to authenticated
using(user_id=auth.uid() or public.is_lab_admin());
drop policy if exists "students create own requests" on public.booking_requests;
create policy "students create own requests" on public.booking_requests for insert to authenticated
with check(user_id=auth.uid() and status='pending' and exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='student' and p.status='approved'));
drop policy if exists "admin update requests" on public.booking_requests;
create policy "admin update requests" on public.booking_requests for update to authenticated
using(public.is_lab_admin()) with check(public.is_lab_admin());

drop policy if exists "loans read own or admin" on public.loans;
create policy "loans read own or admin" on public.loans for select to authenticated
using(user_id=auth.uid() or public.is_lab_admin());

drop policy if exists "activity read admin" on public.activity_log;
create policy "activity read admin" on public.activity_log for select to authenticated using(public.is_lab_admin());
drop policy if exists "activity insert authenticated" on public.activity_log;
create policy "activity insert authenticated" on public.activity_log for insert to authenticated
with check(actor_id=auth.uid());

grant usage on schema public to authenticated;
grant select,insert,update,delete on public.equipment to authenticated;
grant select,insert,update on public.booking_requests to authenticated;
grant select on public.loans to authenticated;
grant select,update on public.profiles to authenticated;
grant select,insert on public.activity_log to authenticated;
grant execute on function public.approve_booking(uuid,date) to authenticated;
grant execute on function public.return_loan(uuid,boolean,text) to authenticated;
grant execute on function public.is_lab_admin() to authenticated;
