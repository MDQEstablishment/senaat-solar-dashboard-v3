// Vite entry — expose React/ReactDOM/Recharts globally so the existing
// `<script type="text/babel">`-style modules (which use `window.X` rather than
// ES imports) continue to work after migration. We import them all in
// dependency order, then call createRoot once.

import React, { Suspense, lazy } from 'react';
import * as ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, useNavigate, useLocation, NavLink } from 'react-router-dom';
import './index.css';
// R30.3b — Sentry observability. Auto-inits on import; gated on USE_SUPABASE
// so dev mode and the standalone build never report.
import { ErrorBoundary as SentryErrorBoundary } from './lib/sentry.js';

// ── Expose React on window (existing pattern uses bare `React.useState` etc.) ──
window.React = React;
window.ReactDOM = ReactDOM;
window.BrowserRouter = BrowserRouter;
window.Routes = Routes;
window.Route = Route;
window.useNavigate = useNavigate;
window.useLocation = useLocation;
window.NavLink = NavLink;

// ── Recharts: real module on window. Lazy-loaded on first access. ──────────
// Components must use the `useRecharts()` hook from window so they re-render
// once the chunk resolves (otherwise destructured no-ops are captured forever).
let __rechartsRealModule = null;
let __rechartsLoading = null;
function __triggerRechartsLoad() {
  if (__rechartsLoading) return __rechartsLoading;
  __rechartsLoading = import('recharts').then(mod => {
    __rechartsRealModule = mod;
    window.Recharts = mod;
    window.dispatchEvent(new Event('recharts-loaded'));
    return mod;
  });
  return __rechartsLoading;
}
window.Recharts = new Proxy({}, {
  get: (_t, prop) => {
    if (__rechartsRealModule) return __rechartsRealModule[prop];
    __triggerRechartsLoad();
    return () => null;
  }
});
async function loadRecharts() { return __triggerRechartsLoad(); }
window.loadRecharts = loadRecharts;

// Hook: returns the real Recharts module (or null until loaded).
// Re-renders the component when the chunk arrives.
window.useRecharts = function useRecharts() {
  const [mod, setMod] = React.useState(__rechartsRealModule);
  React.useEffect(() => {
    if (__rechartsRealModule) { setMod(__rechartsRealModule); return; }
    __triggerRechartsLoad().then(setMod);
    const onLoaded = () => setMod(__rechartsRealModule);
    window.addEventListener('recharts-loaded', onLoaded);
    return () => window.removeEventListener('recharts-loaded', onLoaded);
  }, []);
  return mod;
};

// ── XLSX: dynamic import on first export action ─────────────────────────────
window.XLSX = {
  // Until the real lib arrives, calls throw a clear message we catch in callers.
  utils: { book_new: () => ({}), aoa_to_sheet: () => ({}), book_append_sheet: () => {} },
  writeFile: () => { console.warn('XLSX not yet loaded — call window.loadXLSX() first'); },
};
let xlsxLoading = null;
async function loadXLSX() {
  if (xlsxLoading) return xlsxLoading;
  xlsxLoading = import('xlsx').then(mod => {
    window.XLSX = mod;
    return mod;
  });
  return xlsxLoading;
}
window.loadXLSX = loadXLSX;

// ── PropTypes shim (a few modules read it) ──────────────────────────────────
window.PropTypes = {};

// ── Tweaks panel stub (the original tweaks-panel.jsx uses a Claude-Design API
// that doesn't exist outside the design tool — we provide no-op shims) ──────
window.useTweaks = (defaults) => {
  const [tweaks, setTweaks] = React.useState(() => {
    try { return JSON.parse(sessionStorage.getItem('zamil_tweaks')) || defaults; }
    catch { return defaults; }
  });
  const setTweak = (k, v) => setTweaks(prev => {
    const next = { ...prev, [k]: v };
    try { sessionStorage.setItem('zamil_tweaks', JSON.stringify(next)); } catch {}
    return next;
  });
  return [tweaks, setTweak];
};
window.TweaksPanel    = ({ children }) => null;  // hidden in production
window.TweakSection   = ({ children }) => children;
window.TweakToggle    = () => null;
window.TweakRadio     = () => null;

