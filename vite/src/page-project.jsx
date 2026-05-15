import React from 'react';
// Page 2 — Project Detail (Round 6)
// FIX 1: Lifecycle is editable from project detail (rename / reorder / color / add / delete with confirm).
// FIX 6: Robust tab rendering — null-guarded for projects with many schools and tabs that previously crashed.

// Round 10: single-click toggle (Done ⇄ Not Started). Blocked stages render in red and don't toggle.
function ProjectLifecycle({ stages, stageState, onToggle }) {
  return (
    <div className="overflow-x-auto scrollbar-thin">
      <div className="flex items-center gap-0 min-w-[1100px] py-4">
        {stages.map((s, i) => {
          const stateEntry = (stageState || []).find(x => x.stageId === s.id) || { status: 'not-started' };
          const done = stateEntry.status === 'done';
          const blocked = stateEntry.status === 'blocked';
          return (
            <React.Fragment key={s.id || s.name}>
              <button
                onClick={() => !blocked && onToggle(s.id)}
                title={blocked ? 'Blocked — clear block in stage management to toggle' : (done ? 'Click to mark Not Started' : 'Click to mark Done')}
                className="flex flex-col items-center text-center px-1 group"
                style={{ minWidth: 96 }}>
                <div className={cls('w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold border-2 transition group-hover:scale-110',
                  done    ? 'bg-navy-900 border-navy-900 text-white'           :
                  blocked ? 'bg-red-600  border-red-600  text-white'           :
                            'bg-white    border-navy-900 text-navy-900')}>
                  {done ? <Icon name="check" size={14} strokeWidth={3} />
                        : blocked ? <Icon name="x" size={14} strokeWidth={3} />
                        : <span>{i + 1}</span>}
                </div>
                <div className={cls('mt-1.5 text-[10px] leading-tight w-24',
                  done ? 'text-navy-900 font-medium' :
                  blocked ? 'text-red-700 font-semibold' :
                  'text-ink-500')}>
                  {s.name}
                </div>
                {stateEntry.date && done && (
                  <div className="text-[9px] text-ink-400 tnum">{stateEntry.date}</div>
                )}
                {blocked && <div className="text-[9px] text-red-600 font-semibold">Blocked</div>}
              </button>
              {i < stages.length - 1 && (
                <div className={cls('h-0.5 flex-1 -mt-7',
                  done    ? 'bg-navy-900' :
                  blocked ? 'bg-red-300'  :
                  'bg-ink-200')} style={{ minWidth: 24 }} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

function LifecycleEditor({ stages, addStage, updateStage, deleteStage, reorderStage, onClose }) {
  const [editId, setEditId] = React.useState(null);
  const [addOpen, setAddOpen] = React.useState(false);
  const [confirmDel, setConfirmDel] = React.useState(null);
  const sorted = [...(stages || [])].sort((a, b) => a.order - b.order);

  return (
    <Card padding="p-4" className="border-accent">
      <div className="flex items-center justify-between mb-2">
        <SectionTitle title="Edit Project Execution Lifecycle" subtitle="Changes apply across all projects" className="!mb-0" />
        <div className="flex gap-2">
          <Button size="sm" icon="plus" variant="accent" onClick={() => setAddOpen(true)}>Add Stage</Button>
          <Button size="sm" variant="ghost" icon="x" onClick={onClose}>Close editor</Button>
        </div>
      </div>
      <div className="text-[11px] text-ink-500 bg-amber-50 border border-amber-200 rounded-md p-2.5 mb-2">
        ↕ Use arrows to reorder. Edit name, color, and completion criteria. Deleting removes the stage permanently (with confirmation).
      </div>
      <div className="space-y-1">
        {sorted.map((s, i) => (
          editId === s.id
            ? <LifecycleStageRow key={s.id} stage={s} onSave={p => { updateStage(s.id, p); setEditId(null); }} onCancel={() => setEditId(null)} />
            : (
              <div key={s.id} className="flex items-center gap-2 border border-soft rounded-md p-2.5">
                <div className="flex flex-col gap-0.5">
                  <button onClick={() => reorderStage(s.id, -1)} disabled={i === 0} className="p-0.5 hover:bg-ink-100 rounded disabled:opacity-30"><Icon name="chevron-up" size={12} /></button>
                  <button onClick={() => reorderStage(s.id, 1)} disabled={i === sorted.length - 1} className="p-0.5 hover:bg-ink-100 rounded disabled:opacity-30"><Icon name="chevron-down" size={12} /></button>
                </div>
                <div className="w-3 h-3 rounded-full shrink-0" style={{ background: s.color }} />
                <span className="text-xs text-ink-500 tnum w-6">{i + 1}</span>
                <span className="text-sm flex-1 font-medium">{s.name}</span>
                {s.criteria && <span className="text-[11px] text-ink-500 truncate max-w-[200px] hidden lg:block">{s.criteria}</span>}
                <div className="flex gap-1">
                  <button onClick={() => setEditId(s.id)} className="p-1 rounded hover:bg-ink-100 text-ink-500" title="Edit"><Icon name="pencil" size={13} /></button>
                  <button onClick={() => setConfirmDel(s)} className="p-1 rounded hover:bg-ink-100 text-ink-500 hover:text-red-600" title="Delete"><Icon name="trash-2" size={13} /></button>
                </div>
              </div>
            )
        ))}
      </div>
      {addOpen && (
        <LifecycleStageRow stage={{ name: '', color: '#13315C', criteria: '' }}
          onSave={p => { addStage(p); setAddOpen(false); }}
          onCancel={() => setAddOpen(false)} isNew />
      )}
      <Modal open={!!confirmDel} onClose={() => setConfirmDel(null)} title="Delete lifecycle stage"
        footer={<>
          <Button variant="ghost" onClick={() => setConfirmDel(null)}>Cancel</Button>
          <Button variant="danger" icon="trash-2" onClick={() => { deleteStage(confirmDel.id); setConfirmDel(null); }}>Delete permanently</Button>
        </>}>
        <p className="text-sm">Permanently delete the lifecycle stage <strong>"{confirmDel?.name}"</strong>?</p>
        <p className="text-xs text-red-600 mt-2">This cannot be undone. All projects using this stage will lose it.</p>
      </Modal>
    </Card>
  );
}

function LifecycleStageRow({ stage, onSave, onCancel, isNew }) {
  const [name, setName] = React.useState(stage.name);
  const [color, setColor] = React.useState(stage.color || '#13315C');
  const [criteria, setCriteria] = React.useState(stage.criteria || '');
  return (
    <div className="border border-accent rounded-md p-3 space-y-2 bg-accent-soft">
      <div className="grid grid-cols-3 gap-2">
        <div className="col-span-2">
          <label className="text-[11px] font-medium text-ink-700 mb-1 block">Stage name</label>
          <TextField value={name} onChange={setName} placeholder="Stage name" />
        </div>
        <div>
          <label className="text-[11px] font-medium text-ink-700 mb-1 block">Color</label>
          <input type="color" value={color} onChange={e => setColor(e.target.value)} className="w-full h-9 border border-ink-200 rounded-md cursor-pointer" />
        </div>
      </div>
      <div>
        <label className="text-[11px] font-medium text-ink-700 mb-1 block">Completion criteria</label>
        <TextField value={criteria} onChange={setCriteria} placeholder="e.g. Approval document signed and uploaded" />
      </div>
      <div className="flex gap-2 justify-end">
        <Button size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button size="sm" variant="accent" icon="check" onClick={() => { if (name.trim()) onSave({ name, color, criteria }); }}>
          {isNew ? 'Add stage' : 'Save'}
        </Button>
      </div>
    </div>
  );
}

function StageDetailPanel({ stage, stageIdx, project, onClose }) {
  if (!stage) return null;
  const subs = stage.sub || stage.criteria ? (stage.sub || [stage.criteria]) : ['—'];
  return (
    <SlideOver open={!!stage} onClose={onClose} title={`Stage ${stageIdx + 1}: ${stage.name}`} width="max-w-xl">
      <div className="space-y-4">
        <div className="surface-2 rounded-md p-3 border border-soft">
          <div className="text-[11px] text-ink-500">Project</div>
          <div className="text-sm font-semibold">{project.name}</div>
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-wider text-ink-500 mb-2">Stage detail</div>
          <div className="text-xs text-ink-700">{stage.criteria || 'No completion criteria set.'}</div>
        </div>
      </div>
    </SlideOver>
  );
}

function PageProject({ project, onBack, onOpenSchools, onAddTask, onOpenTask, onEscalate, currentUser }) {
  if (!project) return <div className="p-6 text-sm text-ink-500">Project not found.</div>;

  const [openStage, setOpenStage] = React.useState(null);
  const [tab, setTab] = React.useState('Overview');
  const [lifecycleEditOpen, setLifecycleEditOpen] = React.useState(false);
  const store = (typeof useStore === 'function') ? useStore() : null;
  const {
    lifecycleStages, addLifecycleStage, updateLifecycleStage, deleteLifecycleStage, reorderLifecycleStage,
    projectLifecycleState, toggleProjectLifecycleStage,
    tasks: allTasks, schools: allSchools,
  } = store || {};

  const sortedLifecycle = React.useMemo(
    () => [...(lifecycleStages || [])].sort((a, b) => a.order - b.order),
    [lifecycleStages]
  );

  const projStageState = (projectLifecycleState && projectLifecycleState[project.id]) || [];
  // Round 10: Overall progress = lifecycle Done count / total × 100
  const lifecycleProgress = sortedLifecycle.length
    ? Math.round(projStageState.filter(x => x.status === 'done').length / sortedLifecycle.length * 100)
    : 0;

  // FIX 6: Tasks scoped (avoid huge unfiltered iteration)
  const allProjTasks = (allTasks || []).filter(t => t.projectId === project.id);
  const projTasks = (currentUser && typeof tasksVisibleToRole === 'function')
    ? tasksVisibleToRole(allProjTasks, currentUser)
    : allProjTasks;

  // FIX 6: school count for Schools tab summary
  const projSchoolCount = (allSchools || ALL_SCHOOLS).filter(s => s.projectId === project.id).length;

  const pm = PEOPLE.find(u => u.id === project.pmId) || PEOPLE[0];

  // Tabs visible to current user
  const TABS = React.useMemo(() => {
    const t = ['Overview', 'Schools', 'Tasks'];
    if (canViewFinancials(currentUser)) t.push('Financials');
    t.push('Contractors');
    return t;
  }, [currentUser]);

  const canEditLifecycle = currentUser && PROGRAM_MANAGER_GROUP.indexOf(currentUser.role) !== -1;

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="text-xs text-ink-500 hover:text-ink-900 inline-flex items-center gap-1">
          <Icon name="arrow-left" size={12} /> Back
        </button>
        <div className="flex gap-2">
          <Button variant="outline" icon="school" onClick={() => onOpenSchools && onOpenSchools(project.id)}>View all {projSchoolCount} schools</Button>
          {onEscalate && (() => {
            const t = (currentUser && typeof getEscalationTarget === 'function') ? getEscalationTarget(currentUser, project.id) : null;
            return t ? <Button variant="outline" icon="alert-circle" onClick={onEscalate}>{t.label}</Button> : null;
          })()}
          <Button variant="accent" icon="plus" onClick={() => onAddTask && onAddTask({ projectId: project.id })}>Add task</Button>
        </div>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-ink-500">
            <Icon name="map-pin" size={11} /> {project.region} · {project.city}
            <Pill tone="soft">{project.type}</Pill>
          </div>
          <h1 className="text-2xl font-bold mt-1">{project.name}</h1>
          <div className="flex items-center gap-3 mt-2">
            <StatusPill status={project.status} />
            <span className="text-xs text-ink-500">PM: <span className="font-semibold">{pm.name}</span></span>
            <span className="text-xs text-ink-500">{projSchoolCount} schools</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[11px] text-ink-500">Overall progress</div>
          <div className="text-3xl font-bold tnum text-navy-900">{lifecycleProgress}%</div>
        </div>
      </div>

      {/* Lifecycle */}
      <Card>
        <SectionTitle icon="git-branch" title="Project Execution Lifecycle"
          subtitle="Click any stage to inspect detail. Editable per spec."
          action={canEditLifecycle && (
            <Button size="sm" variant={lifecycleEditOpen ? 'accent' : 'outline'} icon="pencil"
              onClick={() => setLifecycleEditOpen(o => !o)}>
              {lifecycleEditOpen ? 'Done' : 'Edit lifecycle'}
            </Button>
          )} />
        <ProjectLifecycle stages={sortedLifecycle.length ? sortedLifecycle : PROJECT_STAGES.map((s, i) => ({ id: 'ls' + (i + 1), name: s.name, color: '#13315C', order: i, criteria: '' }))}
          stageState={projStageState}
          onToggle={(stageId) => toggleProjectLifecycleStage && toggleProjectLifecycleStage(project.id, stageId, currentUser)} />
      </Card>

      {lifecycleEditOpen && canEditLifecycle && (
        <LifecycleEditor stages={sortedLifecycle}
          addStage={addLifecycleStage} updateStage={updateLifecycleStage}
          deleteStage={deleteLifecycleStage} reorderStage={reorderLifecycleStage}
          onClose={() => setLifecycleEditOpen(false)} />
      )}

      {/* School stage distribution */}
      {project.schoolDist && (
        <Card>
          <SectionTitle icon="school" title={`School Execution Stages — ${projSchoolCount} schools`} />
          <div className="grid grid-cols-13 gap-1.5" style={{ gridTemplateColumns: 'repeat(13, minmax(0, 1fr))' }}>
            {SCHOOL_STAGES.map((s, i) => {
              const c = project.schoolDist[i] || 0;
              const max = Math.max(...project.schoolDist, 1);
              return (
                <div key={s} className="border border-soft rounded-md p-2">
                  <div className="flex items-end h-10 mb-1">
                    <div className="w-full rounded-t-sm" style={{
                      height: 12 + (c / max) * 34,
                      background: i < 3 ? '#13315C' : i < 11 ? '#2A5A9A' : '#B8860B',
                      opacity: c === 0 ? 0.25 : 1,
                    }} />
                  </div>
                  <div className="text-[9px] text-ink-500 leading-tight">{i + 1}. {s}</div>
                  <div className="text-[13px] font-bold tnum">{c}</div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Tabs */}
      <Card padding="p-0">
        <div className="px-5 pt-3"><Tabs tabs={TABS} active={tab} onChange={setTab} /></div>
        <div className="p-5 text-sm">
          {tab === 'Overview' && (
            <div className="space-y-3">
              <p className="text-ink-700 text-sm">
                {project.name} covers solar PV installation across {projSchoolCount} school sites in the {project.region} region.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[['Start', project.start], ['Target', project.target], ['Region', project.region], ['City', project.city]].map(([l,v]) => (
                  <div key={l}>
                    <div className="text-[10px] uppercase text-ink-500 tracking-wider">{l}</div>
                    <div className="text-sm font-semibold tnum">{v || '—'}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {tab === 'Schools' && (
            <div>
              <p className="text-xs text-ink-500 mb-3">{projSchoolCount} schools in this program.</p>
              <Button variant="accent" icon="school" onClick={() => onOpenSchools && onOpenSchools(project.id)}>Open full schools list</Button>
            </div>
          )}
          {tab === 'Tasks' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs text-ink-500">{projTasks.length} task{projTasks.length === 1 ? '' : 's'} visible to you on this project</div>
                <Button size="sm" variant="accent" icon="plus" onClick={() => onAddTask && onAddTask({ projectId: project.id })}>Add task</Button>
              </div>
              <div className="space-y-1.5">
                {projTasks.slice(0, 30).map(t => {
                  const a = getPerson(t.assigneeId);
                  const overdue = isOverdue(t.due) && t.status !== 'Done';
                  return (
                    <div key={t.id} onClick={() => onOpenTask && onOpenTask(t)}
                      className="flex items-center gap-2 p-2 rounded-md surface-2 border border-soft hover:border-accent cursor-pointer text-xs">
                      <Pill tone={t.priority === 'High' ? 'danger' : t.priority === 'Medium' ? 'warn' : 'soft'}>{t.priority}</Pill>
                      <span className="flex-1 font-medium">{t.title}</span>
                      <Avatar initials={a?.initials || '??'} size={18} />
                      <span className={cls('text-[11px] w-20 text-right', overdue ? 'text-red-600 font-semibold' : 'text-ink-500')}>{fmtDate(t.due)}</span>
                    </div>
                  );
                })}
                {projTasks.length === 0 && <div className="text-xs text-ink-500 italic">No tasks visible to you on this project.</div>}
                {projTasks.length > 30 && <div className="text-[11px] text-ink-500 italic">+ {projTasks.length - 30} more — see My Tasks for full list.</div>}
              </div>
            </div>
          )}
          {tab === 'Financials' && canViewFinancials(currentUser) && (
            <div>
              <p className="text-xs text-ink-500 mb-2">Financials for this project. Use the full Financials page from the sidebar for cross-project rollups.</p>
              <ProjectFinancialsSnippet projectId={project.id} />
            </div>
          )}
          {tab === 'Contractors' && (
            <div>
              <div className="text-xs text-ink-500 mb-2">Contractors assigned to this project:</div>
              <div className="space-y-1.5">
                {CONTRACTORS.filter(c => c.projects && c.projects.includes(project.id)).map(c => (
                  <div key={c.id} className="flex items-center justify-between border border-soft rounded-md p-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-md bg-navy-900 text-white flex items-center justify-center text-[11px] font-bold">{c.name.split(' ').map(w => w[0]).slice(0,2).join('')}</div>
                      <div>
                        <div className="text-sm font-medium">{c.name}</div>
                        <div className="text-[11px] text-ink-500">{c.region} · {c.activeSites} active sites</div>
                      </div>
                    </div>
                    <ScoreBadge score={Math.round((c.schedule + c.quality + c.hse + c.docs) / 4)} />
                  </div>
                ))}
                {CONTRACTORS.filter(c => c.projects && c.projects.includes(project.id)).length === 0 && (
                  <div className="text-xs text-ink-500 italic">No contractors assigned to this project yet.</div>
                )}
              </div>
            </div>
          )}
        </div>
      </Card>

      <StageDetailPanel
        stage={openStage != null ? (sortedLifecycle[openStage] || { name: PROJECT_STAGES[openStage]?.name }) : null}
        stageIdx={openStage}
        project={project}
        onClose={() => setOpenStage(null)} />
    </div>
  );
}

function ProjectFinancialsSnippet({ projectId }) {
  const { financialEntries, finRollup } = useStore();
  const entries = (financialEntries || []).filter(e => e.projectId === projectId && !e.archived);
  const r = finRollup ? finRollup(e => e.projectId === projectId) : { receipts: 0, receivables: 0, payments: 0, payables: 0 };
  return (
    <div>
      <div className="grid grid-cols-4 gap-2 text-center mb-3">
        <div className="border border-soft rounded-md p-2"><div className="text-[10px] uppercase text-ink-500">Received</div><div className="text-base font-bold tnum text-emerald-600">SAR {SAR(r.receipts)}</div></div>
        <div className="border border-soft rounded-md p-2"><div className="text-[10px] uppercase text-ink-500">Receivable</div><div className="text-base font-bold tnum text-amber-600">SAR {SAR(r.receivables)}</div></div>
        <div className="border border-soft rounded-md p-2"><div className="text-[10px] uppercase text-ink-500">Paid out</div><div className="text-base font-bold tnum text-sky-700">SAR {SAR(r.payments)}</div></div>
        <div className="border border-soft rounded-md p-2"><div className="text-[10px] uppercase text-ink-500">Payable</div><div className="text-base font-bold tnum text-red-600">SAR {SAR(r.payables)}</div></div>
      </div>
      <div className="border border-soft rounded-md overflow-hidden">
        <table className="w-full text-xs">
          <thead className="surface-2 text-[10px] uppercase text-ink-500">
            <tr><th className="text-left px-3 py-2">Type</th><th className="text-left px-3 py-2">Milestone</th><th className="text-right px-3 py-2">Amount</th><th className="text-left px-3 py-2">Date</th></tr>
          </thead>
          <tbody>
            {entries.slice(0, 8).map(e => (
              <tr key={e.id} className="border-t border-soft">
                <td className="px-3 py-1.5"><Pill tone={e.type === 'Receipt' ? 'ok' : e.type === 'Receivable' ? 'warn' : e.type === 'Payment' ? 'info' : 'danger'}>{e.type}</Pill></td>
                <td className="px-3 py-1.5">{e.relatedMilestone || '—'}</td>
                <td className="px-3 py-1.5 text-right tnum">SAR {SARfull(e.amount)}</td>
                <td className="px-3 py-1.5 text-ink-500">{fmtDate(e.date)}</td>
              </tr>
            ))}
            {entries.length === 0 && <tr><td colSpan="4" className="text-center py-4 text-xs text-ink-500 italic">No entries.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

Object.assign(window, { PageProject });
