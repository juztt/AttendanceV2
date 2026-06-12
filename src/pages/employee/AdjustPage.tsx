import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { PageHeader } from '@/components/shared/PageHeader';
import { Modal } from '@/components/shared/Modal';
import { thaiDateShort, todayISO } from '@/lib/utils';

import { createAdjustmentRequest, getAdjustmentsByEmployee } from '@/lib/repos/requests';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import { Camera } from 'lucide-react';
import { getTodayLog } from '@/lib/repos/attendance';

export default function EmployeeAdjustPage() {
  const { employee, session } = useAuth();
  const toast = useToast();
  const [, setRefresh] = useState(0);
  const [open, setOpen] = useState(false);

  const requests = employee ? getAdjustmentsByEmployee(employee.id) : [];

  const [workDate, setWorkDate] = useState(todayISO());
  const [field, setField] = useState<'check_in' | 'check_out' | 'note'>('check_in');
  const [requestedValue, setRequestedValue] = useState('08:00');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = () => {
    if (!employee || !session) return;
    if (!workDate) { toast.error('กรุณาเลือกวันที่'); return; }
    if (field !== 'note' && !requestedValue) { toast.error('กรุณากรอกเวลา'); return; }
    if (field === 'check_out' || field === 'check_in') {
      if (!/^\d{2}:\d{2}$/.test(requestedValue)) { toast.error('รูปแบบเวลาไม่ถูกต้อง (HH:mm)'); return; }
    }
    setSubmitting(true);
    try {
      const log = getTodayLog(employee.id, workDate);
      let original: string | null = null;
      if (log) {
        if (field === 'check_in') original = log.check_in_at ?? null;
        else if (field === 'check_out') original = log.check_out_at ?? null;
        else original = log.note ?? null;
      }
      createAdjustmentRequest({
        company_id: employee.company_id,
        employee_id: employee.id,
        attendance_log_id: log?.id ?? null,
        work_date: workDate,
        field,
        original_value: original,
        requested_value: requestedValue,
        reason: reason || null,
      });
      toast.success('ส่งคำขอแก้เวลาเรียบร้อย');
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
      <PageHeader title="ขอแก้ไขเวลา" subtitle="แจ้งแอดมินเพื่อขอแก้เวลาเข้า-ออก หรือเพิ่มหมายเหตุ" actions={
        <button onClick={() => setOpen(true)} className="btn-primary px-3 py-2 text-sm">+ ขอแก้</button>
      } />

      <div className="space-y-3 pb-8">
        {requests.length === 0 ? (
          <EmptyState icon={<Camera className="h-6 w-6" />} title="ยังไม่มีคำขอแก้เวลา" />
        ) : (
          requests.map((r) => (
            <article key={r.id} className="pastel-card p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-ink">{thaiDateShort(r.work_date)}</div>
                  <div className="text-xs text-ink-muted">
                    {r.field === 'check_in' ? 'เวลาเข้า' : r.field === 'check_out' ? 'เวลาออก' : 'หมายเหตุ'}: {r.original_value ?? '—'} → <span className="text-ink font-medium">{r.requested_value}</span>
                  </div>
                </div>
                <StatusBadge status={r.status} />
              </div>
              {r.reason && <div className="text-sm text-ink-muted mt-2">เหตุผล: {r.reason}</div>}
              {r.reviewer_note && <div className="text-sm mt-2">หมายเหตุผู้อนุมัติ: {r.reviewer_note}</div>}
            </article>
          ))
        )}
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="ส่งคำขอแก้ไขเวลา"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setOpen(false)} disabled={submitting}>ยกเลิก</button>
            <button className="btn-primary" onClick={submit} disabled={submitting}>{submitting ? 'กำลังส่ง...' : 'ส่งคำขอ'}</button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="label-base">วันที่</label>
            <input type="date" className="input-base" value={workDate} onChange={(e) => setWorkDate(e.target.value)} />
          </div>
          <div>
            <label className="label-base">ประเภท</label>
            <select className="input-base" value={field} onChange={(e) => setField(e.target.value as any)}>
              <option value="check_in">ขอแก้เวลาเข้า</option>
              <option value="check_out">ขอแก้เวลาออก</option>
              <option value="note">เพิ่มหมายเหตุ</option>
            </select>
          </div>
          {field !== 'note' ? (
            <div>
              <label className="label-base">เวลาที่ต้องการ (HH:mm)</label>
              <input type="time" className="input-base" value={requestedValue} onChange={(e) => setRequestedValue(e.target.value)} />
            </div>
          ) : (
            <div>
              <label className="label-base">หมายเหตุ</label>
              <textarea className="input-base min-h-[80px]" value={requestedValue} onChange={(e) => setRequestedValue(e.target.value)} />
            </div>
          )}
          <div>
            <label className="label-base">เหตุผล</label>
            <textarea className="input-base min-h-[80px]" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="เช่น ลืมเช็คอิน, ระบบล่ม" />
          </div>
        </div>
      </Modal>
    </div>
  );
}

