// R30.3b — Sentry observability for production-mode Vite builds.
//
// Loaded by main.jsx via ESM import. Init is gated on USE_SUPABASE so dev
// mode (?dev=1) and offline runs never report. Standalone build doesn't
// include this file (not in build-standalone.py's script list), so the
// offline HTML stays Sentry-free.
//
// API: importing this module auto-initializes Sentry once. Callers should
// use the re-exported ErrorBoundary / captureException helpers rather than
// importing @sentry/react directly — this file is the single place that
// touches the SDK so swapping vendors stays a one-file change.

import * as Sentry from '@sentry/react';
import { USE_SUPABASE } from './supabase.js';

const SENTRY_DSN = 'https://e6e165a83fe955c03529d3500843f6bb@o4511410722832384.ingest.us.sentry.io/4511410875727872';
const RELEASE = 'r30.3b';

let __initialized = false;

export function initSentry() {
  if (__initialized) return;
  if (typeof window === 'undefined') return;
  if (!USE_SUPABASE) return;     // dev/?dev=1 → skip entirely
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: 'production',
    release: RELEASE,
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
  });
  __initialized = true;
  window.Sentry = Sentry;
  window.__sentryReady = true;
  console.log('[R30.3b] Sentry initialized (release: ' + RELEASE + ')');
}

// Re-exports — call sites import these instead of @sentry/react directly.
export const ErrorBoundary = Sentry.ErrorBoundary;
export const captureException = (...args) => Sentry.captureException(...args);
export { Sentry };

// Auto-init on module load (main.jsx imports this before anything renders).
initSentry();
