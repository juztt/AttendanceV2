-- =====================================================
-- Mini TimePay — Supabase Schema
-- =====================================================
-- ใช้ Supabase Postgres + Row Level Security
-- รันไฟล์นี้ใน Supabase SQL Editor ตามลำดับ:
--   1. supabase/migrations/0001_init.sql
--   2. supabase/migrations/0002_rls.sql
--   3. supabase/seed/seed.sql  (optional, for demo data)
-- =====================================================

-- Extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- =====================================================
-- COMPANIES
-- =====================================================
create table if not exists public.companies (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  tax_id text,
  address text,
  phone text,
  logo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =====================================================
-- PROFILES  (links to auth.users)
-- =====================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  email text not null,
  full_name text not null,
  role text not null check (role in ('owner','admin','employee')) default 'employee',
  avatar_url text,
  phone text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, email)
);
create index if not exists idx_profiles_company on public.profiles(company_id);

-- =====================================================
-- BRANCHES
-- =====================================================
create table if not exists public.branches (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  address text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_branches_company on public.branches(company_id);

-- =====================================================
-- EMPLOYEES
-- =====================================================
create table if not exists public.employees (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references public.companies(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete set null,
  employee_code text,
  full_name text not null,
  nickname text,
  phone text,
  email text,
  position text,
  branch_id uuid references public.branches(id) on delete set null,
  employment_type text not null check (employment_type in ('fulltime_passed','fulltime_not_passed','parttime')),
  pay_rule_id uuid,
  default_shift_id uuid,
  start_date date not null default current_date,
  end_date date,
  status text not null check (status in ('active','inactive','resigned')) default 'active',
  avatar_url text,
  avatar_color text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_employees_company on public.employees(company_id);
create index if not exists idx_employees_profile on public.employees(profile_id);
create index if not exists idx_employees_status on public.employees(company_id, status);

-- =====================================================
-- SHIFTS
-- =====================================================
create table if not exists public.shifts (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  start_time time not null,
  end_time time not null,
  break_minutes int not null default 60,
  standard_hours numeric(4,1) not null default 8,
  grace_minutes int not null default 15,
  ot_enabled boolean not null default true,
  color text not null default '#A7F3D0',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_shifts_company on public.shifts(company_id);

-- =====================================================
-- EMPLOYEE SCHEDULES (optional per-day shift assignments)
-- =====================================================
create table if not exists public.employee_schedules (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references public.companies(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  shift_id uuid not null references public.shifts(id) on delete restrict,
  schedule_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (employee_id, schedule_date)
);
create index if not exists idx_schedules_company_date on public.employee_schedules(company_id, schedule_date);

-- =====================================================
-- LOCATIONS
-- =====================================================
create table if not exists public.locations (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  latitude double precision not null,
  longitude double precision not null,
  radius_meters int not null default 200,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =====================================================
-- HOLIDAYS
-- =====================================================
create table if not exists public.holidays (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  holiday_date date not null,
  multiplier numeric(3,1) not null default 2.0,
  is_recurring boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, holiday_date)
);

-- =====================================================
-- PAY RULES
-- =====================================================
create table if not exists public.pay_rules (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  employment_type text not null check (employment_type in ('fulltime_passed','fulltime_not_passed','parttime')),
  standard_hours_per_day numeric(4,1) not null default 8,
  daily_rate numeric(10,2) not null default 0,
  hourly_rate numeric(10,2) not null default 0,
  ot_rate numeric(10,2) not null default 0,
  holiday_multiplier numeric(3,1) not null default 2.0,
  personal_day_off_paid boolean not null default false,
  personal_day_off_pay numeric(10,2) not null default 0,
  sick_paid boolean not null default false,
  sick_pay_per_day numeric(10,2) not null default 0,
  personal_leave_paid boolean not null default false,
  personal_leave_pay_per_day numeric(10,2) not null default 0,
  vacation_paid boolean not null default false,
  vacation_pay_per_day numeric(10,2) not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_pay_rules_company on public.pay_rules(company_id);

-- Now link employees.pay_rule_id and default_shift_id (FK after both tables exist)
do $$
begin
  if not exists (select 1 from information_schema.table_constraints
                 where constraint_name = 'employees_pay_rule_fk') then
    alter table public.employees
      add constraint employees_pay_rule_fk
      foreign key (pay_rule_id) references public.pay_rules(id) on delete set null;
  end if;
  if not exists (select 1 from information_schema.table_constraints
                 where constraint_name = 'employees_default_shift_fk') then
    alter table public.employees
      add constraint employees_default_shift_fk
      foreign key (default_shift_id) references public.shifts(id) on delete set null;
  end if;
end$$;

-- =====================================================
-- ATTENDANCE LOGS
-- =====================================================
create table if not exists public.attendance_logs (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references public.companies(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  work_date date not null,
  check_in_at timestamptz,
  check_out_at timestamptz,
  method text not null check (method in ('mobile','web','admin')) default 'mobile',
  device_info text,
  latitude double precision,
  longitude double precision,
  location_status text not null check (location_status in ('no_gps','in_area','out_of_area','unchecked')) default 'unchecked',
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (employee_id, work_date)
);
create index if not exists idx_attendance_company_date on public.attendance_logs(company_id, work_date);
create index if not exists idx_attendance_employee_date on public.attendance_logs(employee_id, work_date);

-- =====================================================
-- DAILY TIMESHEETS (denormalized view-friendly table)
-- =====================================================
create table if not exists public.daily_timesheets (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references public.companies(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  work_date date not null,
  shift_id uuid references public.shifts(id) on delete set null,
  scheduled_start timestamptz,
  scheduled_end timestamptz,
  check_in_at timestamptz,
  check_out_at timestamptz,
  work_minutes int not null default 0,
  break_minutes int not null default 0,
  paid_minutes int not null default 0,
  late_minutes int not null default 0,
  early_leave_minutes int not null default 0,
  missing_minutes int not null default 0,
  ot_minutes int not null default 0,
  status text not null check (status in ('normal','late','early_leave','absent','leave','day_off','holiday','forgot_checkout','incomplete')) default 'normal',
  is_holiday boolean not null default false,
  holiday_multiplier numeric(3,1) not null default 1.0,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (employee_id, work_date)
);
create index if not exists idx_timesheets_company_date on public.daily_timesheets(company_id, work_date);

-- =====================================================
-- LEAVE TYPES & REQUESTS
-- =====================================================
create table if not exists public.leave_types (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  category text not null check (category in ('sick','personal','vacation','unpaid')),
  paid boolean not null default false,
  requires_certificate boolean not null default false,
  max_days_per_year int,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.leave_requests (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references public.companies(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  leave_type_id uuid not null references public.leave_types(id) on delete restrict,
  start_date date not null,
  end_date date not null,
  total_days numeric(4,1) not null default 1,
  reason text,
  attachment_url text,
  status text not null check (status in ('pending','approved','rejected')) default 'pending',
  reviewer_id uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  reviewer_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date >= start_date)
);
create index if not exists idx_leave_company_status on public.leave_requests(company_id, status);
create index if not exists idx_leave_employee on public.leave_requests(employee_id, start_date);

-- =====================================================
-- TIME ADJUSTMENT REQUESTS
-- =====================================================
create table if not exists public.time_adjustment_requests (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references public.companies(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  attendance_log_id uuid references public.attendance_logs(id) on delete set null,
  work_date date not null,
  field text not null check (field in ('check_in','check_out','note')),
  original_value text,
  requested_value text not null,
  reason text,
  status text not null check (status in ('pending','approved','rejected')) default 'pending',
  reviewer_id uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  reviewer_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_adj_company_status on public.time_adjustment_requests(company_id, status);

-- =====================================================
-- PAYROLL PERIODS & ITEMS & ADJUSTMENTS
-- =====================================================
create table if not exists public.payroll_periods (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references public.companies(id) on delete cascade,
  period_year int not null,
  period_month int not null check (period_month between 1 and 12),
  start_date date not null,
  end_date date not null,
  status text not null check (status in ('draft','preview','locked')) default 'draft',
  locked_at timestamptz,
  locked_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, period_year, period_month)
);

create table if not exists public.payroll_items (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references public.companies(id) on delete cascade,
  payroll_period_id uuid not null references public.payroll_periods(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  work_days int not null default 0,
  day_off_days int not null default 0,
  leave_days int not null default 0,
  absent_days int not null default 0,
  late_minutes int not null default 0,
  regular_hours numeric(6,2) not null default 0,
  ot_hours numeric(6,2) not null default 0,
  base_pay numeric(12,2) not null default 0,
  ot_pay numeric(12,2) not null default 0,
  holiday_pay numeric(12,2) not null default 0,
  leave_pay numeric(12,2) not null default 0,
  shortage_deduction numeric(12,2) not null default 0,
  other_earnings numeric(12,2) not null default 0,
  other_deductions numeric(12,2) not null default 0,
  net_pay numeric(12,2) not null default 0,
  details jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (payroll_period_id, employee_id)
);

create table if not exists public.payroll_adjustments (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references public.companies(id) on delete cascade,
  payroll_item_id uuid not null references public.payroll_items(id) on delete cascade,
  type text not null check (type in ('earning','deduction')),
  label text not null,
  amount numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =====================================================
-- APP SETTINGS (per company)
-- =====================================================
create table if not exists public.app_settings (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references public.companies(id) on delete cascade,
  key text not null,
  value text,
  updated_at timestamptz not null default now(),
  unique (company_id, key)
);

-- =====================================================
-- AUDIT LOGS
-- =====================================================
create table if not exists public.audit_logs (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references public.companies(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  entity text not null,
  entity_id uuid not null,
  action text not null,
  before jsonb,
  after jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_audit_company_date on public.audit_logs(company_id, created_at desc);

-- =====================================================
-- Trigger: updated_at
-- =====================================================
create or replace function public.tg_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

do $$
declare
  t text;
begin
  for t in
    select unnest(array[
      'companies','profiles','branches','employees','shifts',
      'employee_schedules','locations','holidays','pay_rules',
      'attendance_logs','daily_timesheets','leave_types','leave_requests',
      'time_adjustment_requests','payroll_periods','payroll_items',
      'payroll_adjustments','app_settings'
    ])
  loop
    execute format(
      'drop trigger if exists trg_set_updated_at on public.%I;
       create trigger trg_set_updated_at before update on public.%I
       for each row execute function public.tg_set_updated_at();',
      t, t);
  end loop;
end$$;

-- =====================================================
-- Helper: is_admin_of_company
-- =====================================================
create or replace function public.is_admin_of_company(p_company uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists(
    select 1 from public.profiles
    where id = auth.uid() and company_id = p_company
      and role in ('owner','admin') and is_active
  );
$$;

-- =====================================================
-- Helper: is_employee_of_company
-- =====================================================
create or replace function public.is_employee_of_company(p_company uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists(
    select 1 from public.profiles
    where id = auth.uid() and company_id = p_company and is_active
  );
$$;

-- =====================================================
-- Helper: get_employee_id_for_current_user
-- =====================================================
create or replace function public.current_employee_id()
returns uuid
language sql
security definer
stable
as $$
  select id from public.employees where profile_id = auth.uid() limit 1;
$$;
