import React from 'react';
// Page 8 — Settings / Admin (with R2 tabs: Lifecycle, Statuses, Custom Fields, Milestones)

function PageSettings({ currentUser }) {
  const [tab, setTab] = React.useState('Users');
  const showAudit = canViewAuditLog(currentUser);
  const TABS = [
    'Users','Roles & Permissions','Projects','Lifecycle Stages','School Stages',
    'Custom Statuses','Custom Fields','Milestone Templates','KPIs',
    'Branding','Notifications',
    ...(showAudit ? ['Audit Log'] : []),
  ];

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold ink-on-dark">Settings & Admin</h1>
        <p className="text-xs text-ink-500 ink-muted-on-dark mt-0.5">Every list, threshold, and workflow is editable here. The client owns the system after handover.</p>
      </div>
      <Card padding="p-0">
        <div className="px-5 pt-3"><Tabs tabs={TABS} active={tab} onChange={setTab} /></div>
        <div className="p-5">
          {tab === 'Users'              && <UsersTab />}
          {tab === 'Roles & Permissions'&& <RolesTab />}
          {tab === 'Projects'           && <ProjectsTab currentUser={currentUser} />}
          {tab === 'Lifecycle Stages'   && <LifecycleTab />}
          {tab === 'School Stages'      && <SchoolStagesTab />}
          {tab === 'Custom Statuses'    && <CustomStatusesTab />}
          {tab === 'Custom Fields'      && <CustomFieldsTab />}
          {tab === 'Milestone Templates'&& <MilestoneTemplatesTab />}
          {tab === 'KPIs'               && <KPIsTab />}
          {tab === 'Branding'           && <BrandingTab />}
          {tab === 'Notifications'      && <NotificationsTab currentUser={currentUser} />}
          {tab === 'Audit Log'          && <AuditTab />}
        </div>
      </Card>
    </div>
  );
}

// ── Lifecycle Stages ──────────────────────────────────────────────────────────
function LifecycleTab() {
  const { lifecycleStages, addLifecycleStage, updateLifecycleStage, deleteLifecycleStage, reorderLifecycleStage } = useStore();
  const [editId, setEditId] = React.useState(null);
  const [addOpen, setAddOpen] = React.useState(false);
  const sorted = [...(lifecycleStages || [])].sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <SectionTitle title="Project Execution Lifecycle" subtitle="Changes apply across all projects and schools" className="!mb-0" />
        <Button size="sm" icon="plus" variant="accent" onClick={() => setAddOpen(true)}>Add Stage</Button>
      </div>
      <div className="text-[11px] text-ink-500 bg-amber-50 border border-amber-200 rounded-md p-2.5">
        ↕ Use arrows to reorder. Edit name, color, and completion criteria per stage. Deleting permanently deletes the stage (confirmation required).
      </div>
      <div className="space-y-1">
        {sorted.map((s, i) => (
          editId === s.id
            ? <LifecycleStageRow key={s.id} stage={s} onSave={p => { updateLifecycleStage(s.id, p); setEditId(null); }} onCancel={() => setEditId(null)} />
            : (
              <div key={s.id} className="flex items-center gap-2 border border-soft rounded-md p-2.5">
                <div className="flex flex-col gap-0.5">
                  <button onClick={() => reorderLifecycleStage(s.id, -1)} disabled={i === 0} className="p-0.5 hover:bg-ink-100 rounded disabled:opacity-30"><Icon name="chevron-up" size={12} /></button>
                  <button onClick={() => reorderLifecycleStage(s.id, 1)} disabled={i === sorted.length - 1} className="p-0.5 hover:bg-ink-100 rounded disabled:opacity-30"><Icon name="chevron-down" size={12} /></button>
                </div>
                <div className="w-3 h-3 rounded-full shrink-0" style={{ background: s.color }} />
                <span className="text-xs text-ink-500 tnum w-6">{i + 1}</span>
                <span className="text-sm flex-1 font-medium">{s.name}</span>
                {s.criteria && <span className="text-[11px] text-ink-500 truncate max-w-[200px] hidden lg:block">{s.criteria}</span>}
                <div className="flex gap-1">
                  <button onClick={() => setEditId(s.id)} className="p-1 rounded hover:bg-ink-100 text-ink-500" title="Edit"><Icon name="pencil" size={13} /></button>
                  <button onClick={() => deleteLifecycleStage(s.id)} className="p-1 rounded hover:bg-ink-100 text-ink-500 hover:text-red-600" title="Delete"><Icon name="trash-2" size={13} /></button>
                </div>
              </div>
            )
        ))}
      </div>
      {addOpen && (
        <LifecycleStageRow stage={{ name: '', color: '#13315C', criteria: '' }}
          onSave={p => { addLifecycleStage(p); setAddOpen(false); }}
          onCancel={() => setAddOpen(false)} isNew />
      )}
    </div>
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

// ── School Stages (editable: rename / reorder / color / add / delete) ────────
function SchoolStagesTab() {
  const { schoolStagesList, addSchoolStage, updateSchoolStage_, deleteSchoolStage, reorderSchoolStage } = useStore();
  const [editId, setEditId] = React.useState(null);
  const [addOpen, setAddOpen] = React.useState(false);
  const sorted = [...(schoolStagesList || [])].sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <SectionTitle title="School Execution Stages" subtitle="Editable per-school stage list — rename, reorder, change color, add or delete" className="!mb-0" />
        <Button size="sm" icon="plus" variant="accent" onClick={() => setAddOpen(true)}>Add Stage</Button>
      </div>
      <div className="text-[11px] text-ink-500 bg-amber-50 border border-amber-200 rounded-md p-2.5">
        ↕ Use arrows to reorder. Edit name and color per stage. Deleting permanently removes the stage. This action cannot be undone.
      </div>
      <div className="space-y-1">
        {sorted.map((s, i) => (
          editId === s.id
            ? <SchoolStageRow key={s.id} stage={s} onSave={p => { updateSchoolStage_(s.id, p); setEditId(null); }} onCancel={() => setEditId(null)} />
            : (
              <div key={s.id} className="flex items-center gap-2 border border-soft rounded-md p-2.5">
                <div className="flex flex-col gap-0.5">
                  <button onClick={() => reorderSchoolStage(s.id, -1)} disabled={i === 0} className="p-0.5 hover:bg-ink-100 rounded disabled:opacity-30"><Icon name="chevron-up" size={12} /></button>
                  <button onClick={() => reorderSchoolStage(s.id, 1)} disabled={i === sorted.length - 1} className="p-0.5 hover:bg-ink-100 rounded disabled:opacity-30"><Icon name="chevron-down" size={12} /></button>
                </div>
                <div className="w-3 h-3 rounded-full shrink-0" style={{ background: s.color }} />
                <span className="text-xs text-ink-500 tnum w-6">{i + 1}</span>
                <span className="text-sm flex-1 font-medium">{s.name}</span>
                <div className="flex gap-1">
                  <button onClick={() => setEditId(s.id)} className="p-1 rounded hover:bg-ink-100 text-ink-500" title="Edit"><Icon name="pencil" size={13} /></button>
                  <button onClick={() => deleteSchoolStage(s.id)} className="p-1 rounded hover:bg-ink-100 text-ink-500 hover:text-red-600" title="Delete"><Icon name="trash-2" size={13} /></button>
                </div>
              </div>
            )
        ))}
      </div>
      {addOpen && (
        <SchoolStageRow stage={{ name: '', color: '#13315C' }}
          onSave={p => { addSchoolStage(p); setAddOpen(false); }}
          onCancel={() => setAddOpen(false)} isNew />
      )}
    </div>
  );
}

