// Payroll calculation engine
// Supports 3 pay rule types: fulltime_passed, fulltime_not_passed, parttime

import type {
  Employee, PayRule, DailyTimesheet, LeaveRequest, AttendanceLog, Holiday,
} from '@/types';
import { calculateTimesheet } from './timesheet';

export interface PayrollDayInput {
  timesheet: DailyTimesheet;
  attendanceLog?: AttendanceLog | null;
  holiday?: Holiday | null;
  approvedLeave?: LeaveRequest | null;
  payRule: PayRule;
  shift?: { start_time: string; end_time: string; break_minutes: number } | null;
}

export interface PayrollPeriodResult {
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
  net_base: number;
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

const DAY_MS = 24 * 60 * 60 * 1000;

function dateRange(startDate: string, endDate: string): string[] {
  const out: string[] = [];
  const s = new Date(startDate);
  const e = new Date(endDate);
  for (let d = new Date(s); d <= e; d = new Date(d.getTime() + DAY_MS)) {
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
  }
  return out;
}

export function calculatePayrollPeriod(args: {
  employee: Employee;
  payRule: PayRule;
  startDate: string;
  endDate: string;
  timesheets: DailyTimesheet[];
  attendanceLogs: AttendanceLog[];
  holidays: Holiday[];
  leaveRequests: LeaveRequest[];
  shifts: Map<string, { start_time: string; end_time: string; break_minutes: number }>;
}): PayrollPeriodResult {
  const { employee, payRule, startDate, endDate } = args;
  const dates = dateRange(startDate, endDate);
  const isParttime = payRule.employment_type === 'parttime';

  const result: PayrollPeriodResult = {
    work_days: 0,
    day_off_days: 0,
    leave_days: 0,
    absent_days: 0,
    late_minutes: 0,
    regular_hours: 0,
    ot_hours: 0,
    base_pay: 0,
    ot_pay: 0,
    holiday_pay: 0,
    leave_pay: 0,
    shortage_deduction: 0,
    net_base: 0,
    per_day: [],
  };

  for (const date of dates) {
    const ts = args.timesheets.find((t) => t.employee_id === employee.id && t.work_date === date);
    const log = args.attendanceLogs.find((l) => l.employee_id === employee.id && l.work_date === date);
    const holiday = args.holidays.find((h) => h.holiday_date === date);
    const approvedLeave = args.leaveRequests.find(
      (lr) => lr.employee_id === employee.id && lr.status === 'approved' && lr.start_date <= date && lr.end_date >= date,
    );
    const shift = ts?.shift_id ? args.shifts.get(ts.shift_id) ?? null : null;

    const calc = calculateTimesheet({
      employee,
      workDate: date,
      shift: shift ? { ...shift, company_id: employee.company_id, name: '', standard_hours: payRule.standard_hours_per_day, grace_minutes: 0, ot_enabled: payRule.employment_type !== 'parttime', color: '', id: '', is_active: true, created_at: '', updated_at: '' } as any : null,
      attendanceLog: log ?? null,
      holiday: holiday ?? null,
      approvedLeave: approvedLeave ?? null,
      payRule,
    });

    let regular_pay = 0;
    let ot_pay = 0;
    let holiday_pay = 0;
    let leave_pay = 0;
    let shortage_deduction = 0;
    let note: string | undefined;

    if (calc.status === 'leave' && approvedLeave) {
      result.leave_days += 1;
      // Determine pay based on leave category
      if (approvedLeave.leave_type_id === 'lt_sick' && payRule.sick_paid) {
        leave_pay = payRule.sick_pay_per_day;
      } else if (approvedLeave.leave_type_id === 'lt_personal' && payRule.personal_leave_paid) {
        leave_pay = payRule.personal_leave_pay_per_day;
      } else if (approvedLeave.leave_type_id === 'lt_vacation' && payRule.vacation_paid) {
        leave_pay = payRule.vacation_pay_per_day;
      } else {
        leave_pay = 0; // unpaid
      }
      result.leave_pay += leave_pay;
    } else if (calc.status === 'holiday') {
      result.day_off_days += 1;
      // Personal day-off pay if applicable (full-time rules)
      if (payRule.personal_day_off_paid && !isParttime) {
        result.base_pay += payRule.personal_day_off_pay;
        regular_pay = payRule.personal_day_off_pay;
        note = 'วันหยุดนักขัตฤกษ์ (จ่าย)';
      } else {
        note = 'วันหยุดนักขัตฤกษ์';
      }
    } else if (calc.status === 'day_off') {
      result.day_off_days += 1;
      if (payRule.personal_day_off_paid && !isParttime) {
        result.base_pay += payRule.personal_day_off_pay;
        regular_pay = payRule.personal_day_off_pay;
        note = 'วันหยุด (จ่าย)';
      } else {
        note = 'วันหยุด';
      }
    } else if (calc.status === 'absent') {
      result.absent_days += 1;
      shortage_deduction = payRule.daily_rate;
      result.shortage_deduction += shortage_deduction;
      note = 'ขาดงาน';
    } else if (calc.status === 'forgot_checkout') {
      // Pay as normal if has check-in but no check-out
      result.work_days += 1;
      const workedHours = (calc.work_minutes || 0) / 60;
      if (isParttime) {
        regular_pay = workedHours * payRule.hourly_rate;
      } else {
        if (workedHours >= payRule.standard_hours_per_day) {
          regular_pay = payRule.daily_rate;
        } else {
          regular_pay = workedHours * payRule.hourly_rate;
        }
      }
      result.base_pay += regular_pay;
      note = 'ลืมเช็คเอาท์';
    } else {
      // Worked day (normal/late/early_leave/holiday-worked/incomplete)
      result.work_days += 1;
      result.late_minutes += calc.late_minutes;
      const workedHours = (calc.paid_minutes || 0) / 60;
      const otHours = (calc.ot_minutes || 0) / 60;
      result.regular_hours += workedHours;
      result.ot_hours += otHours;

      if (isParttime) {
        regular_pay = workedHours * payRule.hourly_rate;
        if (payRule.ot_rate > 0) {
          ot_pay = otHours * payRule.ot_rate;
        }
      } else {
        // Full-time: daily rate when meeting standard, hourly otherwise
        if (workedHours >= payRule.standard_hours_per_day) {
          regular_pay = payRule.daily_rate;
        } else {
          regular_pay = workedHours * payRule.hourly_rate;
        }
        if (workedHours < payRule.standard_hours_per_day) {
          shortage_deduction = (payRule.standard_hours_per_day - workedHours) * (payRule.daily_rate / payRule.standard_hours_per_day) * 0; // already accounted in hourly
        }
        if (payRule.ot_rate > 0) {
          ot_pay = otHours * payRule.ot_rate;
        }
      }

      // Holiday work — apply multiplier on top
      if (calc.is_holiday) {
        const mul = payRule.holiday_multiplier;
        holiday_pay = regular_pay * (mul - 1); // extra pay beyond base
        // Add base pay (already counted), but holiday pay = extra
        result.holiday_pay += holiday_pay;
        note = `ทำงานวันหยุด x${mul}`;
      }

      result.base_pay += regular_pay;
      result.ot_pay += ot_pay;
    }

    result.per_day.push({
      date,
      status: calc.status,
      regular_pay: round2(regular_pay),
      ot_pay: round2(ot_pay),
      holiday_pay: round2(holiday_pay),
      leave_pay: round2(leave_pay),
      shortage_deduction: round2(shortage_deduction),
      note,
    });
  }

  result.net_base = round2(result.base_pay + result.ot_pay + result.holiday_pay + result.leave_pay - result.shortage_deduction);
  result.base_pay = round2(result.base_pay);
  result.ot_pay = round2(result.ot_pay);
  result.holiday_pay = round2(result.holiday_pay);
  result.leave_pay = round2(result.leave_pay);
  result.shortage_deduction = round2(result.shortage_deduction);
  return result;
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
