import React from 'react';
// Page 1 — Main Dashboard

// R19 Item #1 — KPICard layout per Claude Design mockup:
//   • label (uppercase 10px tracking)
//   • delta chip BELOW the label when trend != 0 — "▲ +N.N%" green / "▼ −N.N%" red.
//     For Schools Energized + Overall Progress the chip carries the "vs last week"
//     suffix to make the cadence explicit; other cards just show the bare delta.
//   • big number (26px) with optional suffix
//   • subtle 1px-stroke sparkline at the bottom (12-point trend line, no fill)
const KPICard = ({ label, value, trend, spark, accent, suffix, deltaSuffix }) => {
  const hasDelta = trend != null && trend !== 0;
  const up = trend > 0;
  const chipBg = up ? '#ECFDF5' : '#FEF2F2';
  const chipBorder = up ? '#A7F3D0' : '#FECACA';
  const chipText = up ? '#047857' : '#B91C1C';
  return (
    <div className="surface border border-soft rounded-xl p-4 shadow-card relative overflow-hidden">
      <div className="absolute left-0 top-0 bottom-0 w-1" style={{ background: accent ? 'var(--accent)' : '#0B2545' }} />
      <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-500 ink-muted-on-dark">{label}</div>
      {hasDelta && (
        <div className="mt-1" style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          fontSize: 11, fontWeight: 600,
          background: chipBg, color: chipText, border: `1px solid ${chipBorder}`,
          padding: '2px 6px', borderRadius: 99, lineHeight: 1.1,
        }}>
          <span aria-hidden="true">{up ? '▲' : '▼'}</span>
          <span style={{ fontVariantNumeric: 'tabular-nums' }}>
            {up ? '+' : '−'}{Math.abs(trend)}
            {deltaSuffix ? ` ${deltaSuffix}` : ''}
          </span>
        </div>
      )}
      <div className="flex items-end justify-between mt-1.5">
        <div className="text-[26px] font-bold leading-none text-navy-900 ink-on-dark tnum">{value}<span className="text-sm font-medium text-ink-500 ml-1">{suffix}</span></div>
      </div>
      {spark && (
        <div className="mt-2">
          <Sparkline data={spark} width={140} height={26} color="#94A3B8" />
        </div>
      )}
    </div>
  );
};

function StageStrip({ counts, onClickStage, activeStage }) {
  // R16 #2: 18-stage strip — colour by category, not by hardcoded index.
  const max = Math.max(...counts, 1);
  return (
    <div className="grid grid-cols-3 sm:grid-cols-6 md:grid-cols-9 lg:grid-cols-9 xl:grid-cols-18 gap-1.5">
      {SCHOOL_STAGES.map((s, i) => {
        const c = counts[i] || 0;
        const h = 28 + (c / max) * 36;
        const key = STAGE_KEYS[i];
        const cat = STAGE_CATEGORY[key] || 'mechanical';
        const color = STAGE_CATEGORY_COLORS[cat];
        const isActive = activeStage === i;
        return (
          <button key={s} onClick={() => onClickStage(i)}
            title={`${s} — ${STAGE_CATEGORY_LABELS[cat]}`}
            className={cls('stage-pill text-left rounded-md p-2 border transition',
              isActive ? 'border-accent bg-accent-soft' : 'border-soft hover:border-navy-800')}>
            <div className="flex items-end h-12 mb-1">
              <div className="w-full rounded-t-sm" style={{
                height: h,
                background: color.dot,
                opacity: c === 0 ? 0.25 : 1
              }} />
            </div>
            <div className="text-[10px] text-ink-500 ink-muted-on-dark leading-tight truncate">{i+1}. {s}</div>
            <div className="text-[15px] font-bold text-navy-900 ink-on-dark tnum">{c}</div>
          </button>
        );
      })}
    </div>
  );
}

