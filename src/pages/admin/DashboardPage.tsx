import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeader } from '@/components/shared/PageHeader';
import { Avatar } from '@/components/shared/Avatar';
import { StatusBadge, statusLabel } from '@/components/shared/StatusBadge';
import { loadStore } from '@/lib/store';
import { calculateTimesheet, timeStringFromISO } from '@/lib/calculations/timesheet';
import { thaiDate, formatMinutesAsHM, todayISO, formatCurrency } from '@/lib/utils';
import { Users, UserCheck, UserX, Clock4, AlertCircle, Wallet, BarChart3, Settings as SettingsIcon, ScrollText, CalendarOff, MapPin } from 'lucide-react';

export default function AdminDashboardPage() {
  const { session } = useAuth();
  const store = useMemo(() => loadStore(), []);
  const today = todayISO();

  const employees = store.employees.filter((e) => e.company_id === session?.companyId);
  const activeEmployees = employees.filter((e) => e.status === 'active');
  const todayLogs = store.attendanceLogs.filter((l) => l.company_id === session?.companyId && l.work_date === today);
  const shifts = store.shifts.filter((s) => s.company_id === session?.companyId);
  const payRules = store.payRules.filter((r) => r.company_id === session?.companyId);

  const summaries = activeEmployees.map((e) => {
    const log = todayLogs.find((l) => l.employee_id === e.id) ?? null;
    const shift = shifts.find((s) => s.id === e.default_shift_id) ?? null;
    const payRule = payRules.find((r) => r.id === e.pay_rule_id) ?? null;
    const ts = calculateTimesheet({
      employee: e, workDate: today, shift, attendanceLog: log, holiday: null, approvedLeave: null, payRule,
    });
    return { emp: e, log, shift, payRule, ts };
  });

  const stats = {
    total: activeEmployees.length,
    checkedIn: summaries.filter((s) => s.log?.check_in_at).length,
    notCheckedIn: summaries.filter((s) => !s.log?.check_in_at).length,
    late: summaries.filter((s) => s.ts.late_minutes > 0).length,
    absent: summaries.filter((s) => s.ts.status === 'absent').length,
    leave: summaries.filter((s) => s.ts.status === 'leave').length,
    forgot: summaries.filter((s) => s.ts.status === 'forgot_checkout').length,
    totalWorkMinutes: summaries.reduce((sum, s) => sum + s.ts.paid_minutes, 0),
    totalOtMinutes: summaries.reduce((sum, s) => sum + s.ts.ot_minutes, 0),
  };

  // Estimated cost
  const estimatedCost = summaries.reduce((sum, s) => {
    if (!s.payRule) return sum;
    if (s.ts.status === 'absent') return sum;
    if (s.ts.status === 'leave' || s.ts.status === 'day_off' || s.ts.status === 'holiday') return sum;
    const hours = s.ts.paid_minutes / 60;
    if (s.payRule.employment_type === 'parttime') {
      return sum + hours * s.payRule.hourly_rate + (s.ts.ot_minutes / 60) * s.payRule.ot_rate;
    }
    if (hours >= s.payRule.standard_hours_per_day) return sum + s.payRule.daily_rate;
    return sum + hours * s.payRule.hourly_rate;
  }, 0);

  const pendingLeave = store.leaveRequests.filter((r) => r.company_id === session?.companyId && r.status === 'pending').length;
  const pendingAdj = store.timeAdjustmentRequests.filter((r) => r.company_id === session?.companyId && r.status === 'pending').length;

  return (
    <div>
      <PageHeader title="แดชบอร์ด" subtitle={thaiDate(new Date())} />

      <div className="space-y-4 pb-8">
        {/* Top summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <SummaryCard icon={<Users className="h-5 w-5" />} label="พนักงานทั้งหมด" value={stats.total} color="bg-mint-100 text-mint-600" />
          <SummaryCard icon={<UserCheck className="h-5 w-5" />} label="เข้างานแล้ว" value={stats.checkedIn} color="bg-skyblue-100 text-skyblue-500" />
          <SummaryCard icon={<UserX className="h-5 w-5" />} label="ยังไม่เข้า" value={stats.notCheckedIn} color="bg-peach-100 text-peach-500" />
          <SummaryCard icon={<AlertCircle className="h-5 w-5" />} label="มาสาย" value={stats.late} color="bg-pink-100 text-pink-500" />
          <SummaryCard icon={<CalendarOff className="h-5 w-5" />} label="ลา" value={stats.leave} color="bg-lavender-100 text-lavender-500" />
          <SummaryCard icon={<UserX className="h-5 w-5" />} label="ขาดงาน" value={stats.absent} color="bg-softred-100 text-softred-400" />
          <SummaryCard icon={<Clock4 className="h-5 w-5" />} label="ลืมออกงาน" value={stats.forgot} color="bg-peach-100 text-peach-500" />
          <SummaryCard icon={<Wallet className="h-5 w-5" />} label="ค่าแรงประมาณการ" value={`${formatCurrency(estimatedCost)} ฿`} color="bg-mint-100 text-mint-600" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="pastel-card p-4">
            <div className="text-xs text-ink-muted">ชั่วโมงรวมวันนี้</div>
            <div className="text-2xl font-bold text-ink">{formatMinutesAsHM(stats.totalWorkMinutes)}</div>
          </div>
          <div className="pastel-card p-4">
            <div className="text-xs text-ink-muted">OT วันนี้</div>
            <div className="text-2xl font-bold text-ink">{formatMinutesAsHM(stats.totalOtMinutes)}</div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          <QuickAction to="/admin/employees" label="เพิ่มพนักงาน" icon={<Users className="h-5 w-5" />} color="bg-mint-100 text-mint-600" />
          <QuickAction to="/admin/approvals" label="อนุมัติคำขอ" icon={<ScrollText className="h-5 w-5" />} color="bg-skyblue-100 text-skyblue-500" badge={pendingLeave + pendingAdj} />
          <QuickAction to="/admin/payroll" label="คำนวณเงินเดือน" icon={<Wallet className="h-5 w-5" />} color="bg-lavender-100 text-lavender-500" />
          <QuickAction to="/admin/reports" label="รายงาน" icon={<BarChart3 className="h-5 w-5" />} color="bg-peach-100 text-peach-500" />
          <QuickAction to="/admin/attendance" label="เวลาเข้างาน" icon={<Clock4 className="h-5 w-5" />} color="bg-pink-100 text-pink-500" />
          <QuickAction to="/admin/settings" label="ตั้งค่า" icon={<SettingsIcon className="h-5 w-5" />} color="bg-bg text-ink-muted" />
        </div>

        {/* Today list */}
        <section className="pastel-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-ink">รายการพนักงานวันนี้</h2>
            <span className="text-xs text-ink-muted">{summaries.length} คน</span>
          </div>
          <div className="space-y-2">
            {summaries.map(({ emp, log, shift, ts }) => (
              <div key={emp.id} className="flex items-center gap-3 p-2.5 rounded-2xl border border-border/40 hover:bg-mint-50/40">
                <Avatar name={emp.full_name} color={emp.avatar_color} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-ink truncate">{emp.full_name}</div>
                  <div className="text-xs text-ink-muted truncate">
                    {shift?.name ?? 'ไม่มีกะ'} • เข้า {timeStringFromISO(log?.check_in_at)} • ออก {timeStringFromISO(log?.check_out_at)}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <StatusBadge status={ts.status} />
                  {log?.location_status && log.location_status !== 'unchecked' && (
                    <span className="text-[10px] text-ink-muted inline-flex items-center gap-0.5">
                      <MapPin className="h-3 w-3" />
                      {statusLabel(log.location_status)}
                    </span>
                  )}
                </div>
              </div>
            ))}
            {summaries.length === 0 && <div className="text-sm text-ink-muted text-center py-6">ยังไม่มีพนักงาน</div>}
          </div>
        </section>
      </div>
    </div>
  );
}

function SummaryCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: React.ReactNode; color: string }) {
  return (
    <div className="pastel-card p-3.5">
      <div className={`inline-flex h-9 w-9 items-center justify-center rounded-2xl ${color} mb-2`}>{icon}</div>
      <div className="text-xs text-ink-muted">{label}</div>
      <div className="text-xl font-bold text-ink mt-0.5">{value}</div>
    </div>
  );
}

function QuickAction({ to, label, icon, color, badge }: { to: string; label: string; icon: React.ReactNode; color: string; badge?: number }) {
  return (
    <Link to={to} className="pastel-card p-3 flex flex-col items-center gap-1.5 hover:bg-mint-50 relative">
      {badge && badge > 0 ? (
        <span className="absolute top-2 right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-softred-200 text-softred-400 text-[10px] flex items-center justify-center font-bold">{badge}</span>
      ) : null}
      <div className={`h-9 w-9 rounded-2xl flex items-center justify-center ${color}`}>{icon}</div>
      <span className="text-xs text-ink text-center leading-tight">{label}</span>
    </Link>
  );
}

