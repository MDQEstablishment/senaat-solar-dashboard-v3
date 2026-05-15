import React from 'react';
// Updated shell — sidebar nav adapts to role; topbar wires notifications, role switcher, sign-out
// Round 12: Vite migration. Adds H1 global search w/ 250ms debounce + grouped dropdown,
// H4 button semantics, H5 responsive drawer (hamburger under lg), M1/M2/M3 aria.

function isPgmGroup(role) {
  return PROGRAM_MANAGER_GROUP.indexOf(role) !== -1;
}

function navForRole(role, currentUser) {
  const finItem = canViewFinancials(currentUser)
    ? [{ id: 'financials', label: 'Financials', icon: 'banknote' }]
    : [];

  if (role === 'VP') {
    return [
      { id: 'home',        label: 'Dashboard',   icon: 'home' },
      { id: 'projects',    label: 'Programs',    icon: 'folder-kanban' },
      { id: 'escalations', label: 'Escalations', icon: 'alert-circle' },
      ...finItem,
      { id: 'reports',     label: 'Reports',     icon: 'file-text' },
    ];
  }
  if (role === 'Project Manager') {
    // M4: PM's primary route is /my-projects (not /home).
    return [
      { id: 'my-projects',    label: 'My Projects',    icon: 'home' },
      { id: 'my-schools',     label: 'My Schools',     icon: 'school' },
      { id: 'tasks',          label: 'My Tasks',       icon: 'check-circle' },
      { id: 'my-escalations', label: 'My Escalations', icon: 'alert-circle' },
      ...finItem,
      { id: 'reports',        label: 'Reports',        icon: 'file-text' },
    ];
  }
  if (role === 'Material planning') {
    return [
      { id: 'home',           label: 'Dashboard',      icon: 'home' },
      { id: 'projects',       label: 'Projects',       icon: 'folder-kanban' },
      { id: 'tasks',          label: 'My Tasks',       icon: 'check-circle' },
      { id: 'my-escalations', label: 'My Escalations', icon: 'alert-circle' },  // M5
      ...finItem,
      { id: 'reports',        label: 'Reports',        icon: 'file-text' },
    ];
  }
  if (role === 'Coordinator') {
    return [
      { id: 'home',           label: 'Dashboard',      icon: 'home' },
      { id: 'projects',       label: 'Projects',       icon: 'folder-kanban' },
      { id: 'tasks',          label: 'My Tasks',       icon: 'check-circle' },
      { id: 'my-escalations', label: 'My Escalations', icon: 'alert-circle' },  // M5
      ...finItem,
      { id: 'reports',        label: 'Reports',        icon: 'file-text' },
    ];
  }
  // Program Manager group (Manager / Operations Manager / Program Manager)
  const settingsItem = canViewSettings(currentUser)
    ? [{ id: 'settings', label: 'Settings', icon: 'settings' }]
    : [];
  return [
    { id: 'home',           label: 'Dashboard',      icon: 'home' },
    { id: 'projects',       label: 'Projects',       icon: 'folder-kanban' },
    { id: 'tasks',          label: 'My Tasks',       icon: 'check-circle' },
    { id: 'my-escalations', label: 'My Escalations', icon: 'alert-circle' },
    ...finItem,
    { id: 'contractors',    label: 'Contractors',    icon: 'hard-hat' },
    { id: 'reports',        label: 'Reports',        icon: 'file-text' },
    ...settingsItem,
  ];
}

// H4: sidebar nav items are <a> with role="link", not <button>.
// We keep the original onNav(id) handler since internal page state in app.jsx
// drives content — but each item also updates the URL hash so back/forward
// navigation works (cheap router without a full app.jsx rewrite).
function navHrefFor(id) {
  return '#/' + id;
}

