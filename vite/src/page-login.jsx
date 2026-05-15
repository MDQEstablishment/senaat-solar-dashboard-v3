// Login page — Zamil Services Solar Programs (Round 5)
// Demo-mode: any email/password works. Real-user picker lets the demo show different role views.

function PageLogin({ onSignIn }) {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [selectedId, setSelectedId] = React.useState('u-pgm');

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    const user = PEOPLE.find(p => p.id === selectedId) || PEOPLE[0];
    onSignIn(user);
  };

  // Group users by role for the picker
  const groups = [];
  const seen = new Set();
  ROLES.forEach(role => {
    const usersInRole = PEOPLE.filter(p => p.role === role);
    if (usersInRole.length === 0) return;
    groups.push({ role, users: usersInRole });
    usersInRole.forEach(u => seen.add(u.id));
  });
  // Catch any users with unknown role
  const extras = PEOPLE.filter(p => !seen.has(p.id));
  if (extras.length > 0) groups.push({ role: 'Other', users: extras });

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
        <form onSubmit={handleSubmit} className="w-full max-w-md space-y-5">
          <div className="lg:hidden flex items-center gap-2 justify-center mb-6">
            <ZamilLogo size={40} />
            <div>
              <div className="text-2xl font-extrabold tracking-[0.10em]">ZAMIL</div>
              <div className="text-[10px] text-ink-500 tracking-[0.18em]">SERVICES</div>
            </div>
          </div>

          <div>
            <h1 className="text-2xl font-bold">Sign in</h1>
            <p className="text-xs text-ink-500 mt-1">Use your coolcare.com.sa account.</p>
          </div>

          <div>
            <label className="text-[11px] font-medium text-ink-700 mb-1 block">Email</label>
            <TextField value={email} onChange={setEmail} placeholder="your.name@coolcare.com.sa" />
          </div>

          <div>
            <label className="text-[11px] font-medium text-ink-700 mb-1 block">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-2.5 py-1.5 text-sm rounded-md border border-ink-200 bg-white focus:outline-none focus:ring-2 ring-accent" />
          </div>

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

          <Button variant="accent" size="lg" onClick={handleSubmit} className="w-full !justify-center" type="submit">
            Sign in
          </Button>

          <div className="text-[10px] text-ink-500 text-center">
            © Zamil Services · coolcare.com.sa · Demo build
          </div>
        </form>
      </div>
    </div>
  );
}

Object.assign(window, { PageLogin });
