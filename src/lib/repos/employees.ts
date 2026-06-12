import { loadStore, saveStore, logAudit } from '@/lib/store';
import { uid, now, pickAvatarColor } from '@/lib/utils';
import type { Employee, EmploymentType } from '@/types';
import { setDemoUser } from '@/lib/store';
import { isSupabaseConfigured, getSupabase } from '@/lib/supabase/client';

export function getEmployees(companyId: string): Employee[] {
  return loadStore().employees.filter((e) => e.company_id === companyId);
}

/**
 * Pull employees for a company from Supabase (when configured) and merge
 * them into the local store so the existing localStorage-based render
 * path can keep working without rewriting every page.
 *
 * Idempotent — re-running will upsert by id. This is what makes
 * "create employee via Edge Function" visible in the UI: the next
 * `getEmployees()` call returns the freshly inserted row.
 */
export async function syncEmployeesFromSupabase(companyId: string): Promise<void> {
  if (!isSupabaseConfigured) return;
  const supabase = getSupabase();
  if (!supabase) return;

  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .eq('company_id', companyId);
  if (error) {
    console.error('syncEmployeesFromSupabase failed', error);
    return;
  }
  if (!data) return;

  const store = loadStore();
  // Drop any local rows for this company (they may have been stale
  // placeholders), then re-insert fresh rows.
  store.employees = store.employees.filter((e) => e.company_id !== companyId);
  for (const row of data) {
    store.employees.push(row as Employee);
  }
  // Also sync profiles for completeness
  const profileIds = data.map((r: any) => r.profile_id).filter(Boolean);
  if (profileIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .in('id', profileIds);
    if (profiles) {
      for (const p of profiles) {
        const idx = store.profiles.findIndex((x) => x.id === (p as any).id);
        if (idx >= 0) store.profiles[idx] = p as any;
        else store.profiles.push(p as any);
      }
    }
  }
  saveStore(store);
}

export function getActiveEmployees(companyId: string): Employee[] {
  return getEmployees(companyId).filter((e) => e.status === 'active');
}

export function getEmployee(employeeId: string): Employee | null {
  return loadStore().employees.find((e) => e.id === employeeId) ?? null;
}

export function getEmployeeByProfile(profileId: string): Employee | null {
  return loadStore().employees.find((e) => e.profile_id === profileId) ?? null;
}

export interface CreateEmployeeInput {
  company_id: string;
  full_name: string;
  nickname?: string;
  phone?: string;
  email?: string;
  position?: string;
  employment_type: EmploymentType;
  pay_rule_id?: string;
  default_shift_id?: string;
  start_date: string;
  createLogin?: boolean;
  password?: string;
  role?: 'employee' | 'admin';
  actorId: string;
}

export function createEmployee(input: CreateEmployeeInput): Employee {
  const store = loadStore();
  const empId = uid('emp');
  let profileId: string | undefined;
  if (input.createLogin && input.email) {
    profileId = uid('usr');
    store.profiles.push({
      id: profileId,
      company_id: input.company_id,
      email: input.email,
      full_name: input.full_name,
      role: input.role ?? 'employee',
      phone: input.phone ?? null,
      is_active: true,
      created_at: now(),
      updated_at: now(),
    });
    if (input.password) setDemoUser(profileId, input.password);
  }
  const emp: Employee = {
    id: empId,
    company_id: input.company_id,
    profile_id: profileId ?? null,
    employee_code: `EMP${String(store.employees.length + 1).padStart(3, '0')}`,
    full_name: input.full_name,
    nickname: input.nickname ?? null,
    phone: input.phone ?? null,
    email: input.email ?? null,
    position: input.position ?? null,
    employment_type: input.employment_type,
    pay_rule_id: input.pay_rule_id ?? null,
    default_shift_id: input.default_shift_id ?? null,
    start_date: input.start_date,
    status: 'active',
    avatar_color: pickAvatarColor(input.full_name),
    created_at: now(),
    updated_at: now(),
  };
  store.employees.push(emp);
  logAudit(input.company_id, input.actorId, 'employees', emp.id, 'create', null, emp);
  saveStore(store);
  return emp;
}

