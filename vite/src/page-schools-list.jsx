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

// Map new 13 stage keys to legacy 12 stage names (approx) — used in Stages view
const LEGACY_STAGE_MAP = [
  { legacy: 'Surveyed',                key: null },   // surveyed boolean comes from school.survey date
  { legacy: 'SEC Approvals',           key: null },   // approximated via foundation start
  { legacy: 'Initial Payment',         key: null },
  { legacy: 'Final Payment',           key: null },
  { legacy: 'Fix1 Delivered',          key: 'foundation' },
  { legacy: 'Fix1 Installed',          key: 'module' },
  { legacy: 'Fix2 Delivered',          key: 'dccable' },
  { legacy: 'Fix2 Installed',          key: 'datalogger' },
  { legacy: 'Energized',               key: 'energized' },
  { legacy: 'COC Signed',              key: 'coc' },
  { legacy: 'Handed Over to Zamil',    key: null },
  { legacy: 'Handed Over to Client',   key: null },
];

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

  const exportToExcel = async () => {
    if (typeof window.loadXLSX === 'function') { await window.loadXLSX(); }
    if (!window.XLSX || !window.XLSX.utils || !window.XLSX.utils.book_new) return;
    const headers = ['School ID','School Name (Arabic)','School Name (English)','Level','Gender','City','SEC Meter','Contractor','Status','Remark'];
    const rows = filtered.map(s => [
      s.id, s.nameAr, s.nameEn, s.level, s.gender, s.city, s.meter,
      (CONTRACTORS.find(c => c.id === s.contractor) || {}).name || '',
      s.status, s.remark,
    ]);
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    XLSX.utils.book_append_sheet(wb, ws, project.tag || 'Schools');
    XLSX.writeFile(wb, `${project.tag || project.id}-schools.xlsx`);
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

// Stages view — legacy 12-stage checkmark columns
function SchoolsStagesTable({ rows, onOpen }) {
  return (
    <Card padding="p-0">
      <div className="overflow-auto scrollbar-thin" style={{ maxHeight: 'calc(100vh - 360px)' }}>
        <table className="w-full text-xs">
          <thead className="surface-2 border-b border-soft sticky top-0">
            <tr>
              <th className="text-left px-3 py-2 font-semibold whitespace-nowrap sticky left-0 surface-2 z-10">School ID</th>
              <th className="text-left px-3 py-2 font-semibold whitespace-nowrap min-w-[200px]">School name</th>
              <th className="text-left px-3 py-2 font-semibold whitespace-nowrap">City</th>
              {LEGACY_STAGE_MAP.map((m, i) => (
                <th key={i} className="text-center px-2 py-2 font-semibold whitespace-nowrap" title={m.legacy}>
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] text-ink-500">{i + 1}</span>
                    <span className="text-[10px]">{m.legacy.split(' ').slice(0, 2).join(' ')}</span>
                  </div>
                </th>
              ))}
              <th className="text-left px-3 py-2 font-semibold whitespace-nowrap">Remark</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(s => (
              <tr key={s.id} className="border-b border-soft hover-row cursor-pointer" onClick={() => onOpen(s.id)}>
                <td className="px-3 py-2 font-mono text-[11px] sticky left-0 bg-white surface">{s.id}</td>
                <td className="px-3 py-2">
                  <div className="font-medium">{s.nameEn || s.name}</div>
                  {s.nameAr && <div className="text-[10px] text-ink-500" dir="rtl">{s.nameAr}</div>}
                </td>
                <td className="px-3 py-2 text-ink-700">{s.city}</td>
                {LEGACY_STAGE_MAP.map((m, i) => {
                  // Map legacy stage to new stage key, or use status heuristics
                  let done = false, date = null;
                  if (m.key) {
                    const idx = STAGE_KEYS.indexOf(m.key);
                    if (idx >= 0 && s.stages[idx]) {
                      done = s.stages[idx].done;
                      date = s.stages[idx].date;
                    }
                  } else {
                    // Heuristic for non-mapped legacy stages
                    if (m.legacy === 'Surveyed') { done = !!s.survey; date = s.survey; }
                    else if (m.legacy === 'SEC Approvals') { done = s.stages[0]?.done; date = s.stages[0]?.date; }
                    else if (m.legacy === 'Initial Payment') { done = s.stages[0]?.done; date = s.stages[0]?.date; }
                    else if (m.legacy === 'Final Payment') { done = s.status === 'Completed'; }
                    else if (m.legacy === 'Handed Over to Zamil') { const st = stageByKey(s, 'handover_zamil'); done = st?.done; date = st?.date; }
                    else if (m.legacy === 'Handed Over to Client') { const st = stageByKey(s, 'handover_client'); done = st?.done; date = st?.date; }
                  }
                  return (
                    <td key={i} className="text-center px-2 py-2">
                      {done ? (
                        <div className="flex flex-col items-center">
                          <span className="text-emerald-600"><Icon name="check" size={14} strokeWidth={3} /></span>
                          {date && <span className="text-[9px] text-ink-500">{new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>}
                        </div>
                      ) : <span className="text-ink-200">—</span>}
                    </td>
                  );
                })}
                <td className="px-3 py-2"><Pill tone={s.remark === 'Active' ? 'ok' : 'warn'}>{s.remark}</Pill></td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={LEGACY_STAGE_MAP.length + 4} className="text-center py-8 text-xs text-ink-500 italic">No schools match these filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="px-3 py-2 border-t border-soft text-[11px] text-ink-500">Stages view — {rows.length} schools with 12-stage progress.</div>
    </Card>
  );
}

Object.assign(window, { PageSchoolsList });
