// Supabase Edge Function: seed-company-defaults
//
// Owner-only: inserts the curated Thai defaults (shifts, pay rules,
// leave types, location, holidays) into the caller's company if
// not already present.
//
// Uses raw fetch() — see create-employee for rationale (the
// @supabase/supabase-js client crashes inside Deno at module
// init because it touches `window.localStorage`).
//
// The template payload is hard-coded in this file (a copy of
// src/lib/seeds/thailand.ts) so the function has no build-time
// dependency on the Vite app bundle. Any change to the seeds
// must be mirrored here OR moved into a single shared module
// that's imported at build time. For now: keep them in sync
// manually.
//
// Deploy:
//   supabase functions deploy seed-company-defaults

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/**
 * Convert a string seed id like "sh-morning" to a valid UUID v5
 * so it can be stored in a Supabase `id uuid` column. The
 * conversion is deterministic — the same string always produces
 * the same UUID — so re-running the seed is idempotent.
 *
 * UUID v5 uses a namespace + name. We pick a fixed namespace
 * (the function's URL) so the ids are stable across deployments.
 */
async function seedIdToUuid(seedId: string): Promise<string> {
  // Use a fixed namespace UUID for our seed ids (arbitrary v4 UUID
  // — only needs to be a valid UUID, and it must be the SAME every
  // time so the same seed id always maps to the same UUID).
  const NAMESPACE = '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d';
  const data = new TextEncoder().encode(`${NAMESPACE}:${seedId}`);
  const hash = await crypto.subtle.digest('SHA-1', data);
  const bytes = new Uint8Array(hash);
  // Set version (5) and variant bits per RFC 4122
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes.slice(0, 16))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

const NOW = new Date().toISOString();

// Mirror of src/lib/seeds/thailand.ts — keep in sync.
const SHIFTS = [
  { id: 'sh-morning',   name: 'กะเช้า',   start_time: '08:00', end_time: '17:00', break_minutes: 60, standard_hours: 8, grace_minutes: 15, ot_enabled: true, color: '#A7F3D0', is_active: true },
  { id: 'sh-evening',   name: 'กะบ่าย',   start_time: '13:00', end_time: '22:00', break_minutes: 60, standard_hours: 8, grace_minutes: 15, ot_enabled: true, color: '#BFDBFE', is_active: true },
  { id: 'sh-night',     name: 'กะดึก',   start_time: '22:00', end_time: '07:00', break_minutes: 60, standard_hours: 8, grace_minutes: 15, ot_enabled: true, color: '#C4B5FD', is_active: true },
  { id: 'sh-parttime',  name: 'พาร์ทไทม์', start_time: '10:00', end_time: '17:00', break_minutes: 30, standard_hours: 6, grace_minutes: 10, ot_enabled: false, color: '#FED7AA', is_active: true },
];

const PAY_RULES = [
  { id: 'pr-fulltime-passed',     name: 'ประจำผ่านโปร',         employment_type: 'fulltime_passed',     standard_hours_per_day: 8, daily_rate: 400, hourly_rate: 50, ot_rate: 75, holiday_multiplier: 2, personal_day_off_paid: true,  personal_day_off_pay: 400, sick_paid: true,  sick_pay_per_day: 350, personal_leave_paid: false, personal_leave_pay_per_day: 0,   vacation_paid: true,  vacation_pay_per_day: 400, is_active: true },
  { id: 'pr-fulltime-not-passed', name: 'ประจำยังไม่ผ่านโปร',   employment_type: 'fulltime_not_passed', standard_hours_per_day: 8, daily_rate: 350, hourly_rate: 44, ot_rate: 66, holiday_multiplier: 2, personal_day_off_paid: true,  personal_day_off_pay: 350, sick_paid: true,  sick_pay_per_day: 300, personal_leave_paid: false, personal_leave_pay_per_day: 0,   vacation_paid: false, vacation_pay_per_day: 0,   is_active: true },
  { id: 'pr-parttime',            name: 'พาร์ทไทม์',            employment_type: 'parttime',            standard_hours_per_day: 6, daily_rate: 300, hourly_rate: 50, ot_rate: 75, holiday_multiplier: 2, personal_day_off_paid: false, personal_day_off_pay: 0,   sick_paid: false, sick_pay_per_day: 0,   personal_leave_paid: false, personal_leave_pay_per_day: 0,   vacation_paid: false, vacation_pay_per_day: 0,   is_active: true },
];

