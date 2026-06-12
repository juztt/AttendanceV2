import { useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { PageHeader } from '@/components/shared/PageHeader';
import { Avatar } from '@/components/shared/Avatar';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Modal, ConfirmModal } from '@/components/shared/Modal';
import { addAdjustment, getOrCreatePeriod, getPayrollItems, lockPeriod, previewPayroll, unlockPeriod } from '@/lib/repos/payroll';
import { getActiveEmployees } from '@/lib/repos/employees';
import { loadStore } from '@/lib/store';
import { thaiMonthYear, formatCurrency } from '@/lib/utils';
import { generatePayslipPDF } from '@/lib/exports/payslipPdf';
import { exportPayrollExcel } from '@/lib/exports/excel';
import { Wallet, Lock, Unlock, Download, FileText, Calculator, Plus } from 'lucide-react';
import type { PayrollItem, Employee } from '@/types';

export default function AdminPayrollPage() {
  const { session, profile } = useAuth();
  const toast = useToast();
  const [refresh, setRefresh] = useState(0);
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [selectedItem, setSelectedItem] = useState<PayrollItem | null>(null);
  const [confirmLock, setConfirmLock] = useState(false);
  const [adjustFor, setAdjustFor] = useState<PayrollItem | null>(null);

  const period = useMemo(() => {
    if (!session) return null;
    return getOrCreatePeriod(session.companyId, year, month, session.userId);
  }, [session, year, month, refresh]);

  const items = useMemo(() => (period ? getPayrollItems(period.id) : []), [period, refresh]);
  const store = useMemo(() => loadStore(), [refresh]);
  const employees = useMemo(() => session ? getActiveEmployees(session.companyId) : [], [session, refresh]);

  const handlePreview = () => {
    if (!session || !period) return;
    if (period.status === 'locked') { toast.error('รอบนี้ถูกล็อกแล้ว'); return; }
    previewPayroll({ periodId: period.id, actorId: session.userId });
    setRefresh((n) => n + 1);
    toast.success('คำนวณเงินเดือนสำเร็จ', 'ตรวจสอบรายการ แล้วกด "ยืนยันรอบเงินเดือน" เมื่อพร้อม');
  };

  const handleLock = () => {
    if (!session || !period) return;
    lockPeriod(period.id, session.userId);
    setConfirmLock(false);
    setRefresh((n) => n + 1);
    toast.success('ล็อกรอบเงินเดือนแล้ว');
  };

  const handleUnlock = () => {
    if (!session || !period) return;
    unlockPeriod(period.id, session.userId);
    setRefresh((n) => n + 1);
    toast.success('ปลดล็อกรอบเงินเดือน');
  };

  const handleExport = () => {
    if (!session || !period) return;
    const company = store.companies.find((c) => c.id === session.companyId);
    exportPayrollExcel({ items, employees, period, companyName: company?.name ?? 'บริษัท' });
    toast.success('ส่งออก Excel เรียบร้อย');
  };

  const handleDownloadPayslip = (item: PayrollItem) => {
    if (!profile) return;
    const emp = employees.find((e) => e.id === item.employee_id);
    if (!emp) return;
    const company = store.companies.find((c) => c.id === emp.company_id);
    generatePayslipPDF({ item, period: period!, employee: emp, company: company ?? null, profile });
  };

  const totals = items.reduce((acc, it) => ({
    base: acc.base + it.base_pay,
    ot: acc.ot + it.ot_pay,
    hol: acc.hol + it.holiday_pay,
    leave: acc.leave + it.leave_pay,
    shortage: acc.shortage + it.shortage_deduction,
    other_e: acc.other_e + it.other_earnings,
    other_d: acc.other_d + it.other_deductions,
    net: acc.net + it.net_pay,
  }), { base: 0, ot: 0, hol: 0, leave: 0, shortage: 0, other_e: 0, other_d: 0, net: 0 });

  return (
    <div>
      <PageHeader title="เงินเดือน" subtitle={thaiMonthYear(year, month)} />

      <div className="space-y-3 pb-8">
        <div className="pastel-card p-3 flex items-center gap-2">
          <select className="input-base" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>เดือน {m}</option>
            ))}
          </select>
          <input type="number" className="input-base w-24" value={year} onChange={(e) => setYear(Number(e.target.value))} />
          {period && <StatusBadge status={period.status} className="ml-auto" />}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <button onClick={handlePreview} className="btn-primary text-sm py-2.5" disabled={period?.status === 'locked'}>
            <Calculator className="h-4 w-4" /> คำนวณ
          </button>
          {period?.status !== 'locked' ? (
            <button onClick={() => setConfirmLock(true)} className="btn-secondary text-sm py-2.5" disabled={items.length === 0}>
              <Lock className="h-4 w-4" /> ยืนยันรอบ
            </button>
          ) : (
            <button onClick={handleUnlock} className="btn-secondary text-sm py-2.5">
              <Unlock className="h-4 w-4" /> ปลดล็อก
            </button>
          )}
          <button onClick={handleExport} className="btn-secondary text-sm py-2.5" disabled={items.length === 0}>
            <Download className="h-4 w-4" /> Excel
          </button>
        </div>

        {/* Totals */}
        {items.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <StatCard label="ค่าแรงรวม" value={formatCurrency(totals.base)} color="bg-mint-100 text-mint-600" />
            <StatCard label="OT รวม" value={formatCurrency(totals.ot)} color="bg-skyblue-100 text-skyblue-500" />
            <StatCard label="วันหยุด/ลา" value={formatCurrency(totals.hol + totals.leave)} color="bg-lavender-100 text-lavender-500" />
            <StatCard label="สุทธิรวม" value={formatCurrency(totals.net)} color="bg-gradient-to-br from-mint-200 to-skyblue-200 text-ink" />
          </div>
        )}

        {/* Items list */}
        <div className="space-y-2">
          {items.length === 0 ? (
            <div className="pastel-card p-6 text-center text-ink-muted">
              <Wallet className="h-8 w-8 mx-auto mb-2 text-ink-light" />
              กดปุ่ม "คำนวณ" เพื่อเริ่มคำนวณเงินเดือน
            </div>
          ) : items.map((it) => {
            const emp = employees.find((e) => e.id === it.employee_id);
            if (!emp) return null;
            return (
              <article key={it.id} className="pastel-card p-3.5">
                <div className="flex items-center gap-3">
                  <Avatar name={emp.full_name} color={emp.avatar_color} />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-ink">{emp.full_name}</div>
                    <div className="text-xs text-ink-muted">
                      {it.work_days} วันทำงาน • {it.regular_hours.toFixed(2)} ชม. + OT {it.ot_hours.toFixed(2)} ชม.
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-ink-muted">สุทธิ</div>
                    <div className="text-lg font-bold text-mint-600">{formatCurrency(it.net_pay)}</div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  <button onClick={() => setSelectedItem(it)} className="btn-secondary text-xs px-2.5 py-1">ดูรายละเอียด</button>
                  <button onClick={() => setAdjustFor(it)} className="btn-secondary text-xs px-2.5 py-1" disabled={period?.status === 'locked'}>
                    <Plus className="h-3 w-3" /> เพิ่ม/หัก
                  </button>
                  <button onClick={() => handleDownloadPayslip(it)} className="btn-secondary text-xs px-2.5 py-1">
                    <FileText className="h-3 w-3" /> สลิป PDF
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      <PayrollItemDetailModal
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
        employees={employees}
        store={store}
      />

      <AdjustmentModal
        item={adjustFor}
        onClose={() => setAdjustFor(null)}
        onSaved={() => { setAdjustFor(null); setRefresh((n) => n + 1); }}
        actorId={session?.userId ?? ''}
      />

      <ConfirmModal
        open={confirmLock}
        title="ยืนยันรอบเงินเดือน"
        description={`ล็อกรอบ ${thaiMonthYear(year, month)} แล้วจะไม่สามารถแก้ไขได้ (ต้องปลดล็อกก่อน)`}
        confirmText="ยืนยัน"
        onCancel={() => setConfirmLock(false)}
        onConfirm={handleLock}
      />
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className={`rounded-2xl px-3 py-3 ${color}`}>
      <div className="text-xs opacity-80">{label}</div>
      <div className="text-base font-bold">{value}</div>
    </div>
  );
}

function PayrollItemDetailModal({ item, onClose, employees, store }: { item: PayrollItem | null; onClose: () => void; employees: Employee[]; store: ReturnType<typeof loadStore> }) {
  if (!item) return null;
  const emp = employees.find((e) => e.id === item.employee_id);
  const adjustments = store.payrollAdjustments.filter((a) => a.payroll_item_id === item.id);
  return (
    <Modal open={!!item} onClose={onClose} title={`รายละเอียดเงินเดือน: ${emp?.full_name ?? ''}`} size="lg">
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <Row label="วันทำงาน" value={`${item.work_days} วัน`} />
          <Row label="วันหยุด" value={`${item.day_off_days} วัน`} />
          <Row label="วันลา" value={`${item.leave_days} วัน`} />
          <Row label="ขาดงาน" value={`${item.absent_days} วัน`} />
          <Row label="ชั่วโมงปกติ" value={`${item.regular_hours.toFixed(2)} ชม.`} />
          <Row label="OT" value={`${item.ot_hours.toFixed(2)} ชม.`} />
          <Row label="มาสาย" value={`${item.late_minutes} นาที`} />
        </div>
        <hr className="border-border" />
        <div className="space-y-1.5 text-sm">
          <Row label="ค่าแรงพื้นฐาน" value={formatCurrency(item.base_pay)} positive />
          <Row label="ค่า OT" value={formatCurrency(item.ot_pay)} positive />
          <Row label="ค่าวันหยุดนักขัตฤกษ์" value={formatCurrency(item.holiday_pay)} positive />
          <Row label="ค่าลาที่ได้รับ" value={formatCurrency(item.leave_pay)} positive />
          <Row label="เพิ่มพิเศษ" value={formatCurrency(item.other_earnings)} positive />
          <Row label="หักขาด/ทำไม่ครบ" value={`-${formatCurrency(item.shortage_deduction)}`} negative />
          <Row label="หักอื่น ๆ" value={`-${formatCurrency(item.other_deductions)}`} negative />
        </div>
        {adjustments.length > 0 && (
          <div className="space-y-1 text-xs">
            <div className="font-semibold text-ink-muted">รายการปรับ:</div>
            {adjustments.map((a) => (
              <div key={a.id} className="flex justify-between">
                <span>{a.label}</span>
                <span className={a.type === 'earning' ? 'text-mint-600' : 'text-softred-400'}>
                  {a.type === 'earning' ? '+' : '-'}{formatCurrency(a.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
        <div className="pastel-card p-3 bg-gradient-to-br from-mint-100 to-skyblue-100">
          <div className="text-xs text-ink-muted">เงินสุทธิ</div>
          <div className="text-2xl font-bold text-ink">{formatCurrency(item.net_pay)} ฿</div>
        </div>
      </div>
    </Modal>
  );
}

function Row({ label, value, positive, negative }: { label: string; value: string; positive?: boolean; negative?: boolean }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-ink-muted">{label}</span>
      <span className={negative ? 'text-softred-400' : positive ? 'text-mint-600' : 'text-ink font-medium'}>{value}</span>
    </div>
  );
}

function AdjustmentModal({ item, onClose, onSaved, actorId }: { item: PayrollItem | null; onClose: () => void; onSaved: () => void; actorId: string }) {
  const toast = useToast();
  const [type, setType] = useState<'earning' | 'deduction'>('earning');
  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState<number | string>(0);
  const [saving, setSaving] = useState(false);

  if (!item) return null;

  const submit = () => {
    const amt = Number(amount);
    if (!label.trim()) { toast.error('กรุณาระบุรายการ'); return; }
    if (Number.isNaN(amt) || amt <= 0) { toast.error('จำนวนเงินต้องมากกว่า 0'); return; }
    setSaving(true);
    try {
      addAdjustment({ itemId: item.id, type, label, amount: amt, actorId });
      toast.success('เพิ่มรายการแล้ว');
      onSaved();
    } catch (e: any) {
      toast.error('ไม่สำเร็จ', e?.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={!!item}
      onClose={onClose}
      title="เพิ่มรายการปรับ"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose} disabled={saving}>ยกเลิก</button>
          <button className="btn-primary" onClick={submit} disabled={saving}>{saving ? 'กำลังบันทึก...' : 'บันทึก'}</button>
        </>
      }
    >
      <div className="space-y-3">
        <div>
          <label className="label-base">ประเภท</label>
          <select className="input-base" value={type} onChange={(e) => setType(e.target.value as any)}>
            <option value="earning">เพิ่มรายได้</option>
            <option value="deduction">หักรายการ</option>
          </select>
        </div>
        <div>
          <label className="label-base">รายการ</label>
          <input className="input-base" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="เช่น เบี้ยขยัน, ค่าล่วงเวลาพิเศษ" />
        </div>
        <div>
          <label className="label-base">จำนวนเงิน (บาท)</label>
          <input className="input-base" type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
      </div>
    </Modal>
  );
}


