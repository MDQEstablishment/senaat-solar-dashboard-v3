import React from 'react';
// Shared UI primitives

const cls = (...xs) => xs.filter(Boolean).join(' ');

const Avatar = ({ initials, size = 28, color = '#13315C' }) => (
  <div className="rounded-full flex items-center justify-center text-white font-semibold"
    style={{ width: size, height: size, background: color, fontSize: size * 0.4 }}>
    {initials}
  </div>
);

const Pill = ({ children, tone = 'neutral', className = '' }) => {
  const tones = {
    neutral: 'bg-ink-100 text-ink-700',
    navy:    'bg-navy-900 text-white',
    gold:    'bg-amber-100 text-amber-800',
    ok:      'bg-emerald-100 text-emerald-800',
    warn:    'bg-amber-100 text-amber-800',
    danger:  'bg-red-100 text-red-800',
    info:    'bg-sky-100 text-sky-800',
    soft:    'bg-ink-50 text-ink-700 border border-ink-200',
  };
  return <span className={cls('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium', tones[tone], className)}>{children}</span>;
};

const StatusPill = ({ status }) => {
  const map = { 'On Track': 'ok', 'At Risk': 'warn', 'Delayed': 'danger', 'Paid':'ok','Due':'warn','Scheduled':'soft' };
  return <Pill tone={map[status] || 'neutral'}>● {status}</Pill>;
};

const ProgressBar = ({ value, color = 'var(--accent)', height = 6, track = '#E2E8F0' }) => (
  <div className="w-full rounded-full overflow-hidden" style={{ background: track, height }}>
    <div style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: color, height: '100%', transition: 'width .3s' }} />
  </div>
);

const Card = ({ children, className = '', padding = 'p-5' }) => (
  <div className={cls('surface border rounded-xl shadow-card', padding, className)}>{children}</div>
);

const SectionTitle = ({ icon, title, action, subtitle, className = '' }) => (
  <div className={cls('flex items-end justify-between mb-3', className)}>
    <div>
      <h3 className="text-[15px] font-semibold flex items-center gap-2">
        {icon && <Icon name={icon} size={16} />}
        {title}
      </h3>
      {subtitle && <p className="text-xs text-ink-500 mt-0.5">{subtitle}</p>}
    </div>
    {action}
  </div>
);

const Button = ({ children, variant = 'primary', size = 'md', icon, onClick, className = '', type = 'button', disabled }) => {
  const sizes = { sm: 'px-2.5 py-1 text-xs', md: 'px-3 py-1.5 text-sm', lg: 'px-4 py-2 text-sm' };
  const variants = {
    primary: 'bg-navy-900 text-white hover:bg-navy-800',
    accent:  'text-white hover:opacity-95 bg-accent',
    ghost:   'bg-transparent hover:bg-ink-100 text-ink-700',
    outline: 'border border-ink-200 hover:bg-ink-50 text-ink-700',
    danger:  'bg-red-600 text-white hover:bg-red-700',
  };
  return (
    <button type={type} disabled={disabled} onClick={onClick}
      className={cls('inline-flex items-center gap-1.5 rounded-md font-medium transition disabled:opacity-50',
        sizes[size], variants[variant], className)}>
      {icon && <Icon name={icon} size={size === 'sm' ? 12 : 14} />}
      {children}
    </button>
  );
};

const TextField = ({ value, onChange, placeholder, type='text', className='' }) => (
  <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
    className={cls('w-full px-2.5 py-1.5 text-sm rounded-md border border-ink-200 bg-white focus:outline-none focus:ring-2 ring-accent', className)} />
);

const Select = ({ value, onChange, options, className='' }) => (
  <select value={value} onChange={e => onChange(e.target.value)}
    className={cls('px-2.5 py-1.5 text-sm rounded-md border border-ink-200 bg-white focus:outline-none focus:ring-2 ring-accent', className)}>
    {options.map(o => typeof o === 'string'
      ? <option key={o} value={o}>{o}</option>
      : <option key={o.value} value={o.value}>{o.label}</option>
    )}
  </select>
);

const Tabs = ({ tabs, active, onChange }) => (
  <div className="border-b border-soft flex items-center gap-1 overflow-x-auto scrollbar-thin">
    {tabs.map(t => (
      <button key={t} onClick={() => onChange(t)}
        className={cls('px-3 py-2 text-sm font-medium whitespace-nowrap border-b-2 -mb-px',
          active === t ? 'border-accent text-accent' : 'border-transparent text-ink-700 hover:text-ink-900')}>
        {t}
      </button>
    ))}
  </div>
);

