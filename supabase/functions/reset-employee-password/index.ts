// Supabase Edge Function: reset-employee-password
//
// Owner-only: takes employee_id + new_password, looks up the linked
// Supabase Auth user via profile_id, then calls auth.admin.updateUserById
// to set a new password.
//
// Deploy:
//   supabase functions deploy reset-employee-password

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  try {
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

    const adminClient = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Verify caller
    const { data: callerInfo, error: callerErr } = await adminClient.auth.getUser(token);
    if (callerErr || !callerInfo?.user) {
      return new Response(JSON.stringify({ error: 'Invalid caller session' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const callerId = callerInfo.user.id;

    const { data: callerProfile } = await adminClient
      .from('profiles')
      .select('company_id, role, is_active')
      .eq('id', callerId)
      .maybeSingle();
    if (!callerProfile || !callerProfile.is_active) {
      return new Response(JSON.stringify({ error: 'Caller profile not found or inactive' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!['owner', 'admin'].includes(callerProfile.role)) {
      return new Response(JSON.stringify({ error: 'Only owner/admin can reset passwords' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { employee_id, new_password } = body ?? {};
    if (!employee_id || !new_password) {
      return new Response(JSON.stringify({ error: 'Missing employee_id or new_password' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (new_password.length < 6) {
      return new Response(JSON.stringify({ error: 'Password must be at least 6 characters' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Look up the employee, ensure same company
    const { data: emp } = await adminClient
      .from('employees')
      .select('id, profile_id, company_id')
      .eq('id', employee_id)
      .maybeSingle();
    if (!emp) {
      return new Response(JSON.stringify({ error: 'Employee not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (emp.company_id !== callerProfile.company_id) {
      return new Response(JSON.stringify({ error: 'Cross-company access denied' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!emp.profile_id) {
      return new Response(JSON.stringify({ error: 'Employee has no login account yet' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { error: updErr } = await adminClient.auth.admin.updateUserById(emp.profile_id, {
      password: new_password,
    });
    if (updErr) {
      return new Response(JSON.stringify({ error: `Failed to update password: ${updErr.message}` }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: `Unhandled: ${(e as Error).message}` }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
