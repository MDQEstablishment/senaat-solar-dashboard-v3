import React from 'react';
// Login page — Zamil Services Solar Programs (Round 5 + R30.1 Supabase auth).
//
// USE_SUPABASE === true:
//   Real email/password sign-in via supabase.auth.signInWithPassword.
//   On success: resolve session.user.email → PEOPLE entry → onSignIn(person).
//   Demo dropdown hidden.
//
// USE_SUPABASE === false (?dev=1 escape hatch):
//   Demo dropdown picks PEOPLE entry directly. Used by E2E + offline runs.

function PageLogin({ onSignIn }) {
  const useSupabase = !!(typeof window !== 'undefined' && window.USE_SUPABASE && window.supabase);
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [selectedId, setSelectedId] = React.useState('u-pgm');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState(null);

  const resolveByEmail = (addr) => {
    if (!addr || !window.PEOPLE) return null;
    const lc = addr.toLowerCase();
    return window.PEOPLE.find(p => (p.email || '').toLowerCase() === lc) || null;
  };

  const submitDemo = () => {
    const user = window.PEOPLE.find(p => p.id === selectedId) || window.PEOPLE[0];
    onSignIn(user);
  };

  const submitSupabase = async () => {
    setError(null);
    if (!email || !password) { setError('Email and password are required.'); return; }
    setBusy(true);
    try {
      const { data, error: authError } = await window.supabase.auth.signInWithPassword({ email, password });
      if (authError) { setError(authError.message || 'Sign-in failed.'); return; }
      const sessionEmail = data?.user?.email || email;
      const person = resolveByEmail(sessionEmail);
      if (!person) {
        setError(`Authenticated, but no profile found for ${sessionEmail}. Contact admin.`);
        // Sign back out — don't leave a session for an unmapped user.
        try { await window.supabase.auth.signOut(); } catch {}
        return;
      }
      onSignIn(person);
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setBusy(false);
    }
  };

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if (useSupabase) submitSupabase();
    else submitDemo();
  };

  // Group users by role for the picker (demo mode only)
  const groups = [];
  const seen = new Set();
  if (!useSupabase) {
    ROLES.forEach(role => {
      const usersInRole = PEOPLE.filter(p => p.role === role);
      if (usersInRole.length === 0) return;
      groups.push({ role, users: usersInRole });
      usersInRole.forEach(u => seen.add(u.id));
    });
    const extras = PEOPLE.filter(p => !seen.has(p.id));
    if (extras.length > 0) groups.push({ role: 'Other', users: extras });
  }

  return (
    <div className="min-h-screen flex">
      {/* Left brand panel — clean, no info tiles */}
      <div className="hidden lg:flex w-1/2 bg-navy-900 text-white flex-col items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: 'radial-gradient(ellipse at 30% 30%, var(--accent) 0%, transparent 55%), radial-gradient(ellipse at 70% 70%, #1B4378 0%, transparent 60%)'
        }} />
        <div className="relative text-center z-10 max-w-md">
          <div className="flex items-center justify-center gap-4 mb-8">
            <ZamilLogo size={88} />
          </div>
          <div className="text-5xl font-extrabold tracking-[0.10em] mb-2">Zamil Services</div>
          <div className="text-base text-amber-300 tracking-[0.10em] mb-8">Solar Programs Dashboard</div>
          <div className="text-sm text-slate-400 italic">Operational excellence in solar.</div>
        </div>
      </div>

      {/* Right login form */}
      <div className="flex-1 flex items-center justify-center p-6 surface">
        <form onSubmit={handleSubmit} className="w-full max-w-md space-y-5" data-testid="login-form">
          <div className="lg:hidden flex items-center gap-2 justify-center mb-6">
            <ZamilLogo size={40} />
            <div>
              <div className="text-2xl font-extrabold tracking-[0.10em]">ZAMIL</div>
              <div className="text-[10px] text-ink-500 tracking-[0.18em]">SERVICES</div>
            </div>
          </div>

          <div>
            <h1 className="text-2xl font-bold">Sign in</h1>
            <p className="text-xs text-ink-500 mt-1">
              {useSupabase ? 'Use your Senaat / Zamil credentials.' : 'Demo mode — pick a user below to sign in.'}
            </p>
          </div>

          <div>
            <label className="text-[11px] font-medium text-ink-700 mb-1 block">Email</label>
            <TextField value={email} onChange={setEmail} placeholder="your.name@senaat.demo" data-testid="login-email" />
          </div>

          <div>
            <label className="text-[11px] font-medium text-ink-700 mb-1 block">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••" data-testid="login-password"
              className="w-full px-2.5 py-1.5 text-sm rounded-md border border-ink-200 bg-white focus:outline-none focus:ring-2 ring-accent" />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-300 text-red-800 rounded-md p-2 text-xs" data-testid="login-error">
              {error}
            </div>
          )}

          {!useSupabase && (
            <div className="bg-accent-soft border border-accent rounded-md p-3">
              <label className="text-[11px] font-semibold text-ink-700 mb-2 block">Demo: sign in as</label>
              <select value={selectedId} onChange={e => setSelectedId(e.target.value)}
                className="w-full px-2.5 py-1.5 text-sm rounded-md border border-ink-200 bg-white focus:outline-none focus:ring-2 ring-accent">
                {groups.map(g => (
                  <optgroup key={g.role} label={g.role}>
                    {g.users.map(u => (
                      <option key={u.id} value={u.id}>{u.name} — {u.email}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <div className="text-[10px] text-ink-500 mt-1">Pick any of the 15 real users to demo their view.</div>
            </div>
          )}

          <Button variant="accent" size="lg" onClick={handleSubmit} className="w-full !justify-center"
            type="submit" disabled={busy} data-testid="login-submit">
            {busy ? 'Signing in…' : 'Sign in'}
          </Button>

          <div className="text-[10px] text-ink-500 text-center">
            © Zamil Services · coolcare.com.sa · {useSupabase ? 'Live build' : 'Demo build'}
          </div>
        </form>
      </div>
    </div>
  );
}

Object.assign(window, { PageLogin });
