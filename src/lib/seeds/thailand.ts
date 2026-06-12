// Default seed data for a brand-new company.
//
// Applied once per company (idempotent: existing rows are skipped
// on the Supabase path; in demo mode the localStorage is reseeded
// from this file only on first run).
//
// Holiday source: kapook.com — Thai government-issued holiday list
// (https://calendar.kapook.com/2569/holiday). Covers the current
// and following Thai calendar year so the app is useful on day one
// without the owner having to type every date.
//
// When the cabinet formally announces each year's holiday schedule,
// the new dates can be appended to HOLIDAY_TEMPLATES below and
// the seedCompanyDefaults() call will add them on next login.

import type { Shift, PayRule, Holiday, Location, LeaveType } from '@/types';

// Fixed UUIDs so the seed is deterministic and idempotent. The
// company_id is injected at seed time — these IDs are stable
// across runs and across the demo / Supabase paths.
const ID = {
  // Shifts
  shiftMorning: 'sh-morning',
  shiftEvening: 'sh-evening',
  shiftNight: 'sh-night',
  shiftParttime: 'sh-parttime',

  // Pay rules (3 สูตร spec)
  payFulltimePassed: 'pr-fulltime-passed',
  payFulltimeNotPassed: 'pr-fulltime-not-passed',
  payParttime: 'pr-parttime',

  // Leave types
  ltSick: 'lt-sick',
  ltPersonal: 'lt-personal',
  ltVacation: 'lt-vacation',
  ltUnpaid: 'lt-unpaid',

  // Location (default: Bangkok city centre, owner can edit later)
  locMain: 'loc-main',
} as const;

const NOW = new Date().toISOString();

export const SHIFT_TEMPLATES: Omit<Shift, 'company_id'>[] = [
  {
    id: ID.shiftMorning,
    name: 'กะเช้า',
    start_time: '08:00',
    end_time: '17:00',
    break_minutes: 60,
    standard_hours: 8,
    grace_minutes: 15,
    ot_enabled: true,
    color: '#A7F3D0',
    is_active: true,
    created_at: NOW,
    updated_at: NOW,
  },
  {
    id: ID.shiftEvening,
    name: 'กะบ่าย',
    start_time: '13:00',
    end_time: '22:00',
    break_minutes: 60,
    standard_hours: 8,
    grace_minutes: 15,
    ot_enabled: true,
    color: '#BFDBFE',
    is_active: true,
    created_at: NOW,
    updated_at: NOW,
  },
  {
    id: ID.shiftNight,
    name: 'กะดึก',
    start_time: '22:00',
    end_time: '07:00',
    break_minutes: 60,
    standard_hours: 8,
    grace_minutes: 15,
    ot_enabled: true,
    color: '#C4B5FD',
    is_active: true,
    created_at: NOW,
    updated_at: NOW,
  },
  {
    id: ID.shiftParttime,
    name: 'พาร์ทไทม์',
    start_time: '10:00',
    end_time: '17:00',
    break_minutes: 30,
    standard_hours: 6,
    grace_minutes: 10,
    ot_enabled: false,
    color: '#FED7AA',
    is_active: true,
    created_at: NOW,
    updated_at: NOW,
  },
];

