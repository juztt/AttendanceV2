import { useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { thaiDateShort, thaiDayOfWeek, formatMinutesAsHM, todayISO, getMonthRange } from '@/lib/utils';
import { getLogsByEmployee } from '@/lib/repos/attendance';
import { loadStore } from '@/lib/store';
import { calculateTimesheet, timeStringFromISO } from '@/lib/calculations/timesheet';

import { EmptyState } from '@/components/shared/EmptyState';
import { History as HistoryIcon } from 'lucide-react';

type RangeKey = 'today' | 'week' | 'month' | 'custom';

function getWeekRange(): { start: string; end: string } {
  const d = new Date();
  const day = d.getDay();
  const diffToMon = (day + 6) % 7;
  const mon = new Date(d);
  mon.setDate(d.getDate() - diffToMon);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  return {
    start: mon.toISOString().slice(0, 10),
    end: sun.toISOString().slice(0, 10),
  };
}

export default function EmployeeHistoryPage() {
  const { employee } = useAuth();
  const [range, setRange] = useState<RangeKey>('month');
  const [customMonth, setCustomMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const { start, end } = useMemo(() => {
    if (range === 'today') return { start: todayISO(), end: todayISO() };
    if (range === 'week') return getWeekRange();
    if (range === 'month') {
      const d = new Date();
      return getMonthRange(d.getFullYear(), d.getMonth() + 1);
    }
    const [y, m] = customMonth.split('-').map(Number);
    return getMonthRange(y, m);
  }, [range, customMonth]);

  const logs = useMemo(() => (employee ? getLogsByEmployee(employee.id, start, end) : []), [employee, start, end]);
  const store = useMemo(() => loadStore(), [logs]);
  const shift = useMemo(() => employee ? store.shifts.find((s) => s.id === employee.default_shift_id) ?? null : null, [employee, store]);
  const payRule = useMemo(() => employee ? store.payRules.find((p) => p.id === employee.pay_rule_id) ?? null : null, [employee, store]);

  const items = useMemo(() => {
    return logs.map((l) => {
      const ts = calculateTimesheet({
        employee: employee!,
        workDate: l.work_date,
        shift,
        attendanceLog: l,
        holiday: store.holidays.find((h) => h.holiday_date === l.work_date) ?? null,
        approvedLeave: store.leaveRequests.find((r) => r.employee_id === l.employee_id && r.status === 'approved' && r.start_date <= l.work_date && r.end_date >= l.work_date) ?? null,
        payRule,
      });
      return { log: l, ts };
    });
  }, [logs, employee, shift, payRule, store]);

  return (
    <div>
      <PageHeader title="ประวัติเวลาเข้า-ออก" subtitle={`${thaiDateShort(start)} – ${thaiDateShort(end)}`} />

      <div className="mb-3 flex gap-2 overflow-x-auto scrollbar-thin">
        {[
          { k: 'today', l: 'วันนี้' },
          { k: 'week', l: 'สัปดาห์นี้' },
          { k: 'month', l: 'เดือนนี้' },
          { k: 'custom', l: 'เลือกเดือน' },
        ].map((t) => (
          <button
            key={t.k}
            onClick={() => setRange(t.k as RangeKey)}
            className={`px-3.5 py-1.5 rounded-full text-sm border transition-colors whitespace-nowrap ${range === t.k ? 'bg-mint-100 border-mint-300 text-mint-600 font-semibold' : 'bg-white border-border text-ink-muted hover:bg-bg'}`}
          >
            {t.l}
          </button>
        ))}
      </div>

      {range === 'custom' && (
        <div className="mb-3">
          <input type="month" className="input-base max-w-[200px]" value={customMonth} onChange={(e) => setCustomMonth(e.target.value)} />
        </div>
      )}

      <div className="space-y-3 pb-8">
        {items.length === 0 ? (
          <EmptyState
            icon={<HistoryIcon className="h-6 w-6" />}
            title="ยังไม่มีบันทึก"
            description="ลองเปลี่ยนช่วงวันที่ หรือเช็คอินวันนี้ก่อนนะ"
          />
        ) : items.map(({ log, ts }) => (
          <article key={log.id} className="pastel-card p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="text-sm font-semibold text-ink">{thaiDateShort(log.work_date)}</div>
                <div className="text-xs text-ink-muted">{thaiDayOfWeek(log.work_date)}</div>
              </div>
              <StatusBadge status={ts.status} />
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3 text-sm">
              <div>
                <div className="text-xs text-ink-muted">เข้า</div>
                <div className="font-medium">{timeStringFromISO(log.check_in_at)}</div>
              </div>
              <div>
                <div className="text-xs text-ink-muted">ออก</div>
                <div className="font-medium">{timeStringFromISO(log.check_out_at)}</div>
              </div>
              <div>
                <div className="text-xs text-ink-muted">ชั่วโมง</div>
                <div className="font-medium">{formatMinutesAsHM(ts.paid_minutes)}</div>
              </div>
              <div>
                <div className="text-xs text-ink-muted">OT</div>
                <div className="font-medium">{formatMinutesAsHM(ts.ot_minutes)}</div>
              </div>
              {ts.late_minutes > 0 && (
                <div className="col-span-2 text-xs text-peach-500">มาสาย {ts.late_minutes} นาที</div>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