// ── Round 19: tint config + data seeds for redesigned stage section ──────────
const CAT_TINTS = {
  mechanical:    { bg: '#f1f5f9', border: '#cbd5e1' },
  electrical:    { bg: '#fffbeb', border: '#fde68a' },
  commissioning: { bg: '#ecfdf5', border: '#a7f3d0' },
  handover:      { bg: '#faf5ff', border: '#ddd6fe' },
};
const VEL_SEED   = [47,52,41,38,29,33,21,18,14,11,8,6,3,1,0,0,0,0];
const DWELL_SEED = [9,7,8,6,11,8,9,7,8,6,7,5,14,21,14,10,7,0];

// R19 Item #3 — DashStageCard is now a thin adapter that forwards to the reusable
// window.StageCard (src/components/StageCard.jsx) so the Dashboard and the Project
// Detail render identical tiles from a single source.
// R19.1 — shared helper so VP / Manager / Material dashboards all derive the same
// stage data, bottlenecks, and per-category groups from one place. The dashboard
// renders this via PageDashboard; PageVPDashboard + PagePMDashboard reach in via
// window.computeDashStageData.
function computeDashStageData(projects) {
  const stageCounts = SCHOOL_STAGES.map((_, i) =>
    projects.filter(p => p.schoolDist).reduce((a, p) => a + (p.schoolDist[i] || 0), 0)
  );
  const totalS = projects.filter(p => p.schoolDist).reduce((a, p) => a + p.sites, 0) || 2601;
  const cumCounts = stageCounts.map((_, i) => stageCounts.slice(i).reduce((a, c) => a + c, 0));
  const drops = cumCounts.map((c, i) => (i === 0 ? totalS : cumCounts[i - 1]) - c);
  const bottleneckIdx = drops.reduce((maxI, d, i) => (i >= 1 && d > drops[maxI]) ? i : maxI, 1);
  const stageData = STAGE_KEYS.map((key, i) => ({
    n: i + 1, key, name: SCHOOL_STAGES[i], cat: STAGE_CATEGORY[key],
    count: cumCounts[i], pct: Math.round(cumCounts[i] / totalS * 100),
    week: VEL_SEED[i] || 0, days: DWELL_SEED[i] || 0,
  }));
  const bottlenecks = stageData
    .map((s, i) => ({ ...s, drop: drops[i] }))
    .filter((_, i) => i >= 1)
    .sort((a, b) => b.drop - a.drop)
    .slice(0, 4);
  const maxDrop = bottlenecks.length ? Math.max(...bottlenecks.map(b => b.drop)) : 1;
  const stagesByCat = {
    mechanical:    stageData.filter(s => s.cat === 'mechanical'),
    electrical:    stageData.filter(s => s.cat === 'electrical'),
    commissioning: stageData.filter(s => s.cat === 'commissioning'),
    handover:      stageData.filter(s => s.cat === 'handover'),
  };
  return { stageCounts, totalS, cumCounts, drops, bottleneckIdx, stageData, bottlenecks, maxDrop, stagesByCat };
}

function DashStageCard({ stageObj, total, isBottleneck, isActive, onClick }) {
  const SC = window.StageCard;
  if (!SC) return null;
  return (
    <SC
      stage={{ key: stageObj.key, name: stageObj.name, category: stageObj.cat, n: stageObj.n }}
      count={stageObj.count}
      total={total}
      weeklyDelta={stageObj.week}
      medianDwellDays={stageObj.days}
      isBottleneck={isBottleneck}
      isActive={isActive}
      onClick={onClick}
    />
  );
}

