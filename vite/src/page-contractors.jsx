import React from 'react';
// Page 5 — Contractors (milestone-based auto-scoring from store-r2)

function PageContractors({ contractors, projects }) {
  const { contractorScore, milestoneTemplates, milestoneEntries, setMilestoneEntry } = useStore();
  const [selected, setSelected] = React.useState(null);
  const [entryModal, setEntryModal] = React.useState(null); // { contractorId, template }
  const { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip } = window.Recharts;

  const getScore = (c) => {
    if (contractorScore) {
      const s = contractorScore(c.id);
      return s > 0 ? s : Math.round((c.schedule + c.quality + c.hse + c.docs) / 4);
    }
    return Math.round((c.schedule + c.quality + c.hse + c.docs) / 4);
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold ink-on-dark">Contractors</h1>
          <p className="text-xs text-ink-500 ink-muted-on-dark mt-0.5">Performance auto-scored from milestone entries · weekly scorecards across schedule, quality, HSE, docs</p>
        </div>
        <Button icon="plus" variant="accent">Add Contractor</Button>
      </div>

      {milestoneTemplates && milestoneTemplates.length > 0 && (
        <div className="text-[11px] text-sky-800 bg-sky-50 border border-sky-200 rounded-md p-2.5">
          ℹ️ Overall scores are auto-computed from milestone entries recorded below. Weights are configured in Settings → Milestone Templates.
          {milestoneTemplates.map(mt => <span key={mt.id} className="ml-2 font-medium">{mt.name} ({mt.weight}%)</span>)}
        </div>
      )}

      {contractors.length === 0 ? (
        <EmptyState icon="hard-hat" title="No contractors yet" message="Add your first contractor to start tracking performance."
          action={<Button icon="plus" variant="accent">Add Contractor</Button>} />
      ) : (
        <Card padding="p-0">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-sm">
              <thead className="surface-2 text-[11px] uppercase tracking-wider text-ink-500 ink-muted-on-dark">
                <tr>
                  <th className="text-left px-3 py-2">Contractor</th>
                  <th className="text-left px-3 py-2">Region</th>
                  <th className="text-right px-3 py-2">Active Sites</th>
                  <th className="text-right px-3 py-2">Schedule</th>
                  <th className="text-right px-3 py-2">Quality</th>
                  <th className="text-right px-3 py-2">HSE</th>
                  <th className="text-right px-3 py-2">Docs</th>
                  <th className="text-left px-3 py-2">Overall (milestone)</th>
                  <th className="text-left px-3 py-2">Trend</th>
                  <th className="text-right px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {contractors.map(c => {
                  const overall = getScore(c);
                  return (
                    <tr key={c.id} className="border-t border-soft hover-row cursor-pointer" onClick={() => setSelected(c)}>
                      <td className="px-3 py-2 font-medium ink-on-dark">{c.name}</td>
                      <td className="px-3 py-2 text-xs text-ink-700">{c.region}</td>
                      <td className="px-3 py-2 text-right tnum">{c.activeSites}</td>
                      <td className="px-3 py-2 text-right tnum">{c.schedule}</td>
                      <td className="px-3 py-2 text-right tnum">{c.quality}</td>
                      <td className="px-3 py-2 text-right tnum">{c.hse}</td>
                      <td className="px-3 py-2 text-right tnum">{c.docs}</td>
                      <td className="px-3 py-2"><ScoreBadge score={overall} /></td>
                      <td className="px-3 py-2"><Sparkline data={c.trend} width={70} height={20} color={overall >= 85 ? '#16A34A' : overall >= 70 ? '#EAB308' : '#DC2626'} /></td>
                      <td className="px-3 py-2 text-right"><RowActions onEdit={() => {}} onArchive={() => {}} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <SlideOver open={!!selected} onClose={() => setSelected(null)} title={selected?.name} width="max-w-xl">
        {selected && (
          <div className="space-y-5">
            <div className="grid grid-cols-4 gap-2">
              {[['Schedule', selected.schedule], ['Quality', selected.quality], ['HSE', selected.hse], ['Docs', selected.docs]].map(([l, v]) => (
                <div key={l} className="border border-soft rounded-md p-2 text-center">
                  <div className="text-[10px] uppercase text-ink-500">{l}</div>
                  <div className="text-xl font-bold tnum">{v}</div>
                </div>
              ))}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <SectionTitle title="Overall milestone score" className="!mb-0" />
                <ScoreBadge score={getScore(selected)} />
              </div>
              <div className="text-[11px] text-ink-500">Auto-computed from milestone entries weighted by template:</div>
              {(milestoneTemplates || []).map(mt => {
                const entry = (milestoneEntries || []).find(e => e.contractorId === selected.id && e.templateId === mt.id);
                const scoreField = mt.fields.find(f => f.label.includes('Score'));
                const score = scoreField && entry ? Number(entry.values[scoreField.id] || 0) : null;
                return (
                  <div key={mt.id} className="flex items-center gap-2 p-2 border border-soft rounded-md mt-1">
                    <div className="flex-1">
                      <div className="text-xs font-medium">{mt.name}</div>
                      <div className="text-[10px] text-ink-500">Weight: {mt.weight}%</div>
                    </div>
                    {score !== null ? <ScoreBadge score={score} /> : <span className="text-[11px] text-ink-500 italic">No entry</span>}
                    <Button size="sm" variant="outline" icon="pencil" onClick={e => { e.stopPropagation(); setEntryModal({ contractorId: selected.id, template: mt, entry }); }}>
                      {entry ? 'Edit' : 'Enter'}
                    </Button>
                  </div>
                );
              })}
            </div>

            <div>
              <SectionTitle title="Weekly trend" />
              <div style={{ width: '100%', height: 160 }}>
                <ResponsiveContainer>
                  <LineChart data={selected.trend.map((v, i) => ({ wk: 'W' + (i + 1), v }))}>
                    <XAxis dataKey="wk" stroke="#94A3B8" fontSize={11} />
                    <YAxis stroke="#94A3B8" fontSize={11} domain={[50, 100]} />
                    <Tooltip />
                    <Line type="monotone" dataKey="v" stroke="#B8860B" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div>
              <SectionTitle title="Assigned scope" />
              <div className="space-y-2">
                {selected.projects.map(pid => {
                  const p = projects.find(x => x.id === pid);
                  return p && (
                    <div key={pid} className="flex items-center justify-between border border-soft rounded-md p-2.5">
                      <div className="text-sm font-medium">{p.name}</div>
                      <Pill tone="navy">{p.progress}%</Pill>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <SectionTitle title="Open NCRs" />
              {selected.id === 'c4' ? (
                <div className="space-y-2 text-xs">
                  <div className="border border-soft rounded-md p-2"><span className="font-semibold text-red-600">NCR-0142</span> · Torque records missing — Jazan batch 12</div>
                  <div className="border border-soft rounded-md p-2"><span className="font-semibold text-red-600">NCR-0139</span> · Cable tray installation deviates from drawing</div>
                </div>
              ) : <div className="text-xs text-ink-500">No open NCRs.</div>}
            </div>
          </div>
        )}
      </SlideOver>

      {entryModal && (
        <MilestoneEntryModal
          open={true}
          onClose={() => setEntryModal(null)}
          template={entryModal.template}
          existing={entryModal.entry}
          onSave={(values) => {
            setMilestoneEntry(entryModal.contractorId, entryModal.template.id, values);
            setEntryModal(null);
          }} />
      )}
    </div>
  );
}

function MilestoneEntryModal({ open, onClose, template, existing, onSave }) {
  const [values, setValues] = React.useState({});
  React.useEffect(() => {
    if (open) setValues(existing?.values || {});
  }, [open, existing]);
  const setValue = (id, v) => setValues(prev => ({ ...prev, [id]: v }));

  return (
    <Modal open={open} onClose={onClose} title={`Milestone: ${template.name}`}
      footer={<>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="accent" icon="check" onClick={() => { onSave(values); }}>Save entry</Button>
      </>}>
      <div className="space-y-3">
        <div className="text-[11px] text-ink-500">Weight: {template.weight}% of overall score</div>
        {template.fields.map(f => (
          <div key={f.id}>
            <label className="text-[11px] font-medium text-ink-700 mb-1 block">{f.label}</label>
            {f.type === 'number' && (
              <TextField value={values[f.id] || ''} onChange={v => setValue(f.id, v)} type="number" placeholder="0" />
            )}
            {f.type === 'date' && (
              <TextField value={values[f.id] || ''} onChange={v => setValue(f.id, v)} type="date" />
            )}
            {f.type === 'text' && (
              <TextField value={values[f.id] || ''} onChange={v => setValue(f.id, v)} placeholder={f.label} />
            )}
            {f.type === 'file' && (
              <div className="flex items-center gap-2">
                <div className="flex-1 border-2 border-dashed border-soft rounded-md p-2 text-center text-xs text-ink-500">
                  {values[f.id] ? <span className="text-emerald-600 font-medium">{values[f.id]}</span> : 'Click to upload'}
                </div>
                <Button size="sm" variant="outline" icon="upload" onClick={() => setValue(f.id, 'uploaded-doc.pdf')}>Upload</Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </Modal>
  );
}

Object.assign(window, { PageContractors });
