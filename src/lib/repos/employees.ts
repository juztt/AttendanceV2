import { loadStore, saveStore, logAudit } from '@/lib/store';
import { uid, now, pickAvatarColor } from '@/lib/utils';
import type { Employee, EmploymentType } from '@/types';
import { setDemoUser } from '@/lib/store';

export function getEmployees(companyId: string): Employee[] {
  return loadStore().employees.filter((e) => e.company_id === companyId);
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
