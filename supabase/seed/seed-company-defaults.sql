-- =============================================================================
-- Mini TimePay — Seed default Thai templates into the current company.
--
-- Run this once per new company via Supabase Dashboard → SQL Editor.
--
-- What it inserts (idempotent — safe to re-run):
--   * 4 shifts (morning, evening, night, parttime)
--   * 3 pay rules (3 employment types)
--   * 4 leave types (sick, personal, vacation, unpaid)
--   * 1 default office location (Bangkok centre)
--   * 56 public holidays for 2025 / 2026 / 2027
--     (source: https://calendar.kapook.com/2569/holiday)
--
-- This version uses a hard-coded company_id so it works without an
-- authenticated session. The default value matches the company_id
-- used in the README 3.4 SQL ('บริษัทของฉัน'). If your company has
-- a different id, edit v_company_id below before running.
-- =============================================================================

-- Helper: turn a short, human-readable label into a valid UUID.
-- Same label always produces the same UUID, so re-runs are
-- idempotent. Built on md5() which is in core PostgreSQL.
create or replace function public.uuid_from_label(p_label text) returns uuid
language sql immutable as $$
  select (
    substr(md5('mini-timepay-seed:' || p_label), 1, 8) || '-' ||
    substr(md5('mini-timepay-seed:' || p_label), 9, 4) || '-' ||
    substr(md5('mini-timepay-seed:' || p_label), 13, 4) || '-' ||
    substr(md5('mini-timepay-seed:' || p_label), 17, 4) || '-' ||
    substr(md5('mini-timepay-seed:' || p_label), 21, 12)
  )::uuid
$$;

do $$
declare
  -- >>> EDIT THIS if your company_id is different <<<
  v_company_id uuid := '00000000-0000-0000-0000-000000000001';
  v_now        timestamptz := now();
begin
  raise notice 'Seeding defaults for company %', v_company_id;

  -- Use uuid_from_label('sh-morning') for the id column so the same
  -- seed row always maps to the same UUID. (See helper above.)

  ----------------------------------------------------------------------------
  -- Shifts
  ----------------------------------------------------------------------------
  insert into public.shifts (id, company_id, name, start_time, end_time,
                             break_minutes, standard_hours, grace_minutes,
                             ot_enabled, color, is_active, created_at, updated_at)
  values
    (uuid_from_label('sh-morning'),   v_company_id, 'กะเช้า',     '08:00', '17:00', 60, 8, 15, true,  '#A7F3D0', true, v_now, v_now),
    (uuid_from_label('sh-evening'),   v_company_id, 'กะบ่าย',     '13:00', '22:00', 60, 8, 15, true,  '#BFDBFE', true, v_now, v_now),
    (uuid_from_label('sh-night'),     v_company_id, 'กะดึก',       '22:00', '07:00', 60, 8, 15, true,  '#C4B5FD', true, v_now, v_now),
    (uuid_from_label('sh-parttime'),  v_company_id, 'พาร์ทไทม์',  '10:00', '17:00', 30, 6, 10, false, '#FED7AA', true, v_now, v_now)
  on conflict (id) do nothing;

  ----------------------------------------------------------------------------
  -- Pay rules
  ----------------------------------------------------------------------------
  insert into public.pay_rules (id, company_id, name, employment_type,
                                standard_hours_per_day, daily_rate, hourly_rate,
                                ot_rate, holiday_multiplier,
                                personal_day_off_paid, personal_day_off_pay,
                                sick_paid, sick_pay_per_day,
                                personal_leave_paid, personal_leave_pay_per_day,
                                vacation_paid, vacation_pay_per_day,
                                is_active, created_at, updated_at)
  values
    (uuid_from_label('pr-fulltime-passed'),     v_company_id, 'ประจำผ่านโปร',
     'fulltime_passed', 8, 400, 50, 75, 2,
     true, 400, true, 350, false, 0, true, 400, true, v_now, v_now),
    (uuid_from_label('pr-fulltime-not-passed'), v_company_id, 'ประจำยังไม่ผ่านโปร',
     'fulltime_not_passed', 8, 350, 44, 66, 2,
     true, 350, true, 300, false, 0, false, 0, true, v_now, v_now),
    (uuid_from_label('pr-parttime'),            v_company_id, 'พาร์ทไทม์',
     'parttime', 6, 300, 50, 75, 2,
     false, 0, false, 0, false, 0, false, 0, true, v_now, v_now)
  on conflict (id) do nothing;

  ----------------------------------------------------------------------------
  -- Leave types
  ----------------------------------------------------------------------------
  insert into public.leave_types (id, company_id, name, category, paid,
                                  requires_certificate, max_days_per_year,
                                  is_active, created_at, updated_at)
  values
    (uuid_from_label('lt-sick'),     v_company_id, 'ลาป่วย',         'sick',     true,  true,  30,   true, v_now, v_now),
    (uuid_from_label('lt-personal'), v_company_id, 'ลากิจ',          'personal', false, false, 6,    true, v_now, v_now),
    (uuid_from_label('lt-vacation'), v_company_id, 'ลาพักร้อน',      'vacation', true,  false, 6,    true, v_now, v_now),
    (uuid_from_label('lt-unpaid'),   v_company_id, 'ลาไม่รับเงิน',  'unpaid',   false, false, null, true, v_now, v_now)
  on conflict (id) do nothing;

  ----------------------------------------------------------------------------
  -- Default location
  ----------------------------------------------------------------------------
  insert into public.locations (id, company_id, name, latitude, longitude,
                                radius_meters, is_active, created_at, updated_at)
  values
    (uuid_from_label('loc-main'), v_company_id, 'สำนักงานใหญ่',
     13.7563, 100.5018, 200, true, v_now, v_now)
  on conflict (id) do nothing;

  ----------------------------------------------------------------------------
  -- Holidays (2025 / 2026 / 2027) — kapook.com mirror
  ----------------------------------------------------------------------------
  insert into public.holidays (id, company_id, name, holiday_date,
                               multiplier, is_recurring, created_at, updated_at)
  values
    -- 2025
    (uuid_from_label('hl-2025-01-01'),  v_company_id, 'วันขึ้นปีใหม่', '2025-01-01', 2, false, v_now, v_now),
    (uuid_from_label('hl-2025-02-12'),  v_company_id, 'วันมาฆบูชา', '2025-02-12', 2, false, v_now, v_now),
    (uuid_from_label('hl-2025-04-07'),  v_company_id, 'วันจักรี', '2025-04-07', 2, false, v_now, v_now),
    (uuid_from_label('hl-2025-04-13'),  v_company_id, 'วันสงกรานต์', '2025-04-13', 2, false, v_now, v_now),
    (uuid_from_label('hl-2025-04-14'),  v_company_id, 'วันสงกรานต์', '2025-04-14', 2, false, v_now, v_now),
    (uuid_from_label('hl-2025-04-15'),  v_company_id, 'วันสงกรานต์', '2025-04-15', 2, false, v_now, v_now),
    (uuid_from_label('hl-2025-05-01'),  v_company_id, 'วันแรงงานแห่งชาติ', '2025-05-01', 2, false, v_now, v_now),
    (uuid_from_label('hl-2025-05-05'),  v_company_id, 'วันฉัตรมงคล', '2025-05-05', 2, false, v_now, v_now),
    (uuid_from_label('hl-2025-05-12a'), v_company_id, 'วันพืชมงคลจรดพระนังคัลแรกนาขวัญ', '2025-05-12', 1, false, v_now, v_now),
    (uuid_from_label('hl-2025-05-12b'), v_company_id, 'วันวิสาขบูชา', '2025-05-12', 2, false, v_now, v_now),
    (uuid_from_label('hl-2025-06-02'),  v_company_id, 'วันเฉลิมพระชนมพรรษาสมเด็จพระนางเจ้าฯ พระบรมราชินี', '2025-06-02', 2, false, v_now, v_now),
    (uuid_from_label('hl-2025-07-28'),  v_company_id, 'วันเฉลิมพระชนมพรรษา ร.10', '2025-07-28', 2, false, v_now, v_now),
    (uuid_from_label('hl-2025-07-29'),  v_company_id, 'วันอาสาฬหบูชา', '2025-07-29', 2, false, v_now, v_now),
    (uuid_from_label('hl-2025-07-30'),  v_company_id, 'วันเข้าพรรษา', '2025-07-30', 1, false, v_now, v_now),
    (uuid_from_label('hl-2025-08-12'),  v_company_id, 'วันเฉลิมพระชนมพรรษา สมเด็จพระนางเจ้าสิริกิติ์ฯ', '2025-08-12', 2, false, v_now, v_now),
    (uuid_from_label('hl-2025-10-13'),  v_company_id, 'วันคล้ายวันสวรรคต ร.9', '2025-10-13', 2, false, v_now, v_now),
    (uuid_from_label('hl-2025-10-23'),  v_company_id, 'วันปิยมหาราช', '2025-10-23', 2, false, v_now, v_now),
    (uuid_from_label('hl-2025-12-05'),  v_company_id, 'วันคล้ายวันพระบรมราชสมภพ ร.9', '2025-12-05', 2, false, v_now, v_now),
    (uuid_from_label('hl-2025-12-10'),  v_company_id, 'วันรัฐธรรมนูญ', '2025-12-10', 2, false, v_now, v_now),
    (uuid_from_label('hl-2025-12-31'),  v_company_id, 'วันสิ้นปี', '2025-12-31', 2, false, v_now, v_now),
    -- 2026
    (uuid_from_label('hl-2026-01-01'),  v_company_id, 'วันขึ้นปีใหม่', '2026-01-01', 2, false, v_now, v_now),
    (uuid_from_label('hl-2026-01-02'),  v_company_id, 'วันหยุดพิเศษ (กรณีพิเศษ)', '2026-01-02', 1, false, v_now, v_now),
    (uuid_from_label('hl-2026-03-03'),  v_company_id, 'วันมาฆบูชา', '2026-03-03', 2, false, v_now, v_now),
    (uuid_from_label('hl-2026-04-06'),  v_company_id, 'วันจักรี', '2026-04-06', 2, false, v_now, v_now),
    (uuid_from_label('hl-2026-04-13'),  v_company_id, 'วันสงกรานต์', '2026-04-13', 2, false, v_now, v_now),
    (uuid_from_label('hl-2026-04-14'),  v_company_id, 'วันสงกรานต์', '2026-04-14', 2, false, v_now, v_now),
    (uuid_from_label('hl-2026-04-15'),  v_company_id, 'วันสงกรานต์', '2026-04-15', 2, false, v_now, v_now),
    (uuid_from_label('hl-2026-05-01'),  v_company_id, 'วันแรงงานแห่งชาติ', '2026-05-01', 2, false, v_now, v_now),
    (uuid_from_label('hl-2026-05-04'),  v_company_id, 'วันฉัตรมงคล', '2026-05-04', 2, false, v_now, v_now),
    (uuid_from_label('hl-2026-05-13'),  v_company_id, 'วันพืชมงคลจรดพระนังคัลแรกนาขวัญ', '2026-05-13', 1, false, v_now, v_now),
    (uuid_from_label('hl-2026-05-31'),  v_company_id, 'วันวิสาขบูชา', '2026-05-31', 2, false, v_now, v_now),
    (uuid_from_label('hl-2026-06-01'),  v_company_id, 'วันหยุดชดเชยวันวิสาขบูชา', '2026-06-01', 2, false, v_now, v_now),
    (uuid_from_label('hl-2026-06-03'),  v_company_id, 'วันเฉลิมพระชนมพรรษาสมเด็จพระนางเจ้าฯ พระบรมราชินี', '2026-06-03', 2, false, v_now, v_now),
    (uuid_from_label('hl-2026-07-28'),  v_company_id, 'วันพระบรมราชสมภพ ร.10', '2026-07-28', 2, false, v_now, v_now),
    (uuid_from_label('hl-2026-07-29'),  v_company_id, 'วันอาสาฬหบูชา', '2026-07-29', 2, false, v_now, v_now),
    (uuid_from_label('hl-2026-07-30'),  v_company_id, 'วันเข้าพรรษา', '2026-07-30', 1, false, v_now, v_now),
    (uuid_from_label('hl-2026-08-12'),  v_company_id, 'วันเฉลิมพระชนมพรรษา สมเด็จพระนางเจ้าสิริกิติ์ฯ', '2026-08-12', 2, false, v_now, v_now),
    (uuid_from_label('hl-2026-10-13'),  v_company_id, 'วันคล้ายวันสวรรคต ร.9', '2026-10-13', 2, false, v_now, v_now),
    (uuid_from_label('hl-2026-10-16'),  v_company_id, 'วันหยุดพิเศษธนาคาร', '2026-10-16', 1, false, v_now, v_now),
    (uuid_from_label('hl-2026-10-23'),  v_company_id, 'วันปิยมหาราช', '2026-10-23', 2, false, v_now, v_now),
    (uuid_from_label('hl-2026-12-05'),  v_company_id, 'วันคล้ายวันพระบรมราชสมภพ ร.9', '2026-12-05', 2, false, v_now, v_now),
    (uuid_from_label('hl-2026-12-07'),  v_company_id, 'วันหยุดชดเชยวันพ่อแห่งชาติ', '2026-12-07', 2, false, v_now, v_now),
    (uuid_from_label('hl-2026-12-10'),  v_company_id, 'วันรัฐธรรมนูญ', '2026-12-10', 2, false, v_now, v_now),
    (uuid_from_label('hl-2026-12-31'),  v_company_id, 'วันสิ้นปี', '2026-12-31', 2, false, v_now, v_now),
    -- 2027 (projected)
    (uuid_from_label('hl-2027-01-01'),  v_company_id, 'วันขึ้นปีใหม่', '2027-01-01', 2, false, v_now, v_now),
    (uuid_from_label('hl-2027-02-21'),  v_company_id, 'วันมาฆบูชา (คาดการณ์)', '2027-02-21', 2, false, v_now, v_now),
    (uuid_from_label('hl-2027-04-06'),  v_company_id, 'วันจักรี', '2027-04-06', 2, false, v_now, v_now),
    (uuid_from_label('hl-2027-04-13'),  v_company_id, 'วันสงกรานต์', '2027-04-13', 2, false, v_now, v_now),
    (uuid_from_label('hl-2027-04-14'),  v_company_id, 'วันสงกรานต์', '2027-04-14', 2, false, v_now, v_now),
    (uuid_from_label('hl-2027-04-15'),  v_company_id, 'วันสงกรานต์', '2027-04-15', 2, false, v_now, v_now),
    (uuid_from_label('hl-2027-05-03'),  v_company_id, 'วันแรงงานแห่งชาติ (ชดเชย)', '2027-05-03', 2, false, v_now, v_now),
    (uuid_from_label('hl-2027-05-20'),  v_company_id, 'วันวิสาขบูชา (คาดการณ์)', '2027-05-20', 2, false, v_now, v_now),
    (uuid_from_label('hl-2027-07-28'),  v_company_id, 'วันพระบรมราชสมภพ ร.10', '2027-07-28', 2, false, v_now, v_now),
    (uuid_from_label('hl-2027-07-29'),  v_company_id, 'วันอาสาฬหบูชา (คาดการณ์)', '2027-07-29', 2, false, v_now, v_now),
    (uuid_from_label('hl-2027-08-12'),  v_company_id, 'วันเฉลิมพระชนมพรรษา สมเด็จพระนางเจ้าสิริกิติ์ฯ', '2027-08-12', 2, false, v_now, v_now),
    (uuid_from_label('hl-2027-10-23'),  v_company_id, 'วันปิยมหาราช', '2027-10-23', 2, false, v_now, v_now),
    (uuid_from_label('hl-2027-12-05'),  v_company_id, 'วันคล้ายวันพระบรมราชสมภพ ร.9', '2027-12-05', 2, false, v_now, v_now),
    (uuid_from_label('hl-2027-12-06'),  v_company_id, 'วันหยุดชดเชยวันพ่อแห่งชาติ (คาดการณ์)', '2027-12-06', 2, false, v_now, v_now),
    (uuid_from_label('hl-2027-12-10'),  v_company_id, 'วันรัฐธรรมนูญ', '2027-12-10', 2, false, v_now, v_now),
    (uuid_from_label('hl-2027-12-31'),  v_company_id, 'วันสิ้นปี', '2027-12-31', 2, false, v_now, v_now)
  on conflict (id) do nothing;

  raise notice '✅ Seed complete: 4 shifts, 3 pay rules, 4 leave types, 1 location, 56 holidays';
end $$;