const LEAVE_TYPES = [
  { id: 'lt-sick',     name: 'ลาป่วย',     category: 'sick',     paid: true,  requires_certificate: true,  max_days_per_year: 30,  is_active: true },
  { id: 'lt-personal', name: 'ลากิจ',      category: 'personal', paid: false, requires_certificate: false, max_days_per_year: 6,   is_active: true },
  { id: 'lt-vacation', name: 'ลาพักร้อน',  category: 'vacation', paid: true,  requires_certificate: false, max_days_per_year: 6,   is_active: true },
  { id: 'lt-unpaid',   name: 'ลาไม่รับเงิน', category: 'unpaid',  paid: false, requires_certificate: false, max_days_per_year: null, is_active: true },
];

const LOCATIONS = [
  { id: 'loc-main', name: 'สำนักงานใหญ่', latitude: 13.7563, longitude: 100.5018, radius_meters: 200, is_active: true },
];

// Source: https://calendar.kapook.com/2569/holiday (mirrors cabinet
// announcements). 2027 dates are projected.
const HOLIDAYS: Array<{ id: string; name: string; holiday_date: string; multiplier: number; is_recurring: boolean }> = [
  // 2025
  { id: 'hl-2025-01-01', name: 'วันขึ้นปีใหม่', holiday_date: '2025-01-01', multiplier: 2, is_recurring: false },
  { id: 'hl-2025-02-12', name: 'วันมาฆบูชา', holiday_date: '2025-02-12', multiplier: 2, is_recurring: false },
  { id: 'hl-2025-04-07', name: 'วันจักรี', holiday_date: '2025-04-07', multiplier: 2, is_recurring: false },
  { id: 'hl-2025-04-13', name: 'วันสงกรานต์', holiday_date: '2025-04-13', multiplier: 2, is_recurring: false },
  { id: 'hl-2025-04-14', name: 'วันสงกรานต์', holiday_date: '2025-04-14', multiplier: 2, is_recurring: false },
  { id: 'hl-2025-04-15', name: 'วันสงกรานต์', holiday_date: '2025-04-15', multiplier: 2, is_recurring: false },
  { id: 'hl-2025-05-01', name: 'วันแรงงานแห่งชาติ', holiday_date: '2025-05-01', multiplier: 2, is_recurring: false },
  { id: 'hl-2025-05-05', name: 'วันฉัตรมงคล', holiday_date: '2025-05-05', multiplier: 2, is_recurring: false },
  { id: 'hl-2025-05-12', name: 'วันพืชมงคลจรดพระนังคัลแรกนาขวัญ', holiday_date: '2025-05-12', multiplier: 1, is_recurring: false },
  { id: 'hl-2025-05-12-visak', name: 'วันวิสาขบูชา', holiday_date: '2025-05-12', multiplier: 2, is_recurring: false },
  { id: 'hl-2025-06-02', name: 'วันเฉลิมพระชนมพรรษาสมเด็จพระนางเจ้าฯ พระบรมราชินี', holiday_date: '2025-06-02', multiplier: 2, is_recurring: false },
  { id: 'hl-2025-07-28', name: 'วันเฉลิมพระชนมพรรษา ร.10', holiday_date: '2025-07-28', multiplier: 2, is_recurring: false },
  { id: 'hl-2025-07-29', name: 'วันอาสาฬหบูชา', holiday_date: '2025-07-29', multiplier: 2, is_recurring: false },
  { id: 'hl-2025-07-30', name: 'วันเข้าพรรษา', holiday_date: '2025-07-30', multiplier: 1, is_recurring: false },
  { id: 'hl-2025-08-12', name: 'วันเฉลิมพระชนมพรรษา สมเด็จพระนางเจ้าสิริกิติ์ฯ', holiday_date: '2025-08-12', multiplier: 2, is_recurring: false },
  { id: 'hl-2025-10-13', name: 'วันคล้ายวันสวรรคต ร.9', holiday_date: '2025-10-13', multiplier: 2, is_recurring: false },
  { id: 'hl-2025-10-23', name: 'วันปิยมหาราช', holiday_date: '2025-10-23', multiplier: 2, is_recurring: false },
  { id: 'hl-2025-12-05', name: 'วันคล้ายวันพระบรมราชสมภพ ร.9', holiday_date: '2025-12-05', multiplier: 2, is_recurring: false },
  { id: 'hl-2025-12-10', name: 'วันรัฐธรรมนูญ', holiday_date: '2025-12-10', multiplier: 2, is_recurring: false },
  { id: 'hl-2025-12-31', name: 'วันสิ้นปี', holiday_date: '2025-12-31', multiplier: 2, is_recurring: false },
  // 2026
  { id: 'hl-2026-01-01', name: 'วันขึ้นปีใหม่', holiday_date: '2026-01-01', multiplier: 2, is_recurring: false },
  { id: 'hl-2026-01-02', name: 'วันหยุดพิเศษ (กรณีพิเศษ)', holiday_date: '2026-01-02', multiplier: 1, is_recurring: false },
  { id: 'hl-2026-03-03', name: 'วันมาฆบูชา', holiday_date: '2026-03-03', multiplier: 2, is_recurring: false },
  { id: 'hl-2026-04-06', name: 'วันจักรี', holiday_date: '2026-04-06', multiplier: 2, is_recurring: false },
  { id: 'hl-2026-04-13', name: 'วันสงกรานต์', holiday_date: '2026-04-13', multiplier: 2, is_recurring: false },
  { id: 'hl-2026-04-14', name: 'วันสงกรานต์', holiday_date: '2026-04-14', multiplier: 2, is_recurring: false },
  { id: 'hl-2026-04-15', name: 'วันสงกรานต์', holiday_date: '2026-04-15', multiplier: 2, is_recurring: false },
  { id: 'hl-2026-05-01', name: 'วันแรงงานแห่งชาติ', holiday_date: '2026-05-01', multiplier: 2, is_recurring: false },
  { id: 'hl-2026-05-04', name: 'วันฉัตรมงคล', holiday_date: '2026-05-04', multiplier: 2, is_recurring: false },
  { id: 'hl-2026-05-13', name: 'วันพืชมงคลจรดพระนังคัลแรกนาขวัญ', holiday_date: '2026-05-13', multiplier: 1, is_recurring: false },
  { id: 'hl-2026-05-31', name: 'วันวิสาขบูชา', holiday_date: '2026-05-31', multiplier: 2, is_recurring: false },
  { id: 'hl-2026-06-01', name: 'วันหยุดชดเชยวันวิสาขบูชา', holiday_date: '2026-06-01', multiplier: 2, is_recurring: false },
  { id: 'hl-2026-06-03', name: 'วันเฉลิมพระชนมพรรษาสมเด็จพระนางเจ้าฯ พระบรมราชินี', holiday_date: '2026-06-03', multiplier: 2, is_recurring: false },
  { id: 'hl-2026-07-28', name: 'วันพระบรมราชสมภพ ร.10', holiday_date: '2026-07-28', multiplier: 2, is_recurring: false },
  { id: 'hl-2026-07-29', name: 'วันอาสาฬหบูชา', holiday_date: '2026-07-29', multiplier: 2, is_recurring: false },
  { id: 'hl-2026-07-30', name: 'วันเข้าพรรษา', holiday_date: '2026-07-30', multiplier: 1, is_recurring: false },
  { id: 'hl-2026-08-12', name: 'วันเฉลิมพระชนมพรรษา สมเด็จพระนางเจ้าสิริกิติ์ฯ', holiday_date: '2026-08-12', multiplier: 2, is_recurring: false },
  { id: 'hl-2026-10-13', name: 'วันคล้ายวันสวรรคต ร.9', holiday_date: '2026-10-13', multiplier: 2, is_recurring: false },
  { id: 'hl-2026-10-16', name: 'วันหยุดพิเศษธนาคาร', holiday_date: '2026-10-16', multiplier: 1, is_recurring: false },
  { id: 'hl-2026-10-23', name: 'วันปิยมหาราช', holiday_date: '2026-10-23', multiplier: 2, is_recurring: false },
  { id: 'hl-2026-12-05', name: 'วันคล้ายวันพระบรมราชสมภพ ร.9', holiday_date: '2026-12-05', multiplier: 2, is_recurring: false },
  { id: 'hl-2026-12-07', name: 'วันหยุดชดเชยวันพ่อแห่งชาติ', holiday_date: '2026-12-07', multiplier: 2, is_recurring: false },
  { id: 'hl-2026-12-10', name: 'วันรัฐธรรมนูญ', holiday_date: '2026-12-10', multiplier: 2, is_recurring: false },
  { id: 'hl-2026-12-31', name: 'วันสิ้นปี', holiday_date: '2026-12-31', multiplier: 2, is_recurring: false },
  // 2027 (projected)
  { id: 'hl-2027-01-01', name: 'วันขึ้นปีใหม่', holiday_date: '2027-01-01', multiplier: 2, is_recurring: false },
  { id: 'hl-2027-02-21', name: 'วันมาฆบูชา (คาดการณ์)', holiday_date: '2027-02-21', multiplier: 2, is_recurring: false },
  { id: 'hl-2027-04-06', name: 'วันจักรี', holiday_date: '2027-04-06', multiplier: 2, is_recurring: false },
  { id: 'hl-2027-04-13', name: 'วันสงกรานต์', holiday_date: '2027-04-13', multiplier: 2, is_recurring: false },
  { id: 'hl-2027-04-14', name: 'วันสงกรานต์', holiday_date: '2027-04-14', multiplier: 2, is_recurring: false },
  { id: 'hl-2027-04-15', name: 'วันสงกรานต์', holiday_date: '2027-04-15', multiplier: 2, is_recurring: false },
  { id: 'hl-2027-05-03', name: 'วันแรงงานแห่งชาติ (ชดเชย)', holiday_date: '2027-05-03', multiplier: 2, is_recurring: false },
  { id: 'hl-2027-05-20', name: 'วันวิสาขบูชา (คาดการณ์)', holiday_date: '2027-05-20', multiplier: 2, is_recurring: false },
  { id: 'hl-2027-07-28', name: 'วันพระบรมราชสมภพ ร.10', holiday_date: '2027-07-28', multiplier: 2, is_recurring: false },
  { id: 'hl-2027-07-29', name: 'วันอาสาฬหบูชา (คาดการณ์)', holiday_date: '2027-07-29', multiplier: 2, is_recurring: false },
  { id: 'hl-2027-08-12', name: 'วันเฉลิมพระชนมพรรษา สมเด็จพระนางเจ้าสิริกิติ์ฯ', holiday_date: '2027-08-12', multiplier: 2, is_recurring: false },
  { id: 'hl-2027-10-23', name: 'วันปิยมหาราช', holiday_date: '2027-10-23', multiplier: 2, is_recurring: false },
  { id: 'hl-2027-12-05', name: 'วันคล้ายวันพระบรมราชสมภพ ร.9', holiday_date: '2027-12-05', multiplier: 2, is_recurring: false },
  { id: 'hl-2027-12-06', name: 'วันหยุดชดเชยวันพ่อแห่งชาติ (คาดการณ์)', holiday_date: '2027-12-06', multiplier: 2, is_recurring: false },
  { id: 'hl-2027-12-10', name: 'วันรัฐธรรมนูญ', holiday_date: '2027-12-10', multiplier: 2, is_recurring: false },
  { id: 'hl-2027-12-31', name: 'วันสิ้นปี', holiday_date: '2027-12-31', multiplier: 2, is_recurring: false },
];

