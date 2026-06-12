-- =====================================================
-- Row Level Security Policies
-- =====================================================

alter table public.companies enable row level security;
alter table public.profiles enable row level security;
alter table public.branches enable row level security;
alter table public.employees enable row level security;
alter table public.shifts enable row level security;
alter table public.employee_schedules enable row level security;
alter table public.locations enable row level security;
alter table public.holidays enable row level security;
alter table public.pay_rules enable row level security;
alter table public.attendance_logs enable row level security;
alter table public.daily_timesheets enable row level security;
alter table public.leave_types enable row level security;
alter table public.leave_requests enable row level security;
alter table public.time_adjustment_requests enable row level security;
alter table public.payroll_periods enable row level security;
alter table public.payroll_items enable row level security;
alter table public.payroll_adjustments enable row level security;
alter table public.app_settings enable row level security;
alter table public.audit_logs enable row level security;

-- Helper macro: drop existing policies to keep migrations idempotent
do $$
declare
  p record;
begin
  for p in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
  loop
    execute format('drop policy if exists %I on public.%I', p.policyname, p.tablename);
  end loop;
end$$;

-- ---------- COMPANIES ----------
create policy "companies_select_same_company" on public.companies
  for select using (id = (select company_id from public.profiles where id = auth.uid()));
create policy "companies_admin_update" on public.companies
  for update using (public.is_admin_of_company(id));
create policy "companies_admin_insert" on public.companies
  for insert with check (public.is_admin_of_company(id));

-- ---------- PROFILES ----------
create policy "profiles_select_same_company" on public.profiles
  for select using (public.is_employee_of_company(company_id));
create policy "profiles_admin_all" on public.profiles
  for all using (public.is_admin_of_company(company_id))
  with check (public.is_admin_of_company(company_id));
create policy "profiles_self_update" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- ---------- BRANCHES ----------
create policy "branches_select_same_company" on public.branches
  for select using (public.is_employee_of_company(company_id));
create policy "branches_admin_all" on public.branches
  for all using (public.is_admin_of_company(company_id))
  with check (public.is_admin_of_company(company_id));

-- ---------- EMPLOYEES ----------
create policy "employees_select_same_company" on public.employees
  for select using (public.is_employee_of_company(company_id));
create policy "employees_admin_all" on public.employees
  for all using (public.is_admin_of_company(company_id))
  with check (public.is_admin_of_company(company_id));
create policy "employees_self_update_basic" on public.employees
  for update using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

-- ---------- SHIFTS ----------
create policy "shifts_select_same_company" on public.shifts
  for select using (public.is_employee_of_company(company_id));
create policy "shifts_admin_all" on public.shifts
  for all using (public.is_admin_of_company(company_id))
  with check (public.is_admin_of_company(company_id));

-- ---------- EMPLOYEE SCHEDULES ----------
create policy "schedules_select_same_company" on public.employee_schedules
  for select using (public.is_employee_of_company(company_id));
create policy "schedules_admin_all" on public.employee_schedules
  for all using (public.is_admin_of_company(company_id))
  with check (public.is_admin_of_company(company_id));

-- ---------- LOCATIONS ----------
create policy "locations_select_same_company" on public.locations
  for select using (public.is_employee_of_company(company_id));
create policy "locations_admin_all" on public.locations
  for all using (public.is_admin_of_company(company_id))
  with check (public.is_admin_of_company(company_id));

-- ---------- HOLIDAYS ----------
create policy "holidays_select_same_company" on public.holidays
  for select using (public.is_employee_of_company(company_id));
create policy "holidays_admin_all" on public.holidays
  for all using (public.is_admin_of_company(company_id))
  with check (public.is_admin_of_company(company_id));

-- ---------- PAY RULES ----------
create policy "pay_rules_select_same_company" on public.pay_rules
  for select using (public.is_employee_of_company(company_id));
create policy "pay_rules_admin_all" on public.pay_rules
  for all using (public.is_admin_of_company(company_id))
  with check (public.is_admin_of_company(company_id));

-- ---------- ATTENDANCE LOGS ----------
create policy "attendance_select_same_company" on public.attendance_logs
  for select using (public.is_employee_of_company(company_id));