function DashCategoryPanel({ catKey, stages, total, bottleneckIdx, activeStage, onStageClick }) {
  const tint      = CAT_TINTS[catKey] || { bg: '#F8FAFC', border: '#E2E8F0' };
  const catColors = STAGE_CATEGORY_COLORS[catKey] || {};
  const catLabel  = STAGE_CATEGORY_LABELS[catKey] || catKey;
  const avg       = stages.length ? Math.round(stages.reduce((a, s) => a + s.pct, 0) / stages.length) : 0;
  const firstCount = stages[0]?.count || 0;
  return (
    <div style={{ background: tint.bg, border: `1px solid ${tint.border}`,
      borderRadius: 12, padding: '14px 14px 14px', display: 'flex', gap: 14, alignItems: 'stretch' }}>
      <div style={{ width: 160, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8,
        paddingRight: 8, borderRight: `1px solid ${tint.border}` }}>
        <div style={{ fontSize: 10, color: catColors.text, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase' }}>Category</div>
        <div style={{ fontSize: 18, fontWeight: 600, color: '#0F172A', letterSpacing: '-0.01em', lineHeight: 1.1 }}>{catLabel}</div>
        <div style={{ fontSize: 11, color: '#64748B' }}>{stages.length} stages · {firstCount.toLocaleString()} schools past 1st</div>
        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ fontSize: 10, color: '#64748B', textTransform: 'uppercase', letterSpacing: '.04em', fontWeight: 600 }}>Avg completion</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
            <span style={{ fontSize: 20, fontWeight: 600, color: catColors.text, fontVariantNumeric: 'tabular-nums' }}>{avg}</span>
            <span style={{ fontSize: 11, color: '#64748B' }}>%</span>
          </div>
          <div style={{ height: 4, background: '#fff', border: `1px solid ${tint.border}`, borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ height: '100%', background: catColors.dot, width: avg + '%' }} />
          </div>
        </div>
      </div>
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: `repeat(${stages.length}, minmax(0,1fr))`, gap: 8 }}>
        {stages.map(s => (
          <DashStageCard key={s.n} stageObj={s} total={total}
            isBottleneck={s.n - 1 === bottleneckIdx}
            isActive={activeStage === s.n - 1}
            onClick={() => onStageClick && onStageClick(s.n - 1)} />
        ))}
      </div>
    </div>
  );
}

// R19.1 — 18-bar transitions chart per Claude Design mockup.
// White card · 0.5px slate-200 border · rounded-md (8px) · padding 16px.
// Bars: 24-32px wide each (flex-1 with min-width 18), height proportional to value,
// max 180px tall. Value labels above each bar (11px). SXX labels below each bar.
// Bottom-right caption: "Peak: <stage> · <N>/wk".
function DashTransitionsChart({ stages }) {
  const maxWk = Math.max(...stages.map(s => s.week), 1);
  const total  = stages.reduce((a, s) => a + s.week, 0);
  const peak   = stages.reduce((p, s) => s.week > p.week ? s : p, stages[0]);
  const nfmt   = new Intl.NumberFormat('en-US');
  return (
    <div data-testid="dash-transitions-chart" style={{
      background: '#fff', border: '0.5px solid #E2E8F0', borderRadius: 8, padding: 16,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#0F172A', letterSpacing: '-0.01em' }}>Stage transitions this week</div>
          <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>Schools that crossed into each stage · last 7 days</div>
        </div>
        <div data-testid="dash-transitions-total" style={{
          fontSize: 11, fontWeight: 600, color: '#0B2545', background: '#EEF2F7',
          padding: '3px 10px', borderRadius: 99, whiteSpace: 'nowrap',
        }}>
          {nfmt.format(total)} crossings
        </div>
      </div>

      {/* Bar row — flex with even distribution; bars 24-32px wide, max 180px tall. */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 200, paddingTop: 18 }}>
        {stages.map(s => {
          const catColors = STAGE_CATEGORY_COLORS[s.cat] || {};
          const h = Math.max((s.week / maxWk) * 180, s.week > 0 ? 4 : 2);
          return (
            <div key={s.n} data-testid={`dash-transitions-bar-S${String(s.n).padStart(2, '0')}`}
              style={{ flex: '1 1 0', minWidth: 18, maxWidth: 32,
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'flex-end', height: '100%', position: 'relative' }}>
              {s.week > 0 && (
                <span style={{
                  position: 'absolute', top: -16, left: '50%', transform: 'translateX(-50%)',
                  fontSize: 11, color: '#0F172A', fontWeight: 600,
                  whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums',
                }}>{s.week}</span>
              )}
              <div style={{
                width: '100%', borderRadius: '3px 3px 0 0', height: h,
                background: catColors.dot || '#CBD5E1',
                opacity: s.week > 0 ? 1 : 0.18,
              }} />
            </div>
          );
        })}
      </div>

      {/* SXX labels under each bar */}
      <div style={{ display: 'flex', gap: 6, marginTop: 6, paddingTop: 8, borderTop: '1px solid #EEF0F4' }}>
        {stages.map(s => (
          <div key={s.n} style={{
            flex: '1 1 0', minWidth: 18, maxWidth: 32, textAlign: 'center',
            fontSize: 10, color: '#64748B', fontFamily: 'monospace', letterSpacing: '.04em',
          }}>
            S{String(s.n).padStart(2, '0')}
          </div>
        ))}
      </div>

      {/* Category legend + peak caption */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 14, fontSize: 11, color: '#64748B', alignItems: 'center', flexWrap: 'wrap' }}>
          {Object.keys(STAGE_CATEGORY_LABELS).map(cat => (
            <span key={cat} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, display: 'inline-block', background: STAGE_CATEGORY_COLORS[cat].dot }} />
              {STAGE_CATEGORY_LABELS[cat]}
            </span>
          ))}
        </div>
        {peak && peak.week > 0 && (
          <div data-testid="dash-transitions-peak" style={{ fontSize: 11, color: '#475569' }}>
            Peak: <span style={{ color: '#0F172A', fontWeight: 600 }}>{peak.name}</span>
            <span style={{ marginLeft: 6, fontVariantNumeric: 'tabular-nums' }}>· {peak.week}/wk</span>
          </div>
        )}
      </div>
    </div>
  );
}