export const PAY_RULE_TEMPLATES: Omit<PayRule, 'company_id'>[] = [
  {
    id: ID.payFulltimePassed,
    name: 'ประจำผ่านโปร',
    employment_type: 'fulltime_passed',
    standard_hours_per_day: 8,
    daily_rate: 400,
    hourly_rate: 50,
    ot_rate: 75,
    holiday_multiplier: 2,
    personal_day_off_paid: true,
    personal_day_off_pay: 400,
    sick_paid: true,
    sick_pay_per_day: 350,
    personal_leave_paid: false,
    personal_leave_pay_per_day: 0,
    vacation_paid: true,
    vacation_pay_per_day: 400,
    is_active: true,
    created_at: NOW,
    updated_at: NOW,
  },
  {
    id: ID.payFulltimeNotPassed,
    name: 'ประจำยังไม่ผ่านโปร',
    employment_type: 'fulltime_not_passed',
    standard_hours_per_day: 8,
    daily_rate: 350,
    hourly_rate: 44,
    ot_rate: 66,
    holiday_multiplier: 2,
    personal_day_off_paid: true,
    personal_day_off_pay: 350,
    sick_paid: true,
    sick_pay_per_day: 300,
    personal_leave_paid: false,
    personal_leave_pay_per_day: 0,
    vacation_paid: false,
    vacation_pay_per_day: 0,
    is_active: true,
    created_at: NOW,
    updated_at: NOW,
  },
  {
    id: ID.payParttime,
    name: 'พาร์ทไทม์',
    employment_type: 'parttime',
    standard_hours_per_day: 6,
    daily_rate: 300,
    hourly_rate: 50,
    ot_rate: 75,
    holiday_multiplier: 2,
    personal_day_off_paid: false,
    personal_day_off_pay: 0,
    sick_paid: false,
    sick_pay_per_day: 0,
    personal_leave_paid: false,
    personal_leave_pay_per_day: 0,
    vacation_paid: false,
    vacation_pay_per_day: 0,
    is_active: true,
    created_at: NOW,
    updated_at: NOW,
  },
];

export const LEAVE_TYPE_TEMPLATES: Omit<LeaveType, 'company_id'>[] = [
  {
    id: ID.ltSick,
    name: 'ลาป่วย',
    category: 'sick',
    paid: true,
    requires_certificate: true,
    max_days_per_year: 30,
    is_active: true,
    created_at: NOW,
    updated_at: NOW,
  },
  {
    id: ID.ltPersonal,
    name: 'ลากิจ',
    category: 'personal',
    paid: false,
    requires_certificate: false,
    max_days_per_year: 6,
    is_active: true,
    created_at: NOW,
    updated_at: NOW,
  },
  {
    id: ID.ltVacation,
    name: 'ลาพักร้อน',
    category: 'vacation',
    paid: true,
    requires_certificate: false,
    max_days_per_year: 6,
    is_active: true,
    created_at: NOW,
    updated_at: NOW,
  },
  {
    id: ID.ltUnpaid,
    name: 'ลาไม่รับเงิน',
    category: 'unpaid',
    paid: false,
    requires_certificate: false,
    max_days_per_year: null,
    is_active: true,
    created_at: NOW,
    updated_at: NOW,
  },
];

export const LOCATION_TEMPLATES: Omit<Location, 'company_id'>[] = [
  {
    id: ID.locMain,
    name: 'สำนักงานใหญ่',
    latitude: 13.7563,
    longitude: 100.5018,
    radius_meters: 200,
    is_active: true,
    created_at: NOW,
    updated_at: NOW,
  },
];

/**
 * Thai public-holiday seed.
 *
 * Source: https://calendar.kapook.com/2569/holiday (mirrors the
 * official cabinet announcements). Listed in ISO YYYY-MM-DD so
 * they sort correctly. The year columns are kept as plain dates —
 * the seed is regenerated each year from the same template
 * (the seedCompanyDefaults function only inserts holidays that
 * do not already exist, so this is additive).
 *
 * multiplier: 1 for non-statutory (e.g. special bank-only
 * holidays), 2 for public holidays under the Labour Protection
 * Act where overtime/premium pay applies.
 */