export function updateEmployee(empId: string, actorId: string, patch: Partial<Employee>): Employee {
  const store = loadStore();
  const emp = store.employees.find((e) => e.id === empId);
  if (!emp) throw new Error('ไม่พบพนักงาน');
  const before = JSON.parse(JSON.stringify(emp));
  Object.assign(emp, patch, { updated_at: now() });
  // Sync profile
  if (emp.profile_id) {
    const p = store.profiles.find((p) => p.id === emp.profile_id);
    if (p) {
      p.full_name = emp.full_name;
      p.email = emp.email ?? p.email;
      p.phone = emp.phone ?? p.phone;
      p.updated_at = now();
    }
  }
  logAudit(emp.company_id, actorId, 'employees', emp.id, 'update', before, emp);
  saveStore(store);
  return emp;
}

export function setEmployeeStatus(empId: string, actorId: string, status: 'active' | 'inactive' | 'resigned') {
  return updateEmployee(empId, actorId, { status });
}

export function resetEmployeePassword(empId: string, newPassword: string): void {
  const store = loadStore();
  const emp = store.employees.find((e) => e.id === empId);
  if (!emp || !emp.profile_id) throw new Error('พนักงานนี้ยังไม่มีบัญชีเข้าใช้งาน');
  setDemoUser(emp.profile_id, newPassword, emp.id);
}

/**
 * Create an employee with a real Supabase Auth login — owner-only.
 *
 * Calls the Supabase Edge Function `create-employee` which uses the
 * service_role key to:
 *   1. auth.admin.createUser(email, password)
 *   2. insert into public.profiles (role = 'employee')
 *   3. insert into public.employees linked by profile_id
 *
 * Throws if Supabase is not configured, the caller's session is
 * missing, or the Edge Function reports an error.
 */
export interface CreateEmployeeWithLoginInput {
  full_name: string;
  email: string;
  password: string;
  nickname?: string;
  phone?: string;
  position?: string;
  employment_type: EmploymentType;
  pay_rule_id?: string;
  default_shift_id?: string;
  start_date: string;
  role?: 'employee' | 'admin';
}

export interface CreateEmployeeWithLoginResult {
  employee: Employee;
  login: { email: string; password: string };
}

export async function createEmployeeWithLogin(
  input: CreateEmployeeWithLoginInput,
): Promise<CreateEmployeeWithLoginResult> {
  if (!isSupabaseConfigured) {
    throw new Error('โหมดนี้ใช้ได้เฉพาะตอนต่อ Supabase เท่านั้น');
  }
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase client ไม่พร้อมใช้งาน');

  const { data, error } = await supabase.functions.invoke<{
    ok: boolean;
    employee: Employee;
    login: { email: string; password: string };
  }>('create-employee', { body: input });

  if (error) {
    // FunctionsHttpError carries the body — try to extract a friendly message
    const msg = (error as any)?.context?.body?.error ?? error.message;
    throw new Error(msg || 'เรียก Edge Function ไม่สำเร็จ');
  }
  if (!data?.ok || !data?.employee) {
    throw new Error('Edge Function ตอบกลับไม่ถูกต้อง');
  }
  return { employee: data.employee, login: data.login };
}

/**
 * Reset password for an employee that has a real Supabase Auth login.
 * Requires the Edge Function `reset-employee-password` to be deployed
 * (it shares the same owner-check pattern as create-employee).
 */
export async function resetEmployeePasswordRemote(
  empId: string,
  newPassword: string,
): Promise<void> {
  if (!isSupabaseConfigured) throw new Error('ต้องต่อ Supabase');
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase client ไม่พร้อมใช้งาน');
  const { data, error } = await supabase.functions.invoke<{ ok: boolean }>(
    'reset-employee-password',
    { body: { employee_id: empId, new_password: newPassword } },
  );
  if (error) {
    const msg = (error as any)?.context?.body?.error ?? error.message;
    throw new Error(msg || 'เรียก Edge Function ไม่สำเร็จ');
  }
  if (!data?.ok) throw new Error('Edge Function ตอบกลับไม่ถูกต้อง');
}
