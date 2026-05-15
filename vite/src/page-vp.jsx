// VP / Executive view — high-level only
function PageVP() {
  const { projects, tasks, notifs } = useStore();
  const totalValue   = projects.reduce((a, p) => a + p.value, 0);
  const totalSchools = projects.reduce((a, p) => a + p.sites, 0);
  const energizedAll = ALL_SCHOOLS.filter(s => s.stages[11].done).length;
  const handedAll    = ALL_SCHOOLS.filter(s => s.stages[12].done).length;
  const energizedPct = Math.round(energizedAll / ALL_SCHOOLS.length * 100);
  const handedPct    = Math.round(handedAll    / ALL_SCHOOLS.length * 100);

  const finRoll = FIN.reduce((acc, f) => ({
    total:    acc.total    + f.total,
    invoiced: acc.invoiced + f.invoiced,
    received: acc.received + f.received,
  }), { total: 0, invoiced: 0, received: 0 });

  const atRisk  = projects.filter(p => p.status === 'At Risk').length;
  const delayed = projects.filter(p => p.status === 'Delayed').length;

  return (
    <div className="p-6 space-y-4">
      <div>
        <div className="text-xs text-ink-500 uppercase tracking-[0.18em]">Executive overview</div>
        <h1 className="text-2xl font-semibold">Portfolio at a glance</h1>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <KPI label="Total programs value"   value={`SAR ${SAR(totalValue)}`}    sub={`${projects.length} active programs`} tone="navy" />
        <KPI label="Total schools"          value={SARfull(totalSchools)}       sub="Across 7 regions" tone="gold" />
        <KPI label="% Energized"            value={`${energizedPct}%`}          sub={`${energizedAll} of ${ALL_SCHOOLS.length}`} tone="ok" />
        <KPI label="% Handed Over"          value={`${handedPct}%`}             sub={`${handedAll} of ${ALL_SCHOOLS.length}`} tone="info" />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card>
          <SectionTitle icon="banknote" title="Financial health" subtitle="Across portfolio" />
          <div className="grid grid-cols-3 gap-3 text-center">
            <Stack label="Committed" value={`SAR ${SAR(finRoll.total)}`} tone="navy" />
            <Stack label="Invoiced"  value={`SAR ${SAR(finRoll.invoiced)}`} tone="gold" />
            <Stack label="Received"  value={`SAR ${SAR(finRoll.received)}`} tone="ok" />
          </div>
          <div className="mt-3">
            <ProgressBar value={(finRoll.received / finRoll.total) * 100} />
            <div className="text-[11px] text-ink-500 mt-1">Cash collected: {Math.round(finRoll.received / finRoll.total * 100)}% of contracted value</div>
          </div>
        </Card>
        <Card>
          <SectionTitle icon="alert-circle" title="Risk traffic light" />
          <div className="grid grid-cols-3 gap-3">
            <RiskCell tone="ok"     count={projects.length - atRisk - delayed} label="On Track" />
            <RiskCell tone="warn"   count={atRisk}    label="At Risk" />
            <RiskCell tone="danger" count={delayed}   label="Delayed" />
          </div>
        </Card>
        <Card>
          <SectionTitle icon="bell" title="Recent activity" />
          <ul className="space-y-2 text-xs">
            {notifs.slice(0, 5).map(n => (
              <li key={n.id} className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 shrink-0" />
                <div className="flex-1">
                  <div>{n.text}</div>
                  <div className="text-[10px] text-ink-500">{n.when}</div>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card padding="p-0">
        <div className="px-4 py-3 border-b border-soft">
          <h3 className="text-sm font-semibold">Programs status</h3>
        </div>
        <table className="w-full text-sm">
          <thead className="surface-2 border-b border-soft text-xs">
            <tr>
              <th className="text-left px-4 py-2 font-semibold">Program</th>
              <th className="text-left px-4 py-2 font-semibold">Region</th>
              <th className="text-right px-4 py-2 font-semibold">Value (SAR)</th>
              <th className="text-left px-4 py-2 font-semibold">Status</th>
              <th className="text-left px-4 py-2 font-semibold w-1/4">Progress</th>
            </tr>
          </thead>
          <tbody>
            {projects.map(p => (
              <tr key={p.id} className="border-b border-soft hover-row">
                <td className="px-4 py-2.5 font-medium">{p.name}</td>
                <td className="px-4 py-2.5 text-ink-700">{p.region}</td>
                <td className="px-4 py-2.5 text-right num">{SARfull(p.value)}</td>
                <td className="px-4 py-2.5"><StatusPill status={p.status} /></td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <ProgressBar value={p.progress} />
                    <span className="text-xs num font-medium w-10">{p.progress}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

const KPI = ({ label, value, sub, tone }) => {
  const toneCls = { navy: 'bg-navy-900 text-white', gold: 'bg-gold text-white', ok: 'bg-emerald-600 text-white', info: 'bg-sky-700 text-white' };
  return (
    <Card padding="p-4">
      <div className="flex items-start gap-3">
        <div className={cls('w-10 h-10 rounded-lg flex items-center justify-center', toneCls[tone])}>
          <Icon name="bar-chart-3" size={18} />
        </div>
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-wider text-ink-500">{label}</div>
          <div className="text-xl font-bold num">{value}</div>
          <div className="text-[11px] text-ink-500">{sub}</div>
        </div>
      </div>
    </Card>
  );
};

const Stack = ({ label, value, tone }) => (
  <div>
    <div className="text-[10px] uppercase tracking-wider text-ink-500">{label}</div>
    <div className="text-base font-bold num">{value}</div>
  </div>
);

const RiskCell = ({ tone, count, label }) => {
  const bg = tone === 'ok' ? 'bg-emerald-100 text-emerald-800' : tone === 'warn' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800';
  return (
    <div className={cls('rounded-lg p-4 text-center', bg)}>
      <div className="text-3xl font-bold num">{count}</div>
      <div className="text-[11px] uppercase tracking-wider mt-1">{label}</div>
    </div>
  );
};

Object.assign(window, { PageVP });
