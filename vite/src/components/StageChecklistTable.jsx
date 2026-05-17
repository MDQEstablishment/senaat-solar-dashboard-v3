import React from 'react';
// R24 → R25 — shared per-school × per-stage table.
// R25 restyles to match the Compact view's exact look (same shell, slate-50 header,
// hover-row, alternating zebra) so the toggle between Compact / Stages feels like a
// column swap rather than a layout change. Used by:
//   • Schools List → Stages view (page-schools-list.jsx)
//   • R25 removed the Project Detail Overview call site; the adapter in
//     page-project.jsx stays in place but is no longer rendered.
//
// Visual contract:
//   • <Card padding="p-0"> wrapper, <table className="w-full text-xs"> inside.
//   • Columns: School ID · School name (+ AR sub-label) · City · 18 stage cols ·
//     Remark pill. No status column (R24 KPI strip already conveys that).
//   • Stage header (2 lines): S01..S18 in font-mono 10 px slate-400 + short stage
//     label below (e.g. "Foundation" / "PV Mount") in 11 px slate-600, max 2 lines.
//   • Stage cell: small green check-circle (16 px text-emerald-600) on top + dd MMM
//     date (10 px slate-400) underneath when the stage is done; em-dash (slate-300)
//     otherwise. No category tinting.
//   • Rows alternate bg-white / bg-slate-50, hover bg-slate-100. No sticky.
//   • Header backgrounds: slate-50. Borders: border-soft on rows, slate-200 on
//     stage column borders to subtly separate the dense block of 18 columns.
//
// Props preserved for back-compat: schools, activeStage, onClearStage,
// hideInternalToolbar (no-op), maxHeight (defaults to 'calc(100vh - 360px)' to
// match Compact view scroll behaviour), title, subtitle. R25 omits the title/
// subtitle / legend chrome by default; pass `title`/`subtitle` to bring it back.
function StageChecklistTable({
  schools,
  activeStage = null,
  onClearStage,
  // eslint-disable-next-line no-unused-vars
  hideInternalToolbar,
  maxHeight = 'calc(100vh - 360px)',
  title,
  subtitle,
  onOpen,
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

  const stageColCount = STAGE_KEYS_.length || 18;
  const totalCols = stageColCount + 4;  // School ID + School name + City + Remark
  const showHeaderBar = !!(title || subtitle || activeStage != null);

  return (
    <Card padding="p-0">
      {showHeaderBar && (
        <div className="px-3 py-2 border-b border-soft flex items-center gap-3 text-[11px] text-ink-500">
          {title && <span className="font-semibold ink-on-dark text-xs">{title}</span>}
          {subtitle && <span>{subtitle}</span>}
          {activeStage != null && (
            <span className="ml-auto inline-flex items-center gap-2 px-2.5 py-1 rounded-full font-medium"
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
        <table className="w-full text-xs">
          <thead className="surface-2 border-b border-soft">
            <tr>
              <th className="text-left px-3 py-2 font-semibold whitespace-nowrap" style={{ width: 120, minWidth: 120 }}>
                School ID
              </th>
              <th className="text-left px-3 py-2 font-semibold whitespace-nowrap" style={{ minWidth: 280 }}>
                School name
              </th>
              <th className="text-left px-3 py-2 font-semibold whitespace-nowrap" style={{ width: 100, minWidth: 100 }}>
                City
              </th>
              {STAGE_KEYS_.map((key, i) => (
                <th key={key}
                  className="text-center px-1.5 py-2 font-semibold align-top border-l border-slate-200"
                  title={SCHOOL_STAGES_[i]}
                  style={{ width: 62, minWidth: 62 }}>
                  <div style={{
                    fontFamily: 'monospace', fontSize: 10, fontWeight: 600,
                    color: '#94A3B8', letterSpacing: '.04em',
                  }}>
                    S{String(i + 1).padStart(2, '0')}
                  </div>
                  <div style={{
                    fontSize: 11, fontWeight: 500, color: '#475569', lineHeight: 1.15, marginTop: 2,
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                    overflow: 'hidden', maxHeight: 28,
                  }}>
                    {SCHOOL_STAGE_SHORT_[i]}
                  </div>
                </th>
              ))}
              <th className="text-left px-3 py-2 font-semibold whitespace-nowrap border-l border-slate-200"
                style={{ width: 100, minWidth: 100 }}>
                Remark
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s, rowIdx) => (
              <tr key={s.id}
                onClick={() => onOpen && onOpen(s.id)}
                className={cls(
                  'border-b border-soft transition-colors',
                  onOpen ? 'cursor-pointer' : '',
                  rowIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50',
                  'hover:bg-slate-100'
                )}>
                <td className="px-3 py-2 font-mono text-[11px] text-ink-500 whitespace-nowrap">
                  {s.id}
                </td>
                <td className="px-3 py-2">
                  <div className="font-medium truncate" title={s.nameEn || s.name}>{s.nameEn || s.name}</div>
                  {s.nameAr && (
                    <div className="text-[10px] text-ink-500 text-right" dir="rtl" title={s.nameAr}>{s.nameAr}</div>
                  )}
                </td>
                <td className="px-3 py-2 text-ink-700 truncate" style={{ maxWidth: 100 }} title={s.city || s.region}>
                  {s.city || s.region || '—'}
                </td>
                {STAGE_KEYS_.map((key, i) => {
                  const st = s.stages && s.stages[i];
                  const done = !!(st && (st.completedDate || st.done));
                  const date = st && (st.completedDate || st.date);
                  return (
                    <td key={key}
                      className="text-center px-1 py-2 border-l border-slate-200 align-middle"
                      style={{ width: 62, minWidth: 62 }}>
                      {done ? (
                        <div className="flex flex-col items-center leading-tight">
                          <Icon name="check-circle" size={16} className="text-emerald-600" />
                          {date && (
                            <span className="text-[10px] text-slate-400 mt-0.5">
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
                <td className="px-3 py-2 border-l border-slate-200">
                  <Pill tone={s.remark === 'Active' ? 'ok' : s.remark === 'Excluded' || s.remark === 'Blocked' ? 'danger' : 'warn'}>
                    {s.remark || 'Active'}
                  </Pill>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={totalCols} className="text-center py-8 text-xs text-ink-500 italic">
                  No schools match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="px-3 py-2 border-t border-soft text-[11px] text-ink-500">
        Showing {nfmt.format(filtered.length)} of {nfmt.format((schools || []).length)} schools — scroll to browse.
      </div>
    </Card>
  );
}

Object.assign(window, { StageChecklistTable });