function SchoolStageRow({ stage, onSave, onCancel, isNew }) {
  const [name, setName] = React.useState(stage.name);
  const [color, setColor] = React.useState(stage.color || '#13315C');
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
      <div className="flex gap-2 justify-end">
        <Button size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button size="sm" variant="accent" icon="check" onClick={() => { if (name.trim()) onSave({ name, color }); }}>
          {isNew ? 'Add stage' : 'Save'}
        </Button>
      </div>
    </div>
  );
}

// ── Custom Statuses ───────────────────────────────────────────────────────────
function CustomStatusesTab() {
  const { stageStatuses, addStageStatus, updateStageStatus, deleteStageStatus } = useStore();
  const [editId, setEditId] = React.useState(null);
  const [addOpen, setAddOpen] = React.useState(false);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <SectionTitle title="Stage Statuses" subtitle="Used on school stage timeline. Built-in statuses cannot be deleted." className="!mb-0" />
        <Button size="sm" icon="plus" variant="accent" onClick={() => setAddOpen(true)}>Add Status</Button>
      </div>
      <div className="space-y-1">
        {(stageStatuses || []).map(s => (
          editId === s.id
            ? <StatusRow key={s.id} status={s} onSave={p => { updateStageStatus(s.id, p); setEditId(null); }} onCancel={() => setEditId(null)} />
            : (
              <div key={s.id} className="flex items-center gap-2 border border-soft rounded-md p-2.5">
                <div className="w-3 h-3 rounded-full shrink-0" style={{ background: s.color }} />
                <span className="text-sm flex-1 font-medium">{s.label}</span>
                {s.terminal && <Pill tone="ok">Terminal</Pill>}
                {s.builtin && <Pill tone="soft">Built-in</Pill>}
                <div className="flex gap-1">
                  <button onClick={() => setEditId(s.id)} className="p-1 rounded hover:bg-ink-100 text-ink-500" title="Edit"><Icon name="pencil" size={13} /></button>
                  {!s.builtin && <button onClick={() => deleteStageStatus(s.id)} className="p-1 rounded hover:bg-ink-100 text-ink-500 hover:text-red-600" title="Delete"><Icon name="trash-2" size={13} /></button>}
                </div>
              </div>
            )
        ))}
      </div>
      {addOpen && (
        <StatusRow status={{ label: '', color: '#64748B', terminal: false }}
          onSave={p => { addStageStatus(p); setAddOpen(false); }}
          onCancel={() => setAddOpen(false)} isNew />
      )}
    </div>
  );
}

function StatusRow({ status, onSave, onCancel, isNew }) {
  const [label, setLabel]   = React.useState(status.label);
  const [color, setColor]   = React.useState(status.color || '#64748B');
  const [terminal, setTerm] = React.useState(status.terminal || false);
  return (
    <div className="border border-accent rounded-md p-3 space-y-2 bg-accent-soft">
      <div className="grid grid-cols-3 gap-2">
        <div className="col-span-2">
          <label className="text-[11px] font-medium text-ink-700 mb-1 block">Status label</label>
          <TextField value={label} onChange={setLabel} placeholder="e.g. In Review" />
        </div>
        <div>
          <label className="text-[11px] font-medium text-ink-700 mb-1 block">Color</label>
          <input type="color" value={color} onChange={e => setColor(e.target.value)} className="w-full h-9 border border-ink-200 rounded-md cursor-pointer" />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input type="checkbox" checked={terminal} onChange={e => setTerm(e.target.checked)} className="rounded" />
        Terminal (marks stage as complete)
      </label>
      <div className="flex gap-2 justify-end">
        <Button size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button size="sm" variant="accent" icon="check" onClick={() => { if (label.trim()) onSave({ label, color, terminal }); }}>
          {isNew ? 'Add status' : 'Save'}
        </Button>
      </div>
    </div>
  );
}