// H6: Escape key + backdrop click dismissal
function useEscapeToClose(open, onClose) {
  React.useEffect(() => {
    if (!open || !onClose) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);
}

const Modal = ({ open, onClose, title, children, footer, wide }) => {
  useEscapeToClose(open, onClose);
  if (!open) return null;
  return (
    <div role="dialog" aria-modal="true" aria-label={typeof title === 'string' ? title : 'Dialog'}
      className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        className={cls('surface border rounded-xl shadow-pop w-full max-h-[90vh] overflow-auto scrollbar-thin', wide ? 'max-w-3xl' : 'max-w-md')}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-soft">
          <h3 className="text-sm font-semibold">{title}</h3>
          <button type="button" aria-label="Close dialog" onClick={onClose} className="text-ink-500 hover:text-ink-900"><Icon name="x" size={16} /></button>
        </div>
        <div className="p-5">{children}</div>
        {footer && <div className="px-5 py-3 border-t border-soft flex justify-end gap-2 surface-2">{footer}</div>}
      </div>
    </div>
  );
};

const SlideOver = ({ open, onClose, title, children, width = 'max-w-lg' }) => {
  useEscapeToClose(open, onClose);
  if (!open) return null;
  return (
    <div role="dialog" aria-modal="true" aria-label={typeof title === 'string' ? title : 'Side panel'}
      className="fixed inset-0 z-40 bg-black/30" onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        className={cls('absolute right-0 top-0 h-full w-full surface border-l border-soft slide-over-enter overflow-auto scrollbar-thin', width)}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-soft sticky top-0 surface z-10">
          <h3 className="text-sm font-semibold">{title}</h3>
          <button type="button" aria-label="Close panel" onClick={onClose} className="text-ink-500 hover:text-ink-900"><Icon name="x" size={16} /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
};

const EmptyState = ({ icon = 'inbox', title, message, action }) => (
  <div className="flex flex-col items-center justify-center py-12 text-center">
    <div className="w-12 h-12 rounded-full bg-ink-100 flex items-center justify-center text-ink-500 mb-3">
      <Icon name={icon} size={20} />
    </div>
    <div className="text-sm font-semibold mb-1">{title}</div>
    <div className="text-xs text-ink-500 max-w-sm mb-4">{message}</div>
    {action}
  </div>
);

const Sparkline = ({ data, color = 'var(--accent)', width = 80, height = 24 }) => {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data), max = Math.max(...data);
  const span = max - min || 1;
  const pts = data.map((v, i) => `${(i/(data.length-1))*width},${height - ((v-min)/span)*height}`).join(' ');
  return (
    <svg width={width} height={height}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

const TrendArrow = ({ delta, suffix = '%' }) => {
  if (delta == null) return null;
  const up = delta >= 0;
  return (
    <span className={cls('inline-flex items-center gap-0.5 text-[11px] font-medium', up ? 'text-emerald-600' : 'text-red-600')}>
      <Icon name={up ? 'trending-up' : 'trending-down'} size={12} />
      {Math.abs(delta).toFixed(1)}{suffix}
    </span>
  );
};

const ScoreBadge = ({ score }) => {
  const tone = score >= 85 ? 'ok' : score >= 70 ? 'warn' : 'danger';
  const label = score >= 85 ? 'Green' : score >= 70 ? 'Amber' : 'Red';
  return <Pill tone={tone}>{score} · {label}</Pill>;
};

const RowActions = ({ onEdit, onArchive }) => (
  <div className="flex items-center gap-1 justify-end">
    {onEdit     && <button onClick={onEdit}    className="p-1 rounded hover:bg-ink-100 text-ink-500 hover:text-ink-900" title="Edit"><Icon name="pencil" size={14} /></button>}
    {onArchive  && <button onClick={onArchive} className="p-1 rounded hover:bg-ink-100 text-ink-500 hover:text-red-600"  title="Archive"><Icon name="archive" size={14} /></button>}
  </div>
);

Object.assign(window, {
  cls, Avatar, Pill, StatusPill, ProgressBar, Card, SectionTitle, Button, TextField, Select,
  Tabs, Modal, SlideOver, EmptyState, Sparkline, TrendArrow, ScoreBadge, RowActions,
});
