import { useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import { thaiMonthYear, formatCurrency, thaiDateShort } from '@/lib/utils';
import { loadStore } from '@/lib/store';
import { getEmployeePayslips } from '@/lib/repos/payroll';
import { generatePayslipPDF } from '@/lib/exports/payslipPdf';
import { useToast } from '@/contexts/ToastContext';
import { FileText, Download } from 'lucide-react';
import type { PayrollItem } from '@/types';

export default function EmployeePayslipPage() {
  const { employee, profile } = useAuth();
  const toast = useToast();
  const items = useMemo(() => (employee ? getEmployeePayslips(employee.id) : []), [employee]);
  const store = useMemo(() => loadStore(), [items]);
  const [downloading, setDownloading] = useState<string | null>(null);

  const periodMap = new Map(store.payrollPeriods.map((p) => [p.id, p]));

  const handleDownload = async (item: PayrollItem) => {
    const period = periodMap.get(item.payroll_period_id);
    if (!period) return;
    if (!employee || !profile) return;
    setDownloading(item.id);
    try {
      const company = store.companies.find((c) => c.id === employee.company_id);
      generatePayslipPDF({
        item,
        period,
        employee,
        company: company ?? null,
        profile,
      });
      toast.success('ดาวน์โหลดสลิปสำเร็จ');
    } catch (e: any) {
      toast.error('สร้าง PDF ไม่สำเร็จ', e?.message);
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div>
      <PageHeader title="สลิปเงินเดือน" subtitle="ดูและดาวน์โหลดสลิปย้อนหลัง" />

      <div className="space-y-3 pb-8">
        {items.length === 0 ? (
          <EmptyState icon={<FileText className="h-6 w-6" />} title="ยังไม่มีสลิปเงินเดือน" description="เมื่อแอดมินคำนวณเงินเดือนและยืนยันแล้ว สลิปจะปรากฏที่นี่" />
        ) : (
          items.map((it) => {
            const period = periodMap.get(it.payroll_period_id);
            return (
              <article key={it.id} className="pastel-card p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="font-semibold text-ink">
                      {period ? thaiMonthYear(period.period_year, period.period_month) : '—'}
                    </div>
                    <div className="text-xs text-ink-muted">
                      {period && `${thaiDateShort(period.start_date)} – ${thaiDateShort(period.end_date)}`}
                    </div>
                  </div>
                  {period && <StatusBadge status={period.status} />}
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-xs text-ink-muted">วันทำงาน</div>
                    <div className="font-medium">{it.work_days} วัน</div>
                  </div>
                  <div>
                    <div className="text-xs text-ink-muted">ชั่วโมงรวม</div>
                    <div className="font-medium">{(it.regular_hours + it.ot_hours).toFixed(2)} ชม.</div>
                  </div>
                  <div>
                    <div className="text-xs text-ink-muted">ค่าแรงพื้นฐาน</div>
                    <div className="font-medium">{formatCurrency(it.base_pay)} ฿</div>
                  </div>
                  <div>
                    <div className="text-xs text-ink-muted">ค่า OT</div>
                    <div className="font-medium">{formatCurrency(it.ot_pay)} ฿</div>
                  </div>
                  <div>
                    <div className="text-xs text-ink-muted">ลา/หยุด</div>
                    <div className="font-medium">{formatCurrency(it.leave_pay + it.holiday_pay)} ฿</div>
                  </div>
                  <div>
                    <div className="text-xs text-ink-muted">หักอื่น ๆ</div>
                    <div className="font-medium text-softred-400">-{formatCurrency(it.shortage_deduction + it.other_deductions)} ฿</div>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
                  <div>
                    <div className="text-xs text-ink-muted">เงินสุทธิ</div>
                    <div className="text-xl font-bold text-mint-600">{formatCurrency(it.net_pay)} ฿</div>
                  </div>
                  <button onClick={() => handleDownload(it)} className="btn-secondary" disabled={downloading === it.id}>
                    <Download className="h-4 w-4" />
                    {downloading === it.id ? 'กำลังสร้าง...' : 'ดาวน์โหลด PDF'}
                  </button>
                </div>
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}

