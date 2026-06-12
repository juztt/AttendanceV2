// Supabase Edge Function: create-employee
//
// Owner-only: takes employee details + plain-text password, uses
// service_role to create a Supabase Auth user, then inserts a row
// in public.profiles and public.employees.
//
// Uses raw fetch() against the Supabase REST API instead of
// @supabase/supabase-js — the latter pulls in code that touches
// `window` at module-init time, which Deno does not have, causing
// EDGE_FUNCTION_ERROR / 500 on cold start.
//
// Deploy:
//   supabase functions deploy create-employee

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function pickAvatarColor(name: string): string {
  const palette = [
    '#A7F3D0', '#BFDBFE', '#C4B5FD', '#FED7AA', '#F9A8D4',
    '#FDBA74', '#93C5FD', '#A78BFA', '#FCA5A5', '#6EE7B7',
  ];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return palette[h % palette.length];
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    // 0. Read env
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    if (!supabaseUrl || !serviceKey) {
      console.error('env missing', { hasUrl: !!supabaseUrl, hasServiceKey: !!serviceKey });
      return jsonResponse({ error: 'Edge Function misconfigured (env missing)' }, 500);
    }

    // 1. Authenticate caller via their JWT against the auth endpoint
    const authHeader = req.headers.get('Authorization') ?? '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!token) return jsonResponse({ error: 'Missing Authorization header' }, 401);

    const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: anonKey,
      },
    });
    if (!userRes.ok) {
      const txt = await userRes.text();
      console.error('auth.getUser failed', userRes.status, txt);
      return jsonResponse({ error: `Invalid caller session: ${userRes.status}` }, 401);
    }
    const callerInfo = await userRes.json();
    const callerId: string = callerInfo?.id;
    if (!callerId) {
      console.error('caller info has no id', callerInfo);
      return jsonResponse({ error: 'Invalid caller session (no id)' }, 401);
    }
    console.log('callerId =', callerId);

    // 2. Look up caller profile (using service role → bypasses RLS)
    const profileRes = await fetch(
      `${supabaseUrl}/rest/v1/profiles?id=eq.${callerId}&select=id,company_id,role,is_active`,
      {
        headers: {
          Authorization: `Bearer ${serviceKey}`,
          apikey: serviceKey,
        },
      },
    );
    if (!profileRes.ok) {
      const txt = await profileRes.text();
      console.error('profile lookup failed', profileRes.status, txt);
      return jsonResponse({ error: `Profile lookup failed: ${profileRes.status}` }, 500);
    }
    const profileArr = await profileRes.json();
    const callerProfile = profileArr?.[0];
    if (!callerProfile || !callerProfile.is_active) {
      console.error('caller profile not found or inactive', callerProfile);
      return jsonResponse({ error: 'Caller profile not found or inactive' }, 403);
    }
    if (!['owner', 'admin'].includes(callerProfile.role)) {
      console.error('caller role not allowed', callerProfile.role);
      return jsonResponse({ error: 'Only owner/admin can create employees' }, 403);
    }
    const companyId: string = callerProfile.company_id;
    console.log('companyId =', companyId);

    // 3. Parse + validate request body
    const body = await req.json();
    const email: string = (body?.email ?? '').trim();
    const password: string = body?.password ?? '';
    const full_name: string = (body?.full_name ?? '').trim();
    const employment_type: string = body?.employment_type ?? '';
    const start_date: string = body?.start_date ?? '';
    const nickname: string | null = body?.nickname?.trim() || null;
    const phone: string | null = body?.phone?.trim() || null;
    const position: string | null = body?.position?.trim() || null;
    const pay_rule_id: string | null = body?.pay_rule_id || null;
    const default_shift_id: string | null = body?.default_shift_id || null;
    const role: string = body?.role ?? 'employee';

    if (!email || !password || !full_name || !employment_type || !start_date) {
      return jsonResponse(
        { error: 'Missing required fields (email, password, full_name, employment_type, start_date)' },
        400,
      );
    }
    if (password.length < 6) {
      return jsonResponse({ error: 'Password must be at least 6 characters' }, 400);
    }

    // 4. Check email is not already used
    const existingRes = await fetch(
      `${supabaseUrl}/auth/v1/admin/users?page=1&per_page=50`,
      {
        headers: {
          Authorization: `Bearer ${serviceKey}`,
          apikey: serviceKey,
        },
      },
    );
    if (existingRes.ok) {
      const existingData = await existingRes.json();
      const dup = (existingData?.users ?? []).find(
        (u: { email?: string }) => u.email?.toLowerCase() === email.toLowerCase(),
      );
      if (dup) {
        return jsonResponse({ error: 'Email already exists' }, 409);
      }
    }
    // (if list fails, continue — admin.createUser will fail on duplicate)

    // 5. Create Supabase Auth user via Admin API
    const createUserRes = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name },
      }),
    });
    if (!createUserRes.ok) {
      const txt = await createUserRes.text();
      console.error('admin.createUser failed', createUserRes.status, txt);
      return jsonResponse(
        { error: `Failed to create auth user: ${createUserRes.status} ${txt}` },
        500,
      );
    }
    const createdUser = await createUserRes.json();
    const newUserId: string = createdUser?.id;
    if (!newUserId) {
      console.error('createUser response missing id', createdUser);
      return jsonResponse({ error: 'Auth user created but no id returned' }, 500);
    }
    console.log('created auth user =', newUserId);

    // 6. Insert public.profiles
    const profileInsertRes = await fetch(`${supabaseUrl}/rest/v1/profiles`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        id: newUserId,
        company_id: companyId,
        email,
        full_name,
        role,
        phone,
        is_active: true,
      }),
    });
    if (!profileInsertRes.ok) {
      const txt = await profileInsertRes.text();
      console.error('profile insert failed', profileInsertRes.status, txt);
      // rollback auth user
      await fetch(`${supabaseUrl}/auth/v1/admin/users/${newUserId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey },
      });
      return jsonResponse(
        { error: `Failed to insert profile: ${profileInsertRes.status} ${txt}` },
        500,
      );
    }
    console.log('inserted profile');

    // 7. Compute next employee_code
    const countRes = await fetch(
      `${supabaseUrl}/rest/v1/employees?company_id=eq.${companyId}&select=id`,
      {
        headers: {
          Authorization: `Bearer ${serviceKey}`,
          apikey: serviceKey,
          Prefer: 'count=exact',
          Range: '0-0',
        },
      },
    );
    let employeeCode = 'EMP001';
    if (countRes.ok) {
      const range = countRes.headers.get('content-range') ?? '';
      const m = range.match(/\/(\d+)/);
      if (m) {
        const n = parseInt(m[1], 10);
        employeeCode = `EMP${String(n + 1).padStart(3, '0')}`;
      }
    }
    console.log('employeeCode =', employeeCode);

    // 8. Insert public.employees
    const empInsertRes = await fetch(`${supabaseUrl}/rest/v1/employees`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify({
        company_id: companyId,
        profile_id: newUserId,
        employee_code: employeeCode,
        full_name,
        nickname,
        phone,
        email,
        position,
        employment_type,
        pay_rule_id,
        default_shift_id,
        start_date,
        status: 'active',
        avatar_color: pickAvatarColor(full_name),
      }),
    });
    if (!empInsertRes.ok) {
      const txt = await empInsertRes.text();
      console.error('employee insert failed', empInsertRes.status, txt);
      // rollback
      await fetch(`${supabaseUrl}/auth/v1/admin/users/${newUserId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey },
      });
      await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${newUserId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey },
      });
      return jsonResponse(
        { error: `Failed to insert employee: ${empInsertRes.status} ${txt}` },
        500,
      );
    }
    const empRows = await empInsertRes.json();
    const empRow = Array.isArray(empRows) ? empRows[0] : empRows;
    console.log('inserted employee', empRow?.id);

    return jsonResponse(
      {
        ok: true,
        employee: empRow,
        login: { email, password },
      },
      200,
    );
  } catch (e) {
    console.error('unhandled error', (e as Error)?.message, (e as Error)?.stack);
    return jsonResponse({ error: `Unhandled: ${(e as Error).message}` }, 500);
  }
});
