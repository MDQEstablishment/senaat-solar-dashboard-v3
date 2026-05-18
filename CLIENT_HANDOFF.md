# Zamil Solar Programs Dashboard — Client Handoff

**Version:** 13.0.0 (R30.8) · **Handoff date:** 2026-05-18 · **Status:** PRODUCTION READY

**Live URL:** https://mdqestablishment.github.io/senaat-solar-dashboard-v3/
**Repository:** https://github.com/MDQEstablishment/senaat-solar-dashboard-v3
**Backend:** Supabase project `Zamil-Dashboard` (ap-south-1) — Pro plan, $25 flat-rate spend cap enabled

---

## 1. What you get

A multi-user, role-aware web dashboard for Zamil Services' 2,600-school Saudi solar PV rollout program. Real Supabase Postgres backend, real email/password auth, role-scoped RLS, real-time cross-user sync, transactional email notifications, signature capture for delivery notes, and end-to-end audit logging.

**Architecture:** React 18 + Vite + Supabase (Postgres 17, Auth, Storage, Edge Functions, Realtime) — deployed as a static site on GitHub Pages plus 2 Edge Functions running on Supabase's Deno isolates.

---

## 2. Who can do what (role matrix)

| Role | Sign-in | Add users | View financials | Create projects | Escalate to VP | Sees all projects |
|---|---|---|---|---|---|---|
| VP                  | yes | no  | yes | no  | n/a | yes |
| Manager             | yes | yes | yes | yes | yes | yes |
| Operations Manager  | yes | yes | yes | no  | yes | yes |
| Program Manager     | yes | no  | no  | no  | yes | yes |
| Material Planning   | yes | no  | no  | no  | no  | scoped |
| Coordinator         | yes | no  | no  | no  | no  | scoped |
| Project Manager     | yes | no  | no  | no  | yes | only assigned |

All access is enforced server-side via Supabase Row-Level Security policies — the UI is just a courtesy. A Project Manager cannot read another PM's schools even by hand-crafting a SQL query.

---

## 3. Demo accounts (delete or change before public launch)

15 demo users exist in `auth.users` + `profiles`, all with password `Senaat2026!`. The 7 documented logins below cover one user per role:

| Role | Name | Email |
|---|---|---|
| VP                  | Olaf Heyns          | Olaf.Heyns@coolcare.com.sa |
| Manager             | Anas Alshahrani     | Anas.Alshahrani@coolcare.com.sa |
| Operations Manager  | Syed Farooq Ahmed   | Syed.Farooq@coolcare.com.sa |
| Program Manager     | Naif Alsalmah       | Naif.AlSalmah@coolcare.com.sa |
| Material Planning   | Farhan Ansari       | Farhan.Ansari@coolcare.com.sa |
| Coordinator         | Nojood Aljughaiman  | Nojood.Aljughaiman@coolcare.com.sa |
| Project Manager     | Muhammad Rafique    | Muhammad.Rafique@coolcare.com.sa |

Sign in at the live URL. After R30.4, the "demo dropdown" no longer appears unless you append `?dev=1` to the URL.

---

## 4. What's been built in the R30 sprint (this session)

| Round | Scope | Status | Commit |
|---|---|---|---|
| R30.0 | Supabase foundation: 14 tables, 8 enums, storage bucket, RLS | ✓ live | `6c6a153` |
| R30.1 | Mutator wiring (write-through to Supabase) + auth + standalone CDN | ✓ live | `1ceec4a..d14a8c9` |
| R30.2 | Boot orchestrator: page loads from Supabase, not in-memory mock | ✓ live | `57589b1` |
| R30.3a | Security hotfix: lock role switcher when authenticated | ✓ live | `8a2829f` |
| R30.3b | Sentry + flash-of-login fix + stage seed data + audit chart wiring | ✓ live | `74d504d` |
| R30.4 | 3 display bug fixes + server-side addUser Edge Function | ✓ live | `1661b3a` |
| R30.5 | Email notifications (escalation_created + task_assigned) | ✓ live | `1c4240f` |
| R30.6 | Signature pad for delivery notes + signature in printed PDF | ✓ live | `daffc18` |
| R30.7 | Realtime subscriptions (tasks/escalations/delivery_notes) | ✓ live | `271be37` |
| R30.8 | Security hardening + this handoff doc | ✓ live | this commit |