function Sidebar({ active, onNav, currentUser, role, mobileOpen, onMobileClose }) {
  const items = navForRole(role, currentUser);

  // H5: Escape closes mobile drawer
  React.useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') onMobileClose && onMobileClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [mobileOpen, onMobileClose]);

  const sidebar = (
    <aside aria-label="Primary navigation"
      className={cls(
        'w-60 shrink-0 surface border-r border-soft flex flex-col',
        'lg:relative lg:translate-x-0',
        // Mobile drawer behaviour:
        'fixed top-0 left-0 h-full z-50 transition-transform duration-200',
        mobileOpen ? 'translate-x-0 shadow-pop' : '-translate-x-full lg:translate-x-0'
      )}>
      <div className="px-5 py-4 border-b border-soft flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ZamilLogo size={32} />
          <div>
            <div className="text-[15px] font-extrabold tracking-[0.12em] text-navy-900 ink-on-dark">ZAMIL</div>
            <div className="text-[10px] text-ink-500 ink-muted-on-dark -mt-0.5">Services · Solar Programs</div>
          </div>
        </div>
        <button type="button" aria-label="Close menu"
          onClick={onMobileClose}
          className="lg:hidden p-1.5 rounded hover:bg-ink-100">
          <Icon name="x" size={16} />
        </button>
      </div>

      <nav className="flex-1 p-2 space-y-0.5" aria-label="Main">
        {items.map(n => {
          const isActive = active === n.id;
          return (
            <a key={n.id}
              href={navHrefFor(n.id)}
              role="link"
              aria-current={isActive ? 'page' : undefined}
              onClick={e => { e.preventDefault(); onNav(n.id); onMobileClose && onMobileClose(); }}
              className={cls('w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition no-underline',
                isActive ? 'bg-navy-900 text-white font-medium' : 'text-ink-700 ink-on-dark hover:bg-ink-100')}>
              <Icon name={n.icon} size={15} />
              <span>{n.label}</span>
            </a>
          );
        })}
      </nav>

      <div className="p-3 border-t border-soft">
        <div className="flex items-center gap-2.5 p-2 rounded-md surface-2">
          <Avatar initials={currentUser.initials} size={32} />
          <div className="min-w-0">
            <div className="text-[13px] font-semibold truncate">{currentUser.name}</div>
            <div className="text-[11px] text-ink-500 ink-muted-on-dark truncate">{role}</div>
          </div>
        </div>
      </div>
    </aside>
  );

  return (
    <>
      {/* H5: Mobile backdrop */}
      {mobileOpen && (
        <div onClick={onMobileClose} aria-hidden="true"
          className="fixed inset-0 z-40 bg-black/30 lg:hidden" />
      )}
      {sidebar}
    </>
  );
}

// Zamil wordmark logo (simple SVG)
function ZamilLogo({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" style={{ display: 'inline-block' }} aria-hidden="true">
      <rect x="1" y="1" width="30" height="30" rx="6" fill="#0B2545" />
      <path d="M8 9 L24 9 L8 23 L24 23" stroke="#D4A52A" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="24" cy="9" r="1.6" fill="#D4A52A" />
    </svg>
  );
}

