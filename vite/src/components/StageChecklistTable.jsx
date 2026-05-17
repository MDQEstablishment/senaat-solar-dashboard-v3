import React from 'react';
// R23 (extracted) → R24 (visual revert to classic R17-era table).
// One source of truth for the per-school × per-stage checkmark table used by:
//   • Project Detail Overview (page-project.jsx)
//   • Schools List → Stages view (page-schools-list.jsx)
//
// R24 visual contract (client preference):
//   • Plain HTML <table> — no sticky positioning, no category-tinted header band,
//     no current-stage pill, no internal toolbar. Page-level filters drive `schools`.
//   • thead: one row · slate-50 bg · slate-200 borders · School column (left, 240 px)
//     + 18 stage columns (S## code on top, short label below).
//   • tbody: school name (EN + AR) + 18 cells. Each cell shows the R17-era pair:
//     green check icon + dd MMM completion date when the stage is done; an em-dash
//     otherwise. Rows alternate slate-50 / white, hover slate-100.
//   • Container respects the caller's maxHeight (480 / 640). Body scrolls inside.
//   • The activeStage filter still works — when set, only rows whose stage[i] is
//     done remain. Removable chip lives outside this component (caller decides).
//
// Props preserved for compatibility with the R22/R23 call sites:
//   schools, activeStage, onClearStage, hideInternalToolbar, maxHeight,
//   title, subtitle. `hideInternalToolbar` is now effectively always true and the
//   prop is accepted but unused; the simpler design has no toolbar at all.
function StageChecklistTable({
  schools,
  activeStage = null,
  onClearStage,
  // R24 — accepted for back-compat with the R23 call sites but no longer drives
  // any branching: the component never renders an internal toolbar now.
  // eslint-disable-next-line no-unused-vars
  hideInternalToolbar,
  maxHeight = 480,
  title,
  subtitle,
}) {
  const STAGE_KEYS_         = window.STAGE_KEYS || [];
  const SCHOOL_STAGES_      = window.SCHOOL_STAGES || [];
  const SCHOOL_STAGE_SHORT_ = window.SCHOOL_STAGE_SHORT || SCHOOL_STAGES_;
  const nfmt = new Intl.NumberFormat('en-US');

  const filtered = React.useMemo(() => {
    let rows = schools || [];
    if (activeStage != null) {
      rows = rows.filter(s => {
        const st = s.stages && s.stages[activeStage];
        return st && (st.done || st.completedDate);
      });
    }
    return rows;
  }, [schools, activeStage]);

  const showHeader = !!(title || subtitle || activeStage != null);

  return (
    <Card padding="p-0">
      {showHeader && (
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
        </div>
      )}
      <div data-testid="stage-checklist-table"
        className="overflow-auto scrollbar-thin" style={{ maxHeight }}>
        <table className="min-w-full text-sm border-collapse">
          <thead>
            <tr className="bg-slate-50">
              <th className="text-left px-3 py-2 font-semibold border border-slate-200 text-[12px]"
                style={{ width: 240, minWidth: 240 }}>
                School
              </th>
              <th className="text-left px-3 py-2 font-semibold border border-slate-200 text-[12px]"
                style={{ width: 110, minWidth: 110 }}>
                City
              </th>
              {STAGE_KEYS_.map((key, i) => (
                <th key={key}
                  className="text-center px-1.5 py-2 font-semibold border border-slate-200 align-top"
                  title={SCHOOL_STAGES_[i]}
                  style={{ width: 64, minWidth: 64 }}>
                  <div style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: '#64748B' }}>
                    {i + 1}
                  </div>
                  <div style={{
                    fontSize: 10, fontWeight: 500, color: '#475569', lineHeight: 1.15, marginTop: 2,
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                    overflow: 'hidden', maxHeight: 24,
                  }}>
                    {SCHOOL_STAGE_SHORT_[i]}
                  </div>
                </th>
              ))}
              <th className="text-left px-3 py-2 font-semibold border border-slate-200 text-[12px]"
                style={{ width: 110, minWidth: 110 }}>
                Remark
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s, rowIdx) => (
              <tr key={s.id}
                className={cls(
                  'transition-colors hover:bg-slate-100',
                  rowIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50'
                )}>
                <td className="px-3 py-1.5 border border-slate-200"
                  style={{ width: 240, minWidth: 240, maxWidth: 240 }}>
                  <div className="font-medium truncate" title={s.nameEn || s.name}>{s.nameEn || s.name}</div>
                  <div className="text-[10px] text-ink-500 font-mono truncate">{s.id}</div>
                </td>
                <td className="px-3 py-1.5 border border-slate-200 text-ink-700 text-xs"
                  style={{ width: 110, minWidth: 110, maxWidth: 110 }}>
                  <span className="truncate block" title={s.city || s.region}>{s.city || s.region || '—'}</span>
                </td>
                {STAGE_KEYS_.map((key, i) => {
                  const st = s.stages && s.stages[i];
                  const done = !!(st && (st.completedDate || st.done));
                  const date = st && (st.completedDate || st.date);
                  return (
                    <td key={key}
                      className="text-center px-1 py-1.5 border border-slate-200 align-middle"
                      style={{ width: 64, minWidth: 64 }}>
                      {done ? (
                        <div className="flex flex-col items-center leading-tight">
                          <Icon name="check" size={14} className="text-emerald-600" strokeWidth={3} />
                          {date && (
                            <span className="text-[9px] text-ink-500 mt-0.5">
                              {new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-300" aria-hidden="true">—</span>
                      )}
                    </td>
                  );
                })}
                <td className="px-3 py-1.5 border border-slate-200"
                  style={{ width: 110, minWidth: 110, maxWidth: 110 }}>
                  <Pill tone={s.remark === 'Active' ? 'ok' : s.remark === 'Excluded' || s.remark === 'Blocked' ? 'danger' : 'warn'}>
                    {s.remark || 'Active'}
                  </Pill>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={(STAGE_KEYS_.length || 18) + 3}
                  className="text-center py-8 text-xs text-ink-500 italic border border-slate-200 bg-white">
                  No schools match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="px-4 py-2 border-t border-soft text-[10px] text-ink-500 flex items-center gap-4">
        <span className="inline-flex items-center gap-1.5">
          <Icon name="check" size={12} className="text-emerald-600" strokeWidth={3} /> stage complete
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="text-slate-300">—</span> not yet
        </span>
        <span className="ml-auto tnum">{nfmt.format(filtered.length)} of {nfmt.format((schools || []).length)} schools</span>
      </div>
    </Card>
  );
}

Object.assign(window, { StageChecklistTable });