**Test suite:** 561 static assertion tests, all passing. Run with `node tests/e2e.cjs`.

---

## 5. Edge Functions deployed

Two Deno-based Supabase Edge Functions, both with JWT verification on.

### `create-user` (R30.4)
Server-side path for adding new users. The browser cannot create `auth.users` rows (that requires the service-role key, which must never ship in the client bundle). This function runs in a Deno isolate with the service-role secret + the caller's JWT, verifies the caller is a manager/VP/operations_manager, then atomically creates `auth.users` + `profiles` with the same UUID.

Invoke from frontend: `supabase.functions.invoke('create-user', { body: { email, full_name, role, mobile, default_regions, temp_password } })`

### `send-notification` (R30.5)
Transactional emails for two events: `escalation_created` and `task_assigned`. Calls Resend's REST API directly (no SDK). **Graceful no-op when `RESEND_API_KEY` secret is missing** — emails are fire-and-forget from the frontend and must never fail the underlying mutation.

To enable real email delivery (one-time operator action):
1. Get a Resend API key from https://resend.com
2. In Supabase dashboard → Settings → Edge Functions → Secrets, set `RESEND_API_KEY=re_xxxxxxxx`
3. Verify the sending domain (`mdqestablishment.com`) in Resend's dashboard, OR change `FROM_ADDRESS` in `supabase/functions/send-notification/index.ts` to a verified domain

Until the key is set the dashboard still works perfectly — escalations + task assignments still record in the database and trigger in-app notifications. Only the email side-channel is dormant.

---

## 6. Database (Supabase project `bhesznqfrcyikfupdgkx`)

| Table | Rows | Purpose |
|---|---|---|
| profiles            | 15    | User profiles, FK to `auth.users.id` (CASCADE delete) |
| projects            | 13    | Top-level programs/contracts |
| schools             | 2,600 | School installations, FK to projects (CASCADE) |
| contractors         | 6     | Installation contractors |
| tasks               | 27+   | Task assignments with `assigned_to_id` + `created_by_id` |
| task_messages       | (live)| Per-task chat |
| escalations         | 8     | Issues raised to higher roles |
| escalation_history  | 13    | Audit trail of escalation transfers |
| delivery_notes      | 12    | Material delivery receipts |
| delivery_note_items | 20    | Line items per note |
| photos              | (live)| Photo metadata, image content in Storage bucket |
| app_settings        | 6     | Configurable lookups |
| audit_log           | 110+  | All mutations — who/what/when/why |
| kpis                | 0     | Reserved for derived metrics |

All 14 tables have RLS enabled with 2–5 policies each. Role-aware SELECT, INSERT/UPDATE/DELETE checks enforced server-side.

**Realtime:** 3 hot tables (`tasks`, `escalations`, `delivery_notes`) are in the `supabase_realtime` publication — INSERT/UPDATE/DELETE events stream to subscribed clients. RLS still applies, so users only receive events for rows they're allowed to read.

**Backups:** Supabase Pro daily backups enabled with 7-day retention. Spend cap at $25/month — if usage exceeds Pro quota, the project goes read-only instead of incurring overage charges.

---

## 7. Security posture

Status of automated security advisors:

**Resolved this sprint:**
- Function `search_path` pinned on 4 SECURITY DEFINER functions
- `audit_log_insert` policy: now requires `user_id = auth.uid()`
- `escalation_history_insert`: now requires `from_user_id = auth.uid()`
- `tasks_insert`: now requires `created_by_id = auth.uid() OR is_portfolio_role()`
- `images` bucket: SELECT now requires authentication (no public listing)

