import { useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeader } from '@/components/shared/PageHeader';
import { thaiDateShort, getMonthRange } from '@/lib/utils';
import { loadStore } from '@/lib/store';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { syncAllFromSupabase } from '@/lib/repos/employees';
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
  // 6 rows x 7 cols; leading empty cells, trailing empty cells.
  const first = startOfMonth(viewMonth);
  const firstWeekday = first.getDay(); // 0 = Sunday
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

/**
 * Combined calendar view: shows the Thai public-holiday calendar
 * (from Supabase/local store) plus, for admins, all employee
 * attendance status for the month.
 *
 * Holidays source: same store path as the rest of the app
 * (Supabase via syncAllFromSupabase, fallback to localStorage).
 * Each holiday cell shows a 2x multiplier marker so the user
 * knows that day's OT or shift pay is double.
 */
export default function CalendarPage() {
  const { session } = useAuth();
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(new Date()));
  const [refresh, setRefresh] = useState(0);

  // Pull the latest reference data (holidays) from Supabase on mount
  // and on month change so newly-added holidays show up without a
  // full page reload.
  useMemo(() => {
    if (!session || !isSupabaseConfigured) return;
    syncAllFromSupabase(session.companyId).then(() => setRefresh((n) => n + 1));
  }, [session?.companyId, viewMonth.getFullYear(), viewMonth.getMonth()]);

  const store = useMemo(() => loadStore(), [refresh, viewMonth]);

  // Holidays for the viewed month (any year)
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

  // (admin only) — count by status for the month
  const attendanceByDate = useMemo(() => {
    if (!session || session.role !== 'owner' && session.role !== 'admin') return new Map();
    const logs = store.attendanceLogs.filter(
      (l) => l.company_id === session.companyId && l.work_date >= start && l.work_date <= end,
    );
    // group by work_date -> sample first log
    const m = new Map<string, typeof logs[number]>();
    for (const l of logs) {
      if (!m.has(l.work_date)) m.set(l.work_date, l);
    }
    return m;
  }, [session, store, start, end]);

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
        {/* Legend */}
        <div className="flex flex-wrap gap-3 text-xs text-ink-muted">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-sm bg-softred-100 border border-softred-200" />
            วันหยุด (x2)
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-sm bg-mint-100 border border-mint-200" />
            วันสำคัญ / วันหยุดพิเศษ (x1)
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-sm bg-skyblue-100 border border-skyblue-200" />
            วันนี้
          </span>
        </div>

        {/* Month grid */}
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
              if (!d) {
                return <div key={i} className="aspect-square" />;
              }
              const isoDate = d.toISOString().slice(0, 10);
              const hols = holidayByDate.get(isoDate) ?? [];
              const isWeekend = d.getDay() === 0 || d.getDay() === 6;
              const isToday = sameDay(d, today);
              const att = attendanceByDate.get(isoDate);

              // holiday cell colour
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
                        <div
                          key={h.id}
                          className="text-[10px] leading-tight text-softred-400 truncate"
                          title={h.name}
                        >
                          {h.name}
                        </div>
                      ))}
                      {hols.length > 2 && (
                        <div className="text-[10px] text-ink-muted">+{hols.length - 2}</div>
                      )}
                    </div>
                  )}
                  {att && (
                    <div className="absolute bottom-1 right-1 text-[9px] font-semibold text-mint-600 bg-mint-50 px-1.5 py-0.5 rounded-full">
                      {att.check_in_at ? '✓' : '–'}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Holiday list for the month (readable on small screens) */}
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
