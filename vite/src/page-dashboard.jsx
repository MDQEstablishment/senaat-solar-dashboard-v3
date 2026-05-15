// Page 1 — Main Dashboard

const KPICard = ({ label, value, trend, spark, accent, suffix }) => (
  <div className="surface border border-soft rounded-xl p-4 shadow-card relative overflow-hidden">
    <div className="absolute left-0 top-0 bottom-0 w-1" style={{ background: accent ? 'var(--accent)' : '#0B2545' }} />
    <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-500 ink-muted-on-dark">{label}</div>
    <div className="flex items-end justify-between mt-1.5">
      <div className="text-[26px] font-bold leading-none text-navy-900 ink-on-dark tnum">{value}<span className="text-sm font-medium text-ink-500 ml-1">{suffix}</span></div>
      {trend != null && <TrendArrow delta={trend} />}
    </div>
    {spark && <div className="mt-2"><Sparkline data={spark} width={140} height={26} /></div>}
  </div>
);

function StageStrip({ counts, onClickStage, activeStage }) {
  const max = Math.max(...counts, 1);
  return (
    <div className="grid grid-cols-12 gap-1.5">
      {SCHOOL_STAGES.map((s, i) => {
        const c = counts[i] || 0;
        const h = 28 + (c / max) * 36;
        const isHandover = i === SCHOOL_STAGES.length - 1;
        const isActive = activeStage === i;
        return (
          <button key={s} onClick={() => onClickStage(i)}
            className={cls('stage-pill text-left rounded-md p-2 border transition',
              isActive ? 'border-accent bg-accent-soft' : 'border-soft hover:border-navy-800')}>
            <div className="flex items-end h-12 mb-1">
              <div className="w-full rounded-t-sm" style={{
                height: h,
                background: isHandover ? '#C8102E' : (i < 4 ? '#13315C' : i < 8 ? '#2A5A9A' : '#B8860B'),
                opacity: c === 0 ? 0.25 : 1
              }} />
            </div>
            <div className="text-[10px] text-ink-500 ink-muted-on-dark leading-tight">{i+1}. {s}</div>
            <div className="text-[15px] font-bold text-navy-900 ink-on-dark tnum">{c}</div>
          </button>
        );
      })}
    </div>
  );
}

function ProjectCard({ p, onOpen }) {
  const pm = PEOPLE.find(u => u.id === p.pmId);
  const typeChips = { 'School Program': 'navy', 'University': 'info', 'Building': 'soft', 'Area': 'gold' };
  return (
    <button onClick={() => onOpen(p.id)}
      className="text-left surface border border-soft rounded-xl p-4 shadow-card hover:shadow-pop transition w-full">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <div className="text-[14px] font-semibold leading-tight ink-on-dark">{p.name}</div>
          <div className="text-[11px] text-ink-500 ink-muted-on-dark mt-0.5 flex items-center gap-1.5">
            <Icon name="map-pin" size={11} /> {p.region} · {p.city}
          </div>
        </div>
        <Pill tone={typeChips[p.type] || 'soft'}>{p.type}</Pill>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs my-3">
        <div>
          <div className="text-ink-500 ink-muted-on-dark text-[10px] uppercase tracking-wider">Contract</div>
          <div className="font-semibold tnum">SAR {SAR(p.value)}</div>
        </div>
        {p.sites > 1 && (
          <div>
            <div className="text-ink-500 ink-muted-on-dark text-[10px] uppercase tracking-wider">Schools</div>
            <div className="font-semibold tnum">{p.sites}</div>
          </div>
        )}
        <div>
          <div className="text-ink-500 ink-muted-on-dark text-[10px] uppercase tracking-wider">Start</div>
          <div className="tnum">{p.start}</div>
        </div>
        <div>
          <div className="text-ink-500 ink-muted-on-dark text-[10px] uppercase tracking-wider">Target</div>
          <div className="tnum">{p.target}</div>
        </div>
      </div>

      <div className="mb-2.5">
        <div className="flex items-center justify-between text-[11px] mb-1">
          <span className="text-ink-500 ink-muted-on-dark">Overall progress</span>
          <span className="font-semibold tnum">{p.progress}%</span>
        </div>
        <ProgressBar value={p.progress} color="#0B2545" />
      </div>

      <div className="flex items-center justify-between">
        <StatusPill status={p.status} />
        <div className="flex items-center gap-1.5">
          <Avatar initials={pm.initials} size={20} />
          <span className="text-[11px] text-ink-700 ink-on-dark">{pm.name.split(' ')[0]}</span>
        </div>
      </div>
    </button>
  );
}

