// Core domain types for Mini TimePay

export type UserRole = 'owner' | 'admin' | 'employee';

export type EmploymentType = 'fulltime_passed' | 'fulltime_not_passed' | 'parttime';

export type AttendanceStatus =
  | 'normal'
  | 'late'
  | 'early_leave'
  | 'absent'
  | 'leave'
  | 'day_off'
  | 'holiday'
  | 'forgot_checkout'
  | 'incomplete';

export type LocationStatus = 'no_gps' | 'in_area' | 'out_of_area' | 'unchecked';

export type LocationCheckMode = 'off' | 'record_only' | 'warn_only' | 'enforce';

export type RequestStatus = 'pending' | 'approved' | 'rejected';

export type LeaveTypeCategory = 'sick' | 'personal' | 'vacation' | 'unpaid';

export type PayrollStatus = 'draft' | 'preview' | 'locked';

export interface Company {
  id: string;
  name: string;
  tax_id?: string | null;
  address?: string | null;
  phone?: string | null;
  logo_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string; // matches auth.users.id
  company_id: string;
  email: string;
  full_name: string;
  role: UserRole;
  avatar_url?: string | null;
  phone?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Employee {
  id: string;
  company_id: string;
  profile_id?: string | null; // link to profile
  employee_code?: string | null;
  full_name: string;
  nickname?: string | null;
  phone?: string | null;
  email?: string | null;
  position?: string | null;
  branch_id?: string | null;
  employment_type: EmploymentType;
  pay_rule_id?: string | null;
  default_shift_id?: string | null;
  start_date: string;
  end_date?: string | null;
  status: 'active' | 'inactive' | 'resigned';
  avatar_url?: string | null;
  avatar_color?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Branch {
  id: string;
  company_id: string;
  name: string;
  address?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Shift {
  id: string;
  company_id: string;
  name: string;
  start_time: string; // HH:mm
  end_time: string;
  break_minutes: number;
  standard_hours: number;
  grace_minutes: number;
  ot_enabled: boolean;
  color: string; // pastel hex
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface EmployeeSchedule {
  id: string;
  company_id: string;
  employee_id: string;
  shift_id: string;
  schedule_date: string; // YYYY-MM-DD
  created_at: string;
  updated_at: string;
}

export interface AttendanceLog {
  id: string;
  company_id: string;
  employee_id: string;
  work_date: string; // YYYY-MM-DD
  check_in_at?: string | null; // ISO timestamp
  check_out_at?: string | null;
  method: 'mobile' | 'web' | 'admin';
  device_info?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  location_status: LocationStatus;
  note?: string | null;
  created_at: string;
  updated_at: string;
}

export interface DailyTimesheet {
  id: string;
  company_id: string;
  employee_id: string;
  work_date: string;
  shift_id?: string | null;
  scheduled_start?: string | null;
  scheduled_end?: string | null;
  check_in_at?: string | null;
  check_out_at?: string | null;
  work_minutes: number;
  break_minutes: number;
  paid_minutes: number;
  late_minutes: number;
  early_leave_minutes: number;
  missing_minutes: number;
  ot_minutes: number;
  status: AttendanceStatus;
  is_holiday: boolean;
  holiday_multiplier: number;
  note?: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeaveType {
  id: string;
  company_id: string;
  name: string;
  category: LeaveTypeCategory;
  paid: boolean;
  requires_certificate: boolean;
  max_days_per_year?: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LeaveRequest {
  id: string;
  company_id: string;
  employee_id: string;
  leave_type_id: string;
  start_date: string;
  end_date: string;
  total_days: number;
  reason?: string | null;
  attachment_url?: string | null;
  status: RequestStatus;
  reviewer_id?: string | null;
  reviewed_at?: string | null;
  reviewer_note?: string | null;
  created_at: string;
  updated_at: string;
}

export interface TimeAdjustmentRequest {
  id: string;
  company_id: string;
  employee_id: string;
  attendance_log_id?: string | null;
  work_date: string;
  field: 'check_in' | 'check_out' | 'note';
  original_value?: string | null;
  requested_value: string;
  reason?: string | null;
  status: RequestStatus;
  reviewer_id?: string | null;
  reviewed_at?: string | null;
  reviewer_note?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PayRule {
  id: string;
  company_id: string;
  name: string;
  employment_type: EmploymentType;
  standard_hours_per_day: number;
  daily_rate: number; // full wage when complete
  hourly_rate: number; // wage when not full
  ot_rate: number; // per hour
  holiday_multiplier: number;
  personal_day_off_paid: boolean;
  personal_day_off_pay: number;
  sick_paid: boolean;
  sick_pay_per_day: number;
  personal_leave_paid: boolean;
  personal_leave_pay_per_day: number;
  vacation_paid: boolean;
  vacation_pay_per_day: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Holiday {
  id: string;
  company_id: string;
  name: string;
  holiday_date: string; // YYYY-MM-DD
  multiplier: number; // e.g. 2 for double pay
  is_recurring: boolean;
  created_at: string;
  updated_at: string;
}

export interface Location {
  id: string;
  company_id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AppSetting {
  id: string;
  company_id: string;
  key: string;
  value: string; // JSON-encoded value
  updated_at: string;
}

export interface PayrollPeriod {
  id: string;
  company_id: string;
  period_year: number;
  period_month: number; // 1-12
  start_date: string;
  end_date: string;
  status: PayrollStatus;
  locked_at?: string | null;
  locked_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PayrollItem {
  id: string;
  company_id: string;
  payroll_period_id: string;
  employee_id: string;
  work_days: number;
  day_off_days: number;
  leave_days: number;
  absent_days: number;
  late_minutes: number;
  regular_hours: number;
  ot_hours: number;
  base_pay: number;
  ot_pay: number;
  holiday_pay: number;
  leave_pay: number;
  shortage_deduction: number;
  other_earnings: number;
  other_deductions: number;
  net_pay: number;
  details: PayrollBreakdown;
  created_at: string;
  updated_at: string;
}

export interface PayrollBreakdown {
  per_day: Array<{
    date: string;
    status: string;
    regular_pay: number;
    ot_pay: number;
    holiday_pay: number;
    leave_pay: number;
    shortage_deduction: number;
    note?: string;
  }>;
}

export interface PayrollAdjustment {
  id: string;
  company_id: string;
  payroll_item_id: string;
  type: 'earning' | 'deduction';
  label: string;
  amount: number;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  company_id: string;
  actor_id: string;
  entity: string;
  entity_id: string;
  action: string;
  before?: string | null;
  after?: string | null;
  created_at: string;
}
