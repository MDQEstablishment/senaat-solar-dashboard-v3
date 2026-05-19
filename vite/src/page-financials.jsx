import React from 'react';
// Page 4 — Financials (wired to store-r2 financialEntries with auto-rollup)

function FinEntryModal({ open, onClose, onSave, projects, initial }) {
  const [type, setType]       = React.useState('Receipt');
  const [projectId, setPid]   = React.useState(projects[0]?.id || '');
  const [cId, setCId]         = React.useState('');
  const [amount, setAmount]   = React.useState('');
  const [date, setDate]       = React.useState(new Date().toISOString().slice(0,10));
  const [milestone, setMile]  = React.useState('');
  const [notes, setNotes]     = React.useState('');

  React.useEffect(() => {
    if (open) {
      setType(initial?.type || 'Receipt');
      setPid(initial?.projectId || projects[0]?.id || '');
      setCId(initial?.contractorId || '');
      setAmount(initial?.amount != null ? String(initial.amount) : '');
      setDate(initial?.date || new Date().toISOString().slice(0,10));
      setMile(initial?.relatedMilestone || '');
      setNotes(initial?.notes || '');
    }
  }, [open, initial]);

  // R32 — autosave draft. Key is per-entry (new vs editing). Called unconditionally
  // to respect React hooks rules. The hook itself ignores writes while open=false
  // because the form values won't change.
  const autoKey = 'fin-entry:' + (initial?.id || 'new');
  const draft = { type, projectId, contractorId: cId, amount, date, milestone, notes };
  const applyDraft = React.useCallback((updater) => {
    const next = typeof updater === 'function' ? updater(draft) : updater;
    if (!next) return;
    if ('type' in next) setType(next.type);
    if ('projectId' in next) setPid(next.projectId);
    if ('contractorId' in next) setCId(next.contractorId);
    if ('amount' in next) setAmount(next.amount);
    if ('date' in next) setDate(next.date);
    if ('milestone' in next) setMile(next.milestone);
    if ('notes' in next) setNotes(next.notes);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (typeof window !== 'undefined' && typeof window.useFormAutosave === 'function') {
    window.useFormAutosave(autoKey, draft, applyDraft);
  }

  return (
    <Modal open={open} onClose={onClose} title={initial ? 'Edit Financial Entry' : 'Add Financial Entry'}
      footer={<>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="accent" icon="check" onClick={() => {
          // R31 — projectId is mandatory for every financial entry (no standalone/overhead).
          if (!projectId) { alert('Please select a project for this entry.'); return; }
          if (!amount || isNaN(+amount)) { alert('Please enter a valid amount.'); return; }
          onSave({ ...(initial||{}), type, projectId, contractorId: cId || null, amount: +amount, date, relatedMilestone: milestone, notes, document: initial?.document || null });
          if (typeof window !== 'undefined' && typeof window.clearFormAutosave === 'function') window.clearFormAutosave(autoKey);
          onClose();
        }}>Save entry</Button>
      </>}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-medium text-ink-700 mb-1 block">Type</label>
            <Select value={type} onChange={setType} options={['Receipt','Receivable','Payment','Payable']} className="w-full" />
          </div>
          <div>
            <label className="text-[11px] font-medium text-ink-700 mb-1 block">Date</label>
            <TextField value={date} onChange={setDate} type="date" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-medium text-ink-700 mb-1 block">Project <span className="text-red-600">*</span></label>
            <Select value={projectId} onChange={setPid} options={projects.map(p=>({value:p.id,label:p.name}))} className="w-full" />
          </div>
          <div>
            <label className="text-[11px] font-medium text-ink-700 mb-1 block">Contractor (optional)</label>
            <Select value={cId} onChange={setCId} options={[{value:'',label:'— none —'}, ...CONTRACTORS.map(c=>({value:c.id,label:c.name}))]} className="w-full" />
          </div>
        </div>
        <div>
          <label className="text-[11px] font-medium text-ink-700 mb-1 block">Amount (SAR)</label>
          <TextField value={amount} onChange={setAmount} type="number" placeholder="0" />
        </div>
        <div>
          <label className="text-[11px] font-medium text-ink-700 mb-1 block">Related milestone / stage</label>
          <TextField value={milestone} onChange={setMile} placeholder="e.g. Advance Payment, 3rd milestone" />
        </div>
        <div>
          <label className="text-[11px] font-medium text-ink-700 mb-1 block">Notes</label>
          <TextField value={notes} onChange={setNotes} placeholder="Additional context…" />
        </div>
        <div className="text-[11px] text-ink-500">
          ℹ️ All KPIs on Dashboard, Program, and Project pages auto-recompute from these entries.
        </div>
      </div>
    </Modal>
  );
}

function EntriesTab({ projects, onAdd }) {
  const { financialEntries, updateFinancialEntry, deleteFinancialEntry, finRollup } = useStore();
  const [editEntry, setEditEntry] = React.useState(null);
  const [projFilter, setProjFilter] = React.useState('all');
  const [typeFilter, setTypeFilter] = React.useState('all');

  const roll = finRollup ? finRollup() : { receipts: 0, receivables: 0, payments: 0, payables: 0, net: 0 };

  const live = (financialEntries || []).filter(e => !e.archived).filter(e => {
    if (projFilter !== 'all' && e.projectId !== projFilter) return false;
    if (typeFilter !== 'all' && e.type !== typeFilter) return false;
    return true;
  });

  const typeTone = { Receipt:'ok', Receivable:'warn', Payment:'info', Payable:'danger' };

  return (
    <div className="space-y-4">
      <div className="bg-sky-50 border border-sky-200 rounded-md p-3 text-xs text-sky-800 flex items-start gap-2">
        <Icon name="info" size={14} />
        <span>All financial KPIs are computed from the entries below. Add or edit entries to update KPIs across all dashboards.</span>
      </div>

      <div className="grid grid-cols-5 gap-2 text-center">
        {[['Received', roll.receipts, 'text-emerald-700'], ['Receivable', roll.receivables, 'text-amber-600'],
          ['Paid out', roll.payments, 'text-sky-700'], ['Payable', roll.payables, 'text-red-600'],
          ['Net cash', roll.net, roll.net >= 0 ? 'text-emerald-700' : 'text-red-600']].map(([l,v,cls]) => (
          <div key={l} className="border border-soft rounded-md p-3">
            <div className="text-[10px] uppercase tracking-wider text-ink-500">{l}</div>
            <div className={`text-lg font-bold num mt-1 ${cls}`}>SAR {SAR(Math.abs(v))}</div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Select value={projFilter} onChange={setProjFilter}
          options={[{value:'all',label:'All projects'}, ...projects.map(p=>({value:p.id,label:p.name}))]} />
        <Select value={typeFilter} onChange={setTypeFilter}
          options={[{value:'all',label:'All types'},{value:'Receipt',label:'Receipt'},{value:'Receivable',label:'Receivable'},{value:'Payment',label:'Payment'},{value:'Payable',label:'Payable'}]} />
        <div className="ml-auto text-xs text-ink-500">{live.length} entries</div>
        <Button icon="plus" variant="accent" onClick={onAdd}>Add Entry</Button>
      </div>

      <div className="border border-soft rounded-md overflow-hidden">
        <table className="w-full text-sm">
          <thead className="surface-2 text-[11px] uppercase tracking-wider text-ink-500">
            <tr>
              <th className="text-left px-3 py-2">Type</th>
              <th className="text-left px-3 py-2">Project</th>
              <th className="text-left px-3 py-2">Contractor</th>
              <th className="text-right px-3 py-2">Amount (SAR)</th>
              <th className="text-left px-3 py-2">Date</th>
              <th className="text-left px-3 py-2">Milestone</th>
              <th className="text-left px-3 py-2">Notes</th>
              <th className="text-right px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {live.map(e => {
              const p = projects.find(x=>x.id===e.projectId);
              const c = CONTRACTORS.find(x=>x.id===e.contractorId);
              return (
                <tr key={e.id} className="border-t border-soft hover-row">
                  <td className="px-3 py-2"><Pill tone={typeTone[e.type]||'soft'}>{e.type}</Pill></td>
                  <td className="px-3 py-2 text-xs">{p?.name || '—'}</td>
                  <td className="px-3 py-2 text-xs">{c?.name || '—'}</td>
                  <td className="px-3 py-2 text-right tnum font-semibold">{SARfull(e.amount)}</td>
                  <td className="px-3 py-2 text-xs text-ink-500">{fmtDate(e.date)}</td>
                  <td className="px-3 py-2 text-xs">{e.relatedMilestone || '—'}</td>
                  <td className="px-3 py-2 text-xs text-ink-500 max-w-[180px] truncate">{e.notes || '—'}</td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex items-center gap-1 justify-end">
                      {e.document && <span title="Document attached" className="text-sky-600"><Icon name="file-text" size={13} /></span>}
                      <button onClick={() => setEditEntry(e)} className="p-1 rounded hover:bg-ink-100 text-ink-500 hover:text-ink-900" title="Edit"><Icon name="pencil" size={14} /></button>
                      <button onClick={() => deleteFinancialEntry(e.id)} className="p-1 rounded hover:bg-ink-100 text-ink-500 hover:text-red-600" title="Delete"><Icon name="trash-2" size={14} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {live.length === 0 && (
              <tr><td colSpan="8" className="text-center py-8 text-xs text-ink-500 italic">No entries match the filter.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {editEntry && (
        <FinEntryModal open={true} onClose={() => setEditEntry(null)}
          onSave={(data) => { updateFinancialEntry(data.id, data); setEditEntry(null); }}
          projects={projects} initial={editEntry} />
      )}
    </div>
  );
}

function PageFinancials({ projects, fin }) {
  const { financialEntries, addFinancialEntry, finRollup } = useStore();
  const [tab, setTab] = React.useState('Per Project');
  const [entryModal, setEntryModal] = React.useState(false);
  // H2: Use useRecharts() hook so the page re-renders when the recharts chunk arrives.
  const recharts = (typeof window.useRecharts === 'function' ? window.useRecharts() : window.Recharts) || null;
  const { LineChart, Line, BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend } = recharts || {};

  // Use store entries for rollup KPIs if available, else fall back to static fin
  const hasEntries = financialEntries && financialEntries.length > 0;
  const roll = (finRollup && hasEntries) ? finRollup() : null;

  const totals = projects.reduce((a, p) => {
    const f = (fin || []).find(x => x.projectId === p.id) || { invoiced: 0, received: 0, outstanding: 0 };
    a.value += p.value;
    a.invoiced += f.invoiced || 0;
    a.received += f.received || 0;
    a.outstanding += f.outstanding || 0;
    return a;
  }, { value: 0, invoiced: 0, received: 0, outstanding: 0 });

  const kpiReceived   = roll ? roll.receipts    : totals.received;
  const kpiReceivable = roll ? roll.receivables  : totals.outstanding;
  const kpiPaid       = roll ? roll.payments     : 0;
  const kpiPayable    = roll ? roll.payables     : 0;

  const aging = [
    { bucket: '0–30',  amount: 18_400_000 },
    { bucket: '31–60', amount: 12_800_000 },
    { bucket: '61–90', amount: 6_200_000  },
    { bucket: '90+',   amount: 4_100_000  },
  ];

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-end justify-between">
        <h1 className="text-2xl font-bold ink-on-dark">Financials</h1>
        <Button icon="plus" variant="accent" onClick={() => setEntryModal(true)}>Add Entry</Button>
      </div>

      {hasEntries && (
        <div className="text-[11px] text-ink-500 bg-sky-50 border border-sky-200 rounded-md p-2.5">
          ℹ️ All financial values below are auto-computed from the <strong>Financial Entries</strong> table. Add or edit entries to update these KPIs.
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          ['Total Contract Value', SAR(totals.value), 'banknote', null],
          ['Received',   SAR(kpiReceived),   'check-circle', 'text-emerald-700'],
          ['Receivable', SAR(kpiReceivable), 'alert-circle', 'text-amber-600'],
          ['Paid out',   SAR(kpiPaid),       'arrow-up-circle', 'text-sky-700'],
        ].map(([l, v, ic, vCls]) => (
          <Card key={l} padding="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-ink-500 ink-muted-on-dark">{l}</div>
                <div className={cls(vCls || 'ink-on-dark', 'text-2xl font-bold tnum mt-1')}>SAR {v}</div>
              </div>
              <div className="w-9 h-9 rounded-md bg-ink-50 flex items-center justify-center text-ink-500">
                <Icon name={ic} size={18} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card padding="p-0">
        <div className="px-5 pt-3">
          <Tabs tabs={['Per Project','Cash Flow','Entries']} active={tab} onChange={setTab} />
        </div>

        <div className="p-5">
          {tab === 'Entries' && (
            <EntriesTab projects={projects} onAdd={() => setEntryModal(true)} />
          )}

          {tab === 'Cash Flow' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2">
                <SectionTitle title="Cumulative Invoiced vs Received (SAR M)" />
                <div style={{ width: '100%', height: 260, position: 'relative' }}>
                  {!recharts && (
                    <div className="absolute inset-0 flex items-center justify-center text-xs text-ink-400">Loading chart…</div>
                  )}
                  {recharts && (FIN_CURVE && FIN_CURVE.length > 0) ? (
                    <ResponsiveContainer>
                      <LineChart data={FIN_CURVE}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                        <XAxis dataKey="month" stroke="#94A3B8" fontSize={11} />
                        <YAxis stroke="#94A3B8" fontSize={11} />
                        <Tooltip />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Line type="monotone" dataKey="invoiced" stroke="#0B2545" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="received" stroke="#B8860B" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (recharts && (
                    <div className="absolute inset-0 flex items-center justify-center z-10 bg-white/85 rounded-md border border-dashed border-soft">
                      <div className="text-center px-4">
                        <Icon name="trending-up" size={28} className="text-ink-200 mb-2 mx-auto" />
                        <div className="text-sm font-medium text-ink-700">No cash flow data yet</div>
                        <div className="text-xs text-ink-500 mt-1">Chart will populate as financial entries are recorded.</div>
                      </div>
                    </div>
                  ))}
                </div>
                {/* R15 #4: Cash Flow chart demo caption */}
                <p className="text-xs text-slate-500 italic mt-2">Curve shown is a representative trend; live cumulative data populates post-integration with the accounting system.</p>
              </div>
              <div>
                <SectionTitle title="Aging buckets" subtitle="Outstanding receivables by age" />
                <div style={{ width: '100%', height: 260, position: 'relative' }}>
                  {!recharts && <div className="absolute inset-0 flex items-center justify-center text-xs text-ink-400">Loading chart…</div>}
                  {recharts && (
                  <ResponsiveContainer>
                    <BarChart data={aging}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                      <XAxis dataKey="bucket" stroke="#94A3B8" fontSize={11} />
                      <YAxis stroke="#94A3B8" fontSize={11} tickFormatter={v => SAR(v)} />
                      <Tooltip formatter={v => 'SAR ' + SARfull(v)} />
                      <Bar dataKey="amount" fill="#13315C" radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>)}
                </div>
              </div>
            </div>
          )}

          {tab === 'Per Project' && fin && fin.length > 0 && (
            <div className="overflow-x-auto scrollbar-thin border border-soft rounded-md">
              <table className="w-full text-sm">
                <thead className="surface-2 text-[11px] uppercase tracking-wider text-ink-500 ink-muted-on-dark">
                  <tr>
                    <th className="text-left px-3 py-2">Project</th>
                    <th className="text-right px-3 py-2">Total Value</th>
                    <th className="text-right px-3 py-2">Invoiced</th>
                    <th className="text-right px-3 py-2">Received</th>
                    <th className="text-right px-3 py-2">Outstanding</th>
                    <th className="text-left px-3 py-2">Next Payment</th>
                    <th className="text-right px-3 py-2">Amount</th>
                    <th className="text-left px-3 py-2">Aging</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map(p => {
                    const f = fin.find(x => x.projectId === p.id);
                    if (!f) return null;
                    const next = f.milestones.find(m => m.status !== 'Paid');
                    const ageDays = Math.round(f.outstanding / Math.max(1, f.invoiced) * 75);
                    const ageTone = ageDays > 60 ? 'danger' : ageDays > 30 ? 'warn' : 'ok';
                    return (
                      <tr key={p.id} className="border-t border-soft hover-row">
                        <td className="px-3 py-2 ink-on-dark font-medium">{p.name}</td>
                        <td className="px-3 py-2 text-right tnum">{SARfull(p.value)}</td>
                        <td className="px-3 py-2 text-right tnum">{SARfull(f.invoiced)}</td>
                        <td className="px-3 py-2 text-right tnum text-emerald-700">{SARfull(f.received)}</td>
                        <td className="px-3 py-2 text-right tnum font-semibold">{SARfull(f.outstanding)}</td>
                        <td className="px-3 py-2 text-xs">{next ? `${next.name} · ${next.due}` : '—'}</td>
                        <td className="px-3 py-2 text-right tnum text-xs">{next ? SARfull(next.amount) : '—'}</td>
                        <td className="px-3 py-2"><Pill tone={ageTone}>{ageDays}d</Pill></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>

      {fin && fin.length > 0 && (
        <Card>
          <SectionTitle icon="milestone" title="Payment Milestones" subtitle="Sample: Hail Schools Solar Program" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {fin[1]?.milestones.map(m => (
              <div key={m.name} className="border border-soft rounded-md p-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold ink-on-dark">{m.name}</div>
                  <StatusPill status={m.status} />
                </div>
                <div className="mt-2 text-xs text-ink-500">Due <span className="ink-on-dark tnum">{m.due}</span></div>
                <div className="text-xs text-ink-500">Received <span className="ink-on-dark tnum">{m.received || '—'}</span></div>
                <div className="text-base font-bold mt-1.5 tnum ink-on-dark">SAR {SARfull(m.amount)}</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <FinEntryModal open={entryModal} onClose={() => setEntryModal(false)}
        onSave={(data) => { addFinancialEntry(data); }}
        projects={projects} initial={null} />
    </div>
  );
}

Object.assign(window, { PageFinancials });