async function seedTable(
  supabaseUrl: string,
  serviceKey: string,
  table: string,
  rows: Array<{ id: string }>,
  companyId: string,
): Promise<{ ok: boolean; inserted: number; error?: string }> {
  if (rows.length === 0) return { ok: true, inserted: 0 };
  try {
    // Convert seed ids (e.g. "sh-morning") → deterministic UUID v5
    // so the `id uuid` column accepts them.
    const converted = await Promise.all(
      rows.map(async (r) => ({ ...r, id: await seedIdToUuid(r.id) })),
    );

    const selRes = await fetch(
      `${supabaseUrl}/rest/v1/${table}?company_id=eq.${companyId}&select=id`,
      { headers: { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey } },
    );
    if (!selRes.ok) {
      return { ok: false, inserted: 0, error: `select ${selRes.status}` };
    }
    const existing = (await selRes.json()) as Array<{ id: string }>;
    const existingIds = new Set(existing.map((r) => r.id));
    const missing = converted
      .filter((r) => !existingIds.has(r.id))
      .map((r) => ({ ...r, company_id: companyId, created_at: NOW, updated_at: NOW }));
    if (missing.length === 0) return { ok: true, inserted: 0 };

    const insRes = await fetch(`${supabaseUrl}/rest/v1/${table}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(missing),
    });
    if (!insRes.ok) {
      const txt = await insRes.text();
      return { ok: false, inserted: 0, error: `${insRes.status} ${txt}` };
    }
    return { ok: true, inserted: missing.length };
  } catch (e) {
    return { ok: false, inserted: 0, error: e instanceof Error ? e.message : String(e) };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    if (!supabaseUrl || !serviceKey) {
      return jsonResponse({ error: 'Edge Function misconfigured (env missing)' }, 500);
    }

    // Verify caller is owner/admin
    const authHeader = req.headers.get('Authorization') ?? '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!token) return jsonResponse({ error: 'Missing Authorization header' }, 401);

    const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: anonKey },
    });
    if (!userRes.ok) return jsonResponse({ error: 'Invalid caller session' }, 401);
    const callerInfo = await userRes.json();
    const callerId: string = callerInfo?.id;
    if (!callerId) return jsonResponse({ error: 'Invalid caller session' }, 401);

    const profRes = await fetch(
      `${supabaseUrl}/rest/v1/profiles?id=eq.${callerId}&select=company_id,role,is_active`,
      { headers: { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey } },
    );
    if (!profRes.ok) return jsonResponse({ error: 'Profile lookup failed' }, 500);
    const profArr = await profRes.json();
    const callerProfile = profArr?.[0];
    if (!callerProfile || !callerProfile.is_active) {
      return jsonResponse({ error: 'Caller profile not found or inactive' }, 403);
    }
    if (!['owner', 'admin'].includes(callerProfile.role)) {
      return jsonResponse({ error: 'Only owner/admin can seed defaults' }, 403);
    }
    const companyId: string = callerProfile.company_id;

    // Run all 5 tables in parallel
    const [shiftsR, payR, leaveR, locR, holR] = await Promise.all([
      seedTable(supabaseUrl, serviceKey, 'shifts', SHIFTS, companyId),
      seedTable(supabaseUrl, serviceKey, 'pay_rules', PAY_RULES, companyId),
      seedTable(supabaseUrl, serviceKey, 'leave_types', LEAVE_TYPES, companyId),
      seedTable(supabaseUrl, serviceKey, 'locations', LOCATIONS, companyId),
      seedTable(supabaseUrl, serviceKey, 'holidays', HOLIDAYS, companyId),
    ]);

    return jsonResponse({
      ok: true,
      company_id: companyId,
      summary: {
        shifts: shiftsR,
        pay_rules: payR,
        leave_types: leaveR,
        locations: locR,
        holidays: holR,
      },
    });
  } catch (e) {
    return jsonResponse({ error: `Unhandled: ${e instanceof Error ? e.message : String(e)}` }, 500);
  }
});
