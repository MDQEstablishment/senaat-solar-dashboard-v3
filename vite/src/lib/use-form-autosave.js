// R32 — Reusable form autosave hook.
// Persists form state to localStorage so a browser crash, accidental refresh,
// or React error mid-edit doesn't lose the user's input.
//
// Usage:
//   const [form, setForm] = useState(initialState);
//   useFormAutosave('delivery-note:new', form, setForm, { skipKeys: ['photos'] });
//
// API:
//   key       — unique localStorage key (e.g. 'delivery-note:new', `fin-entry:${id}`)
//   value     — current form state (must be JSON-serialisable)
//   setValue  — setter that the hook will call ONCE on mount if a saved draft exists
//   options:
//     skipKeys  — keys in form state to exclude from save (e.g. uploaded photos)
//     ttlMs     — auto-discard drafts older than this (default 7 days)
//     onRestore — callback after restoring a draft (optional toast / log)
import React from 'react';

const PREFIX = 'autosave:';
const DEFAULT_TTL = 7 * 24 * 60 * 60 * 1000;   // 7 days

export function useFormAutosave(key, value, setValue, options = {}) {
  const fullKey = PREFIX + key;
  const ttlMs = options.ttlMs ?? DEFAULT_TTL;
  const skipKeys = options.skipKeys || [];
  const restoredRef = React.useRef(false);

  // Restore on mount
  React.useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    try {
      const raw = localStorage.getItem(fullKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.savedAt) return;
      if (Date.now() - parsed.savedAt > ttlMs) {
        localStorage.removeItem(fullKey);
        return;
      }
      // Restore: merge over the initial state so any new fields stay defaulted
      setValue(v => ({ ...v, ...(parsed.data || {}) }));
      if (typeof options.onRestore === 'function') options.onRestore(parsed);
    } catch (_) { /* corrupt draft — ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save on change (debounced via requestIdleCallback / setTimeout)
  React.useEffect(() => {
    if (!restoredRef.current) return;  // don't save before restoring
    const handle = setTimeout(() => {
      try {
        const payload = { ...value };
        skipKeys.forEach(k => { delete payload[k]; });
        localStorage.setItem(fullKey, JSON.stringify({ savedAt: Date.now(), data: payload }));
      } catch (_) { /* quota or serialisation error — silent */ }
    }, 400);
    return () => clearTimeout(handle);
  }, [value, fullKey]);
}

// Manual clear — call from your submit handler after a successful save
export function clearFormAutosave(key) {
  try { localStorage.removeItem(PREFIX + key); } catch (_) {}
}

// Make available globally so non-module pages can use it without imports
if (typeof window !== 'undefined') {
  window.useFormAutosave = useFormAutosave;
  window.clearFormAutosave = clearFormAutosave;
}
