import React from 'react';
// R29 — Delivery Notes module.
// One <PageDeliveryNotes /> entry point manages three sub-views via local state:
//   • list     — table grouped by project, status pill, photo count
//   • detail   — read-only render of a single note + Edit + Print
//   • edit     — full create/edit form (also used for "New delivery note")
//
// Photos use the shared ImageUploader → MemoryImageStorage adapter.
// Print path: open a printable HTML view in a new tab; browser's native
// Print-to-PDF dialog handles export (no PDF lib in the bundle).

const DN_STATUSES = ['draft', 'received', 'disputed'];
const DN_STATUS_TONE = { draft: 'soft', received: 'ok', disputed: 'danger' };

function PageDeliveryNotes({ currentUser }) {
  const store = useStore();
  const { deliveryNotes, addDeliveryNote, updateDeliveryNote, deleteDeliveryNote, projects, schools } = store;
  const [view, setView] = React.useState('list');     // 'list' | 'detail' | 'edit'
  const [activeId, setActiveId] = React.useState(null);
  const [projectFilter, setProjectFilter] = React.useState('all');
  const [statusFilter, setStatusFilter] = React.useState('all');
  const [q, setQ] = React.useState('');

  const filtered = React.useMemo(() => {
    const ql = q.trim().toLowerCase();
    return (deliveryNotes || []).filter(n => {
      if (projectFilter !== 'all' && n.projectId !== projectFilter) return false;
      if (statusFilter !== 'all'  && n.status !== statusFilter)    return false;
      if (ql) {
        const blob = [n.id, n.supplier, n.contractor, n.receivedBy, n.schoolId, n.notes,
                      ...(n.items || []).map(i => i.description)].join(' ').toLowerCase();
        if (!blob.includes(ql)) return false;
      }
      return true;
    });
  }, [deliveryNotes, projectFilter, statusFilter, q]);

  const active = (deliveryNotes || []).find(n => n.id === activeId) || null;

  // R30.22 — auto-open New form if URL hash has ?new=1 or zamil_new_dn_hint is set
  React.useEffect(() => {
    const hash = window.location.hash || '';
    if (hash.includes('new=1')) {
      setActiveId(null);
      setView('edit');
    }
  }, []);
  const openDetail = (id) => { setActiveId(id); setView('detail'); };
  const openEdit   = (id) => { setActiveId(id); setView('edit'); };
  const openNew    = ()   => { setActiveId(null); setView('edit'); };
  const back       = ()   => { setView('list'); setActiveId(null); };

  const onSave = (data) => {
    if (activeId) {
      updateDeliveryNote(activeId, data, currentUser);
      openDetail(activeId);
    } else {
      const note = addDeliveryNote(data, currentUser);
      openDetail(note.id);
    }
  };
  const onDelete = (id) => {
    if (!confirm('Delete this delivery note? This cannot be undone.')) return;
    deleteDeliveryNote(id, currentUser);
    back();
  };

  if (view === 'detail' && active) {
    return <DeliveryNoteDetail note={active} projects={projects} schools={schools} onBack={back}
                                onEdit={() => openEdit(active.id)} onDelete={() => onDelete(active.id)} />;
  }
  if (view === 'edit') {
    return <DeliveryNoteForm initial={active} projects={projects} schools={schools}
                              onCancel={() => active ? openDetail(active.id) : back()} onSave={onSave} />;
  }
  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold ink-on-dark">Delivery Notes</h1>
          <p className="text-xs text-ink-500 ink-muted-on-dark mt-0.5">
            Material + equipment deliveries logged against schools and stages. Receipt photos + signatures attach to each note.
          </p>
        </div>
        <Button variant="accent" icon="plus" onClick={openNew}>New delivery note</Button>
      </div>

      <Card padding="p-3">
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-500"><Icon name="search" size={14} /></span>
            <input value={q} onChange={e => setQ(e.target.value)}
              placeholder="Search supplier, school, contractor, items…"
              data-testid="delivery-notes-search"
              className="pl-8 pr-3 py-1.5 text-sm rounded-md border border-ink-200 bg-white w-80 focus:outline-none focus:ring-2 ring-accent" />
          </div>
          <Select value={projectFilter} onChange={setProjectFilter}
            options={[{ value: 'all', label: 'All projects' }, ...(projects || []).map(p => ({ value: p.id, label: p.name }))]} />
          <Select value={statusFilter} onChange={setStatusFilter}
            options={[{ value: 'all', label: 'All statuses' }, ...DN_STATUSES.map(s => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) }))]} />
          <div className="ml-auto text-xs text-ink-500">{filtered.length} of {(deliveryNotes || []).length} notes</div>
        </div>
      </Card>

      <Card padding="p-0">
        <div data-testid="delivery-notes-list" className="overflow-auto scrollbar-thin" style={{ maxHeight: 'calc(100vh - 280px)' }}>
          <table className="w-full text-xs">
            <thead className="surface-2 border-b border-soft">
              <tr>
                <th className="text-left px-3 py-2 font-semibold">Note ID</th>
                <th className="text-left px-3 py-2 font-semibold">Project</th>
                <th className="text-left px-3 py-2 font-semibold">School</th>
                <th className="text-left px-3 py-2 font-semibold">Stage</th>
                <th className="text-left px-3 py-2 font-semibold">Supplier</th>
                <th className="text-left px-3 py-2 font-semibold">Date</th>
                <th className="text-left px-3 py-2 font-semibold">Items</th>
                <th className="text-left px-3 py-2 font-semibold">Photos</th>
                <th className="text-left px-3 py-2 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((n, i) => {
                const proj = (projects || []).find(p => p.id === n.projectId);
                const stage = n.stageKey && window.SCHOOL_STAGE_SHORT
                  ? window.SCHOOL_STAGE_SHORT[(window.STAGE_KEYS || []).indexOf(n.stageKey)] || n.stageKey
                  : '—';
                return (
                  <tr key={n.id} onClick={() => openDetail(n.id)}
                    className={cls('cursor-pointer border-b border-soft hover-row',
                      i % 2 === 0 ? 'bg-white' : 'bg-slate-50')}>
                    <td className="px-3 py-2 font-mono text-[11px] text-ink-500">{n.id}</td>
                    <td className="px-3 py-2 font-medium">{proj?.name || n.projectId || '—'}</td>
                    <td className="px-3 py-2 font-mono text-[11px]">{n.schoolId || '—'}</td>
                    <td className="px-3 py-2 text-ink-700">{stage}</td>
                    <td className="px-3 py-2 text-ink-700">{n.supplier || '—'}</td>
                    <td className="px-3 py-2 tnum">{n.deliveryDate || '—'}</td>
                    <td className="px-3 py-2 tnum">{(n.items || []).length}</td>
                    <td className="px-3 py-2 tnum">
                      {(n.photos || []).length > 0 && <Icon name="upload" size={11} className="inline-block mr-1 text-ink-500" />}
                      {(n.photos || []).length}
                    </td>
                    <td className="px-3 py-2"><Pill tone={DN_STATUS_TONE[n.status] || 'soft'}>{n.status}</Pill></td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={9} className="text-center py-8 text-xs text-ink-500 italic">No delivery notes match these filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ── Detail (read-only) ─────────────────────────────────────────────────────
function DeliveryNoteDetail({ note, projects, schools, onBack, onEdit, onDelete }) {
  const proj = (projects || []).find(p => p.id === note.projectId);
  const sch  = (schools  || window.ALL_SCHOOLS || []).find(s => s.id === note.schoolId);
  const stageIdx = note.stageKey ? (window.STAGE_KEYS || []).indexOf(note.stageKey) : -1;
  const stageLabel = stageIdx >= 0 ? `${stageIdx + 1}. ${window.SCHOOL_STAGES[stageIdx]}` : (note.stageKey || '—');

  const print = () => {
    const win = window.open('', '_blank');
    if (!win) { alert('Pop-up blocked. Please allow pop-ups for the print view.'); return; }
    const items = (note.items || []).map(it =>
      `<tr><td>${it.description||''}</td><td style="text-align:right">${it.quantity||''}</td><td>${it.unit||''}</td></tr>`
    ).join('');
    win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Delivery Note ${note.id}</title>
      <style>body{font-family:Arial,sans-serif;font-size:12px;margin:24px;color:#0F172A}
      h1{font-size:18px;margin:0 0 4px} .meta{color:#64748B;font-size:11px;margin-bottom:18px}
      table{width:100%;border-collapse:collapse;margin:8px 0 16px}
      th,td{border:1px solid #cbd5e1;padding:6px 8px;text-align:left}
      th{background:#f1f5f9;text-transform:uppercase;font-size:10px;letter-spacing:.05em}
      .row{display:flex;gap:24px;margin:8px 0}.cell{flex:1}.label{font-size:10px;text-transform:uppercase;color:#64748B;letter-spacing:.05em}
      .val{font-weight:500} @media print { @page { size: A4; margin: 14mm; } }</style></head>
      <body><h1>Delivery Note · ${note.id}</h1>
      <div class="meta">Status: <strong>${note.status}</strong> · Created ${note.createdAt || ''}</div>
      <div class="row"><div class="cell"><div class="label">Project</div><div class="val">${proj?.name||note.projectId||'—'}</div></div>
        <div class="cell"><div class="label">School</div><div class="val">${sch?.nameEn||note.schoolId||'—'}</div></div>
        <div class="cell"><div class="label">Stage</div><div class="val">${stageLabel}</div></div></div>
      <div class="row"><div class="cell"><div class="label">Supplier</div><div class="val">${note.supplier||'—'}</div></div>
        <div class="cell"><div class="label">Contractor</div><div class="val">${note.contractor||'—'}</div></div>
        <div class="cell"><div class="label">Delivery date</div><div class="val">${note.deliveryDate||'—'}</div></div></div>
      <table><thead><tr><th>Description</th><th style="width:90px;text-align:right">Quantity</th><th style="width:80px">Unit</th></tr></thead><tbody>${items||'<tr><td colspan="3" style="color:#64748B"><em>No items</em></td></tr>'}</tbody></table>
      <div class="row"><div class="cell"><div class="label">Received by</div><div class="val">${note.receivedBy||'—'}</div></div></div>
      ${note.notes ? `<div class="row"><div class="cell"><div class="label">Notes</div><div class="val">${note.notes}</div></div></div>` : ''}
      ${note.signatureDataUrl ? `<div class="row" style="margin-top:24px"><div class="cell"><div class="label">Receiver signature</div><img src="${note.signatureDataUrl}" alt="signature" style="max-width:240px;max-height:80px;border:1px solid #e2e8f0;border-radius:6px;background:#fff" /></div></div>` : ''}
      <script>window.onload=()=>setTimeout(()=>window.print(),200)</script></body></html>`);
    win.document.close();
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" icon="arrow-left" onClick={onBack}>Back</Button>
        <div className="flex-1">
          <div className="text-xs text-ink-500 font-mono">{note.id}</div>
          <h1 className="text-xl font-semibold">Delivery Note</h1>
        </div>
        <Pill tone={DN_STATUS_TONE[note.status] || 'soft'}>{note.status}</Pill>
        <Button variant="outline" icon="file-text" onClick={print}>Print / Export PDF</Button>
        <Button variant="outline" icon="pencil" onClick={onEdit}>Edit</Button>
        <Button variant="ghost" icon="trash-2" onClick={onDelete}>Delete</Button>
      </div>

      <Card>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <Field label="Project"        value={proj?.name || note.projectId || '—'} />
          <Field label="School"         value={sch ? `${sch.id} · ${sch.nameEn || sch.name}` : (note.schoolId || '—')} />
          <Field label="Stage"          value={stageLabel} />
          <Field label="Supplier"       value={note.supplier || '—'} />
          <Field label="Contractor"     value={note.contractor || '—'} />
          <Field label="Delivery date"  value={note.deliveryDate || '—'} />
          <Field label="Received by"    value={note.receivedBy || '—'} />
          <Field label="Created at"     value={note.createdAt || '—'} />
        </div>
      </Card>

      <Card>
        <SectionTitle icon="package" title={`Items (${(note.items || []).length})`} />
        <table className="w-full text-sm">
          <thead className="surface-2 border-b border-soft text-xs">
            <tr>
              <th className="text-left px-3 py-2 font-semibold">Description</th>
              <th className="text-right px-3 py-2 font-semibold w-24">Quantity</th>
              <th className="text-left px-3 py-2 font-semibold w-24">Unit</th>
            </tr>
          </thead>
          <tbody>
            {(note.items || []).map((it, i) => (
              <tr key={i} className="border-b border-soft">
                <td className="px-3 py-2">{it.description || '—'}</td>
                <td className="px-3 py-2 text-right tnum">{it.quantity || '—'}</td>
                <td className="px-3 py-2 text-ink-700">{it.unit || '—'}</td>
              </tr>
            ))}
            {(note.items || []).length === 0 && (
              <tr><td colSpan={3} className="text-center py-6 text-xs text-ink-500 italic">No items.</td></tr>
            )}
          </tbody>
        </table>
      </Card>

      {note.notes && (
        <Card>
          <SectionTitle icon="file-text" title="Notes" />
          <div className="text-sm whitespace-pre-wrap text-ink-700">{note.notes}</div>
        </Card>
      )}

      {note.signatureDataUrl && (
        <Card>
          <SectionTitle icon="pen-tool" title="Receiver signature" />
          <img src={note.signatureDataUrl} alt="signature" data-testid="dn-signature-img" className="border border-ink-200 rounded-md bg-white" style={{ maxWidth: 240, maxHeight: 80 }} />
        </Card>
      )}

      <Card>
        <SectionTitle icon="upload" title={`Photos (${(note.photos || []).length})`}
          subtitle="Click a thumbnail to preview full size." />
        {(note.photos || []).length === 0 ? (
          <div className="text-xs text-ink-500 italic">No photos attached.</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {(note.photos || []).map(p => (
              <a key={p.path} href={p.url} target="_blank" rel="noopener noreferrer"
                className="block w-full rounded border border-soft overflow-hidden"
                style={{ aspectRatio: '1/1' }}>
                <img src={p.url} alt="" className="w-full h-full object-cover" />
              </a>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-ink-500">{label}</div>
      <div className="text-sm font-medium mt-0.5">{value}</div>
    </div>
  );
}

// ── Create / edit form ─────────────────────────────────────────────────────
function DeliveryNoteForm({ initial, projects, schools, onCancel, onSave }) {
  const isNew = !initial;
  const allSchools = schools || window.ALL_SCHOOLS || [];
  // R30.25 — when creating a new delivery note, honor the hint stashed by the
  // School Detail "New delivery note" deep link so the form opens pre-filled.
  const hint = React.useMemo(() => {
    if (initial) return null;  // editing existing — no hint
    try {
      const raw = sessionStorage.getItem('zamil_new_dn_hint');
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      sessionStorage.removeItem('zamil_new_dn_hint');  // consume once
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch (_) { return null; }
  }, [initial]);

  const [form, setForm] = React.useState(() => ({
    projectId:    initial?.projectId    || hint?.projectId    || (projects?.[0]?.id || ''),
    schoolId:     initial?.schoolId     || hint?.schoolId     || '',
    stageKey:     initial?.stageKey     || hint?.stageKey     || '',
    deliveryDate: initial?.deliveryDate || new Date().toISOString().slice(0, 10),
    supplier:     initial?.supplier     || '',
    contractor:   initial?.contractor   || '',
    receivedBy:   initial?.receivedBy   || '',
    notes:        initial?.notes        || '',
    status:       initial?.status       || 'received',
    items:        initial?.items?.length ? [...initial.items] : [{ description: '', quantity: '', unit: '' }],
    photos:       initial?.photos       || [],
    signatureDataUrl: initial?.signatureDataUrl || null,
  }));
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setItem = (i, patch) => setForm(f => ({ ...f, items: f.items.map((it, idx) => idx === i ? { ...it, ...patch } : it) }));
  const addItem = () => setForm(f => ({ ...f, items: [...f.items, { description: '', quantity: '', unit: '' }] }));
  const removeItem = (i) => setForm(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }));

  const projectSchools = allSchools.filter(s => s.projectId === form.projectId);
  const noteId = initial?.id || 'dn-new';

  const submit = (e) => {
    e && e.preventDefault && e.preventDefault();
    if (!form.schoolId) { alert('Please pick a school for this delivery.'); return; }
    const cleanedItems = form.items.filter(it => it.description.trim());
    onSave({ ...form, items: cleanedItems });
  };

  return (
    <form onSubmit={submit} className="p-6 space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" icon="arrow-left" type="button" onClick={onCancel}>Cancel</Button>
        <div className="flex-1">
          <h1 className="text-xl font-semibold">{isNew ? 'New delivery note' : `Edit delivery note · ${initial.id}`}</h1>
          <p className="text-xs text-ink-500">All required fields must be filled before saving.</p>
        </div>
        <Button variant="accent" icon="check" type="submit">Save</Button>
      </div>

      <Card>
        <div className="grid grid-cols-3 gap-3">
          <FormField label="Project">
            <Select value={form.projectId} onChange={v => { set('projectId', v); set('schoolId', ''); }}
              options={(projects || []).map(p => ({ value: p.id, label: p.name }))} />
          </FormField>
          <FormField label="School (required)">
            <Select value={form.schoolId} onChange={v => set('schoolId', v)}
              options={[{ value: '', label: '— Select a school —' }, ...projectSchools.slice(0, 250).map(s => ({ value: s.id, label: `${s.id} · ${s.nameEn || s.name}` }))]} />
          </FormField>
          <FormField label="Stage (optional)">
            <Select value={form.stageKey} onChange={v => set('stageKey', v)}
              options={[{ value: '', label: '— No specific stage —' }, ...(window.STAGE_KEYS || []).map((k, i) => ({ value: k, label: `${i + 1}. ${window.SCHOOL_STAGES[i]}` }))]} />
          </FormField>
          <FormField label="Delivery date">
            <input type="date" value={form.deliveryDate} onChange={e => set('deliveryDate', e.target.value)}
              className="w-full px-2.5 py-1.5 text-sm rounded-md border border-ink-200 bg-white" />
          </FormField>
          <FormField label="Supplier">
            <input type="text" value={form.supplier} onChange={e => set('supplier', e.target.value)}
              placeholder="e.g. Saudi Cable Group"
              className="w-full px-2.5 py-1.5 text-sm rounded-md border border-ink-200 bg-white" />
          </FormField>
          <FormField label="Contractor">
            <input type="text" value={form.contractor} onChange={e => set('contractor', e.target.value)}
              placeholder="Contractor name"
              className="w-full px-2.5 py-1.5 text-sm rounded-md border border-ink-200 bg-white" />
          </FormField>
          <FormField label="Received by">
            <input type="text" value={form.receivedBy} onChange={e => set('receivedBy', e.target.value)}
              placeholder="Name + role"
              className="w-full px-2.5 py-1.5 text-sm rounded-md border border-ink-200 bg-white" />
          </FormField>
          <FormField label="Status">
            <Select value={form.status} onChange={v => set('status', v)}
              options={DN_STATUSES.map(s => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) }))} />
          </FormField>
        </div>
      </Card>

      <Card>
        <SectionTitle icon="package" title="Items" subtitle="Add one row per line item delivered."
          action={<Button size="sm" variant="ghost" icon="plus" type="button" onClick={addItem}>Add row</Button>} />
        <table className="w-full text-sm">
          <thead className="surface-2 border-b border-soft text-xs">
            <tr>
              <th className="text-left px-3 py-2 font-semibold">Description</th>
              <th className="text-right px-3 py-2 font-semibold w-24">Quantity</th>
              <th className="text-left px-3 py-2 font-semibold w-24">Unit</th>
              <th className="px-2 py-2 w-8"></th>
            </tr>
          </thead>
          <tbody>
            {form.items.map((it, i) => (
              <tr key={i} className="border-b border-soft">
                <td className="px-3 py-1.5"><input type="text" value={it.description} onChange={e => setItem(i, { description: e.target.value })} placeholder="e.g. PV modules 540W"
                  className="w-full px-2 py-1 text-sm rounded border border-ink-200 bg-white" /></td>
                <td className="px-3 py-1.5"><input type="number" value={it.quantity} onChange={e => setItem(i, { quantity: e.target.value })}
                  className="w-full px-2 py-1 text-sm text-right tnum rounded border border-ink-200 bg-white" /></td>
                <td className="px-3 py-1.5"><input type="text" value={it.unit} onChange={e => setItem(i, { unit: e.target.value })} placeholder="pcs / m / kg"
                  className="w-full px-2 py-1 text-sm rounded border border-ink-200 bg-white" /></td>
                <td className="px-2 py-1.5 text-right">
                  {form.items.length > 1 && (
                    <button type="button" onClick={() => removeItem(i)} className="p-1 rounded hover:bg-ink-100 text-ink-500 hover:text-red-600">
                      <Icon name="trash-2" size={13} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card>
        <SectionTitle icon="file-text" title="Notes (optional)" />
        <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={3}
          placeholder="Damage, discrepancies, partial delivery, etc."
          className="w-full px-2.5 py-1.5 text-sm rounded-md border border-ink-200 bg-white" />
      </Card>

      <Card>
        <SectionTitle icon="upload" title="Receipt photos"
          subtitle="Up to 10 photos. Each is compressed to ≤ 500 KB before storage." />
        {window.ImageUploader && (
          <window.ImageUploader
            path={`delivery-notes/${noteId}`}
            maxCount={10}
            value={form.photos}
            onChange={(list) => set('photos', list)} />
        )}
      </Card>

      <Card>
        <SectionTitle icon="pen-tool" title="Receiver signature"
          subtitle="The receiver signs here to acknowledge delivery. Signature is embedded in the printed PDF." />
        <SignaturePad value={form.signatureDataUrl} onChange={(url) => set('signatureDataUrl', url)} />
      </Card>
    </form>
  );
}

// R30.6 — Pure-canvas signature pad. No deps. Touch + mouse. Outputs a PNG data URL.
function SignaturePad({ value, onChange }) {
  const canvasRef = React.useRef(null);
  const drawing = React.useRef(false);
  const last = React.useRef(null);
  const [restored, setRestored] = React.useState(false);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth, h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2;
    // Restore existing signature if any
    if (value && !restored) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, w, h);
      img.src = value;
      setRestored(true);
    }
  }, [value, restored]);

  const point = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const t = e.touches && e.touches[0];
    const x = (t ? t.clientX : e.clientX) - rect.left;
    const y = (t ? t.clientY : e.clientY) - rect.top;
    return { x, y };
  };

  const start = (e) => { e.preventDefault(); drawing.current = true; last.current = point(e); };
  const move  = (e) => {
    if (!drawing.current) return;
    e.preventDefault();
    const p = point(e);
    const ctx = canvasRef.current.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
  };
  const end = () => {
    if (!drawing.current) return;
    drawing.current = false;
    const url = canvasRef.current.toDataURL('image/png');
    onChange && onChange(url);
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    onChange && onChange(null);
    setRestored(false);
  };

  return (
    <div data-testid="signature-pad" className="space-y-2">
      <canvas ref={canvasRef}
        onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end}
        onTouchStart={start} onTouchMove={move} onTouchEnd={end}
        className="w-full border border-ink-200 rounded-md bg-white touch-none"
        style={{ height: 160 }} />
      <div className="flex items-center gap-2">
        <button type="button" onClick={clear}
          className="px-3 py-1 text-xs rounded border border-ink-200 text-ink-600 hover:bg-ink-50">
          Clear
        </button>
        <span className="text-xs text-ink-500">
          {value ? 'Signature captured' : 'Sign above with mouse or finger'}
        </span>
      </div>
    </div>
  );
}


function FormField({ label, children }) {
  return (
    <div>
      <label className="text-[11px] font-medium text-ink-700 mb-1 block">{label}</label>
      {children}
    </div>
  );
}

Object.assign(window, { PageDeliveryNotes });
