import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, LogOut, MapPin, Camera, History as HistoryIcon, CalendarDays, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { Avatar } from '@/components/shared/Avatar';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { thaiDate, thaiDayOfWeek, formatMinutesAsHM, getSetting } from '@/lib/utils';
import { getTodayLog, checkIn, checkOut } from '@/lib/repos/attendance';
import { loadStore } from '@/lib/store';
import { calculateTimesheet, timeStringFromISO } from '@/lib/calculations/timesheet';
import type { AttendanceLog, Shift, PayRule } from '@/types';
import { Skeleton } from '@/components/shared/Skeleton';

function detectDevice(): string {
  if (typeof navigator === 'undefined') return 'unknown';
  return navigator.userAgent.slice(0, 200);
}

export default function EmployeeHomePage() {
  const { session, employee } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [log, setLog] = useState<AttendanceLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [shift, setShift] = useState<Shift | null>(null);
  const [payRule, setPayRule] = useState<PayRule | null>(null);
  const [gpsStatus, setGpsStatus] = useState<'unknown' | 'in_area' | 'out_of_area' | 'no_gps'>('unknown');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationMode, setLocationMode] = useState<string>('warn_only');
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!employee) return;
    setLoading(true);
    const store = loadStore();
    const l = getTodayLog(employee.id);
    setLog(l);
    const sh = store.shifts.find((s) => s.id === employee.default_shift_id) ?? null;
    setShift(sh);
    const pr = store.payRules.find((p) => p.id === employee.pay_rule_id) ?? null;
    setPayRule(pr);
    setLocationMode(getSetting(employee.company_id, 'location_check_mode', 'warn_only'));
    setLoading(false);
  }, [employee]);

  // Try to get GPS only if mode requires it
  useEffect(() => {
    if (locationMode === 'off') return;
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGpsStatus('no_gps');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        // Basic in-area check (server-side will be authoritative)
        const store = loadStore();
        const loc = store.locations.find((l) => l.company_id === employee?.company_id && l.is_active);
        if (loc) {
          const dist = Math.hypot(
            (pos.coords.latitude - loc.latitude) * 111000,
            (pos.coords.longitude - loc.longitude) * 111000,
          );
          setGpsStatus(dist <= loc.radius_meters ? 'in_area' : 'out_of_area');
        } else {
          setGpsStatus('in_area');
        }
      },
      () => setGpsStatus('no_gps'),
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 },
    );
  }, [locationMode, employee]);

  const handleCheckIn = async () => {
    if (!employee || !session) return;
    setBusy(true);
    try {
      const result = checkIn({
        employeeId: employee.id,
        companyId: employee.company_id,
        actorId: session.userId,
        latitude: coords?.lat ?? null,
        longitude: coords?.lng ?? null,
        deviceInfo: detectDevice(),
      });
      if (result.ok) {
        toast.success('เช็คอินสำเร็จ', `เวลา ${timeStringFromISO(result.log?.check_in_at)}`);
        setLog(result.log ?? null);
        if (result.locationStatus === 'out_of_area') {
          toast.warning('อยู่นอกพื้นที่', 'เช็คอินสำเร็จ แต่อยู่นอกรัศมีที่กำหนด');
        }
      } else {
        toast.error('เช็คอินไม่สำเร็จ', result.message);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleCheckOut = async () => {
    if (!employee || !session) return;
    setBusy(true);
    try {
      const result = checkOut({
        employeeId: employee.id,
        companyId: employee.company_id,
        actorId: session.userId,
        latitude: coords?.lat ?? null,
        longitude: coords?.lng ?? null,
      });
      if (result.ok) {
        toast.success('เช็คเอาท์สำเร็จ', `เวลา ${timeStringFromISO(result.log?.check_out_at)}`);
        setLog(result.log ?? null);
      } else {
        toast.error('เช็คเอาท์ไม่สำเร็จ', result.message);
      }
    } finally {
      setBusy(false);
    }
  };

  // Compute today's summary
  const summary = (() => {
    if (!employee || !log) return null;
    return calculateTimesheet({
      employee,
      workDate: new Date().toISOString().slice(0, 10),
      shift,
      attendanceLog: log,
      holiday: null,
      approvedLeave: null,
      payRule,
    });
  })();

  const canCheckIn = !log?.check_in_at;
  const canCheckOut = log?.check_in_at && !log?.check_out_at;
  const isFinished = log?.check_in_at && log?.check_out_at;

  return (
    <div className="space-y-4">
      {/* Greeting Card */}
      <section className="pastel-card p-5 bg-gradient-to-br from-mint-100 via-bg to-skyblue-100">
        <div className="flex items-center gap-3">
          <Avatar name={employee?.full_name ?? ''} color={employee?.avatar_color} size="lg" />
          <div className="flex-1">
            <div className="text-sm text-ink-muted">{thaiDayOfWeek(now)}</div>
            <div className="font-display text-lg font-semibold text-ink">
              สวัสดี, {employee?.nickname ?? employee?.full_name?.split(' ')[0] ?? 'พนักงาน'}
            </div>
            <div className="text-xs text-ink-muted">{thaiDate(now)} • {now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} น.</div>
          </div>
        </div>
      </section>

      {/* Status Card */}
      <section className="pastel-card p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-ink">สถานะวันนี้</h2>
          {log && <StatusBadge status={summary?.status ?? 'normal'} />}
        </div>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-ink-muted text-xs">กะ</div>
              <div className="font-medium">{shift?.name ?? 'ไม่ระบุ'} {shift && <span className="text-ink-muted">({shift.start_time}–{shift.end_time})</span>}</div>
            </div>
            <div>
              <div className="text-ink-muted text-xs">สูตรเงินเดือน</div>
              <div className="font-medium">{payRule?.name ?? '—'}</div>
            </div>
            <div>
              <div className="text-ink-muted text-xs">เช็คอิน</div>
              <div className="font-medium text-ink">{timeStringFromISO(log?.check_in_at)}</div>
            </div>
            <div>
              <div className="text-ink-muted text-xs">เช็คเอาท์</div>
              <div className="font-medium text-ink">{timeStringFromISO(log?.check_out_at)}</div>
            </div>
            <div>
              <div className="text-ink-muted text-xs">ชั่วโมงทำงาน</div>
              <div className="font-medium text-ink">{formatMinutesAsHM(summary?.paid_minutes ?? 0)}</div>
            </div>
            <div>
              <div className="text-ink-muted text-xs">OT</div>
              <div className="font-medium text-ink">{formatMinutesAsHM(summary?.ot_minutes ?? 0)}</div>
            </div>
          </div>
        )}

        {/* GPS status (only if not off) */}
        {locationMode !== 'off' && (
          <div className="mt-4 flex items-center gap-2 text-xs">
            <MapPin className="h-4 w-4 text-ink-muted" />
            {gpsStatus === 'in_area' && <span className="badge-mint">อยู่ในพื้นที่</span>}
            {gpsStatus === 'out_of_area' && <span className="badge-red">นอกพื้นที่</span>}
            {gpsStatus === 'no_gps' && <span className="badge-ink">ไม่ได้เปิด GPS</span>}
            {gpsStatus === 'unknown' && <span className="text-ink-muted">กำลังตรวจ GPS...</span>}
            {log?.location_status && log.location_status !== 'unchecked' && (
              <span className="text-ink-muted">• บันทึก: {log.location_status}</span>
            )}
          </div>
        )}
      </section>

      {/* Action Buttons */}
      <section className="grid grid-cols-1 gap-3">
        {canCheckIn && (
          <button onClick={handleCheckIn} className="btn-primary w-full text-lg py-5" disabled={busy || loading}>
            <LogIn className="h-6 w-6" />
            {busy ? 'กำลังบันทึก...' : 'เข้างาน'}
          </button>
        )}
        {canCheckOut && (
          <button onClick={handleCheckOut} className="btn-primary w-full text-lg py-5" disabled={busy || loading}>
            <LogOut className="h-6 w-6" />
            {busy ? 'กำลังบันทึก...' : 'ออกงาน'}
          </button>
        )}
        {isFinished && (
          <div className="pastel-card p-4 flex items-center gap-3 bg-mint-50 border-mint-200">
            <CheckCircle2 className="h-6 w-6 text-mint-600" />
            <div className="flex-1">
              <div className="font-semibold text-ink">ทำงานเสร็จวันนี้แล้ว</div>
              <div className="text-xs text-ink-muted">รวม {formatMinutesAsHM(summary?.paid_minutes ?? 0)} • OT {formatMinutesAsHM(summary?.ot_minutes ?? 0)}</div>
            </div>
          </div>
        )}
        {!log && !loading && (
          <div className="pastel-card p-4 flex items-center gap-3 bg-peach-50 border-peach-200">
            <AlertTriangle className="h-5 w-5 text-peach-500" />
            <div className="text-sm text-ink-muted">ยังไม่มีบันทึกเวลาวันนี้ กดปุ่ม "เข้างาน" เพื่อเริ่ม</div>
          </div>
        )}
      </section>

      {/* Quick actions */}
      <section className="grid grid-cols-3 gap-2">
        <button onClick={() => navigate('/employee/history')} className="pastel-card p-3 flex flex-col items-center gap-1 hover:bg-mint-50">
          <HistoryIcon className="h-5 w-5 text-mint-600" />
          <span className="text-xs">ประวัติ</span>
        </button>
        <button onClick={() => navigate('/employee/adjust')} className="pastel-card p-3 flex flex-col items-center gap-1 hover:bg-skyblue-50">
          <Camera className="h-5 w-5 text-skyblue-500" />
          <span className="text-xs">ขอแก้เวลา</span>
        </button>
        <button onClick={() => navigate('/employee/leave')} className="pastel-card p-3 flex flex-col items-center gap-1 hover:bg-lavender-50">
          <CalendarDays className="h-5 w-5 text-lavender-500" />
          <span className="text-xs">ลางาน</span>
        </button>
      </section>
    </div>
  );
}
