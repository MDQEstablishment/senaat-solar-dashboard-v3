import React from 'react';
// Round 2 pages — escalations, VP programs, recycle bin, settings extensions

// R16 #4: Filter escalations to those directed at the current user.
// "Directed at" = currently with this user, OR raised to this user's role,
// OR explicitly assigned to this user. Status must still be open (not Resolved).
// R21 Issue #1: VP-specific rule — only items raised by a user with role 'Manager'
// reach the VP. Escalations raised by Program Manager / Operations Manager / Project
// Manager stop at the Manager tier; the Manager must explicitly forward to VP. This
// enforces the escalation hierarchy that was implicit in the org chart but not yet
// enforced in the selector.
function filterEscalationsDirectedTo(escalations, user) {
  if (!user) return [];
  const list = (escalations || []).filter(e =>
    e.status !== 'Resolved' && (
      e.currentlyWith === user.id ||
      e.toUserId === user.id ||
      e.assignedTo === user.id ||
      e.toRole === user.role ||
      e.raisedTo === user.role
    )
  );
  if (user.role !== 'VP') return list;
  // VP gate: drop anything whose raiser is not a Manager.
  const people = window.PEOPLE || [];
  return list.filter(e => {
    const raiserId = e.fromUserId || e.raisedBy;
    const raiser = people.find(p => p.id === raiserId);
    return raiser && raiser.role === 'Manager';
  });
}
// Heading varies per role so the widget reads naturally on each dashboard.
function escalationsDirectedHeading(user) {
  if (!user) return 'Escalations awaiting your action';
  const r = user.role;
  if (r === 'VP')                                         return 'Escalations awaiting your decision';
  if (r === 'Manager')                                    return 'Escalations awaiting your action';
  if (r === 'Operations Manager' || r === 'Program Manager') return 'Escalations I need to resolve';
  if (r === 'Project Manager')                            return 'My open escalations';
  return 'Escalations awaiting your action';
}
function NoDirectedEscalations() {
  return (
    <Card>
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Icon name="check-circle" size={28} className="text-emerald-500 mb-2" />
        <div className="text-sm font-medium text-ink-700">No escalations awaiting your action.</div>
        <div className="text-xs text-ink-500 mt-1">You're all clear — nice work.</div>
      </div>
    </Card>
  );
}

// ───────── Escalation modal & detail ─────────
function EscalationModal({ open, onClose, defaults = {}, projects, currentUser, onCreate }) {
  const [title, setTitle] = React.useState('');
  const [reason, setReason] = React.useState('');
  const [urgency, setUrgency] = React.useState('Medium');
  const [projectId, setProjectId] = React.useState(defaults.projectId || projects[0]?.id);
  React.useEffect(() => {
    if (open) {
      setTitle(defaults.title || '');
      setReason('');
      setUrgency('Medium');
      setProjectId(defaults.projectId || projects[0]?.id);
    }
  }, [open]);
  if (!open) return null;

  // Compute the target dynamically from the chosen project + current user
  const target = (typeof getEscalationTarget === 'function') ? getEscalationTarget(currentUser, projectId) : null;
  const targetUser = target ? PEOPLE.find(p => p.id === target.toUserId) : null;
  const modalTitle = target ? target.label : 'Escalate';

  return (
    <Modal open={open} onClose={onClose} title={modalTitle} wide
      footer={<>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="accent" icon="alert-circle" disabled={!target} onClick={() => {
          if (!title.trim() || !target) return;
          onCreate({ title, reason, urgency, projectId, fromUserId: currentUser.id, schoolId: defaults.schoolId || null, taskId: defaults.taskId || null, target });
          onClose();
        }}>Submit escalation</Button>
      </>}>
      <div className="space-y-3">
        {target && targetUser && (
          <div className="bg-accent-soft border border-accent rounded-md p-2.5 flex items-center gap-2 text-xs">
            <Icon name="alert-circle" size={14} />
            <span>Routes to <strong>{targetUser.name}</strong> ({target.toRole}) — your next level in the escalation chain.</span>
          </div>
        )}
        {!target && (
          <div className="bg-ink-50 border border-soft rounded-md p-2.5 text-xs text-ink-700">
            Your role cannot escalate further — VP is the top of the chain.
          </div>
        )}
        <div>
          <label className="text-[11px] font-medium text-ink-700 mb-1 block">Title</label>
          <TextField value={title} onChange={setTitle} placeholder="Short summary of the escalation" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-medium text-ink-700 mb-1 block">Project</label>
            <Select value={projectId} onChange={setProjectId} options={projects.map(p => ({ value: p.id, label: p.name }))} className="w-full" />
          </div>
          <div>
            <label className="text-[11px] font-medium text-ink-700 mb-1 block">Urgency</label>
            <Select value={urgency} onChange={setUrgency} options={['High', 'Medium', 'Low']} className="w-full" />
          </div>
        </div>
        <div>
          <label className="text-[11px] font-medium text-ink-700 mb-1 block">Reason / context</label>
          <textarea value={reason} onChange={e => setReason(e.target.value)} rows={4}
            placeholder="What's blocked, what you've tried, what you need…"
            className="w-full px-2.5 py-1.5 text-sm rounded-md border border-ink-200 bg-white focus:outline-none focus:ring-2 ring-accent" />
        </div>
      </div>
    </Modal>
  );
}

