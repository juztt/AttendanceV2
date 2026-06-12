// Local data store — full CRUD against window.localStorage with seed data.
// This is the runtime that powers every page when Supabase is not configured.
// When env vars are set, the same UI calls the Supabase client instead.

import type {
  Company,
  Employee,
  Profile,
  Shift,
  PayRule,
  Holiday,
  Location,
  AttendanceLog,
  DailyTimesheet,
  LeaveType,
  LeaveRequest,
  TimeAdjustmentRequest,
  PayrollPeriod,
  PayrollItem,
  PayrollAdjustment,
  AppSetting,
  AuditLog,
  Branch,
  EmploymentType,
} from '@/types';
import { pad2, pickAvatarColor, uid, now } from '@/lib/utils';

const STORE_KEY = 'mini-timepay-store-v1';
const SESSION_KEY = 'mini-timepay-session-v1';
const SCHEMA_VERSION = 1;

export interface Store {
  schemaVersion: number;
  companies: Company[];
  profiles: Profile[];
  employees: Employee[];
  branches: Branch[];
  shifts: Shift[];
  attendanceLogs: AttendanceLog[];
  timesheets: DailyTimesheet[];
  leaveTypes: LeaveType[];
  leaveRequests: LeaveRequest[];
  timeAdjustmentRequests: TimeAdjustmentRequest[];
  payRules: PayRule[];
  holidays: Holiday[];
  locations: Location[];
  appSettings: AppSetting[];
  payrollPeriods: PayrollPeriod[];
  payrollItems: PayrollItem[];
  payrollAdjustments: PayrollAdjustment[];
  auditLogs: AuditLog[];
}

export interface Session {
  userId: string;
  companyId: string;
  role: 'owner' | 'admin' | 'employee';
  employeeId?: string;
}

// uid/now are defined in @/lib/utils and re-imported above.

function hashPassword(pwd: string): string {
  // Demo-only "hash" — not for production use, but avoids storing plain text.
  let h = 0;
  const salt = 'mtpay-salt';
  const v = salt + pwd;
  for (let i = 0; i < v.length; i++) {
    h = (h * 31 + v.charCodeAt(i)) >>> 0;
  }
  return `h${h.toString(16)}`;
}

interface DemoUser {
  profileId: string;
  passwordHash: string;
  employeeId?: string;
}

function getDemoUsers(): Record<string, DemoUser> {
  const raw = window.localStorage.getItem('mini-timepay-demo-users-v1');
  if (raw) {
    try { return JSON.parse(raw); } catch { /* fallthrough */ }
  }
  return {};
}

export function setDemoUser(profileId: string, password: string, employeeId?: string) {
  const users = getDemoUsers();
  users[profileId] = { profileId, passwordHash: hashPassword(password), employeeId };
  window.localStorage.setItem('mini-timepay-demo-users-v1', JSON.stringify(users));
}

export function getDemoUser(email: string): DemoUser | undefined {
  const users = getDemoUsers();
  for (const key of Object.keys(users)) {
    const u = users[key];
    if (u.profileId === email || key === email) return u;
  }
  // Allow lookup by email from store
  const store = loadStore();
  const profile = store.profiles.find((p) => p.email === email);
  if (profile) {
    return users[profile.id];
  }
  return undefined;
}

export function verifyPassword(email: string, password: string): boolean {
  const profile = (() => {
    const store = loadStore();
    return store.profiles.find((p) => p.email === email);
  })();
  if (!profile) return false;
  const u = getDemoUsers()[profile.id];
  if (!u) return false;
  return u.passwordHash === hashPassword(password);
}

// ---------- Store load/save ----------

export function loadStore(): Store {
  if (typeof window === 'undefined') return createEmptyStore();
  const raw = window.localStorage.getItem(STORE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Store;
      if (parsed.schemaVersion === SCHEMA_VERSION) return parsed;
    } catch {
      // fallthrough
    }
  }
  const fresh = createEmptyStore();
  seedStore(fresh);
  saveStore(fresh);
  return fresh;
}

export function saveStore(store: Store) {
  window.localStorage.setItem(STORE_KEY, JSON.stringify(store));
}

export function resetStore(): Store {
  const fresh = createEmptyStore();
  seedStore(fresh);
  saveStore(fresh);
  return fresh;
}