// R19.1 — Top bottlenecks panel per Claude Design mockup.
// 4 rows: SXX chip (slate background, 11px) · category dot · stage label (truncated)
// · red negative number on the right. Thin 2px red bar underneath, width proportional
// to drop magnitude.
function DashBottlenecksSidebar({ bottlenecks, maxDrop }) {
  const nfmt = new Intl.NumberFormat('en-US');
  return (
    <div data-testid="dash-bottlenecks-sidebar" style={{
      background: '#fff', border: '0.5px solid #E2E8F0', borderRadius: 8, padding: 16,
    }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: '#0F172A', letterSpacing: '-0.01em' }}>Top bottlenecks</div>
      <div style={{ fontSize: 11, color: '#64748B', marginTop: 2, marginBottom: 14 }}>Stages with the largest school drop-off from the prior stage</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {bottlenecks.map(b => {
          const catColors = STAGE_CATEGORY_COLORS[b.cat] || {};
          return (
            <div key={b.n} data-testid={`dash-bottleneck-row-S${String(b.n).padStart(2, '0')}`}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  flex: '0 0 auto', fontFamily: 'monospace', fontSize: 11, fontWeight: 600,
                  background: '#F1F5F9', color: '#475569',
                  padding: '2px 6px', borderRadius: 4,
                }}>
                  S{String(b.n).padStart(2, '0')}
                </span>
                <span style={{ width: 6, height: 6, borderRadius: 99, background: catColors.dot, flexShrink: 0 }} />
                <span style={{
                  flex: '1 1 auto', minWidth: 0, fontSize: 12, color: '#0F172A', fontWeight: 500,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {b.name}
                </span>
                <span style={{
                  fontSize: 12, color: '#BE123C', fontFamily: 'monospace', fontWeight: 600,
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  −{nfmt.format(b.drop)}
                </span>
              </div>
              {/* 2px red bar — width proportional to drop magnitude */}
              <div style={{ height: 2, borderRadius: 99, background: '#FECACA', overflow: 'hidden', marginTop: 6 }}>
                <div style={{ height: '100%', background: '#BE123C', width: (b.drop / maxDrop * 100) + '%' }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// R27 — Portfolio "School Execution Stages" widget. Used by PageVPDashboard
// and PagePMDashboard (gated by canViewSchoolExecutionStages). Replaces the
// older simpler StageExecutionKPIs row on those pages. Pulls stage data via the
// existing computeDashStageData helper and renders 4 DashCategoryPanels.
function SchoolExecutionStagesWidget({ projects, onStageClick }) {
  const { stageData, totalS, bottleneckIdx, stagesByCat } = computeDashStageData(projects);
  const [stageFilter, setStageFilter] = React.useState(null);
  const handleClick = (i) => {
    const next = stageFilter === i ? null : i;
    setStageFilter(next);
    if (onStageClick) onStageClick(next);
  };
  return (
    <div>
      <SectionTitle
        icon="bar-chart-3"
        title="School Execution Stages"
        subtitle="Click any stage card to drill into schools at that stage."
        action={stageFilter != null && <Button variant="ghost" size="sm" icon="x" onClick={() => handleClick(stageFilter)}>Clear filter</Button>}
      />
      <div className="space-y-3 mt-3">
        <DashCategoryPanel catKey="mechanical"    stages={stagesByCat.mechanical}    total={totalS} bottleneckIdx={bottleneckIdx} activeStage={stageFilter} onStageClick={handleClick} />
        <DashCategoryPanel catKey="electrical"    stages={stagesByCat.electrical}    total={totalS} bottleneckIdx={bottleneckIdx} activeStage={stageFilter} onStageClick={handleClick} />
        <DashCategoryPanel catKey="commissioning" stages={stagesByCat.commissioning} total={totalS} bottleneckIdx={bottleneckIdx} activeStage={stageFilter} onStageClick={handleClick} />
        <DashCategoryPanel catKey="handover"      stages={stagesByCat.handover}      total={totalS} bottleneckIdx={bottleneckIdx} activeStage={stageFilter} onStageClick={handleClick} />
      </div>
    </div>
  );
}

function ProjectCard({ p, onOpen }) {
  const pm = PEOPLE.find(u => u.id === p.pmId);
  return (
    <button type="button" onClick={() => onOpen(p.id)}
      className="text-left surface border border-soft rounded-xl shadow-card hover:shadow-pop transition w-full">
      {/* P1: Round 13 badge alignment fix — flex items-start justify-between gap-3 p-4,
          title wrapper flex-1 min-w-0 with truncate, badge shrink-0 whitespace-nowrap */}
      <div className="flex items-start justify-between gap-3 p-4 pb-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-[14px] font-semibold leading-tight ink-on-dark truncate">{p.name}</h3>
          <div className="text-[11px] text-ink-500 ink-muted-on-dark mt-0.5 flex items-center gap-1.5 truncate">
            <Icon name="map-pin" size={11} /> {p.region} · {p.city}
          </div>
        </div>
        <span className="shrink-0 whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium bg-slate-900 text-white">
          {p.type}
        </span>
      </div>
      <div className="px-4 pb-4">

      <div className="grid grid-cols-2 gap-2 text-xs my-3">
        <div>
          <div className="text-ink-500 ink-muted-on-dark text-[10px] uppercase tracking-wider">Contract</div>
          <div className="font-semibold tnum">SAR {SAR(p.value)}</div>
        </div>
        {p.sites > 1 && (
          <div>
            <div className="text-ink-500 ink-muted-on-dark text-[10px] uppercase tracking-wider">Schools</div>
            <div className="font-semibold tnum">{p.sites}</div>
          </div>
        )}
        <div>
          <div className="text-ink-500 ink-muted-on-dark text-[10px] uppercase tracking-wider">Start</div>
          <div className="tnum">{p.start}</div>
        </div>
        <div>
          <div className="text-ink-500 ink-muted-on-dark text-[10px] uppercase tracking-wider">Target</div>
          <div className="tnum">{p.target}</div>
        </div>
      </div>

      <div className="mb-2.5">
        <div className="flex items-center justify-between text-[11px] mb-1">
          <span className="text-ink-500 ink-muted-on-dark">Overall progress</span>
          <span className="font-semibold tnum">{p.progress}%</span>
        </div>
        <ProgressBar value={p.progress} color="#0B2545" />
      </div>

      <div className="flex items-center justify-between">
        <StatusPill status={p.status} />
        <div className="flex items-center gap-1.5">
          <Avatar initials={pm.initials} size={20} />
          <span className="text-[11px] text-ink-700 ink-on-dark">{pm.name.split(' ')[0]}</span>
        </div>
      </div>
      </div>
    </button>
  );
}

function NewProjectModal({ open, onClose, onCreate, currentUser }) {
  const [form, setForm] = React.useState({
    tag: '', name: '', region: '', city: '', value: '', start: '', target: '', contractorId: '', pmId: '',
  });
  React.useEffect(() => {
    if (open) setForm({ tag: '', name: '', region: '', city: '', value: '', start: new Date().toISOString().slice(0,10), target: '', contractorId: '', pmId: '' });
  }, [open]);
  if (!open) return null;
  const submit = () => {
    if (!form.name.trim() || !form.region.trim()) return;
    onCreate({ ...form, value: +form.value || 0 });
    onClose();
  };
  return (
    <Modal open={open} onClose={onClose} title="New Project" wide
      footer={<>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="accent" icon="check" onClick={submit}>Create project</Button>
      </>}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-medium text-ink-700 mb-1 block">Project name *</label>
            <TextField value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} placeholder="e.g. Tabuk Schools Solar Program" />
          </div>
          <div>
            <label className="text-[11px] font-medium text-ink-700 mb-1 block">Tag</label>
            <TextField value={form.tag} onChange={v => setForm(f => ({ ...f, tag: v }))} placeholder="e.g. Tabuk-1" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-[11px] font-medium text-ink-700 mb-1 block">Region *</label>
            <TextField value={form.region} onChange={v => setForm(f => ({ ...f, region: v }))} placeholder="e.g. Tabuk" />
          </div>
          <div>
            <label className="text-[11px] font-medium text-ink-700 mb-1 block">City</label>
            <TextField value={form.city} onChange={v => setForm(f => ({ ...f, city: v }))} />
          </div>
          <div>
            <label className="text-[11px] font-medium text-ink-700 mb-1 block">Contract value (SAR)</label>
            <TextField value={form.value} onChange={v => setForm(f => ({ ...f, value: v }))} type="number" placeholder="350000000" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-medium text-ink-700 mb-1 block">Start date</label>
            <TextField value={form.start} onChange={v => setForm(f => ({ ...f, start: v }))} type="date" />
          </div>
          <div>
            <label className="text-[11px] font-medium text-ink-700 mb-1 block">Target date</label>
            <TextField value={form.target} onChange={v => setForm(f => ({ ...f, target: v }))} type="date" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-medium text-ink-700 mb-1 block">Project Manager</label>
            <Select value={form.pmId} onChange={v => setForm(f => ({ ...f, pmId: v }))}
              options={[{value:'',label:'— Assign later —'}, ...PEOPLE.filter(p => p.role === 'Project Manager').map(p => ({ value: p.id, label: p.name }))]} className="w-full" />
          </div>
          <div>
            <label className="text-[11px] font-medium text-ink-700 mb-1 block">Primary contractor</label>
            <Select value={form.contractorId} onChange={v => setForm(f => ({ ...f, contractorId: v }))}
              options={[{value:'',label:'— Unassigned —'}, ...CONTRACTORS.map(c => ({ value: c.id, label: c.name }))]} className="w-full" />
          </div>
        </div>
        <div className="text-[11px] text-ink-500 bg-ink-50 rounded p-2">
          Only Anas Alshahrani, Fasiulla Baig, and Naif Alsalmah can create new projects (Round 6 gate).
        </div>
      </div>
    </Modal>
  );
}

function PageDashboard({ projects, onOpenProject, currentUser, onNewEscalation }) {
  const { addProject, logAudit, schools: allSchools } = useStore() || {};
  const [stageFilter, setStageFilter] = React.useState(null);
  const [newProjectOpen, setNewProjectOpen] = React.useState(false);

  const totalValue = projects.reduce((a, p) => a + p.value, 0);
  const openCount = projects.filter(p => p.progress < 100).length;
  const closedCount = projects.length - openCount;
  const totalSchools = projects.filter(p => p.schoolDist).reduce((a,p)=>a+p.sites,0);
  // M2: use the shared countEnergized selector, scoped to the projects shown here.
  const projIds = new Set(projects.map(p => p.id));
  const scopedSchools = (allSchools || ALL_SCHOOLS).filter(s => projIds.has(s.projectId));
  const energizedSchools = countEnergized(scopedSchools);
  const overall = projects.length ? Math.round(projects.reduce((a,p)=>a+p.progress,0) / projects.length) : 0;

  const stageCounts = SCHOOL_STAGES.map((_, i) =>
    projects.filter(p => p.schoolDist).reduce((a, p) => a + (p.schoolDist[i] || 0), 0)
  );

  // R19: cumulative counts + bottleneck data for redesigned stage section
  const totalS = projects.filter(p => p.schoolDist).reduce((a,p)=>a+p.sites,0) || 2601;
  const cumCounts = stageCounts.map((_, i) => stageCounts.slice(i).reduce((a,c)=>a+c,0));
  const drops = cumCounts.map((c, i) => (i === 0 ? totalS : cumCounts[i-1]) - c);
  const bottleneckIdx = drops.reduce((maxI, d, i) => (i >= 1 && d > drops[maxI]) ? i : maxI, 1);
  const stageData = STAGE_KEYS.map((key, i) => ({
    n: i+1, key, name: SCHOOL_STAGES[i], cat: STAGE_CATEGORY[key],
    count: cumCounts[i], pct: Math.round(cumCounts[i] / totalS * 100),
    week: VEL_SEED[i] || 0, days: DWELL_SEED[i] || 0,
  }));
  const bottlenecks = stageData
    .map((s, i) => ({ ...s, drop: drops[i] }))
    .filter((_, i) => i >= 1)
    .sort((a, b) => b.drop - a.drop)
    .slice(0, 4);
  const maxDrop = bottlenecks.length ? Math.max(...bottlenecks.map(b => b.drop)) : 1;
  const stagesByCat = {
    mechanical:    stageData.filter(s => s.cat === 'mechanical'),
    electrical:    stageData.filter(s => s.cat === 'electrical'),
    commissioning: stageData.filter(s => s.cat === 'commissioning'),
    handover:      stageData.filter(s => s.cat === 'handover'),
  };

  const filteredProjects = stageFilter == null
    ? projects
    : projects.filter(p => p.schoolDist && p.schoolDist[stageFilter] > 0);

  const kpis = [
    { label: 'Total Programs Value', value: SAR(totalValue), suffix: 'SAR', trend: 4.2, spark: [200,260,290,310,320,360,380,400,420,440,460,totalValue/1e7] },
    { label: 'Total Projects',       value: projects.length, trend: 0, spark: [4,5,6,7,7,7,7,8,8,8,8,projects.length] },
    { label: 'Open Projects',        value: openCount, trend: -8.0, spark: [9,9,9,8,8,8,7,7,7,7,8,openCount] },
    { label: 'Closed / Handed Over', value: closedCount, trend: 12.5, spark: [0,0,0,1,1,1,2,2,2,2,2,closedCount] },
    { label: 'Total Schools',        value: totalSchools.toLocaleString(), trend: 0, spark: [400,600,800,1000,1000,1000,1000,1000,1000,1000,1000,totalSchools] },
    { label: 'Schools Energized',    value: energizedSchools.toLocaleString(), trend: 1, deltaSuffix: 'this week', spark: [20,40,80,140,200,280,360,420,500,560,620,energizedSchools] },
    { label: 'Overall Progress',     value: overall, suffix: '%', trend: 2.4, deltaSuffix: 'vs last week', spark: [12,18,24,28,32,36,40,44,48,52,56,overall] },
  ];

  // M1: page header w/ H1 for non-exec roles. Exec roles already have the KPI strip below as their header.
  const role = currentUser?.role;
  const headerTitle = role === 'Project Manager' ? 'My projects'
                    : role === 'Material planning' ? 'Material planning dashboard'
                    : role === 'Coordinator' ? 'Coordinator dashboard'
                    : null;
  // M5: Material planning + Coordinator + PM need an Escalate button on their dashboard header.
  const escTarget = (currentUser && typeof getEscalationTarget === 'function')
    ? getEscalationTarget(currentUser, null) : null;

  return (
    <div className="p-6 space-y-6">
      {headerTitle && (
        <div className="flex items-end justify-between gap-3">
          <div>
            <div className="text-xs text-ink-500 uppercase tracking-[0.18em]">{role}</div>
            <h1 className="text-2xl font-semibold">{headerTitle}</h1>
          </div>
          {escTarget && onNewEscalation && (
            <Button variant="accent" icon="alert-circle" onClick={onNewEscalation}>{escTarget.label}</Button>
          )}
        </div>
      )}

      {/* KPI strip — visible only to VP + 2 Managers (Anas, Fasiulla) */}
      {canViewFinancials(currentUser) && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
          {kpis.map((k, i) => <KPICard key={i} {...k} accent={i === 0 || i === 6} />)}
        </div>
      )}

      {/* R19.1: Transitions chart + Bottlenecks sidebar (VP/Managers only).
          Layout: flex-3 left (chart) + flex-1 right (bottlenecks). Stacks on mobile. */}
      {canViewFinancials(currentUser) && (
        <div data-testid="dash-transitions-row" className="flex flex-col lg:flex-row gap-4">
          <div className="lg:flex-[3] min-w-0"><DashTransitionsChart stages={stageData} /></div>
          <div className="lg:flex-1 min-w-0"><DashBottlenecksSidebar bottlenecks={bottlenecks} maxDrop={maxDrop} /></div>
        </div>
      )}

      {/* R27 — the "School Execution Stages" 4-panel widget moved off PageDashboard
          (which is the Projects index for PM-group fallthrough roles) and onto the
          portfolio-level dashboards (PageVPDashboard / PagePMDashboard) instead.
          See SchoolExecutionStagesWidget below + the role gate canViewSchoolExecutionStages.
          The Projects index now renders only the heading + project grid. */}

      {/* Project grid */}
      <div>
        <SectionTitle
          icon="folder-kanban"
          title={stageFilter != null ? `Projects with schools at "${SCHOOL_STAGES[stageFilter]}"` : 'All Projects'}
          subtitle={`${filteredProjects.length} of ${projects.length} projects`}
          action={canCreateProject(currentUser) ? <Button icon="plus" variant="accent" onClick={() => setNewProjectOpen(true)}>New Project</Button> : null}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
          {filteredProjects.map(p => <ProjectCard key={p.id} p={p} onOpen={onOpenProject} />)}
        </div>
      </div>

      <NewProjectModal open={newProjectOpen} onClose={() => setNewProjectOpen(false)}
        currentUser={currentUser}
        onCreate={data => {
          const p = addProject && addProject(data);
          if (p && logAudit) logAudit({
            actorId: currentUser.id, actorName: currentUser.name, actorRole: currentUser.role,
            action: 'CREATE', entityType: 'project', entityId: p.id, entityLabel: p.name,
            summary: `Created project "${p.name}" in ${p.region}` + (p.value ? ` (SAR ${SAR(p.value)})` : ''),
          });
        }} />
    </div>
  );
}

// R19.1: expose chart + bottlenecks + data helper so PageVPDashboard /
// PagePMDashboard render the same widgets without duplicating logic.
Object.assign(window, {
  PageDashboard, NewProjectModal,
  DashTransitionsChart, DashBottlenecksSidebar, DashCategoryPanel, DashStageCard,
  computeDashStageData, SchoolExecutionStagesWidget,
});
