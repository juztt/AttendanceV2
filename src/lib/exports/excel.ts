import * as XLSX from 'xlsx';
import type { AttendanceLog, Employee, DailyTimesheet, PayrollItem, PayrollPeriod, LeaveRequest } from '@/types';
import { thaiDateShort, formatMinutesAsHM } from '@/lib/utils';

// Encode Thai for Excel (CP-1252 workaround) — actually XLSX supports UTF-8 natively via BOM
// so we just write as UTF-8 and Excel will read it.

export interface AttendanceExportInput {
  logs: AttendanceLog[];
  employees: Employee[];
  timesheets?: DailyTimesheet[];
  startDate: string;
  endDate: string;
  companyName: string;
}

export function exportAttendanceExcel(input: AttendanceExportInput) {
  const rows: any[][] = [];
  rows.push([`รายงานเวลาเข้า-ออกงาน`]);
  rows.push([`บริษัท: ${input.companyName}`]);
  rows.push([`ช่วงวันที่: ${thaiDateShort(input.startDate)} - ${thaiDateShort(input.endDate)}`]);
  rows.push([]);
  rows.push(['วันที่', 'รหัส', 'ชื่อ-นามสกุล', 'ตำแหน่ง', 'เวลาเข้า', 'เวลาออก', 'ชั่วโมงทำงาน', 'OT (นาที)', 'มาสาย (นาที)', 'สถานะ', 'GPS']);
  const empMap = new Map(input.employees.map((e) => [e.id, e]));
  for (const log of input.logs) {
    const e = empMap.get(log.employee_id);
    if (!e) continue;
    const ts = input.timesheets?.find((t) => t.employee_id === log.employee_id && t.work_date === log.work_date);
    const inTime = log.check_in_at ? new Date(log.check_in_at) : null;
    const outTime = log.check_out_at ? new Date(log.check_out_at) : null;
    rows.push([
      thaiDateShort(log.work_date),
      e.employee_code ?? '',
      e.full_name,
      e.position ?? '',
      inTime ? inTime.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : '',
      outTime ? outTime.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : '',
      ts ? formatMinutesAsHM(ts.paid_minutes) : '',
      ts?.ot_minutes ?? 0,
      ts?.late_minutes ?? 0,
      ts?.status ?? '',
      log.location_status ?? '',
    ]);
  }
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{ wch: 12 }, { wch: 8 }, { wch: 22 }, { wch: 16 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 14 }, { wch: 10 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Attendance');
  const wbout = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  downloadFile(wbout, `attendance_${input.startDate}_${input.endDate}.xlsx`);
}

export interface PayrollExportInput {
  items: PayrollItem[];
  employees: Employee[];
  period: PayrollPeriod;
  companyName: string;
}

export function exportPayrollExcel(input: PayrollExportInput) {
  const rows: any[][] = [];
  rows.push([`รายงานเงินเดือน`]);
  rows.push([`บริษัท: ${input.companyName}`]);
  rows.push([`รอบเงินเดือน: ${input.period.period_year}-${String(input.period.period_month).padStart(2, '0')}`]);
  rows.push([]);
  rows.push([
    'รหัส', 'ชื่อ-นามสกุล', 'ตำแหน่ง', 'วันทำงาน', 'วันหยุด', 'วันลา', 'ขาดงาน',
    'ชั่วโมงปกติ', 'ชั่วโมง OT',
    'ค่าแรงพื้นฐาน', 'ค่า OT', 'ค่าวันหยุด', 'ค่าลา', 'หักขาด',
    'เพิ่มพิเศษ', 'หักพิเศษ', 'สุทธิ',
  ]);
  const empMap = new Map(input.employees.map((e) => [e.id, e]));
  for (const it of input.items) {
    const e = empMap.get(it.employee_id);
    if (!e) continue;
    rows.push([
      e.employee_code ?? '',
      e.full_name,
      e.position ?? '',
      it.work_days, it.day_off_days, it.leave_days, it.absent_days,
      it.regular_hours.toFixed(2), it.ot_hours.toFixed(2),
      it.base_pay, it.ot_pay, it.holiday_pay, it.leave_pay, it.shortage_deduction,
      it.other_earnings, it.other_deductions, it.net_pay,
    ]);
  }
  // Totals row
  const totals = input.items.reduce((acc, it) => ({
    work_days: acc.work_days + it.work_days,
    base: acc.base + it.base_pay,
    ot: acc.ot + it.ot_pay,
    hol: acc.hol + it.holiday_pay,
    leave: acc.leave + it.leave_pay,
    shortage: acc.shortage + it.shortage_deduction,
    other_e: acc.other_e + it.other_earnings,
    other_d: acc.other_d + it.other_deductions,
    net: acc.net + it.net_pay,
  }), { work_days: 0, base: 0, ot: 0, hol: 0, leave: 0, shortage: 0, other_e: 0, other_d: 0, net: 0 });
  rows.push([]);
  rows.push(['', 'รวมทั้งหมด', '', totals.work_days, '', '', '', '', '', totals.base, totals.ot, totals.hol, totals.leave, totals.shortage, totals.other_e, totals.other_d, totals.net]);

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [
    { wch: 8 }, { wch: 22 }, { wch: 16 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 },
    { wch: 10 }, { wch: 10 },
    { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
    { wch: 10 }, { wch: 10 }, { wch: 12 },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Payroll');
  const wbout = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  downloadFile(wbout, `payroll_${input.period.period_year}-${String(input.period.period_month).padStart(2, '0')}.xlsx`);
}

export interface LeaveExportInput {
  requests: LeaveRequest[];
  employees: Employee[];
  startDate: string;
  endDate: string;
  companyName: string;
}

export function exportLeaveExcel(input: LeaveExportInput) {
  const rows: any[][] = [];
  rows.push(['รายงานการลา']);
  rows.push([`บริษัท: ${input.companyName}`]);
  rows.push([`ช่วงวันที่: ${thaiDateShort(input.startDate)} - ${thaiDateShort(input.endDate)}`]);
  rows.push([]);
  rows.push(['วันที่เริ่ม', 'วันที่สิ้นสุด', 'จำนวนวัน', 'รหัส', 'ชื่อ', 'สถานะ', 'เหตุผล']);
  const empMap = new Map(input.employees.map((e) => [e.id, e]));
  for (const r of input.requests) {
    const e = empMap.get(r.employee_id);
    rows.push([
      thaiDateShort(r.start_date),
      thaiDateShort(r.end_date),
      r.total_days,
      e?.employee_code ?? '',
      e?.full_name ?? '',
      r.status,
      r.reason ?? '',
    ]);
  }
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{ wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 8 }, { wch: 22 }, { wch: 12 }, { wch: 30 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Leave');
  const wbout = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  downloadFile(wbout, `leave_${input.startDate}_${input.endDate}.xlsx`);
}

function downloadFile(data: ArrayBuffer, filename: string) {
  const blob = new Blob([data], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