// ── Custom Fields ─────────────────────────────────────────────────────────────
function CustomFieldsTab() {
  const { customFields, addCustomField, updateCustomField, deleteCustomField } = useStore();
  const [entity, setEntity] = React.useState('school');
  const [addOpen, setAddOpen] = React.useState(false);

  const fields = (customFields || {})[entity] || [];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <SectionTitle title="Custom Fields" className="!mb-0" />
          <Select value={entity} onChange={setEntity} options={[{value:'school',label:'Schools'},{value:'material',label:'Materials'}]} />
        </div>
        <Button size="sm" icon="plus" variant="accent" onClick={() => setAddOpen(true)}>Add Field</Button>
      </div>
      <div className="text-[11px] text-ink-500">Custom fields appear in create/edit forms and as optional columns in the list view.</div>
      <div className="space-y-1">
        {fields.map(f => (
          <div key={f.id} className="flex items-center gap-2 border border-soft rounded-md p-2.5">
            <Pill tone="soft">{f.type}</Pill>
            <span className="text-sm flex-1 font-medium">{f.label}</span>
            {f.required && <Pill tone="warn">Required</Pill>}
            {f.options && <span className="text-[11px] text-ink-500">{f.options.join(', ')}</span>}
            <button onClick={() => deleteCustomField(entity, f.id)} className="p-1 rounded hover:bg-ink-100 text-ink-500 hover:text-red-600" title="Delete"><Icon name="trash-2" size={13} /></button>
          </div>
        ))}
        {fields.length === 0 && <div className="text-xs text-ink-500 italic py-4 text-center">No custom fields for {entity}s yet.</div>}
      </div>
      {addOpen && <CustomFieldForm entity={entity} onSave={f => { addCustomField(entity, f); setAddOpen(false); }} onCancel={() => setAddOpen(false)} />}
    </div>
  );
}

function CustomFieldForm({ entity, onSave, onCancel }) {
  const [label, setLabel]     = React.useState('');
  const [type, setType]       = React.useState('text');
  const [required, setReq]    = React.useState(false);
  const [opts, setOpts]       = React.useState('');
  return (
    <div className="border border-accent rounded-md p-3 space-y-2 bg-accent-soft">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[11px] font-medium text-ink-700 mb-1 block">Field label</label>
          <TextField value={label} onChange={setLabel} placeholder="e.g. Meter Number" />
        </div>
        <div>
          <label className="text-[11px] font-medium text-ink-700 mb-1 block">Type</label>
          <Select value={type} onChange={setType} options={['text','number','date','dropdown','file']} className="w-full" />
        </div>
      </div>
      {type === 'dropdown' && (
        <div>
          <label className="text-[11px] font-medium text-ink-700 mb-1 block">Options (comma-separated)</label>
          <TextField value={opts} onChange={setOpts} placeholder="Option A, Option B, Option C" />
        </div>
      )}
      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input type="checkbox" checked={required} onChange={e => setReq(e.target.checked)} />
        Required field
      </label>
      <div className="flex gap-2 justify-end">
        <Button size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button size="sm" variant="accent" icon="check" onClick={() => {
          if (!label.trim()) return;
          onSave({ label, type, required, options: type === 'dropdown' ? opts.split(',').map(s=>s.trim()).filter(Boolean) : undefined });
        }}>Add field</Button>
      </div>
    </div>
  );
}