function createEmptyStore(): Store {
  return {
    schemaVersion: SCHEMA_VERSION,
    companies: [],
    profiles: [],
    employees: [],
    branches: [],
    shifts: [],
    attendanceLogs: [],
    timesheets: [],
    leaveTypes: [],
    leaveRequests: [],
    timeAdjustmentRequests: [],
    payRules: [],
    holidays: [],
    locations: [],
    appSettings: [],
    payrollPeriods: [],
    payrollItems: [],
    payrollAdjustments: [],
    auditLogs: [],
  };
}

// ---------- Seed ----------

function seedStore(s: Store) {
  const companyId = 'co_default';
  s.companies.push({
    id: companyId,
    name: 'ร้านมินิเดมี่',
    address: 'กรุงเทพมหานคร',
    phone: '02-123-4567',
    created_at: now(),
    updated_at: now(),
  });

  // Owner profile + admin
  const ownerId = 'usr_owner';
  s.profiles.push({
    id: ownerId,
    company_id: companyId,
    email: 'owner@demo.com',
    full_name: 'สมชาย ใจดี',
    role: 'owner',
    phone: '081-111-1111',
    is_active: true,
    created_at: now(),
    updated_at: now(),
  });
  setDemoUser(ownerId, 'demo1234');

  // Shifts
  const shiftMorning: Shift = {
    id: 'sh_morning',
    company_id: companyId,
    name: 'กะเช้า',
    start_time: '08:00',
    end_time: '18:00',
    break_minutes: 60,
    standard_hours: 9,
    grace_minutes: 15,
    ot_enabled: true,
    color: '#A7F3D0',
    is_active: true,
    created_at: now(),
    updated_at: now(),
  };
  const shiftAfternoon: Shift = {
    id: 'sh_afternoon',
    company_id: companyId,
    name: 'กะบ่าย',
    start_time: '11:00',
    end_time: '21:00',
    break_minutes: 60,
    standard_hours: 9,
    grace_minutes: 15,
    ot_enabled: true,
    color: '#BFDBFE',
    is_active: true,
    created_at: now(),
    updated_at: now(),
  };
  const shiftParttime: Shift = {
    id: 'sh_parttime',
    company_id: companyId,
    name: 'พาร์ทไทม์',
    start_time: '10:00',
    end_time: '18:00',
    break_minutes: 30,
    standard_hours: 7,
    grace_minutes: 10,
    ot_enabled: false,
    color: '#FBCFE8',
    is_active: true,
    created_at: now(),
    updated_at: now(),
  };
  s.shifts.push(shiftMorning, shiftAfternoon, shiftParttime);

  // Pay rules
  const rulePassed: PayRule = {
    id: 'pr_passed',
    company_id: companyId,
    name: 'ประจำผ่านโปร',
    employment_type: 'fulltime_passed',
    standard_hours_per_day: 9,
    daily_rate: 400,
    hourly_rate: 37,
    ot_rate: 40,
    holiday_multiplier: 2,
    personal_day_off_paid: true,
    personal_day_off_pay: 400,
    sick_paid: true,
    sick_pay_per_day: 350,
    personal_leave_paid: true,
    personal_leave_pay_per_day: 350,
    vacation_paid: true,
    vacation_pay_per_day: 350,
    is_active: true,
    created_at: now(),
    updated_at: now(),
  };
  const ruleNotPassed: PayRule = {
    id: 'pr_not_passed',
    company_id: companyId,
    name: 'ประจำยังไม่ผ่านโปร',
    employment_type: 'fulltime_not_passed',
    standard_hours_per_day: 8,
    daily_rate: 350,
    hourly_rate: 37,
    ot_rate: 40,
    holiday_multiplier: 2,
    personal_day_off_paid: false,
    personal_day_off_pay: 0,
    sick_paid: true,
    sick_pay_per_day: 350,
    personal_leave_paid: false,
    personal_leave_pay_per_day: 0,
    vacation_paid: false,
    vacation_pay_per_day: 0,
    is_active: true,
    created_at: now(),
    updated_at: now(),
  };
  const ruleParttime: PayRule = {
    id: 'pr_parttime',
    company_id: companyId,
    name: 'พาร์ทไทม์',
    employment_type: 'parttime',
    standard_hours_per_day: 7,
    daily_rate: 0,
    hourly_rate: 40,
    ot_rate: 60,
    holiday_multiplier: 2,
    personal_day_off_paid: false,
    personal_day_off_pay: 0,
    sick_paid: false,
    sick_pay_per_day: 0,
    personal_leave_paid: false,
    personal_leave_pay_per_day: 0,
    vacation_paid: false,
    vacation_pay_per_day: 0,
    is_active: true,
    created_at: now(),
    updated_at: now(),
  };
  s.payRules.push(rulePassed, ruleNotPassed, ruleParttime);

  // Leave types
  const ltSick: LeaveType = {
    id: 'lt_sick', company_id: companyId, name: 'ลาป่วย', category: 'sick',
    paid: true, requires_certificate: true, max_days_per_year: 30, is_active: true,
    created_at: now(), updated_at: now(),
  };
  const ltPersonal: LeaveType = {
    id: 'lt_personal', company_id: companyId, name: 'ลากิจ', category: 'personal',
    paid: true, requires_certificate: false, max_days_per_year: 6, is_active: true,
    created_at: now(), updated_at: now(),
  };
  const ltVacation: LeaveType = {
    id: 'lt_vacation', company_id: companyId, name: 'ลาพักร้อน', category: 'vacation',
    paid: true, requires_certificate: false, max_days_per_year: 6, is_active: true,
    created_at: now(), updated_at: now(),
  };
  const ltUnpaid: LeaveType = {
    id: 'lt_unpaid', company_id: companyId, name: 'ลาไม่รับเงิน', category: 'unpaid',
    paid: false, requires_certificate: false, max_days_per_year: null, is_active: true,
    created_at: now(), updated_at: now(),
  };
  s.leaveTypes.push(ltSick, ltPersonal, ltVacation, ltUnpaid);

  // App settings
  s.appSettings.push({
    id: uid('st'), company_id: companyId, key: 'location_check_mode',
    value: JSON.stringify('warn_only'), updated_at: now(),
  });
  s.appSettings.push({
    id: uid('st'), company_id: companyId, key: 'default_radius_meters',
    value: JSON.stringify(200), updated_at: now(),
  });
  s.appSettings.push({
    id: uid('st'), company_id: companyId, key: 'company',
    value: JSON.stringify(companyId), updated_at: now(),
  });

  // Holidays
  const today = new Date();
  const year = today.getFullYear();
  s.holidays.push(
    { id: uid('hl'), company_id: companyId, name: 'วันแรงงาน', holiday_date: `${year}-05-01`, multiplier: 2, is_recurring: true, created_at: now(), updated_at: now() },
    { id: uid('hl'), company_id: companyId, name: 'วันสงกรานต์', holiday_date: `${year}-04-13`, multiplier: 2, is_recurring: true, created_at: now(), updated_at: now() },
    { id: uid('hl'), company_id: companyId, name: 'วันพ่อ', holiday_date: `${year}-12-05`, multiplier: 2, is_recurring: true, created_at: now(), updated_at: now() },
  );

  // Default location (optional)
  s.locations.push({
    id: uid('loc'), company_id: companyId, name: 'สำนักงานใหญ่',
    latitude: 13.7563, longitude: 100.5018, radius_meters: 200, is_active: true,
    created_at: now(), updated_at: now(),
  });

  // Employees — 10 sample staff
  const employees: Array<{
    name: string;
    nickname: string;
    position: string;
    employment: EmploymentType;
    shift: string;
    payRule: string;
    email: string;
    password: string;
  }> = [
    { name: 'สมชาย ใจดี', nickname: 'ชาย', position: 'เจ้าของร้าน', employment: 'fulltime_passed', shift: 'sh_morning', payRule: 'pr_passed', email: 'owner@demo.com', password: 'demo1234' },
    { name: 'สมหญิง รักดี', nickname: 'หญิง', position: 'ผู้จัดการ', employment: 'fulltime_passed', shift: 'sh_morning', payRule: 'pr_passed', email: 'manager@demo.com', password: 'demo1234' },
    { name: 'ปิยะ มานะ', nickname: 'ปิ', position: 'พนักงานขาย', employment: 'fulltime_passed', shift: 'sh_morning', payRule: 'pr_passed', email: 'piya@demo.com', password: 'demo1234' },
    { name: 'นภา สดใส', nickname: 'น้ำ', position: 'พนักงานขาย', employment: 'fulltime_passed', shift: 'sh_afternoon', payRule: 'pr_passed', email: 'napa@demo.com', password: 'demo1234' },
    { name: 'วิทยา เก่งกล้า', nickname: 'วิท', position: 'แคชเชียร์', employment: 'fulltime_not_passed', shift: 'sh_morning', payRule: 'pr_not_passed', email: 'wittaya@demo.com', password: 'demo1234' },
    { name: 'มินตรา ขยัน', nickname: 'มิ้น', position: 'แคชเชียร์', employment: 'fulltime_not_passed', shift: 'sh_afternoon', payRule: 'pr_not_passed', email: 'mintra@demo.com', password: 'demo1234' },
    { name: 'ธนา เพียรดี', nickname: 'นา', position: 'พนักงานสต๊อก', employment: 'fulltime_not_passed', shift: 'sh_morning', payRule: 'pr_not_passed', email: 'thana@demo.com', password: 'demo1234' },
    { name: 'ปริชาติ ใจเย็น', nickname: 'ปริ', position: 'พนักงานสต๊อก', employment: 'fulltime_passed', shift: 'sh_afternoon', payRule: 'pr_passed', email: 'parichat@demo.com', password: 'demo1234' },
    { name: 'อรุณ สว่าง', nickname: 'อร', position: 'พนักงานทำความสะอาด', employment: 'parttime', shift: 'sh_parttime', payRule: 'pr_parttime', email: 'arun@demo.com', password: 'demo1234' },
    { name: 'สุดารัตน์ พรม', nickname: 'หวาน', position: 'พนักงานเสิร์ฟ', employment: 'parttime', shift: 'sh_parttime', payRule: 'pr_parttime', email: 'suda@demo.com', password: 'demo1234' },
  ];

  for (const e of employees) {
    const profileId = uid('usr');
    s.profiles.push({
      id: profileId,
      company_id: companyId,
      email: e.email,
      full_name: e.name,
      role: e.email === 'owner@demo.com' ? 'owner' : e.email === 'manager@demo.com' ? 'admin' : 'employee',
      is_active: true,
      created_at: now(),
      updated_at: now(),
    });
    setDemoUser(profileId, e.password);

    const empId = uid('emp');
    s.employees.push({
      id: empId,
      company_id: companyId,
      profile_id: profileId,
      employee_code: `EMP${pad2(s.employees.length + 1)}`,
      full_name: e.name,
      nickname: e.nickname,
      phone: `08${Math.floor(10000000 + Math.random() * 89999999)}`,
      email: e.email,
      position: e.position,
      employment_type: e.employment,
      pay_rule_id: e.payRule,
      default_shift_id: e.shift,
      start_date: `${year - 1}-${pad2(Math.floor(Math.random() * 12) + 1)}-01`,
      status: 'active',
      avatar_color: pickAvatarColor(e.name),
      created_at: now(),
      updated_at: now(),
    });

    // Link demo password by email lookup
    const users = getDemoUsers();
    if (users[profileId]) {
      // already saved
    }
  }

  // Augment with the curated Thai templates (full holiday calendar,
  // canonical shifts, three pay rules, leave types, main office
  // location). Idempotent: any template row whose id is already
  // present for the company is skipped.
  // The companyId above ('co_default') is what every prior demo row
  // was created under, so the templates attach to the same scope.
  // Lazy import to keep store.ts free of cross-module cycles.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { seedCompanyDefaultsLocal } = require('@/lib/seeds') as typeof import('@/lib/seeds');
  seedCompanyDefaultsLocal(companyId);
}

