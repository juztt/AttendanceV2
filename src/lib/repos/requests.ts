import { loadStore, saveStore, logAudit } from '@/lib/store';
import { uid, now } from '@/lib/utils';
import type { LeaveRequest, TimeAdjustmentRequest, RequestStatus } from '@/types';

export function getLeaveRequests(companyId: string, status?: RequestStatus): LeaveRequest[] {
  return loadStore().leaveRequests
    .filter((r) => r.company_id === companyId)
    .filter((r) => !status || r.status === status)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function getLeaveRequestsByEmployee(employeeId: string): LeaveRequest[] {
  return loadStore().leaveRequests
    .filter((r) => r.employee_id === employeeId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function createLeaveRequest(input: Omit<LeaveRequest, 'id' | 'created_at' | 'updated_at' | 'status' | 'reviewer_id' | 'reviewed_at' | 'reviewer_note'>): LeaveRequest {
  const store = loadStore();
  const r: LeaveRequest = {
    ...input,
    id: uid('lr'),
    status: 'pending',
    reviewer_id: null,
    reviewed_at: null,
    reviewer_note: null,
    created_at: now(),
    updated_at: now(),
  };
  store.leaveRequests.push(r);
  saveStore(store);
  return r;
}

export function reviewLeaveRequest(requestId: string, reviewerId: string, status: 'approved' | 'rejected', note?: string) {
  const store = loadStore();
  const r = store.leaveRequests.find((x) => x.id === requestId);
  if (!r) throw new Error('ไม่พบคำขอ');
  const before = JSON.parse(JSON.stringify(r));
  r.status = status;
  r.reviewer_id = reviewerId;
  r.reviewed_at = now();
  r.reviewer_note = note ?? null;
  r.updated_at = now();
  logAudit(r.company_id, reviewerId, 'leave_requests', r.id, `review_${status}`, before, r);
  saveStore(store);
  return r;
}

// ---------- Time Adjustment ----------

export function getAdjustmentRequests(companyId: string, status?: RequestStatus): TimeAdjustmentRequest[] {
  return loadStore().timeAdjustmentRequests
    .filter((r) => r.company_id === companyId)
    .filter((r) => !status || r.status === status)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function getAdjustmentsByEmployee(employeeId: string): TimeAdjustmentRequest[] {
  return loadStore().timeAdjustmentRequests
    .filter((r) => r.employee_id === employeeId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function createAdjustmentRequest(input: Omit<TimeAdjustmentRequest, 'id' | 'created_at' | 'updated_at' | 'status' | 'reviewer_id' | 'reviewed_at' | 'reviewer_note'>): TimeAdjustmentRequest {
  const store = loadStore();
  const r: TimeAdjustmentRequest = {
    ...input,
    id: uid('ar'),
    status: 'pending',
    reviewer_id: null,
    reviewed_at: null,
    reviewer_note: null,
    created_at: now(),
    updated_at: now(),
  };
  store.timeAdjustmentRequests.push(r);
  saveStore(store);
  return r;
}

export function reviewAdjustmentRequest(requestId: string, reviewerId: string, status: 'approved' | 'rejected', note?: string) {
  const store = loadStore();
  const r = store.timeAdjustmentRequests.find((x) => x.id === requestId);
  if (!r) throw new Error('ไม่พบคำขอ');
  const before = JSON.parse(JSON.stringify(r));
  r.status = status;
  r.reviewer_id = reviewerId;
  r.reviewed_at = now();
  r.reviewer_note = note ?? null;
  r.updated_at = now();

  // If approved, apply change to attendance log
  if (status === 'approved') {
    const log = store.attendanceLogs.find((l) => l.employee_id === r.employee_id && l.work_date === r.work_date);
    const field = r.field as 'check_in' | 'check_out' | 'note';
    if (log) {
      if (field === 'check_in' || field === 'check_out') {
        // requested_value is ISO timestamp
        const iso = parseToISO(r.work_date, r.requested_value);
        if (field === 'check_in') log.check_in_at = iso;
        else log.check_out_at = iso;
        log.updated_at = now();
      } else if (field === 'note') {
        log.note = r.requested_value;
        log.updated_at = now();
      }
    } else if (field === 'check_in' || field === 'check_out') {
      // create new log entry
      const iso = parseToISO(r.work_date, r.requested_value);
      const f: 'check_in' | 'check_out' | 'note' = field;
      store.attendanceLogs.push({
        id: uid('al'),
        company_id: r.company_id,
        employee_id: r.employee_id,
        work_date: r.work_date,
        check_in_at: f === 'check_in' ? iso : null,
        check_out_at: f === 'check_out' ? iso : null,
        method: 'admin',
        device_info: null,
        latitude: null,
        longitude: null,
        location_status: 'unchecked',
        note: (f as string) === 'note' ? r.requested_value : null,
        created_at: now(),
        updated_at: now(),
      });
    }
  }

  logAudit(r.company_id, reviewerId, 'time_adjustment_requests', r.id, `review_${status}`, before, r);
  saveStore(store);
  return r;
}

function parseToISO(workDate: string, value: string): string {
  // value is "HH:mm" or full ISO. If HH:mm, combine with workDate.
  if (/^\d{2}:\d{2}$/.test(value)) {
    const [h, m] = value.split(':').map(Number);
    const d = new Date(workDate);
    d.setHours(h, m, 0, 0);
    return d.toISOString();
  }
  return new Date(value).toISOString();
}
