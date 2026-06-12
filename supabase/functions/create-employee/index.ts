// Supabase Edge Function: create-employee
//
// Owner-only: takes employee details + plain-text password, uses
// service_role to create a Supabase Auth user, then inserts a row
// in public.profiles (role = 'employee') and public.employees
// (linked to the profile).
//
// Deploy:
//   supabase functions deploy create-employee
//
// The function verifies that the caller is an authenticated owner
// by reading the JWT, looking up their profile, and checking
// role IN ('owner', 'admin').

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

interface CreateEmployeeRequest {
  full_name: string;
  email: string;
  password: string;
  nickname?: string;
  phone?: string;
  position?: string;
  employment_type: 'fulltime_passed' | 'fulltime_not_passed' | 'parttime';
  pay_rule_id?: string | null;
  default_shift_id?: string | null;
  start_date: string;
  role?: 'employee' | 'admin';
}

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

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  try {
    // 1. Authenticate caller (must be an owner/admin in the same company)
    const authHeader = req.headers.get('Authorization') ?? '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!token) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    if (!supabaseUrl || !serviceKey) {
      return new Response(
        JSON.stringify({ error: 'Edge Function misconfigured (env missing)' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Caller-scoped client (uses the caller's JWT to query public.profiles)
    const callerClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: callerInfo, error: callerErr } = await callerClient.auth.getUser(token);
    if (callerErr || !callerInfo?.user) {
      return new Response(JSON.stringify({ error: 'Invalid caller session' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const callerId = callerInfo.user.id;

    // Admin client (service_role — bypasses RLS, used for writes)
    const adminClient = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Look up caller profile + role
    const { data: callerProfile, error: profileErr } = await adminClient
      .from('profiles')
      .select('id, company_id, role, is_active')
      .eq('id', callerId)
      .maybeSingle();
    if (profileErr) {
      return new Response(JSON.stringify({ error: `Profile lookup failed: ${profileErr.message}` }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!callerProfile || !callerProfile.is_active) {
      return new Response(JSON.stringify({ error: 'Caller profile not found or inactive' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!['owner', 'admin'].includes(callerProfile.role)) {
      return new Response(JSON.stringify({ error: 'Only owner/admin can create employees' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const companyId = callerProfile.company_id;

    // 2. Parse + validate request
    const body: CreateEmployeeRequest = await req.json();
    if (!body.email || !body.password || !body.full_name || !body.employment_type || !body.start_date) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields (email, password, full_name, employment_type, start_date)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    if (body.password.length < 6) {
      return new Response(JSON.stringify({ error: 'Password must be at least 6 characters' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Check email is not already used
    const { data: existingUsers } = await adminClient.auth.admin.listUsers();
    const dup = existingUsers?.users?.find((u) => u.email?.toLowerCase() === body.email.toLowerCase());
    if (dup) {
      return new Response(JSON.stringify({ error: 'Email already exists' }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 4. Create Supabase Auth user
    const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
      email: body.email,
      password: body.password,
      email_confirm: true,
      user_metadata: { full_name: body.full_name },
    });
    if (createErr || !created?.user) {
      return new Response(
        JSON.stringify({ error: `Failed to create auth user: ${createErr?.message ?? 'unknown'}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    const newUserId = created.user.id;

    // 5. Insert public.profiles
    const { error: insertProfileErr } = await adminClient.from('profiles').insert({
      id: newUserId,
      company_id: companyId,
      email: body.email,
      full_name: body.full_name,
      role: body.role ?? 'employee',
      phone: body.phone ?? null,
      is_active: true,
    });
    if (insertProfileErr) {
      // rollback auth user
      await adminClient.auth.admin.deleteUser(newUserId);
      return new Response(JSON.stringify({ error: `Failed to insert profile: ${insertProfileErr.message}` }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 6. Insert public.employees
    //    Generate employee_code = EMP001, EMP002, ... (count within company)
    const { count } = await adminClient
      .from('employees')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', companyId);
    const employeeCode = `EMP${String((count ?? 0) + 1).padStart(3, '0')}`;

    const { data: empRow, error: insertEmpErr } = await adminClient
      .from('employees')
      .insert({
        company_id: companyId,
        profile_id: newUserId,
        employee_code: employeeCode,
        full_name: body.full_name,
        nickname: body.nickname ?? null,
        phone: body.phone ?? null,
        email: body.email,
        position: body.position ?? null,
        employment_type: body.employment_type,
        pay_rule_id: body.pay_rule_id ?? null,
        default_shift_id: body.default_shift_id ?? null,
        start_date: body.start_date,
        status: 'active',
        avatar_color: pickAvatarColor(body.full_name),
      })
      .select()
      .single();
    if (insertEmpErr || !empRow) {
      await adminClient.auth.admin.deleteUser(newUserId);
      await adminClient.from('profiles').delete().eq('id', newUserId);
      return new Response(
        JSON.stringify({ error: `Failed to insert employee: ${insertEmpErr?.message ?? 'unknown'}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({ ok: true, employee: empRow, login: { email: body.email, password: body.password } }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: `Unhandled: ${(e as Error).message}` }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