export const HOLIDAY_TEMPLATES: Omit<Holiday, 'company_id'>[] = [
  // === Year 2568 / 2025 ===
  { id: 'hl-2025-01-01', name: 'วันขึ้นปีใหม่', holiday_date: '2025-01-01', multiplier: 2, is_recurring: false, created_at: NOW, updated_at: NOW },
  { id: 'hl-2025-02-12', name: 'วันมาฆบูชา', holiday_date: '2025-02-12', multiplier: 2, is_recurring: false, created_at: NOW, updated_at: NOW },
  { id: 'hl-2025-04-07', name: 'วันจักรี', holiday_date: '2025-04-07', multiplier: 2, is_recurring: false, created_at: NOW, updated_at: NOW },
  { id: 'hl-2025-04-13', name: 'วันสงกรานต์', holiday_date: '2025-04-13', multiplier: 2, is_recurring: false, created_at: NOW, updated_at: NOW },
  { id: 'hl-2025-04-14', name: 'วันสงกรานต์', holiday_date: '2025-04-14', multiplier: 2, is_recurring: false, created_at: NOW, updated_at: NOW },
  { id: 'hl-2025-04-15', name: 'วันสงกรานต์', holiday_date: '2025-04-15', multiplier: 2, is_recurring: false, created_at: NOW, updated_at: NOW },
  { id: 'hl-2025-05-01', name: 'วันแรงงานแห่งชาติ', holiday_date: '2025-05-01', multiplier: 2, is_recurring: false, created_at: NOW, updated_at: NOW },
  { id: 'hl-2025-05-05', name: 'วันฉัตรมงคล', holiday_date: '2025-05-05', multiplier: 2, is_recurring: false, created_at: NOW, updated_at: NOW },
  { id: 'hl-2025-05-12', name: 'วันพืชมงคลจรดพระนังคัลแรกนาขวัญ', holiday_date: '2025-05-12', multiplier: 1, is_recurring: false, created_at: NOW, updated_at: NOW },
  { id: 'hl-2025-05-12-visak', name: 'วันวิสาขบูชา', holiday_date: '2025-05-12', multiplier: 2, is_recurring: false, created_at: NOW, updated_at: NOW },
  { id: 'hl-2025-06-02', name: 'วันเฉลิมพระชนมพรรษาสมเด็จพระนางเจ้าฯ พระบรมราชินี', holiday_date: '2025-06-02', multiplier: 2, is_recurring: false, created_at: NOW, updated_at: NOW },
  { id: 'hl-2025-07-28', name: 'วันเฉลิมพระชนมพรรษา ร.10', holiday_date: '2025-07-28', multiplier: 2, is_recurring: false, created_at: NOW, updated_at: NOW },
  { id: 'hl-2025-07-29', name: 'วันอาสาฬหบูชา', holiday_date: '2025-07-29', multiplier: 2, is_recurring: false, created_at: NOW, updated_at: NOW },
  { id: 'hl-2025-07-30', name: 'วันเข้าพรรษา', holiday_date: '2025-07-30', multiplier: 1, is_recurring: false, created_at: NOW, updated_at: NOW },
  { id: 'hl-2025-08-12', name: 'วันเฉลิมพระชนมพรรษา สมเด็จพระนางเจ้าสิริกิติ์ฯ', holiday_date: '2025-08-12', multiplier: 2, is_recurring: false, created_at: NOW, updated_at: NOW },
  { id: 'hl-2025-10-13', name: 'วันคล้ายวันสวรรคต ร.9', holiday_date: '2025-10-13', multiplier: 2, is_recurring: false, created_at: NOW, updated_at: NOW },
  { id: 'hl-2025-10-23', name: 'วันปิยมหาราช', holiday_date: '2025-10-23', multiplier: 2, is_recurring: false, created_at: NOW, updated_at: NOW },
  { id: 'hl-2025-12-05', name: 'วันคล้ายวันพระบรมราชสมภพ ร.9', holiday_date: '2025-12-05', multiplier: 2, is_recurring: false, created_at: NOW, updated_at: NOW },
  { id: 'hl-2025-12-10', name: 'วันรัฐธรรมนูญ', holiday_date: '2025-12-10', multiplier: 2, is_recurring: false, created_at: NOW, updated_at: NOW },
  { id: 'hl-2025-12-31', name: 'วันสิ้นปี', holiday_date: '2025-12-31', multiplier: 2, is_recurring: false, created_at: NOW, updated_at: NOW },

  // === Year 2569 / 2026 (source: kapook.com 2569) ===
  { id: 'hl-2026-01-01', name: 'วันขึ้นปีใหม่', holiday_date: '2026-01-01', multiplier: 2, is_recurring: false, created_at: NOW, updated_at: NOW },
  { id: 'hl-2026-01-02', name: 'วันหยุดพิเศษ (กรณีพิเศษ)', holiday_date: '2026-01-02', multiplier: 1, is_recurring: false, created_at: NOW, updated_at: NOW },
  { id: 'hl-2026-03-03', name: 'วันมาฆบูชา', holiday_date: '2026-03-03', multiplier: 2, is_recurring: false, created_at: NOW, updated_at: NOW },
  { id: 'hl-2026-04-06', name: 'วันจักรี', holiday_date: '2026-04-06', multiplier: 2, is_recurring: false, created_at: NOW, updated_at: NOW },
  { id: 'hl-2026-04-13', name: 'วันสงกรานต์', holiday_date: '2026-04-13', multiplier: 2, is_recurring: false, created_at: NOW, updated_at: NOW },
  { id: 'hl-2026-04-14', name: 'วันสงกรานต์', holiday_date: '2026-04-14', multiplier: 2, is_recurring: false, created_at: NOW, updated_at: NOW },
  { id: 'hl-2026-04-15', name: 'วันสงกรานต์', holiday_date: '2026-04-15', multiplier: 2, is_recurring: false, created_at: NOW, updated_at: NOW },
  { id: 'hl-2026-05-01', name: 'วันแรงงานแห่งชาติ', holiday_date: '2026-05-01', multiplier: 2, is_recurring: false, created_at: NOW, updated_at: NOW },
  { id: 'hl-2026-05-04', name: 'วันฉัตรมงคล', holiday_date: '2026-05-04', multiplier: 2, is_recurring: false, created_at: NOW, updated_at: NOW },
  { id: 'hl-2026-05-13', name: 'วันพืชมงคลจรดพระนังคัลแรกนาขวัญ', holiday_date: '2026-05-13', multiplier: 1, is_recurring: false, created_at: NOW, updated_at: NOW },
  { id: 'hl-2026-05-31', name: 'วันวิสาขบูชา', holiday_date: '2026-05-31', multiplier: 2, is_recurring: false, created_at: NOW, updated_at: NOW },
  { id: 'hl-2026-06-01', name: 'วันหยุดชดเชยวันวิสาขบูชา', holiday_date: '2026-06-01', multiplier: 2, is_recurring: false, created_at: NOW, updated_at: NOW },
  { id: 'hl-2026-06-03', name: 'วันเฉลิมพระชนมพรรษาสมเด็จพระนางเจ้าฯ พระบรมราชินี', holiday_date: '2026-06-03', multiplier: 2, is_recurring: false, created_at: NOW, updated_at: NOW },
  { id: 'hl-2026-07-28', name: 'วันพระบรมราชสมภพ ร.10', holiday_date: '2026-07-28', multiplier: 2, is_recurring: false, created_at: NOW, updated_at: NOW },
  { id: 'hl-2026-07-29', name: 'วันอาสาฬหบูชา', holiday_date: '2026-07-29', multiplier: 2, is_recurring: false, created_at: NOW, updated_at: NOW },
  { id: 'hl-2026-07-30', name: 'วันเข้าพรรษา', holiday_date: '2026-07-30', multiplier: 1, is_recurring: false, created_at: NOW, updated_at: NOW },
  { id: 'hl-2026-08-12', name: 'วันเฉลิมพระชนมพรรษา สมเด็จพระนางเจ้าสิริกิติ์ฯ', holiday_date: '2026-08-12', multiplier: 2, is_recurring: false, created_at: NOW, updated_at: NOW },
  { id: 'hl-2026-10-13', name: 'วันคล้ายวันสวรรคต ร.9', holiday_date: '2026-10-13', multiplier: 2, is_recurring: false, created_at: NOW, updated_at: NOW },
  { id: 'hl-2026-10-16', name: 'วันหยุดพิเศษธนาคาร', holiday_date: '2026-10-16', multiplier: 1, is_recurring: false, created_at: NOW, updated_at: NOW },
  { id: 'hl-2026-10-23', name: 'วันปิยมหาราช', holiday_date: '2026-10-23', multiplier: 2, is_recurring: false, created_at: NOW, updated_at: NOW },
  { id: 'hl-2026-12-05', name: 'วันคล้ายวันพระบรมราชสมภพ ร.9', holiday_date: '2026-12-05', multiplier: 2, is_recurring: false, created_at: NOW, updated_at: NOW },
  { id: 'hl-2026-12-07', name: 'วันหยุดชดเชยวันพ่อแห่งชาติ', holiday_date: '2026-12-07', multiplier: 2, is_recurring: false, created_at: NOW, updated_at: NOW },
  { id: 'hl-2026-12-10', name: 'วันรัฐธรรมนูญ', holiday_date: '2026-12-10', multiplier: 2, is_recurring: false, created_at: NOW, updated_at: NOW },
  { id: 'hl-2026-12-31', name: 'วันสิ้นปี', holiday_date: '2026-12-31', multiplier: 2, is_recurring: false, created_at: NOW, updated_at: NOW },

  // === Year 2570 / 2027 (projected; verify against cabinet announcement) ===
  { id: 'hl-2027-01-01', name: 'วันขึ้นปีใหม่', holiday_date: '2027-01-01', multiplier: 2, is_recurring: false, created_at: NOW, updated_at: NOW },
  { id: 'hl-2027-02-21', name: 'วันมาฆบูชา (คาดการณ์)', holiday_date: '2027-02-21', multiplier: 2, is_recurring: false, created_at: NOW, updated_at: NOW },
  { id: 'hl-2027-04-06', name: 'วันจักรี', holiday_date: '2027-04-06', multiplier: 2, is_recurring: false, created_at: NOW, updated_at: NOW },
  { id: 'hl-2027-04-13', name: 'วันสงกรานต์', holiday_date: '2027-04-13', multiplier: 2, is_recurring: false, created_at: NOW, updated_at: NOW },
  { id: 'hl-2027-04-14', name: 'วันสงกรานต์', holiday_date: '2027-04-14', multiplier: 2, is_recurring: false, created_at: NOW, updated_at: NOW },
  { id: 'hl-2027-04-15', name: 'วันสงกรานต์', holiday_date: '2027-04-15', multiplier: 2, is_recurring: false, created_at: NOW, updated_at: NOW },
  { id: 'hl-2027-05-03', name: 'วันแรงงานแห่งชาติ (ชดเชย)', holiday_date: '2027-05-03', multiplier: 2, is_recurring: false, created_at: NOW, updated_at: NOW },
  { id: 'hl-2027-05-20', name: 'วันวิสาขบูชา (คาดการณ์)', holiday_date: '2027-05-20', multiplier: 2, is_recurring: false, created_at: NOW, updated_at: NOW },
  { id: 'hl-2027-07-28', name: 'วันพระบรมราชสมภพ ร.10', holiday_date: '2027-07-28', multiplier: 2, is_recurring: false, created_at: NOW, updated_at: NOW },
  { id: 'hl-2027-07-29', name: 'วันอาสาฬหบูชา (คาดการณ์)', holiday_date: '2027-07-29', multiplier: 2, is_recurring: false, created_at: NOW, updated_at: NOW },
  { id: 'hl-2027-08-12', name: 'วันเฉลิมพระชนมพรรษา สมเด็จพระนางเจ้าสิริกิติ์ฯ', holiday_date: '2027-08-12', multiplier: 2, is_recurring: false, created_at: NOW, updated_at: NOW },
  { id: 'hl-2027-10-23', name: 'วันปิยมหาราช', holiday_date: '2027-10-23', multiplier: 2, is_recurring: false, created_at: NOW, updated_at: NOW },
  { id: 'hl-2027-12-05', name: 'วันคล้ายวันพระบรมราชสมภพ ร.9', holiday_date: '2027-12-05', multiplier: 2, is_recurring: false, created_at: NOW, updated_at: NOW },
  { id: 'hl-2027-12-06', name: 'วันหยุดชดเชยวันพ่อแห่งชาติ (คาดการณ์)', holiday_date: '2027-12-06', multiplier: 2, is_recurring: false, created_at: NOW, updated_at: NOW },
  { id: 'hl-2027-12-10', name: 'วันรัฐธรรมนูญ', holiday_date: '2027-12-10', multiplier: 2, is_recurring: false, created_at: NOW, updated_at: NOW },
  { id: 'hl-2027-12-31', name: 'วันสิ้นปี', holiday_date: '2027-12-31', multiplier: 2, is_recurring: false, created_at: NOW, updated_at: NOW },
];
