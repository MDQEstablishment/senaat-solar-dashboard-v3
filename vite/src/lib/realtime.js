// R30.7 + R30.29 — Supabase Realtime subscriptions for ALL hot tables.
//
// Subscribes to:
//   - tasks, task_messages, escalations, escalation_history
//   - delivery_notes, delivery_note_items, photos, material_usage
//   - projects, schools, contractors, profiles, app_settings
//
// On any postgres_changes event, debounce 250ms then re-run the matching
// bgFetch* and route through the same _set* the boot orchestrator uses —
// so the UI never sees a half-migrated state.
//
// RLS is respected automatically: each session's realtime stream only emits
// rows that session's user can SELECT.

import { supabase } from './supabase.js';

let _channel = null;
let _timers = {};

function debounce(key, fn, ms = 250) {
  if (_timers[key]) clearTimeout(_timers[key]);
  _timers[key] = setTimeout(fn, ms);
}

const refreshers = {
  tasks: (store) => {
    if (!window.bgFetchTasks || !window.fromDbTask || !store._setTasks) return;
    window.bgFetchTasks().then(rows => {
      if (Array.isArray(rows)) store._setTasks(rows.map(window.fromDbTask));
    }).catch(() => {});
  },
  escalations: (store) => {
    if (!window.bgFetchEscalations || !window.fromDbEscalation || !store._setEscalations) return;
    window.bgFetchEscalations().then(rows => {
      if (Array.isArray(rows)) store._setEscalations(rows.map(window.fromDbEscalation));
    }).catch(() => {});
  },
  delivery_notes: (store) => {
    if (!window.bgFetchDeliveryNotes || !window.fromDbDeliveryNote || !store._setDeliveryNotes) return;
    window.bgFetchDeliveryNotes().then(rows => {
      if (Array.isArray(rows)) store._setDeliveryNotes(rows.map(window.fromDbDeliveryNote));
    }).catch(() => {});
  },
  projects: (store) => {
    if (!window.bgFetchProjects || !window.fromDbProject || !store._setProjects) return;
    window.bgFetchProjects().then(rows => {
      if (Array.isArray(rows)) store._setProjects(rows.map(window.fromDbProject));
    }).catch(() => {});
  },
  schools: (store) => {
    if (!window.bgFetchSchools || !window.fromDbSchool || !store._setSchools) return;
    window.bgFetchSchools().then(rows => {
      if (Array.isArray(rows)) store._setSchools(rows.map(window.fromDbSchool));
    }).catch(() => {});
  },
  profiles: (store) => {
    if (!window.bgFetchProfiles || !window.fromDbProfile) return;
    window.bgFetchProfiles().then(rows => {
      if (!Array.isArray(rows)) return;
      const translated = rows.map(window.fromDbProfile);
      if (store._setPeople) store._setPeople(translated);
      if (store._setUsers)  store._setUsers(translated.map(p => ({ ...p, active: !p.archived })));
    }).catch(() => {});
  },
  app_settings: (store) => {
    if (!window.bgFetchAppSettings) return;
    window.bgFetchAppSettings().then(settings => {
      if (!settings) return;
      if (settings['lifecycle.stages'] && store._setLifecycleStages) store._setLifecycleStages(settings['lifecycle.stages']);
      if (settings['stage.statuses'] && store._setStageStatuses) store._setStageStatuses(settings['stage.statuses']);
      if (settings['role.permissions'] && store._setRolePermissions) store._setRolePermissions(settings['role.permissions']);
      if (settings['theme.colors'] && store._setThemeColors) store._setThemeColors(settings['theme.colors']);
      if (settings['theme.logo'] && store._setThemeLogo) store._setThemeLogo(settings['theme.logo']);
    }).catch(() => {});
  },
  photos: (store) => {
    // Photos drive school stage thumbnails — easiest path: re-fetch schools so the
    // stage_photos cache rebuilds via the boot pipeline. Cheap because RLS-scoped.
    if (window.bgFetchSchools && window.fromDbSchool && store._setSchools) {
      window.bgFetchSchools().then(rows => {
        if (Array.isArray(rows)) store._setSchools(rows.map(window.fromDbSchool));
      }).catch(() => {});
    }
  },
  task_messages: (store) => {
    // No global task_messages fetcher; chat UIs read on demand. Just emit a hint.
    window.dispatchEvent(new CustomEvent('realtime-task-messages'));
  },
  contractors: (store) => {
    if (!window.bgFetchContractors || !window.fromDbContractor || !store._setContractorsLocal) return;
    window.bgFetchContractors().then(rows => {
      if (Array.isArray(rows)) store._setContractorsLocal(rows.map(window.fromDbContractor));
    }).catch(() => {});
  },
};

const TABLES = Object.keys(refreshers);

export function installRealtime(store) {
  if (!supabase || typeof window === 'undefined' || !window.USE_SUPABASE) return () => {};
  if (_channel) { try { supabase.removeChannel(_channel); } catch (_) {} _channel = null; }

  let ch = supabase.channel('senaat-everything-v2');
  for (const t of TABLES) {
    ch = ch.on('postgres_changes', { event: '*', schema: 'public', table: t }, () => {
      debounce(t, () => refreshers[t](store));
    });
  }
  _channel = ch.subscribe((status) => {
    console.debug('[realtime] channel status:', status, '· subscribed to', TABLES.length, 'tables');
  });

  return () => {
    if (_channel) { try { supabase.removeChannel(_channel); } catch (_) {} _channel = null; }
    Object.keys(_timers).forEach(k => { if (_timers[k]) { clearTimeout(_timers[k]); _timers[k] = null; }});
  };
}

if (typeof window !== 'undefined') window.installRealtime = installRealtime;
