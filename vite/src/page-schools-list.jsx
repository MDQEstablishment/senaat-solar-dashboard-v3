import React from 'react';
// Schools list — Zamil Round 6
// FIX 2: No pagination - all schools visible, scrollable.
// FIX 8: Exact columns - School ID | Name (EN + AR) | Level/Gender | City | SEC Meter | Contractor (inline edit) | Status | Remark | Actions
// FIX 9: Stages view toggle - alternate wide layout with legacy 12-stage checkmark columns

function AddSchoolModal({ open, onClose, onSave, project, validateSchool }) {
  const [form, setForm] = React.useState({
    id: '', nameAr: '', nameEn: '', level: 'Primary', gender: 'Boys',
    city: project?.city || '', region: project?.region || '',
    coords: '', meter: '', account: '', survey: '', kw: 100, contractor: '',
  });
  const [errors, setErrors] = React.useState({});
  const [conflict, setConflict] = React.useState(null);

  React.useEffect(() => {
    if (open) {
      setForm({
        id: '', nameAr: '', nameEn: '', level: 'Primary', gender: 'Boys',
        city: project?.city || '', region: project?.region || '',
        coords: '', meter: '', account: '', survey: '', kw: 100, contractor: '',
      });
      setErrors({}); setConflict(null);
    }
  }, [open]);

  const tryValidate = () => {
    setErrors({}); setConflict(null);
    if (!form.id.trim()) { setErrors({ id: 'School ID is required' }); return null; }
    if (!form.nameEn.trim() && !form.nameAr.trim()) { setErrors({ nameEn: 'School name required' }); return null; }
    const v = validateSchool({ id: form.id.trim(), meter: form.meter.trim() });
    if (!v.ok) {
      if (v.error === 'dup-id') {
        setErrors({ id: true });
        setConflict({ msg: `School ID '${form.id}' already exists in ${getProject(v.conflictWith.projectId)?.name || 'another project'} (${v.conflictWith.code}).`, school: v.conflictWith });
      } else if (v.error === 'dup-meter') {
        setErrors({ meter: true });
        setConflict({ msg: `SEC Meter NO. '${form.meter}' already exists in ${getProject(v.conflictWith.projectId)?.name || 'another project'} (${v.conflictWith.code}).`, school: v.conflictWith });
      }
      return null;
    }
    return v;
  };

  const submit = () => {
    if (!tryValidate()) return;
    onSave({ ...form, projectId: project.id });
    onClose();
  };

  if (!open) return null;
  const errCls = (k) => errors[k] ? 'border-red-500 ring-1 ring-red-500' : 'border-ink-200';

  return (
    <Modal open={open} onClose={onClose} title={`Add School to ${project?.name}`} wide
      footer={<>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="accent" icon="check" onClick={submit}>Add school</Button>
      </>}>
      <div className="space-y-3">
        {conflict && (
          <div className="bg-red-50 border border-red-300 rounded-md p-3 text-xs text-red-800">
            <div className="font-semibold flex items-center gap-1"><Icon name="alert-circle" size={13} /> Duplicate detected</div>
            <div className="mt-1">{conflict.msg}</div>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-medium text-ink-700 mb-1 block">School ID *</label>
            <input value={form.id} onChange={e => setForm(f => ({ ...f, id: e.target.value }))}
              placeholder="SS-ZAM-???-1234" className={`w-full px-2.5 py-1.5 text-sm rounded-md border bg-white focus:outline-none focus:ring-2 ring-accent ${errCls('id')}`} />
            {typeof errors.id === 'string' && <div className="text-[10px] text-red-600 mt-0.5">{errors.id}</div>}
          </div>
          <div>
            <label className="text-[11px] font-medium text-ink-700 mb-1 block">SEC Meter NO. *</label>
            <input value={form.meter} onChange={e => setForm(f => ({ ...f, meter: e.target.value }))}
              placeholder="KFM2020..." className={`w-full px-2.5 py-1.5 text-sm rounded-md border bg-white focus:outline-none focus:ring-2 ring-accent ${errCls('meter')}`} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-medium text-ink-700 mb-1 block">School Name (English)</label>
            <TextField value={form.nameEn} onChange={v => setForm(f => ({ ...f, nameEn: v }))} placeholder="e.g. Al-Faisal Primary School" />
          </div>
          <div>
            <label className="text-[11px] font-medium text-ink-700 mb-1 block">School Name (Arabic)</label>
            <input dir="rtl" value={form.nameAr} onChange={e => setForm(f => ({ ...f, nameAr: e.target.value }))}
              placeholder="اسم المدرسة" className="w-full px-2.5 py-1.5 text-sm rounded-md border border-ink-200 bg-white focus:outline-none focus:ring-2 ring-accent" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div><label className="text-[11px] font-medium text-ink-700 mb-1 block">Level</label>
            <Select value={form.level} onChange={v => setForm(f => ({ ...f, level: v }))} options={['Primary','Intermediate','Secondary']} className="w-full" /></div>
          <div><label className="text-[11px] font-medium text-ink-700 mb-1 block">Gender</label>
            <Select value={form.gender} onChange={v => setForm(f => ({ ...f, gender: v }))} options={['Boys','Girls']} className="w-full" /></div>
          <div><label className="text-[11px] font-medium text-ink-700 mb-1 block">kWp</label>
            <TextField value={form.kw} onChange={v => setForm(f => ({ ...f, kw: +v }))} type="number" /></div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div><label className="text-[11px] font-medium text-ink-700 mb-1 block">Region</label>
            <TextField value={form.region} onChange={v => setForm(f => ({ ...f, region: v }))} /></div>
          <div><label className="text-[11px] font-medium text-ink-700 mb-1 block">City</label>
            <TextField value={form.city} onChange={v => setForm(f => ({ ...f, city: v }))} /></div>
          <div><label className="text-[11px] font-medium text-ink-700 mb-1 block">GPS (lat, lng)</label>
            <TextField value={form.coords} onChange={v => setForm(f => ({ ...f, coords: v }))} placeholder="24.71, 46.67" /></div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div><label className="text-[11px] font-medium text-ink-700 mb-1 block">SEC Account NO.</label>
            <TextField value={form.account} onChange={v => setForm(f => ({ ...f, account: v }))} /></div>
          <div><label className="text-[11px] font-medium text-ink-700 mb-1 block">Survey Date</label>
            <TextField value={form.survey} onChange={v => setForm(f => ({ ...f, survey: v }))} type="date" /></div>
          <div><label className="text-[11px] font-medium text-ink-700 mb-1 block">Contractor</label>
            <Select value={form.contractor} onChange={v => setForm(f => ({ ...f, contractor: v }))}
              options={[{value:'',label:'— Unassigned —'}, ...CONTRACTORS.map(c => ({ value: c.id, label: c.name }))]} className="w-full" /></div>
        </div>
      </div>
    </Modal>
  );
}

function ImportSchoolsModal({ open, onClose }) {
  const [done, setDone] = React.useState(false);
  const [importing, setImporting] = React.useState(false);
  React.useEffect(() => { if (open) setDone(false); }, [open]);

  const downloadTemplate = () => {
    const headers = ['Project','School ID','School Name (Arabic)','School Name (English)','School Level','School Gender','Region','City','School Coordinates','SEC Meter NO.','SEC Account NO.','Survey Completion Date'];
    const sample  = ['Dammam-1','SS-ZAM-DAM-9999','مدرسة تجريبية','Sample School','Primary','Boys','Dammam','Dammam','26.37,50.04','KFM-NEW-9999','10001234567','2026-05-01'];
    if (window.XLSX) {
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet([headers, sample]);
      XLSX.utils.book_append_sheet(wb, ws, 'Schools');
      XLSX.writeFile(wb, 'schools-import-template.xlsx');
    }
  };
  const handleImport = () => { setImporting(true); setTimeout(() => { setImporting(false); setDone(true); }, 1200); };

  return (
    <Modal open={open} onClose={onClose} title="Import Schools — Master Daily Report format"
      footer={<>
        <Button variant="ghost" onClick={onClose}>Close</Button>
        {!done && <Button variant="accent" icon="upload" onClick={handleImport} disabled={importing}>{importing ? 'Importing…' : 'Import'}</Button>}
      </>}>
      <div className="space-y-4">
        <div className="bg-sky-50 border border-sky-200 rounded-md p-3 text-xs text-sky-800">
          <div className="font-semibold mb-1">Master Daily Report format</div>
          <ol className="list-decimal list-inside space-y-1">
            <li>Download the template (matches Master Daily Report columns)</li>
            <li>Fill in school rows. Duplicates (School ID + SEC Meter) will be rejected.</li>
            <li>Upload — preview before confirming.</li>
          </ol>
        </div>
        <Button variant="outline" icon="file-spreadsheet" onClick={downloadTemplate}>Download template (.xlsx)</Button>
        {!done ? (
          <div className="border-2 border-dashed border-soft rounded-md p-8 text-center text-xs text-ink-500">
            <Icon name="upload" size={20} />
            <div className="mt-2 font-medium">Drop XLSX/CSV file here or click to browse</div>
          </div>
        ) : (
          <div className="bg-emerald-50 border border-emerald-200 rounded-md p-4 text-sm text-emerald-800 text-center">
            <Icon name="check-circle" size={20} />
            <div className="mt-1 font-semibold">Import complete (demo)</div>
          </div>
        )}
      </div>
    </Modal>
  );
}

// R17 hotfix: Stages view now renders the 18 School Execution Stages from data.jsx
// (was previously the legacy 12 project-lifecycle milestones — financial/contractual
// phases that don't belong on a per-school construction-progress grid).

function PageSchoolsList({ project, onBack, onOpenSchool, onAddTask, currentUser }) {
  const { schools, addSchool, deleteSchool, validateSchool, updateSchool, logAudit } = useStore();
  const projSchools = React.useMemo(() => schools.filter(s => s.projectId === project.id), [schools, project.id]);

  const [q, setQ] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('all');
  const [remarkFilter, setRemarkFilter] = React.useState('all');
  const [cityFilter, setCityFilter]     = React.useState('all');
  const [addOpen, setAddOpen]           = React.useState(false);
  const [importOpen, setImportOpen]     = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(null);
  const [view, setView] = React.useState('compact'); // 'compact' | 'stages'

  const canAdd = currentUser && PROGRAM_MANAGER_GROUP.indexOf(currentUser.role) !== -1;
  const cities = React.useMemo(() => Array.from(new Set(projSchools.map(s => s.city).filter(Boolean))), [projSchools]);

  const filtered = React.useMemo(() => projSchools.filter(s => {
    if (q) {
      const ql = q.toLowerCase();
      const blob = [s.id, s.nameEn, s.nameAr, s.meter, s.account, s.region, s.city,
                    (CONTRACTORS.find(c => c.id === s.contractor) || {}).name || ''].join(' ').toLowerCase();
      if (!blob.includes(ql)) return false;
    }
    if (statusFilter !== 'all' && s.status !== statusFilter) return false;
    if (remarkFilter !== 'all' && s.remark !== remarkFilter) return false;
    if (cityFilter   !== 'all' && s.city !== cityFilter) return false;
    return true;
  }), [projSchools, q, statusFilter, remarkFilter, cityFilter]);

  // R18 #2: project-detail export now uses the shared 18-stage workbook builder
  // (same one as Reports tab → Export Report) so column structure stays identical
  // across both call sites. Workbook covers identity + 18 stage date columns,
  // scoped to the filtered school set on screen.
  const exportToExcel = async () => {
    const built = window.buildSchoolStagesAOA(filtered, { includeData: true });
    const safeName = (project.name || project.tag || project.id).replace(/[^A-Za-z0-9._-]+/g, '_');
    const filename = `${safeName}_schools_stages_${new Date().toISOString().slice(0, 10)}.xlsx`;
    await window.writeSchoolStagesWorkbook(built, filename, { sheetName: project.tag || 'Schools' });
  };

  const completed = projSchools.filter(s => s.status === 'Completed').length;
  const inProg    = projSchools.filter(s => s.status === 'In Progress').length;
  const notStart  = projSchools.filter(s => s.status === 'Not Started').length;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" icon="arrow-left" onClick={onBack}>Back</Button>
        <div>
          <h1 className="text-lg font-semibold">{project.name}</h1>
          <div className="text-xs text-ink-500">All schools · {projSchools.length} records · {project.region}</div>
        </div>
        <div className="flex-1" />
        <div className="flex border border-soft rounded-md overflow-hidden">
          <button onClick={() => setView('compact')} className={cls('px-3 py-1.5 text-xs', view === 'compact' ? 'bg-navy-900 text-white' : 'text-ink-700 hover:bg-ink-100')}>Compact view</button>
          <button onClick={() => setView('stages')} className={cls('px-3 py-1.5 text-xs', view === 'stages' ? 'bg-navy-900 text-white' : 'text-ink-700 hover:bg-ink-100')}>Stages view</button>
        </div>
        <Button variant="outline" icon="plus" onClick={() => onAddTask({ projectId: project.id })}>Add task</Button>
        {canAdd && <Button variant="outline" icon="upload" onClick={() => setImportOpen(true)}>Import Schools</Button>}
        {canAdd && <Button variant="outline" icon="plus" onClick={() => setAddOpen(true)}>Add School</Button>}
        <Button variant="accent" icon="file-spreadsheet" onClick={exportToExcel}>Export to Excel</Button>
      </div>

      {!canAdd && (
        <div className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-md p-2.5">
          Only Manager / Operations Manager / Program Manager can add or import schools.
        </div>
      )}

      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total schools', value: projSchools.length },
          { label: 'Completed',     value: completed,  tone: 'text-emerald-600' },
          { label: 'In progress',   value: inProg,     tone: 'text-sky-600' },
          { label: 'Not started',   value: notStart,   tone: 'text-ink-500' },
        ].map(k => (
          <Card key={k.label} padding="p-4">
            <div className="text-[11px] uppercase tracking-wider text-ink-500">{k.label}</div>
            <div className={cls('text-2xl font-bold mt-1 num', k.tone || '')}>{k.value}</div>
          </Card>
        ))}
      </div>

      <Card padding="p-3">
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-500"><Icon name="search" size={14} /></span>
            <input value={q} onChange={e => setQ(e.target.value)}
              placeholder="Search name (AR/EN), ID, meter, account, contractor, city…"
              className="pl-8 pr-3 py-1.5 text-sm rounded-md border border-ink-200 bg-white w-96 focus:outline-none focus:ring-2 ring-accent" />
          </div>
          <Select value={statusFilter} onChange={setStatusFilter}
            options={[{ value: 'all', label: 'All status' }, ...STATUS_VALUES.map(s => ({ value: s, label: s }))]} />
          <Select value={remarkFilter} onChange={setRemarkFilter}
            options={[{ value: 'all', label: 'All remarks' }, ...REMARKS.map(r => ({ value: r, label: r }))]} />
          <Select value={cityFilter} onChange={setCityFilter}
            options={[{ value: 'all', label: 'All cities' }, ...cities.map(c => ({ value: c, label: c }))]} />
          <div className="ml-auto text-xs text-ink-500">{filtered.length} of {projSchools.length} schools</div>
        </div>
      </Card>

      {view === 'compact' ? (
        <SchoolsCompactTable rows={filtered} canAdd={canAdd}
          onOpen={onOpenSchool} onDelete={setConfirmDelete}
          onContractorChange={(id, c) => updateSchool(id, { contractor: c })} />
      ) : (
        <SchoolsStagesTable rows={filtered} onOpen={onOpenSchool} />
      )}

      <AddSchoolModal open={addOpen} onClose={() => setAddOpen(false)}
        onSave={data => {
          const r = addSchool(data);
          if (r && r.ok === false) { console.warn('add failed', r); return; }
          if (r && r.ok && logAudit && currentUser) logAudit({
            actorId: currentUser.id, actorName: currentUser.name, actorRole: currentUser.role,
            action: 'CREATE', entityType: 'school', entityId: r.school.id, entityLabel: r.school.id + ' · ' + (r.school.nameEn || r.school.name),
            summary: `Created school ${r.school.id} (${r.school.nameEn || r.school.name}) in ${getProject(r.school.projectId)?.name || 'project'}`,
          });
        }}
        project={project} validateSchool={validateSchool} />
      <ImportSchoolsModal open={importOpen} onClose={() => setImportOpen(false)} />

      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Delete school (permanent)"
        footer={<>
          <Button variant="ghost" onClick={() => setConfirmDelete(null)}>Cancel</Button>
          <Button variant="danger" icon="trash-2" onClick={() => { deleteSchool(confirmDelete.id); setConfirmDelete(null); }}>
            Delete permanently
          </Button>
        </>}>
        <p className="text-sm">Permanently delete <strong>{confirmDelete?.code} · {confirmDelete?.nameEn || confirmDelete?.name}</strong>?</p>
        <p className="text-xs text-red-600 mt-2">This cannot be undone. There is no recycle bin in this build.</p>
      </Modal>
    </div>
  );
}

