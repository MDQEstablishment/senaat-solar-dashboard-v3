// R30.5 — send-notification Edge Function (Supabase / Deno)
//
// Sends transactional emails for two events:
//   1. kind: 'escalation_created' — to the user the escalation was raised to
//   2. kind: 'task_assigned'      — to the assignee (when != creator)
//
// Uses Resend's REST API directly (no SDK — keeps the function tiny).
//
// CRITICAL CONTRACT: if RESEND_API_KEY is NOT set in project secrets, this
// function returns 200 { skipped: true, reason: 'RESEND_API_KEY not configured' }
// instead of erroring. The frontend invokes fire-and-forget; emails are a
// nice-to-have and must NEVER fail the underlying mutation.

import { createClient } from 'jsr:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info',
  'Access-Control-Max-Age': '86400',
};

const FROM_ADDRESS = 'SENAAT Dashboard <notifications@zamildashboard.com>';
const APP_BASE_URL = 'https://zamildashboard.com';

interface NotifyBody {
  kind?: 'escalation_created' | 'task_assigned';
  record?: Record<string, unknown>;
  recipient_email?: string;
  recipient_name?: string;
  actor_name?: string;
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

function escalationHtml(p: { recipient_name: string; actor_name: string; title: string; severity: string; reason: string; link: string }): string {
  return `<!doctype html>
<html><body style="font-family:system-ui,sans-serif;color:#0f172a;background:#f8fafc;padding:24px">
  <div style="max-width:560px;margin:0 auto;background:white;border-radius:12px;padding:24px;border:1px solid #e2e8f0">
    <h2 style="margin:0 0 12px;color:#dc2626">New escalation raised to you</h2>
    <p style="margin:0 0 16px">Hi ${p.recipient_name},</p>
    <p style="margin:0 0 16px"><strong>${p.actor_name}</strong> just escalated the following to you:</p>
    <div style="background:#fef2f2;border-left:4px solid #dc2626;padding:12px 16px;margin:16px 0">
      <div style="font-weight:600;font-size:16px">${p.title}</div>
      <div style="margin-top:6px;color:#475569">Severity: <strong>${p.severity}</strong></div>
      ${p.reason ? `<div style="margin-top:8px;color:#475569">${p.reason}</div>` : ''}
    </div>
    <p style="margin:24px 0 0">
      <a href="${p.link}" style="background:#0ea5e9;color:white;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:500">Open escalation</a>
    </p>
    <p style="margin-top:32px;color:#94a3b8;font-size:12px">SENAAT Solar Programs Dashboard · Zamil Services</p>
  </div>
</body></html>`;
}

function taskHtml(p: { recipient_name: string; actor_name: string; title: string; due: string; priority: string; link: string }): string {
  return `<!doctype html>
<html><body style="font-family:system-ui,sans-serif;color:#0f172a;background:#f8fafc;padding:24px">
  <div style="max-width:560px;margin:0 auto;background:white;border-radius:12px;padding:24px;border:1px solid #e2e8f0">
    <h2 style="margin:0 0 12px;color:#0ea5e9">New task assigned to you</h2>
    <p style="margin:0 0 16px">Hi ${p.recipient_name},</p>
    <p style="margin:0 0 16px"><strong>${p.actor_name}</strong> assigned you a new task:</p>
    <div style="background:#f0f9ff;border-left:4px solid #0ea5e9;padding:12px 16px;margin:16px 0">
      <div style="font-weight:600;font-size:16px">${p.title}</div>
      <div style="margin-top:6px;color:#475569">Due: <strong>${p.due || '—'}</strong> · Priority: <strong>${p.priority}</strong></div>
    </div>
    <p style="margin:24px 0 0">
      <a href="${p.link}" style="background:#0ea5e9;color:white;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:500">Open task</a>
    </p>
    <p style="margin-top:32px;color:#94a3b8;font-size:12px">SENAAT Solar Programs Dashboard · Zamil Services</p>
  </div>
</body></html>`;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' });

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!SUPABASE_URL || !SERVICE_ROLE) {
    return json(500, { error: 'Server misconfigured: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' });
  }

  const authHeader = req.headers.get('Authorization') || '';
  if (!authHeader.startsWith('Bearer ')) {
    return json(401, { error: 'Missing Authorization: Bearer <jwt>' });
  }
  const userClient = createClient(SUPABASE_URL, SERVICE_ROLE, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData?.user) {
    return json(401, { error: 'Invalid or expired token' });
  }

  let body: NotifyBody;
  try { body = await req.json(); } catch { return json(400, { error: 'Invalid JSON body' }); }
  const kind = body.kind;
  const recipient_email = body.recipient_email;
  const recipient_name = body.recipient_name || 'team member';
  const actor_name = body.actor_name || 'A teammate';
  const record = (body.record || {}) as Record<string, unknown>;

  if (!kind || (kind !== 'escalation_created' && kind !== 'task_assigned')) {
    return json(400, { error: "Invalid 'kind' — must be 'escalation_created' or 'task_assigned'" });
  }
  if (!recipient_email || typeof recipient_email !== 'string' || !recipient_email.includes('@')) {
    return json(400, { error: 'Invalid recipient_email' });
  }

  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
  if (!RESEND_API_KEY) {
    return json(200, { skipped: true, reason: 'RESEND_API_KEY not configured' });
  }

  let subject = '';
  let html = '';
  if (kind === 'escalation_created') {
    const title = String(record.title || 'Untitled escalation');
    const severity = String(record.urgency || record.severity || 'Medium');
    const reason = String(record.reason || '');
    const link = `${APP_BASE_URL}/#/escalations`;
    subject = `New escalation: ${title}`;
    html = escalationHtml({ recipient_name, actor_name, title, severity, reason, link });
  } else {
    const title = String(record.title || 'Untitled task');
    const due = String(record.due || '');
    const priority = String(record.priority || 'Medium');
    const link = `${APP_BASE_URL}/#/my-tasks`;
    subject = `New task assigned: ${title}`;
    html = taskHtml({ recipient_name, actor_name, title, due, priority, link });
  }

  try {
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: [recipient_email],
        subject,
        html,
      }),
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      return json(502, { error: 'Resend rejected the email', detail: data });
    }
    return json(200, { sent: true, kind, recipient_email, resend_id: data.id || null });
  } catch (err) {
    return json(502, { error: 'Resend fetch failed', detail: String(err) });
  }
});
