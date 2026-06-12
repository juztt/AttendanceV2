import { loadStore, saveStore, logAudit } from '@/lib/store';
import { uid, now } from '@/lib/utils';
import type { PayrollPeriod, PayrollItem } from '@/types';
import { calculatePayrollPeriod, type PayrollPeriodResult } from '@/lib/calculations/payroll';

export function getPayrollPeriods(companyId: string): PayrollPeriod[] {
  return loadStore().payrollPeriods
    .filter((p) => p.company_id === companyId)
    .sort((a, b) => b.period_year - a.period_year || b.period_month - a.period_month);
}

export function getPayrollPeriod(periodId: string): PayrollPeriod | null {
  return loadStore().payrollPeriods.find((p) => p.id === periodId) ?? null;
}

export function getOrCreatePeriod(companyId: string, year: number, month: number, actorId: string): PayrollPeriod {
  const store = loadStore();
  const existing = store.payrollPeriods.find((p) => p.company_id === companyId && p.period_year === year && p.period_month === month);
  if (existing) return existing;
  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const last = new Date(year, month, 0).getDate();
  const end = `${year}-${String(month).padStart(2, '0')}-${String(last).padStart(2, '0')}`;
  const p: PayrollPeriod = {
    id: uid('pp'),
    company_id: companyId,
    period_year: year,
    period_month: month,
    start_date: start,
    end_date: end,
    status: 'draft',
    locked_at: null,
    locked_by: null,
    created_at: now(),
    updated_at: now(),
  };
  store.payrollPeriods.push(p);
  logAudit(companyId, actorId, 'payroll_periods', p.id, 'create', null, p);
  saveStore(store);
  return p;
}

export interface PreviewArgs {
  periodId: string;
  employeeId?: string; // optional — if not provided, calculate for all active employees
  actorId: string;
}

export function previewPayroll(args: PreviewArgs): { period: PayrollPeriod; items: PayrollItem[]; breakdowns: Record<string, PayrollPeriodResult> } {
  const store = loadStore();
  const period = store.payrollPeriods.find((p) => p.id === args.periodId);
  if (!period) throw new Error('ไม่พบรอบเงินเดือน');
  if (period.status === 'locked') throw new Error('รอบเงินเดือนถูกล็อกแล้ว ไม่สามารถคำนวณใหม่ได้');

  const employees = store.employees
    .filter((e) => e.company_id === period.company_id && e.status === 'active')
    .filter((e) => !args.employeeId || e.id === args.employeeId);

  const payRuleMap = new Map(store.payRules.map((p) => [p.id, p]));
  const shiftMap = new Map(store.shifts.map((s) => [s.id, s]));
  const tsList = store.timesheets.filter((t) => t.company_id === period.company_id && t.work_date >= period.start_date && t.work_date <= period.end_date);
  const alList = store.attendanceLogs.filter((l) => l.company_id === period.company_id && l.work_date >= period.start_date && l.work_date <= period.end_date);
  const holidayList = store.holidays.filter((h) => h.company_id === period.company_id);
  const lrList = store.leaveRequests.filter((l) => l.company_id === period.company_id && l.status === 'approved');

  const items: PayrollItem[] = [];
  const breakdowns: Record<string, PayrollPeriodResult> = {};

  for (const emp of employees) {
    const rule = emp.pay_rule_id ? payRuleMap.get(emp.pay_rule_id) : null;
    if (!rule) {
      // Skip employees without a pay rule but record an empty entry
      const item: PayrollItem = {
        id: uid('pi'),
        company_id: period.company_id,
        payroll_period_id: period.id,
        employee_id: emp.id,
        work_days: 0, day_off_days: 0, leave_days: 0, absent_days: 0,
        late_minutes: 0, regular_hours: 0, ot_hours: 0,
        base_pay: 0, ot_pay: 0, holiday_pay: 0, leave_pay: 0,
        shortage_deduction: 0, other_earnings: 0, other_deductions: 0, net_pay: 0,
        details: { per_day: [] },
        created_at: now(), updated_at: now(),
      };
      items.push(item);
      continue;
    }
    const result = calculatePayrollPeriod({
      employee: emp,
      payRule: rule,
      startDate: period.start_date,
      endDate: period.end_date,
      timesheets: tsList.filter((t) => t.employee_id === emp.id),
      attendanceLogs: alList.filter((a) => a.employee_id === emp.id),
      holidays: holidayList,
      leaveRequests: lrList.filter((l) => l.employee_id === emp.id),
      shifts: shiftMap,
    });
    breakdowns[emp.id] = result;

    const other_earnings = store.payrollAdjustments
      .filter((a) => a.company_id === period.company_id)
      .filter((a) => {
        const pi = store.payrollItems.find((p) => p.id === a.payroll_item_id);
        return pi?.employee_id === emp.id && pi.payroll_period_id === period.id && a.type === 'earning';
      })
      .reduce((s, a) => s + a.amount, 0);
    const other_deductions = store.payrollAdjustments
      .filter((a) => a.company_id === period.company_id)
      .filter((a) => {
        const pi = store.payrollItems.find((p) => p.id === a.payroll_item_id);
        return pi?.employee_id === emp.id && pi.payroll_period_id === period.id && a.type === 'deduction';
      })
      .reduce((s, a) => s + a.amount, 0);

    const item: PayrollItem = {
      id: uid('pi'),
      company_id: period.company_id,
      payroll_period_id: period.id,
      employee_id: emp.id,
      work_days: result.work_days,
      day_off_days: result.day_off_days,
      leave_days: result.leave_days,
      absent_days: result.absent_days,
      late_minutes: result.late_minutes,
      regular_hours: result.regular_hours,
      ot_hours: result.ot_hours,
      base_pay: result.base_pay,
      ot_pay: result.ot_pay,
      holiday_pay: result.holiday_pay,
      leave_pay: result.leave_pay,
      shortage_deduction: result.shortage_deduction,
      other_earnings,
      other_deductions,
      net_pay: round2(result.net_base + other_earnings - other_deductions),
      details: { per_day: result.per_day },
      created_at: now(),
      updated_at: now(),
    };
    items.push(item);
  }

  // Save items (replace any existing for this period)
  store.payrollItems = store.payrollItems.filter((p) => p.payroll_period_id !== period.id);
  store.payrollItems.push(...items);

  // Update period status to preview
  period.status = 'preview';
  period.updated_at = now();
  logAudit(period.company_id, args.actorId, 'payroll_periods', period.id, 'preview', null, { item_count: items.length });
  saveStore(store);
  return { period, items, breakdowns };
}

