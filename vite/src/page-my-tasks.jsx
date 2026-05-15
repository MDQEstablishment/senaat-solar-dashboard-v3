import React from 'react';
// My Tasks queue — Zamil Round 5 visibility scope
//   VP                            → no tasks (uses escalations queue)
//   Program Manager group         → all tasks
//   Project Manager               → own + tasks of users on their assigned project(s)
//   Material planning / Coordinator → only own tasks

function tasksVisibleToRole(allTasks, currentUser) {
  if (!currentUser) return [];
  const role = currentUser.role;
  if (role === 'VP') return [];

  if (typeof PROGRAM_MANAGER_GROUP !== 'undefined' && PROGRAM_MANAGER_GROUP.indexOf(role) !== -1) {
    return allTasks; // Program Manager group sees everything
  }

  if (role === 'Project Manager') {
    const myProjects = currentUser.projectIds || (currentUser.projectId ? [currentUser.projectId] : []);
    return allTasks.filter(t => {
      if (t.assigneeId === currentUser.id) return true;
      return myProjects.indexOf(t.projectId) !== -1;
    });
  }

  // Material planning / Coordinator / others — only own tasks
  return allTasks.filter(t => t.assigneeId === currentUser.id);
}

function PageMyTasks({ currentUser, onAddTask, onOpenTask, onJump }) {
  const { tasks, projects } = useStore();
  const visible = React.useMemo(() => tasksVisibleToRole(tasks, currentUser), [tasks, currentUser]);

  const role = currentUser.role;
  const isManager = role === 'Project Manager' || role === 'Program Manager';

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
    if (role === 'Program Manager') return 'All tasks across all projects';
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

Object.assign(window, { PageMyTasks, tasksVisibleToRole });