function NewProjectModal({ open, onClose, onCreate, currentUser }) {
  const [form, setForm] = React.useState({
    tag: '', name: '', region: '', city: '', value: '', start: '', target: '', contractorId: '', pmId: '',
  });
  React.useEffect(() => {
    if (open) setForm({ tag: '', name: '', region: '', city: '', value: '', start: new Date().toISOString().slice(0,10), target: '', contractorId: '', pmId: '' });
  }, [open]);
  if (!open) return null;
  const submit = () => {
    if (!form.name.trim() || !form.region.trim()) return;
    onCreate({ ...form, value: +form.value || 0 });
    onClose();
  };
  return (
    <Modal open={open} onClose={onClose} title="New Project" wide
      footer={<>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="accent" icon="check" onClick={submit}>Create project</Button>
      </>}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-medium text-ink-700 mb-1 block">Project name *</label>
            <TextField value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} placeholder="e.g. Tabuk Schools Solar Program" />
          </div>
          <div>
            <label className="text-[11px] font-medium text-ink-700 mb-1 block">Tag</label>
            <TextField value={form.tag} onChange={v => setForm(f => ({ ...f, tag: v }))} placeholder="e.g. Tabuk-1" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-[11px] font-medium text-ink-700 mb-1 block">Region *</label>
            <TextField value={form.region} onChange={v => setForm(f => ({ ...f, region: v }))} placeholder="e.g. Tabuk" />
          </div>
          <div>
            <label className="text-[11px] font-medium text-ink-700 mb-1 block">City</label>
            <TextField value={form.city} onChange={v => setForm(f => ({ ...f, city: v }))} />
          </div>
          <div>
            <label className="text-[11px] font-medium text-ink-700 mb-1 block">Contract value (SAR)</label>
            <TextField value={form.value} onChange={v => setForm(f => ({ ...f, value: v }))} type="number" placeholder="350000000" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-medium text-ink-700 mb-1 block">Start date</label>
            <TextField value={form.start} onChange={v => setForm(f => ({ ...f, start: v }))} type="date" />
          </div>
          <div>
            <label className="text-[11px] font-medium text-ink-700 mb-1 block">Target date</label>
            <TextField value={form.target} onChange={v => setForm(f => ({ ...f, target: v }))} type="date" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-medium text-ink-700 mb-1 block">Project Manager</label>
            <Select value={form.pmId} onChange={v => setForm(f => ({ ...f, pmId: v }))}
              options={[{value:'',label:'— Assign later —'}, ...PEOPLE.filter(p => p.role === 'Project Manager').map(p => ({ value: p.id, label: p.name }))]} className="w-full" />
          </div>
          <div>
            <label className="text-[11px] font-medium text-ink-700 mb-1 block">Primary contractor</label>
            <Select value={form.contractorId} onChange={v => setForm(f => ({ ...f, contractorId: v }))}
              options={[{value:'',label:'— Unassigned —'}, ...CONTRACTORS.map(c => ({ value: c.id, label: c.name }))]} className="w-full" />
          </div>
        </div>
        <div className="text-[11px] text-ink-500 bg-ink-50 rounded p-2">
          Only Anas Alshahrani, Fasiulla Baig, and Naif Alsalmah can create new projects (Round 6 gate).
        </div>
      </div>
    </Modal>
  );
}

