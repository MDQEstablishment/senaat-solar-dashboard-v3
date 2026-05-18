// R30.4 — create-user Edge Function (Supabase / Deno)
//
// Purpose: Server-side path for the addUser admin flow. The browser cannot
// call supabase.auth.admin.createUser (that requires the service-role key,
// which must NEVER ship in the client bundle). This function runs in a
// Deno isolate with access to the service_role secret + the caller's JWT,
// so we can:
//   1. Verify the caller is signed in.
//   2. Check the caller's profile.role is one of (vp / manager /
//      operations_manager). Reject 403 otherwise.
//   3. Create the auth.users row (auto-confirmed) + matching profiles row
//      with the new user's UUID as id (FK satisfied).
//   4. Return { user_id, profile_id } on success, or { error } on failure.
//
// Deploy (operator runs from repo root, NOT the function dir):
//   supabase functions deploy create-user --no-verify-jwt=false
//
// Secrets required (set once per project):
//   supabase secrets set SUPABASE_URL=https://bhesznqfrcyikfupdgkx.supabase.co
//   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<service_role>
//   (SUPABASE_URL is usually auto-injected; service_role MUST be set.)
//
// Invoke from frontend:
//   const { data, error } = await supabase.functions.invoke('create-user', {
//     body: { email, full_name, role, mobile, default_regions, temp_password }
//   });
//
// Function is NOT public — `--no-verify-jwt=false` (the default) keeps the
// `Authorization: Bearer <user_jwt>` requirement so we can identify the caller.

import { createClient } from 'jsr:@supabase/supabase-js@2';

const ALLOWED_ROLES = new Set(['vp', 'manager', 'operations_manager']);

interface CreateUserBody {
  email?: string;
  full_name?: string;
  role?: string;
  mobile?: string | null;
  default_regions?: string[];
  temp_password?: string;
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  // Only POST is meaningful.
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' });

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!SUPABASE_URL || !SERVICE_ROLE) {
    return json(500, { error: 'Server misconfigured: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' });
  }

  // Step 1: verify the caller has a session.
  const authHeader = req.headers.get('Authorization') || '';
  if (!authHeader.startsWith('Bearer ')) {
    return json(401, { error: 'Missing Authorization: Bearer <jwt>' });
  }
  // Use a per-request client carrying the caller's JWT so RLS applies to the
  // role-check select below (defense in depth).
  const userClient = createClient(SUPABASE_URL, SERVICE_ROLE, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData?.user) {
    return json(401, { error: 'Invalid or expired token' });
  }
  const callerId = userData.user.id;

  // Step 2: check the caller's profile.role is allowed.
  const { data: callerProfile, error: callerErr } = await userClient
    .from('profiles')
    .select('role')
    .eq('id', callerId)
    .single();
  if (callerErr || !callerProfile) {
    return json(403, { error: 'Caller has no profile row' });
  }
  if (!ALLOWED_ROLES.has(callerProfile.role)) {
    return json(403, { error: `Role '${callerProfile.role}' cannot create users` });
  }

  // Step 3: parse + validate body.
  let body: CreateUserBody;
  try { body = await req.json(); } catch { return json(400, { error: 'Invalid JSON body' }); }
  const { email, full_name, role, mobile, default_regions, temp_password } = body;
  if (!email || !full_name || !role || !temp_password) {
    return json(400, { error: 'Required: email, full_name, role, temp_password' });
  }

  // Step 4: create auth.users row + profile row using the admin (service-role) client.
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password: temp_password,
    email_confirm: true,
    user_metadata: { created_by: callerId, full_name },
  });
  if (createErr || !created?.user) {
    return json(500, { error: createErr?.message || 'auth.admin.createUser failed' });
  }
  const newUserId = created.user.id;

  const { data: profileRow, error: profileErr } = await admin
    .from('profiles')
    .insert({
      id: newUserId,
      full_name,
      email,
      role,
      mobile: mobile ?? null,
      default_regions: Array.isArray(default_regions) ? default_regions : [],
      archived: false,
    })
    .select('id')
    .single();

  if (profileErr) {
    // Roll back the auth user so a partial state doesn't leak.
    try { await admin.auth.admin.deleteUser(newUserId); } catch (_) {}
    return json(500, { error: 'profile insert failed: ' + profileErr.message });
  }

  return json(200, { user_id: newUserId, profile_id: profileRow.id });
});
