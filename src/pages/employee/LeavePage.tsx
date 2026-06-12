import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { PageHeader } from '@/components/shared/PageHeader';
import { Modal, ConfirmModal } from '@/components/shared/Modal';
import { thaiDateShort, todayISO } from '@/lib/utils';
import { getLeaveTypes } from '@/lib/repos/settings';
import { loadStore } from '@/lib/store';
import { createLeaveRequest, getLeaveRequestsByEmployee } from '@/lib/repos/requests';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import { CalendarDays, Plus } from 'lucide-react';
import type { LeaveRequest } from '@/types';

function daysBetween(start: string, end: string): number {
  const s = new Date(start);
  const e = new Date(end);
  return Math.max(1, Math.round((e.getTime() - s.getTime()) / 86400000) + 1);
}

export default function EmployeeLeavePage() {
  const { employee, session } = useAuth();
  const toast = useToast();
  const [, setRefresh] = useState(0);
  const [open, setOpen] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState<LeaveRequest | null>(null);

  const types = employee ? getLeaveTypes(employee.company_id) : [];
  const requests = employee ? getLeaveRequestsByEmployee(employee.id) : [];

  const [typeId, setTypeId] = useState<string>('');
  const [startDate, setStartDate] = useState(todayISO());
  const [endDate, setEndDate] = useState(todayISO());
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = () => {
    if (!employee || !session) return;
    if (!typeId) { toast.error('กรุณาเลือกประเภทการลา'); return; }
    if (endDate < startDate) { toast.error('วันที่สิ้นสุดต้องไม่ก่อนวันที่เริ่ม'); return; }
    setSubmitting(true);
    try {
      createLeaveRequest({
        company_id: employee.company_id,
        employee_id: employee.id,
        leave_type_id: typeId,
        start_date: startDate,
        end_date: endDate,
        total_days: daysBetween(startDate, endDate),
        reason: reason || null,
        attachment_url: null,
      });
      toast.success('ส่งคำขอลาเรียบร้อย');
      setOpen(false);
      setReason('');
      setRefresh((n) => n + 1);
    } catch (e: any) {
      toast.error('ส่งคำขอไม่สำเร็จ', e?.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <PageHeader title="ลางาน" subtitle="ขอลาป่วย ลากิจ ลาพักร้อน และลาไม่รับเงิน" actions={
        <button onClick={() => setOpen(true)} className="btn-primary px-3 py-2 text-sm"><Plus className="h-4 w-4" /> ขอลา</button>
      } />

      <div className="space-y-3 pb-8">
        {requests.length === 0 ? (
          <EmptyState icon={<CalendarDays className="h-6 w-6" />} title="ยังไม่มีคำขอลา" description="กดปุ่ม 'ขอลา' เพื่อเริ่มต้น" />
        ) : (
          requests.map((r) => {
            const t = types.find((x) => x.id === r.leave_type_id);
            return (
              <article key={r.id} className="pastel-card p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-ink">{t?.name ?? 'ไม่ระบุ'}</div>
                    <div className="text-xs text-ink-muted">{thaiDateShort(r.start_date)} – {thaiDateShort(r.end_date)} • {r.total_days} วัน</div>
                  </div>
                  <StatusBadge status={r.status} />
                </div>
                {r.reason && <div className="text-sm text-ink-muted mt-2">เหตุผล: {r.reason}</div>}
                {r.reviewer_note && <div className="text-sm mt-2 text-ink">หมายเหตุผู้อนุมัติ: {r.reviewer_note}</div>}
                {r.status === 'pending' && (
                  <div className="text-right mt-3">
                    <button onClick={() => setConfirmCancel(r)} className="btn-danger text-xs px-3 py-1.5">ยกเลิกคำขอ</button>
                  </div>
                )}
              </article>
            );
          })
        )}
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="ขอลางาน"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setOpen(false)} disabled={submitting}>ยกเลิก</button>
            <button className="btn-primary" onClick={submit} disabled={submitting}>
              {submitting ? 'กำลังส่ง...' : 'ส่งคำขอ'}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="label-base">ประเภทการลา</label>
            <select className="input-base" value={typeId} onChange={(e) => setTypeId(e.target.value)}>
              <option value="">— เลือก —</option>
              {types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-base">วันที่เริ่ม</label>
              <input type="date" className="input-base" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <label className="label-base">วันที่สิ้นสุด</label>
              <input type="date" className="input-base" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label-base">เหตุผล</label>
            <textarea className="input-base min-h-[80px]" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="ระบุเหตุผล (ถ้ามี)" />
          </div>
        </div>
      </Modal>

      <ConfirmModal
        open={!!confirmCancel}
        title="ยกเลิกคำขอลา"
        description="คุณต้องการยกเลิกคำขอนี้หรือไม่?"
        onCancel={() => setConfirmCancel(null)}
        onConfirm={() => {
          if (!confirmCancel) return;
          const store = loadStore();
          store.leaveRequests = store.leaveRequests.filter((r) => r.id !== confirmCancel.id);
          (window as any).localStorage.setItem('mini-timepay-store-v1', JSON.stringify(store));
          setConfirmCancel(null);
          setRefresh((n) => n + 1);
          toast.success('ยกเลิกคำขอแล้ว');
        }}
        danger
      />
    </div>
  );
}

