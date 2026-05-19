// R30.19 — admin-reset-password Edge Function
//
// Allows a Manager/VP/Operations Manager/Admin to reset another user's password
// via Supabase Auth Admin API. The old "resetUserPassword" in store-r2.jsx only
// updated local state and produced a fake toast — this function makes the reset
// actually take effect in auth.users.
//
// Body: { target_user_id: uuid, new_password: string }
// Returns: { reset: true, target_user_id }
//
// Deploy:
//   supabase functions deploy admin-reset-password
import { createClient } from 'jsr:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

const ALLOWED_CALLERS = new Set(['vp', 'manager', 'operations_manager', 'admin']);

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' });

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!SUPABASE_URL || !SERVICE_ROLE) {
    return json(500, { error: 'Server misconfigured' });
  }

  const auth = req.headers.get('Authorization') || '';
  if (!auth.startsWith('Bearer ')) return json(401, { error: 'Missing Authorization' });

  // 1) Verify caller identity + role.
  const caller = createClient(SUPABASE_URL, SERVICE_ROLE, {
    global: { headers: { Authorization: auth } },
  });
  const { data: u, error: ue } = await caller.auth.getUser();
  if (ue || !u?.user) return json(401, { error: 'Invalid token' });

  const { data: callerProfile } = await caller
    .from('profiles').select('role').eq('id', u.user.id).single();
  if (!callerProfile || !ALLOWED_CALLERS.has(callerProfile.role)) {
    return json(403, { error: `Role '${callerProfile?.role}' cannot reset passwords` });
  }

  // 2) Parse + validate.
  let body: any;
  try { body = await req.json(); } catch { return json(400, { error: 'Invalid JSON' }); }
  const target_user_id = body.target_user_id;
  const new_password   = body.new_password;
  if (!target_user_id || !new_password || new_password.length < 8) {
    return json(400, { error: 'Required: target_user_id (uuid), new_password (>= 8 chars)' });
  }

  // 3) Do the reset via service-role.
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
  const { error: updErr } = await admin.auth.admin.updateUserById(target_user_id, {
    password: new_password,
  });
  if (updErr) return json(500, { error: updErr.message });

  return json(200, { reset: true, target_user_id });
});