function PageDashboard({ projects, onOpenProject, currentUser }) {
  const { addProject, logAudit } = useStore() || {};
  const [stageFilter, setStageFilter] = React.useState(null);
  const [newProjectOpen, setNewProjectOpen] = React.useState(false);

  const totalValue = projects.reduce((a, p) => a + p.value, 0);
  const openCount = projects.filter(p => p.progress < 100).length;
  const closedCount = projects.length - openCount;
  const totalSchools = projects.filter(p => p.schoolDist).reduce((a,p)=>a+p.sites,0);
  const energizedSchools = projects.filter(p => p.schoolDist).reduce((a,p)=>a + p.schoolDist.slice(8).reduce((x,y)=>x+y,0), 0);
  const overall = Math.round(projects.reduce((a,p)=>a+p.progress,0) / projects.length);

  const stageCounts = SCHOOL_STAGES.map((_, i) =>
    projects.filter(p => p.schoolDist).reduce((a, p) => a + (p.schoolDist[i] || 0), 0)
  );

  const filteredProjects = stageFilter == null
    ? projects
    : projects.filter(p => p.schoolDist && p.schoolDist[stageFilter] > 0);

  const kpis = [
    { label: 'Total Programs Value', value: SAR(totalValue), suffix: 'SAR', trend: 4.2, spark: [200,260,290,310,320,360,380,400,420,440,460,totalValue/1e7] },
    { label: 'Total Projects',       value: projects.length, trend: 0, spark: [4,5,6,7,7,7,7,8,8,8,8,projects.length] },
    { label: 'Open Projects',        value: openCount, trend: -8.0, spark: [9,9,9,8,8,8,7,7,7,7,8,openCount] },
    { label: 'Closed / Handed Over', value: closedCount, trend: 12.5, spark: [0,0,0,1,1,1,2,2,2,2,2,closedCount] },
    { label: 'Total Schools',        value: totalSchools.toLocaleString(), trend: 0, spark: [400,600,800,1000,1000,1000,1000,1000,1000,1000,1000,totalSchools] },
    { label: 'Schools Energized',    value: energizedSchools.toLocaleString(), trend: 18.4, spark: [20,40,80,140,200,280,360,420,500,560,620,energizedSchools] },
    { label: 'Overall Progress',     value: overall, suffix: '%', trend: 6.1, spark: [12,18,24,28,32,36,40,44,48,52,56,overall] },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* KPI strip — visible only to VP + 2 Managers (Anas, Fasiulla) */}
      {canViewFinancials(currentUser) && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
          {kpis.map((k, i) => <KPICard key={i} {...k} accent={i === 0 || i === 6} />)}
        </div>
      )}

      {/* Stage strip */}
      <Card>
        <SectionTitle
          icon="bar-chart-3"
          title="School Program Execution Stages — Across All Programs"
          subtitle="Click any stage to filter the project grid below"
          action={stageFilter != null && <Button variant="ghost" size="sm" icon="x" onClick={() => setStageFilter(null)}>Clear filter</Button>}
        />
        <StageStrip counts={stageCounts} onClickStage={setStageFilter} activeStage={stageFilter} />
        <div className="mt-3 flex items-center gap-4 text-[11px] text-ink-500 ink-muted-on-dark">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-navy-800" /> Pre-construction</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{background:'#2A5A9A'}} /> Materials & Install</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-gold" /> Commissioning</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-ind-red" /> Handover to Client</span>
        </div>
      </Card>

      {/* Project grid */}
      <div>
        <SectionTitle
          icon="folder-kanban"
          title={stageFilter != null ? `Projects with schools at "${SCHOOL_STAGES[stageFilter]}"` : 'All Projects'}
          subtitle={`${filteredProjects.length} of ${projects.length} projects`}
          action={canCreateProject(currentUser) ? <Button icon="plus" variant="accent" onClick={() => setNewProjectOpen(true)}>New Project</Button> : null}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
          {filteredProjects.map(p => <ProjectCard key={p.id} p={p} onOpen={onOpenProject} />)}
        </div>
      </div>

      <NewProjectModal open={newProjectOpen} onClose={() => setNewProjectOpen(false)}
        currentUser={currentUser}
        onCreate={data => {
          const p = addProject && addProject(data);
          if (p && logAudit) logAudit({
            actorId: currentUser.id, actorName: currentUser.name, actorRole: currentUser.role,
            action: 'CREATE', entityType: 'project', entityId: p.id, entityLabel: p.name,
            summary: `Created project "${p.name}" in ${p.region}` + (p.value ? ` (SAR ${SAR(p.value)})` : ''),
          });
        }} />
    </div>
  );
}

Object.assign(window, { PageDashboard, NewProjectModal });
