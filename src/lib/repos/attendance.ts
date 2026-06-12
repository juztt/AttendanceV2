// Data access layer for AttendanceLog
import { loadStore, saveStore, logAudit } from '@/lib/store';
import { uid, now, todayISO, haversineDistance, getSetting } from '@/lib/utils';
import type { AttendanceLog, LocationStatus } from '@/types';

export interface CheckInInput {
  employeeId: string;
  companyId: string;
  actorId: string;
  latitude?: number | null;
  longitude?: number | null;
  note?: string;
  deviceInfo?: string;
}

export interface CheckInResult {
  ok: boolean;
  message: string;
  log?: AttendanceLog;
  locationStatus?: LocationStatus;
}

export function getTodayLog(employeeId: string, workDate: string = todayISO()): AttendanceLog | null {
  const store = loadStore();
  return store.attendanceLogs.find((l) => l.employee_id === employeeId && l.work_date === workDate) ?? null;
}

export function getLogsByEmployee(employeeId: string, fromDate?: string, toDate?: string): AttendanceLog[] {
  const store = loadStore();
  return store.attendanceLogs
    .filter((l) => l.employee_id === employeeId)
    .filter((l) => !fromDate || l.work_date >= fromDate)
    .filter((l) => !toDate || l.work_date <= toDate)
    .sort((a, b) => b.work_date.localeCompare(a.work_date));
}

export function getLogsByCompany(companyId: string, fromDate?: string, toDate?: string): AttendanceLog[] {
  const store = loadStore();
  return store.attendanceLogs
    .filter((l) => l.company_id === companyId)
    .filter((l) => !fromDate || l.work_date >= fromDate)
    .filter((l) => !toDate || l.work_date <= toDate)
    .sort((a, b) => b.work_date.localeCompare(a.work_date));
}

function checkLocation(
  companyId: string,
  lat: number | null | undefined,
  lng: number | null | undefined,
): { status: LocationStatus; reason?: string } {
  if (lat == null || lng == null) {
    const mode = getSetting(companyId, 'location_check_mode', 'warn_only');
    if (mode === 'off') return { status: 'no_gps' };
    return { status: 'no_gps', reason: 'ไม่อนุญาตเข้าถึงตำแหน่ง' };
  }
  const store = loadStore();
  const mode = getSetting(companyId, 'location_check_mode', 'warn_only') as 'off' | 'record_only' | 'warn_only' | 'enforce';
  if (mode === 'off') return { status: 'in_area' };
  const loc = store.locations.find((l) => l.company_id === companyId && l.is_active);
  if (!loc) return { status: 'in_area' };
  const dist = haversineDistance(lat, lng, loc.latitude, loc.longitude);
  if (dist <= loc.radius_meters) return { status: 'in_area' };
  return { status: 'out_of_area', reason: `อยู่ห่างจากพื้นที่ ${Math.round(dist)} ม.` };
}

export function checkIn(input: CheckInInput): CheckInResult {
  const store = loadStore();
  const today = todayISO();
  const existing = store.attendanceLogs.find(
    (l) => l.employee_id === input.employeeId && l.work_date === today,
  );
  if (existing && existing.check_in_at && !existing.check_out_at) {
    return { ok: false, message: 'วันนี้เช็คอินไปแล้ว กรุณาเช็คเอาท์ก่อน' };
  }
  if (existing && existing.check_in_at && existing.check_out_at) {
    return { ok: false, message: 'วันนี้เช็คอินและเช็คเอาท์เรียบร้อยแล้ว' };
  }

  const mode = getSetting(input.companyId, 'location_check_mode', 'warn_only') as 'off' | 'record_only' | 'warn_only' | 'enforce';
  const locCheck = checkLocation(input.companyId, input.latitude ?? null, input.longitude ?? null);

  if (mode === 'enforce' && locCheck.status === 'out_of_area') {
    return { ok: false, message: `ไม่สามารถเช็คอินได้ — ${locCheck.reason ?? 'อยู่นอกพื้นที่ที่กำหนด'}`, locationStatus: locCheck.status };
  }

  const log: AttendanceLog = existing ?? {
    id: uid('al'),
    company_id: input.companyId,
    employee_id: input.employeeId,
    work_date: today,
    check_in_at: null,
    check_out_at: null,
    method: 'mobile',
    device_info: null,
    latitude: null,
    longitude: null,
    location_status: 'unchecked',
    note: null,
    created_at: now(),
    updated_at: now(),
  };

  log.check_in_at = now();
  log.method = 'mobile';
  log.device_info = input.deviceInfo ?? (typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 200) : null);
  log.latitude = input.latitude ?? null;
  log.longitude = input.longitude ?? null;
  log.location_status = locCheck.status;
  log.note = input.note ?? log.note ?? null;
  log.updated_at = now();

  if (!existing) store.attendanceLogs.push(log);
  logAudit(input.companyId, input.actorId, 'attendance_logs', log.id, 'check_in', null, { check_in_at: log.check_in_at, location_status: log.location_status });
  saveStore(store);
  return { ok: true, message: 'เช็คอินสำเร็จ', log, locationStatus: locCheck.status };
}

export function checkOut(input: { employeeId: string; companyId: string; actorId: string; latitude?: number | null; longitude?: number | null; note?: string }): CheckInResult {
  const store = loadStore();
  const today = todayISO();
  const log = store.attendanceLogs.find((l) => l.employee_id === input.employeeId && l.work_date === today);
  if (!log) return { ok: false, message: 'ยังไม่ได้เช็คอินวันนี้' };
  if (!log.check_in_at) return { ok: false, message: 'ยังไม่ได้เช็คอินวันนี้' };
  if (log.check_out_at) return { ok: false, message: 'เช็คเอาท์ไปแล้ว' };

  log.check_out_at = now();
  if (input.latitude != null) log.latitude = input.latitude;
  if (input.longitude != null) log.longitude = input.longitude;
  if (input.note) log.note = input.note;
  log.updated_at = now();
  logAudit(input.companyId, input.actorId, 'attendance_logs', log.id, 'check_out', null, { check_out_at: log.check_out_at });
  saveStore(store);
  return { ok: true, message: 'เช็คเอาท์สำเร็จ', log };
}

export function adminUpdateLog(logId: string, actorId: string, patch: Partial<AttendanceLog>) {
  const store = loadStore();
  const log = store.attendanceLogs.find((l) => l.id === logId);
  if (!log) throw new Error('ไม่พบบันทึกเวลา');
  const before = JSON.parse(JSON.stringify(log));
  Object.assign(log, patch, { updated_at: now() });
  logAudit(log.company_id, actorId, 'attendance_logs', log.id, 'admin_update', before, log);
  saveStore(store);
  return log;
}

export function adminDeleteLog(logId: string, actorId: string) {
  const store = loadStore();
  const log = store.attendanceLogs.find((l) => l.id === logId);
  if (!log) throw new Error('ไม่พบบันทึก');
  const before = JSON.parse(JSON.stringify(log));
  store.attendanceLogs = store.attendanceLogs.filter((l) => l.id !== logId);
  // Also remove any timesheet referencing this date
  store.timesheets = store.timesheets.filter((t) => !(t.employee_id === log.employee_id && t.work_date === log.work_date));
  logAudit(log.company_id, actorId, 'attendance_logs', log.id, 'admin_delete', before, null);
  saveStore(store);
}
