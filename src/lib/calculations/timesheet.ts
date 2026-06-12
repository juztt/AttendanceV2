// Timesheet calculation engine
// Computes DailyTimesheet from AttendanceLog + Shift + Holidays + Leave

import type {
  AttendanceLog, DailyTimesheet, Shift, Holiday, LeaveRequest, Employee, PayRule, AttendanceStatus,
} from '@/types';
import { combineDateTime, diffMinutes, timeToMinutes, pad2, uid, now } from '@/lib/utils';

export interface TimesheetInputs {
  employee: Employee;
  workDate: string; // YYYY-MM-DD
  shift?: Shift | null;
  attendanceLog?: AttendanceLog | null;
  holiday?: Holiday | null;
  approvedLeave?: LeaveRequest | null;
  payRule?: PayRule | null;
}

export interface TimesheetResult {
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
  scheduled_start: string | null;
  scheduled_end: string | null;
}

const DAY_OFF_WEEKDAYS = [0, 6]; // Sun, Sat — used if no schedule present

export function calculateTimesheet(input: TimesheetInputs): TimesheetResult {
  const { workDate, shift, attendanceLog, holiday, approvedLeave, payRule } = input;
  const standardHoursPerDay = payRule?.standard_hours_per_day ?? shift?.standard_hours ?? 8;
  const standardMinutes = standardHoursPerDay * 60;
  const grace = shift?.grace_minutes ?? 15;
  const breakMin = shift?.break_minutes ?? 60;
  const otEnabled = shift?.ot_enabled ?? true;

  const isHoliday = Boolean(holiday);
  const holidayMultiplier = holiday?.multiplier ?? 1;

  // Determine if this is a day off for this employee (no shift assigned)
  const dateObj = new Date(workDate);
  const dow = dateObj.getDay();
  const isWeekendOff = DAY_OFF_WEEKDAYS.includes(dow);

  // 1. Leave overrides everything (approved leave on this date)
  if (approvedLeave) {
    return {
      work_minutes: 0, break_minutes: 0, paid_minutes: 0,
      late_minutes: 0, early_leave_minutes: 0, missing_minutes: 0, ot_minutes: 0,
      status: 'leave', is_holiday: isHoliday, holiday_multiplier: holidayMultiplier,
      scheduled_start: null, scheduled_end: null,
    };
  }

  // 2. Holiday — no attendance required, but if worked it counts as holiday
  if (isHoliday && !attendanceLog?.check_in_at) {
    return {
      work_minutes: 0, break_minutes: 0, paid_minutes: 0,
      late_minutes: 0, early_leave_minutes: 0, missing_minutes: 0, ot_minutes: 0,
      status: 'holiday', is_holiday: true, holiday_multiplier: holidayMultiplier,
      scheduled_start: null, scheduled_end: null,
    };
  }

  // 3. Day off (no shift) without attendance
  if (!shift && !attendanceLog?.check_in_at) {
    const status: AttendanceStatus = isWeekendOff ? 'day_off' : 'absent';
    return {
      work_minutes: 0, break_minutes: 0, paid_minutes: 0,
      late_minutes: 0, early_leave_minutes: 0, missing_minutes: 0, ot_minutes: 0,
      status, is_holiday: isHoliday, holiday_multiplier: holidayMultiplier,
      scheduled_start: null, scheduled_end: null,
    };
  }

  const scheduledStart = shift ? combineDateTime(workDate, shift.start_time) : null;
  const scheduledEnd = shift ? combineDateTime(workDate, shift.end_time) : null;

  // 4. Absent — no check-in
  if (!attendanceLog?.check_in_at) {
    return {
      work_minutes: 0, break_minutes: 0, paid_minutes: 0,
      late_minutes: 0, early_leave_minutes: 0,
      missing_minutes: standardMinutes, ot_minutes: 0,
      status: 'absent', is_holiday: isHoliday, holiday_multiplier: holidayMultiplier,
      scheduled_start: scheduledStart?.toISOString() ?? null,
      scheduled_end: scheduledEnd?.toISOString() ?? null,
    };
  }

  // 5. Has check-in
  const checkIn = new Date(attendanceLog.check_in_at);
  const checkOut = attendanceLog.check_out_at ? new Date(attendanceLog.check_out_at) : null;

  // 5a. Forgot check-out
  if (!checkOut) {
    return {
      work_minutes: 0, break_minutes: 0, paid_minutes: 0,
      late_minutes: scheduledStart ? Math.max(0, diffMinutes(scheduledStart, checkIn) - grace) : 0,
      early_leave_minutes: 0, missing_minutes: 0, ot_minutes: 0,
      status: 'forgot_checkout', is_holiday: isHoliday, holiday_multiplier: holidayMultiplier,
      scheduled_start: scheduledStart?.toISOString() ?? null,
      scheduled_end: scheduledEnd?.toISOString() ?? null,
    };
  }

  // 5b. Compute raw work minutes
  const rawMinutes = Math.max(0, diffMinutes(checkIn, checkOut));
  const workAfterBreak = Math.max(0, rawMinutes - breakMin);
  let lateMinutes = 0;
  let earlyLeaveMinutes = 0;
  let otMinutes = 0;

  if (scheduledStart) {
    lateMinutes = Math.max(0, diffMinutes(scheduledStart, checkIn) - grace);
  }
  if (scheduledEnd) {
    earlyLeaveMinutes = Math.max(0, diffMinutes(checkOut, scheduledEnd) * -1);
  }

  // OT: anything past scheduled end (and after break) and beyond standard hours
  if (otEnabled && scheduledEnd) {
    const overtime = diffMinutes(checkOut, scheduledEnd);
    if (overtime > 0) otMinutes = overtime;
  }

  // Determine status
  let status: AttendanceStatus = 'normal';
  if (lateMinutes > 0 && workAfterBreak < standardMinutes) status = 'late';
  else if (lateMinutes > 0 && workAfterBreak >= standardMinutes) status = 'normal'; // made up time
  if (earlyLeaveMinutes > 0 && workAfterBreak < standardMinutes && lateMinutes === 0) status = 'early_leave';
  if (lateMinutes > 0 && earlyLeaveMinutes > 0 && workAfterBreak < standardMinutes) status = 'incomplete';
  if (otMinutes > 0 && workAfterBreak < standardMinutes) {
    // keep earlier diagnosis — no status change needed
  }

  // Missing minutes — only meaningful if employee didn't meet standard
  let missingMinutes = 0;
  if (workAfterBreak < standardMinutes) {
    missingMinutes = standardMinutes - workAfterBreak;
  }

  return {
    work_minutes: workAfterBreak,
    break_minutes: breakMin,
    paid_minutes: workAfterBreak,
    late_minutes: lateMinutes,
    early_leave_minutes: earlyLeaveMinutes,
    missing_minutes: missingMinutes,
    ot_minutes: otMinutes,
    status,
    is_holiday: isHoliday,
    holiday_multiplier: holidayMultiplier,
    scheduled_start: scheduledStart?.toISOString() ?? null,
    scheduled_end: scheduledEnd?.toISOString() ?? null,
  };
}

export function buildTimesheetRecord(input: TimesheetInputs): Omit<DailyTimesheet, 'created_at' | 'updated_at'> & { created_at: string; updated_at: string } {
  const r = calculateTimesheet(input);
  return {
    id: uid('ts'),
    company_id: input.employee.company_id,
    employee_id: input.employee.id,
    work_date: input.workDate,
    shift_id: input.shift?.id ?? null,
    scheduled_start: r.scheduled_start,
    scheduled_end: r.scheduled_end,
    check_in_at: input.attendanceLog?.check_in_at ?? null,
    check_out_at: input.attendanceLog?.check_out_at ?? null,
    work_minutes: r.work_minutes,
    break_minutes: r.break_minutes,
    paid_minutes: r.paid_minutes,
    late_minutes: r.late_minutes,
    early_leave_minutes: r.early_leave_minutes,
    missing_minutes: r.missing_minutes,
    ot_minutes: r.ot_minutes,
    status: r.status,
    is_holiday: r.is_holiday,
    holiday_multiplier: r.holiday_multiplier,
    note: input.attendanceLog?.note ?? null,
    created_at: now(),
    updated_at: now(),
  };
}

export function timeStringFromISO(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

export { timeToMinutes };