// H1: Debounced global search with grouped dropdown results
function GlobalSearch({ onResultPick }) {
  const [q, setQ] = React.useState('');
  const [debouncedQ, setDebouncedQ] = React.useState('');
  const [open, setOpen] = React.useState(false);
  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim().toLowerCase()), 250);
    return () => clearTimeout(t);
  }, [q]);

  const results = React.useMemo(() => {
    if (!debouncedQ) return { projects: [], schools: [], people: [], contractors: [] };
    const ql = debouncedQ;
    const projectsRes = (window.PROJECTS || []).filter(p =>
      (p.name + ' ' + (p.region||'') + ' ' + (p.tag||'')).toLowerCase().includes(ql)).slice(0, 4);
    const schoolsRes = (window.ALL_SCHOOLS || []).filter(s =>
      (s.id + ' ' + (s.nameEn||'') + ' ' + (s.nameAr||'') + ' ' + (s.meter||'') + ' ' + (s.city||'')).toLowerCase().includes(ql)
    ).slice(0, 6);
    const peopleRes = (window.PEOPLE || []).filter(p => (p.name + ' ' + (p.email||'')).toLowerCase().includes(ql)).slice(0, 3);
    const contractorsRes = (window.CONTRACTORS || []).filter(c => c.name.toLowerCase().includes(ql)).slice(0, 3);
    return { projects: projectsRes, schools: schoolsRes, people: peopleRes, contractors: contractorsRes };
  }, [debouncedQ]);

  const total = results.projects.length + results.schools.length + results.people.length + results.contractors.length;
  const pick = (kind, item) => {
    setQ(''); setOpen(false);
    onResultPick && onResultPick(kind, item);
  };

  return (
    <div className="relative w-full max-w-md">
      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-500" aria-hidden="true"><Icon name="search" size={14} /></span>
      <input
        type="search"
        value={q}
        aria-label="Search"
        placeholder="Search schools, projects, people, materials…"
        onChange={e => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={e => {
          if (e.key === 'Escape') { setQ(''); setOpen(false); }
          if (e.key === 'Enter' && total > 0) {
            const first = results.projects[0] || results.schools[0] || results.contractors[0] || results.people[0];
            const kind = results.projects.length ? 'project' : results.schools.length ? 'school' : results.contractors.length ? 'contractor' : 'person';
            pick(kind, first);
          }
        }}
        className="w-full pl-8 pr-3 py-1.5 text-sm rounded-md border border-ink-200 surface-2 focus:outline-none focus:ring-2 ring-accent" />
      {open && debouncedQ && (
        <div role="listbox" aria-label="Search results"
          className="absolute top-full left-0 right-0 mt-1 surface border border-soft rounded-md shadow-pop max-h-96 overflow-auto z-50">
          {total === 0 && <div className="px-3 py-2 text-xs text-ink-500 italic">No results for "{debouncedQ}".</div>}
          {results.projects.length > 0 && <SearchGroup label="Projects">
            {results.projects.map(p => (
              <button type="button" key={p.id} onMouseDown={() => pick('project', p)} className="w-full text-left px-3 py-1.5 text-xs hover:bg-ink-100 flex items-center gap-2">
                <Icon name="folder-kanban" size={12} /><span className="font-medium">{p.name}</span>
                <span className="text-ink-500">· {p.region}</span>
              </button>
            ))}
          </SearchGroup>}
          {results.schools.length > 0 && <SearchGroup label="Schools">
            {results.schools.map(s => (
              <button type="button" key={s.id} onMouseDown={() => pick('school', s)} className="w-full text-left px-3 py-1.5 text-xs hover:bg-ink-100 flex items-center gap-2">
                <Icon name="school" size={12} />
                <span className="font-mono text-[10px] text-ink-500">{s.id}</span>
                <span className="font-medium truncate">{s.nameEn || s.name}</span>
              </button>
            ))}
          </SearchGroup>}
          {results.people.length > 0 && <SearchGroup label="People">
            {results.people.map(p => (
              <button type="button" key={p.id} onMouseDown={() => pick('person', p)} className="w-full text-left px-3 py-1.5 text-xs hover:bg-ink-100 flex items-center gap-2">
                <Avatar initials={p.initials} size={16} />
                <span className="font-medium">{p.name}</span><span className="text-ink-500">· {p.role}</span>
              </button>
            ))}
          </SearchGroup>}
          {results.contractors.length > 0 && <SearchGroup label="Contractors">
            {results.contractors.map(c => (
              <button type="button" key={c.id} onMouseDown={() => pick('contractor', c)} className="w-full text-left px-3 py-1.5 text-xs hover:bg-ink-100 flex items-center gap-2">
                <Icon name="hard-hat" size={12} /><span className="font-medium">{c.name}</span>
              </button>
            ))}
          </SearchGroup>}
        </div>
      )}
    </div>
  );
}
function SearchGroup({ label, children }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-ink-500 px-3 py-1 bg-ink-50 border-b border-soft">{label}</div>
      {children}
    </div>
  );
}

