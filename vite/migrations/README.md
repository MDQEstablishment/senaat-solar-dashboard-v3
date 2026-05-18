# R30 migrations

Foundation-only delivery (R30.0). Generates the SQL needed to seed your live
Supabase project; mutator wiring + auth + standalone build come in R30.1.

## Files

| File | Purpose |
|---|---|
| `generate-seed.mjs` | Node script — reads `vite/src/data*.jsx`, emits SQL + UUID map. Re-run any time. |
| `r30_seed.sql` | Generated SQL. Idempotent (`ON CONFLICT DO NOTHING`). 5.7 MB / ~3 100 lines. |
| `uuid-map.json` | Stable map: legacy in-memory user id (`u-mgr1`, …) → Postgres UUID. Same map is baked into `vite/src/lib/db.js` so runtime FK refs resolve. |

## Row counts in `r30_seed.sql`

| Table | Rows |
|---|---:|
| profiles | 15 |
| projects | 13 |
| schools  | 2 601 (emitted in chunks of 500) |
| contractors | 6 |
| tasks | 26 |
| escalations | 8 |
| escalation_history | ~18 |
| delivery_notes | 12 |
| delivery_note_items | ~26 |
| kpis (financial_entries) | 52 |
| audit_log | 110 |
| app_settings | 6 keys |

## How to run

1. Open your project in the Supabase Dashboard → SQL Editor → New query.
2. Paste the contents of `r30_seed.sql` and run.
3. The transaction either commits everything or rolls back cleanly on the first
   schema mismatch. Read the error, adjust the column name in `generate-seed.mjs`,
   re-run the generator, paste again.

## Enabling sign-in for the seeded users

`profiles.id` is FK to `auth.users.id`. The SQL only inserts the `profiles`
shells. To enable a user to actually sign in:

1. Open Supabase Dashboard → Authentication → Add user.
2. Set the email to whichever seed user you want to enable (e.g.
   `fasi@coolcare.com.sa`), set a password, and **set the User ID to the
   matching UUID from `uuid-map.json`**.
3. The profile row was already inserted by `r30_seed.sql`, so the FK lines up
   automatically.

For `MDQcareer@outlook.sa` (the operator), insert a custom row first:

```sql
INSERT INTO profiles (id, full_name, email, role, region, archived)
VALUES (auth.uid(), 'MDQ Operator', 'MDQcareer@outlook.sa', 'manager', 'Riyadh', false);
```

run that from a session signed in as the new auth user, OR pre-create the row
with a pre-chosen UUID and use that UUID when creating the auth user.

## Assumed column / enum names

The generator emits these names. If your live schema names differ, adjust the
emitter at the corresponding section in `generate-seed.mjs` and re-run.

- `profiles(id uuid PK, full_name, email, role user_role, region, mobile, archived)`
- `projects(id text PK, tag, name, type project_type, region, city, value numeric, start_date, target_date, status project_status, pm_id uuid → profiles, progress int)`
- `contractors(id text PK, name, region, schedule, quality, hse, docs, active_sites, projects text[], trend int[])`
- `schools(id text PK, project_id, name_ar, name_en, level, gender, region, city, coords, meter, account, kw numeric, contractor, status, stages jsonb)`
- `tasks(id text PK, title, description, assignee_id uuid, created_by_id uuid, created_at, due_date, priority, status task_status, project_id, school_id, stage_index)`
- `task_messages(id text PK, task_id, user_id uuid, text, created_at)`
- `escalations(id text PK, title, reason, urgency escalation_urgency, status escalation_status, project_id, school_id, task_id, from_user_id uuid, to_user_id uuid, to_role, currently_with uuid, opened_date, days_open, resolved_date)`
- `escalation_history(id text PK, escalation_id, who uuid, when_date, action, note)`
- `delivery_notes(id text PK, project_id, school_id, stage_key, delivery_date, supplier, contractor, received_by, signature_data_url, notes, status delivery_note_status, created_by_id uuid, created_at)`
- `delivery_note_items(id text PK, delivery_note_id, description, quantity numeric, unit, line_order int)`
- `kpis(id text PK, type, project_id, amount, kpi_date, related_milestone, notes, document_path)`
- `audit_log(id text PK, timestamp, actor_id uuid, actor_name, actor_role, action, entity_type, entity_id, entity_label, before_state, after_state, summary)`
- `app_settings(key text PK, value jsonb)`
- `photos(id PK, kind enum, project_id, school_id, delivery_note_id, storage_path, bytes, uploaded_at, uploaded_by uuid)` — referenced in mirror layer (R30.1), not seeded in R30.0.

Enums emitted: `user_role`, `project_status`, `project_type`, `escalation_urgency`,
`escalation_status`, `task_status`, `delivery_note_status` (cast inline via `'value'::enum_name`).

## What R30.0 ships

- `vite/src/lib/supabase.js` — Supabase client init, `USE_SUPABASE` flag.
- `vite/src/lib/db.js` — UUID map (`USER_UUID`), `userUuid()` resolver, role-enum
  conversion, `bg*` fire-and-forget write helpers.
- `vite/src/lib/storage.js` — `SupabaseImageStorage` adapter, swapped in at module
  load when `USE_SUPABASE && window.supabase`. `MemoryImageStorage` retained as
  fallback for `?dev=1` / offline mode.
- `vite/migrations/` — this folder.
- `@supabase/supabase-js` added to `vite/package.json`.

Nothing imports `lib/supabase.js` yet, so the bundle behavior is unchanged.
R30.1 wires it in via `main.jsx` and store-r2.

## What R30.1 owes

1. Import `lib/supabase.js` from `main.jsx` (before `lib/storage.js`).
2. Mirror layer (`lib/mirror.js`) — per-entity converters that map R29 in-memory
   shapes to the Postgres row shape, fire-and-forget via `bg*` helpers.
3. Mutator edits in `store-r2.jsx` + `store.jsx` to call the mirror after each
   `setState`. Priority order per the original R30 brief:
   `updateSchool` → `addDeliveryNote` → `addProject` → `addContractor` →
   `addUser` → `addEscalation` → `addTask` → `logAudit` → `app_settings`.
4. `page-login.jsx` — email/password Sign In + Sign Up tabs, `?dev=1` keeps the
   role dropdown for demos. `app.jsx` wires `supabase.auth.onAuthStateChange`.
5. `build-standalone.py` — inject the supabase-js UMD CDN script + a tiny init
   block before the bundled `vite/src/lib/supabase.js` body.
6. E2E adds: `'supabase client initialised on window'`,
   `'EditCoordsModal write round-trips through Supabase'`,
   `'image upload round-trips through Supabase Storage'`,
   `'delivery note create persists across reload'`.
7. Live verification per the R30 Item #7 checklist (sign-in, EditCoordsModal,
   image upload, delivery note round-trip, audit_log appends).
