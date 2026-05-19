import React from 'react';
// My Tasks queue — Zamil Round 5 visibility scope
//   VP                            → no tasks (uses escalations queue)
//   Program Manager group         → all tasks
//   Project Manager               → own + tasks of users on their assigned project(s)
//   Material planning / Coordinator → only own tasks

// R30.23 — team task visibility now respects hierarchy.
// Each role sees own tasks + tasks of users STRICTLY junior (rank > my rank).
// Manager-rank users cannot see VP tasks, PgM cannot see Manager tasks, etc.
function tasksVisibleToRole(allTasks, currentUser) {
  if (!currentUser) return [];
  const role = currentUser.role;
  if (role === 'VP') return [];

  const RANK = (typeof window !== 'undefined' && window.HIERARCHY_RANK) || {};
  const myRank = RANK[role];

  // Special case kept from R5: Project Manager → own + same-project tasks
  if (role === 'Project Manager') {
    const myProjects = currentUser.projectIds || (currentUser.projectId ? [currentUser.projectId] : []);
    return allTasks.filter(t => {
      if (t.assigneeId === currentUser.id) return true;
      // Plus tasks of users below me in hierarchy (Coord/Material)
      const assigneeRole = (typeof window !== 'undefined' && window.PEOPLE)
        ? (window.PEOPLE.find(u => u.id === t.assigneeId) || {}).role : null;
      if (assigneeRole && RANK[assigneeRole] > myRank) {
        return myProjects.indexOf(t.projectId) !== -1;
      }
      return false;
    });
  }

  // Material planning / Coordinator (no juniors) → only own tasks
  if (role === 'Material planning' || role === 'Coordinator') {
    return allTasks.filter(t => t.assigneeId === currentUser.id);
  }

  // Manager / Operations Manager / Program Manager / Admin → own + tasks of
  // anyone strictly junior. NO LONGER returns the whole org's task list.
  if (myRank === undefined) {
    return allTasks.filter(t => t.assigneeId === currentUser.id);
  }
  const peopleById = (typeof window !== 'undefined' && window.PEOPLE)
    ? Object.fromEntries(window.PEOPLE.map(u => [u.id, u])) : {};
  return allTasks.filter(t => {
    if (t.assigneeId === currentUser.id) return true;
    const assignee = peopleById[t.assigneeId];
    if (!assignee) return false;
    const aRank = RANK[assignee.role];
    return aRank !== undefined && aRank > myRank;
  });
}