// ---------- Session ----------

export function loadSession(): Session | null {
  const raw = window.localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw) as Session; } catch { return null; }
}

export function saveSession(s: Session | null) {
  if (s) {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(s));
  } else {
    window.localStorage.removeItem(SESSION_KEY);
  }
}

// ---------- Helpers ----------

export function setSetting(companyId: string, key: string, value: any) {
  const store = loadStore();
  const existing = store.appSettings.find((r) => r.company_id === companyId && r.key === key);
  if (existing) {
    existing.value = JSON.stringify(value);
    existing.updated_at = now();
  } else {
    store.appSettings.push({
      id: uid('st'),
      company_id: companyId,
      key,
      value: JSON.stringify(value),
      updated_at: now(),
    });
  }
  saveStore(store);
}

export function logAudit(companyId: string, actorId: string, entity: string, entityId: string, action: string, before?: any, after?: any) {
  const store = loadStore();
  store.auditLogs.push({
    id: uid('al'),
    company_id: companyId,
    actor_id: actorId,
    entity,
    entity_id: entityId,
    action,
    before: before ? JSON.stringify(before) : null,
    after: after ? JSON.stringify(after) : null,
    created_at: now(),
  });
  saveStore(store);
}

// (uid/now are re-exported through @/lib/utils)