// ── Milestone Templates ────────────────────────────────────────────────────────
function MilestoneTemplatesTab() {
  const { milestoneTemplates, addMilestoneTemplate, updateMilestoneTemplate, deleteMilestoneTemplate, milestoneEntries, setMilestoneEntry } = useStore();
  const [expandedId, setExpandedId] = React.useState(null);
  const [addOpen, setAddOpen] = React.useState(false);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <SectionTitle title="Contractor Milestone Templates" className="!mb-0" />
          <p className="text-[11px] text-ink-500 mt-1">Define scoring milestones and their weights. Contractor performance scores auto-compute from these templates.</p>
        </div>
        <Button size="sm" icon="plus" variant="accent" onClick={() => setAddOpen(true)}>Add Template</Button>
      </div>
      <div className="space-y-2">
        {(milestoneTemplates || []).map(mt => (
          <div key={mt.id} className="border border-soft rounded-md overflow-hidden">
            <div className="flex items-center gap-3 p-3 cursor-pointer hover-row" onClick={() => setExpandedId(expandedId === mt.id ? null : mt.id)}>
              <div className="flex-1">
                <div className="text-sm font-semibold">{mt.name}</div>
                <div className="text-[11px] text-ink-500">Weight: {mt.weight}% · {mt.fields.length} fields</div>
              </div>
              <div className="w-24 h-3 rounded-full overflow-hidden bg-ink-100">
                <div style={{ width: `${mt.weight}%`, background: 'var(--accent)' }} className="h-full" />
              </div>
              <span className="text-xs num font-medium w-10 text-right">{mt.weight}%</span>
              <button onClick={e => { e.stopPropagation(); deleteMilestoneTemplate(mt.id); }} className="p-1 hover:bg-ink-100 rounded text-ink-500 hover:text-red-600"><Icon name="trash-2" size={13} /></button>
              <Icon name={expandedId === mt.id ? 'chevron-up' : 'chevron-down'} size={14} />
            </div>
            {expandedId === mt.id && (
              <div className="border-t border-soft p-3">
                <div className="text-[11px] font-medium text-ink-700 mb-2">Fields per milestone entry:</div>
                <div className="grid grid-cols-2 gap-1">
                  {mt.fields.map(f => (
                    <div key={f.id} className="flex items-center gap-2 text-xs p-1.5 border border-soft rounded">
                      <Pill tone="soft">{f.type}</Pill>
                      <span>{f.label}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 text-[11px] text-ink-500">
                  Entries from {CONTRACTORS.length} contractors recorded against this template.
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      {addOpen && (
        <AddMilestoneTemplateForm
          onSave={mt => { addMilestoneTemplate(mt); setAddOpen(false); }}
          onCancel={() => setAddOpen(false)} />
      )}
    </div>
  );
}

function AddMilestoneTemplateForm({ onSave, onCancel }) {
  const [name, setName]     = React.useState('');
  const [weight, setWeight] = React.useState(25);
  const [fields, setFields] = React.useState([{ id: 'f1', label: 'Score (0-100)', type: 'number' }]);

  const addField = () => setFields(fs => [...fs, { id: `f${Date.now()}`, label: '', type: 'text' }]);
  const updateField = (i, patch) => setFields(fs => fs.map((f, j) => j === i ? { ...f, ...patch } : f));
  const removeField = (i) => setFields(fs => fs.filter((_, j) => j !== i));

  return (
    <div className="border border-accent rounded-md p-4 space-y-3 bg-accent-soft">
      <div className="grid grid-cols-3 gap-2">
        <div className="col-span-2">
          <label className="text-[11px] font-medium text-ink-700 mb-1 block">Template name</label>
          <TextField value={name} onChange={setName} placeholder="e.g. Payment Received" />
        </div>
        <div>
          <label className="text-[11px] font-medium text-ink-700 mb-1 block">Weight (%)</label>
          <TextField value={weight} onChange={setWeight} type="number" />
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-[11px] font-medium text-ink-700">Fields</label>
          <Button size="sm" variant="ghost" icon="plus" onClick={addField}>Add field</Button>
        </div>
        <div className="space-y-1">
          {fields.map((f, i) => (
            <div key={f.id} className="flex gap-2 items-center">
              <TextField value={f.label} onChange={v => updateField(i, { label: v })} placeholder="Field label" className="flex-1" />
              <Select value={f.type} onChange={v => updateField(i, { type: v })} options={['text','number','date','file']} />
              <button onClick={() => removeField(i)} className="p-1 rounded hover:bg-ink-100 text-red-500"><Icon name="x" size={13} /></button>
            </div>
          ))}
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <Button size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button size="sm" variant="accent" icon="check" onClick={() => { if (name.trim()) onSave({ name, weight: +weight, fields }); }}>Add template</Button>
      </div>
    </div>
  );
}

// ── Users ─────────────────────────────────────────────────────────────────────
function UsersTab() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <SectionTitle title="Users" subtitle={`${PEOPLE.length} accounts`} className="!mb-0" />
        <Button icon="plus" variant="accent">Add User</Button>
      </div>
      <table className="w-full text-sm border border-soft rounded-md overflow-hidden">
        <thead className="surface-2 text-[11px] uppercase tracking-wider text-ink-500">
          <tr><th className="text-left px-3 py-2">Name</th><th className="text-left px-3 py-2">Role</th><th className="text-left px-3 py-2">Region</th><th className="text-left px-3 py-2">Status</th><th className="text-right px-3 py-2"></th></tr>
        </thead>
        <tbody>
          {PEOPLE.map(u => (
            <tr key={u.id} className="border-t border-soft hover-row">
              <td className="px-3 py-2"><div className="flex items-center gap-2"><Avatar initials={u.initials} size={22} /><span className="font-medium">{u.name}</span></div></td>
              <td className="px-3 py-2 text-xs">{u.role}</td>
              <td className="px-3 py-2 text-xs">{u.region}</td>
              <td className="px-3 py-2"><Pill tone="ok">Active</Pill></td>
              <td className="px-3 py-2 text-right">
                <div className="inline-flex items-center gap-1">
                  <button className="text-[11px] px-2 py-1 rounded hover:bg-ink-100">Reset PW</button>
                  <RowActions onEdit={() => {}} onArchive={() => {}} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RolesTab() {
  const sections = ['Dashboard','Projects','Materials','Financials','Contractors','Reports','Employees','Settings'];
  return (
    <div className="overflow-x-auto scrollbar-thin">
      <table className="w-full text-sm border border-soft rounded-md">
        <thead className="surface-2 text-[11px] uppercase tracking-wider text-ink-500">
          <tr>
            <th className="text-left px-3 py-2">Role</th>
            {sections.map(s => <th key={s} className="text-center px-3 py-2">{s}</th>)}
          </tr>
        </thead>
        <tbody>
          {ROLES.map((r, i) => (
            <tr key={r} className="border-t border-soft hover-row">
              <td className="px-3 py-2 font-medium">{r}</td>
              {sections.map((s, j) => {
                const isPgm = PROGRAM_MANAGER_GROUP.indexOf(r) !== -1;
                const checked = isPgm || r === 'VP'
                  || (r === 'Project Manager' && j !== 2 && j !== 3 && j !== 4 && j !== 7)  // no materials/financials/contractors/settings
                  || (r === 'Material planning' && (s === 'Materials' || s === 'Reports'))
                  || (r === 'Coordinator' && (s === 'Dashboard' || s === 'Projects' || s === 'Reports'));
                return <td key={s} className="px-3 py-2 text-center"><input type="checkbox" defaultChecked={checked} /></td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ProjectsTab({ currentUser }) {
  const { projects, addProject, deleteProject, logAudit } = useStore();
  const [addOpen, setAddOpen] = React.useState(false);
  const [confirmDel, setConfirmDel] = React.useState(null);
  const [toast, setToast] = React.useState(null);
  const canAdd = canCreateProject(currentUser);

  React.useEffect(() => {
    if (toast) { const t = setTimeout(() => setToast(null), 4000); return () => clearTimeout(t); }
  }, [toast]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <SectionTitle title="Projects" subtitle={`${projects.length} programs`} className="!mb-0" />
        {canAdd
          ? <Button icon="plus" variant="accent" onClick={() => setAddOpen(true)}>Add Project</Button>
          : <span className="text-[11px] text-ink-500 italic">Only Anas, Fasiulla, and Naif can create projects.</span>}
      </div>

      {toast && (
        <div className="rounded-md p-2.5 text-xs border bg-emerald-50 border-emerald-200 text-emerald-800">
          <span className="font-semibold">✓</span> {toast}
        </div>
      )}

      <div className="space-y-1">
        {projects.map(p => (
          <div key={p.id} className="flex items-center justify-between border border-soft rounded-md p-2.5">
            <div className="flex items-center gap-2">
              <Pill tone="soft">{p.type}</Pill>
              <span className="text-sm font-medium">{p.name}</span>
              <span className="text-[11px] text-ink-500">· {p.region}</span>
            </div>
            <div className="flex items-center gap-1">
              <button className="p-1 rounded hover:bg-ink-100 text-ink-500" title="Edit (read-only in demo)"><Icon name="pencil" size={13} /></button>
              {canAdd && (
                <button onClick={() => setConfirmDel(p)} className="p-1 rounded hover:bg-ink-100 text-ink-500 hover:text-red-600" title="Delete">
                  <Icon name="trash-2" size={13} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Reuses the global NewProjectModal exposed from page-dashboard.jsx */}
      {typeof NewProjectModal === 'function' && (
        <NewProjectModal open={addOpen} onClose={() => setAddOpen(false)} currentUser={currentUser}
          onCreate={data => {
            const p = addProject(data);
            if (p && logAudit && currentUser) logAudit({
              actorId: currentUser.id, actorName: currentUser.name, actorRole: currentUser.role,
              action: 'CREATE', entityType: 'project', entityId: p.id, entityLabel: p.name,
              summary: `Created project "${p.name}" in ${p.region}` + (p.value ? ` (SAR ${SAR(p.value)})` : ''),
            });
            setToast(`Project "${data.name}" created.`);
          }} />
      )}

      <Modal open={!!confirmDel} onClose={() => setConfirmDel(null)} title="Delete project (permanent)"
        footer={<>
          <Button variant="ghost" onClick={() => setConfirmDel(null)}>Cancel</Button>
          <Button variant="danger" icon="trash-2" onClick={() => {
            deleteProject(confirmDel.id);
            if (logAudit) logAudit({
              actorId: currentUser.id, actorName: currentUser.name, actorRole: currentUser.role,
              action: 'DELETE', entityType: 'project', entityId: confirmDel.id, entityLabel: confirmDel.name,
              summary: `Deleted project "${confirmDel.name}"`,
            });
            setToast(`Project "${confirmDel.name}" deleted.`);
            setConfirmDel(null);
          }}>Delete permanently</Button>
        </>}>
        <p className="text-sm">Permanently delete <strong>{confirmDel?.name}</strong>?</p>
        <p className="text-xs text-red-600 mt-2">This removes the project from the list. Existing schools assigned to this project will be orphaned.</p>
      </Modal>
    </div>
  );
}

function KPIsTab() {
  const [kpis, setKpis] = React.useState([
    { id: 'k1', name: 'Schedule Score',  target: 90, amber: 70, red: 50 },
    { id: 'k2', name: 'Quality Score',   target: 90, amber: 75, red: 60 },
    { id: 'k3', name: 'HSE Score',       target: 95, amber: 80, red: 65 },
    { id: 'k4', name: 'Documentation',   target: 90, amber: 75, red: 60 },
    { id: 'k5', name: 'Stage Wait Days', target: 5,  amber: 7,  red: 14 },
  ]);
  const [editId, setEditId] = React.useState(null);
  const [addOpen, setAddOpen] = React.useState(false);
  const [confirmDel, setConfirmDel] = React.useState(null);
  const [draft, setDraft] = React.useState({ name: '', target: 0, amber: 0, red: 0 });

  const startEdit = (k) => { setEditId(k.id); setDraft({ ...k }); };
  const saveEdit = () => { setKpis(ks => ks.map(k => k.id === editId ? { ...k, ...draft } : k)); setEditId(null); };
  const startAdd = () => { setDraft({ name: '', target: 0, amber: 0, red: 0 }); setAddOpen(true); };
  const saveAdd = () => {
    if (!draft.name.trim()) return;
    setKpis(ks => [...ks, { id: 'k' + Date.now(), ...draft, target: +draft.target, amber: +draft.amber, red: +draft.red }]);
    setAddOpen(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <SectionTitle title="KPIs" className="!mb-0" />
        <Button icon="plus" variant="accent" onClick={startAdd}>Add KPI</Button>
      </div>
      <table className="w-full text-sm border border-soft rounded-md">
        <thead className="surface-2 text-[11px] uppercase tracking-wider text-ink-500">
          <tr><th className="text-left px-3 py-2">KPI</th><th className="text-right px-3 py-2">Target</th><th className="text-right px-3 py-2">Amber</th><th className="text-right px-3 py-2">Red</th><th className="text-right px-3 py-2"></th></tr>
        </thead>
        <tbody>
          {kpis.map(k => editId === k.id ? (
            <tr key={k.id} className="border-t border-accent bg-accent-soft">
              <td className="px-3 py-2"><TextField value={draft.name} onChange={v => setDraft(d => ({ ...d, name: v }))} /></td>
              <td className="px-3 py-2"><TextField value={draft.target} onChange={v => setDraft(d => ({ ...d, target: +v }))} type="number" /></td>
              <td className="px-3 py-2"><TextField value={draft.amber} onChange={v => setDraft(d => ({ ...d, amber: +v }))} type="number" /></td>
              <td className="px-3 py-2"><TextField value={draft.red} onChange={v => setDraft(d => ({ ...d, red: +v }))} type="number" /></td>
              <td className="px-3 py-2 text-right">
                <div className="inline-flex gap-1">
                  <Button size="sm" variant="accent" icon="check" onClick={saveEdit}>Save</Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditId(null)}>Cancel</Button>
                </div>
              </td>
            </tr>
          ) : (
            <tr key={k.id} className="border-t border-soft hover-row">
              <td className="px-3 py-2 font-medium">{k.name}</td>
              <td className="px-3 py-2 text-right tnum">{k.target}</td>
              <td className="px-3 py-2 text-right tnum text-amber-600">{k.amber}</td>
              <td className="px-3 py-2 text-right tnum text-red-600">{k.red}</td>
              <td className="px-3 py-2 text-right">
                <div className="inline-flex gap-1">
                  <button onClick={() => startEdit(k)} className="p-1 rounded hover:bg-ink-100 text-ink-500" title="Edit"><Icon name="pencil" size={13} /></button>
                  <button onClick={() => setConfirmDel(k)} className="p-1 rounded hover:bg-ink-100 text-ink-500 hover:text-red-600" title="Delete"><Icon name="trash-2" size={13} /></button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add KPI"
        footer={<><Button variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Button>
          <Button variant="accent" icon="check" onClick={saveAdd}>Add KPI</Button></>}>
        <div className="space-y-3">
          <div><label className="text-[11px] font-medium text-ink-700 mb-1 block">Name</label>
            <TextField value={draft.name} onChange={v => setDraft(d => ({ ...d, name: v }))} placeholder="e.g. Energization Rate" /></div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className="text-[11px] font-medium text-ink-700 mb-1 block">Target</label>
              <TextField value={draft.target} onChange={v => setDraft(d => ({ ...d, target: +v }))} type="number" /></div>
            <div><label className="text-[11px] font-medium text-ink-700 mb-1 block">Amber</label>
              <TextField value={draft.amber} onChange={v => setDraft(d => ({ ...d, amber: +v }))} type="number" /></div>
            <div><label className="text-[11px] font-medium text-ink-700 mb-1 block">Red</label>
              <TextField value={draft.red} onChange={v => setDraft(d => ({ ...d, red: +v }))} type="number" /></div>
          </div>
        </div>
      </Modal>
      <Modal open={!!confirmDel} onClose={() => setConfirmDel(null)} title="Delete KPI"
        footer={<><Button variant="ghost" onClick={() => setConfirmDel(null)}>Cancel</Button>
          <Button variant="danger" icon="trash-2" onClick={() => { setKpis(ks => ks.filter(x => x.id !== confirmDel.id)); setConfirmDel(null); }}>Delete</Button></>}>
        <p className="text-sm">Delete KPI <strong>{confirmDel?.name}</strong>?</p>
      </Modal>
    </div>
  );
}

function BrandingTab() {
  const [colors, setColors] = React.useState({
    'Primary': '#0B2545', 'Primary 2': '#13315C', 'Accent': '#B8860B', 'Industrial Red': '#C8102E',
  });
  const [logoName, setLogoName] = React.useState(null);
  const [toast, setToast] = React.useState(null);
  const fileRef = React.useRef(null);

  React.useEffect(() => { if (toast) { const t = setTimeout(() => setToast(null), 4000); return () => clearTimeout(t); } }, [toast]);

  const onPickLogo = (e) => {
    const f = e.target.files?.[0];
    if (f) { setLogoName(f.name); setToast(`Logo "${f.name}" uploaded (demo).`); e.target.value = ''; }
  };
  const setColor = (n, v) => { setColors(c => ({ ...c, [n]: v })); setToast(`${n} color updated to ${v}.`); };

  return (
    <div className="space-y-3">
      {toast && <div className="rounded-md p-2.5 text-xs border bg-emerald-50 border-emerald-200 text-emerald-800"><span className="font-semibold">✓</span> {toast}</div>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <SectionTitle title="Logo" />
          <input type="file" ref={fileRef} accept="image/*" className="hidden" onChange={onPickLogo} />
          <button onClick={() => fileRef.current?.click()}
            className="w-full border-2 border-dashed border-soft hover:border-accent rounded-md p-8 text-center text-xs text-ink-500 transition">
            <Icon name="upload" size={20} />
            <div className="mt-1">{logoName ? <span className="text-emerald-700 font-semibold">{logoName}</span> : 'Click to upload SVG or PNG'}</div>
          </button>
        </div>
        <div>
          <SectionTitle title="Colors" />
          <div className="space-y-2">
            {Object.entries(colors).map(([n, c]) => (
              <div key={n} className="flex items-center justify-between border border-soft rounded-md p-2">
                <div className="flex items-center gap-2">
                  <input type="color" value={c} onChange={e => setColor(n, e.target.value)}
                    className="w-7 h-7 border border-ink-200 rounded cursor-pointer" />
                  <span className="text-sm">{n}</span>
                </div>
                <span className="text-xs tnum text-ink-500">{c}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function NotificationsTab({ currentUser }) {
  const { logAudit, pushNotif } = useStore();
  const EVENT_TYPES = [
    { id: 'escalation_created', label: 'Escalation created' },
    { id: 'task_assigned',      label: 'Task assigned' },
    { id: 'task_overdue',       label: 'Task overdue' },
    { id: 'stage_status_change',label: 'Stage status change' },
    { id: 'schedule_overdue',   label: 'Schedule overdue' },
    { id: 'payment_received',   label: 'Payment received' },
    { id: 'school_energized',   label: 'School energized' },
    { id: 'report_ready',       label: 'Report ready' },
    { id: 'document_uploaded',  label: 'Document uploaded' },
  ];
  const RECIPIENT_ROLES = ['VP', 'Manager', 'Operations Manager', 'Program Manager', 'Project Manager', 'Material planning', 'Coordinator'];

  // Per-event rule config: { eventId: { email, inapp, sms, recipients: [], throttle: 'immediate'|'daily', template: '' } }
  const initial = React.useMemo(() => {
    const out = {};
    EVENT_TYPES.forEach((e, i) => {
      out[e.id] = {
        email: i % 2 === 0,
        inapp: true,
        sms: i === 2,
        recipients: ['Manager','Program Manager'],
        throttle: 'immediate',
        template: `[${e.label}] {actor} on {entity} at {timestamp}`,
      };
    });
    return out;
  }, []);
  const [rules, setRules] = React.useState(initial);
  const [editEventId, setEditEventId] = React.useState(null);
  const [toast, setToast] = React.useState(null);

  React.useEffect(() => {
    if (toast) { const t = setTimeout(() => setToast(null), 5000); return () => clearTimeout(t); }
  }, [toast]);

  const updateRule = (eid, patch) => setRules(r => ({ ...r, [eid]: { ...r[eid], ...patch } }));

  const saveRule = (eid) => {
    const r = rules[eid];
    const event = EVENT_TYPES.find(x => x.id === eid);
    if (logAudit && currentUser) logAudit({
      actorId: currentUser.id, actorName: currentUser.name, actorRole: currentUser.role,
      action: 'UPDATE', entityType: 'notification_rule', entityId: eid, entityLabel: event.label,
      summary: `Saved notification rule for "${event.label}" — channels: ${[r.email && 'email', r.inapp && 'in-app', r.sms && 'sms'].filter(Boolean).join('/')} → ${r.recipients.join(', ')} (${r.throttle})`,
    });
    setEditEventId(null);
    setToast(`Saved rule for "${event.label}".`);
  };

  const testSend = (eid) => {
    const event = EVENT_TYPES.find(x => x.id === eid);
    const r = rules[eid];
    const channels = [r.email && 'email', r.inapp && 'in-app', r.sms && 'sms'].filter(Boolean).join(' + ');
    // Push an in-app notification immediately so the bell shows it
    if (pushNotif) pushNotif({
      kind: 'reminder',
      text: `TEST — ${event.label}: would notify ${r.recipients.join(' & ')} via ${channels}`,
      target: { kind: 'project', id: PROJECTS[0]?.id },
    });
    if (logAudit && currentUser) logAudit({
      actorId: currentUser.id, actorName: currentUser.name, actorRole: currentUser.role,
      action: 'CREATE', entityType: 'notification_test', entityId: 'test-' + eid + '-' + Date.now(),
      entityLabel: event.label,
      summary: `Test notification sent — "${event.label}" via ${channels} to ${r.recipients.join(', ')} (no real email — demo mode)`,
    });
    setToast(`Test notification queued for "${event.label}" — see Audit Log + bell icon.`);
  };

  return (
    <div className="space-y-3">
      <SectionTitle title="Notifications" subtitle="Configure rules per event type. Save persists for the session." className="!mb-0" />

      <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-xs text-amber-900">
        <div className="font-semibold flex items-center gap-1 mb-1"><Icon name="info" size={13} /> Demo mode</div>
        Email and SMS rules below are configured here, but <strong>actual sending requires a backend integration</strong> (SendGrid / AWS SES / Mailgun / Twilio) to be wired up in production.
        The Audit Log will record every notification that <strong>would have been sent</strong>, and the in-app bell icon shows the live notification immediately when you click "Send test".
      </div>

      {toast && (
        <div className="rounded-md p-2.5 text-xs border bg-emerald-50 border-emerald-200 text-emerald-800">
          <span className="font-semibold">✓</span> {toast}
        </div>
      )}

      <div className="border border-soft rounded-md overflow-hidden">
        <table className="w-full text-sm">
          <thead className="surface-2 text-[11px] uppercase tracking-wider text-ink-500">
            <tr>
              <th className="text-left px-3 py-2">Event</th>
              <th className="text-center px-3 py-2">Email</th>
              <th className="text-center px-3 py-2">In-app</th>
              <th className="text-center px-3 py-2">SMS</th>
              <th className="text-left px-3 py-2">Recipients</th>
              <th className="text-left px-3 py-2">Throttle</th>
              <th className="text-right px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {EVENT_TYPES.map(e => {
              const r = rules[e.id];
              const editing = editEventId === e.id;
              return (
                <React.Fragment key={e.id}>
                  <tr className="border-t border-soft hover-row">
                    <td className="px-3 py-2 font-medium">{e.label}</td>
                    <td className="px-3 py-2 text-center"><input type="checkbox" checked={r.email} onChange={ev => updateRule(e.id, { email: ev.target.checked })} /></td>
                    <td className="px-3 py-2 text-center"><input type="checkbox" checked={r.inapp} onChange={ev => updateRule(e.id, { inapp: ev.target.checked })} /></td>
                    <td className="px-3 py-2 text-center"><input type="checkbox" checked={r.sms} onChange={ev => updateRule(e.id, { sms: ev.target.checked })} /></td>
                    <td className="px-3 py-2 text-xs text-ink-500">{r.recipients.join(', ') || '—'}</td>
                    <td className="px-3 py-2 text-xs">{r.throttle}</td>
                    <td className="px-3 py-2 text-right">
                      <div className="inline-flex gap-1">
                        <Button size="sm" variant="outline" icon="bell" onClick={() => testSend(e.id)}>Send test</Button>
                        <Button size="sm" variant="ghost" icon="pencil" onClick={() => setEditEventId(editing ? null : e.id)}>{editing ? 'Hide' : 'Edit'}</Button>
                      </div>
                    </td>
                  </tr>
                  {editing && (
                    <tr className="bg-ink-50">
                      <td colSpan="7" className="px-6 py-3">
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className="text-[10px] uppercase tracking-wider text-ink-500 mb-1 block">Recipient roles</label>
                            <div className="space-y-1">
                              {RECIPIENT_ROLES.map(role => (
                                <label key={role} className="flex items-center gap-2 text-xs">
                                  <input type="checkbox" checked={r.recipients.includes(role)}
                                    onChange={ev => updateRule(e.id, {
                                      recipients: ev.target.checked ? [...r.recipients, role] : r.recipients.filter(x => x !== role),
                                    })} />
                                  {role}
                                </label>
                              ))}
                            </div>
                          </div>
                          <div>
                            <label className="text-[10px] uppercase tracking-wider text-ink-500 mb-1 block">Throttle</label>
                            <Select value={r.throttle} onChange={v => updateRule(e.id, { throttle: v })}
                              options={[{value:'immediate',label:'Immediate'},{value:'daily',label:'Daily digest'}]} className="w-full" />
                          </div>
                          <div>
                            <label className="text-[10px] uppercase tracking-wider text-ink-500 mb-1 block">Template (rich-text)</label>
                            <textarea value={r.template} onChange={ev => updateRule(e.id, { template: ev.target.value })} rows={3}
                              placeholder="Use {actor}, {entity}, {timestamp} placeholders"
                              className="w-full px-2.5 py-1.5 text-xs rounded-md border border-ink-200 bg-white" />
                          </div>
                        </div>
                        <div className="flex justify-end gap-2 mt-3">
                          <Button size="sm" variant="ghost" onClick={() => setEditEventId(null)}>Cancel</Button>
                          <Button size="sm" variant="accent" icon="check" onClick={() => saveRule(e.id)}>Save rule</Button>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AuditTab() {
  const { auditLog } = useStore();
  const log = auditLog || [];
  const [q, setQ] = React.useState('');
  const [actor, setActor]   = React.useState('all');
  const [action, setAction] = React.useState('all');
  const [entity, setEntity] = React.useState('all');
  const [fromDate, setFrom] = React.useState('');
  const [toDate, setTo]     = React.useState('');
  const [expanded, setExpanded] = React.useState({});

  const actors = Array.from(new Set(log.map(l => l.actorId))).map(id => {
    const e = log.find(l => l.actorId === id);
    return { id, name: e?.actorName || id };
  });
  const actions  = Array.from(new Set(log.map(l => l.action)));
  const entities = Array.from(new Set(log.map(l => l.entityType)));

  const filtered = log.filter(l => {
    if (q) {
      const ql = q.toLowerCase();
      const blob = [l.summary, l.entityLabel, l.entityId, l.actorName].join(' ').toLowerCase();
      if (!blob.includes(ql)) return false;
    }
    if (actor !== 'all' && l.actorId !== actor) return false;
    if (action !== 'all' && l.action !== action) return false;
    if (entity !== 'all' && l.entityType !== entity) return false;
    if (fromDate && l.timestamp < fromDate) return false;
    if (toDate && l.timestamp > toDate + 'T23:59:59') return false;
    return true;
  });

  const exportXlsx = async () => {
    if (typeof window.loadXLSX === 'function') { await window.loadXLSX(); }
    if (!window.XLSX || !window.XLSX.utils || !window.XLSX.utils.book_new) return;
    const rows = filtered.map(l => [l.timestamp, l.actorName, l.actorRole, l.action, l.entityType, l.entityId, l.entityLabel, l.before || '', l.after || '', l.summary]);
    const headers = ['Timestamp','Actor','Role','Action','Entity type','Entity ID','Entity label','Before','After','Summary'];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    XLSX.utils.book_append_sheet(wb, ws, 'Audit Log');
    XLSX.writeFile(wb, `audit_log_export-${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  const actionTone = (a) => ({
    CREATE: 'ok', UPDATE: 'info', DELETE: 'danger',
    IMPORT: 'gold', EXPORT: 'gold', LOGIN: 'soft', LOGOUT: 'soft',
  })[a] || 'soft';

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <SectionTitle title="Audit Log" subtitle={`${log.length.toLocaleString()} events recorded (${filtered.length.toLocaleString()} match filters)`} className="!mb-0" />
        </div>
        <Button variant="accent" icon="file-spreadsheet" onClick={exportXlsx}>Export to Excel</Button>
      </div>

      <div className="flex flex-wrap gap-2 items-end bg-ink-50 border border-soft rounded-md p-3">
        <div className="flex-1 min-w-[240px]">
          <label className="text-[10px] uppercase tracking-wider text-ink-500 mb-1 block">Search</label>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search summary, entity, actor…"
            className="w-full px-2.5 py-1.5 text-sm rounded-md border border-ink-200 bg-white focus:outline-none focus:ring-2 ring-accent" />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wider text-ink-500 mb-1 block">Actor</label>
          <Select value={actor} onChange={setActor} options={[{value:'all',label:'All actors'}, ...actors.map(a => ({value:a.id,label:a.name}))]} />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wider text-ink-500 mb-1 block">Action</label>
          <Select value={action} onChange={setAction} options={[{value:'all',label:'All actions'}, ...actions.map(a => ({value:a,label:a}))]} />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wider text-ink-500 mb-1 block">Entity</label>
          <Select value={entity} onChange={setEntity} options={[{value:'all',label:'All entities'}, ...entities.map(e => ({value:e,label:e}))]} />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wider text-ink-500 mb-1 block">From</label>
          <input type="date" value={fromDate} onChange={e => setFrom(e.target.value)}
            className="px-2.5 py-1.5 text-sm rounded-md border border-ink-200 bg-white" />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wider text-ink-500 mb-1 block">To</label>
          <input type="date" value={toDate} onChange={e => setTo(e.target.value)}
            className="px-2.5 py-1.5 text-sm rounded-md border border-ink-200 bg-white" />
        </div>
      </div>

      <div className="border border-soft rounded-md overflow-auto scrollbar-thin" style={{ maxHeight: '60vh' }}>
        <table className="w-full text-sm">
          <thead className="surface-2 text-[11px] uppercase tracking-wider text-ink-500 sticky top-0">
            <tr>
              <th className="text-left px-3 py-2">Timestamp</th>
              <th className="text-left px-3 py-2">Actor</th>
              <th className="text-left px-3 py-2">Action</th>
              <th className="text-left px-3 py-2">Entity</th>
              <th className="text-left px-3 py-2">Summary</th>
              <th className="text-right px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 500).map(l => {
              const ts = new Date(l.timestamp);
              const tsStr = ts.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
              const exp = expanded[l.id];
              return (
                <React.Fragment key={l.id}>
                  <tr className="border-t border-soft hover-row">
                    <td className="px-3 py-1.5 text-[11px] font-mono text-ink-700 whitespace-nowrap">{tsStr}</td>
                    <td className="px-3 py-1.5 text-xs">
                      <div className="font-medium">{l.actorName}</div>
                      <div className="text-[10px] text-ink-500">{l.actorRole}</div>
                    </td>
                    <td className="px-3 py-1.5"><Pill tone={actionTone(l.action)}>{l.action}</Pill></td>
                    <td className="px-3 py-1.5 text-xs">
                      <div className="font-medium">{l.entityType}</div>
                      <div className="text-[10px] text-ink-500 truncate max-w-[160px]">{l.entityLabel}</div>
                    </td>
                    <td className="px-3 py-1.5 text-xs">{l.summary}</td>
                    <td className="px-3 py-1.5 text-right">
                      {(l.before || l.after) && (
                        <button onClick={() => setExpanded(e => ({ ...e, [l.id]: !e[l.id] }))}
                          className="text-[11px] px-2 py-0.5 rounded hover:bg-ink-100 text-ink-500">
                          {exp ? 'Hide diff' : 'Show diff'}
                        </button>
                      )}
                    </td>
                  </tr>
                  {exp && (l.before || l.after) && (
                    <tr className="bg-ink-50">
                      <td colSpan="6" className="px-6 py-2 text-xs">
                        <div className="flex gap-6">
                          <div><span className="text-ink-500">Before:</span> <code className="bg-white border border-soft px-1.5 py-0.5 rounded">{String(l.before || '—')}</code></div>
                          <div><span className="text-ink-500">After:</span> <code className="bg-white border border-soft px-1.5 py-0.5 rounded">{String(l.after || '—')}</code></div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan="6" className="text-center py-8 text-xs text-ink-500 italic">No audit entries match the filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {filtered.length > 500 && (
        <div className="text-[11px] text-ink-500 italic">Showing first 500 of {filtered.length.toLocaleString()} matching entries. Narrow your filters or export to see all.</div>
      )}
    </div>
  );
}

Object.assign(window, { PageSettings });
