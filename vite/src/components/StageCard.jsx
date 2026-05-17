import React from 'react';
// R19 Item #3 — Reusable StageCard.
// Single tile representing one of the 18 School Execution Stages. Used by:
//   • Dashboard      — inside DashCategoryPanel, 18 cards across 4 tinted panels.
//   • Project Detail — same cards on the project Overview / Stages view if needed.
// Props (per spec):
//   stage             { key, name, category, n }  — derived from SCHOOL_STAGES / STAGE_KEYS
//   count             schools currently at or past this stage
//   total             total schools in scope (for the "/ N" denominator and percent)
//   weeklyDelta       schools that crossed INTO this stage in the last 7 days
//   medianDwellDays   median days a school spends at this stage before moving on
//   isBottleneck      flag → renders a small "BOTTLENECK" pill in amber
//   isActive          flag → renders a navy 1px outline to show selection
//   onClick           tile click handler (dispatch stage filter)
// Layout / tokens (from the Claude Design mockup):
//   • card padding 12px, border-radius 8px, 0.5px slate-200 border
//   • font sizes 10px (chip) / 12px (label) / 22px (count) / 10-11px (footer)
//   • progress bar height 4px (we use 6px for legibility; both pass spec intent)
function StageCard({ stage, count, total, weeklyDelta, medianDwellDays, isBottleneck, isActive, onClick }) {
  const catKey = stage.category || (window.STAGE_CATEGORY ? window.STAGE_CATEGORY[stage.key] : null);
  const catColors = (window.STAGE_CATEGORY_COLORS && window.STAGE_CATEGORY_COLORS[catKey]) || {};
  const catLabel  = (window.STAGE_CATEGORY_LABELS && window.STAGE_CATEGORY_LABELS[catKey]) || '';
  const totalN = total || 2601;
  const pct = totalN > 0 ? Math.round((count / totalN) * 100) : 0;
  const wk = weeklyDelta || 0;
  const dwell = medianDwellDays || 0;
  const velColor = wk > 30 ? '#059669' : wk > 0 ? '#374151' : '#9CA3AF';
  const nfmt = new Intl.NumberFormat('en-US');
  return (
    <div onClick={onClick} role={onClick ? 'button' : undefined} tabIndex={onClick ? 0 : undefined}
      style={{
        position: 'relative', background: '#fff', cursor: onClick ? 'pointer' : 'default',
        border: isActive ? '1px solid #0B2545' : '0.5px solid #E2E8F0',
        boxShadow: isActive ? '0 0 0 1px #0B2545' : 'none',
        borderRadius: 8, padding: 12,
        display: 'flex', flexDirection: 'column', gap: 8,
      }}>
      {isBottleneck && (
        <div data-testid="stage-card-bottleneck-pill" style={{
          position: 'absolute', top: -7, right: 10, fontSize: 9, fontWeight: 700,
          letterSpacing: '.05em', background: '#FFFBEB', color: '#92400E',
          border: '1px solid #FDE68A', padding: '1px 6px', borderRadius: 4,
        }}>BOTTLENECK</div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontFamily: 'monospace', fontSize: 10, color: '#64748B', fontWeight: 600 }}>
          S{String(stage.n).padStart(2, '0')}
        </span>
        <span style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 600, color: catColors.text || '#64748B' }}>
          {pct}%
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: -4 }}>
        <span style={{ width: 6, height: 6, borderRadius: 2, background: catColors.dot, display: 'inline-block', flexShrink: 0 }} />
        <span style={{ fontSize: 10, color: catColors.text, fontWeight: 600, letterSpacing: '.04em', textTransform: 'uppercase' }}>
          {catLabel}
        </span>
      </div>
      <div style={{
        fontSize: 12, fontWeight: 600, color: '#0F172A', lineHeight: 1.25,
        height: '2.5em', overflow: 'hidden', display: '-webkit-box',
        WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
      }}>{stage.name}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span style={{
          fontSize: 22, fontWeight: 600, color: '#0F172A', letterSpacing: '-0.02em',
          fontVariantNumeric: 'tabular-nums', lineHeight: 1,
        }}>{nfmt.format(count)}</span>
        <span style={{ fontSize: 10, color: '#64748B' }}>/ {nfmt.format(totalN)}</span>
      </div>
      <div style={{ position: 'relative', height: 4, background: '#F1F2F5', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', top: 0, left: 0, bottom: 0, borderRadius: 99,
          background: catColors.dot, width: Math.max(pct, 0.4) + '%',
        }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 10, color: '#64748B' }}>
        <span style={{ color: velColor, fontWeight: 600 }}>
          {wk > 0 ? `▲ ${nfmt.format(wk)}/wk` : '— 0/wk'}
        </span>
        {dwell > 0 && <span>· {dwell} dwell</span>}
      </div>
    </div>
  );
}

Object.assign(window, { StageCard });
