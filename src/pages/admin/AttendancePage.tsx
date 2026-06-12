import { useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { PageHeader } from '@/components/shared/PageHeader';
import { Avatar } from '@/components/shared/Avatar';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Modal, ConfirmModal } from '@/components/shared/Modal';
import { EmptyState } from '@/components/shared/EmptyState';
import { adminDeleteLog, adminUpdateLog, getLogsByCompany } from '@/lib/repos/attendance';
import { loadStore } from '@/lib/store';
import { thaiDateShort, thaiDayOfWeek, formatMinutesAsHM, todayISO, getMonthRange } from '@/lib/utils';
import { calculateTimesheet, timeStringFromISO } from '@/lib/calculations/timesheet';
import { exportAttendanceExcel } from '@/lib/exports/excel';
import { Edit, Trash2, Download, Search, ClipboardCheck } from 'lucide-react';
import type { AttendanceLog, AttendanceStatus } from '@/types';

export default function AdminAttendancePage() {
  const { session } = useAuth();
  const toast = useToast();
  const [refresh, setRefresh] = useState(0);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<AttendanceStatus | 'all'>('all');
  const [filterEmployee, setFilterEmployee] = useState<string>('all');
  const [rangeMode, setRangeMode] = useState<'today' | 'month' | 'custom'>('today');
  const [customMonth, setCustomMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [editing, setEditing] = useState<AttendanceLog | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<AttendanceLog | null>(null);

  const { start, end } = useMemo(() => {
    if (rangeMode === 'today') return { start: todayISO(), end: todayISO() };
    if (rangeMode === 'month') {
      const d = new Date();
      return getMonthRange(d.getFullYear(), d.getMonth() + 1);
    }
    const [y, m] = customMonth.split('-').map(Number);
    return getMonthRange(y, m);
  }, [rangeMode, customMonth]);

  const store = useMemo(() => loadStore(), [refresh]);
  const logs = useMemo(() => {
    if (!session) return [];
    return getLogsByCompany(session.companyId, start, end)
      .filter((l) => filterEmployee === 'all' || l.employee_id === filterEmployee)
      .filter((l) => !search || store.employees.find((e) => e.id === l.employee_id)?.full_name.toLowerCase().includes(search.toLowerCase()));
  }, [session, start, end, filterEmployee, search, refresh, store]);

  const items = useMemo(() => {
    return logs.map((l) => {
      const emp = store.employees.find((e) => e.id === l.employee_id);
      const shift = emp ? store.shifts.find((s) => s.id === emp.default_shift_id) ?? null : null;
      const payRule = emp ? store.payRules.find((p) => p.id === emp.pay_rule_id) ?? null : null;
      const ts = calculateTimesheet({
        employee: emp!, workDate: l.work_date, shift, attendanceLog: l, holiday: null, approvedLeave: null, payRule,
      });
      return { log: l, emp, ts };
    }).filter((x) => filterStatus === 'all' || x.ts.status === filterStatus);
  }, [logs, store, filterStatus]);

  const handleExport = () => {
    if (!session) return;
    const employees = store.employees.filter((e) => e.company_id === session.companyId);
    const company = store.companies.find((c) => c.id === session.companyId);
    exportAttendanceExcel({
      logs: items.map((i) => i.log),
      employees,
      timesheets: items.map((i) => ({ ...i.ts, id: '', company_id: '', employee_id: i.log.employee_id, work_date: i.log.work_date, shift_id: null, scheduled_start: null, scheduled_end: null, check_in_at: null, check_out_at: null, note: null, is_holiday: false, holiday_multiplier: 1, created_at: '', updated_at: '' } as any)),
      startDate: start,
      endDate: end,
      companyName: company?.name ?? 'บริษัท',
    });
    toast.success('ส่งออก Excel เรียบร้อย');
  };

  return (
    <div>
      <PageHeader title="เวลาเข้างาน" subtitle={`${thaiDateShort(start)} – ${thaiDateShort(end)} • ${items.length} รายการ`} actions={
        <button onClick={handleExport} className="btn-secondary px-3 py-2 text-sm"><Download className="h-4 w-4" /> Excel</button>
      } />

      <div className="space-y-3 pb-8">
        <div className="flex gap-2 flex-wrap">
          {[
            { k: 'today', l: 'วันนี้' },
            { k: 'month', l: 'เดือนนี้' },
            { k: 'custom', l: 'เลือกเดือน' },
          ].map((t) => (
            <button
              key={t.k}
              onClick={() => setRangeMode(t.k as any)}
              className={`px-3.5 py-1.5 rounded-full text-sm border ${rangeMode === t.k ? 'bg-mint-100 border-mint-300 text-mint-600 font-semibold' : 'bg-white border-border text-ink-muted'}`}
            >
              {t.l}
            </button>
          ))}
        </div>
        {rangeMode === 'custom' && (
          <input type="month" className="input-base max-w-[200px]" value={customMonth} onChange={(e) => setCustomMonth(e.target.value)} />
        )}

        <div className="grid grid-cols-2 gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted" />
            <input className="input-base pl-9" placeholder="ค้นหาชื่อ..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className="input-base" value={filterEmployee} onChange={(e) => setFilterEmployee(e.target.value)}>
            <option value="all">พนักงานทั้งหมด</option>
            {store.employees.filter((e) => e.company_id === session?.companyId).map((e) => (
              <option key={e.id} value={e.id}>{e.full_name}</option>
            ))}
          </select>
        </div>

        <div className="flex gap-1.5 overflow-x-auto scrollbar-thin">
          {(['all', 'normal', 'late', 'early_leave', 'absent', 'leave', 'forgot_checkout', 'day_off', 'holiday'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1 rounded-full text-xs border whitespace-nowrap ${filterStatus === s ? 'bg-mint-100 border-mint-300 text-mint-600 font-semibold' : 'bg-white border-border text-ink-muted'}`}
            >
              {s === 'all' ? 'ทุกสถานะ' : <StatusBadge status={s} />}
            </button>
          ))}
        </div>

        {items.length === 0 ? (
          <EmptyState icon={<ClipboardCheck className="h-6 w-6" />} title="ไม่มีข้อมูล" description="ลองเปลี่ยนตัวกรองหรือช่วงวันที่" />
        ) : (
          <div className="space-y-2">
            {items.map(({ log, emp, ts }) => (
              <article key={log.id} className="pastel-card p-3.5">
                <div className="flex items-center gap-3">
                  <Avatar name={emp?.full_name ?? ''} color={emp?.avatar_color} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="font-semibold text-sm text-ink truncate">{emp?.full_name}</div>
                      <StatusBadge status={ts.status} />
                    </div>
                    <div className="text-xs text-ink-muted">{thaiDateShort(log.work_date)} • {thaiDayOfWeek(log.work_date)}</div>
                    <div className="text-xs text-ink mt-1">เข้า {timeStringFromISO(log.check_in_at)} • ออก {timeStringFromISO(log.check_out_at)} • {formatMinutesAsHM(ts.paid_minutes)} • OT {formatMinutesAsHM(ts.ot_minutes)}</div>
                    {ts.late_minutes > 0 && <div className="text-xs text-peach-500">มาสาย {ts.late_minutes} นาที</div>}
                    {log.note && <div className="text-xs text-ink-muted mt-1">📝 {log.note}</div>}
                  </div>
                  <div className="flex flex-col gap-1">
                    <button onClick={() => setEditing(log)} className="btn-ghost h-8 w-8 p-0"><Edit className="h-4 w-4" /></button>
                    <button onClick={() => setConfirmDelete(log)} className="btn-ghost h-8 w-8 p-0 text-softred-400"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <EditLogModal
        log={editing}
        onClose={() => setEditing(null)}
        onSaved={() => { setEditing(null); setRefresh((n) => n + 1); toast.success('แก้ไขเวลาเรียบร้อย'); }}
        actorId={session?.userId ?? ''}
      />

      <ConfirmModal
        open={!!confirmDelete}
        title="ลบบันทึกเวลา"
        description="การลบจะมีผลกับรายงานเงินเดือนด้วย ต้องการลบหรือไม่?"
        confirmText="ลบ"
        danger
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => {
          if (!confirmDelete) return;
          try { adminDeleteLog(confirmDelete.id, session!.userId); setConfirmDelete(null); setRefresh((n) => n + 1); toast.success('ลบเรียบร้อย'); }
          catch (e: any) { toast.error('ลบไม่สำเร็จ', e?.message); }
        }}
      />
    </div>
  );
}

function EditLogModal({ log, onClose, onSaved, actorId }: { log: AttendanceLog | null; onClose: () => void; onSaved: () => void; actorId: string }) {
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  // Re-init when log changes
  useMemo(() => {
    if (log) {
      setCheckIn(log.check_in_at ? new Date(log.check_in_at).toISOString().slice(0, 16) : '');
      setCheckOut(log.check_out_at ? new Date(log.check_out_at).toISOString().slice(0, 16) : '');
      setNote(log.note ?? '');
    }
  }, [log?.id]);

  if (!log) return null;

  const save = () => {
    if (checkIn && checkOut && checkOut < checkIn) {
      alert('เวลาออกต้องหลังเวลาเข้า');
      return;
    }
    setSaving(true);
    try {
      adminUpdateLog(log.id, actorId, {
        check_in_at: checkIn ? new Date(checkIn).toISOString() : null,
        check_out_at: checkOut ? new Date(checkOut).toISOString() : null,
        note: note || null,
        method: 'admin',
      });
      onSaved();
    } catch (e: any) {
      alert(e?.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={!!log}
      onClose={onClose}
      title={`แก้ไขเวลา: ${thaiDateShort(log.work_date)}`}
      footer={
        <>
          <button className="btn-secondary" onClick={onClose} disabled={saving}>ยกเลิก</button>
          <button className="btn-primary" onClick={save} disabled={saving}>{saving ? 'กำลังบันทึก...' : 'บันทึก'}</button>
        </>
      }
    >
      <div className="space-y-3">
        <div>
          <label className="label-base">เวลาเข้า</label>
          <input type="datetime-local" className="input-base" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
        </div>
        <div>
          <label className="label-base">เวลาออก</label>
          <input type="datetime-local" className="input-base" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} />
        </div>
        <div>
          <label className="label-base">หมายเหตุ</label>
          <textarea className="input-base min-h-[80px]" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
      </div>
    </Modal>
  );
}

