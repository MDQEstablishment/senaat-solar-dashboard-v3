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
  }, [currentUser]);

  // H3: URL hash sync (cheap router — back/forward navigates between pages).
  // We use hash routing because the app uses internal state, not real <Route>s.
  React.useEffect(() => {
    if (!currentUser) return;
    const desired = '#/' + page;
    if (window.location.hash !== desired) {
      try { window.history.replaceState(null, '', desired); } catch {}
    }
  }, [page, currentUser]);
  React.useEffect(() => {
    const onPop = () => {
      const h = window.location.hash.replace(/^#\/?/, '');
      if (h && h !== page) setPage(h);
    };
    window.addEventListener('popstate', onPop);
    window.addEventListener('hashchange', onPop);
    return () => {
      window.removeEventListener('popstate', onPop);
      window.removeEventListener('hashchange', onPop);
    };
  }, [page]);

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
    setCurrentUser(null);
    setPage('home');
  };

  // Role switcher in topbar (demo only — pick first user with that role)
  const handleRoleChange = (newRole) => {
    const u = PEOPLE.find(p => p.role === newRole);
    if (u) setCurrentUser(u);
  };

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

  const renderPage = () => {
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
