import React from 'react';
// Task creation modal & side panel

function TaskModal({ open, onClose, projects, schools, defaults = {}, onCreate }) {
  const [title, setTitle] = React.useState(defaults.title || '');
  const [description, setDescription] = React.useState('');
  const [assigneeId, setAssigneeId] = React.useState(defaults.assigneeId || 'u8');
  const [projectId, setProjectId] = React.useState(defaults.projectId || (projects[0]?.id));
  const [schoolId, setSchoolId] = React.useState(defaults.schoolId || '');
  const [stageIndex, setStageIndex] = React.useState(defaults.stageIndex == null ? '' : String(defaults.stageIndex));
  const [due, setDue] = React.useState(defaults.due || '2026-05-15');
  const [priority, setPriority] = React.useState('Medium');

  React.useEffect(() => {
    if (open) {
      setTitle(defaults.title || '');
      setDescription('');
      setAssigneeId(defaults.assigneeId || 'u8');
      setProjectId(defaults.projectId || (projects[0]?.id));
      setSchoolId(defaults.schoolId || '');
      setStageIndex(defaults.stageIndex == null ? '' : String(defaults.stageIndex));
      setDue(defaults.due || '2026-05-15');
      setPriority('Medium');
    }
  }, [open]);

  if (!open) return null;
  const projSchools = schools.filter(s => s.projectId === projectId).slice(0, 50);

  const submit = () => {
    if (!title.trim()) return;
    onCreate({
      title, description, assigneeId, projectId,
      schoolId: schoolId || null,
      stageIndex: stageIndex === '' ? null : Number(stageIndex),
      due, priority,
    });
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Create new task" wide
      footer={<>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="accent" icon="check" onClick={submit}>Create task</Button>
      </>}>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="text-[11px] font-medium text-ink-700 mb-1 block">Title</label>
          <TextField value={title} onChange={setTitle} placeholder="e.g. Submit SEC approval package" />
        </div>
        <div className="col-span-2">
          <label className="text-[11px] font-medium text-ink-700 mb-1 block">Description</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
            className="w-full px-2.5 py-1.5 text-sm rounded-md border border-ink-200 bg-white focus:outline-none focus:ring-2 ring-accent" />
        </div>
        <div>
          <label className="text-[11px] font-medium text-ink-700 mb-1 block">Assignee</label>
          <Select value={assigneeId} onChange={setAssigneeId}
            options={PEOPLE.map(p => ({ value: p.id, label: `${p.name} · ${p.role}` }))} className="w-full" />
        </div>
        <div>
          <label className="text-[11px] font-medium text-ink-700 mb-1 block">Priority</label>
          <Select value={priority} onChange={setPriority} options={['High', 'Medium', 'Low']} className="w-full" />
        </div>
        <div>
          <label className="text-[11px] font-medium text-ink-700 mb-1 block">Project</label>
          <Select value={projectId} onChange={setProjectId}
            options={projects.map(p => ({ value: p.id, label: p.name }))} className="w-full" />
        </div>
        <div>
          <label className="text-[11px] font-medium text-ink-700 mb-1 block">Due date</label>
          <input type="date" value={due} onChange={e => setDue(e.target.value)}
            className="w-full px-2.5 py-1.5 text-sm rounded-md border border-ink-200 bg-white focus:outline-none focus:ring-2 ring-accent" />
        </div>
        <div>
          <label className="text-[11px] font-medium text-ink-700 mb-1 block">Linked school (optional)</label>
          <Select value={schoolId} onChange={setSchoolId}
            options={[{ value: '', label: '— None —' }, ...projSchools.map(s => ({ value: s.id, label: `${s.code} · ${s.name.slice(0, 40)}` }))]} className="w-full" />
        </div>
        <div>
          <label className="text-[11px] font-medium text-ink-700 mb-1 block">Linked stage (optional)</label>
          <Select value={stageIndex} onChange={setStageIndex}
            options={[{ value: '', label: '— None —' }, ...SCHOOL_STAGES.map((s, i) => ({ value: String(i), label: `${i + 1}. ${s}` }))]} className="w-full" />
        </div>
      </div>
    </Modal>
  );
}

function TaskDetailPanel({ task, open, onClose, onSendMessage, onSendReminder, onMarkDone, currentUserId }) {
  const [msg, setMsg] = React.useState('');
  if (!task) return null;
  const assignee = getPerson(task.assigneeId);
  const project = getProject(task.projectId);
  const school = task.schoolId ? ALL_SCHOOLS.find(s => s.id === task.schoolId) : null;
  const overdue = isOverdue(task.due) && task.status !== 'Done';

  return (
    <SlideOver open={open} onClose={onClose} title="Task details" width="max-w-md">
      <div className="space-y-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Pill tone={task.priority === 'High' ? 'danger' : task.priority === 'Medium' ? 'warn' : 'soft'}>{task.priority}</Pill>
            <Pill tone={task.status === 'Done' ? 'ok' : task.status === 'In Progress' ? 'info' : 'soft'}>{task.status}</Pill>
            {overdue && <Pill tone="danger">Overdue</Pill>}
          </div>
          <h2 className="text-base font-semibold">{task.title}</h2>
          <p className="text-xs text-ink-500 mt-1">{task.description}</p>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="surface-2 p-2.5 rounded-md border border-soft">
            <div className="text-[10px] text-ink-500 uppercase tracking-wider">Assignee</div>
            <div className="flex items-center gap-1.5 mt-1">
              <Avatar initials={assignee?.initials} size={20} />
              <span className="font-medium">{assignee?.name}</span>
            </div>
          </div>
          <div className="surface-2 p-2.5 rounded-md border border-soft">
            <div className="text-[10px] text-ink-500 uppercase tracking-wider">Due</div>
            <div className={cls('mt-1 font-medium', overdue ? 'text-red-600' : '')}>{fmtDate(task.due)}</div>
          </div>
          <div className="surface-2 p-2.5 rounded-md border border-soft col-span-2">
            <div className="text-[10px] text-ink-500 uppercase tracking-wider">Linked</div>
            <div className="mt-1 space-y-0.5">
              <div><span className="text-ink-500">Project:</span> {project?.name}</div>
              {school && <div><span className="text-ink-500">School:</span> {school.code} · {school.name}</div>}
              {task.stageIndex != null && <div><span className="text-ink-500">Stage:</span> {task.stageIndex + 1}. {SCHOOL_STAGES[task.stageIndex]}</div>}
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="accent" icon="mail" size="sm" onClick={() => onSendMessage(task.id)}>Send message</Button>
          <Button variant="outline" icon="bell" size="sm" onClick={() => onSendReminder(task.id)}>Send reminder</Button>
          {task.status !== 'Done' && <Button variant="ghost" icon="check" size="sm" onClick={() => onMarkDone(task.id)}>Mark done</Button>}
        </div>

        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-500 mb-2">Activity</div>
          <div className="space-y-2">
            {task.messages.length === 0 && (
              <div className="text-xs text-ink-500 italic">No messages yet — use Send message above.</div>
            )}
            {task.messages.map(m => {
              const u = getPerson(m.userId);
              return (
                <div key={m.id} className="flex gap-2 text-xs">
                  <Avatar initials={u?.initials || '??'} size={22} />
                  <div className="flex-1">
                    <div className="font-medium">{u?.name}</div>
                    <div className="text-ink-700">{m.text}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </SlideOver>
  );
}

Object.assign(window, { TaskModal, TaskDetailPanel });
