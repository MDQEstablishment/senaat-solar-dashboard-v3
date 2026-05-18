// R30.5 — Email notification helper.
//
// Fire-and-forget bridge between frontend mutators (addTask, addEscalation,
// escalateFurther) and the send-notification Supabase Edge Function. Imported
// once in main.jsx to install on window so the legacy stores can call it
// without a React dependency.
//
// Contract:
//   window.notifyEmail(kind, record, recipientUserId, actorUserId)
//
// Behavior:
//   • Returns immediately. Resolves a Promise internally that is .catch()'d
//     so a failed invoke can NEVER reject up to a mutator caller.
//   • Short-circuits with a console.debug when:
//       - USE_SUPABASE is false (demo mode)
//       - window.supabase is missing
//       - recipientUserId resolves to no profile or no email
//       - recipient === actor (don't email yourself)
//   • Looks up email + display name from window.PEOPLE (synced by the boot
//     orchestrator's _setPeople wrapper, so always current).

import { supabase } from './supabase.js';

function findPerson(userId) {
  if (!userId || typeof window === 'undefined') return null;
  const list = window.PEOPLE;
  if (!Array.isArray(list)) return null;
  return list.find((p) => p && p.id === userId) || null;
}

export function notifyEmail(kind, record, recipientUserId, actorUserId) {
  try {
    if (typeof window === 'undefined') return;
    if (!window.USE_SUPABASE || !supabase) {
      // Demo mode — silently skip.
      return;
    }
    if (kind !== 'escalation_created' && kind !== 'task_assigned') {
      console.debug('[notifyEmail] unknown kind', kind);
      return;
    }
    if (!recipientUserId || recipientUserId === actorUserId) return;

    const recipient = findPerson(recipientUserId);
    if (!recipient || !recipient.email) {
      console.debug('[notifyEmail] recipient missing email', { kind, recipientUserId });
      return;
    }
    const actor = findPerson(actorUserId);
    const actor_name = (actor && actor.name) || 'A teammate';
    const recipient_name = recipient.name || 'team member';

    // Fire-and-forget. The .catch() is critical — a rejected invoke must
    // NEVER bubble up into the mutator flow.
    supabase.functions.invoke('send-notification', {
      body: {
        kind,
        record,
        recipient_email: recipient.email,
        recipient_name,
        actor_name,
      },
    }).then((res) => {
      if (res && res.data && res.data.skipped) {
        console.debug('[notifyEmail] skipped — RESEND_API_KEY not configured');
      } else if (res && res.error) {
        console.debug('[notifyEmail] error', res.error);
      } else {
        console.debug('[notifyEmail] sent', kind, recipient.email);
      }
    }).catch((err) => {
      console.debug('[notifyEmail] invoke threw', err);
    });
  } catch (err) {
    console.debug('[notifyEmail] outer catch', err);
  }
}

// Install on window so legacy stores (store.jsx, store-r2.jsx) can call it
// without an ES import. Safe under SSR + safe under test (no window).
if (typeof window !== 'undefined') {
  window.notifyEmail = notifyEmail;
}