function TopBar({ role, onRoleChange, currentUser, search, onSearch, onOpenNotifs, unreadCount, onSignOut, onResultPick, onMobileMenuOpen }) {
  const [menuOpen, setMenuOpen] = React.useState(false);
  React.useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e) => { if (!e.target.closest('[data-user-menu]')) setMenuOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [menuOpen]);

  return (
    <header className="h-14 surface border-b border-soft flex items-center px-3 lg:px-5 gap-3 lg:gap-4 sticky top-0 z-20">
      {/* H5: Mobile hamburger */}
      <button type="button" aria-label="Open menu"
        onClick={onMobileMenuOpen}
        className="lg:hidden p-2 rounded hover:bg-ink-100">
        <Icon name="more-horizontal" size={18} />
      </button>

      <div className="hidden lg:block text-xs text-ink-500 ink-muted-on-dark">Zamil Services · Solar Programs</div>

      <div className="flex-1 flex justify-center">
        <GlobalSearch onResultPick={onResultPick} />
      </div>

      <Select value={role} onChange={onRoleChange} options={ROLES} className="!py-1 hidden md:block" />

      <button type="button" onClick={onOpenNotifs} aria-label={`Notifications (${unreadCount} unread)`}
        className="relative p-2 rounded-md hover:bg-ink-100 text-ink-700 ink-on-dark">
        <Icon name="bell" size={16} />
        {unreadCount > 0 && (
          <span aria-hidden="true" className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] px-1 rounded-full bg-ind-red text-white text-[10px] font-semibold flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      <div className="relative" data-user-menu>
        <button type="button" onClick={() => setMenuOpen(o => !o)} aria-label="User menu"
          aria-haspopup="menu" aria-expanded={menuOpen ? 'true' : 'false'}
          className="flex items-center gap-2 hover:bg-ink-100 rounded-md px-2 py-1">
          <Avatar initials={currentUser.initials} size={28} />
          <div className="hidden md:block leading-tight text-left">
            <div className="text-xs font-semibold ink-on-dark">{currentUser.name}</div>
            <div className="text-[10px] text-ink-500 ink-muted-on-dark">{role}</div>
          </div>
          <Icon name="chevron-down" size={12} />
        </button>
        {menuOpen && (
          <div role="menu" className="absolute right-0 mt-1 w-44 surface border border-soft rounded-md shadow-pop z-30">
            <div className="px-3 py-2 text-[11px] text-ink-500 border-b border-soft">{currentUser.email}</div>
            <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); onSignOut && onSignOut(); }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-ink-100 flex items-center gap-2 text-red-600">
              <Icon name="arrow-left" size={13} /> Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

function NotifPanel({ open, onClose, items, onNavigate, onMarkAllRead }) {
  const tones   = { task: 'info', overdue: 'danger', mention: 'gold', reminder: 'warn', stage: 'navy', pay: 'ok', ncr: 'warn' };
  const icons   = { task: 'check-circle', overdue: 'alert-circle', mention: 'mail', reminder: 'bell', stage: 'milestone', pay: 'banknote', ncr: 'alert-circle' };
  return (
    <SlideOver open={open} onClose={onClose} title="Notifications" width="max-w-sm">
      <div className="flex justify-between items-center mb-3">
        <span className="text-xs text-ink-500">{items.filter(n => !n.read).length} unread of {items.length}</span>
        <Button size="sm" variant="ghost" onClick={onMarkAllRead}>Mark all read</Button>
      </div>
      <div className="space-y-2">
        {items.map(n => (
          <button type="button" key={n.id} onClick={() => onNavigate(n)}
            className={cls('w-full text-left p-3 rounded-md border transition',
              n.read ? 'border-soft bg-white' : 'border-accent bg-accent-soft')}>
            <div className="flex items-start gap-2">
              <Pill tone={tones[n.kind] || 'soft'}><Icon name={icons[n.kind] || 'bell'} size={11} /></Pill>
              <div className="flex-1 min-w-0">
                <div className="text-xs">{n.text}</div>
                <div className="text-[10px] text-ink-500 mt-0.5">{n.when} · click to open</div>
              </div>
              {!n.read && <span className="w-2 h-2 rounded-full bg-accent mt-1.5" aria-hidden="true" />}
            </div>
          </button>
        ))}
        {items.length === 0 && <div className="text-xs text-ink-500 italic text-center py-6">No notifications.</div>}
      </div>
    </SlideOver>
  );
}

Object.assign(window, { Sidebar, TopBar, NotifPanel, navForRole, isPgmGroup, ZamilLogo, GlobalSearch });
