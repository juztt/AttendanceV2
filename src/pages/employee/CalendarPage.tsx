// Employee-facing calendar: same view as AdminCalendarPage but
// without the cross-company attendance overlay. The month grid
// highlights Thai public holidays and the user's own check-in
// status.
import { useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeader } from '@/components/shared/PageHeader';
import { thaiDateShort, getMonthRange } from '@/lib/utils';
import { loadStore } from '@/lib/store';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { syncAllFromSupabase } from '@/lib/repos/employees';
import { getLogsByEmployee } from '@/lib/repos/attendance';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';

const DAY_LABELS = ['อา', 'จ', 'อ', 'พ', 'ศ', 'ส', 'อา'];

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

function buildMonthGrid(viewMonth: Date): Array<Date | null> {
  const first = startOfMonth(viewMonth);
  const firstWeekday = first.getDay();
  const lastDay = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate();
  const cells: Array<Date | null> = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= lastDay; d++) cells.push(new Date(viewMonth.getFullYear(), viewMonth.getMonth(), d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

const MONTH_LABELS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];

export default function EmployeeCalendarPage() {
  const { session, employee } = useAuth();
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(new Date()));
  const [refresh, setRefresh] = useState(0);

  useMemo(() => {
    if (!session || !isSupabaseConfigured) return;
    syncAllFromSupabase(session.companyId).then(() => setRefresh((n) => n + 1));
  }, [session?.companyId, viewMonth.getFullYear(), viewMonth.getMonth()]);

  const store = useMemo(() => loadStore(), [refresh, viewMonth]);

  const holidaysInMonth = useMemo(() => {
    const y = viewMonth.getFullYear();
    const m = viewMonth.getMonth();
    return store.holidays.filter((h) => {
      const d = new Date(h.holiday_date);
      return d.getFullYear() === y && d.getMonth() === m;
    });
  }, [store.holidays, viewMonth]);

  const holidayByDate = useMemo(() => {
    const m = new Map<string, typeof holidaysInMonth>();
    for (const h of holidaysInMonth) {
      const arr = m.get(h.holiday_date) ?? [];
      arr.push(h);
      m.set(h.holiday_date, arr);
    }
    return m;
  }, [holidaysInMonth]);

  const cells = useMemo(() => buildMonthGrid(viewMonth), [viewMonth]);
  const today = new Date();

  const { start, end } = getMonthRange(viewMonth.getFullYear(), viewMonth.getMonth() + 1);
  const myLogs = useMemo(
    () => (employee ? getLogsByEmployee(employee.id, start, end) : []),
    [employee, start, end],
  );
  const myLogByDate = useMemo(() => {
    const m = new Map<string, typeof myLogs[number]>();
    for (const l of myLogs) if (!m.has(l.work_date)) m.set(l.work_date, l);
    return m;
  }, [myLogs]);

  return (
    <div>
      <PageHeader
        title="ปฏิทิน"
        subtitle={`${MONTH_LABELS[viewMonth.getMonth()]} ${viewMonth.getFullYear() + 543}`}
        actions={
          <div className="flex items-center gap-1">
            <button
              onClick={() => setViewMonth((m) => addMonths(m, -1))}
              className="h-9 w-9 rounded-full bg-white border border-border flex items-center justify-center text-ink-muted hover:text-ink"
              aria-label="เดือนก่อนหน้า"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMonth(startOfMonth(new Date()))}
              className="px-3 h-9 rounded-full bg-white border border-border text-sm text-ink-muted hover:text-ink"
            >
              วันนี้
            </button>
            <button
              onClick={() => setViewMonth((m) => addMonths(m, 1))}
              className="h-9 w-9 rounded-full bg-white border border-border flex items-center justify-center text-ink-muted hover:text-ink"
              aria-label="เดือนถัดไป"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        }
      />

      <div className="space-y-4 pb-8">
        <div className="flex flex-wrap gap-3 text-xs text-ink-muted">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-sm bg-softred-100 border border-softred-200" />
            วันหยุด (x2)
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-sm bg-mint-100 border border-mint-200" />
            วันสำคัญ (x1)
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-sm bg-skyblue-100 border border-skyblue-200" />
            วันนี้
          </span>
        </div>

        <div className="pastel-card p-3 sm:p-4">
          <div className="grid grid-cols-7 gap-1 mb-2">
            {DAY_LABELS.map((d, i) => (
              <div
                key={i}
                className={`text-center text-[11px] font-semibold ${
                  i === 0 || i === 6 ? 'text-softred-400' : 'text-ink-muted'
                }`}
              >
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((d, i) => {
              if (!d) return <div key={i} className="aspect-square" />;
              const isoDate = d.toISOString().slice(0, 10);
              const hols = holidayByDate.get(isoDate) ?? [];
              const isWeekend = d.getDay() === 0 || d.getDay() === 6;
              const isToday = sameDay(d, today);
              const myLog = myLogByDate.get(isoDate);

              const bg = hols.length
                ? hols[0].multiplier >= 2
                  ? 'bg-softred-100 border-softred-200'
                  : 'bg-mint-100 border-mint-200'
                : isWeekend
                  ? 'bg-bg border-border'
                  : 'bg-white border-border';
              const ring = isToday ? 'ring-2 ring-skyblue-300' : '';
              const text = hols.length ? 'text-softred-400' : isWeekend ? 'text-softred-400' : 'text-ink';

              return (
                <div
                  key={i}
                  className={`relative aspect-square border rounded-2xl p-1.5 flex flex-col ${bg} ${ring}`}
                >
                  <div className={`text-xs font-semibold ${text}`}>{d.getDate()}</div>
                  {hols.length > 0 && (
                    <div className="mt-auto space-y-0.5 overflow-hidden">
                      {hols.slice(0, 2).map((h) => (
                        <div key={h.id} className="text-[10px] leading-tight text-softred-400 truncate" title={h.name}>
                          {h.name}
                        </div>
                      ))}
                      {hols.length > 2 && <div className="text-[10px] text-ink-muted">+{hols.length - 2}</div>}
                    </div>
                  )}
                  {myLog && (
                    <div className="absolute bottom-1 right-1 text-[9px] font-semibold text-mint-600 bg-mint-50 px-1.5 py-0.5 rounded-full">
                      {myLog.check_in_at ? '✓' : '–'}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="pastel-card p-4">
          <h2 className="font-semibold text-ink mb-3 flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            วันหยุดเดือนนี้ ({holidaysInMonth.length})
          </h2>
          {holidaysInMonth.length === 0 ? (
            <p className="text-sm text-ink-muted">ไม่มีวันหยุดในเดือนนี้</p>
          ) : (
            <ul className="space-y-2">
              {holidaysInMonth
                .slice()
                .sort((a, b) => a.holiday_date.localeCompare(b.holiday_date))
                .map((h) => (
                  <li key={h.id} className="flex items-center gap-3 text-sm">
                    <span className="inline-block px-2 py-0.5 rounded-full bg-softred-100 text-softred-400 text-xs font-semibold">
                      {thaiDateShort(h.holiday_date)}
                    </span>
                    <span className="flex-1 text-ink">{h.name}</span>
                    <span className="text-xs text-ink-muted">x{h.multiplier}</span>
                  </li>
                ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
