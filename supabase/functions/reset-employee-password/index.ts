// Supabase Edge Function: reset-employee-password
//
// Owner-only: takes employee_id + new_password, looks up the linked
// Supabase Auth user via profile_id, then calls the Admin API to
// set a new password.
//
// Uses raw fetch() — see create-employee for the rationale.

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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    if (!supabaseUrl || !serviceKey) {
      return jsonResponse({ error: 'Edge Function misconfigured (env missing)' }, 500);
    }

    // Auth caller
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

    // Caller profile
    const profileRes = await fetch(
      `${supabaseUrl}/rest/v1/profiles?id=eq.${callerId}&select=company_id,role,is_active`,
      {
        headers: { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey },
      },
    );
    if (!profileRes.ok) return jsonResponse({ error: 'Caller profile lookup failed' }, 500);
    const profileArr = await profileRes.json();
    const callerProfile = profileArr?.[0];
    if (!callerProfile || !callerProfile.is_active) {
      return jsonResponse({ error: 'Caller profile not found or inactive' }, 403);
    }
    if (!['owner', 'admin'].includes(callerProfile.role)) {
      return jsonResponse({ error: 'Only owner/admin can reset passwords' }, 403);
    }

    // Body
    const body = await req.json();
    const employee_id: string = body?.employee_id ?? '';
    const new_password: string = body?.new_password ?? '';
    if (!employee_id || !new_password) {
      return jsonResponse({ error: 'Missing employee_id or new_password' }, 400);
    }
    if (new_password.length < 6) {
      return jsonResponse({ error: 'Password must be at least 6 characters' }, 400);
    }

    // Look up employee
    const empRes = await fetch(
      `${supabaseUrl}/rest/v1/employees?id=eq.${employee_id}&select=id,profile_id,company_id`,
      {
        headers: { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey },
      },
    );
    if (!empRes.ok) return jsonResponse({ error: 'Employee lookup failed' }, 500);
    const empArr = await empRes.json();
    const emp = empArr?.[0];
    if (!emp) return jsonResponse({ error: 'Employee not found' }, 404);
    if (emp.company_id !== callerProfile.company_id) {
      return jsonResponse({ error: 'Cross-company access denied' }, 403);
    }
    if (!emp.profile_id) {
      return jsonResponse({ error: 'Employee has no login account yet' }, 400);
    }

    // Update password
    const updRes = await fetch(`${supabaseUrl}/auth/v1/admin/users/${emp.profile_id}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ password: new_password }),
    });
    if (!updRes.ok) {
      const txt = await updRes.text();
      return jsonResponse(
        { error: `Failed to update password: ${updRes.status} ${txt}` },
        500,
      );
    }

    return jsonResponse({ ok: true }, 200);
  } catch (e) {
    console.error('unhandled error', (e as Error)?.message);
    return jsonResponse({ error: `Unhandled: ${(e as Error).message}` }, 500);
  }
});
