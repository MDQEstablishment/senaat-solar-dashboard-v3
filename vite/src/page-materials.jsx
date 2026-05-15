import React from 'react';
// Page 3 — Materials (wired to store-r2 for full CRUD)

function MaterialTable({ items, projects, onEdit, onDelete }) {
  if (items.length === 0) {
    return <EmptyState icon="package" title="No materials" message="Add a planned item to start tracking quantities through the warehouse to site." />;
  }
  return (
    <div className="overflow-x-auto scrollbar-thin border border-soft rounded-md">
      <table className="w-full text-sm">
        <thead className="surface-2 text-[11px] uppercase tracking-wider text-ink-500 ink-muted-on-dark">
          <tr>
            <th className="text-left px-3 py-2">Item</th>
            <th className="text-left px-3 py-2">Linked Project</th>
            <th className="text-right px-3 py-2">Planned</th>
            <th className="text-right px-3 py-2">Ordered</th>
            <th className="text-right px-3 py-2">Wh</th>
            <th className="text-right px-3 py-2">Site</th>
            <th className="text-right px-3 py-2">Installed</th>
            <th className="text-left px-3 py-2">Status</th>
            <th className="text-left px-3 py-2">Stock</th>
            <th className="text-right px-3 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {items.map(it => {
            const p = projects.find(x => x.id === it.projectId);
            const pct = it.planned > 0 ? it.installed / it.planned : 0;
            const tone = pct >= 0.85 ? 'ok' : pct >= 0.5 ? 'gold' : pct >= 0.2 ? 'info' : 'soft';
            return (
              <tr key={it.id} className="border-t border-soft hover-row">
                <td className="px-3 py-2 font-medium ink-on-dark">{it.item}</td>
                <td className="px-3 py-2 text-ink-700 text-xs">{p?.name || '—'}</td>
                <td className="px-3 py-2 text-right tnum">{it.planned.toLocaleString()}</td>
                <td className="px-3 py-2 text-right tnum">{it.ordered.toLocaleString()}</td>
                <td className="px-3 py-2 text-right tnum">{it.dWh.toLocaleString()}</td>
                <td className="px-3 py-2 text-right tnum">{it.dSite.toLocaleString()}</td>
                <td className="px-3 py-2 text-right tnum font-semibold">{it.installed.toLocaleString()}</td>
                <td className="px-3 py-2"><Pill tone={tone}>{it.status}</Pill></td>
                <td className="px-3 py-2">
                  <span className="inline-flex items-center gap-1 text-[11px] text-info">
                    <Icon name="link" size={11} /> Warehouse
                  </span>
                </td>
                <td className="px-3 py-2 text-right">
                  <div className="flex items-center gap-1 justify-end">
                    <button onClick={() => onEdit(it)} className="p-1 rounded hover:bg-ink-100 text-ink-500 hover:text-ink-900" title="Edit"><Icon name="pencil" size={14} /></button>
                    <button onClick={() => onDelete(it)} className="p-1 rounded hover:bg-ink-100 text-ink-500 hover:text-red-600" title="Delete"><Icon name="trash-2" size={14} /></button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function MaterialModal({ open, onClose, onSave, projects, initial }) {
  const [item, setItem] = React.useState('');
  const [projectId, setProjectId] = React.useState(projects[0]?.id || '');
  const [fix, setFix] = React.useState('Fix1');
  const [planned, setPlanned] = React.useState(0);
  const [ordered, setOrdered] = React.useState(0);
  const [dWh, setDWh] = React.useState(0);
  const [dSite, setDSite] = React.useState(0);
  const [installed, setInstalled] = React.useState(0);

  React.useEffect(() => {
    if (open) {
      setItem(initial?.item || '');
      setProjectId(initial?.projectId || projects[0]?.id || '');
      setFix(initial?.fix || 'Fix1');
      setPlanned(initial?.planned ?? 0);
      setOrdered(initial?.ordered ?? 0);
      setDWh(initial?.dWh ?? 0);
      setDSite(initial?.dSite ?? 0);
      setInstalled(initial?.installed ?? 0);
    }
  }, [open, initial]);

  const computeStatus = () => {
    const p = +planned, i = +installed, s = +dSite, w = +dWh, o = +ordered;
    if (i >= p * 0.85) return 'Near Complete';
    if (s >= p * 0.5) return 'Installing';
    if (w >= p * 0.5) return 'In Transit';
    if (o > 0) return 'Ordered';
    return 'Planning';
  };

  return (
    <Modal open={open} onClose={onClose} title={initial ? 'Edit Material Item' : 'Add Material Item'}
      footer={<>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="accent" icon="check" onClick={() => {
          if (!item.trim()) return;
          onSave({ ...(initial || {}), item, projectId, fix, planned: +planned, ordered: +ordered, dWh: +dWh, dSite: +dSite, installed: +installed, status: computeStatus() });
          onClose();
        }}>Save</Button>
      </>}>
      <div className="space-y-3">
        <div>
          <label className="text-[11px] font-medium text-ink-700 mb-1 block">Item name</label>
          <TextField value={item} onChange={setItem} placeholder="e.g. Panels (550W)" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-medium text-ink-700 mb-1 block">Category</label>
            <Select value={fix} onChange={setFix} options={['Fix1','Fix2']} className="w-full" />
          </div>
          <div>
            <label className="text-[11px] font-medium text-ink-700 mb-1 block">Project</label>
            <Select value={projectId} onChange={setProjectId} options={projects.map(p => ({ value: p.id, label: p.name }))} className="w-full" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[['Planned qty', planned, setPlanned], ['Ordered', ordered, setOrdered], ['At Warehouse', dWh, setDWh],
            ['At Site', dSite, setDSite], ['Installed', installed, setInstalled]].map(([lbl, val, setter]) => (
            <div key={lbl}>
              <label className="text-[11px] font-medium text-ink-700 mb-1 block">{lbl}</label>
              <TextField value={val} onChange={setter} type="number" />
            </div>
          ))}
        </div>
        <div className="text-[11px] text-ink-500 bg-ink-50 rounded p-2">Status auto-computes from quantities when saved.</div>
      </div>
    </Modal>
  );
}

function ImportMaterialsModal({ open, onClose }) {
  const [importing, setImporting] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const downloadTemplate = () => {
    const csv = ['Item,Category,Project,Planned,Ordered,AtWarehouse,AtSite,Installed', 'Panels (550W),Fix1,p1,11200,11200,9800,7200,6900'].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'materials-import-template.csv';
    a.click();
  };
  const handleImport = () => {
    setImporting(true);
    setTimeout(() => { setImporting(false); setDone(true); }, 1200);
  };
  React.useEffect(() => { if (open) setDone(false); }, [open]);
  return (
    <Modal open={open} onClose={onClose} title="Import Materials"
      footer={<>
        <Button variant="ghost" onClick={onClose}>Close</Button>
        {!done && <Button variant="accent" icon="upload" onClick={handleImport} disabled={importing}>{importing ? 'Importing…' : 'Import'}</Button>}
      </>}>
      <div className="space-y-4">
        <div className="bg-sky-50 border border-sky-200 rounded-md p-3 text-xs text-sky-800">
          <div className="font-semibold mb-1">Import instructions</div>
          <ol className="list-decimal list-inside space-y-1">
            <li>Download the template below</li>
            <li>Fill in your materials (one row per item)</li>
            <li>Upload the completed file</li>
          </ol>
        </div>
        <Button variant="outline" icon="file-spreadsheet" onClick={downloadTemplate}>Download Excel template (.csv)</Button>
        {!done ? (
          <div className="border-2 border-dashed border-soft rounded-md p-8 text-center text-xs text-ink-500">
            <Icon name="upload" size={20} />
            <div className="mt-2 font-medium">Drop your CSV file here or click to browse</div>
            <input type="file" className="hidden" />
          </div>
        ) : (
          <div className="bg-emerald-50 border border-emerald-200 rounded-md p-4 text-sm text-emerald-800 text-center">
            <Icon name="check-circle" size={20} />
            <div className="mt-1 font-semibold">Import complete</div>
            <div className="text-xs text-emerald-700">Materials have been added to the list.</div>
          </div>
        )}
      </div>
    </Modal>
  );
}

function PageMaterials({ projects }) {
  const { materials, addMaterial, updateMaterial, deleteMaterial } = useStore();

  const [projectFilter, setProjectFilter] = React.useState('All');
  const [regionFilter, setRegionFilter] = React.useState('All');
  const [search, setSearch] = React.useState('');
  const [modal, setModal] = React.useState({ open: false, initial: null });
  const [importOpen, setImportOpen] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(null);

  const filtered = (materials || MATERIALS).filter(m => !m.archived).filter(m => {
    if (projectFilter !== 'All' && m.projectId !== projectFilter) return false;
    if (regionFilter !== 'All') {
      const p = projects.find(x => x.id === m.projectId);
      if (p?.region !== regionFilter) return false;
    }
    if (search && !m.item.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const fix1 = filtered.filter(m => m.fix === 'Fix1');
  const fix2 = filtered.filter(m => m.fix === 'Fix2');

  const handleSave = (data) => {
    if (data.id) {
      updateMaterial(data.id, data);
    } else {
      addMaterial(data);
    }
  };

  const handleDelete = (item) => {
    deleteMaterial(item.id);
    setConfirmDelete(null);
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold ink-on-dark">Materials</h1>
          <p className="text-xs text-ink-500 ink-muted-on-dark mt-0.5">Fix1 & Fix2 inventory · full CRUD · linked to warehouse</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={projectFilter} onChange={setProjectFilter} options={[{value:'All',label:'All projects'}, ...projects.map(p => ({ value: p.id, label: p.name }))]} />
          <Select value={regionFilter} onChange={setRegionFilter} options={[{value:'All',label:'All regions'}, ...REGIONS.map(r=>({value:r,label:r}))]} />
          <TextField value={search} onChange={setSearch} placeholder="Search items…" className="!w-48" />
          <Button icon="upload" variant="outline" onClick={() => setImportOpen(true)}>Import</Button>
          <Button icon="plus" variant="accent" onClick={() => setModal({ open: true, initial: null })}>Add Item</Button>
        </div>
      </div>

      <div className="text-[11px] text-ink-500 bg-ink-50 border border-soft rounded-md p-2.5">
        All material quantities are tracked from plan → order → warehouse → site → installed. Edit any row to update figures.
        Deleted items are permanently removed (confirmation required).
      </div>

      <Card>
        <SectionTitle icon="package" title="Fix1 — Structural & DC"
          subtitle="Panels, Foundations, Structures, End Clamps, Small Blocks, Cable Trays, DC Cables, Fix1 Accessories"
          action={<span className="text-xs text-ink-500">{fix1.length} items</span>} />
        <MaterialTable items={fix1} projects={projects} onEdit={it => setModal({ open: true, initial: it })} onDelete={it => setConfirmDelete(it)} />
      </Card>

      <Card>
        <SectionTitle icon="zap" title="Fix2 — AC & Monitoring"
          subtitle="Inverter, SMDB, MCCB, Data Logger, AC Cables, Export Meter, CTs, Data Cable, EMT Pipe, Fix2 Accessories"
          action={<span className="text-xs text-ink-500">{fix2.length} items</span>} />
        <MaterialTable items={fix2} projects={projects} onEdit={it => setModal({ open: true, initial: it })} onDelete={it => setConfirmDelete(it)} />
      </Card>

      <MaterialModal open={modal.open} onClose={() => setModal({ open: false, initial: null })} onSave={handleSave} projects={projects} initial={modal.initial} />
      <ImportMaterialsModal open={importOpen} onClose={() => setImportOpen(false)} />

      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Delete material item"
        footer={<>
          <Button variant="ghost" onClick={() => setConfirmDelete(null)}>Cancel</Button>
          <Button variant="danger" icon="trash-2" onClick={() => handleDelete(confirmDelete)}>Delete permanently</Button>
        </>}>
        <p className="text-sm">Delete <strong>{confirmDelete?.item}</strong>? This will permanently remove the material. This cannot be undone.</p>
      </Modal>
    </div>
  );
}

Object.assign(window, { PageMaterials });