create policy "attendance_employee_insert" on public.attendance_logs
  for insert with check (
    public.is_employee_of_company(company_id)
    and employee_id = (select id from public.employees where profile_id = auth.uid() limit 1)
  );
create policy "attendance_employee_update" on public.attendance_logs
  for update using (
    employee_id = (select id from public.employees where profile_id = auth.uid() limit 1)
  )
  with check (
    employee_id = (select id from public.employees where profile_id = auth.uid() limit 1)
  );
create policy "attendance_admin_all" on public.attendance_logs
  for all using (public.is_admin_of_company(company_id))
  with check (public.is_admin_of_company(company_id));

-- ---------- DAILY TIMESHEETS ----------
create policy "timesheets_select_same_company" on public.daily_timesheets
  for select using (public.is_employee_of_company(company_id));
create policy "timesheets_admin_all" on public.daily_timesheets
  for all using (public.is_admin_of_company(company_id))
  with check (public.is_admin_of_company(company_id));

-- ---------- LEAVE TYPES ----------
create policy "leave_types_select_same_company" on public.leave_types
  for select using (public.is_employee_of_company(company_id));
create policy "leave_types_admin_all" on public.leave_types
  for all using (public.is_admin_of_company(company_id))
  with check (public.is_admin_of_company(company_id));

-- ---------- LEAVE REQUESTS ----------
create policy "leave_select_self_or_admin" on public.leave_requests
  for select using (
    public.is_admin_of_company(company_id)
    or employee_id = (select id from public.employees where profile_id = auth.uid() limit 1)
  );
create policy "leave_employee_insert" on public.leave_requests
  for insert with check (
    employee_id = (select id from public.employees where profile_id = auth.uid() limit 1)
  );
create policy "leave_employee_update_pending" on public.leave_requests
  for update using (
    employee_id = (select id from public.employees where profile_id = auth.uid() limit 1)
    and status = 'pending'
  );
create policy "leave_admin_all" on public.leave_requests
  for all using (public.is_admin_of_company(company_id))
  with check (public.is_admin_of_company(company_id));

-- ---------- TIME ADJUSTMENT REQUESTS ----------
create policy "adj_select_self_or_admin" on public.time_adjustment_requests
  for select using (
    public.is_admin_of_company(company_id)
    or employee_id = (select id from public.employees where profile_id = auth.uid() limit 1)
  );
create policy "adj_employee_insert" on public.time_adjustment_requests
  for insert with check (
    employee_id = (select id from public.employees where profile_id = auth.uid() limit 1)
  );
create policy "adj_admin_all" on public.time_adjustment_requests
  for all using (public.is_admin_of_company(company_id))
  with check (public.is_admin_of_company(company_id));

-- ---------- PAYROLL ----------
create policy "payroll_periods_admin_all" on public.payroll_periods
  for all using (public.is_admin_of_company(company_id))
  with check (public.is_admin_of_company(company_id));
create policy "payroll_periods_employee_select" on public.payroll_periods
  for select using (public.is_employee_of_company(company_id));

create policy "payroll_items_admin_all" on public.payroll_items
  for all using (public.is_admin_of_company(company_id))
  with check (public.is_admin_of_company(company_id));
create policy "payroll_items_employee_select" on public.payroll_items
  for select using (
    public.is_employee_of_company(company_id)
    and employee_id = (select id from public.employees where profile_id = auth.uid() limit 1)
  );

create policy "payroll_adjustments_admin_all" on public.payroll_adjustments
  for all using (public.is_admin_of_company(company_id))
  with check (public.is_admin_of_company(company_id));

-- ---------- APP SETTINGS ----------
create policy "app_settings_admin_all" on public.app_settings
  for all using (public.is_admin_of_company(company_id))
  with check (public.is_admin_of_company(company_id));
create policy "app_settings_employee_select" on public.app_settings
  for select using (public.is_employee_of_company(company_id));

-- ---------- AUDIT LOGS ----------
create policy "audit_admin_select" on public.audit_logs
  for select using (public.is_admin_of_company(company_id));
create policy "audit_admin_insert" on public.audit_logs
  for insert with check (public.is_admin_of_company(company_id));
