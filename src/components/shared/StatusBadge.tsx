import { cn } from '@/lib/utils';
import type { AttendanceStatus, RequestStatus, LocationStatus } from '@/types';

const STATUS_LABEL: Record<string, string> = {
  normal: 'ปกติ',
  late: 'มาสาย',
  early_leave: 'ออกก่อน',
  absent: 'ขาดงาน',
  leave: 'ลา',
  day_off: 'วันหยุด',
  holiday: 'วันหยุดนักขัตฤกษ์',
  forgot_checkout: 'ลืมออกงาน',
  incomplete: 'ข้อมูลไม่ครบ',
  pending: 'รออนุมัติ',
  approved: 'อนุมัติแล้ว',
  rejected: 'ปฏิเสธ',
  no_gps: 'ไม่มี GPS',
  in_area: 'ในพื้นที่',
  out_of_area: 'นอกพื้นที่',
  unchecked: 'ยังไม่ตรวจ',
  draft: 'ร่าง',
  preview: 'พรีวิว',
  locked: 'ล็อกแล้ว',
  active: 'ใช้งาน',
  inactive: 'ปิดใช้งาน',
  resigned: 'ลาออก',
};

const STATUS_COLOR: Record<string, string> = {
  normal: 'badge-mint',
  late: 'badge-peach',
  early_leave: 'badge-peach',
  absent: 'badge-red',
  leave: 'badge-lavender',
  day_off: 'badge-ink',
  holiday: 'badge-pink',
  forgot_checkout: 'badge-blue',
  incomplete: 'badge-peach',
  pending: 'badge-peach',
  approved: 'badge-mint',
  rejected: 'badge-red',
  no_gps: 'badge-ink',
  in_area: 'badge-mint',
  out_of_area: 'badge-red',
  unchecked: 'badge-ink',
  draft: 'badge-ink',
  preview: 'badge-blue',
  locked: 'badge-lavender',
  active: 'badge-mint',
  inactive: 'badge-ink',
  resigned: 'badge-red',
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <span className={cn(STATUS_COLOR[status] ?? 'badge-ink', className)}>
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

export function statusLabel(s: AttendanceStatus | RequestStatus | LocationStatus | string): string {
  return STATUS_LABEL[s] ?? String(s);
}
