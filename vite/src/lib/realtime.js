// R30.7 + R30.29 + R30.29.1 — Supabase Realtime subscriptions for ALL hot tables.
//
// CRITICAL: when projects OR schools refresh, we must re-run the schoolDist/
// progress/currentStage computation that app.jsx's bootFromSupabase does
// (see app.jsx ~line 132). Without it, the dashboard widgets read 0 across
// the board because those fields don't exist on the raw fromDbProject output.

import { supabase } from './supabase.js';

let _channel = null;
let _timers = {};
let _lastSchools = null;   // remember last fetched schools so a projects-only
                            // refresh can recompute schoolDist correctly.

function debounce(key, fn, ms = 250) {
  if (_timers[key]) clearTimeout(_timers[key]);
  _timers[key] = setTimeout(fn, ms);
}

// Re-implement the post-process from app.jsx bootFromSupabase so projects
// realtime refresh produces the same enriched shape.
function enrichProjectsFromSchools(projects, schools) {
  const STAGE_KEYS_W = (typeof window !== 'undefined' && window.STAGE_KEYS) || [];
  const stageCount = STAGE_KEYS_W.length;
  if (stageCount === 0 || !Array.isArray(projects) || !Array.isArray(schools)) return projects;
  return projects.map(p => {
    const ss = schools.filter(s => s.projectId === p.id);
    const totalStages = ss.length * stageCount;
    const doneStages  = ss.reduce((a, s) => a + (Array.isArray(s.stages) ? s.stages.filter(st => st && st.done).length : 0), 0);
    const progress    = totalStages > 0 ? Math.round((doneStages / totalStages) * 100) : (p.progress || 0);
    const dist = STAGE_KEYS_W.map(() => 0);
    ss.forEach(s => {
      const reached = Array.isArray(s.stages) ? s.stages.filter(st => st && st.done).length : 0;
      if (reached > 0) dist[reached - 1]++;
    });
    const maxIdx = dist.indexOf(Math.max(...dist));
    const currentStage = Math.min(stageCount - 1, Math.max(0, maxIdx));
    return { ...p, progress, schoolDist: dist, currentStage };
  });
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
    // Fetch projects, then enrich with schoolDist using the last-known schools.
    // If we don't have schools yet, fall back to refetching them too.
    Promise.all([
      window.bgFetchProjects(),
      _lastSchools ? Promise.resolve(_lastSchools) :
        (window.bgFetchSchools ? window.bgFetchSchools() : Promise.resolve([])),
    ]).then(([projRows, schRows]) => {
      if (!Array.isArray(projRows)) return;
      const projTranslated = projRows.map(window.fromDbProject);
      const schTranslated  = Array.isArray(schRows)
        ? (typeof window.fromDbSchool === 'function' ? schRows.map(window.fromDbSchool) : schRows)
        : (window.ALL_SCHOOLS || []);
      _lastSchools = schTranslated;
      const enriched = enrichProjectsFromSchools(projTranslated, schTranslated);
      store._setProjects(enriched);
    }).catch(() => {});
  },
  schools: (store) => {
    if (!window.bgFetchSchools || !window.fromDbSchool || !store._setSchools) return;
    window.bgFetchSchools().then(rows => {
      if (!Array.isArray(rows)) return;
      const schTranslated = rows.map(window.fromDbSchool);
      _lastSchools = schTranslated;
      store._setSchools(schTranslated);
      // School change → project progress/dist changes too. Re-enrich projects.
      if (store._setProjects && window.bgFetchProjects && window.fromDbProject) {
        window.bgFetchProjects().then(projRows => {
          if (!Array.isArray(projRows)) return;
          const enriched = enrichProjectsFromSchools(projRows.map(window.fromDbProject), schTranslated);
          store._setProjects(enriched);
        }).catch(() => {});
      }
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
      if (settings['lifecycle.stages']  && store._setLifecycleStages)  store._setLifecycleStages(settings['lifecycle.stages']);
      if (settings['stage.statuses']    && store._setStageStatuses)    store._setStageStatuses(settings['stage.statuses']);
      if (settings['role.permissions']  && store._setRolePermissions)  store._setRolePermissions(settings['role.permissions']);
      if (settings['theme.colors']      && store._setThemeColors)      store._setThemeColors(settings['theme.colors']);
      if (settings['theme.logo']        && store._setThemeLogo)        store._setThemeLogo(settings['theme.logo']);
    }).catch(() => {});
  },
  photos: (store) => {
    // Photo change → re-fetch schools (stage_photo cache lives there).
    refreshers.schools(store);
  },
  task_messages: (store) => {
    window.dispatchEvent(new CustomEvent('realtime-task-messages'));
  },
  material_usage: (store) => {
    if (!window.bgFetchMaterialUsage || !window.fromDbMaterialUsage || !store._setMaterialUsage) return;
    window.bgFetchMaterialUsage().then(rows => {
      if (!Array.isArray(rows)) return;
      const catalog = (typeof window.MATERIALS_CATALOG !== 'undefined' ? window.MATERIALS_CATALOG : []);
      store._setMaterialUsage(rows.map(r => window.fromDbMaterialUsage(r, catalog)));
    }).catch(() => {});
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
  // Seed _lastSchools from the boot orchestrator's result so the first projects
  // realtime fires with a real schools list (not empty → 0% everywhere).
  if (!_lastSchools && Array.isArray(window.ALL_SCHOOLS) && window.ALL_SCHOOLS.length > 0) {
    _lastSchools = window.ALL_SCHOOLS;
  }

  let ch = supabase.channel('senaat-everything-v3');
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