// Compact view — exact columns from FIX 8
function SchoolsCompactTable({ rows, canAdd, onOpen, onDelete, onContractorChange }) {
  return (
    <Card padding="p-0">
      <div className="overflow-auto scrollbar-thin" style={{ maxHeight: 'calc(100vh - 360px)' }}>
        <table className="w-full text-xs">
          <thead className="surface-2 border-b border-soft sticky top-0">
            <tr>
              <th className="text-left px-3 py-2 font-semibold">School ID</th>
              <th className="text-left px-3 py-2 font-semibold min-w-[280px]">School name</th>
              <th className="text-left px-3 py-2 font-semibold">Level / Gender</th>
              <th className="text-left px-3 py-2 font-semibold">City</th>
              <th className="text-left px-3 py-2 font-semibold">SEC Meter</th>
              <th className="text-left px-3 py-2 font-semibold">Contractor</th>
              <th className="text-left px-3 py-2 font-semibold">Status</th>
              <th className="text-left px-3 py-2 font-semibold">Remark</th>
              <th className="text-right px-3 py-2 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(s => (
              <tr key={s.id} className="border-b border-soft hover-row">
                <td className="px-3 py-2 font-mono text-[11px] cursor-pointer" onClick={() => onOpen(s.id)}>{s.id}</td>
                <td className="px-3 py-2 cursor-pointer" onClick={() => onOpen(s.id)}>
                  <div className="font-medium">{s.nameEn || s.name}</div>
                  {s.nameAr && <div className="text-[10px] text-ink-500 text-right" dir="rtl">{s.nameAr}</div>}
                </td>
                <td className="px-3 py-2 text-ink-700 cursor-pointer" onClick={() => onOpen(s.id)}>{s.level} · {s.gender}</td>
                <td className="px-3 py-2 text-ink-700 cursor-pointer" onClick={() => onOpen(s.id)}>{s.city}</td>
                <td className="px-3 py-2 font-mono text-[10px] cursor-pointer" onClick={() => onOpen(s.id)}>{s.meter}</td>
                <td className="px-3 py-2">
                  <select value={s.contractor || ''} onChange={e => { e.stopPropagation(); onContractorChange(s.id, e.target.value); }}
                    onClick={e => e.stopPropagation()}
                    className="text-[11px] px-1.5 py-0.5 border border-ink-200 rounded bg-white focus:outline-none focus:ring-1 ring-accent">
                    <option value="">— Unassigned —</option>
                    {CONTRACTORS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </td>
                <td className="px-3 py-2 cursor-pointer" onClick={() => onOpen(s.id)}>
                  <Pill tone={s.status === 'Completed' ? 'ok' : s.status === 'In Progress' ? 'info' : 'soft'}>{s.status}</Pill>
                </td>
                <td className="px-3 py-2 cursor-pointer" onClick={() => onOpen(s.id)}>
                  <Pill tone={s.remark === 'Active' ? 'ok' : 'warn'}>{s.remark}</Pill>
                </td>
                <td className="px-3 py-2 text-right">
                  <div className="inline-flex items-center gap-1">
                    <button onClick={() => onOpen(s.id)} className="p-1 rounded hover:bg-ink-100 text-ink-500 hover:text-ink-900" title="Edit"><Icon name="pencil" size={13} /></button>
                    {canAdd && <button onClick={e => { e.stopPropagation(); onDelete(s); }}
                      className="p-1 rounded hover:bg-ink-100 text-ink-500 hover:text-red-600" title="Delete"><Icon name="trash-2" size={13} /></button>}
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan="9" className="text-center py-8 text-xs text-ink-500 italic">No schools match these filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="px-3 py-2 border-t border-soft text-[11px] text-ink-500">Showing all {rows.length} schools — scroll to browse.</div>
    </Card>
  );
}

// R17 hotfix: Stages view — one column per School Execution Stage (18 stages,
// grouped by category in the header). Cell content per school × stage:
//   blank "—"     → not started
//   "In Progress" → started but not done (statusId === 'in-progress')
//   date          → completed (use stage.completedDate, formatted dd MMM)
// R19 Item #2 — funnel + 18-cell scrub strip + filter chip + simple identity table.
// Each school's "current stage" = the highest index with done=true (or -1 if none).
// Funnel segments are sized by the count at each stage; the 24-px strip below is
// the click target. A removable filter chip persists the user's selection and
// narrows the identity table underneath.
// R20 — Project Detail Stages view, VERTICAL layout (replaces R19's horizontal funnel
// + 24-px scrub strip). Reasoning: real-world distributions cluster heavily at 3-4
// stages (e.g. Dammam project: 4 active rows out of 18). Horizontal funnel collapses
// 14 zero-count segments into invisible slivers; the vertical layout always shows the
// full pipeline scaffold S01→S18 with empty rows recessed but still labeled.
function SchoolsStagesVertical({ totalRows, distPerStage, activeStage, onSetStage }) {
  const nfmt = new Intl.NumberFormat('en-US');
  return (
    <div data-testid="stages-view-vertical" style={{ display: 'flex', flexDirection: 'column' }}>
      {STAGE_KEYS.map((key, i) => {
        const cat = STAGE_CATEGORY[key];
        const cc = STAGE_CATEGORY_COLORS[cat] || {};
        const count = distPerStage[i] || 0;
        const pct = totalRows > 0 ? Math.round((count / totalRows) * 100) : 0;
        const isActive = activeStage === i;
        const hasData = count > 0;
        // Two visual modes: active rows are tall and prominent; empty rows are
        // short and dim but still labelled so the full pipeline scaffold is visible.
        const rowHeight = hasData ? 60 : 26;
        const rowOpacity = hasData ? 1 : 0.4;
        return (
          <button key={key} type="button"
            data-testid={`stages-view-row-S${String(i + 1).padStart(2, '0')}`}
            data-stage-index={i}
            data-stage-active={hasData ? '1' : '0'}
            data-stage-selected={isActive ? '1' : '0'}
            onClick={() => onSetStage(isActive ? null : i)}
            style={{
              all: 'unset',
              display: 'flex', alignItems: 'center', gap: 12,
              height: rowHeight, minHeight: rowHeight,
              padding: '0 14px',
              borderTop: i === 0 ? 'none' : '0.5px solid #E2E8F0',
              background: isActive ? '#F8FAFC' : 'transparent',
              opacity: rowOpacity,
              cursor: 'pointer',
              transition: 'background 0.12s ease',
            }}
            onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#F8FAFC'; }}
            onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
          >
            {/* SXX chip — slate-100 background, mono 11px. */}
            <span style={{
              flex: '0 0 auto',
              fontFamily: 'monospace', fontSize: 11, fontWeight: 600,
              background: '#F1F5F9', color: '#475569',
              padding: '2px 6px', borderRadius: 4,
            }}>
              S{String(i + 1).padStart(2, '0')}
            </span>

            {/* Category dot */}
            <span style={{
              flex: '0 0 auto',
              width: hasData ? 8 : 6, height: hasData ? 8 : 6,
              borderRadius: 99, background: cc.dot,
            }} />

            {/* Stage label */}
            <span style={{
              flex: '1 1 auto', minWidth: 0,
              fontSize: hasData ? 13 : 11,
              fontWeight: hasData ? 600 : 400,
              color: hasData ? '#0F172A' : '#94A3B8',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {SCHOOL_STAGES[i]}
            </span>

            {/* Mini progress bar — only when count > 0; empty rows show a thin gray dash placeholder. */}
            {hasData ? (
              <div style={{
                flex: '0 0 auto', width: 260, height: 6,
                background: '#F1F5F9', borderRadius: 99, overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%', background: cc.dot,
                  width: Math.max(pct, 0.4) + '%', borderRadius: 99,
                }} />
              </div>
            ) : (
              <span style={{
                flex: '0 0 auto', width: 260,
                borderTop: '1px dashed #E2E8F0',
              }} />
            )}

            {/* Count + percent */}
            <span style={{
              flex: '0 0 auto', minWidth: 90, textAlign: 'right',
              fontVariantNumeric: 'tabular-nums', color: hasData ? '#0F172A' : '#94A3B8',
            }}>
              <span style={{
                fontSize: hasData ? 24 : 12,
                fontWeight: hasData ? 600 : 400,
                lineHeight: 1,
              }}>{nfmt.format(count)}</span>
              <span style={{
                fontSize: hasData ? 11 : 10,
                color: '#94A3B8',
                marginLeft: 8,
              }}>{pct}%</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

function SchoolsStagesTable({ rows, onOpen }) {
  const [funnelStage, setFunnelStage] = React.useState(null);

  // currentStageIndex per school: highest index with done=true, or -1 (not started).
  const stageOf = React.useCallback((s) => {
    if (!s.stages) return -1;
    let last = -1;
    for (let i = 0; i < s.stages.length; i++) if (s.stages[i] && s.stages[i].done) last = i;
    return last;
  }, []);

  // Distribution per stage index (0..17). Add a synthetic "not started" bucket at -1.
  const dist = React.useMemo(() => {
    const out = STAGE_KEYS.map(() => 0);
    let notStarted = 0;
    rows.forEach(s => {
      const i = stageOf(s);
      if (i < 0) notStarted++;
      else out[i]++;
    });
    return { perStage: out, notStarted };
  }, [rows, stageOf]);

  const filteredRows = React.useMemo(() => {
    if (funnelStage == null) return rows;
    return rows.filter(s => stageOf(s) === funnelStage);
  }, [rows, funnelStage, stageOf]);

  const totalRows = rows.length;
  const nfmt = new Intl.NumberFormat('en-US');

  const activeStageName = funnelStage != null ? SCHOOL_STAGES[funnelStage] : null;
  const activeKey       = funnelStage != null ? STAGE_KEYS[funnelStage]    : null;
  const activeCat       = activeKey ? STAGE_CATEGORY[activeKey] : null;
  const activeColor     = activeCat ? STAGE_CATEGORY_COLORS[activeCat] : null;

  return (
    <Card padding="p-0">
      <div className="p-4 border-b border-soft">
        <div className="flex items-baseline justify-between mb-3">
          <div>
            <div className="text-sm font-semibold ink-on-dark">Schools at each stage</div>
            <div className="text-[11px] text-ink-500 mt-0.5">Full pipeline S01→S18 · empty rows stay in place · click any row to filter</div>
          </div>
          <div className="text-[11px] text-ink-500">{nfmt.format(totalRows)} schools{dist.notStarted ? ` · ${nfmt.format(dist.notStarted)} not started` : ''}</div>
        </div>

        {/* R20: VERTICAL stage list — 18 rows top-to-bottom, active rows prominent,
            empty rows recessed in place. */}
        <SchoolsStagesVertical totalRows={totalRows} distPerStage={dist.perStage}
          activeStage={funnelStage}
          onSetStage={(i) => setFunnelStage(i)} />

        {/* Filter chip — unchanged from R19, appears only when a stage is selected. */}
        {funnelStage != null && (
          <div className="mt-3" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '4px 6px 4px 10px',
              background: '#fff', border: `1px solid ${activeColor?.dot || '#0B2545'}`,
              borderRadius: 99, fontSize: 11, fontWeight: 500, color: '#0F172A',
            }}>
              <span style={{ width: 6, height: 6, borderRadius: 99, background: activeColor?.dot }} />
              Filtered by stage: <span className="font-semibold">S{String(funnelStage + 1).padStart(2, '0')} · {activeStageName}</span>
              <span style={{ fontSize: 10, color: '#64748B' }}>({nfmt.format(filteredRows.length)} of {nfmt.format(totalRows)})</span>
              <button type="button" onClick={() => setFunnelStage(null)}
                aria-label="Clear stage filter"
                style={{ width: 16, height: 16, borderRadius: 99, background: '#F1F5F9', color: '#64748B',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, cursor: 'pointer', border: 'none' }}>×</button>
            </span>
          </div>
        )}
      </div>

      {/* Identity table — same compact layout, narrowed to the active stage if any. */}
      <div className="overflow-auto scrollbar-thin" style={{ maxHeight: 'calc(100vh - 480px)' }}>
        <table className="w-full text-xs">
          <thead className="surface-2 border-b border-soft sticky top-0">
            <tr>
              <th className="text-left px-3 py-2 font-semibold whitespace-nowrap">School ID</th>
              <th className="text-left px-3 py-2 font-semibold whitespace-nowrap min-w-[260px]">School name</th>
              <th className="text-left px-3 py-2 font-semibold whitespace-nowrap">City</th>
              <th className="text-left px-3 py-2 font-semibold whitespace-nowrap">Level / Gender</th>
              <th className="text-left px-3 py-2 font-semibold whitespace-nowrap">Contractor</th>
              <th className="text-left px-3 py-2 font-semibold whitespace-nowrap">Current stage</th>
              <th className="text-left px-3 py-2 font-semibold whitespace-nowrap">Remark</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map(s => {
              const i = stageOf(s);
              const key = i >= 0 ? STAGE_KEYS[i] : null;
              const cat = key ? STAGE_CATEGORY[key] : null;
              const cc = cat ? STAGE_CATEGORY_COLORS[cat] : null;
              const contractor = (window.CONTRACTORS || []).find(c => c.id === s.contractor);
              return (
                <tr key={s.id} className="border-b border-soft hover-row cursor-pointer" onClick={() => onOpen(s.id)}>
                  <td className="px-3 py-2 font-mono text-[11px]">{s.id}</td>
                  <td className="px-3 py-2">
                    <div className="font-medium">{s.nameEn || s.name}</div>
                    {s.nameAr && <div className="text-[10px] text-ink-500" dir="rtl">{s.nameAr}</div>}
                  </td>
                  <td className="px-3 py-2 text-ink-700">{s.city}</td>
                  <td className="px-3 py-2 text-ink-700">{s.level} / {s.gender}</td>
                  <td className="px-3 py-2 text-ink-700">{contractor?.name || '—'}</td>
                  <td className="px-3 py-2">
                    {i >= 0 ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6,
                        padding: '2px 8px 2px 6px', borderRadius: 99,
                        background: cc?.soft, color: cc?.text, fontWeight: 500, fontSize: 11 }}>
                        <span style={{ width: 6, height: 6, borderRadius: 99, background: cc?.dot }} />
                        S{String(i + 1).padStart(2, '0')} · {SCHOOL_STAGES[i]}
                      </span>
                    ) : <span className="text-ink-500 italic text-[11px]">Not started</span>}
                  </td>
                  <td className="px-3 py-2"><Pill tone={s.remark === 'Active' ? 'ok' : 'warn'}>{s.remark}</Pill></td>
                </tr>
              );
            })}
            {filteredRows.length === 0 && (
              <tr><td colSpan={7} className="text-center py-8 text-xs text-ink-500 italic">
                {funnelStage != null ? `No schools currently at stage S${String(funnelStage + 1).padStart(2, '0')} · ${activeStageName}.` : 'No schools match these filters.'}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="px-3 py-2 border-t border-soft text-[11px] text-ink-500">
        Stages view — {nfmt.format(filteredRows.length)} of {nfmt.format(totalRows)} schools across 18 School Execution Stages.
      </div>
    </Card>
  );
}

Object.assign(window, { PageSchoolsList, SchoolsStagesTable, SchoolsStagesVertical });
