-- =====================================================
-- Seed Data — ตัวอย่างบริษัทเล็ก 10 คน
-- =====================================================
-- วิธีใช้: รันใน Supabase SQL Editor
-- หมายเหตุ: ต้องสร้าง auth.users ก่อน แล้วเอา id มาใส่ตรงนี้
-- =====================================================

-- ตัวอย่าง: สร้าง auth.users ผ่าน Supabase Dashboard > Authentication > Users
-- จากนั้นแทนที่ <USER_UUID> ด้วย id จริงที่ได้

do $$
declare
  v_company_id uuid := '00000000-0000-0000-0000-000000000001';
  v_owner_id   uuid := '00000000-0000-0000-0000-0000000000a1';
  v_admin_id   uuid := '00000000-0000-0000-0000-0000000000a2';
  v_emp_ids    uuid[] := array[
    '00000000-0000-0000-0000-0000000000e1',
    '00000000-0000-0000-0000-0000000000e2',
    '00000000-0000-0000-0000-0000000000e3',
    '00000000-0000-0000-0000-0000000000e4',
    '00000000-0000-0000-0000-0000000000e5',
    '00000000-0000-0000-0000-0000000000e6',
    '00000000-0000-0000-0000-0000000000e7',
    '00000000-0000-0000-0000-0000000000e8'
  ];
  v_shift_morning   uuid := '00000000-0000-0000-0000-0000000000s1';
  v_shift_afternoon uuid := '00000000-0000-0000-0000-0000000000s2';
  v_shift_parttime  uuid := '00000000-0000-0000-0000-0000000000s3';
  v_pr_passed       uuid := '00000000-0000-0000-0000-0000000000p1';
  v_pr_not_passed   uuid := '00000000-0000-0000-0000-0000000000p2';
  v_pr_parttime     uuid := '00000000-0000-0000-0000-0000000000p3';
begin
  -- company
  insert into public.companies (id, name, address, phone)
  values (v_company_id, 'ร้านมินิเดมี่ (ตัวอย่าง)', 'กรุงเทพมหานคร', '02-123-4567')
  on conflict (id) do nothing;

  -- profiles
  insert into public.profiles (id, company_id, email, full_name, role, is_active) values
    (v_owner_id, v_company_id, 'owner@demo.com', 'สมชาย ใจดี', 'owner', true),
    (v_admin_id, v_company_id, 'manager@demo.com', 'สมหญิง รักดี', 'admin', true)
  on conflict (id) do nothing;

  -- shifts
  insert into public.shifts (id, company_id, name, start_time, end_time, break_minutes, standard_hours, grace_minutes, ot_enabled, color) values
    (v_shift_morning, v_company_id, 'กะเช้า', '08:00', '18:00', 60, 9, 15, true, '#A7F3D0'),
    (v_shift_afternoon, v_company_id, 'กะบ่าย', '11:00', '21:00', 60, 9, 15, true, '#BFDBFE'),
    (v_shift_parttime, v_company_id, 'พาร์ทไทม์', '10:00', '18:00', 30, 7, 10, false, '#FBCFE8')
  on conflict (id) do nothing;

  -- pay rules
  insert into public.pay_rules (id, company_id, name, employment_type, standard_hours_per_day, daily_rate, hourly_rate, ot_rate, holiday_multiplier, personal_day_off_paid, personal_day_off_pay, sick_paid, sick_pay_per_day, personal_leave_paid, personal_leave_pay_per_day, vacation_paid, vacation_pay_per_day) values
    (v_pr_passed, v_company_id, 'ประจำผ่านโปร', 'fulltime_passed', 9, 400, 37, 40, 2, true, 400, true, 350, true, 350, true, 350),
    (v_pr_not_passed, v_company_id, 'ประจำยังไม่ผ่านโปร', 'fulltime_not_passed', 8, 350, 37, 40, 2, false, 0, true, 350, false, 0, false, 0),
    (v_pr_parttime, v_company_id, 'พาร์ทไทม์', 'parttime', 7, 0, 40, 60, 2, false, 0, false, 0, false, 0, false, 0)
  on conflict (id) do nothing;

  -- leave types
  insert into public.leave_types (id, company_id, name, category, paid, requires_certificate, max_days_per_year) values
    ('00000000-0000-0000-0000-0000000000l1', v_company_id, 'ลาป่วย', 'sick', true, true, 30),
    ('00000000-0000-0000-0000-0000000000l2', v_company_id, 'ลากิจ', 'personal', true, false, 6),
    ('00000000-0000-0000-0000-0000000000l3', v_company_id, 'ลาพักร้อน', 'vacation', true, false, 6),
    ('00000000-0000-0000-0000-0000000000l4', v_company_id, 'ลาไม่รับเงิน', 'unpaid', false, false, null)
  on conflict do nothing;

  -- app settings
  insert into public.app_settings (company_id, key, value) values
    (v_company_id, 'location_check_mode', '"warn_only"'),
    (v_company_id, 'default_radius_meters', '200')
  on conflict (company_id, key) do nothing;

  -- sample employees
  insert into public.employees (id, company_id, profile_id, employee_code, full_name, nickname, position, employment_type, pay_rule_id, default_shift_id, start_date, status) values
    (v_emp_ids[1], v_company_id, null, 'EMP01', 'ปิยะ มานะ', 'ปิ', 'พนักงานขาย', 'fulltime_passed', v_pr_passed, v_shift_morning, current_date - 365, 'active'),
    (v_emp_ids[2], v_company_id, null, 'EMP02', 'นภา สดใส', 'น้ำ', 'พนักงานขาย', 'fulltime_passed', v_pr_passed, v_shift_afternoon, current_date - 300, 'active'),
    (v_emp_ids[3], v_company_id, null, 'EMP03', 'วิทยา เก่งกล้า', 'วิท', 'แคชเชียร์', 'fulltime_not_passed', v_pr_not_passed, v_shift_morning, current_date - 120, 'active'),
    (v_emp_ids[4], v_company_id, null, 'EMP04', 'มินตรา ขยัน', 'มิ้น', 'แคชเชียร์', 'fulltime_not_passed', v_pr_not_passed, v_shift_afternoon, current_date - 90, 'active'),
    (v_emp_ids[5], v_company_id, null, 'EMP05', 'ธนา เพียรดี', 'นา', 'พนักงานสต๊อก', 'fulltime_not_passed', v_pr_not_passed, v_shift_morning, current_date - 60, 'active'),
    (v_emp_ids[6], v_company_id, null, 'EMP06', 'ปริชาติ ใจเย็น', 'ปริ', 'พนักงานสต๊อก', 'fulltime_passed', v_pr_passed, v_shift_afternoon, current_date - 200, 'active'),
    (v_emp_ids[7], v_company_id, null, 'EMP07', 'อรุณ สว่าง', 'อร', 'พนักงานทำความสะอาด', 'parttime', v_pr_parttime, v_shift_parttime, current_date - 50, 'active'),
    (v_emp_ids[8], v_company_id, null, 'EMP08', 'สุดารัตน์ พรม', 'หวาน', 'พนักงานเสิร์ฟ', 'parttime', v_pr_parttime, v_shift_parttime, current_date - 30, 'active')
  on conflict do nothing;
end$$;
