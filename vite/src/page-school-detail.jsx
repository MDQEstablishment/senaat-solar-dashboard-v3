import React from 'react';
// School detail — Zamil Round 5
// Edit-in-place for all school fields, contractor dropdown, photos/PDF placeholders, materials consumption tab

function PageSchoolDetail({ schoolId, onBack, onAddTask, currentUser, onEscalate }) {
  const {
    schools, chats, sendChatMessage, updateSchoolStage, updateSchoolRemark, addSchoolPhoto,
    stageStatuses, setSchoolStageStatus, stageHistory, toggleSchoolStage,
    updateSchool, validateSchool, logAudit,
    materialsCatalog, materialUsage, logMaterialUsage, deleteMaterialUsage,
    // R29 — per-stage photo storage
    getSchoolStagePhotos, setSchoolStagePhotosFor,
  } = useStore();
  // R28 — edit-coordinates modal (opened from the map preview's empty-state button
  // or its "Add precise coordinates" link when the school falls back to a region
  // centroid). Lives at PageSchoolDetail level so the modal can persist across
  // tab switches and the school re-renders the precise marker the moment a save
  // updates store state.
  const [editCoordsOpen, setEditCoordsOpen] = React.useState(false);
  const handleSaveCoords = ({ lat, lng }) => {
    const next = `${lat}, ${lng}`;
    updateSchool && updateSchool(school.id, { coords: next });
    if (logAudit && currentUser) logAudit({
      actorId: currentUser.id, actorName: currentUser.name, actorRole: currentUser.role,
      action: 'UPDATE', entityType: 'school.coords', entityId: school.id,
      entityLabel: school.code || school.id,
      summary: `Updated coordinates for ${school.code || school.id} → ${next}`,
    });
  };

  const school = schools.find(s => s.id === schoolId);
  if (!school) return <div className="p-6">School not found.</div>;

  const project = getProject(school.projectId);
  const messages = chats[school.id] || [];
  const reached = school.stages.filter(s => s.done).length;
  const stageProgress = Math.round((reached / SCHOOL_STAGES.length) * 100);

  const [tab, setTab] = React.useState('Details');
  const [editMode, setEditMode] = React.useState(false);
  const [form, setForm] = React.useState({
    nameAr: school.nameAr || '',
    nameEn: school.nameEn || school.name || '',
    level: school.level || 'Primary',
    gender: school.gender || 'Boys',
    region: school.region || '',
    city: school.city || '',
    coords: school.coords || '',
    meter: school.meter || '',
    account: school.account || '',
    survey: school.survey || '',
    installStart: school.installStart || '',
    contractor: school.contractor || '',
    kw: school.kw || 100,
  });
  const [fieldErrors, setFieldErrors] = React.useState({});
  const [toast, setToast] = React.useState(null);

  React.useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  React.useEffect(() => {
    setForm({
      nameAr: school.nameAr || '', nameEn: school.nameEn || school.name || '',
      level: school.level || 'Primary', gender: school.gender || 'Boys',
      region: school.region || '', city: school.city || '',
      coords: school.coords || '', meter: school.meter || '', account: school.account || '',
      survey: school.survey || '', installStart: school.installStart || '',
      contractor: school.contractor || '', kw: school.kw || 100,
    });
    setFieldErrors({});
  }, [school.id]);

  const saveEdits = () => {
    // Validate meter duplicate
    if (form.meter && form.meter !== school.meter) {
      const v = validateSchool({ id: school.id, meter: form.meter }, school.id);
      if (!v.ok) {
        setFieldErrors({ meter: true });
        const conflict = v.conflictWith;
        const proj = conflict ? getProject(conflict.projectId) : null;
        setToast({ kind: 'error', msg: `SEC Meter NO. '${form.meter}' already exists in ${proj?.name || 'another project'} (${conflict?.code || '—'}).` });
        return;
      }
    }
    const result = updateSchool(school.id, { ...form });
    if (result && result.ok === false) {
      setToast({ kind: 'error', msg: 'Update failed: ' + result.error });
      return;
    }
    setFieldErrors({});
    setEditMode(false);
    setToast({ kind: 'success', msg: 'School details saved.' });
  };

  const changeStatus = (stageIdx, statusId, reason) => {
    if (setSchoolStageStatus) setSchoolStageStatus(school.id, stageIdx, statusId, currentUser.id, reason);
    else {
      const status = (stageStatuses || []).find(s => s.id === statusId);
      updateSchoolStage(school.id, stageIdx, {
        done: status?.terminal || false,
        date: status?.terminal ? new Date().toISOString() : null,
        by: currentUser.id,
      });
    }
  };
  const uploadPhoto = (i) => {
    // R30.22 — the Stages-row "Photo" button now switches to the Photos tab and
    // scrolls to that stage's real ImageUploader (which IS wired to Supabase storage).
    // The old in-memory addSchoolPhoto placeholder did nothing visible.
    setTab('Photos');
    setTimeout(() => {
      const el = document.querySelector(`[data-testid="stage-photos-S${String(i + 1).padStart(2, '0')}"]`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Open the file picker inside that stage's ImageUploader directly
        const fi = el.querySelector('input[type=file]');
        if (fi) fi.click();
      }
    }, 200);
  };

  const fld = (key, val) => editMode ? val : (form[key] || '—');

  // R28 — coords parsing moved into the shared SchoolMapPreview / parseCoords
  // helper (src/components/MapPreview.jsx). The old `lat`/`lng` locals were only
  // used to gate the map render and are no longer needed here.

  return (
    <div className="p-6 grid grid-cols-12 gap-4 h-[calc(100vh-56px)]">
      {/* LEFT: school details + tabs */}
      <div className="col-span-8 overflow-auto scrollbar-thin pr-2 space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" icon="arrow-left" onClick={onBack}>Back</Button>
          <div className="flex-1">
            <div className="text-xs text-ink-500">{project?.name}</div>
            <h1 className="text-lg font-semibold">{school.code} · {form.nameEn || school.name}</h1>
            {form.nameAr && <div className="text-xs text-ink-500 mt-0.5" dir="rtl">{form.nameAr}</div>}
          </div>
          {onEscalate && (() => {
            const t = (typeof getEscalationTarget === 'function') ? getEscalationTarget(currentUser, school.projectId) : null;
            return t ? <Button variant="outline" icon="alert-circle" onClick={() => onEscalate(school)}>{t.label}</Button> : null;
          })()}
          <Button variant="outline" icon="plus" onClick={() => onAddTask({ projectId: school.projectId, schoolId: school.id })}>Add task</Button>
          {!editMode && <Button variant="accent" icon="pencil" onClick={() => setEditMode(true)}>Edit</Button>}
          {editMode && <>
            <Button variant="ghost" onClick={() => { setEditMode(false); setFieldErrors({}); }}>Cancel</Button>
            <Button variant="accent" icon="check" onClick={saveEdits}>Save</Button>
          </>}
        </div>

        {toast && (
          <div className={cls('rounded-md p-3 text-xs border', toast.kind === 'error' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800')}>
            <span className="font-semibold">{toast.kind === 'error' ? '⚠' : '✓'}</span> {toast.msg}
          </div>
        )}

        <Card padding="p-0">
          <div className="px-5 pt-3"><Tabs tabs={['Details','Stages','Materials','Delivery Notes','Snags']} active={tab} onChange={setTab} /></div>

          {tab === 'Details' && (
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <FieldRow label="School ID" value={school.id} readOnly />
                <FieldRow label="Status" value={<Pill tone={school.status === 'Completed' ? 'ok' : school.status === 'In Progress' ? 'info' : 'soft'}>{school.status}</Pill>} readOnly />

                <FieldRow label="School Name (English)" editMode={editMode} value={fld('nameEn', form.nameEn)}
                  onChange={v => setForm(f => ({ ...f, nameEn: v }))} />
                <FieldRow label="School Name (Arabic)" editMode={editMode} value={fld('nameAr', form.nameAr)} dir="rtl"
                  onChange={v => setForm(f => ({ ...f, nameAr: v }))} />

                <FieldRow label="Level" editMode={editMode} value={form.level} type="select"
                  options={['Primary','Intermediate','Secondary']}
                  onChange={v => setForm(f => ({ ...f, level: v }))} />
                <FieldRow label="Gender" editMode={editMode} value={form.gender} type="select"
                  options={['Boys','Girls']}
                  onChange={v => setForm(f => ({ ...f, gender: v }))} />

                <FieldRow label="Region" editMode={editMode} value={fld('region', form.region)}
                  onChange={v => setForm(f => ({ ...f, region: v }))} />
                <FieldRow label="City" editMode={editMode} value={fld('city', form.city)}
                  onChange={v => setForm(f => ({ ...f, city: v }))} />

                <FieldRow label="GPS Coordinates" editMode={editMode} value={fld('coords', form.coords)}
                  onChange={v => setForm(f => ({ ...f, coords: v }))} placeholder="lat, lng" />

                <FieldRow label="SEC Meter NO." editMode={editMode} value={fld('meter', form.meter)}
                  onChange={v => setForm(f => ({ ...f, meter: v }))} error={fieldErrors.meter} />
                <FieldRow label="SEC Account NO." editMode={editMode} value={fld('account', form.account)}
                  onChange={v => setForm(f => ({ ...f, account: v }))} />

                <FieldRow label="Survey Completion Date" editMode={editMode} value={fld('survey', form.survey)} type="date"
                  onChange={v => setForm(f => ({ ...f, survey: v }))} />
                <FieldRow label="Installation Start Date" editMode={editMode} value={fld('installStart', form.installStart)} type="date"
                  onChange={v => setForm(f => ({ ...f, installStart: v }))} />

                <FieldRow label="Contractor" editMode={editMode} value={(CONTRACTORS.find(c => c.id === form.contractor) || {}).name || (form.contractor || '—')}
                  type="select" options={[{value:'',label:'— Unassigned —'}, ...CONTRACTORS.map(c => ({ value: c.id, label: c.name }))]}
                  onChange={v => setForm(f => ({ ...f, contractor: v }))} />

                <FieldRow label="System Size (kWp)" editMode={editMode} value={form.kw} type="number"
                  onChange={v => setForm(f => ({ ...f, kw: +v }))} />

                <FieldRow label="Remark" editMode={true} value={school.remark} type="select" options={REMARKS}
                  onChange={v => updateSchoolRemark(school.id, v)} />
              </div>

              {/* R28 — Map preview slot ALWAYS renders. SchoolMapPreview decides
                  the branch internally: precise marker when coords parse, region
                  centroid + "Approximate" caption when they don't, empty-state
                  placeholder when neither. */}
              {window.SchoolMapPreview && (
                <window.SchoolMapPreview school={school} onEdit={() => setEditCoordsOpen(true)} />
              )}

              <div className="mt-2">
                <div className="flex items-center justify-between mb-1">
                  <div className="text-[11px] font-medium text-ink-700">Execution progress</div>
                  <div className="text-[11px] num font-semibold">{stageProgress}% · stage {reached}/{SCHOOL_STAGES.length}</div>
                </div>
                <ProgressBar value={stageProgress} />
              </div>
            </div>
          )}

          {tab === 'Stages' && (
            <div className="p-5">
              <SectionTitle icon="git-branch" title="Stage timeline" subtitle="Set status per stage. Free transitions in any direction." />
              <div className="space-y-2">
                {SCHOOL_STAGES.map((stageName, i) => {
                  const stageKey = (window.STAGE_KEYS || [])[i] || stageName;
                  const stagePhotos = (typeof getSchoolStagePhotos === 'function')
                    ? getSchoolStagePhotos(school.id, stageKey) : [];
                  return (
                    <StageRow key={i} index={i} stageName={stageName} school={school}
                      stageKey={stageKey}
                      stagePhotos={stagePhotos}
                      setStagePhotos={(next) => setSchoolStagePhotosFor && setSchoolStagePhotosFor(school.id, stageKey, next)}
                      uploadPath={`projects/${school.projectId}/schools/${school.id}/stages/${stageKey}`}
                      onToggle={() => toggleSchoolStage && toggleSchoolStage(school.id, i, currentUser)}
                      onAddTask={() => onAddTask({ projectId: school.projectId, schoolId: school.id, stageIndex: i })} />
                  );
                })}
              </div>
            </div>
          )}

          {tab === 'Materials' && (
            <SchoolMaterialsTab school={school} catalog={materialsCatalog} usage={materialUsage}
              logUsage={logMaterialUsage} deleteUsage={deleteMaterialUsage} currentUser={currentUser} />
          )}

          {tab === 'Delivery Notes' && (
            <div className="p-5">
              {(() => {
                // R30.22 — Real delivery notes filtered to this school, with a working
                // "New delivery note" button. Replaces the prior placeholder dropzone.
                const store = (typeof window.useStore === 'function') ? window.useStore() : null;
                const allDNs = (store && store.deliveryNotes) || [];
                const schoolDNs = allDNs.filter(d => d.schoolId === school.id);
                const openNew = () => {
                  // R30.25.2 — stash on window (survives re-renders); sessionStorage as fallback
                  const hint = { projectId: school.projectId, schoolId: school.id };
                  if (typeof window !== 'undefined') window.__newDnContext = hint;
                  try { sessionStorage.setItem('zamil_new_dn_hint', JSON.stringify(hint)); } catch (_) {}
                  window.location.hash = '#/delivery-notes?new=1';
                };
                return <>
                  <div className="flex items-center justify-between mb-3">
                    <SectionTitle icon="file-text" title="Delivery Notes"
                      subtitle={`${schoolDNs.length} note(s) for this school`} />
                    <Button variant="accent" icon="plus" onClick={openNew}>New delivery note</Button>
                  </div>
                  {schoolDNs.length === 0 ? (
                    <div className="text-center py-8 text-xs text-ink-500 italic border border-dashed border-soft rounded-md">
                      No delivery notes yet for this school. Click "New delivery note" above.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {schoolDNs.map(d => (
                        <a key={d.id} href={`#/delivery-notes?id=${d.id}`}
                           className="flex items-center gap-3 border border-soft rounded-md p-3 text-xs hover:bg-ink-50 cursor-pointer">
                          <Icon name="file-text" size={14} />
                          <div className="flex-1">
                            <div className="font-medium">{d.supplier || 'Unknown supplier'} — {(d.items || []).length} item(s)</div>
                            <div className="text-[10px] text-ink-500 mt-0.5">Delivered {fmtDate(d.deliveryDate)} · {d.contractor || '—'}</div>
                          </div>
                          <Pill tone={d.status === 'verified' ? 'ok' : d.status === 'received' ? 'soft' : 'warn'}>{d.status || 'received'}</Pill>
                        </a>
                      ))}
                    </div>
                  )}
                </>;
              })()}
            </div>
          )}

          {tab === 'Snags' && (
            <div className="p-5">
              <SectionTitle icon="alert-circle" title="Snag / issue log" subtitle={`${school.issues.length} item(s)`} />
              {school.issues.length === 0 ? (
                <div className="text-xs text-ink-500 italic">No snags logged for this school.</div>
              ) : (
                <div className="space-y-2">
                  {school.issues.map(iss => (
                    <div key={iss.id} className="flex items-start gap-3 p-3 rounded-md border border-soft surface-2 text-xs">
                      <Pill tone={iss.severity === 'High' ? 'danger' : iss.severity === 'Medium' ? 'warn' : 'soft'}>{iss.severity}</Pill>
                      <div className="flex-1">
                        <div>{iss.text}</div>
                        <div className="text-[10px] text-ink-500 mt-0.5">Opened {fmtDate(iss.opened)}</div>
                      </div>
                      <Pill tone={iss.status === 'Open' ? 'warn' : 'ok'}>{iss.status}</Pill>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </Card>
      </div>

      {/* RIGHT: Chat panel */}
      <div className="col-span-4 surface border border-soft rounded-xl flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b border-soft surface flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold flex items-center gap-2"><Icon name="mail" size={14} /> School chat</h3>
            <p className="text-[10px] text-ink-500">PM, Coordinator, Material, QA · type @ to mention</p>
          </div>
          <Pill tone="soft">{messages.length}</Pill>
        </div>
        <div className="flex-1 min-h-0">
          <ChatPanel schoolId={school.id} messages={messages} currentUserId={currentUser.id}
            onSend={(msg) => sendChatMessage(school.id, msg)} />
        </div>
      </div>

      {/* R28 — Edit coordinates modal (opened from the map preview). */}
      {window.EditCoordsModal && (
        <window.EditCoordsModal
          open={editCoordsOpen}
          school={school}
          onClose={() => setEditCoordsOpen(false)}
          onSave={handleSaveCoords} />
      )}
    </div>
  );
}

function FieldRow({ label, value, editMode, onChange, type, options, dir, placeholder, error, readOnly }) {
  const inputCls = cls(
    'w-full px-2.5 py-1.5 text-sm rounded-md border bg-white focus:outline-none focus:ring-2 ring-accent',
    error ? 'border-red-500' : 'border-ink-200'
  );
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-ink-500">{label}</div>
      {(editMode && !readOnly) ? (
        type === 'select' ? (
          <select value={value} onChange={e => onChange(e.target.value)} className={inputCls}>
            {(options || []).map(o => typeof o === 'string'
              ? <option key={o} value={o}>{o}</option>
              : <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        ) : (
          <input type={type || 'text'} dir={dir} value={value} placeholder={placeholder}
            onChange={e => onChange(e.target.value)} className={inputCls} />
        )
      ) : (
        <div className="font-medium mt-0.5" dir={dir}>{value || '—'}</div>
      )}
      {error && <div className="text-[10px] text-red-600 mt-0.5">Conflict — see toast.</div>}
    </div>
  );
}

// Stage row with flexible status picker (Round 4 preserved)
// Round 10: Single-click toggle (Done ⇄ Not Started). No menu, no multi-state.
function StageRow({ index, stageName, school, onToggle, onAddTask, stageKey, stagePhotos, setStagePhotos, uploadPath }) {
  const st = school.stages[index] || {};
  const isDone = !!st.done;
  const responsiblePerson = st.by ? getPerson(st.by) : null;
  return (
    <div className={cls('rounded-md border p-3 transition',
      isDone ? 'border-navy-900 bg-navy-50' : 'border-soft surface-2')}>
      <div className="flex items-start gap-3">
        <button onClick={onToggle}
          title={isDone ? 'Click to mark Not Started' : 'Click to mark Done'}
          className={cls('w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold border-2 transition hover:scale-110 shrink-0',
            isDone ? 'bg-navy-900 border-navy-900 text-white' : 'bg-white border-navy-900 text-navy-900')}>
          {isDone ? <Icon name="check" size={16} strokeWidth={3} /> : (index + 1)}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm">{stageName}</span>
            <span className={cls('inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium',
              isDone ? 'bg-navy-900 text-white' : 'bg-ink-100 text-ink-700')}>
              {isDone ? 'Done' : 'Not Started'}
            </span>
            {isDone && st.date && <span className="text-[11px] text-ink-500">{fmtDate(st.date)}</span>}
            {responsiblePerson && (
              <span className="text-[11px] text-ink-500 flex items-center gap-1">
                · <Avatar initials={responsiblePerson.initials} size={16} /> {responsiblePerson.name}
              </span>
            )}
            <span className="text-[10px] text-ink-500 ml-auto">{(stagePhotos || []).length}/5 photos</span>
          </div>

          {/* R30.26 — INLINE ImageUploader. Uploads directly to Supabase storage
              + persists to photos table for THIS stage. No more redirect. */}
          {window.ImageUploader && setStagePhotos && (
            <div className="mt-2">
              <window.ImageUploader
                path={uploadPath}
                maxCount={5}
                compact={true}
                value={stagePhotos || []}
                onChange={(next) => setStagePhotos(next)} />
            </div>
          )}
        </div>
        <div className="flex flex-col gap-1 shrink-0">
          <Button size="sm" variant={isDone ? 'outline' : 'accent'} icon={isDone ? 'x' : 'check'} onClick={onToggle}>
            {isDone ? 'Undo' : 'Mark Done'}
          </Button>
          <Button size="sm" variant="ghost" icon="plus" onClick={onAddTask}>Task</Button>
        </div>
      </div>
    </div>
  );
}

// Per-school materials consumption tab
function SchoolMaterialsTab({ school, catalog, usage, logUsage, deleteUsage, currentUser }) {
  const [matNo, setMatNo] = React.useState((catalog && catalog[0]?.no) || '');
  const [qty, setQty] = React.useState('');
  const [date, setDate] = React.useState(new Date().toISOString().slice(0,10));

  const schoolUsage = (usage || []).filter(u => u.schoolId === school.id);
  const selectedMat = catalog.find(m => String(m.no) === String(matNo));

  const submit = () => {
    if (!qty || !matNo) return;
    logUsage({ schoolId: school.id, projectId: school.projectId, materialNo: +matNo, materialName: selectedMat?.name, unit: selectedMat?.unit, qty: +qty, date, by: currentUser.id });
    setQty(''); setDate(new Date().toISOString().slice(0,10));
  };

  return (
    <div className="p-5">
      <SectionTitle icon="package" title="Material consumption" subtitle="Log materials used for this school" />
      <div className="grid grid-cols-12 gap-2 items-end bg-accent-soft border border-accent rounded-md p-3 mb-4">
        <div className="col-span-6">
          <label className="text-[11px] font-medium text-ink-700 mb-1 block">Material</label>
          <select value={matNo} onChange={e => setMatNo(e.target.value)}
            className="w-full px-2.5 py-1.5 text-sm rounded-md border border-ink-200 bg-white">
            {catalog.map(m => <option key={m.no} value={m.no}>{m.no}. {m.name} ({m.unit})</option>)}
          </select>
        </div>
        <div className="col-span-2">
          <label className="text-[11px] font-medium text-ink-700 mb-1 block">Qty {selectedMat ? `(${selectedMat.unit})` : ''}</label>
          <TextField value={qty} onChange={setQty} type="number" />
        </div>
        <div className="col-span-3">
          <label className="text-[11px] font-medium text-ink-700 mb-1 block">Date</label>
          <TextField value={date} onChange={setDate} type="date" />
        </div>
        <div className="col-span-1">
          <Button variant="accent" icon="plus" onClick={submit} className="!w-full !justify-center">Log</Button>
        </div>
      </div>
      <div className="border border-soft rounded-md overflow-hidden">
        <table className="w-full text-sm">
          <thead className="surface-2 text-[11px] uppercase tracking-wider text-ink-500">
            <tr>
              <th className="text-left px-3 py-2">Material</th>
              <th className="text-left px-3 py-2">Category</th>
              <th className="text-right px-3 py-2">Qty</th>
              <th className="text-left px-3 py-2">Unit</th>
              <th className="text-left px-3 py-2">Date</th>
              <th className="text-left px-3 py-2">Logged by</th>
              <th className="text-right px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {schoolUsage.map(u => {
              const mat = catalog.find(m => String(m.no) === String(u.materialNo));
              const by = getPerson(u.by);
              return (
                <tr key={u.id} className="border-t border-soft hover-row">
                  <td className="px-3 py-2 font-medium">{mat?.name || u.materialName}</td>
                  <td className="px-3 py-2 text-xs"><Pill tone="soft">{mat?.category || '—'}</Pill></td>
                  <td className="px-3 py-2 text-right tnum font-semibold">{u.qty}</td>
                  <td className="px-3 py-2 text-xs">{u.unit || mat?.unit}</td>
                  <td className="px-3 py-2 text-xs">{fmtDate(u.date)}</td>
                  <td className="px-3 py-2 text-xs">{by?.name || '—'}</td>
                  <td className="px-3 py-2 text-right">
                    <button onClick={() => deleteUsage(u.id)} className="p-1 rounded hover:bg-ink-100 text-red-500"><Icon name="trash-2" size={12} /></button>
                  </td>
                </tr>
              );
            })}
            {schoolUsage.length === 0 && (
              <tr><td colSpan="7" className="text-center py-6 text-xs text-ink-500 italic">No materials logged yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

Object.assign(window, { PageSchoolDetail });
