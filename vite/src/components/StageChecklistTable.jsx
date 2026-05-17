import React from 'react';
// R23 — shared per-school × per-stage checkmark table.
// Used by:
//   • Project Detail Overview (page-project.jsx) — its own toolbar (search + status toggle).
//   • Schools List Stages view (page-schools-list.jsx) — page-level filters drive the rows,
//     so the table hides its internal toolbar.
//
// Layout:
//   • Sticky first column (220 px): school name (EN + AR), city/region line, current-stage
//     pill underneath.
//   • 18 stage columns (~48 px each), header tinted by category — Mechanical / Electrical /
//     Commissioning / Handover — with the SXX code on top and the short stage label below.
//   • Body cell: green check-circle (16 px text-emerald-600) when the stage has a
//     completedDate (or stage.done flag); slate-200 6 px placeholder dot otherwise.
//   • Container max-height + overflow auto; sticky thead + sticky first column.
//   • Above the table: optional toolbar (search box + segmented Completed/In-progress filter).
//   • Below the table: a tiny "green check = complete · — = not yet" legend.
function StageChecklistTable({
  schools,
  activeStage = null,
  onClearStage,
  hideInternalToolbar = false,
  maxHeight = 480,
  title,
  subtitle,
}) {
  const [q, setQ] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('all');
  const nfmt = new Intl.NumberFormat('en-US');
  const STAGE_KEYS_ = window.STAGE_KEYS || [];
  const SCHOOL_STAGES_ = window.SCHOOL_STAGES || [];
  const SCHOOL_STAGE_SHORT_ = window.SCHOOL_STAGE_SHORT || SCHOOL_STAGES_;
  const STAGE_CATEGORY_ = window.STAGE_CATEGORY || {};
  const STAGE_CATEGORY_COLORS_ = window.STAGE_CATEGORY_COLORS || {};

  const lowered = q.trim().toLowerCase();
  const filtered = React.useMemo(() => {
    let rows = schools || [];
    if (!hideInternalToolbar) {
      if (lowered) {
        rows = rows.filter(s =>
          (s.nameEn || '').toLowerCase().includes(lowered) ||
          (s.nameAr || '').includes(q.trim()) ||
          (s.id || '').toLowerCase().includes(lowered) ||
          (s.city || '').toLowerCase().includes(lowered)
        );
      }
      if (statusFilter === 'completed')   rows = rows.filter(s => s.status === 'Completed');
      else if (statusFilter === 'in_progress') rows = rows.filter(s => s.status === 'In Progress');
    }
    if (activeStage != null) {
      rows = rows.filter(s => {
        const st = s.stages && s.stages[activeStage];
        return st && (st.done || st.completedDate);
      });
    }
    return rows;
  }, [schools, lowered, q, statusFilter, activeStage, hideInternalToolbar]);

  // currentStageIndex per school: highest index with done=true, or -1.
  const currentStageOf = (s) => {
    if (!s.stages) return -1;
    let last = -1;
    for (let i = 0; i < s.stages.length; i++) if (s.stages[i] && s.stages[i].done) last = i;
    return last;
  };

  return (
    <Card padding="p-0">
      {(!hideInternalToolbar || title) && (
        <div className="p-4 border-b border-soft flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[220px]">
            <div className="text-sm font-semibold ink-on-dark">{title || 'Per-school stage progress'}</div>
            <div className="text-[11px] text-ink-500 mt-0.5">
              {subtitle ||
                `Green check = stage complete · — = not yet · ${nfmt.format(filtered.length)} of ${nfmt.format((schools || []).length)} schools`}
            </div>
          </div>
          {activeStage != null && (
            <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-[11px] font-medium"
              style={{ background: '#EFF6FF', color: '#1E40AF', border: '1px solid #BFDBFE' }}>
              S{String(activeStage + 1).padStart(2, '0')} · {SCHOOL_STAGES_[activeStage]}
              {onClearStage && (
                <button type="button" onClick={onClearStage} aria-label="Clear stage filter"
                  className="w-4 h-4 rounded-full bg-blue-200 text-blue-900 inline-flex items-center justify-center text-[10px] font-bold">×</button>
              )}
            </span>
          )}
          {!hideInternalToolbar && (
            <>
              <input value={q} onChange={e => setQ(e.target.value)} type="search"
                placeholder="Search by school name / ID / city"
                aria-label="Search schools"
                data-testid="stage-checklist-search"
                className="px-3 py-1.5 text-xs border border-ink-200 rounded-md w-64 focus:outline-none focus:ring-2 ring-accent" />
              <div className="inline-flex border border-soft rounded-md overflow-hidden text-[11px]">
                {[
                  { id: 'all',         label: 'All' },
                  { id: 'completed',   label: 'Completed only' },
                  { id: 'in_progress', label: 'In progress only' },
                ].map(opt => (
                  <button key={opt.id} type="button" onClick={() => setStatusFilter(opt.id)}
                    className={cls('px-2.5 py-1', statusFilter === opt.id
                      ? 'bg-navy-900 text-white font-medium'
                      : 'text-ink-700 hover:bg-ink-100')}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
      <div data-testid="stage-checklist-table"
        className="overflow-auto scrollbar-thin" style={{ maxHeight }}>
        <table className="text-xs" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
          <thead>
            <tr>
              <th data-testid="stage-checklist-sticky-header"
                className="text-left px-3 py-2 font-semibold whitespace-nowrap border-b border-soft"
                style={{ position: 'sticky', top: 0, left: 0, zIndex: 3, width: 220, minWidth: 220, background: '#F8FAFC' }}>
                School
              </th>
              {STAGE_KEYS_.map((key, i) => {
                const cat = STAGE_CATEGORY_[key];
                const cc = STAGE_CATEGORY_COLORS_[cat] || {};
                return (
                  <th key={key}
                    className="text-center px-1.5 py-2 font-semibold border-b border-soft"
                    style={{
                      position: 'sticky', top: 0, zIndex: 2,
                      background: cc.soft || '#F8FAFC',
                      color: cc.text || '#0F172A',
                      width: 48, minWidth: 48,
                      borderTop: `2px solid ${cc.dot || 'transparent'}`,
                    }}
                    title={SCHOOL_STAGES_[i]}>
                    <div style={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 700, letterSpacing: '.04em' }}>
                      S{String(i + 1).padStart(2, '0')}
                    </div>
                    <div style={{ fontSize: 9, fontWeight: 500, lineHeight: 1.1, marginTop: 1,
                      maxHeight: 22, overflow: 'hidden', display: '-webkit-box',
                      WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      {SCHOOL_STAGE_SHORT_[i]}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {filtered.map(s => {
              const csi = currentStageOf(s);
              const ckey = csi >= 0 ? STAGE_KEYS_[csi] : null;
              const ccat = ckey ? STAGE_CATEGORY_[ckey] : null;
              const ccc  = ccat ? STAGE_CATEGORY_COLORS_[ccat] : null;
              return (
                <tr key={s.id} className="hover-row border-b border-soft">
                  <td className="px-3 py-1.5"
                    style={{ position: 'sticky', left: 0, zIndex: 1, background: '#fff',
                      width: 220, minWidth: 220, maxWidth: 220, borderRight: '1px solid #E2E8F0' }}>
                    <div className="font-medium truncate" title={s.nameEn || s.name}>{s.nameEn || s.name}</div>
                    <div className="text-[10px] text-ink-500 truncate">{s.city || s.region}</div>
                    {csi >= 0 ? (
                      <span className="inline-flex items-center gap-1 mt-0.5 text-[9px] font-medium px-1.5 py-[1px] rounded"
                        style={{ background: ccc?.soft, color: ccc?.text }}>
                        <span className="inline-block rounded-full" style={{ width: 5, height: 5, background: ccc?.dot }} />
                        S{String(csi + 1).padStart(2, '0')} · {SCHOOL_STAGE_SHORT_[csi]}
                      </span>
                    ) : (
                      <span className="text-[9px] text-ink-500 italic">Not started</span>
                    )}
                  </td>
                  {STAGE_KEYS_.map((key, i) => {
                    const st = s.stages && s.stages[i];
                    const done = !!(st && (st.completedDate || st.done));
                    return (
                      <td key={key} className="text-center px-1 py-1.5" style={{ width: 48, minWidth: 48 }}>
                        {done ? (
                          <Icon name="check-circle" size={16} className="text-emerald-600 inline-block" />
                        ) : (
                          <span aria-hidden="true" className="inline-block rounded-full"
                            style={{ width: 6, height: 6, background: '#E2E8F0' }} />
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={(STAGE_KEYS_.length || 18) + 1} className="text-center py-8 text-xs text-ink-500 italic">
                No schools match these filters.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="px-4 py-2 border-t border-soft text-[10px] text-ink-500 flex items-center gap-4">
        <span className="inline-flex items-center gap-1.5">
          <Icon name="check-circle" size={12} className="text-emerald-600" /> stage complete
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block rounded-full" style={{ width: 5, height: 5, background: '#E2E8F0' }} /> not yet
        </span>
      </div>
    </Card>
  );
}

Object.assign(window, { StageChecklistTable });