export function lockPeriod(periodId: string, actorId: string) {
  const store = loadStore();
  const p = store.payrollPeriods.find((x) => x.id === periodId);
  if (!p) throw new Error('ไม่พบรอบเงินเดือน');
  if (p.status === 'locked') return p;
  p.status = 'locked';
  p.locked_at = now();
  p.locked_by = actorId;
  p.updated_at = now();
  logAudit(p.company_id, actorId, 'payroll_periods', p.id, 'lock', null, p);
  saveStore(store);
  return p;
}

export function unlockPeriod(periodId: string, actorId: string) {
  const store = loadStore();
  const p = store.payrollPeriods.find((x) => x.id === periodId);
  if (!p) throw new Error('ไม่พบรอบเงินเดือน');
  p.status = 'preview';
  p.locked_at = null;
  p.locked_by = null;
  p.updated_at = now();
  logAudit(p.company_id, actorId, 'payroll_periods', p.id, 'unlock', null, p);
  saveStore(store);
  return p;
}

export function getPayrollItems(periodId: string): PayrollItem[] {
  return loadStore().payrollItems.filter((i) => i.payroll_period_id === periodId);
}

export function getEmployeePayslips(employeeId: string): PayrollItem[] {
  return loadStore().payrollItems
    .filter((i) => i.employee_id === employeeId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function addAdjustment(input: { itemId: string; type: 'earning' | 'deduction'; label: string; amount: number; actorId: string }) {
  const store = loadStore();
  const item = store.payrollItems.find((i) => i.id === input.itemId);
  if (!item) throw new Error('ไม่พบรายการเงินเดือน');
  if (item.payroll_period_id) {
    const period = store.payrollPeriods.find((p) => p.id === item.payroll_period_id);
    if (period?.status === 'locked') throw new Error('รอบถูกล็อกแล้ว ไม่สามารถเพิ่มรายการได้');
  }
  const a = {
    id: uid('pa'),
    company_id: item.company_id,
    payroll_item_id: item.id,
    type: input.type,
    label: input.label,
    amount: input.amount,
    created_at: now(),
    updated_at: now(),
  };
  store.payrollAdjustments.push(a);
  if (input.type === 'earning') item.other_earnings = round2(item.other_earnings + input.amount);
  else item.other_deductions = round2(item.other_deductions + input.amount);
  item.net_pay = round2(item.base_pay + item.ot_pay + item.holiday_pay + item.leave_pay - item.shortage_deduction + item.other_earnings - item.other_deductions);
  item.updated_at = now();
  logAudit(item.company_id, input.actorId, 'payrollAdjustments', a.id, 'add', null, a);
  saveStore(store);
  return a;
}

export function removeAdjustment(adjustmentId: string, actorId: string) {
  const store = loadStore();
  const a = store.payrollAdjustments.find((x) => x.id === adjustmentId);
  if (!a) return;
  store.payrollAdjustments = store.payrollAdjustments.filter((x) => x.id !== adjustmentId);
  const item = store.payrollItems.find((i) => i.id === a.payroll_item_id);
  if (item) {
    if (a.type === 'earning') item.other_earnings = round2(item.other_earnings - a.amount);
    else item.other_deductions = round2(item.other_deductions - a.amount);
    item.net_pay = round2(item.base_pay + item.ot_pay + item.holiday_pay + item.leave_pay - item.shortage_deduction + item.other_earnings - item.other_deductions);
    item.updated_at = now();
  }
  logAudit(a.company_id, actorId, 'payrollAdjustments', a.id, 'remove', a, null);
  saveStore(store);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