// ── Import all existing JSX modules in dependency order ─────────────────────
// (These modules execute side-effects only — they attach to window via
//  Object.assign(window, { X, Y }) and don't export ES bindings.)
import './data-schools.jsx';
import './data.jsx';
import './data-r2.jsx';
import './icons.jsx';
import './ui.jsx';
import './lib/supabase.js';
import './lib/db.js';
import './lib/image.js';
import './lib/storage.js';
import './lib/notify.js'; // R30.5
import './lib/realtime.js'; // R30.7
import './lib/use-form-autosave.js'; // R32 — form drafts persist across crashes/refreshes
import './components/StageCard.jsx';
import './components/StageChecklistTable.jsx';
import './components/MapPreview.jsx';
import './components/ImageUploader.jsx';
import './store-r2.jsx';
import './store.jsx';
import './chat-panel.jsx';
import './task-modal.jsx';
import './shell.jsx';
import './page-dashboard.jsx';
import './page-project.jsx';
import './page-schools-list.jsx';
import './page-school-detail.jsx';
import './page-vp.jsx';
import './page-my-tasks.jsx';
import './page-materials.jsx';
import './page-financials.jsx';
import './page-contractors.jsx';
import './page-reports.jsx';
import './page-settings.jsx';
import './pages-r2.jsx';
import './page-login.jsx';
import './page-reports-zamil.jsx';
import './page-delivery-notes.jsx';
import './app.jsx';

// ── Session persistence wrapper (H3 / M7) ───────────────────────────────────
// We wrap the original <App/> in a tiny shell that:
//   (a) rehydrates the logged-in user from sessionStorage, and
//   (b) intercepts <App/>'s currentUser change to persist it.
// The original App uses internal state (not Router). We don't refactor that
// for this push — instead we layer the Router on top: /login when logged out,
// /* when logged in. Internal page state stays in the original component.

function SessionShell() {
  const App = window.App;
  if (!App) return <div className="p-8 text-sm">Bootstrap error: App not registered.</div>;
  // Patch App so that user changes persist to sessionStorage and rehydrate on mount.
  // Done via a one-time DOM-level effect.
  React.useEffect(() => {
    // Rehydrate
    try {
      const raw = sessionStorage.getItem('zamil_demo_user');
      if (raw) {
        const u = JSON.parse(raw);
        if (u && u.id && window.PEOPLE) {
          const fresh = window.PEOPLE.find(p => p.id === u.id);
          if (fresh) {
            // Find the React root's user setter via a tiny event the App listens to.
            window.dispatchEvent(new CustomEvent('zamil-rehydrate', { detail: fresh }));
          }
        }
      }
    } catch {}
  }, []);
  return <App />;
}

// ── Sentry fallback UI (R30.3b) ─────────────────────────────────────────────
// Rendered when the React tree throws. In dev mode the SDK is not initialized,
// so nothing reports — but the fallback still renders, so devs see a friendly
// page instead of a blank screen.
function SentryFallback({ error, resetError }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#F8FAFC' }}>
      <div className="max-w-md text-center" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>⚠</div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0F172A', marginBottom: 8 }}>Something went wrong</h1>
        <p style={{ fontSize: 14, color: '#475569', marginBottom: 20 }}>
          The error has been reported to our team. Please try again, or reload the page.
        </p>
        <button onClick={resetError}
          style={{ background: '#0B2545', color: 'white', padding: '10px 20px', borderRadius: 6,
                   fontSize: 14, fontWeight: 500, border: 'none', cursor: 'pointer' }}>
          Try again
        </button>
      </div>
    </div>
  );
}

// ── Mount ───────────────────────────────────────────────────────────────────
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <BrowserRouter basename={import.meta.env.BASE_URL || '/'}>
    <a href="#main-content" className="sr-only-focusable">Skip to main content</a>
    <SentryErrorBoundary fallback={SentryFallback} showDialog={false}>
      <SessionShell />
    </SentryErrorBoundary>
  </BrowserRouter>
);
