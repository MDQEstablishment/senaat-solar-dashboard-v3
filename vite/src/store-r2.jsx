import React from 'react';
// Round 5 store extensions — composed with the base store
// Recycle Bin REMOVED (hard-delete with confirmation). Site Engineer removed from targets.

function useStoreR2(base) {
  // R30.1 — single shared helper for app_settings key/value upserts.
  const __bgSetting = (key, value, actor) => {
    if (!window.bgUpsert) return;
    window.bgUpsert('app_settings', {
      key, value,
      updated_by: window.userUuid ? window.userUuid(actor?.id) : null,
      updated_at: new Date().toISOString(),
    }, key);
  };
  const [escalations, setEscalations]       = React.useState(() => ESCALATIONS_DEFAULT);
  const [stageStatuses, setStageStatuses]   = React.useState(() => STAGE_STATUSES_DEFAULT);
  const [lifecycleStages, setLifecycleStages] = React.useState(() => LIFECYCLE_STAGES_DEFAULT);

  // Round 10: per-project lifecycle stage state.
  // Shape: { [projectId]: [{stageId, status: 'done'|'not-started'|'blocked', date}, ...] }
  const [projectLifecycleState, setProjectLifecycleState] = React.useState(() => {
    const out = {};
    const rng = (() => { let s = 0xC0FFEE; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 0xffffffff; }; })();
    const today = new Date('2026-05-12').getTime();
    const totalStages = LIFECYCLE_STAGES_DEFAULT.length;
    const blockedProjectIds = (() => {
      const ids = PROJECTS.map(p => p.id);
      const a = ids[Math.floor(rng() * ids.length)];
      let b = ids[Math.floor(rng() * ids.length)];
      while (b === a) b = ids[Math.floor(rng() * ids.length)];
      return [a, b];
    })();
    PROJECTS.forEach(p => {
      // Pick a current stage index between 3 and Math.min(11, totalStages - 2)
      const maxIdx = Math.min(11, totalStages - 2);
      const cur = 3 + Math.floor(rng() * (maxIdx - 3 + 1));
      // 50/50 whether current stage is itself Done
      const currentIsDone = rng() < 0.5;
      const list = LIFECYCLE_STAGES_DEFAULT.map((s, i) => {
        let status = 'not-started';
        let date = null;
        if (i < cur) {
          status = 'done';
          // dates spread across past 8 months
          const offsetDays = (totalStages - i) * 12 + Math.floor(rng() * 20);
          date = new Date(today - offsetDays * 86400000).toISOString().slice(0, 10);
        } else if (i === cur && currentIsDone) {
          status = 'done';
          date = new Date(today - Math.floor(rng() * 10) * 86400000).toISOString().slice(0, 10);
        }
        return { stageId: s.id, status, date };
      });
      // Inject a Blocked stage into 1-2 random projects (Round 10 spec)
      if (blockedProjectIds.indexOf(p.id) !== -1) {
        // Mark the stage just after `cur` as blocked (or the next not-started)
        const blockIdx = Math.min(totalStages - 1, cur + 1);
        if (list[blockIdx] && list[blockIdx].status === 'not-started') {
          list[blockIdx].status = 'blocked';
        }
      }
      out[p.id] = list;
    });
    return out;
  });

  // Toggle a project lifecycle stage between Done and Not Started (Round 10).
  // Audit-logged by caller via `currentUser` argument.
  const toggleProjectLifecycleStage = (projectId, stageId, currentUser) => {
    let before = 'not-started', after = 'done';
    setProjectLifecycleState(state => {
      const list = (state[projectId] || []).slice();
      const idx = list.findIndex(x => x.stageId === stageId);
      if (idx < 0) {
        list.push({ stageId, status: 'done', date: new Date().toISOString().slice(0, 10) });
        after = 'done';
      } else {
        before = list[idx].status;
        after = list[idx].status === 'done' ? 'not-started' : 'done';
        list[idx] = { ...list[idx], status: after, date: after === 'done' ? new Date().toISOString().slice(0, 10) : null };
      }
      return { ...state, [projectId]: list };
    });
    // Audit
    if (currentUser) {
      const proj = PROJECTS.find(p => p.id === projectId);
      const stage = lifecycleStages.find(s => s.id === stageId);
      setTimeout(() => {
        const auditEntry = {
          actorId: currentUser.id, actorName: currentUser.name, actorRole: currentUser.role,
          action: 'UPDATE', entityType: 'project_lifecycle_stage',
          entityId: projectId + ':' + stageId,
          entityLabel: (proj?.name || projectId) + ' / ' + (stage?.name || stageId),
          before, after,
          summary: `Toggled "${stage?.name || stageId}" on ${proj?.name || projectId}: ${before} → ${after}`,
        };
        // call logAudit directly (defined later in scope)
        if (typeof logAudit === 'function') logAudit(auditEntry);
      }, 0);
    }
  };
  // R16 #2: per-stage category drives the colour swatch in Settings → School Stages.
  const [schoolStagesList, setSchoolStagesList] = React.useState(() => SCHOOL_STAGES.map((name, i) => {
    const key = STAGE_KEYS[i];
    const cat = STAGE_CATEGORY[key];
    return {
      id: 'ss' + (i + 1), name, order: i, archived: false,
      key, category: cat,
      excelHeader: STAGE_EXCEL_HEADERS[key],
      color: STAGE_CATEGORY_COLORS[cat]?.dot || '#0B2545',
    };
  }));
  const [customFields, setCustomFields]     = React.useState(() => CUSTOM_FIELDS_DEFAULT);
  const [milestoneTemplates, setMTemplates] = React.useState(() => MILESTONE_TEMPLATES_DEFAULT);
  const [milestoneEntries, setMEntries]     = React.useState(() => MILESTONE_ENTRIES_DEFAULT);
  const [financialEntries, setFinancialEntries] = React.useState(() => FINANCIAL_ENTRIES_DEFAULT);
  const [stageHistory, setStageHistory]     = React.useState(() => ({}));
  const [materials, setMaterials]           = React.useState(() => MATERIALS);
  const [materialsCatalog, setMatCatalog]   = React.useState(() => MATERIALS_CATALOG);
  const [materialUsage, setMaterialUsage]   = React.useState(() => []);  // { id, schoolId, materialNo, qty, unit, date, by }
  const [contractorsLocal, setContractorsLocal] = React.useState(() => CONTRACTORS.map(c => ({ ...c })));

  // R29 — project image attachments + Delivery Notes.
  // projectCover[projectId]   = { path, url, bytes, ... }  (single cover)
  // projectGallery[projectId] = [{ path, url, bytes, ... }] (up to 50)
  // schoolStagePhotos[`${sid}|${stageKey}`] = [...]          (up to 5 per stage)
  // deliveryNotes              = [{ id, projectId, schoolId, ... }]
  // All four live in memory only; the MemoryImageStorage adapter (lib/storage.js)
  // holds the actual blobs/dataUrls. Round 30 will replace both layers with
  // Supabase Postgres rows + Supabase Storage.
  const [projectCover, setProjectCover]           = React.useState(() => ({}));
  const [projectGallery, setProjectGallery]       = React.useState(() => ({}));
  const [schoolStagePhotos, setSchoolStagePhotos] = React.useState(() => ({}));
  const [deliveryNotes, setDeliveryNotes]         = React.useState(() => (typeof DELIVERY_NOTES_SEED !== 'undefined' ? DELIVERY_NOTES_SEED : []));

  // Photo persistence helper — writes/removes rows in the `photos` table to mirror
  // the local list. Diff is by storage_path (each upload to imageStorage produces
  // a unique path). uploaded_by_id is sourced from window.__currentUser (set by
  // app.jsx); falls back to NULL when no session.
  const __syncPhotos = (oldList, newList, baseRow) => {
    if (!window.bgInsert || !window.bgDeleteWhere) return;
    const oldPaths = new Set((oldList || []).map(p => p.path));
    const newPaths = new Set((newList || []).map(p => p.path));
    const uploaderUuid = window.userUuid ? window.userUuid(window.__currentUser?.id) : null;
    for (const p of (newList || [])) {
      if (!oldPaths.has(p.path)) {
        window.bgInsert('photos', {
          kind: baseRow.kind,
          project_id: baseRow.project_id || null,
          school_id: baseRow.school_id || null,
          stage_key: baseRow.stage_key || null,
          delivery_note_id: baseRow.delivery_note_id || null,
          storage_path: p.path,
          bytes: p.bytes || null,
          width: p.width || null,
          height: p.height || null,
          uploaded_by_id: uploaderUuid,
        }, 'photo');
      }
    }
    for (const p of (oldList || [])) {
      if (!newPaths.has(p.path)) {
        window.bgDeleteWhere('photos', { storage_path: p.path }, 'photo');
      }
    }
  };
  const setProjectCoverFor = (projectId, list) => {
    setProjectCover(m => {
      const oldCover = m[projectId];
      const newCover = (list && list[0]) || null;
      __syncPhotos(oldCover ? [oldCover] : [], newCover ? [newCover] : [], { kind: 'project_cover', project_id: projectId });
      return { ...m, [projectId]: newCover };
    });
  };
  const setProjectGalleryFor = (projectId, list) => {
    setProjectGallery(m => {
      __syncPhotos(m[projectId] || [], list || [], { kind: 'project_gallery', project_id: projectId });
      return { ...m, [projectId]: list || [] };
    });
  };
  const setSchoolStagePhotosFor = (schoolId, stageKey, list) => {
    setSchoolStagePhotos(m => {
      const key = `${schoolId}|${stageKey}`;
      __syncPhotos(m[key] || [], list || [], { kind: 'school_stage', school_id: schoolId, stage_key: stageKey });
      return { ...m, [key]: list || [] };
    });
  };
  const getSchoolStagePhotos = (schoolId, stageKey) => {
    return schoolStagePhotos[`${schoolId}|${stageKey}`] || [];
  };

  // R29 Delivery Notes CRUD
  const addDeliveryNote = (data, currentUser) => {
    const id = 'dn-' + Date.now();
    const note = {
      id,
      projectId:  data.projectId  || null,
      schoolId:   data.schoolId   || null,
      stageKey:   data.stageKey   || null,
      deliveryDate: data.deliveryDate || new Date().toISOString().slice(0, 10),
      supplier:   data.supplier   || '',
      contractor: data.contractor || '',
      items:      Array.isArray(data.items) && data.items.length ? data.items : [{ description: '', quantity: '', unit: '' }],
      receivedBy: data.receivedBy || '',
      signatureDataUrl: data.signatureDataUrl || null,
      photos:     Array.isArray(data.photos) ? data.photos : [],
      notes:      data.notes || '',
      status:     data.status || 'received',
      createdAt:  new Date().toISOString(),
      createdBy:  currentUser?.id || null,
    };
    setDeliveryNotes(ns => [note, ...ns]);
    // R30.18 — Chain inserts: items must wait for parent to commit, else FK violation.
    // Previously both inserts fired in parallel and items lost the race ~100% of the time.
    if (typeof window !== 'undefined' && window.supabase && window.USE_SUPABASE) {
      const itemRows = window.toDbDeliveryNoteItems(id, note.items);
      window.supabase.from('delivery_notes').insert(window.toDbDeliveryNote(note))
        .then(({ error: parentErr }) => {
          if (parentErr) {
            console.error('[supabase insert delivery note]', parentErr);
            window.dispatchEvent(new CustomEvent('supabase-error', { detail: { label: 'insert delivery note', error: parentErr } }));
            return;
          }
          if (!itemRows.length) return;
          return window.supabase.from('delivery_note_items').insert(itemRows)
            .then(({ error: itemErr }) => {
              if (itemErr) {
                console.error('[supabase insert delivery note items]', itemErr);
                window.dispatchEvent(new CustomEvent('supabase-error', { detail: { label: 'insert delivery note items', error: itemErr } }));
              }
            });
        })
        .catch(err => console.error('[supabase delivery note insert threw]', err));
    }
    setTimeout(() => {
      if (typeof logAudit === 'function') logAudit({
        actorId: currentUser?.id, actorName: currentUser?.name, actorRole: currentUser?.role,
        action: 'CREATE', entityType: 'delivery_note', entityId: id,
        entityLabel: `${note.supplier || 'supplier'} → ${note.schoolId || 'school'}`,
        summary: `Created delivery note ${id} for ${note.schoolId || 'a school'} (${note.items.length} item${note.items.length === 1 ? '' : 's'}, status ${note.status})`,
      });
    }, 0);
    return note;
  };
  const updateDeliveryNote = (id, patch, currentUser) => {
    setDeliveryNotes(ns => ns.map(n => n.id === id ? { ...n, ...patch, updatedAt: new Date().toISOString() } : n));
    if (window.bgUpdate) window.bgUpdate('delivery_notes', id, window.toDbDeliveryNotePatch(patch), 'delivery note');
    setTimeout(() => {
      if (typeof logAudit === 'function') logAudit({
        actorId: currentUser?.id, actorName: currentUser?.name, actorRole: currentUser?.role,
        action: 'UPDATE', entityType: 'delivery_note', entityId: id,
        entityLabel: id, summary: `Updated delivery note ${id}`,
      });
    }, 0);
  };
  const deleteDeliveryNote = (id, currentUser) => {
    setDeliveryNotes(ns => ns.filter(n => n.id !== id));
    if (window.bgDelete) window.bgDelete('delivery_notes', id, 'delivery note');
    setTimeout(() => {
      if (typeof logAudit === 'function') logAudit({
        actorId: currentUser?.id, actorName: currentUser?.name, actorRole: currentUser?.role,
        action: 'DELETE', entityType: 'delivery_note', entityId: id,
        entityLabel: id, summary: `Deleted delivery note ${id}`,
      });
    }, 0);
  };

  // Round 13 H1: Add / edit / delete contractors with audit log.
  const addContractor = (data, currentUser) => {
    const id = 'c-' + Date.now();
    const c = {
      id,
      name: (data.name || '').trim(),
      category: data.category || 'EPC',
      cr: data.cr || '',
      license: data.license || '',
      contact: data.contact || '',
      phone: data.phone || '',
      email: data.email || '',
      region: data.region || '',
      activeSites: 0,
      schedule: 0, quality: 0, hse: 0, docs: 0,
      projects: [],
      trend: [0, 0, 0, 0],
    };
    setContractorsLocal(ms => [c, ...ms]);
    if (typeof window !== 'undefined' && Array.isArray(window.CONTRACTORS)) {
      window.CONTRACTORS.unshift(c);
    }
    if (window.bgInsert) window.bgInsert('contractors', window.toDbContractor(c), 'contractor');
    if (currentUser && typeof logAudit === 'function') {
      setTimeout(() => logAudit({
        actorId: currentUser.id, actorName: currentUser.name, actorRole: currentUser.role,
        action: 'CREATE', entityType: 'contractor', entityId: id, entityLabel: c.name,
        summary: `Created contractor "${c.name}" (${c.category})`,
      }), 0);
    }
    return c;
  };
  const updateContractor = (id, patch, currentUser) => {
    setContractorsLocal(ms => ms.map(c => c.id === id ? { ...c, ...patch } : c));
    if (typeof window !== 'undefined' && Array.isArray(window.CONTRACTORS)) {
      const i = window.CONTRACTORS.findIndex(c => c.id === id);
      if (i >= 0) window.CONTRACTORS[i] = { ...window.CONTRACTORS[i], ...patch };
    }
    if (window.bgUpdate) window.bgUpdate('contractors', id, window.toDbContractorPatch(patch), 'contractor');
    if (currentUser && typeof logAudit === 'function') {
      setTimeout(() => logAudit({
        actorId: currentUser.id, actorName: currentUser.name, actorRole: currentUser.role,
        action: 'UPDATE', entityType: 'contractor', entityId: id, entityLabel: patch.name || id,
        summary: `Updated contractor "${patch.name || id}"`,
      }), 0);
    }
  };
  const deleteContractor = (id, currentUser) => {
    let target = null;
    setContractorsLocal(ms => { target = ms.find(c => c.id === id); return ms.filter(c => c.id !== id); });
    if (typeof window !== 'undefined' && Array.isArray(window.CONTRACTORS)) {
      const i = window.CONTRACTORS.findIndex(c => c.id === id);
      if (i >= 0) window.CONTRACTORS.splice(i, 1);
    }
    if (window.bgDelete) window.bgDelete('contractors', id, 'contractor');
    if (currentUser && typeof logAudit === 'function') {
      setTimeout(() => logAudit({
        actorId: currentUser.id, actorName: currentUser.name, actorRole: currentUser.role,
        action: 'DELETE', entityType: 'contractor', entityId: id, entityLabel: target?.name || id,
        summary: `Deleted contractor "${target?.name || id}"`,
      }), 0);
    }
  };
  const [auditLog, setAuditLog]             = React.useState(() => (typeof AUDIT_LOG_SEED !== 'undefined' ? AUDIT_LOG_SEED : []));

  // ─── Round 14: Settings admin state ────────────────────────────────────
  // P1 Users: editable user roster on top of seeded PEOPLE
  const [users, setUsers] = React.useState(() => PEOPLE.map(p => ({ ...p, active: true, archived: false })));
  const addUser = (data, actor) => {
    const tempPw = data.temp_password || 'Welcome@123';
    // R30.4 — Production-mode path: invoke the `create-user` Edge Function so
    // auth.users + profiles are created atomically with the service-role key
    // (browser bundles never see service_role). Returns a promise the caller
    // awaits to receive the new row + tempPassword. Memory state is updated
    // optimistically; on Edge Function failure we don't roll back the optimistic
    // entry — instead the next bgFetchProfiles refresh corrects the roster.
    const isProd = !!(typeof window !== 'undefined' && window.USE_SUPABASE && window.supabase);
    if (isProd) {
      // Optimistic local entry — temporary 'u-pending' id until the function
      // returns the real uuid; the UI shows the new user immediately but the
      // refetch swap-in (within ~1s) replaces it with the canonical row.
      const tempId = 'u-pending-' + Date.now();
      const optimistic = {
        id: tempId, name: data.name, email: data.email, role: data.role,
        region: Array.isArray(data.region) ? data.region.join(', ') : (data.region || ''),
        mobile: data.mobile || '', active: true, archived: false,
        initials: (data.name || '??').split(/\s+/).map(s => s[0]).slice(0, 2).join('').toUpperCase(),
        tempPassword: tempPw, _pending: true,
      };
      setUsers(us => [optimistic, ...us]);
      const promise = window.supabase.functions.invoke('create-user', {
        body: {
          email: data.email,
          full_name: data.name,
          role: window.ROLE_TO_ENUM[data.role] || data.role,
          mobile: data.mobile || null,
          default_regions: Array.isArray(data.region) ? data.region : (data.region ? [data.region] : []),
          temp_password: tempPw,
        },
      }).then(async ({ data: respData, error: invokeErr }) => {
        if (invokeErr || !respData || respData.error) {
          // Remove the optimistic entry so the user can retry.
          setUsers(us => us.filter(x => x.id !== tempId));
          const errMsg = invokeErr?.message || respData?.error || 'create-user failed';
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('supabase-error', { detail: { label: 'create-user', error: errMsg } }));
          }
          return { ok: false, error: errMsg };
        }
        // Refetch profiles so the canonical row (with real uuid + initials)
        // replaces the optimistic entry. Boot orchestrator's _setUsers wrapper
        // syncs window.PEOPLE too.
        if (window.bgFetchProfiles) {
          const fresh = await window.bgFetchProfiles();
          if (fresh && fresh.length) {
            const translated = fresh.map(window.fromDbProfile);
            setUsers(translated.map(p => ({ ...p, active: !p.archived })));
            if (Array.isArray(window.PEOPLE)) { window.PEOPLE.length = 0; window.PEOPLE.push(...translated); }
          }
        }
        if (actor && typeof logAudit === 'function') logAudit({
          actorId: actor.id, actorName: actor.name, actorRole: actor.role,
          action: 'CREATE', entityType: 'user', entityId: respData.user_id, entityLabel: data.name,
          summary: `Created user "${data.name}" (${data.role}) via create-user Edge Function`,
        });
        return { ok: true, user_id: respData.user_id, tempPassword: tempPw };
      });
      return { ok: true, pending: true, promise, tempPassword: tempPw };
    }

    // Demo-mode path (?dev=1 / standalone) — memory-only, original R29 behavior.
    const id = 'u-new-' + Date.now();
    const u = {
      id, name: data.name, email: data.email, role: data.role,
      region: Array.isArray(data.region) ? data.region.join(', ') : (data.region || ''),
      mobile: data.mobile || '', active: data.active !== false, archived: false,
      initials: (data.name || '??').split(/\s+/).map(s => s[0]).slice(0, 2).join('').toUpperCase(),
      tempPassword: tempPw,
    };
    setUsers(us => [u, ...us]);
    if (typeof window !== 'undefined' && Array.isArray(window.PEOPLE)) window.PEOPLE.unshift(u);
    if (actor && typeof logAudit === 'function') setTimeout(() => logAudit({
      actorId: actor.id, actorName: actor.name, actorRole: actor.role,
      action: 'CREATE', entityType: 'user', entityId: id, entityLabel: u.name,
      summary: `Created user "${u.name}" (${u.role}) — temp password issued`,
    }), 0);
    return { ok: true, user: u, tempPassword: tempPw };
  };
  const updateUser = (id, patch, actor) => {
    setUsers(us => us.map(u => u.id === id ? { ...u, ...patch } : u));
    if (typeof window !== 'undefined' && Array.isArray(window.PEOPLE)) {
      const i = window.PEOPLE.findIndex(u => u.id === id);
      if (i >= 0) window.PEOPLE[i] = { ...window.PEOPLE[i], ...patch };
    }
    if (window.bgUpdate && window.userUuid && window.userUuid(id)) {
      window.bgUpdate('profiles', window.userUuid(id), window.toDbProfilePatch(patch), 'profile');
    }
    if (actor && typeof logAudit === 'function') setTimeout(() => logAudit({
      actorId: actor.id, actorName: actor.name, actorRole: actor.role,
      action: 'UPDATE', entityType: 'user', entityId: id, entityLabel: patch.name || id,
      summary: `Updated user "${patch.name || id}"`,
    }), 0);
  };
  const archiveUser = (id, actor) => {
    let target = null;
    setUsers(us => { target = us.find(u => u.id === id); return us.map(u => u.id === id ? { ...u, archived: true, active: false } : u); });
    if (window.bgUpdate && window.userUuid && window.userUuid(id)) {
      window.bgUpdate('profiles', window.userUuid(id), { archived: true }, 'profile archive');
    }
    if (actor && target && typeof logAudit === 'function') setTimeout(() => logAudit({
      actorId: actor.id, actorName: actor.name, actorRole: actor.role,
      action: 'UPDATE', entityType: 'user', entityId: id, entityLabel: target.name,
      before: 'active', after: 'archived', summary: `Archived user "${target.name}"`,
    }), 0);
  };
  const resetUserPassword = (id, actor) => {
    const tempPw = 'Welcome@' + Math.floor(100 + Math.random() * 900); // unique per reset
    let target = null;
    setUsers(us => { target = us.find(u => u.id === id); return us.map(u => u.id === id ? { ...u, tempPassword: tempPw } : u); });
    // R30.19 — actually invoke the admin-reset-password Edge Function so the
    // change takes effect in auth.users, not just local React state.
    if (typeof window !== 'undefined' && window.supabase && window.USE_SUPABASE
        && window.userUuid && target) {
      const targetUuid = window.userUuid(id);
      if (targetUuid) {
        window.supabase.functions.invoke('admin-reset-password', {
          body: { target_user_id: targetUuid, new_password: tempPw },
        }).then(({ data, error }) => {
          if (error) {
            console.error('[admin-reset-password]', error);
            window.dispatchEvent(new CustomEvent('supabase-error', {
              detail: { label: 'admin-reset-password', error },
            }));
          }
        }).catch(err => console.error('[admin-reset-password] threw', err));
      }
    }
    if (actor && target && typeof logAudit === 'function') setTimeout(() => logAudit({
      actorId: actor.id, actorName: actor.name, actorRole: actor.role,
      action: 'UPDATE', entityType: 'user', entityId: id, entityLabel: target.name,
      summary: `Reset password for "${target.name}" — temp password "${tempPw}"`,
    }), 0);
    return tempPw;
  };

  // R30.19 — self-service "Change my password" — uses the logged-in session's
  // own JWT to update via supabase.auth.updateUser (no admin privilege needed).
  const changeMyPassword = async (newPassword) => {
    if (!window.supabase) throw new Error('No Supabase client');
    if (!newPassword || newPassword.length < 8) throw new Error('Password must be at least 8 characters');
    const { error } = await window.supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
    return true;
  };

  // P4 Roles & Permissions: role × feature matrix
  const FEATURE_KEYS = ['Dashboard','Projects','Materials','Financials','Contractors','Reports','Employees','Settings'];
  const buildDefaultPerms = () => {
    const PG = (typeof PROGRAM_MANAGER_GROUP !== 'undefined' ? PROGRAM_MANAGER_GROUP : ['Manager','Operations Manager','Program Manager']);
    const out = {};
    ROLES.forEach(r => {
      out[r] = {};
      FEATURE_KEYS.forEach((s, j) => {
        const isPgm = PG.indexOf(r) !== -1;
        out[r][s] = isPgm || r === 'VP'
          || (r === 'Project Manager' && j !== 2 && j !== 3 && j !== 4 && j !== 7)
          || (r === 'Material planning' && (s === 'Materials' || s === 'Reports'))
          || (r === 'Coordinator' && (s === 'Dashboard' || s === 'Projects' || s === 'Reports'));
      });
    });
    return out;
  };
  const [rolePermissions, setRolePermissions] = React.useState(buildDefaultPerms);
  const toggleRolePermission = (role, feature, actor) => {
    let before = null, after = null;
    setRolePermissions(rp => {
      before = !!(rp[role] && rp[role][feature]);
      after = !before;
      const next = { ...rp, [role]: { ...(rp[role] || {}), [feature]: after } };
      __bgSetting('role.permissions', next, actor);
      return next;
    });
    if (actor && typeof logAudit === 'function') setTimeout(() => logAudit({
      actorId: actor.id, actorName: actor.name, actorRole: actor.role,
      action: 'UPDATE', entityType: 'role_permission', entityId: role + ':' + feature, entityLabel: role + ' → ' + feature,
      before: String(before), after: String(after),
      summary: `Permission ${role} · ${feature}: ${before} → ${after}`,
    }), 0);
  };
  const resetRolePermissions = (actor) => {
    const next = buildDefaultPerms();
    setRolePermissions(next);
    __bgSetting('role.permissions', next, actor);
    if (actor && typeof logAudit === 'function') setTimeout(() => logAudit({
      actorId: actor.id, actorName: actor.name, actorRole: actor.role,
      action: 'UPDATE', entityType: 'role_permission', entityId: 'all', entityLabel: 'All roles',
      summary: `Reset role permissions to defaults`,
    }), 0);
  };

  // P7 Branding: live theme state with CSS variables applied to :root
  const DEFAULT_THEME = { Primary: '#0B2545', 'Primary 2': '#13315C', Accent: '#B8860B', 'Industrial Red': '#C8102E' };
  const [themeColors, setThemeColors] = React.useState(() => ({ ...DEFAULT_THEME }));
  const [themeLogo, setThemeLogo] = React.useState(null);
  const applyCssVars = (colors) => {
    if (typeof document === 'undefined') return;
    Object.entries(colors).forEach(([k, v]) => {
      const slug = k.toLowerCase().replace(/\s+/g, '-');
      document.documentElement.style.setProperty('--color-' + slug, v);
    });
  };
  React.useEffect(() => { applyCssVars(themeColors); }, [themeColors]);
  const updateThemeColor = (key, value, actor) => {
    setThemeColors(c => {
      const next = { ...c, [key]: value };
      __bgSetting('theme.colors', next, actor);
      return next;
    });
    if (actor && typeof logAudit === 'function') setTimeout(() => logAudit({
      actorId: actor.id, actorName: actor.name, actorRole: actor.role,
      action: 'UPDATE', entityType: 'branding', entityId: 'color:' + key, entityLabel: key,
      after: value, summary: `Brand color ${key} set to ${value}`,
    }), 0);
  };
  const updateThemeLogo = (dataUrl, name, actor) => {
    setThemeLogo({ dataUrl, name });
    __bgSetting('theme.logo', { dataUrl, name }, actor);
    if (actor && typeof logAudit === 'function') setTimeout(() => logAudit({
      actorId: actor.id, actorName: actor.name, actorRole: actor.role,
      action: 'UPDATE', entityType: 'branding', entityId: 'logo', entityLabel: name || 'logo',
      summary: `Brand logo uploaded (${name})`,
    }), 0);
  };
  const resetBranding = (actor) => {
    setThemeColors({ ...DEFAULT_THEME });
    setThemeLogo(null);
    __bgSetting('theme.colors', { ...DEFAULT_THEME }, actor);
    __bgSetting('theme.logo', { dataUrl: null, name: null }, actor);
    if (actor && typeof logAudit === 'function') setTimeout(() => logAudit({
      actorId: actor.id, actorName: actor.name, actorRole: actor.role,
      action: 'UPDATE', entityType: 'branding', entityId: 'reset', entityLabel: 'Brand reset',
      summary: `Branding reset to Zamil defaults`,
    }), 0);
  };

  // P5 Notifications: per-event templates + autosaved channel preferences
  const DEFAULT_TEMPLATES = {
    escalation_created: { subject: '[Zamil] Escalation: {{title}}', body: '{{actor}} raised an escalation on {{project}} at {{timestamp}}.', recipients: 'Direct manager' },
    task_assigned:      { subject: '[Zamil] Task assigned: {{title}}', body: '{{actor}} assigned a task to you due {{due}}.', recipients: 'Direct manager' },
    task_overdue:       { subject: '[Zamil] Task overdue: {{title}}', body: 'Task {{title}} is overdue (due {{due}}).', recipients: 'Direct manager' },
    stage_status_change:{ subject: '[Zamil] Stage update: {{stage}} on {{entity}}', body: '{{actor}} marked stage as {{after}}.', recipients: 'Project owner' },
    schedule_overdue:   { subject: '[Zamil] Schedule overdue: {{project}}', body: 'Project {{project}} is past schedule.', recipients: 'All managers' },
    payment_received:   { subject: '[Zamil] Payment received: {{project}}', body: 'Payment recorded for {{milestone}}.', recipients: 'All managers' },
    school_energized:   { subject: '[Zamil] School energized: {{school}}', body: 'Energization recorded for {{school}}.', recipients: 'All managers' },
    report_ready:       { subject: '[Zamil] Report ready: {{report}}', body: 'Report is available for download.', recipients: 'Custom list' },
    document_uploaded:  { subject: '[Zamil] Document uploaded: {{entity}}', body: '{{actor}} uploaded a document.', recipients: 'Direct manager' },
  };
  const [notificationTemplates, setNotificationTemplates] = React.useState(() => ({ ...DEFAULT_TEMPLATES }));
  const updateNotificationTemplate = (eventId, patch, actor) => {
    setNotificationTemplates(t => {
      const next = { ...t, [eventId]: { ...(t[eventId] || {}), ...patch } };
      __bgSetting('notification.templates', next, actor);
      return next;
    });
    if (actor && typeof logAudit === 'function') setTimeout(() => logAudit({
      actorId: actor.id, actorName: actor.name, actorRole: actor.role,
      action: 'UPDATE', entityType: 'notification_template', entityId: eventId, entityLabel: eventId,
      summary: `Updated notification template for "${eventId}"`,
    }), 0);
  };

  // Audit log helper — call from any mutation. Caps at 5000 entries.
  const logAudit = (entry) => {
    const e = {
      id: 'au' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      timestamp: new Date().toISOString(),
      ...entry,
    };
    setAuditLog(log => {
      const next = [e, ...log];
      return next.length > 5000 ? next.slice(0, 5000) : next;
    });
    if (window.bgInsert) window.bgInsert('audit_log', window.toDbAudit(e), 'audit');
    return e;
  };

  // ---- Escalations ----
  const addEscalation = (data) => {
    const id = 'esc' + Date.now();
    const target = data.target || { toUserId: 'u-vp', toRole: 'VP' };
    const today = new Date().toISOString().slice(0, 10);
    const e = {
      id, title: data.title, reason: data.reason, urgency: data.urgency,
      projectId: data.projectId, schoolId: data.schoolId || null, taskId: data.taskId || null,
      fromUserId: data.fromUserId, status: 'Open',
      currentlyWith: target.toUserId, toUserId: target.toUserId, toRole: target.toRole,
      opened: today, daysOpen: 0,
      chain: [{ fromUserId: data.fromUserId, toUserId: target.toUserId, toRole: target.toRole, when: today, action: 'Escalated' }],
      history: [{ who: data.fromUserId, when: today, action: 'Created', note: data.reason || ('Escalated to ' + target.toRole) }],
    };
    setEscalations(es => [e, ...es]);
    if (window.bgInsert) {
      window.bgInsert('escalations', window.toDbEscalation(e), 'escalation');
      window.bgInsert('escalation_history', {
        escalation_id: id,
        from_user_id: window.userUuid(data.fromUserId),
        to_user_id: null,
        action: 'Created',
        note: data.reason || ('Escalated to ' + target.toRole),
        created_at: new Date().toISOString(),
      }, 'escalation history');
    }
    base.pushNotif({ kind: 'overdue', text: 'New escalation: ' + data.title, target: { kind: 'escalation', id } });
    // R30.5 — send email notification (fire-and-forget)
    if (typeof window !== 'undefined' && window.notifyEmail && target.toUserId && target.toUserId !== data.fromUserId) {
      try { window.notifyEmail('escalation_created', e, target.toUserId, data.fromUserId); } catch (_) {}
    }
    return e;
  };
  const addEscalationComment = (id, who, note) => {
    setEscalations(es => es.map(e => e.id === id
      ? { ...e, history: [...e.history, { who, when: new Date().toISOString().slice(0, 10), action: 'Comment', note }] }
      : e));
    if (window.bgInsert) window.bgInsert('escalation_history', {
      escalation_id: id,
      from_user_id: window.userUuid(who),
      to_user_id: null,
      action: 'Comment',
      note: note || '',
      created_at: new Date().toISOString(),
    }, 'escalation comment');
  };
  const resolveEscalation = (id, who, note) => {
    setEscalations(es => es.map(e => e.id === id
      ? { ...e, status: 'Resolved', currentlyWith: null, resolvedDate: new Date().toISOString().slice(0, 10),
          history: [...e.history, { who, when: new Date().toISOString().slice(0, 10), action: 'Resolved', note }] }
      : e));
    if (window.bgUpdate) window.bgUpdate('escalations', id, {
      status: 'resolved',
      currently_with_id: null,
      assigned_to_id: null,
      resolved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, 'escalation');
    if (window.bgInsert) window.bgInsert('escalation_history', {
      escalation_id: id,
      from_user_id: window.userUuid(who),
      to_user_id: null,
      action: 'Resolved',
      note: note || '',
      created_at: new Date().toISOString(),
    }, 'escalation resolve');
  };
  const escalateFurther = (id, fromUserId, target, note) => {
    const today = new Date().toISOString().slice(0, 10);
    setEscalations(es => es.map(e => e.id === id ? {
      ...e, currentlyWith: target.toUserId, toUserId: target.toUserId, toRole: target.toRole,
      chain: [...(e.chain || []), { fromUserId, toUserId: target.toUserId, toRole: target.toRole, when: today, action: 'Forwarded' }],
      history: [...e.history, { who: fromUserId, when: today, action: 'Forwarded', note: 'Forwarded to ' + target.toRole + (note ? ': ' + note : '') }],
    } : e));
    const toUuid = window.userUuid ? window.userUuid(target.toUserId) : null;
    if (window.bgUpdate) window.bgUpdate('escalations', id, {
      currently_with_id: toUuid,
      assigned_to_id: toUuid,
      raised_to_role: window.ROLE_TO_ENUM[target.toRole] || null,
      updated_at: new Date().toISOString(),
    }, 'escalation forward');
    if (window.bgInsert) window.bgInsert('escalation_history', {
      escalation_id: id,
      from_user_id: window.userUuid(fromUserId),
      to_user_id: toUuid,
      action: 'Forwarded',
      note: 'Forwarded to ' + target.toRole + (note ? ': ' + note : ''),
      created_at: new Date().toISOString(),
    }, 'escalation forward history');
    // R30.5 — send email notification (fire-and-forget) when forwarded to a new user
    if (typeof window !== 'undefined' && window.notifyEmail && target.toUserId && target.toUserId !== fromUserId) {
      const esc = (window.ESCALATIONS_DEFAULT || []).find(x => x.id === id) || { id, title: 'Forwarded escalation', urgency: 'Medium', reason: note || '' };
      try { window.notifyEmail('escalation_created', esc, target.toUserId, fromUserId); } catch (_) {}
    }
  };

  // ---- Stage flexible status ----
  // Round 10: simple two-state toggle for school stages (Done ⇄ Not Started)
  const toggleSchoolStage = (schoolId, stageIdx, currentUser) => {
    let before = 'not-started', after = 'done';
    let nextStages = null;
    base._setSchools(ss => ss.map(s => {
      if (s.id !== schoolId) return s;
      const stages = s.stages.slice();
      const st = stages[stageIdx] || {};
      before = st.done ? 'done' : 'not-started';
      after  = st.done ? 'not-started' : 'done';
      stages[stageIdx] = {
        ...st,
        done: !st.done,
        statusId: !st.done ? 'done' : 'not-started',
        date: !st.done ? new Date().toISOString() : null,
        by: currentUser ? currentUser.id : st.by,
      };
      nextStages = stages;
      // Recompute status
      const doneCount = stages.filter(x => x.done).length;
      const newStatus = doneCount === stages.length ? 'Completed' : doneCount > 0 ? 'In Progress' : 'Not Started';
      return { ...s, stages, status: newStatus, lastUpdate: { by: currentUser?.id, when: new Date().toISOString() } };
    }));
    if (window.bgUpdate && nextStages) window.bgUpdate('schools', schoolId, { stages: nextStages }, 'school stage toggle');
    if (currentUser) {
      const stageLabel = SCHOOL_STAGES[stageIdx] || ('Stage ' + (stageIdx + 1));
      setTimeout(() => {
        if (typeof logAudit === 'function') logAudit({
          actorId: currentUser.id, actorName: currentUser.name, actorRole: currentUser.role,
          action: 'UPDATE', entityType: 'school_stage', entityId: schoolId + ':' + stageIdx, entityLabel: schoolId + ' / ' + stageLabel,
          before, after,
          summary: `Toggled "${stageLabel}" on school ${schoolId}: ${before} → ${after}`,
        });
      }, 0);
    }
  };

  const setSchoolStageStatus = (schoolId, stageIdx, statusId, who, reason) => {
    const status = stageStatuses.find(s => s.id === statusId);
    base.updateSchoolStage(schoolId, stageIdx, {
      done: status?.terminal || false, statusId,
      date: status?.terminal ? new Date().toISOString() : null, by: who,
    });
    const key = schoolId + '-' + stageIdx;
    setStageHistory(h => ({
      ...h,
      [key]: [...(h[key] || []), { who, when: new Date().toISOString(), to: statusId, reason: reason || '' }],
    }));
  };
  const addStageStatus = (s) => setStageStatuses(ss => [...ss, { id: 'cs' + Date.now(), builtin: false, terminal: false, color: '#64748B', ...s }]);
  const updateStageStatus = (id, patch) => setStageStatuses(ss => ss.map(s => s.id === id ? { ...s, ...patch } : s));
  const deleteStageStatus = (id) => setStageStatuses(ss => ss.filter(s => s.id !== id || s.builtin));

  // ---- Lifecycle CRUD ----
  const addLifecycleStage = (s) => setLifecycleStages(ls => [...ls, { id: 'ls' + Date.now(), order: ls.length, archived: false, color: '#13315C', criteria: '', ...s }]);
  const updateLifecycleStage = (id, patch) => setLifecycleStages(ls => ls.map(s => s.id === id ? { ...s, ...patch } : s));
  const deleteLifecycleStage = (id) => setLifecycleStages(ls => ls.filter(s => s.id !== id));
  const reorderLifecycleStage = (id, dir) => setLifecycleStages(ls => {
    const sorted = [...ls].sort((a, b) => a.order - b.order);
    const i = sorted.findIndex(s => s.id === id);
    const j = i + dir;
    if (j < 0 || j >= sorted.length) return ls;
    [sorted[i].order, sorted[j].order] = [sorted[j].order, sorted[i].order];
    return [...sorted];
  });

  // ---- School Stages CRUD ----
  const addSchoolStage_ = (s) => setSchoolStagesList(ls => [...ls, { id: 'ss' + Date.now(), order: ls.length, archived: false, color: '#13315C', ...s }]);
  const updateSchoolStage_ = (id, patch) => setSchoolStagesList(ls => ls.map(s => s.id === id ? { ...s, ...patch } : s));
  const deleteSchoolStage_ = (id) => setSchoolStagesList(ls => ls.filter(s => s.id !== id));
  const reorderSchoolStage_ = (id, dir) => setSchoolStagesList(ls => {
    const sorted = [...ls].sort((a, b) => a.order - b.order);
    const i = sorted.findIndex(s => s.id === id);
    const j = i + dir;
    if (j < 0 || j >= sorted.length) return ls;
    [sorted[i].order, sorted[j].order] = [sorted[j].order, sorted[i].order];
    return [...sorted];
  });

  // ---- Custom fields ----
  const addCustomField = (entity, field) =>
    setCustomFields(cf => ({ ...cf, [entity]: [...(cf[entity] || []), { id: 'cf-' + Date.now(), ...field }] }));
  const updateCustomField = (entity, id, patch) =>
    setCustomFields(cf => ({ ...cf, [entity]: cf[entity].map(f => f.id === id ? { ...f, ...patch } : f) }));
  const deleteCustomField = (entity, id) =>
    setCustomFields(cf => ({ ...cf, [entity]: cf[entity].filter(f => f.id !== id) }));

  // ---- Milestone templates ----
  const addMilestoneTemplate = (mt) => setMTemplates(t => [...t, { id: 'mt' + Date.now(), weight: 25, fields: [], ...mt }]);
  const updateMilestoneTemplate = (id, patch) => setMTemplates(t => t.map(m => m.id === id ? { ...m, ...patch } : m));
  const deleteMilestoneTemplate = (id) => setMTemplates(t => t.filter(m => m.id !== id));
  const setMilestoneEntry = (contractorId, templateId, values) => {
    setMEntries(es => {
      const idx = es.findIndex(e => e.contractorId === contractorId && e.templateId === templateId);
      const entry = { id: idx >= 0 ? es[idx].id : 'me-' + contractorId + '-' + templateId, contractorId, templateId, values, when: new Date().toISOString().slice(0, 10) };
      return idx >= 0 ? es.map((e, i) => i === idx ? entry : e) : [...es, entry];
    });
  };
  const contractorScore = (contractorId) => {
    let total = 0, weightSum = 0;
    milestoneTemplates.forEach(mt => {
      const entry = milestoneEntries.find(e => e.contractorId === contractorId && e.templateId === mt.id);
      if (!entry) return;
      const scoreField = mt.fields.find(f => f.label.includes('Score'));
      const score = scoreField ? Number(entry.values[scoreField.id] || 0) : 75;
      total += score * mt.weight; weightSum += mt.weight;
    });
    return weightSum > 0 ? Math.round(total / weightSum) : 0;
  };

  // ---- Financial entries with auto-rollup ----
  const addFinancialEntry = (e) => setFinancialEntries(fe => [{ id: 'fe' + Date.now(), archived: false, document: null, ...e }, ...fe]);
  const updateFinancialEntry = (id, patch) => setFinancialEntries(fe => fe.map(e => e.id === id ? { ...e, ...patch } : e));
  const deleteFinancialEntry = (id) => setFinancialEntries(fe => fe.filter(e => e.id !== id));
  const finRollup = (filterFn = () => true) => {
    const live = financialEntries.filter(e => !e.archived).filter(filterFn);
    const sum = (t) => live.filter(e => e.type === t).reduce((a, e) => a + e.amount, 0);
    return {
      receipts: sum('Receipt'), receivables: sum('Receivable'),
      payments: sum('Payment'), payables: sum('Payable'),
      net: sum('Receipt') - sum('Payment'),
    };
  };

  // ---- Schools CRUD with duplicate guard ----
  // Returns {ok: true, school} on success or {ok: false, error: 'dup-id'|'dup-meter', conflictWith: existing}
  const validateSchool = (data, excludeId) => {
    const idDup = base.schools.find(x => x.id === data.id && x.id !== excludeId);
    if (idDup) return { ok: false, error: 'dup-id', conflictWith: idDup };
    if (data.meter) {
      const meterDup = base.schools.find(x => (x.meter || '') === data.meter && x.id !== excludeId && data.meter.trim() !== '');
      if (meterDup) return { ok: false, error: 'dup-meter', conflictWith: meterDup };
    }
    return { ok: true };
  };
  const addSchool = (data) => {
    const v = validateSchool(data);
    if (!v.ok) return v;
    const sid = data.id || ('SS-ZAM-NEW-' + Date.now());
    const school = {
      id: sid, code: sid, projectId: data.projectId,
      nameAr: data.nameAr || '', nameEn: data.nameEn || '',
      name: data.nameEn || data.nameAr || sid,
      level: data.level || 'Primary', gender: data.gender || 'Boys',
      region: data.region || '', city: data.city || '',
      coords: data.coords || '', meter: data.meter || '', account: data.account || '',
      survey: data.survey || null, installStart: data.installStart || null,
      address: (data.city || '') + (data.region ? ', ' + data.region : ''),
      type: data.level || 'Primary', kw: data.kw || 100,
      contractor: data.contractor || '',
      remark: 'Active', status: 'Not Started',
      stages: STAGE_KEYS.map(() => ({ done: false, date: null, by: null, statusId: 'not-started' })),
      rawStages: STAGE_KEYS.reduce((a, k) => (a[k] = 'not-started', a), {}),
      issues: [], photos: {}, photosList: [], deliveryNotes: [],
      lastUpdate: { by: null, when: null },
      materialUsage: [],
    };
    base._setSchools(ss => [school, ...ss]);
    if (window.bgInsert) window.bgInsert('schools', window.toDbSchool(school), 'school');
    return { ok: true, school };
  };
  const updateSchool = (id, patch) => {
    if (patch.id && patch.id !== id) {
      const v = validateSchool({ ...patch }, id);
      if (!v.ok) return v;
    }
    if (patch.meter !== undefined) {
      const v = validateSchool({ id, meter: patch.meter }, id);
      if (!v.ok) return v;
    }
    base._setSchools(ss => ss.map(s => s.id === id ? { ...s, ...patch } : s));
    if (window.bgUpdate) window.bgUpdate('schools', id, window.toDbSchoolPatch(patch), 'school');
    return { ok: true };
  };
  const deleteSchool = (id) => {
    // Hard-delete (no recycle bin in Round 5)
    base._setSchools(ss => ss.filter(x => x.id !== id));
    if (window.bgDelete) window.bgDelete('schools', id, 'school');
  };

  // ---- Materials catalog CRUD ----
  const addMaterial = (m) => setMaterials(ms => [{ id: 'm' + Date.now(), fix: 'Fix1', planned: 0, ordered: 0, dWh: 0, dSite: 0, installed: 0, status: 'Planning', archived: false, ...m }, ...ms]);
  const updateMaterial = (id, patch) => setMaterials(ms => ms.map(m => m.id === id ? { ...m, ...patch } : m));
  const deleteMaterial = (id) => setMaterials(ms => ms.filter(x => x.id !== id));

  // Per-school material consumption logging
  const logMaterialUsage = (entry) => {
    const id = 'mu' + Date.now();
    setMaterialUsage(mu => [{ id, ...entry, when: new Date().toISOString().slice(0, 10) }, ...mu]);
    return id;
  };
  const deleteMaterialUsage = (id) => setMaterialUsage(mu => mu.filter(x => x.id !== id));

  return {
    escalations, addEscalation, addEscalationComment, resolveEscalation, escalateFurther,
    stageStatuses, setSchoolStageStatus, addStageStatus, updateStageStatus, deleteStageStatus, stageHistory,
    lifecycleStages, addLifecycleStage, updateLifecycleStage, deleteLifecycleStage, reorderLifecycleStage,
    schoolStagesList, addSchoolStage: addSchoolStage_, updateSchoolStage_, deleteSchoolStage: deleteSchoolStage_, reorderSchoolStage: reorderSchoolStage_,
    customFields, addCustomField, updateCustomField, deleteCustomField,
    milestoneTemplates, milestoneEntries, addMilestoneTemplate, updateMilestoneTemplate, deleteMilestoneTemplate, setMilestoneEntry, contractorScore,
    financialEntries, addFinancialEntry, updateFinancialEntry, deleteFinancialEntry, finRollup,
    materials, addMaterial, updateMaterial, deleteMaterial,
    materialsCatalog, materialUsage, logMaterialUsage, deleteMaterialUsage,
    validateSchool, addSchool, updateSchool, deleteSchool,
    contractorsLocal, addContractor, updateContractor, deleteContractor,
    auditLog, logAudit,
    projectLifecycleState, toggleProjectLifecycleStage, toggleSchoolStage,
    // Round 14 settings admin
    users, addUser, updateUser, archiveUser, resetUserPassword, changeMyPassword,
    rolePermissions, toggleRolePermission, resetRolePermissions,
    themeColors, themeLogo, updateThemeColor, updateThemeLogo, resetBranding,
    notificationTemplates, updateNotificationTemplate,
    // R29 — image attachments + Delivery Notes
    projectCover, projectGallery, schoolStagePhotos, getSchoolStagePhotos,
    setProjectCoverFor, setProjectGalleryFor, setSchoolStagePhotosFor,
    deliveryNotes, addDeliveryNote, updateDeliveryNote, deleteDeliveryNote,
    // R30.2/R30.4 — internal setters; wrappers sync the window-level legacy
    // array where one exists. AUDIT_LOG_SEED stays read-only after boot; the
    // mutators write to React state via addAudit/logAudit so a sync wrapper
    // here would just create duplicate work.
    _setEscalations:     (rows) => {
      if (typeof window !== 'undefined' && Array.isArray(window.ESCALATIONS_DEFAULT) && Array.isArray(rows)) {
        window.ESCALATIONS_DEFAULT.length = 0;
        window.ESCALATIONS_DEFAULT.push(...rows);
      }
      setEscalations(rows);
    },
    _setContractorsLocal:(rows) => {
      if (typeof window !== 'undefined' && Array.isArray(window.CONTRACTORS) && Array.isArray(rows)) {
        window.CONTRACTORS.length = 0;
        window.CONTRACTORS.push(...rows);
      }
      setContractorsLocal(rows);
    },
    _setDeliveryNotes:   (rows) => {
      if (typeof window !== 'undefined' && Array.isArray(window.DELIVERY_NOTES_SEED) && Array.isArray(rows)) {
        window.DELIVERY_NOTES_SEED.length = 0;
        window.DELIVERY_NOTES_SEED.push(...rows);
      }
      setDeliveryNotes(rows);
    },
    _setUsers:           (rows) => {
      // users state in store-r2 mirrors PEOPLE with extra { active, archived } —
      // sync PEOPLE too so legacy readers see the same roster.
      if (typeof window !== 'undefined' && Array.isArray(window.PEOPLE) && Array.isArray(rows)) {
        window.PEOPLE.length = 0;
        window.PEOPLE.push(...rows);
      }
      setUsers(rows);
    },
    _setAuditLog: setAuditLog,
    _setThemeColors: setThemeColors,
    _setThemeLogo: setThemeLogo,
    _setNotificationTemplates: setNotificationTemplates,
    _setRolePermissions: setRolePermissions,
    // R30.29 — realtime app_settings refresh writes to these
    _setLifecycleStages: setLifecycleStages,
    _setStageStatuses:   setStageStatuses,
  };
}

