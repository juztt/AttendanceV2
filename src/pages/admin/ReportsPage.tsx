import { useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { PageHeader } from '@/components/shared/PageHeader';
import { exportAttendanceExcel, exportLeaveExcel, exportPayrollExcel } from '@/lib/exports/excel';
import { getLogsByCompany } from '@/lib/repos/attendance';
import { getLeaveRequests } from '@/lib/repos/requests';
import { getPayrollPeriods, getPayrollItems } from '@/lib/repos/payroll';
import { getActiveEmployees } from '@/lib/repos/employees';
import { loadStore } from '@/lib/store';
import { thaiDateShort, thaiMonthYear, getMonthRange } from '@/lib/utils';
import { FileSpreadsheet, BarChart3 } from 'lucide-react';

export default function AdminReportsPage() {
  const { session } = useAuth();
  const toast = useToast();
  const store = useMemo(() => loadStore(), []);
  const employees = useMemo(() => session ? getActiveEmployees(session.companyId) : [], [session]);

  const [tab, setTab] = useState<'attendance' | 'payroll' | 'leave'>('attendance');
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);

  const range = getMonthRange(year, month);
  const logs = session ? getLogsByCompany(session.companyId, range.start, range.end) : [];
  const leaveReqs = session ? getLeaveRequests(session.companyId) : [];
  const periods = session ? getPayrollPeriods(session.companyId) : [];
  const period = periods.find((p) => p.period_year === year && p.period_month === month);
  const items = period ? getPayrollItems(period.id) : [];

  const handleExportAttendance = () => {
    if (!session) return;
    const company = store.companies.find((c) => c.id === session.companyId);
    exportAttendanceExcel({ logs, employees, startDate: range.start, endDate: range.end, companyName: company?.name ?? 'บริษัท' });
    toast.success('ส่งออกรายงานเวลาเรียบร้อย');
  };

  const handleExportLeave = () => {
    if (!session) return;
    const company = store.companies.find((c) => c.id === session.companyId);
    const filtered = leaveReqs.filter((r) => r.start_date >= range.start && r.start_date <= range.end);
    exportLeaveExcel({ requests: filtered, employees, startDate: range.start, endDate: range.end, companyName: company?.name ?? 'บริษัท' });
    toast.success('ส่งออกรายงานการลาเรียบร้อย');
  };

  const handleExportPayroll = () => {
    if (!session || !period) { toast.error('ยังไม่มีข้อมูลเงินเดือนรอบนี้'); return; }
    const company = store.companies.find((c) => c.id === session.companyId);
    exportPayrollExcel({ items, employees, period, companyName: company?.name ?? 'บริษัท' });
    toast.success('ส่งออกรายงานเงินเดือนเรียบร้อย');
  };

  return (
    <div>
      <PageHeader title="รายงาน" subtitle="ส่งออก Excel ตามช่วงเวลาที่ต้องการ" />

      <div className="space-y-3 pb-8">
        <div className="pastel-card p-3 flex items-center gap-2">
          <select className="input-base" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (<option key={m} value={m}>เดือน {m}</option>))}
          </select>
          <input type="number" className="input-base w-24" value={year} onChange={(e) => setYear(Number(e.target.value))} />
        </div>

        <div className="flex gap-2">
          {[
            { k: 'attendance', l: 'เวลาเข้างาน' },
            { k: 'payroll', l: 'เงินเดือน' },
            { k: 'leave', l: 'การลา' },
          ].map((t) => (
            <button key={t.k} onClick={() => setTab(t.k as any)} className={`px-3.5 py-1.5 rounded-full text-sm border ${tab === t.k ? 'bg-mint-100 border-mint-300 text-mint-600 font-semibold' : 'bg-white border-border text-ink-muted'}`}>
              {t.l}
            </button>
          ))}
        </div>

        {tab === 'attendance' && (
          <ReportCard
            title="รายงานเวลาเข้า-ออกงาน"
            subtitle={`${thaiDateShort(range.start)} - ${thaiDateShort(range.end)} • ${logs.length} รายการ`}
            description="รายงานนี้รวมการเช็คอิน-เช็คเอาท์ สถานะ ชั่วโมงทำงาน OT และมาสาย"
            onExport={handleExportAttendance}
          />
        )}
        {tab === 'payroll' && (
          <ReportCard
            title="รายงานเงินเดือน"
            subtitle={`${thaiMonthYear(year, month)} • ${items.length} รายการ`}
            description="รายงานนี้รวมค่าแรงพื้นฐาน OT วันหยุด ลา หัก และเงินสุทธิ"
            onExport={handleExportPayroll}
          />
        )}
        {tab === 'leave' && (
          <ReportCard
            title="รายงานการลา"
            subtitle={`${thaiDateShort(range.start)} - ${thaiDateShort(range.end)}`}
            description="รายงานนี้รวมการลาทุกประเภท พร้อมสถานะการอนุมัติ"
            onExport={handleExportLeave}
          />
        )}
      </div>
    </div>
  );
}

function ReportCard({ title, subtitle, description, onExport }: { title: string; subtitle: string; description: string; onExport: () => void }) {
  return (
    <div className="pastel-card p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-mint-200 to-skyblue-200 flex items-center justify-center text-white">
          <BarChart3 className="h-6 w-6" />
        </div>
        <div>
          <h2 className="font-semibold text-ink">{title}</h2>
          <p className="text-xs text-ink-muted">{subtitle}</p>
        </div>
      </div>
      <p className="text-sm text-ink-muted">{description}</p>
      <button onClick={onExport} className="btn-primary mt-4 w-full">
        <FileSpreadsheet className="h-4 w-4" /> ดาวน์โหลด Excel
      </button>
    </div>
  );
}

