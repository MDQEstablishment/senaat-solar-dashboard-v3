import React from 'react';
// Root App — Zamil Services Solar Programs Dashboard (Round 5)
// Login → Main shell. Role-based routing. Site Engineer + Recycle Bin removed.

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "darkMode": false,
  "accent": "gold"
}/*EDITMODE-END*/;

function AppInner() {
  const store = useStore();
  const { tasks, notifs, projects, schools, escalations,
          addTask, sendTaskMessage, sendTaskReminder, updateTask,
          markNotifRead, markAllNotifsRead, addEscalation } = store;

  // Auth state — null = logged-out (show Login)
  const [currentUser, setCurrentUser] = React.useState(null);
  const role = currentUser ? currentUser.role : null;

  // R30.3b — Flash-of-login fix: synchronously check localStorage for a
  // persisted Supabase session token before first render. If present, show
  // a branded splash instead of the login form while INITIAL_SESSION resolves.
  const [hydrating, setHydrating] = React.useState(() => {
    if (typeof window === 'undefined' || !window.USE_SUPABASE) return false;
    try {
      const raw = window.localStorage.getItem('zamil-auth');
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      return !!(parsed && parsed.access_token);
    } catch { return false; }
  });
  // Safety net: cap the splash at 5s in case auth never resolves (network down,
  // SDK bug, expired token loop). After the cap the user falls through to the
  // login form and can re-authenticate.
  React.useEffect(() => {
    if (!hydrating) return;
    const t = setTimeout(() => setHydrating(false), 5000);
    return () => clearTimeout(t);
  }, [hydrating]);

  const [page, setPage] = React.useState('home');
  const [activeProjectId, setActiveProjectId] = React.useState(null);
  const [activeSchoolId,  setActiveSchoolId]  = React.useState(null);
  const [activeEscId,     setActiveEscId]     = React.useState(null);
  const [search, setSearch] = React.useState('');
  const [notifsOpen, setNotifsOpen] = React.useState(false);
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);

  // H3/M7: Rehydrate user from sessionStorage on mount + persist on every change.
  React.useEffect(() => {
    try {
      const raw = sessionStorage.getItem('zamil_demo_user');
      if (raw) {
        const u = JSON.parse(raw);
        if (u && u.id && window.PEOPLE) {
          const fresh = window.PEOPLE.find(p => p.id === u.id);
          if (fresh) setCurrentUser(fresh);
        }
      }
    } catch {}
    // Also accept the rehydrate event from main.jsx (extra belt-and-braces)
    const onRehydrate = (e) => { if (e.detail) setCurrentUser(e.detail); };
    window.addEventListener('zamil-rehydrate', onRehydrate);
    return () => window.removeEventListener('zamil-rehydrate', onRehydrate);
  }, []);
  React.useEffect(() => {
    try {
      if (currentUser) sessionStorage.setItem('zamil_demo_user', JSON.stringify({ id: currentUser.id }));
      else sessionStorage.removeItem('zamil_demo_user');
    } catch {}
    // R30.1 — expose currentUser to non-React code (mutators use this for
    // photos.uploaded_by_id and any other audit-attribution needs).
    if (typeof window !== 'undefined') window.__currentUser = currentUser;
  }, [currentUser]);

  // R30.2 — Boot status: null | 'loading' | 'loaded' | 'error'. Drives the
  // top-of-page "Loading data..." banner during the orchestrator's fetch.
  const [bootStatus, setBootStatus] = React.useState(null);
  const __bootRanRef = React.useRef(false);
  const __realtimeCleanupRef = React.useRef(null);  // R30.7
  const __resolvedUserIdRef = React.useRef(null);  // R30.16

  // R30.2 — Boot orchestrator. Fetches all 8 tables in parallel, computes
  // PM→projectIds from the raw rows (joining UUIDs to legacy project ids),
  // translates via fromDb*, then mutates window-level arrays in place AND
  // calls store setters so React re-renders. On any single slice failure
  // (empty result) the in-memory R29 fallback for that slice remains.
  const bootFromSupabase = React.useCallback(async () => {
    if (__bootRanRef.current) return;
    __bootRanRef.current = true;
    if (!window.USE_SUPABASE || !window.supabase) { setBootStatus(null); return; }
    setBootStatus('loading');
    try {
      const [rawProfiles, rawProjects, rawSchools, rawContractors,
             rawTasks, rawEscalations, rawDeliveryNotes, rawAppSettings] = await Promise.all([
        window.bgFetchProfiles(),
        window.bgFetchProjects(),
        window.bgFetchSchools(),
        window.bgFetchContractors(),
        window.bgFetchTasks(),
        window.bgFetchEscalations(),
        window.bgFetchDeliveryNotes(),
        window.bgFetchAppSettings(),
      ]);

      // Build PM-uuid → legacy-project-id[] map from raw projects rows.
      const pmAssignments = new Map();
      for (const pr of rawProjects) {
        if (pr.assigned_pm_id) {
          const arr = pmAssignments.get(pr.assigned_pm_id) || [];
          arr.push(pr.id);
          pmAssignments.set(pr.assigned_pm_id, arr);
        }
      }
      // Translate profiles + attach projectIds for PMs.
      const profiles = rawProfiles.map(r => {
        const p = window.fromDbProfile(r);
        const assigned = pmAssignments.get(r.id);
        if (assigned && assigned.length) p.projectIds = assigned;
        return p;
      });
      const projectsTranslated   = rawProjects.map(window.fromDbProject);
      const schoolsTranslated    = rawSchools.map(window.fromDbSchool);

      // R30.3b Item 4 — Compute schoolDist / progress / currentStage per
      // project from the freshly-fetched schools. Mirrors data.jsx:665-680
      // which does the same post-hoc in the in-memory pipeline. Without this,
      // the in-memory PROJECTS array has these fields but Supabase-fetched
      // ones don't, so DashStageInsights / DashCategoryPanel widgets render
      // 0% across the board (the percentages are derived from p.schoolDist).
      const STAGE_KEYS_W = window.STAGE_KEYS || [];
      const stageCount = STAGE_KEYS_W.length;
      if (stageCount > 0) {
        for (const p of projectsTranslated) {
          const ss = schoolsTranslated.filter(s => s.projectId === p.id);
          const totalStages = ss.length * stageCount;
          const doneStages = ss.reduce((a, s) => a + (Array.isArray(s.stages) ? s.stages.filter(st => st && st.done).length : 0), 0);
          p.progress = totalStages > 0 ? Math.round((doneStages / totalStages) * 100) : (p.progress || 0);
          const dist = STAGE_KEYS_W.map(() => 0);
          ss.forEach(s => {
            const reached = Array.isArray(s.stages) ? s.stages.filter(st => st && st.done).length : 0;
            if (reached > 0) dist[reached - 1]++;
          });
          p.schoolDist = dist;
          const maxIdx = dist.indexOf(Math.max(...dist));
          p.currentStage = Math.min(stageCount - 1, Math.max(0, maxIdx));
        }
      }
      const contractorsTranslated= rawContractors.map(window.fromDbContractor);
      const tasksTranslated      = rawTasks.map(window.fromDbTask);
      const escalationsTranslated= rawEscalations.map(window.fromDbEscalation);
      const dnTranslated         = rawDeliveryNotes.map(window.fromDbDeliveryNote);

      // Mutate window-level arrays in place so code that reads e.g. window.PEOPLE
      // directly (shell.jsx top-bar search, page-login resolver, store-r2 mutators
      // that sync window.PEOPLE) sees the fresh data.
      const replaceInPlace = (arr, items) => {
        if (Array.isArray(arr)) arr.splice(0, arr.length, ...items);
      };
      if (profiles.length)             replaceInPlace(window.PEOPLE, profiles);
      if (projectsTranslated.length)   replaceInPlace(window.PROJECTS, projectsTranslated);
      if (schoolsTranslated.length)    replaceInPlace(window.ALL_SCHOOLS, schoolsTranslated);
      if (contractorsTranslated.length)replaceInPlace(window.CONTRACTORS, contractorsTranslated);

      // React state setters — trigger re-render of every consumer.
      if (profiles.length && store._setPeople)             store._setPeople(profiles);
      if (profiles.length && store._setUsers)              store._setUsers(profiles.map(p => ({ ...p, active: !p.archived })));
      if (projectsTranslated.length && store._setProjects) store._setProjects(projectsTranslated);
      if (schoolsTranslated.length && store._setSchools)   store._setSchools(schoolsTranslated);
      if (contractorsTranslated.length && store._setContractorsLocal) store._setContractorsLocal(contractorsTranslated);
      if (tasksTranslated.length && store._setTasks)       store._setTasks(tasksTranslated);
      if (escalationsTranslated.length && store._setEscalations) store._setEscalations(escalationsTranslated);
      if (dnTranslated.length && store._setDeliveryNotes)  store._setDeliveryNotes(dnTranslated);

      // app_settings: split by key, apply to the matching slice.
      for (const s of rawAppSettings) {
        const v = s.value;
        if (s.key === 'theme.colors' && v && typeof v === 'object' && store._setThemeColors) store._setThemeColors(v);
        else if (s.key === 'theme.logo' && v && typeof v === 'object' && store._setThemeLogo) store._setThemeLogo(v);
        else if (s.key === 'notification.templates' && v && typeof v === 'object' && store._setNotificationTemplates) store._setNotificationTemplates(v);
        else if (s.key === 'role.permissions' && v && typeof v === 'object' && store._setRolePermissions) store._setRolePermissions(v);
      }

      // Audit log (separate fetch so the bulk Promise.all isn't slowed by 110 rows).
      const rawAudit = await window.bgFetchAuditLog(500);
      if (rawAudit && rawAudit.length && store._setAuditLog) {
        store._setAuditLog(rawAudit.map(window.fromDbAuditLog));
      }

      console.log(`[R30.2 boot] Loaded ${profiles.length} profiles · ${projectsTranslated.length} projects · ${schoolsTranslated.length} schools · ${contractorsTranslated.length} contractors · ${tasksTranslated.length} tasks · ${escalationsTranslated.length} escalations · ${dnTranslated.length} delivery notes · ${rawAppSettings.length} app_settings · ${(rawAudit||[]).length} audit entries`);
      setBootStatus('loaded');
    } catch (e) {
      console.error('[R30.2 boot] failed', e);
      setBootStatus('error');
    }
  }, [store]);

  // R30.2 — Supabase auth gate. When USE_SUPABASE is on we drive the React
  // currentUser from the live profiles table (not the in-memory PEOPLE seed)
  // and kick off the boot orchestrator on SIGNED_IN / INITIAL_SESSION.
  // Demo mode (?dev=1) bypasses this entire effect.
  React.useEffect(() => {
    if (typeof window === 'undefined' || !window.USE_SUPABASE || !window.supabase) return;

    const resolveSession = async (session) => {
      if (!session?.user) { setHydrating(false); return; }
      // R30.16 fix H2: dedupe — onAuthStateChange fires INITIAL_SESSION + SIGNED_IN
      // back-to-back, was running bgFetchCurrentProfile 7× per page load.
      if (__resolvedUserIdRef.current === session.user.id) {
        setHydrating(false);
        return;
      }
      __resolvedUserIdRef.current = session.user.id;
      const profileRow = await window.bgFetchCurrentProfile(session.user.id);
      if (!profileRow) {
        try { await window.supabase.auth.signOut(); } catch {}
        __resolvedUserIdRef.current = null;
        setHydrating(false);
        return;
      }
      const profile = window.fromDbProfile(profileRow);
      setCurrentUser(profile);
      setHydrating(false);
      bootFromSupabase().then(() => {
        // R30.16 fix H1: only install realtime ONCE per session, not on every
        // bootFromSupabase().then() callback (which the auth state churn fired ~25/min).
        try {
          if (typeof window !== 'undefined' && window.installRealtime && !__realtimeCleanupRef.current) {
            __realtimeCleanupRef.current = window.installRealtime(store);
          }
        } catch (_) {}
        // R30.19 fix Bug #4 — projects, profiles, app_settings aren't in the
        // realtime publication (would require deeper React refactor). Instead,
        // when the user returns to the tab, re-run the boot fetch so they see
        // the latest cross-account state without a manual Ctrl-R.
        if (typeof window !== 'undefined' && !window.__visRefreshInstalled) {
          window.__visRefreshInstalled = true;
          document.addEventListener('visibilitychange', () => {
            if (!document.hidden && window.USE_SUPABASE) {
              bootFromSupabase().catch(() => {});
            }
          });
        }
      });
    };

    // 1) Hydrate existing session on mount.
    window.supabase.auth.getSession().then(({ data }) => {
      if (data?.session) resolveSession(data.session);
      else setHydrating(false);  // No stored session — drop splash, show login.
    });
    // 2) Subscribe to future auth changes.
    const { data: sub } = window.supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        __bootRanRef.current = false;
        __resolvedUserIdRef.current = null;  // R30.16
        // R30.7 — Detach realtime channel so the next sign-in installs a fresh one.
        try {
          if (__realtimeCleanupRef.current) {
            __realtimeCleanupRef.current();
            __realtimeCleanupRef.current = null;
          }
        } catch (_) {}
        setBootStatus(null);
        setCurrentUser(null);
        setHydrating(false);
        return;
      }
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
        resolveSession(session);
      }
    });
    return () => { try { sub?.subscription?.unsubscribe(); } catch {} };
  }, [bootFromSupabase]);

  // H3/R30.4 BUG #3 — URL hash sync (cheap router). The hash now carries the
  // detail-page id segment so:
  //   1. Reload on /#/project-detail/p-mad restores activeProjectId.
  //   2. Browser back/forward navigates between detail entities.
  //   3. The URL is shareable.
  // Hash format: '#/<page>' or '#/<page>/<id>' for project-detail,
  // school-detail, escalation-detail. Other pages stay '#/<page>'.
  React.useEffect(() => {
    if (!currentUser) return;
    let detailId = null;
    if (page === 'project-detail')       detailId = activeProjectId;
    else if (page === 'school-detail')   detailId = activeSchoolId;
    else if (page === 'escalation-detail') detailId = activeEscId;
    const desired = detailId ? `#/${page}/${detailId}` : `#/${page}`;
    if (window.location.hash !== desired) {
      try { window.history.replaceState(null, '', desired); } catch {}
    }
  }, [page, activeProjectId, activeSchoolId, activeEscId, currentUser]);
  React.useEffect(() => {
    const onPop = () => {
      const h = window.location.hash.replace(/^#\/?/, '');
      if (!h) return;
      const [nextPage, idSegment] = h.split('/');
      if (idSegment) {
        if (nextPage === 'project-detail' && idSegment !== activeProjectId) setActiveProjectId(idSegment);
        else if (nextPage === 'school-detail' && idSegment !== activeSchoolId) setActiveSchoolId(idSegment);
        else if (nextPage === 'escalation-detail' && idSegment !== activeEscId) setActiveEscId(idSegment);
      }
      if (nextPage && nextPage !== page) setPage(nextPage);
    };
    window.addEventListener('popstate', onPop);
    window.addEventListener('hashchange', onPop);
    return () => {
      window.removeEventListener('popstate', onPop);
      window.removeEventListener('hashchange', onPop);
    };
  }, [page, activeProjectId, activeSchoolId, activeEscId]);
  // On first load: parse hash → restore page + active id once.
  React.useEffect(() => {
    if (!currentUser) return;
    const h = window.location.hash.replace(/^#\/?/, '');
    if (!h) return;
    const [nextPage, idSegment] = h.split('/');
    if (nextPage && nextPage !== page) setPage(nextPage);
    if (idSegment) {
      if (nextPage === 'project-detail' && !activeProjectId) setActiveProjectId(idSegment);
      else if (nextPage === 'school-detail' && !activeSchoolId) setActiveSchoolId(idSegment);
      else if (nextPage === 'escalation-detail' && !activeEscId) setActiveEscId(idSegment);
    }
    // Intentionally runs only when currentUser flips from null → person (sign-in
    // or rehydration), so subsequent page changes don't re-parse the URL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  const [taskModalOpen, setTaskModalOpen] = React.useState(false);
  const [taskDefaults,  setTaskDefaults]  = React.useState({});
  const [openTask, setOpenTask] = React.useState(null);
  const [escModalOpen, setEscModalOpen] = React.useState(false);
  const [escDefaults,   setEscDefaults]   = React.useState({});
  const [globalToast, setGlobalToast] = React.useState(null);
  React.useEffect(() => {
    if (globalToast) { const t = setTimeout(() => setGlobalToast(null), 4000); return () => clearTimeout(t); }
  }, [globalToast]);

  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const accentClass = `accent-${tweaks.accent}`;
  const themeClass  = tweaks.darkMode ? 'dark-mode' : '';

  React.useEffect(() => {
    // M4: PM lands on /my-projects (not /home) after sign-in / role change.
    setPage(role === 'Project Manager' ? 'my-projects' : 'home');
    setActiveProjectId(null);
    setActiveSchoolId(null);
    setActiveEscId(null);
  }, [role]);

  // Sign-in / sign-out (audit-logged)
  const handleSignIn = (user) => {
    setCurrentUser(user);
    if (store.logAudit) store.logAudit({
      actorId: user.id, actorName: user.name, actorRole: user.role,
      action: 'LOGIN', entityType: 'session', entityId: user.id, entityLabel: user.name,
      summary: `${user.name} signed in`,
    });
  };
  const handleSignOut = () => {
    if (currentUser && store.logAudit) store.logAudit({
      actorId: currentUser.id, actorName: currentUser.name, actorRole: currentUser.role,
      action: 'LOGOUT', entityType: 'session', entityId: currentUser.id, entityLabel: currentUser.name,
      summary: `${currentUser.name} signed out`,
    });
    if (typeof window !== 'undefined' && window.USE_SUPABASE && window.supabase) {
      try { window.supabase.auth.signOut(); } catch {}
    }
    setCurrentUser(null);
    setPage('home');
  };

  // Role switcher in topbar (demo only — pick first user with that role).
  // R30.3a SECURITY HOTFIX: defensive guard. In production mode the dropdown
  // is hidden (see shell.jsx) — this guard is a second line of defense in
  // case the handler is invoked from devtools / a stale event handler.
  const handleRoleChange = (newRole) => {
    if (typeof window !== 'undefined' && window.USE_SUPABASE && currentUser) {
      console.warn('[R30.3a] Role change blocked: user is auth-locked to profile.role');
      return;
    }
    const u = PEOPLE.find(p => p.role === newRole);
    if (u) setCurrentUser(u);
  };

  // R30.3b — Splash for returning users with a stored Supabase session token.
  // Renders synchronously on first paint (no flash of login), gives way to the
  // app once resolveSession resolves or to the login form if the token is stale.
  if (!currentUser && hydrating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-navy-900 text-white" data-testid="r30-hydrating-splash">
        <div className="text-center">
          {typeof ZamilLogo === 'function' && <ZamilLogo size={88} />}
          <div className="text-2xl font-extrabold tracking-[0.10em] mt-4">Zamil Services</div>
          <div className="text-sm text-amber-300 tracking-[0.10em] mt-2">Restoring your session…</div>
          <div className="mt-6">
            <span className="inline-block w-2 h-2 rounded-full bg-amber-300 animate-pulse mx-0.5"></span>
            <span className="inline-block w-2 h-2 rounded-full bg-amber-300 animate-pulse mx-0.5" style={{ animationDelay: '0.15s' }}></span>
            <span className="inline-block w-2 h-2 rounded-full bg-amber-300 animate-pulse mx-0.5" style={{ animationDelay: '0.3s' }}></span>
          </div>
        </div>
      </div>
    );
  }

  // Login screen
  if (!currentUser) {
    return (
      <div className={cls('min-h-screen', accentClass)}>
        <PageLogin onSignIn={handleSignIn} />
      </div>
    );
  }

  const unread = notifs.filter(n => !n.read).length;
  const isPgm = isPgmGroup(role);

  const openProject = (id) => { setActiveProjectId(id); setActiveSchoolId(null); setPage('project-detail'); };
  const openSchoolsList = (projectId) => { setActiveProjectId(projectId); setActiveSchoolId(null); setPage('schools-list'); };
  const openSchool = (id) => { setActiveSchoolId(id); setPage('school-detail'); };
  const openEsc = (id) => { setActiveEscId(id); setPage('escalation-detail'); };

  const onAddTask = (defaults = {}) => { setTaskDefaults(defaults); setTaskModalOpen(true); };
  const onCreateTask = (data) => { addTask({ ...data, createdById: currentUser.id }); };
  const onOpenTask  = (t) => setOpenTask(t);

  const onNewEscalation = (defaults = {}) => { setEscDefaults(defaults); setEscModalOpen(true); };
  const onCreateEsc = (data) => { addEscalation(data); };

  const navigateNotif = (n) => {
    markNotifRead(n.id);
    setNotifsOpen(false);
    if (n.target.kind === 'school') {
      const sch = schools.find(s => s.id === n.target.id);
      if (sch) { setActiveProjectId(sch.projectId); setActiveSchoolId(sch.id); setPage('school-detail'); }
    } else if (n.target.kind === 'project') { openProject(n.target.id); }
    else if (n.target.kind === 'task') {
      const t = tasks.find(x => x.id === n.target.id);
      if (t) setOpenTask(t);
    } else if (n.target.kind === 'escalation') { openEsc(n.target.id); }
  };

  // Find PM's project list (Project Managers can have multiple projects)
  const myProjects = currentUser.projectIds
    ? projects.filter(p => currentUser.projectIds.includes(p.id))
    : projects;
  const primaryProject = myProjects[0];


  // R30.16: URL route guard — same matrix used by sidebar (Settings → Roles & Permissions)
  // also blocks direct URL access. If VP/Reports is unchecked, typing /#/reports gets
  // an "Access denied" screen instead of bypassing the matrix.
  const PAGE_TO_FEATURE = {
    'home': 'Dashboard', 'my-projects': 'Dashboard',
    'projects': 'Projects', 'project-detail': 'Projects', 'schools-list': 'Projects', 'school-detail': 'Projects', 'my-schools': 'Projects',
    'reports': 'Reports',
    'financials': 'Financials',
    'contractors': 'Contractors',
    'settings': 'Settings',
  };
  const rolePermissions = store.rolePermissions;
  const isPageAllowed = (pageId) => {
    const feature = PAGE_TO_FEATURE[pageId];
    if (!feature) return true; // not matrix-controlled
    if (!rolePermissions || !rolePermissions[role]) return true; // matrix not loaded yet
    return rolePermissions[role][feature] !== false;
  };
  const AccessDenied = () => (
    <div className="p-12 text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-50 text-red-600 mb-4">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
      </div>
      <h2 className="text-lg font-semibold text-ink-900">Access denied</h2>
      <p className="text-sm text-ink-500 mt-2 max-w-md mx-auto">
        Your role ({role}) does not have permission to access this page. If you believe this is wrong, contact your administrator to update Settings → Roles & Permissions.
      </p>
      <button type="button" onClick={() => setPage(role === 'Project Manager' ? 'my-projects' : 'home')}
        className="mt-6 px-4 py-2 rounded-md bg-navy-900 text-white text-sm hover:opacity-90">
        Back to Dashboard
      </button>
    </div>
  );

  const renderPage = () => {
    if (!isPageAllowed(page)) return <AccessDenied />;
    if (page === 'escalation-detail' && activeEscId) {
      return <PageEscalationDetail id={activeEscId} onBack={() => setPage(role === 'VP' ? 'home' : 'my-escalations')} currentUser={currentUser} />;
    }
    if (page === 'project-detail' && activeProjectId) {
      const p = projects.find(x => x.id === activeProjectId);
      return <PageProject project={p} onBack={() => setPage('home')}
        onOpenSchools={openSchoolsList} currentUser={currentUser}
        onAddTask={onAddTask} onOpenTask={onOpenTask} onEscalate={() => onNewEscalation({ projectId: p.id, title: `${p.name} — ` })} />;
    }
    if (page === 'schools-list' && activeProjectId) {
      const p = projects.find(x => x.id === activeProjectId);
      return <PageSchoolsList project={p} onBack={() => setPage('project-detail')} currentUser={currentUser}
        onOpenSchool={openSchool} onAddTask={onAddTask} />;
    }
    if (page === 'school-detail' && activeSchoolId) {
      return <PageSchoolDetail schoolId={activeSchoolId}
        onBack={() => setPage(activeProjectId ? 'schools-list' : 'home')}
        onAddTask={onAddTask} currentUser={currentUser}
        onEscalate={(sch) => onNewEscalation({ projectId: sch.projectId, schoolId: sch.id, title: `${sch.code} ${sch.name} — ` })} />;
    }

    // R29 — Delivery Notes is a cross-role page. Render it once here regardless
    // of the role-specific branches below.
    if (page === 'delivery-notes' && typeof PageDeliveryNotes === 'function') {
      return <PageDeliveryNotes currentUser={currentUser} />;
    }

    // VP
    if (role === 'VP') {
      if (page === 'home')        return <PageVPDashboard onOpenEscalation={openEsc} currentUser={currentUser} />;
      if (page === 'projects')    return <PageVPPrograms projects={projects} onOpen={openProject} />;
      if (page === 'escalations') return <PageVPDashboard onOpenEscalation={openEsc} currentUser={currentUser} />;
      if (page === 'financials' && canViewFinancials(currentUser)) return <PageFinancials projects={projects} fin={FIN} />;
      if (page === 'reports')     return <PageReportsZamil projects={projects} />;
      if (page === 'audit-log')   return <PageSettings currentUser={currentUser} auditLogOnly={true} />;
      return <PageVPDashboard onOpenEscalation={openEsc} currentUser={currentUser} />;
    }

    // Project Manager (M4: home id is 'my-projects', schools id is 'my-schools')
    if (role === 'Project Manager') {
      if (page === 'home' || page === 'my-projects') return <PageDashboard projects={myProjects} onOpenProject={openProject} currentUser={currentUser} onNewEscalation={() => onNewEscalation({ projectId: primaryProject?.id })} />;
      if ((page === 'schools' || page === 'my-schools') && primaryProject) return <PageSchoolsList project={primaryProject} currentUser={currentUser} onBack={() => setPage('my-projects')} onOpenSchool={openSchool} onAddTask={onAddTask} />;
      if (page === 'tasks')      return <PageMyTasks currentUser={currentUser} onAddTask={onAddTask} onOpenTask={onOpenTask} />;
      if (page === 'my-escalations') return <PageMyEscalations currentUser={currentUser} onOpen={openEsc} onNew={() => onNewEscalation({ projectId: primaryProject?.id })} />;
      if (page === 'reports')    return <PageReportsZamil projects={myProjects} />;
      return <PageDashboard projects={myProjects} onOpenProject={openProject} currentUser={currentUser} onNewEscalation={() => onNewEscalation({ projectId: primaryProject?.id })} />;
    }

    // Material planning (M5: my-escalations route added)
    if (role === 'Material planning') {
      if (page === 'home')      return <PageDashboard projects={projects} onOpenProject={openProject} currentUser={currentUser} onNewEscalation={() => onNewEscalation({})} />;
      // R15 #2: Projects now routes to a read-only programs list (was duplicating Dashboard).
      if (page === 'projects')  return <PageVPPrograms projects={projects} onOpen={openProject} />;
      if (page === 'tasks')     return <PageMyTasks currentUser={currentUser} onAddTask={onAddTask} onOpenTask={onOpenTask} />;
      if (page === 'my-escalations') return <PageMyEscalations currentUser={currentUser} onOpen={openEsc} onNew={() => onNewEscalation({})} />;
      if (page === 'financials' && canViewFinancials(currentUser)) return <PageFinancials projects={projects} fin={FIN} />;
      if (page === 'reports')   return <PageReportsZamil projects={projects} />;
      return <PageDashboard projects={projects} onOpenProject={openProject} currentUser={currentUser} onNewEscalation={() => onNewEscalation({})} />;
    }

    // Coordinator (M5: my-escalations route added)
    if (role === 'Coordinator') {
      if (page === 'home')      return <PageDashboard projects={projects} onOpenProject={openProject} currentUser={currentUser} onNewEscalation={() => onNewEscalation({})} />;
      // R15 #2: Projects now routes to a read-only programs list (was duplicating Dashboard).
      if (page === 'projects')  return <PageVPPrograms projects={projects} onOpen={openProject} />;
      if (page === 'tasks')     return <PageMyTasks currentUser={currentUser} onAddTask={onAddTask} onOpenTask={onOpenTask} />;
      if (page === 'my-escalations') return <PageMyEscalations currentUser={currentUser} onOpen={openEsc} onNew={() => onNewEscalation({})} />;
      if (page === 'financials' && canViewFinancials(currentUser)) return <PageFinancials projects={projects} fin={FIN} />;
      if (page === 'reports')   return <PageReportsZamil projects={projects} />;
      return <PageDashboard projects={projects} onOpenProject={openProject} currentUser={currentUser} onNewEscalation={() => onNewEscalation({})} />;
    }

    // Program Manager group (Manager, Operations Manager, Program Manager)
    if (page === 'home')        return <PagePMDashboard projects={projects} currentUser={currentUser} onOpenEscalation={openEsc} onNewEscalation={() => onNewEscalation({})} />;
    if (page === 'projects')    return <PageDashboard projects={projects} onOpenProject={openProject} currentUser={currentUser} />;
    if (page === 'tasks')       return <PageMyTasks currentUser={currentUser} onAddTask={onAddTask} onOpenTask={onOpenTask} />;
    if (page === 'my-escalations') return <PageMyEscalations currentUser={currentUser} onOpen={openEsc} onNew={() => onNewEscalation({})} />;
    if (page === 'financials' && canViewFinancials(currentUser)) return <PageFinancials projects={projects} fin={FIN} />;
    if (page === 'contractors') return <PageContractors contractors={CONTRACTORS} projects={projects} />;
    if (page === 'reports')     return <PageReportsZamil projects={projects} />;
    if (page === 'settings') {
      if (!canViewSettings(currentUser)) {
        // Defensive: shouldn't normally hit this path since sidebar is hidden, but block direct route too.
        return <div className="p-6"><div className="bg-red-50 border border-red-300 rounded-md p-4 text-sm text-red-800">Access denied — Settings is restricted to Managers.</div></div>;
      }
      return <PageSettings currentUser={currentUser} />;
    }
    // R15 #1: dedicated Audit Log route for Operations Manager / Program Manager
    // (Managers reach the same view via Settings → Audit Log tab).
    if (page === 'audit-log') return <PageSettings currentUser={currentUser} auditLogOnly={true} />;
    return <PagePMDashboard projects={projects} currentUser={currentUser} onOpenEscalation={openEsc} onNewEscalation={() => onNewEscalation({})} />;
  };

  const sidebarActive = (page === 'project-detail' || page === 'schools-list' || page === 'school-detail')
    ? (role === 'Project Manager' ? 'my-projects' : 'projects')
    : page;

  return (
    <div className={cls('min-h-screen flex', accentClass, themeClass)}>
      <Sidebar active={sidebarActive} role={role} currentUser={currentUser}
        mobileOpen={mobileNavOpen}
        onMobileClose={() => setMobileNavOpen(false)}
        onNav={(id) => {
          if (id === 'settings' && !canViewSettings(currentUser)) {
            setGlobalToast({ kind: 'error', msg: 'Access denied — Settings is restricted to Managers.' });
            return;
          }
          setPage(id); setActiveProjectId(null); setActiveSchoolId(null); setActiveEscId(null);
        }} />

      <div className="flex-1 min-w-0 flex flex-col">
        <TopBar role={role} onRoleChange={handleRoleChange} currentUser={currentUser}
          search={search} onSearch={setSearch} onSignOut={handleSignOut}
          onMobileMenuOpen={() => setMobileNavOpen(true)}
          onResultPick={(kind, item) => {
            if (kind === 'project')    { setActiveProjectId(item.id); setActiveSchoolId(null); setPage('project-detail'); }
            else if (kind === 'school'){ setActiveProjectId(item.projectId); setActiveSchoolId(item.id); setPage('school-detail'); }
            else if (kind === 'contractor') setPage('contractors');
          }}
          onOpenNotifs={() => setNotifsOpen(true)} unreadCount={unread} />

        <main id="main-content" tabIndex={-1} className="flex-1 min-w-0 overflow-auto relative">
          {bootStatus === 'loading' && (
            <div className="bg-amber-50 border-b border-amber-300 text-amber-900 text-xs px-4 py-1.5 flex items-center gap-2" data-testid="r30-boot-banner">
              <span className="inline-block w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              Loading live data from Supabase…
            </div>
          )}
          {bootStatus === 'error' && (
            <div className="bg-red-50 border-b border-red-300 text-red-800 text-xs px-4 py-1.5" data-testid="r30-boot-banner">
              ⚠ Couldn't load live data — showing cached demo. Check console.
            </div>
          )}
          {globalToast && (
            <div className={cls('fixed top-16 right-6 z-50 rounded-md px-4 py-2.5 shadow-pop border text-sm',
              globalToast.kind === 'error' ? 'bg-red-50 border-red-300 text-red-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800')}>
              <span className="font-semibold mr-1">{globalToast.kind === 'error' ? '⚠' : '✓'}</span>{globalToast.msg}
            </div>
          )}
          {renderPage()}
        </main>
      </div>

      <NotifPanel open={notifsOpen} onClose={() => setNotifsOpen(false)} items={notifs}
        onNavigate={navigateNotif} onMarkAllRead={markAllNotifsRead} />

      <TaskModal open={taskModalOpen} onClose={() => setTaskModalOpen(false)}
        projects={projects} schools={schools} defaults={taskDefaults} onCreate={onCreateTask} />

      <TaskDetailPanel task={openTask} open={!!openTask} onClose={() => setOpenTask(null)}
        currentUserId={currentUser.id}
        onSendMessage={(id) => { sendTaskMessage(id, { userId: currentUser.id, text: 'Following up — please share status.' }); }}
        onSendReminder={(id) => { sendTaskReminder(id); }}
        onMarkDone={(id) => { updateTask(id, { status: 'Done' }); setOpenTask(null); }} />

      <EscalationModal open={escModalOpen} onClose={() => setEscModalOpen(false)}
        defaults={escDefaults} projects={projects} currentUser={currentUser} onCreate={onCreateEsc} />

      <TweaksPanel title="Tweaks">
        <TweakSection title="Theme">
          <TweakToggle label="Dark navy theme" value={tweaks.darkMode} onChange={v => setTweak('darkMode', v)} />
          <TweakRadio label="Accent" value={tweaks.accent} onChange={v => setTweak('accent', v)}
            options={[{value:'gold',label:'Gold'},{value:'steel',label:'Steel'},{value:'red',label:'Red'}]} />
        </TweakSection>
        <TweakSection title="Tip">
          <p className="text-xs text-ink-500">Switch users via the top-right menu or change role via the dropdown to demo different views.</p>
        </TweakSection>
      </TweaksPanel>
    </div>
  );
}

function App() {
  return <StoreProvider><AppInner /></StoreProvider>;
}

// Vite migration: createRoot is called from main.jsx after all module-globals register.
window.App = App;