function PageEscalationDetail({ id, onBack, currentUser }) {
  const { escalations, addEscalationComment, resolveEscalation, escalateFurther } = useStore();
  const e = escalations.find(x => x.id === id);
  const [comment, setComment] = React.useState('');
  if (!e) return <div className="p-6">Escalation not found.</div>;
  const from = getPerson(e.fromUserId);
  const to = getPerson(e.toUserId);
  const project = getProject(e.projectId);

  // Determine if current user can forward this escalation further up
  const isCurrentlyWithMe = e.currentlyWith === currentUser.id;
  const forwardTarget = isCurrentlyWithMe ? (typeof getEscalationTarget === 'function' ? getEscalationTarget(currentUser, e.projectId) : null) : null;
  const forwardUser = forwardTarget ? PEOPLE.find(p => p.id === forwardTarget.toUserId) : null;

  // Build chain entries: prefer e.chain, fallback to derived from history
  const chain = e.chain && e.chain.length > 0
    ? e.chain
    : [{ fromUserId: e.fromUserId, toUserId: e.toUserId, toRole: e.toRole, when: e.opened, action: 'Escalated' }];

  return (
    <div className="p-6 max-w-3xl space-y-4">
      <Button variant="ghost" icon="arrow-left" onClick={onBack}>Back</Button>
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Pill tone={e.urgency === 'High' ? 'danger' : e.urgency === 'Medium' ? 'warn' : 'soft'}>{e.urgency}</Pill>
          <Pill tone={e.status === 'Resolved' ? 'ok' : 'warn'}>{e.status}</Pill>
          <span className="text-[11px] text-ink-500">{e.daysOpen} days open</span>
        </div>
        <h1 className="text-xl font-semibold">{e.title}</h1>
      </div>
      <Card padding="p-4">
        <div className="grid grid-cols-3 gap-3 text-xs">
          <div><div className="text-[10px] uppercase tracking-wider text-ink-500">Originated by</div><div className="flex items-center gap-1.5 mt-1"><Avatar initials={from?.initials} size={20} />{from?.name}</div><div className="text-[10px] text-ink-500 mt-0.5">{from?.role}</div></div>
          <div><div className="text-[10px] uppercase tracking-wider text-ink-500">Currently with</div><div className="flex items-center gap-1.5 mt-1"><Avatar initials={to?.initials} size={20} />{to?.name || '—'}</div><div className="text-[10px] text-ink-500 mt-0.5">{e.toRole}</div></div>
          <div><div className="text-[10px] uppercase tracking-wider text-ink-500">Project</div><div className="font-medium mt-1">{project?.name}</div></div>
        </div>
        <div className="mt-3 text-xs">
          <div className="text-[10px] uppercase tracking-wider text-ink-500 mb-1">Reason</div>
          <p className="text-ink-700">{e.reason}</p>
        </div>
      </Card>

      {/* Escalation chain — who escalated to whom */}
      <Card padding="p-4">
        <SectionTitle icon="arrow-up" title="Escalation chain" subtitle={`${chain.length} step${chain.length > 1 ? 's' : ''} in the chain`} />
        <div className="space-y-2">
          {chain.map((c, i) => {
            const fromU = getPerson(c.fromUserId);
            const toU = getPerson(c.toUserId);
            return (
              <div key={i} className="flex items-center gap-2 text-xs p-2 border border-soft rounded-md surface-2">
                <span className="text-[10px] text-ink-500 tnum w-5">#{i + 1}</span>
                <div className="flex items-center gap-1.5">
                  <Avatar initials={fromU?.initials} size={20} />
                  <div>
                    <div className="font-semibold">{fromU?.name}</div>
                    <div className="text-[10px] text-ink-500">{fromU?.role}</div>
                  </div>
                </div>
                <Icon name="arrow-up-right" size={14} className="text-ink-500 mx-2" />
                <div className="flex items-center gap-1.5">
                  <Avatar initials={toU?.initials} size={20} />
                  <div>
                    <div className="font-semibold">{toU?.name}</div>
                    <div className="text-[10px] text-ink-500">{c.toRole}</div>
                  </div>
                </div>
                <span className="ml-auto text-[10px] text-ink-500">{c.action} · {c.when}</span>
              </div>
            );
          })}
        </div>
      </Card>

      <Card padding="p-4">
        <SectionTitle icon="git-branch" title="Activity & comments" />
        <div className="space-y-3">
          {e.history.map((h, i) => {
            const u = getPerson(h.who);
            return (
              <div key={i} className="flex gap-2 text-xs">
                <Avatar initials={u?.initials} size={22} />
                <div className="flex-1">
                  <div><span className="font-semibold">{u?.name}</span> · <span className="text-ink-500">{h.action} on {h.when}</span></div>
                  <div className="text-ink-700 mt-0.5">{h.note}</div>
                </div>
              </div>
            );
          })}
        </div>
        {e.status !== 'Resolved' && (
          <div className="mt-4 pt-4 border-t border-soft space-y-2">
            <textarea value={comment} onChange={ev => setComment(ev.target.value)} rows={2}
              placeholder="Add a comment or resolution note…"
              className="w-full px-2.5 py-1.5 text-sm rounded-md border border-ink-200 bg-white focus:outline-none focus:ring-2 ring-accent" />
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" icon="mail" onClick={() => { if (comment.trim()) { addEscalationComment(e.id, currentUser.id, comment); setComment(''); } }}>Add comment</Button>
              {isCurrentlyWithMe && forwardTarget && escalateFurther && (
                <Button variant="outline" icon="arrow-up-right" onClick={() => { escalateFurther(e.id, currentUser.id, forwardTarget, comment); setComment(''); }}>
                  Forward to {forwardTarget.toRole} ({forwardUser?.name})
                </Button>
              )}
              <Button variant="accent" icon="check" onClick={() => { resolveEscalation(e.id, currentUser.id, comment || 'Resolved.'); setComment(''); }}>Resolve</Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

// ───────── VP Escalations panel & My Escalations ─────────
function EscalationsTable({ items, onOpen, showFrom = true }) {
  return (
    <Card padding="p-0">
      <table className="w-full text-sm">
        <thead className="surface-2 border-b border-soft text-xs">
          <tr>
            <th className="text-left px-4 py-2 font-semibold">Title</th>
            {showFrom && <th className="text-left px-4 py-2 font-semibold">From</th>}
            <th className="text-left px-4 py-2 font-semibold">Project</th>
            <th className="text-left px-4 py-2 font-semibold">Urgency</th>
            <th className="text-left px-4 py-2 font-semibold">Currently with</th>
            <th className="text-left px-4 py-2 font-semibold">Days open</th>
            <th className="text-left px-4 py-2 font-semibold">Status</th>
          </tr>
        </thead>
        <tbody>
          {items.map(e => {
            const from = getPerson(e.fromUserId);
            const cw = getPerson(e.currentlyWith);
            const proj = getProject(e.projectId);
            return (
              <tr key={e.id} onClick={() => onOpen(e.id)} className="border-b border-soft hover-row cursor-pointer">
                <td className="px-4 py-2.5 font-medium">{e.title}</td>
                {showFrom && <td className="px-4 py-2.5"><span className="flex items-center gap-1.5"><Avatar initials={from?.initials} size={20} />{from?.name}</span></td>}
                <td className="px-4 py-2.5 text-xs">{proj?.name}</td>
                <td className="px-4 py-2.5"><Pill tone={e.urgency === 'High' ? 'danger' : e.urgency === 'Medium' ? 'warn' : 'soft'}>{e.urgency}</Pill></td>
                <td className="px-4 py-2.5">{cw ? <span className="flex items-center gap-1.5"><Avatar initials={cw.initials} size={18} />{cw.name}</span> : <span className="text-ink-500">—</span>}</td>
                <td className="px-4 py-2.5 num">{e.daysOpen}</td>
                <td className="px-4 py-2.5"><Pill tone={e.status === 'Resolved' ? 'ok' : 'warn'}>{e.status}</Pill></td>
              </tr>
            );
          })}
          {items.length === 0 && <tr><td colSpan="7" className="text-center py-6 text-xs text-ink-500 italic">No escalations.</td></tr>}
        </tbody>
      </table>
    </Card>
  );
}

function PageMyEscalations({ currentUser, onOpen, onNew }) {
  const { escalations } = useStore();
  const mine = escalations.filter(e => e.fromUserId === currentUser.id);
  const open = mine.filter(e => e.status !== 'Resolved');
  const resolved = mine.filter(e => e.status === 'Resolved');
  return (
    <div className="p-6 space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <div className="text-xs text-ink-500 uppercase tracking-[0.18em]">Escalations</div>
          <h1 className="text-2xl font-semibold">My escalations</h1>
        </div>
        <Button variant="accent" icon="alert-circle" onClick={onNew}>New escalation</Button>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Card padding="p-4"><div className="text-[11px] uppercase tracking-wider text-ink-500">Total raised</div><div className="text-3xl font-bold num mt-1">{mine.length}</div></Card>
        <Card padding="p-4"><div className="text-[11px] uppercase tracking-wider text-ink-500">Awaiting executive</div><div className="text-3xl font-bold num mt-1 text-amber-600">{open.length}</div></Card>
        <Card padding="p-4"><div className="text-[11px] uppercase tracking-wider text-ink-500">Resolved</div><div className="text-3xl font-bold num mt-1 text-emerald-600">{resolved.length}</div></Card>
      </div>
      <SectionTitle icon="alert-circle" title="Open" subtitle={`${open.length} awaiting executive`} />
      <EscalationsTable items={open} onOpen={onOpen} showFrom={false} />
      <SectionTitle icon="check-circle" title="Resolved" />
      <EscalationsTable items={resolved} onOpen={onOpen} showFrom={false} />
    </div>
  );
}

// ───────── VP — Executive dashboard ─────────
function PageVPDashboard({ onOpenEscalation, currentUser }) {
  const { projects, escalations, finRollup, schools } = useStore();
  // currentUser is plumbed in R16; fall back to the canonical VP record so older callers still work.
  const me = currentUser || PEOPLE.find(p => p.id === 'u-vp') || { id: 'u-vp', role: 'VP' };
  const totalSchools = (schools || ALL_SCHOOLS).length;
  const energizedAll = countEnergized(schools || ALL_SCHOOLS);
  const handedAll    = countHandedOver(schools || ALL_SCHOOLS);
  const avgProgress = projects.length ? Math.round(projects.reduce((a, p) => a + (p.progress || 0), 0) / projects.length) : 0;
  // R16 #4: "Top risks & escalations" now shows only escalations directed at the current user.
  const directed = filterEscalationsDirectedTo(escalations, me);
  return (
    <div className="p-6 space-y-4">
      <div>
        <div className="text-xs text-ink-500 uppercase tracking-[0.18em]">Executive overview</div>
        <h1 className="text-2xl font-semibold">Portfolio at a glance</h1>
      </div>
      <ExecutiveKPIStrip projects={projects} totalSchools={totalSchools} energizedAll={energizedAll} handedAll={handedAll} avgProgress={avgProgress} />
      {/* R19.1: Stage transitions this week + Top bottlenecks pair — the same widgets
          PageDashboard renders for non-exec views, now surfaced on the VP dashboard
          too. Both come from window.* so the data computation lives in one place. */}
      <DashStageInsights projects={projects} />
      {/* R27: "School Execution Stages" (4 tinted category panels with the rich
          per-stage cards) moved here from the Projects index, gated by role.
          Replaces the older simpler StageExecutionKPIs row that lived in this slot. */}
      {canViewSchoolExecutionStages(me) && window.SchoolExecutionStagesWidget && (
        <window.SchoolExecutionStagesWidget projects={projects} />
      )}
      <ExecutiveFinancialSummary finRollup={finRollup} />
      <SectionTitle icon="alert-circle" title={escalationsDirectedHeading(me)} subtitle={`${directed.length} open · click any row for full thread`} />
      {directed.length === 0
        ? <NoDirectedEscalations />
        : <EscalationsTable items={directed.slice(0, 6)} onOpen={onOpenEscalation} />}
    </div>
  );
}

// R19.1 — shared insights row used by VP + Manager dashboards. Pulls the
// chart, bottlenecks panel, and stage-data helper off window (set by
// page-dashboard.jsx) so the logic isn't duplicated.
function DashStageInsights({ projects }) {
  const Chart = window.DashTransitionsChart;
  const Sidebar = window.DashBottlenecksSidebar;
  const compute = window.computeDashStageData;
  if (!Chart || !Sidebar || !compute) return null;
  const { stageData, bottlenecks, maxDrop } = compute(projects);
  return (
    <div data-testid="dash-transitions-row-exec" className="flex flex-col lg:flex-row gap-4">
      <div className="lg:flex-[3] min-w-0"><Chart stages={stageData} /></div>
      <div className="lg:flex-1 min-w-0"><Sidebar bottlenecks={bottlenecks} maxDrop={maxDrop} /></div>
    </div>
  );
}

function PageVPPrograms({ projects, onOpen }) {
  return (
    <div className="p-6 space-y-4">
      <div>
        <div className="text-xs text-ink-500 uppercase tracking-[0.18em]">Programs</div>
        <h1 className="text-2xl font-semibold">All programs</h1>
        <div className="text-xs text-ink-500 mt-1">{projects.length} programs · click any row to drill into projects (read-only)</div>
      </div>
      <Card padding="p-0">
        <table className="w-full text-sm">
          <thead className="surface-2 border-b border-soft text-xs">
            <tr>
              <th className="text-left px-4 py-2 font-semibold">Program</th>
              <th className="text-left px-4 py-2 font-semibold">Region</th>
              <th className="text-right px-4 py-2 font-semibold">Value (SAR)</th>
              <th className="text-right px-4 py-2 font-semibold">Schools</th>
              <th className="text-left px-4 py-2 font-semibold w-1/4">Progress</th>
            </tr>
          </thead>
          <tbody>
            {projects.map(p => (
              <tr key={p.id} onClick={() => onOpen(p.id)} className="border-b border-soft hover-row cursor-pointer">
                <td className="px-4 py-2.5 font-medium">{p.name}</td>
                <td className="px-4 py-2.5 text-ink-700">{p.region}</td>
                <td className="px-4 py-2.5 text-right num">{SARfull(p.value)}</td>
                <td className="px-4 py-2.5 text-right num">{p.sites}</td>
                <td className="px-4 py-2.5"><div className="flex items-center gap-2"><ProgressBar value={p.progress} /><span className="text-xs num font-medium w-10">{p.progress}%</span></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

// ───────── Program Manager — distinct dashboard ─────────
function PagePMDashboard({ projects, currentUser, onOpenEscalation, onNewEscalation }) {
  const { escalations, finRollup, financialEntries, schools, auditLog } = useStore();
  const mine = escalations.filter(e => e.fromUserId === currentUser.id);
  const open = mine.filter(e => e.status !== 'Resolved');
  // R16 #4: items directed at me (currently with / raised to my role / assigned to me).
  const directed = filterEscalationsDirectedTo(escalations, currentUser);
  const escTarget = (typeof getEscalationTarget === 'function') ? getEscalationTarget(currentUser, null) : null;
  const avgProgress = projects.length ? Math.round(projects.reduce((a, p) => a + (p.progress || 0), 0) / projects.length) : 0;
  const energizedAll = countEnergized(schools || ALL_SCHOOLS);
  const handedAll    = countHandedOver(schools || ALL_SCHOOLS);
  const totalSchools = (schools || ALL_SCHOOLS).length;
  const isExec = canViewFinancials(currentUser);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <div className="text-xs text-ink-500 uppercase tracking-[0.18em]">{isExec ? 'Executive overview' : currentUser.role}</div>
          <h1 className="text-2xl font-semibold">{isExec ? 'Portfolio at a glance' : 'Portfolio dashboard'}</h1>
        </div>
        {escTarget && <Button variant="accent" icon="alert-circle" onClick={onNewEscalation}>{escTarget.label}</Button>}
      </div>

      {/* KPI strip — exec only */}
      {isExec ? (
        <ExecutiveKPIStrip projects={projects} totalSchools={totalSchools} energizedAll={energizedAll} handedAll={handedAll} avgProgress={avgProgress} />
      ) : (
        <div className="grid grid-cols-4 gap-3">
          <Card padding="p-4"><div className="text-[10px] uppercase tracking-wider text-ink-500">Programs</div><div className="text-2xl font-bold num mt-1">{projects.length}</div></Card>
          <Card padding="p-4"><div className="text-[10px] uppercase tracking-wider text-ink-500">Schools</div><div className="text-2xl font-bold num mt-1">{totalSchools.toLocaleString()}</div></Card>
          <Card padding="p-4"><div className="text-[10px] uppercase tracking-wider text-ink-500">Overall progress</div><div className="text-2xl font-bold num mt-1">{avgProgress}%</div><div className="text-[11px] text-ink-500">{energizedAll.toLocaleString()} energized</div></Card>
          <Card padding="p-4"><div className="text-[10px] uppercase tracking-wider text-ink-500">My escalations</div><div className="text-2xl font-bold num mt-1 text-amber-600">{open.length}</div><div className="text-[11px] text-ink-500">{mine.length} total raised</div></Card>
        </div>
      )}

      {/* R19.1 / R29.6: Stage transitions + Top bottlenecks pair. Visible to all four
          portfolio roles (Manager / VP / Operations Manager / Program Manager) — gated
          on canViewSchoolExecutionStages (was isExec / canViewFinancials, which wrongly
          excluded Ops Mgr + Pgm Mgr). */}
      {canViewSchoolExecutionStages(currentUser) && <DashStageInsights projects={projects} />}

      {/* R27: portfolio-level "School Execution Stages" widget (between Transitions
          and Financial summary, gated by role). Replaces the older flat 4-card
          StageExecutionKPIs strip that previously lived after Financial summary. */}
      {canViewSchoolExecutionStages(currentUser) && window.SchoolExecutionStagesWidget && (
        <window.SchoolExecutionStagesWidget projects={projects} />
      )}

      {/* Exec: Financial summary card */}
      {isExec && <ExecutiveFinancialSummary finRollup={finRollup} />}

      {/* R16 #4: Top escalations now filter to items directed at the current user only. */}
      <SectionTitle icon="alert-circle"
        title={escalationsDirectedHeading(currentUser)}
        subtitle={`${directed.length} awaiting attention`}
        action={!isExec && <Button size="sm" variant="ghost" icon="alert-circle" onClick={onNewEscalation}>New</Button>} />
      {directed.length === 0
        ? <NoDirectedEscalations />
        : <EscalationsTable items={directed.slice(0, isExec ? 6 : 20)} onOpen={onOpenEscalation} showFrom={isExec} />}
    </div>
  );
}

function ExecutiveKPIStrip({ projects, totalSchools, energizedAll, handedAll, avgProgress }) {
  const totalValue = projects.reduce((a, p) => a + (p.value || 0), 0);
  const openProj = projects.filter(p => p.progress < 100).length;
  const closedProj = projects.length - openProj;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
      <ExecKPI label="Total Programs Value" value={'SAR ' + SAR(totalValue)} sub={`${projects.length} active`} accent />
      <ExecKPI label="Total Projects"       value={projects.length} />
      <ExecKPI label="Open Projects"        value={openProj} />
      <ExecKPI label="Closed / Handed Over" value={closedProj} />
      <ExecKPI label="Total Schools"        value={totalSchools.toLocaleString()} />
      <ExecKPI label="Schools Energized"    value={energizedAll.toLocaleString()} sub={`${Math.round(energizedAll/totalSchools*100)}%`} />
      <ExecKPI label="Overall Progress"     value={avgProgress + '%'} accent />
    </div>
  );
}
function ExecKPI({ label, value, sub, accent }) {
  return (
    <div className="surface border border-soft rounded-xl p-4 shadow-card relative overflow-hidden">
      <div className="absolute left-0 top-0 bottom-0 w-1" style={{ background: accent ? 'var(--accent)' : '#0B2545' }} />
      <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-500">{label}</div>
      <div className="text-[22px] font-bold leading-tight text-navy-900 tnum mt-1">{value}</div>
      {sub && <div className="text-[11px] text-ink-500 mt-0.5">{sub}</div>}
    </div>
  );
}

function ExecutiveProgressTrend() {
  // C5: Recharts is lazy — trigger load on mount, render placeholder until ready
  const [rechartsReady, setRechartsReady] = React.useState(!!(window.Recharts && window.Recharts.AreaChart));
  React.useEffect(() => {
    if (rechartsReady) return;
    if (typeof window.loadRecharts === 'function') {
      window.loadRecharts().then(() => setRechartsReady(true));
    }
    const onLoaded = () => setRechartsReady(true);
    window.addEventListener('recharts-loaded', onLoaded);
    return () => window.removeEventListener('recharts-loaded', onLoaded);
  }, [rechartsReady]);

  // Build month buckets — count schools whose energized stage date falls in each month
  const buckets = {};
  ALL_SCHOOLS.forEach(s => {
    const st = stageByKey(s, 'energized');
    if (st && st.done && st.date) {
      const d = new Date(st.date);
      const k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
      buckets[k] = (buckets[k] || 0) + 1;
    }
  });
  const keys = Object.keys(buckets).sort().slice(-12);
  let cum = 0;
  const data = keys.map(k => { cum += buckets[k]; return { month: k.slice(5), value: buckets[k], cumulative: cum }; });
  const isEmpty = data.length === 0 || cum === 0;

  return (
    <Card>
      <SectionTitle icon="trending-up" title="Program progress trend" subtitle="Schools energized per month — cumulative" />
      <div style={{ width: '100%', height: 200, position: 'relative' }}>
        {/* H2: Empty state overlay when no data */}
        {isEmpty && (
          <div className="absolute inset-0 flex items-center justify-center z-10 bg-white/85 backdrop-blur-[2px] rounded-md border border-dashed border-soft">
            <div className="text-center px-4">
              <Icon name="trending-up" size={28} className="text-ink-200 mb-2" />
              <div className="text-sm font-medium text-ink-700">No schools energized yet</div>
              <div className="text-xs text-ink-500 mt-1">Trend chart will populate as commissioning begins.</div>
            </div>
          </div>
        )}
        {rechartsReady ? (
          <ExecutiveProgressTrendChart data={isEmpty ? [{ month: '·', cumulative: 0 }, { month: '·', cumulative: 0 }] : data} />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-ink-300 text-xs">
            Loading chart…
          </div>
        )}
      </div>
    </Card>
  );
}

function ExecutiveProgressTrendChart({ data }) {
  const { ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Area, AreaChart } = window.Recharts;
  if (!AreaChart) return null;
  return (
    <ResponsiveContainer>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="cumGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#D4A52A" stopOpacity={0.6} />
            <stop offset="100%" stopColor="#D4A52A" stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
        <XAxis dataKey="month" stroke="#94A3B8" fontSize={11} />
        <YAxis stroke="#94A3B8" fontSize={11} />
        <Tooltip />
        <Area type="monotone" dataKey="cumulative" stroke="#B8860B" strokeWidth={2} fill="url(#cumGrad)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function ExecutiveFinancialSummary({ finRollup }) {
  const r = finRollup ? finRollup() : { receipts: 0, receivables: 0, payments: 0, payables: 0 };
  return (
    <Card>
      <SectionTitle icon="banknote" title="Financial summary" subtitle="Cross-program rollup (Manager / VP view only)" />
      <div className="grid grid-cols-4 gap-3 text-center">
        <div><div className="text-[10px] uppercase tracking-wider text-ink-500">Received</div><div className="text-xl font-bold num text-emerald-600">SAR {SAR(r.receipts)}</div></div>
        <div><div className="text-[10px] uppercase tracking-wider text-ink-500">Receivables</div><div className="text-xl font-bold num text-amber-600">SAR {SAR(r.receivables)}</div></div>
        <div><div className="text-[10px] uppercase tracking-wider text-ink-500">Paid out</div><div className="text-xl font-bold num text-sky-700">SAR {SAR(r.payments)}</div></div>
        <div><div className="text-[10px] uppercase tracking-wider text-ink-500">Payables</div><div className="text-xl font-bold num text-red-600">SAR {SAR(r.payables)}</div></div>
      </div>
    </Card>
  );
}

function ExecutiveAuditPanel({ auditLog }) {
  const recent = (auditLog || []).slice(0, 10);
  return (
    <Card>
      <SectionTitle icon="clock" title="Recent activity" subtitle="Last 10 events across the system" />
      <div className="space-y-1.5">
        {recent.map(l => (
          <div key={l.id} className="flex items-center gap-2 text-xs border border-soft rounded-md p-2 surface-2">
            <span className="text-[10px] font-mono text-ink-500 w-32 shrink-0">{new Date(l.timestamp).toLocaleString('en-GB', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}</span>
            <Pill tone={l.action === 'CREATE' ? 'ok' : l.action === 'DELETE' ? 'danger' : l.action === 'UPDATE' ? 'info' : 'soft'}>{l.action}</Pill>
            <span className="text-[10px] text-ink-500">{l.actorName}</span>
            <span className="flex-1 text-[11px]">{l.summary}</span>
          </div>
        ))}
        {recent.length === 0 && <div className="text-xs text-ink-500 italic">No recent activity.</div>}
      </div>
    </Card>
  );
}

// ───────── R16 #3 — Stage Execution KPIs ─────────
// 18 cards, grouped by stage category (Mechanical/Electrical/Commissioning/Handover).
// Each card shows: category colour dot, stage label, count of schools that completed it,
// percent of total schools, weekly velocity (Δ over last 7 days), and median time
// between this stage and the next one.
function computeStageKpis(schools) {
  const total = (schools || []).length || 1;
  const today = new Date('2026-05-16').getTime();
  const weekAgo = today - 7 * 86400000;
  return STAGE_KEYS.map((key, idx) => {
    let count = 0, weekCount = 0;
    const gaps = [];
    (schools || []).forEach(s => {
      const st = s.stages && s.stages[idx];
      if (!st || !st.done) return;
      count++;
      const t = st.completedDate ? new Date(st.completedDate).getTime() : 0;
      if (t && t >= weekAgo && t <= today) weekCount++;
      const next = s.stages && s.stages[idx + 1];
      if (next && next.done && next.completedDate && st.completedDate) {
        const dt = new Date(next.completedDate).getTime() - t;
        if (dt > 0) gaps.push(dt);
      }
    });
    gaps.sort((a, b) => a - b);
    const median = gaps.length ? Math.round(gaps[Math.floor(gaps.length / 2)] / 86400000) : null;
    return {
      key, idx, label: SCHOOL_STAGES[idx],
      category: STAGE_CATEGORY[key],
      count, pct: Math.round((count / total) * 100), weekCount,
      medianDays: median,
    };
  });
}
function StageExecutionKPIs({ schools }) {
  const data = React.useMemo(() => computeStageKpis(schools), [schools]);
  const total = (schools || []).length;
  const energized = countEnergized(schools || []);
  // "Currently in pipeline" = schools that have at least one stage completed but
  // haven't finished the final stage (handover_client). The selector mirrors the
  // dashboard counter so the two views never drift.
  const inPipeline = (schools || []).filter(s => {
    if (!s.stages) return false;
    const first = s.stages[0]; const last = s.stages[s.stages.length - 1];
    return first && first.done && !(last && last.done);
  }).length;
  const grouped = ['mechanical', 'electrical', 'commissioning', 'handover'].map(cat => ({
    cat, label: STAGE_CATEGORY_LABELS[cat],
    items: data.filter(d => d.category === cat),
    color: STAGE_CATEGORY_COLORS[cat],
  }));
  const nfmt = new Intl.NumberFormat('en-US');
  return (
    <Card>
      {/* R19 Item #1 — heading "Stage Execution · all 18 stages" with a right-aligned
          totals strip ("N schools total · N currently in pipeline · N energized"). */}
      <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
        <div>
          <div className="flex items-center gap-2">
            <Icon name="bar-chart-3" size={16} />
            <h3 className="text-sm font-semibold ink-on-dark">Stage Execution · all 18 stages</h3>
          </div>
          <div className="text-[11px] text-ink-500 ink-muted-on-dark mt-0.5">Grouped by category · click any card to filter projects and schools</div>
        </div>
        <div className="text-[11px] text-ink-500 ink-muted-on-dark tnum">
          {nfmt.format(total)} schools total · <span className="text-navy-900 ink-on-dark font-medium">{nfmt.format(inPipeline)}</span> currently in pipeline · <span className="text-emerald-600 font-medium">{nfmt.format(energized)}</span> energized
        </div>
      </div>
      <div className="space-y-3">
        {grouped.map(g => (
          <div key={g.cat}>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: g.color.dot }} />
              <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: g.color.text }}>{g.label}</span>
              <span className="text-[11px] text-ink-500">· {g.items.length} stages</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
              {g.items.map(k => (
                <div key={k.key} className="border border-soft rounded-lg p-2.5 surface-2"
                     style={{ borderLeft: `3px solid ${g.color.dot}` }}>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: g.color.dot }} />
                    <div className="text-[11px] font-medium ink-on-dark truncate" title={k.label}>{k.label}</div>
                  </div>
                  <div className="flex items-baseline gap-1.5 mt-1">
                    <div className="text-lg font-bold tnum">{k.count.toLocaleString()}</div>
                    <div className="text-[10px] text-ink-500">{k.pct}%</div>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-ink-500 mt-0.5">
                    <span className={k.weekCount > 0 ? 'text-emerald-600 font-medium' : ''}>
                      {k.weekCount > 0 ? `↑ ${k.weekCount} this week` : '—'}
                    </span>
                    <span title="Median days to next stage">{k.medianDays != null ? `${k.medianDays}d→next` : ''}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

Object.assign(window, {
  EscalationModal, PageEscalationDetail, EscalationsTable,
  PageVPDashboard, PageVPPrograms, PageMyEscalations, PagePMDashboard,
  StageExecutionKPIs, computeStageKpis,
  filterEscalationsDirectedTo, escalationsDirectedHeading, NoDirectedEscalations,
});