function PageMyTasks({ currentUser, onAddTask, onOpenTask, onJump }) {
  const { tasks, projects } = useStore();
  const visible = React.useMemo(() => tasksVisibleToRole(tasks, currentUser), [tasks, currentUser]);

  const role = currentUser.role;
  const isManager = role === 'Manager' || role === 'Operations Manager'
                 || role === 'Program Manager' || role === 'Project Manager'
                 || role === 'Admin';

  // For managers, "mine" = assigned to me; "team" = the rest of visible scope
  // For ICs, only "mine" makes sense (and equals visible).
  const [filter, setFilter] = React.useState(isManager ? 'team' : 'mine');
  const [statusFilter, setStatusFilter] = React.useState('open');

  const filtered = visible.filter(t => {
    if (filter === 'mine' && t.assigneeId !== currentUser.id) return false;
    if (filter === 'team' && t.assigneeId === currentUser.id) return false;
    if (statusFilter === 'open'    && t.status === 'Done') return false;
    if (statusFilter === 'overdue' && (!isOverdue(t.due) || t.status === 'Done')) return false;
    if (statusFilter === 'done'    && t.status !== 'Done') return false;
    return true;
  });

  const myCount   = visible.filter(t => t.assigneeId === currentUser.id).length;
  const myOverdue = visible.filter(t => t.assigneeId === currentUser.id && isOverdue(t.due) && t.status !== 'Done').length;
  const teamCount = visible.filter(t => t.assigneeId !== currentUser.id).length;

  // Build tab options based on role
  const tabOptions = isManager ? ['mine', 'team', 'all'] : ['mine'];

  // Scope label for the user
  const scopeLabel = (() => {
    if (role === 'Admin' || role === 'Manager') return 'All tasks of every team under you';
    if (role === 'Operations Manager') return 'All tasks under your operations';
    if (role === 'Program Manager') return 'All tasks across your programs (PM/Coord/Material level)';
    if (role === 'Project Manager') return 'My tasks + team tasks on my assigned project(s)';
    if (role === 'VP')              return 'Tasks not visible to VP — use Escalations queue';
    return 'Tasks assigned to me';
  })();

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <div className="text-xs text-ink-500 uppercase tracking-[0.18em]">My queue</div>
          <h1 className="text-2xl font-semibold">Tasks for {currentUser.name}</h1>
          <div className="text-[11px] text-ink-500 mt-0.5">{scopeLabel}</div>
        </div>
        <Button variant="accent" icon="plus" onClick={() => onAddTask({})}>New task</Button>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <Card padding="p-4"><div className="text-[11px] uppercase tracking-wider text-ink-500">Assigned to me</div><div className="text-3xl font-bold num mt-1">{myCount}</div></Card>
        <Card padding="p-4"><div className="text-[11px] uppercase tracking-wider text-ink-500">My overdue</div><div className="text-3xl font-bold num mt-1 text-red-600">{myOverdue}</div></Card>
        {isManager
          ? <Card padding="p-4"><div className="text-[11px] uppercase tracking-wider text-ink-500">Team tasks</div><div className="text-3xl font-bold num mt-1">{teamCount}</div></Card>
          : <Card padding="p-4"><div className="text-[11px] uppercase tracking-wider text-ink-500">In progress</div><div className="text-3xl font-bold num mt-1">{visible.filter(t => t.assigneeId === currentUser.id && t.status === 'In Progress').length}</div></Card>}
        <Card padding="p-4"><div className="text-[11px] uppercase tracking-wider text-ink-500">Completed</div><div className="text-3xl font-bold num mt-1 text-emerald-600">{visible.filter(t => t.assigneeId === currentUser.id && t.status === 'Done').length}</div></Card>
      </div>

      {(role === 'Manager' || role === 'Admin' || role === 'Operations Manager' || role === 'Program Manager') && (
        <TeamPerformanceWidget allTasks={visible} currentUser={currentUser} />
      )}

      <Card padding="p-3">
        <div className="flex gap-2 items-center flex-wrap">
          <Tabs tabs={tabOptions} active={filter} onChange={setFilter} />
          <div className="flex-1" />
          <Select value={statusFilter} onChange={setStatusFilter}
            options={[{ value: 'open', label: 'Open + In Progress' }, { value: 'overdue', label: 'Overdue' }, { value: 'done', label: 'Done' }, { value: 'all', label: 'All statuses' }]} />
        </div>
      </Card>

      <Card padding="p-0">
        <table className="w-full text-sm">
          <thead className="surface-2 border-b border-soft text-xs">
            <tr>
              <th className="text-left px-4 py-2 font-semibold">Title</th>
              <th className="text-left px-4 py-2 font-semibold">Assignee</th>
              <th className="text-left px-4 py-2 font-semibold">Project / school</th>
              <th className="text-left px-4 py-2 font-semibold">Priority</th>
              <th className="text-left px-4 py-2 font-semibold">Status</th>
              <th className="text-left px-4 py-2 font-semibold">Due</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(t => {
              const a = getPerson(t.assigneeId);
              const proj = getProject(t.projectId);
              const sch = t.schoolId ? ALL_SCHOOLS.find(s => s.id === t.schoolId) : null;
              const overdue = isOverdue(t.due) && t.status !== 'Done';
              return (
                <tr key={t.id} onClick={() => onOpenTask(t)} className="border-b border-soft hover-row cursor-pointer">
                  <td className="px-4 py-2.5 font-medium">{t.title}</td>
                  <td className="px-4 py-2.5"><span className="flex items-center gap-1.5"><Avatar initials={a?.initials} size={20} />{a?.name}</span></td>
                  <td className="px-4 py-2.5 text-xs">
                    <div className="font-medium">{proj?.name}</div>
                    {sch && <div className="text-ink-500">{sch.code} · {sch.name.slice(0, 30)}</div>}
                  </td>
                  <td className="px-4 py-2.5"><Pill tone={t.priority === 'High' ? 'danger' : t.priority === 'Medium' ? 'warn' : 'soft'}>{t.priority}</Pill></td>
                  <td className="px-4 py-2.5"><Pill tone={t.status === 'Done' ? 'ok' : t.status === 'In Progress' ? 'info' : 'soft'}>{t.status}</Pill></td>
                  <td className={cls('px-4 py-2.5', overdue ? 'text-red-600 font-semibold' : '')}>{fmtDate(t.due)}{overdue && ' ⚠'}</td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan="6" className="text-center py-8 text-xs text-ink-500 italic">No tasks match these filters.</td></tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}


// R30.24 — Manager / Admin / Ops / PgM-only widget: per-employee task analytics
// Shows for each direct/indirect subordinate:
//   - Total / Done / In Progress / Overdue counts
//   - Completion %
//   - Avg age of OPEN tasks (how long they have been sitting on the employee plate)
//   - Avg cycle time of DONE tasks (createdAt -> done)
function TeamPerformanceWidget({ allTasks, currentUser }) {
  const peopleById = (typeof window !== 'undefined' && window.PEOPLE)
    ? Object.fromEntries(window.PEOPLE.map(u => [u.id, u])) : {};
  const RANK = (typeof window !== 'undefined' && window.HIERARCHY_RANK) || {};
  const myRank = RANK[currentUser.role];
  if (myRank === undefined) return null;

  const now = Date.now();
  const daysSince = (iso) => {
    if (!iso) return null;
    const t = new Date(iso).getTime();
    if (isNaN(t)) return null;
    return Math.max(0, Math.round((now - t) / (1000 * 60 * 60 * 24)));
  };

  const stats = {};
  for (const t of allTasks) {
    if (!t.assigneeId || t.assigneeId === currentUser.id) continue;
    const p = peopleById[t.assigneeId];
    if (!p) continue;
    const aRank = RANK[p.role];
    if (aRank === undefined || aRank <= myRank) continue;
    if (!stats[t.assigneeId]) {
      stats[t.assigneeId] = { id: t.assigneeId, name: p.name, role: p.role, initials: p.initials,
        total: 0, done: 0, inProgress: 0, todo: 0, blocked: 0, overdue: 0,
        openAges: [], cycleTimes: [] };
    }
    const r = stats[t.assigneeId];
    r.total += 1;
    const created = t.createdAt || t.created_at;
    if (t.status === 'Done') {
      r.done += 1;
      const completed = t.completedAt || t.updatedAt || t.updated_at;
      if (created && completed) {
        const ageAtCreate = daysSince(created);
        const ageAtDone   = daysSince(completed);
        if (ageAtCreate !== null && ageAtDone !== null) {
          const cycle = ageAtCreate - ageAtDone;
          if (cycle >= 0) r.cycleTimes.push(cycle);
        }
      }
    } else {
      if (t.status === 'In Progress') r.inProgress += 1;
      else if (t.status === 'Blocked') r.blocked += 1;
      else r.todo += 1;
      const age = daysSince(created);
      if (age !== null) r.openAges.push(age);
    }
    if (typeof isOverdue === 'function' && isOverdue(t.due) && t.status !== 'Done') r.overdue += 1;
  }

  const avg = (arr) => arr.length ? Math.round(arr.reduce((s,n)=>s+n,0) / arr.length) : null;
  const rows = Object.values(stats).map(r => ({
    ...r,
    completionPct: r.total > 0 ? Math.round((r.done / r.total) * 100) : 0,
    avgOpenAge: avg(r.openAges),
    avgCycle:   avg(r.cycleTimes),
  })).sort((a, b) => b.completionPct - a.completionPct);

  if (rows.length === 0) {
    return (
      <Card padding="p-4">
        <div className="flex items-center gap-2 mb-1">
          <Icon name="bar-chart-3" size={14} />
          <h3 className="text-sm font-semibold">Team performance</h3>
          <span className="text-[10px] text-ink-500">— Manager / Admin view</span>
        </div>
        <p className="text-xs text-ink-500 italic">No subordinate tasks visible yet.</p>
      </Card>
    );
  }

  const totalAll      = rows.reduce((s, r) => s + r.total, 0);
  const totalDone     = rows.reduce((s, r) => s + r.done, 0);
  const totalOverdue  = rows.reduce((s, r) => s + r.overdue, 0);
  const orgCompletion = totalAll > 0 ? Math.round((totalDone / totalAll) * 100) : 0;
  const orgAvgOpen    = avg(rows.flatMap(r => r.openAges));
  const orgAvgCycle   = avg(rows.flatMap(r => r.cycleTimes));

  return (
    <Card padding="p-0">
      <div className="px-4 py-3 border-b border-soft flex items-center gap-3 flex-wrap">
        <Icon name="bar-chart-3" size={16} />
        <h3 className="text-sm font-semibold">Team performance</h3>
        <span className="text-[10px] text-ink-500">— per-employee completion + cycle time</span>
        <div className="flex-1" />
        <div className="flex items-center gap-4 text-xs">
          <div><span className="text-ink-500">People: </span><strong>{rows.length}</strong></div>
          <div><span className="text-ink-500">Tasks: </span><strong>{totalAll}</strong></div>
          <div><span className="text-ink-500">Completion: </span><strong className="text-emerald-700">{orgCompletion}%</strong></div>
          {orgAvgOpen !== null && <div><span className="text-ink-500">Avg open age: </span><strong>{orgAvgOpen}d</strong></div>}
          {orgAvgCycle !== null && <div><span className="text-ink-500">Avg cycle: </span><strong>{orgAvgCycle}d</strong></div>}
          {totalOverdue > 0 && <div className="text-red-700"><strong>{totalOverdue}</strong> overdue</div>}
        </div>
      </div>
      <table className="w-full text-sm">
        <thead className="surface-2 border-b border-soft text-xs">
          <tr>
            <th className="text-left px-4 py-2 font-semibold">Employee</th>
            <th className="text-left px-4 py-2 font-semibold">Role</th>
            <th className="text-right px-3 py-2 font-semibold">Total</th>
            <th className="text-right px-3 py-2 font-semibold">Done</th>
            <th className="text-right px-3 py-2 font-semibold">In Progress</th>
            <th className="text-right px-3 py-2 font-semibold">Overdue</th>
            <th className="text-right px-3 py-2 font-semibold" title="Average days an OPEN task has been sitting with this employee without completion">Avg open age</th>
            <th className="text-right px-3 py-2 font-semibold" title="Average days from creation to Done for completed tasks">Avg cycle</th>
            <th className="text-left px-4 py-2 font-semibold w-[22%]">Completion</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => {
            const tone = r.completionPct >= 80 ? 'bg-emerald-500'
                       : r.completionPct >= 50 ? 'bg-amber-500'
                       : r.completionPct >= 25 ? 'bg-orange-500'
                       : 'bg-red-500';
            const ageTone = r.avgOpenAge === null ? 'text-ink-400'
                          : r.avgOpenAge > 14 ? 'text-red-700 font-semibold'
                          : r.avgOpenAge > 7 ? 'text-amber-700'
                          : 'text-ink-700';
            return (
              <tr key={r.id} className="border-b border-soft hover-row">
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <Avatar initials={r.initials} size={22} />
                    <span className="font-medium">{r.name}</span>
                  </div>
                </td>
                <td className="px-4 py-2.5 text-xs text-ink-700">{r.role}</td>
                <td className="px-3 py-2.5 text-right num">{r.total}</td>
                <td className="px-3 py-2.5 text-right num text-emerald-700">{r.done}</td>
                <td className="px-3 py-2.5 text-right num">{r.inProgress}</td>
                <td className={`px-3 py-2.5 text-right num ${r.overdue > 0 ? 'text-red-700 font-semibold' : 'text-ink-400'}`}>{r.overdue}</td>
                <td className={`px-3 py-2.5 text-right num ${ageTone}`}>{r.avgOpenAge === null ? '—' : r.avgOpenAge + 'd'}</td>
                <td className="px-3 py-2.5 text-right num text-ink-700">{r.avgCycle === null ? '—' : r.avgCycle + 'd'}</td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-ink-100 rounded-full overflow-hidden">
                      <div className={`h-full ${tone}`} style={{ width: `${r.completionPct}%` }} />
                    </div>
                    <span className="text-xs font-semibold num w-9 text-right">{r.completionPct}%</span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Card>
  );
}

Object.assign(window, { PageMyTasks, tasksVisibleToRole, TeamPerformanceWidget });