**Documented as known-acceptable:**
- "GraphQL anon/authenticated table exposed" warnings — false positives for this app. The app uses PostgREST (not GraphQL), and RLS already restricts SELECT row-by-row. Revoking `SELECT` from `authenticated` would break the application entirely.

**Recommended operator action (one-time, dashboard-only):**
- Enable "Leaked Password Protection" at https://supabase.com/dashboard/project/bhesznqfrcyikfupdgkx/auth/policies — checks new passwords against HaveIBeenPwned. Cannot be enabled via SQL/API.

---

## 8. Observability

- **Sentry**: connected (`@sentry/react` v8.45). DSN auto-loads in production. Errors are captured with release tag, stack trace, user context. Tested end-to-end in R30.3b — a test exception landed in the inbox.
- **Audit log**: every mutation writes a row to `audit_log` (capped at 5000 rows in memory, unbounded in DB). Visible to VP/Manager via the Audit page.
- **Sentry release tag**: `r30.3b` and forward. Increment via `vite/src/lib/sentry.js` `release` field if you want to track per-version error rates.

---

## 9. Day-2 operator playbook

### Add a new user (production, not demo)
1. Sign in as a Manager or VP.
2. Settings → Users → Add User.
3. Fill in name / email / role / region / mobile, click Save.
4. The `create-user` Edge Function creates `auth.users` + `profiles` atomically with a temp password.
5. Share the temp password out-of-band; the new user can change it at https://supabase.com/dashboard/project/bhesznqfrcyikfupdgkx/auth/users.

### Reset a forgotten password
Either:
- Supabase Dashboard → Authentication → Users → ⋯ → Send password recovery email, OR
- Set a new password directly via Auth admin.

### Rotate a user's role
Settings → Users → click user → change Role. Reflects in real-time across all sessions thanks to R30.7 realtime subs.

### Disable a user (revoke access without deleting history)
Settings → Users → Archive. The `profiles.archived = true` flag hides them from pickers; their historical audit/escalation rows stay intact. To fully revoke, also delete the row from `auth.users` (Dashboard → Auth → Users).

### Push a code change
Build artifacts are committed in this repo. To deploy:
```bash
cd vite && npx vite build
cp dist/index.html ../index.html
rm -f ../assets/*.js ../assets/*.css
cp dist/assets/* ../assets/
python3 ../build-standalone.py
git add -A && git commit -m "..." && git push
```
GitHub Pages auto-publishes from `main` within ~2 minutes.

### Deploy a new Edge Function version
```bash
supabase functions deploy <fn-name>
# OR via Supabase Dashboard → Edge Functions → New Version → paste index.ts
```

---

## 10. Known small UX items deferred (none are blockers)

1. **Stage Transitions chart** uses a derived weekly-crossings computation; the audit-log-driven version is the long-term shape.
2. **Real PDF library** for delivery notes — the current path is browser print-to-PDF, which works on every device and embeds the signature. A `pdf-lib` integration is the next step if needed.
3. **R29.1 PDF lib** — closed by R30.6 signature pad; full pdf-lib deferred (browser print is sufficient).
4. **Image bucket listing**: low-severity (the bucket is public-read by object path; listing was disabled but the bucket type itself is "public"). To fully harden, change bucket type to "private" in Storage settings; URLs would then need to be signed.

---

## 11. Contact / change log

- **Repo owner:** MDQEstablishment (renamed from Anas11223300 on 2026-05-17)
- **Supabase project owner:** account that holds the $25/month Pro subscription
- **Sentry account:** signed up during R30.3b — DSN baked into the bundle
- **GitHub Pages:** auto-publishes from `main` branch root

Last commit on `main` at handoff: R30.8 wave (see git log).

**The dashboard is production-ready. Sign in, click around, and ship to the client.**
