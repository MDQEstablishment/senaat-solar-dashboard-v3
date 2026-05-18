// R30 — Supabase client init. Uses the publishable (anon) key + RLS for security.
// Service-role keys never enter client bundles; the seed migration SQL is run
// manually by the operator via the Supabase SQL editor.
//
// The USE_SUPABASE flag flips the store / storage adapters between in-memory
// (R29 demo behavior) and Supabase round-trip writes. It's defaulted true here
// but can be disabled at runtime by setting `window.USE_SUPABASE = false` BEFORE
// modules import this file (e.g. for offline / Playwright runs).

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL         = 'https://bhesznqfrcyikfupdgkx.supabase.co';
const SUPABASE_PUBLISHABLE = 'sb_publishable_KUh3cPKxVNV7KrwC8QBHsA_dp3Ah-9U';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    storageKey: 'zamil-auth',
  },
});

// USE_SUPABASE: respect a pre-existing window flag (test harness can force-false),
// otherwise default true. `?dev=1` in the URL also forces in-memory mode.
const devOverride = (typeof window !== 'undefined' &&
                    window.location &&
                    /[?&]dev=1\b/.test(window.location.search));
export const USE_SUPABASE = (typeof window !== 'undefined' && 'USE_SUPABASE' in window)
  ? !!window.USE_SUPABASE
  : !devOverride;

if (typeof window !== 'undefined') {
  window.supabase    = supabase;
  window.USE_SUPABASE = USE_SUPABASE;
  window.SUPABASE_URL = SUPABASE_URL;
}
