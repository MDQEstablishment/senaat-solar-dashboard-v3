// Page 7 — Employees

function PageEmployees({ employees, setEmployees }) {
  const [selected, setSelected] = React.useState(null);
  const [emailToggle, setEmailToggle] = React.useState(true);
  const [modal, setModal] = React.useState({ open: false, initial: null });

  const archive = (id) => setEmployees(curr => curr.filter(e => e.id !== id));
  const save = (e) => setEmployees(curr => {
    if (curr.find(x => x.id === e.id)) return curr.map(x => x.id === e.id ? e : x);
    return [...curr, { ...e, id: 'u-' + Date.now() }];
  });

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold ink-on-dark">Employees</h1>
          <p className="text-xs text-ink-500 ink-muted-on-dark mt-0.5">Program Manager view — task load, velocity, bottlenecks</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs ink-on-dark">
            <input type="checkbox" checked={emailToggle} onChange={e => setEmailToggle(e.target.checked)} />
            Email me when a new task is assigned under my name
          </label>
          <Button icon="plus" variant="accent" onClick={() => setModal({ open: true, initial: null })}>Add Employee</Button>
        </div>
      </div>

      <Card padding="p-0">
        <table className="w-full text-sm">
          <thead className="surface-2 text-[11px] uppercase tracking-wider text-ink-500 ink-muted-on-dark">
            <tr>
              <th className="text-left px-5 py-2">Name</th>
              <th className="text-left px-3 py-2">Role</th>
              <th className="text-left px-3 py-2">Region</th>
              <th className="text-right px-3 py-2">Active Projects</th>
              <th className="text-right px-3 py-2">Open Tasks</th>
              <th className="text-right px-3 py-2">Avg Completion</th>
              <th className="text-right px-3 py-2">Overdue</th>
              <th className="text-right px-5 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {employees.map((u, i) => {
              const overdue = (i % 4 === 0) ? Math.floor(i/2)+2 : 0;
              const open = 3 + (i % 7);
              const avg = (1.8 + (i % 5) * 0.4).toFixed(1);
              return (
                <tr key={u.id} className="border-t border-soft hover-row cursor-pointer" onClick={() => setSelected(u)}>
                  <td className="px-5 py-2">
                    <div className="flex items-center gap-2">
                      <Avatar initials={u.initials} size={24} />
                      <span className="font-medium ink-on-dark">{u.name}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-xs">{u.role}</td>
                  <td className="px-3 py-2 text-xs">{u.region}</td>
                  <td className="px-3 py-2 text-right tnum">{1 + (i % 4)}</td>
                  <td className="px-3 py-2 text-right tnum">{open}</td>
                  <td className="px-3 py-2 text-right tnum">{avg} d</td>
                  <td className="px-3 py-2 text-right">{overdue > 0 ? <Pill tone={overdue > 3 ? 'danger' : 'warn'}>{overdue}</Pill> : <span className="text-ink-500 ink-muted-on-dark">0</span>}</td>
                  <td className="px-5 py-2 text-right" onClick={e => e.stopPropagation()}>
                    <RowActions onEdit={() => setModal({ open: true, initial: u })} onArchive={() => archive(u.id)} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      <SlideOver open={!!selected} onClose={() => setSelected(null)} title={selected?.name} width="max-w-xl">
        {selected && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Avatar initials={selected.initials} size={48} />
              <div>
                <div className="text-base font-semibold ink-on-dark">{selected.name}</div>
                <div className="text-xs text-ink-500 ink-muted-on-dark">{selected.role} · {selected.region}</div>
              </div>
            </div>
            <div>
              <SectionTitle title="Active tasks" />
              <div className="space-y-2">
                {['SEC submission — Jazan','Bond renewal — Al Jouf','Site survey — Hail batch 8','Material reconciliation — Najran'].map((t, i) => (
                  <div key={i} className="flex items-center justify-between border border-soft rounded-md p-2.5">
                    <div className="text-sm ink-on-dark">{t}</div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-ink-500 ink-muted-on-dark">{(i+1)*2}d</span>
                      <Pill tone={i === 0 ? 'gold' : i === 3 ? 'danger' : 'soft'}>{i === 0 ? 'In Progress' : i === 3 ? 'Overdue' : 'Pending'}</Pill>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <SectionTitle title="Productivity trend (4 wk)" />
              <Sparkline data={[5, 7, 6, 9]} width={300} height={50} color="#0B2545" />
            </div>
          </div>
        )}
      </SlideOver>

      <EmployeeModal open={modal.open} onClose={() => setModal({ open: false, initial: null })} onSave={save} initial={modal.initial} />
    </div>
  );
}

function EmployeeModal({ open, onClose, onSave, initial }) {
  const [name, setName] = React.useState('');
  const [role, setRole] = React.useState('Project Manager');
  const [region, setRegion] = React.useState('Riyadh');
  React.useEffect(() => {
    setName(initial?.name || ''); setRole(initial?.role || 'Project Manager'); setRegion(initial?.region || 'Riyadh');
  }, [initial, open]);

  return (
    <Modal open={open} onClose={onClose} title={initial ? 'Edit Employee' : 'Add Employee'}
      footer={<>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="accent" icon="check" onClick={() => {
          const initials = name.split(' ').map(s => s[0]).slice(0,2).join('').toUpperCase();
          onSave({ ...initial, name, role, region, initials });
          onClose();
        }}>Save</Button>
      </>}>
      <div className="space-y-3">
        <div>
          <label className="text-xs text-ink-500 ink-muted-on-dark">Name</label>
          <TextField value={name} onChange={setName} placeholder="Full name" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-ink-500 ink-muted-on-dark">Role</label>
            <Select value={role} onChange={setRole} options={ROLES.filter(r => r !== 'Client Viewer')} className="w-full" />
          </div>
          <div>
            <label className="text-xs text-ink-500 ink-muted-on-dark">Region</label>
            <Select value={region} onChange={setRegion} options={REGIONS} className="w-full" />
          </div>
        </div>
      </div>
    </Modal>
  );
}

Object.assign(window, { PageEmployees });
