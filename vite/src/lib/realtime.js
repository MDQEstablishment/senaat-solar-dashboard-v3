// R30.7 — Supabase Realtime subscriptions for hot tables.
//
// Keeps the three highest-collaboration tables fresh across users without
// a manual refresh:
//   • tasks            — INSERT/UPDATE
//   • escalations      — INSERT/UPDATE
//   • delivery_notes   — INSERT/UPDATE
//
// On any postgres_changes event we don't try to surgically merge the row
// (translators + nested joins make that brittle). Instead we re-run the
// corresponding bgFetch* and re-call _set* — same code path the boot
// orchestrator uses, so the UI never sees a half-migrated state.
//
// RLS is respected automatically: each session's realtime stream only
// emits rows that session's user can SELECT, so VPs/Managers see all,
// PMs see only their projects, etc.
//
// Lifecycle:
//   installRealtime(store)  → installs channel, returns unsubscribe()
//   Caller (app.jsx) calls install on SIGNED_IN (after boot) and the
//   returned cleanup on SIGNED_OUT.

import { supabase } from './supabase.js';

let _channel = null;
let _debounceTimers = { tasks: null, escalations: null, delivery_notes: null };

function refreshTasks(store) {
  if (!window.bgFetchTasks || !window.fromDbTask || !store._setTasks) return;
  window.bgFetchTasks().then((rows) => {
    if (!Array.isArray(rows)) return;
    store._setTasks(rows.map(window.fromDbTask));
    console.debug('[realtime] tasks re-synced (' + rows.length + ' rows)');
  }).catch((err) => console.debug('[realtime] tasks refresh failed', err));
}

function refreshEscalations(store) {
  if (!window.bgFetchEscalations || !window.fromDbEscalation || !store._setEscalations) return;
  window.bgFetchEscalations().then((rows) => {
    if (!Array.isArray(rows)) return;
    store._setEscalations(rows.map(window.fromDbEscalation));
    console.debug('[realtime] escalations re-synced (' + rows.length + ' rows)');
  }).catch((err) => console.debug('[realtime] escalations refresh failed', err));
}

function refreshDeliveryNotes(store) {
  if (!window.bgFetchDeliveryNotes || !window.fromDbDeliveryNote || !store._setDeliveryNotes) return;
  window.bgFetchDeliveryNotes().then((rows) => {
    if (!Array.isArray(rows)) return;
    store._setDeliveryNotes(rows.map(window.fromDbDeliveryNote));
    console.debug('[realtime] delivery_notes re-synced (' + rows.length + ' rows)');
  }).catch((err) => console.debug('[realtime] delivery_notes refresh failed', err));
}

// Debounce same-table changes so a flurry of INSERTs only triggers one fetch.
function debounce(table, fn) {
  if (_debounceTimers[table]) clearTimeout(_debounceTimers[table]);
  _debounceTimers[table] = setTimeout(fn, 250);
}

export function installRealtime(store) {
  if (!supabase || typeof window === 'undefined' || !window.USE_SUPABASE) {
    return () => {};
  }
  // Idempotent: tear down any prior channel before installing a new one.
  if (_channel) {
    try { supabase.removeChannel(_channel); } catch (_) {}
    _channel = null;
  }
  _channel = supabase
    .channel('senaat-hot-tables-v1')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
      debounce('tasks', () => refreshTasks(store));
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'escalations' }, () => {
      debounce('escalations', () => refreshEscalations(store));
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'delivery_notes' }, () => {
      debounce('delivery_notes', () => refreshDeliveryNotes(store));
    })
    .subscribe((status) => {
      console.debug('[realtime] channel status:', status);
    });

  return () => {
    if (_channel) {
      try { supabase.removeChannel(_channel); } catch (_) {}
      _channel = null;
    }
    Object.keys(_debounceTimers).forEach((k) => {
      if (_debounceTimers[k]) { clearTimeout(_debounceTimers[k]); _debounceTimers[k] = null; }
    });
  };
}

if (typeof window !== 'undefined') {
  window.installRealtime = installRealtime;
}