// Escalation hierarchy helper (Round 6)
//   Project Manager / Material planning / Coordinator / QA / Procurement → Program Manager (Naif)
//   Program Manager (Naif) / Operations Manager (Syed F, Syed A)         → Manager (Anas or Fasiulla)
//   Manager (Anas, Fasiulla)                                              → VP (Olaf)
//   VP cannot escalate further.
// Only users in ESCALATE_TO_VP_USERS (Anas, Fasiulla) ever see "Escalate to VP".
function getEscalationTarget(currentUser, projectId) {
  if (!currentUser) return null;
  const role = currentUser.role;
  if (role === 'VP') return null;

  // Manager → VP (only Anas + Fasiulla)
  if (role === 'Manager') {
    if (!canEscalateToVP(currentUser)) return null;
    const vp = PEOPLE.find(p => p.role === 'VP');
    return vp ? { toUserId: vp.id, toRole: 'VP', label: 'Escalate to VP' } : null;
  }

  // Operations Manager / Program Manager → Manager (R30.23: multi-candidate picker)
  if (role === 'Operations Manager' || role === 'Program Manager') {
    const mgrs = PEOPLE.filter(p => p.role === 'Manager');
    if (!mgrs.length) return null;
    return {
      toUserId: mgrs[0].id,
      toRole: 'Manager',
      label: 'Escalate to Manager',
      candidates: mgrs.map(m => ({ id: m.id, name: m.name })),  // UI shows picker if > 1
    };
  }

  // Project Manager / Material planning / Coordinator / Project Engineer / QA / Procurement → Program Manager (Naif)
  const pgm = PEOPLE.find(p => p.role === 'Program Manager');
  return pgm ? { toUserId: pgm.id, toRole: 'Program Manager', label: 'Escalate to Program Manager' } : null;
}

Object.assign(window, { useStoreR2, getEscalationTarget });
