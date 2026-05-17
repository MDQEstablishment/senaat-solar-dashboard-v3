# AUDIT_REPORT.md — Round 29.5 pre-Supabase audit

| Field | Value |
|---|---|
| Date | 2026-05-17 |
| Commit audited | `ebb6fd3` (R29 deployed) |
| Live URL | https://mdqestablishment.github.io/senaat-solar-dashboard-v3/ |
| Test suite | `vite/e2e.cjs` (static-analysis "Playwright" harness — pure-Node, no browser) |
| Total checks | **390** (323 baseline preserved + 67 R29.5 gap-fill added) |
| Result | **0 failures, exit 0** |

> **Scope note.** The harness committed to this repo is a static-analysis script that
> greps source files for wiring proofs. Earlier rounds called it "Playwright" but it
> does not drive a real browser. Where this audit cites pass/fail for runtime
> behavior (§3 sidebar items, §4 e2e scenarios) the verification is **code-level
> wiring proof** (the predicates / branches that would produce that behavior all
> exist and are correctly gated). A live click-through on the GitHub Pages URL is
> outside the sandbox available here and is not claimed.

---

## 1. Code audit findings

### 🔴 Must-fix before R30

**1.1 Stage Transitions + Top Bottlenecks invisible to Ops Mgr + Pgm Mgr** —
`vite/src/pages-r2.jsx:402,427`. The panel is rendered with
`{isExec && <DashStageInsights ... />}` and `isExec = canViewFinancials(currentUser)`.
`canViewFinancials` returns true only for `u-vp / u-mgr1 / u-mgr2`. The R29.5 spec
matrix requires these panels on Manager / VP / **Operations Manager** /
**Program Manager** dashboards. Today Ops Mgr (Syed Farooq) and Pgm Mgr (Naif)
get the 4-card simple KPI row instead. **Fix:** introduce a `canViewStageInsights`
predicate that returns true for any role in `SCHOOL_EXECUTION_STAGES_ROLES`, and
gate `DashStageInsights` on that instead of `isExec`.

### 🟡 Should-fix

**1.2 Storage tab unreachable for VP** — `vite/src/app.jsx:246,268`,
`vite/src/page-settings.jsx:8-27,34`. VP routes through `<PageSettings
auditLogOnly={true} />`, which short-circuits before the tab list and only renders
`<AuditTab />`. The R29.5 spec matrix says "Storage usage panel visible only to
Manager + VP." Today VP cannot reach the Storage tab at all. **Fix:** either
(a) widen `canViewSettings` to include `u-vp`, or (b) inject the Storage card
into the `auditLogOnly` branch as a sibling to `<AuditTab />`. Option (b) is
narrower.

**1.3 Sub-Agent A initially reported `canEscalateToVP` unused — that is wrong.**
It is consumed at `vite/src/store-r2.jsx:688` to gate the escalation chain
("Manager → VP" promotion). Re-verified during this audit. No code change
required; flagged so the same false-positive doesn't reappear in the next
review.

### 🟢 Cosmetic / fine

**1.4 Window pollution baseline.** ~50+ app symbols are attached to `window` as
part of the Vite migration legacy (`store.jsx`, `data.jsx`, every page module).
This is intentional — pages reach each other via window globals rather than
imports. Not a regression; flagged only as a transition cost line item for the
R30 → R31 cleanup.

**1.5 Dead-code sweep — clean.** No unreachable branches, no stale
window-registrations, no comments-out blocks of consequence. Spot-checked all
32 files in `vite/src/`.

**1.6 Stale-component references — clean.** Grepped for `SchoolsStagesVertical`,
`StageExecutionKPIs`, `SiteEngineer`, `siteEngineer`, `OldProjectFunnel`,
`Anas11223300`. The only hit for `SchoolsStagesVertical` is a comment at
`vite/src/page-project.jsx:379` explaining why it was removed (R23). `StageExecutionKPIs`
is still defined (`pages-r2.jsx:623`) and consumed by `page-vp.jsx:60` — alive.
No `SiteEngineer` / `Anas11223300` survivors anywhere.

**1.7 Hardcoded stage keys — clean.** All references go through `STAGE_KEYS`,
`SCHOOL_STAGES`, `STAGE_INDEX[key]`, or `STAGE_KEY_LABEL`. No string-literal
stage IDs scattered through the pages.

**1.8 GitHub remote — confirmed MDQEstablishment everywhere.**
`vite/vite.config.js` base `/senaat-solar-dashboard-v3/`; `vite/README.md`
references the same path; built `index.html` (repo root) loads assets from
`/senaat-solar-dashboard-v3/assets/`. No `Anas11223300` strings left.

**1.9 Role-gate consistency — clean.** Every capability predicate
(`canViewFinancials`, `canCreateProject`, `canEscalateToVP`, `canViewAuditLog`,
`canViewSettings`, `canViewSchoolExecutionStages`) is defined once in
`vite/src/data.jsx:158-169` and consumed by name everywhere. No duplicate /
divergent role-check forks. See §3 for the full per-role matrix derived from
these predicates.

**1.10 SCHOOL_STAGES sanity — confirmed 18.** `vite/src/data.jsx:34-44` lists
exactly 18 labels; `STAGE_KEYS` (49-56) lists exactly 18 keys aligned by index;
`STAGE_EXCEL_HEADERS` (46-65) covers all 18; `STAGE_CATEGORY` (67-73) covers
all 18. R29.5 test `SCHOOL_STAGES literal contains exactly 18 entries`
re-asserts this with comment-stripping (a previous round's regex would
have miscounted 20 because quoted strings inside the R18 comment block were
matched as entries).

---

## 2. New Playwright coverage (R29.5 gap-fill)

67 new `record()` checks appended to `vite/e2e.cjs` under section M.
Suite total: **390 passing / 0 failing**.

| # | Group | Checks |
|---|---|---|
| M.1 | Role enum + 6 capability allowlists | 7 |
| M.2 | Per-role × capability cross-table (7 roles × ≤6 caps) | 23 |
| M.3 | Sidebar item branches per role (VP / PM / Coord / MatPlan / Pgm-group / shared Delivery Notes) | 7 |
| M.4 | Audit Log sidebar visibility logic | 2 |
| M.5 | Stage Transitions + Top Bottlenecks gating (incl. current-behavior assertion of the 🔴 gap above) | 4 |
| M.6 | Storage panel access (incl. current-behavior assertion of the 🟡 gap above) | 3 |
| M.7 | GitHub remote path / no `Anas11223300` survivors | 4 |
| M.8 | Sparklines + delta chips (KPICard wiring + Sparkline SVG component) | 4 |
| M.9 | Cash Flow chart caption | 1 |
| M.10 | 18-stage rollup (count, with comment-strip) | 3 |
| M.11 | Excel templates (master / material / zamil) | 3 |
| M.12 | Map widget always renders + EditCoordsModal paste helper | 2 |
| M.13 | Image upload 10 MB rejection + compression preview surfacing | 3 |
| M.14 | Delivery Notes hidden for Material Planning | 1 |

Two of these tests intentionally assert **current** (wrong-per-spec) behavior —
they're marked `(current behavior)` in the test name so the day the gap in §1.1
or §1.2 is fixed, the test fails loudly and the engineer flips the assertion.
This is deliberate: silent drift is worse than a noisy red.

No flaky / skipped tests. The suite runs synchronously, exits 0 in ~250 ms.

---

## 3. Per-role behavioral audit

Derived from `vite/src/data.jsx:148-169` (predicates) and `vite/src/shell.jsx:6-93`
(sidebar branches) and `vite/src/pages-r2.jsx:391-449` (dashboard widgets).

### Capability matrix

| Predicate | VP | Manager (×2) | Ops Mgr (×2) | Pgm Mgr | PM (×7) | Mat Plan | Coord |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| `canViewFinancials` | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `canCreateProject` | ✗ | ✓ | ✗ | ✓ | ✗ | ✗ | ✗ |
| `canEscalateToVP` | — | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `canViewAuditLog` | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ |
| `canViewSettings` | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `canViewSchoolExecutionStages` | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ |

### Sidebar items (in display order)

**VP (Olaf Heyns · `u-vp`)** — `Dashboard · Programs · Escalations · Financials · Delivery Notes · Reports · Audit Log`. Settings hidden; reaches Audit Log via direct sidebar item, not via Settings page.

**Manager (Fasiulla Baig · `u-mgr1` / Anas Alshahrani · `u-mgr2`)** — `Dashboard · Projects · My Tasks · My Escalations · Financials · Contractors · Delivery Notes · Reports · Settings`. Audit Log reached via the Settings page's Audit Log tab (not as a direct sidebar item).

**Operations Manager (Syed Farooq Ahmed · `u-op1` / Syed Azam · `u-op2`)** — `Dashboard · Projects · My Tasks · My Escalations · Contractors · Delivery Notes · Reports · Audit Log`. Financials hidden, Settings hidden, Audit Log surfaces as a direct sidebar link because `canViewAuditLog && !canViewSettings`.

**Program Manager (Naif Alsalmah · `u-pgm`)** — `Dashboard · Projects · My Tasks · My Escalations · Contractors · Delivery Notes · Reports · Audit Log`. Same as Ops Mgr.

**Project Manager (Sanif, Muhammad Rafique, et al — 7 users · `u-pm1…u-pm7`)** — `My Projects · My Schools · My Tasks · My Escalations · Delivery Notes · Reports`. Lands on `/my-projects` (not `/home`). No Financials, no Contractors, no Settings, no Audit Log, no Stage Insights, no School Execution Stages widget. Scoped to `currentUser.projectIds`.

**Material Planning (Farhan Ansari · `u-mat`)** — `Dashboard · Projects · My Tasks · My Escalations · Reports`. **Delivery Notes explicitly hidden** (`shell.jsx:56`). Projects sidebar item routes to `PageVPPrograms` (read-only programs list).

**Coordinator (Nojood Aljughaiman · `u-coord`)** — `Dashboard · Projects · My Tasks · My Escalations · Delivery Notes · Reports`. Read-only Projects list (`PageVPPrograms`).

### Dashboard widgets

| Widget | VP | Manager | Ops Mgr | Pgm Mgr | PM | Mat Plan | Coord |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| Executive 7-card KPI strip | ✓ | ✓ | ✗ (4-card simple) | ✗ (4-card simple) | ✗ | ✗ | ✗ |
| **Stage Transitions chart** | ✓ | ✓ | **✗ (🔴 spec wants ✓)** | **✗ (🔴 spec wants ✓)** | ✗ | ✗ | ✗ |
| **Top Bottlenecks panel** | ✓ | ✓ | **✗ (🔴 spec wants ✓)** | **✗ (🔴 spec wants ✓)** | ✗ | ✗ | ✗ |
| School Execution Stages widget (4-category) | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ |
| Financial Summary (Received/Receivable/Paid/Payable) | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Top Escalations table (directed at me) | ✓ (6) | ✓ (20) | ✓ (20) | ✓ (20) | ✗ | ✗ | ✗ |
| KPI sparklines + delta chips | ✓ (in KPICard, see `page-dashboard.jsx:31,40`) | (same) | (same) | (same) | (only when PageDashboard renders for PM-scope) | ✗ | ✗ |

### Discrepancies vs spec

Two — both flagged in §1 and §5: Stage Transitions / Top Bottlenecks gating
(🔴) and Storage panel reach (🟡).

---

## 4. R28 + R29 end-to-end results

Live click-through is outside this sandbox. Each scenario below is verified at
the **code-wiring level** — every branch that would produce the described
behavior exists and is correctly gated. The matching tests in `vite/e2e.cjs`
are cited in brackets.

| # | Scenario | Result | Wiring proof |
|---|---|:-:|---|
| 1 | Dammam project → Project Locations card renders region centroid fallback with "Approximate" caption | ✅ wired | `ProjectMapPreview` computes bbox from valid coords, falls back to region centroid, falls back to empty state — tests R28 lines 968-976 |
| 2 | Madina project → actual lat,lng pins render | ✅ wired | `parseCoords` accepts `lat,lng` pairs; Madina schools in seed have parseable coords. Test R28: 951 |
| 3 | Jeddah project (0/200 schools with coords) → Makkah region centroid fallback | ✅ wired | Same fallback chain as #1; Jeddah → region "Makkah" → REGION_CENTROIDS["Makkah"]. Tests R28: 940, 945, 962 |
| 4 | Any Dammam school → SchoolMapPreview always renders | ✅ wired | `956: School Detail map ALWAYS renders (no gating on coords presence)` |
| 5 | EditCoordsModal: paste `24.7136, 46.6753` → save → inline update + audit log entry | ✅ wired | EditCoordsModal at `MapPreview.jsx:199`; `Paste from Google Maps` label at line 251; School Detail wires `handleSaveCoords → updateSchool + logAudit('school.coords')` (R28 test 987) |
| 6a | Project cover: upload > 10 MB → rejected | ✅ wired | `lib/image.js:74` `if (file.size > IMAGE_LIMITS.maxInputBytes) throw`; surfaced by `ImageUploader.reportError` (R29.5 test) |
| 6b | Project cover: upload 8 MB phone photo → compress < 500 KB → preview + Upload | ✅ wired | `compressImage` iterates `q: 0.78 → 0.7 → 0.6 → 0.5 → 0.4` (R29 test 1018); preview shows `originalBytes` vs `compressedBytes` (R29 test 1023) |
| 7 | Project Gallery: upload 3 photos → thumbnail grid | ✅ wired | `<ImageUploader path="projects/{id}/gallery" maxCount={50}>` at `page-project.jsx:458` |
| 8 | School Detail Photos tab: per-stage grids, max 5 per stage | ✅ wired | One `ImageUploader` per stage with path `projects/{id}/schools/{id}/stages/{stageKey}`, `maxCount={5}` at `page-school-detail.jsx:254` (R29 test 1042) |
| 9 | Delivery Notes sidebar: visible for Manager, hidden for Material Planning | ✅ wired | `shell.jsx:22-24` shared item gated on `role !== 'Material planning'`; `shell.jsx:56` comment + omission for Material Planning branch (R29.5 test) |
| 10 | Create a delivery note: select school + add 3 items + upload 2 photos + Save → audit entry | ✅ wired | Form at `page-delivery-notes.jsx:Tr` (line ~410+); `addDeliveryNote` writes audit entry (R29 test 1056); embeds `<ImageUploader path="delivery-notes/{noteId}" maxCount={10}>` |
| 11 | Settings Storage panel: accurate byte count + image count | ✅ wired | `StorageTab` reads `storage.estimatedBytes()` and `storage.imageCount()` (R29 test 1104). **Caveat:** today only reachable by Managers — see §5. |

All 11 scenarios pass wiring verification. Items 1–5 (R28 map widget) and 6–11
(R29 image / delivery notes / storage) all have direct test coverage in
`vite/e2e.cjs`. Live click-through on the GitHub Pages URL is recommended
before the R30 cutover to confirm runtime behavior matches the wiring.

---

## 5. Spec vs reality gaps

| # | Spec matrix says | Code today does | Severity | Owner action |
|---|---|---|:-:|---|
| 5.1 | Stage Transitions + Top Bottlenecks visible on Manager **AND VP AND Ops Mgr AND Pgm Mgr** | Visible only on VP + Manager (gated on `canViewFinancials`) | 🔴 | Replace `isExec` gate with `canViewSchoolExecutionStages` (or new `canViewStageInsights`) at `pages-r2.jsx:427`. ~5 line change. |
| 5.2 | Settings Storage panel visible only to **Manager + VP** | Visible only to Manager (VP gets `auditLogOnly={true}` Settings) | 🟡 | Either widen `canViewSettings` to include `u-vp`, or render `<StorageTab />` inside the `auditLogOnly` branch alongside `<AuditTab />`. ~10 line change. |
| 5.3 | All other matrix rows | Match | ✅ | — |

Rows confirmed matching: 18-stage rollup, 7-role permissions matrix, Excel
template flow, Audit Log sidebar per role, Cash Flow chart caption, KPI
sparklines + delta chips, R25-styled per-school checkmark table, Map widget
always renders, EditCoordsModal paste flow, Image upload 10 MB rejection +
compression preview + Upload, Delivery Notes hidden for Material Planning,
GitHub remote URL points to MDQEstablishment.

---

## 6. Pre-Supabase readiness

The single most important section. R30 is wiring this client to a Postgres +
Storage backend. This is what needs to be true and what needs to change.

### 6a. State that must carry over

**27 top-level keys live in the in-memory store** (mix of `store.jsx` and
`store-r2.jsx`). Each maps to a candidate Postgres table.

| Store key | Shape | Est. rows from seed | Volatile? |
|---|---|---:|---|
| `projects` | object array | 13 | low |
| `schools` | object array (denormalised stages, photos, materialUsage, deliveryNotes) | 2,800+ | medium — stages mutate constantly |
| `contractors` | object array | 6 | low |
| `users` (PEOPLE) | object array | 15 | low |
| `tasks` (+ embedded `messages[]`) | object array | 26 (+ ~30 msgs) | medium |
| `chats` (per-school messages) | `{schoolId: msg[]}` | 4 seeded | high |
| `notifs` | object array | ~5 live | very high (generated continuously) |
| `escalations` (+ `chain[]`, `history[]`) | object array | 8 | medium |
| `materials`, `materialsCatalog`, `materialUsage` | object arrays | 20 / 45 / 0 | medium |
| `auditLog` | object array, capped 5000 | 110 | high (every mutation) |
| `customFields` | `{entity: field[]}` | ~7 | low |
| `milestoneTemplates`, `milestoneEntries` | object arrays | 4 / 24 | low |
| `financialEntries` | object array | 52 | medium |
| `deliveryNotes` | object array with embedded `items[]`, `photos[]` | 12 | medium |
| `projectCover`, `projectGallery`, `schoolStagePhotos` | image maps | 0–14 k entries possible | medium |
| `stageStatuses`, `lifecycleStages`, `schoolStagesList` | object arrays | 5 / 10 / 18 | low |
| `projectLifecycleState` | `{projectId: stageStatus[]}` | 130 | medium |
| `rolePermissions` | `{role: {feature: bool}}` | 7 × 8 cells | low |
| `themeColors`, `themeLogo` | singletons | 1 | low |
| `notificationTemplates` | `{eventId: tpl}` | 9 | low |
| `stageHistory` | `{schoolId-stageIdx: events[]}` | 0 | high |

### 6b. Mutator call-site stability

**~70 mutators across `store.jsx` + `store-r2.jsx`.**

| Group | Behavior in R30 | Mutators | Risk |
|---|---|---|---|
| ✅ Drop-in (signature unchanged, just impl swap) | Pure `setState`, void return | `updateProject`, `deleteProject`, `updateSchoolStage`, `updateSchoolRemark`, `addSchoolPhoto`, `markNotifRead`, `markAllNotifsRead`, `setSchoolStageStatus`, `addStageStatus`/`update`/`delete`, all `lifecycleStages` setters, all `schoolStagesList` setters, all `customFields` setters, all `milestoneTemplates` setters, `setMilestoneEntry`, all `materials` setters, `addFinancialEntry`/`update`/`delete`, `addMaterial`/`update`/`delete`, `deleteMaterialUsage`, `setProjectCoverFor`, `setProjectGalleryFor`, `setSchoolStagePhotosFor`, `reorderLifecycleStage`, `reorderSchoolStage_` | low |
| ⚠️ Currently sync, becomes async | All callers need `await` (or fire-and-forget pattern preserved with optimistic UI) | `addProject` (returns entity), `addTask` (returns task), `addDeliveryNote`/`update`/`delete`, `addContractor`/`update`/`delete`, `addUser`/`update`, `archiveUser`, `resetUserPassword`, `addEscalation`, `addEscalationComment`, `resolveEscalation`, `escalateFurther`, `toggleProjectLifecycleStage`, `toggleSchoolStage`, `addSchool`/`update`/`delete`, `logAudit`, `logMaterialUsage`, `toggleRolePermission`, `resetRolePermissions`, `updateThemeColor`/`updateThemeLogo`/`resetBranding`, `updateNotificationTemplate`, `sendTaskMessage`, `sendChatMessage`, `pushNotif` | medium — ~30 call sites need `async/await` wrapping |
| ❌ Returns the new entity directly | Supabase returns `{ data, error }` — wrap at API boundary, don't push the wrapper into call sites | `addProject` → `proj`, `addTask` → `task`, `addDeliveryNote` → `note`, `addContractor` → `c`, `addUser` → `{ok, user, tempPassword}`, `addEscalation` → `e`, `logMaterialUsage` → `id`, `addSchool` → `{ok, school?}`, `validateSchool` → `{ok, error?, conflictWith?}` | low IF wrapped at boundary |

**Validators that should stay client-side:** `validateSchool` enforces `id`
uniqueness + meter uniqueness. These should also exist as DB-level UNIQUE
constraints in R30, but keep the client validator for instant feedback (saves a
round-trip on every keystroke in the school-edit form).

### 6c. ImageUploader storage paths

All four call sites use deterministic, S3-friendly paths (no leading slashes,
no spaces, no special chars). Drop-in compatible with Supabase Storage.

| Surface | Path prefix | `maxCount` | Call site |
|---|---|---:|---|
| Project cover | `projects/{projectId}/cover` | 1 | `page-project.jsx:~340` |
| Project gallery | `projects/{projectId}/gallery` | 50 | `page-project.jsx:~458` |
| School stage photos | `projects/{projectId}/schools/{schoolId}/stages/{stageKey}` | 5 | `page-school-detail.jsx:~254` |
| Delivery-note receipts | `delivery-notes/{noteId}` | 10 | `page-delivery-notes.jsx:~402` |

**Recommendation:** create one `photos` bucket in Supabase Storage with public
read for project/school assets and signed URLs for delivery-note receipts (PII
risk on supplier signatures). The current `MemoryImageStorage` adapter exposes
`upload(path, blob, dataUrl, meta) / delete(path) / list(prefix)` — drop-in
mirror of `@supabase/supabase-js`'s `.storage.from(bucket)` surface. One-file
swap.

### 6d. Schema sketch (Postgres)

Tables required, with the columns + indexes that matter most. Full DDL omitted
for brevity — derive from `vite/src/data.jsx` + `vite/src/store-r2.jsx` shapes.

```sql
projects(id PK, tag, name, type, region, city, value NUMERIC(15,2),
         start DATE, target DATE, status, pm_id FK→users,
         contractor_id FK→contractors, progress INT)
  INDEX (pm_id), INDEX (status)

schools(id PK, code UNIQUE, project_id FK→projects ON DELETE CASCADE,
        name_ar, name_en, name, level, gender, region, city,
        coords, meter UNIQUE, account, kw NUMERIC(6,2),
        contractor_id FK→contractors, status,
        last_update_by FK→users, last_update_when TIMESTAMPTZ)
  INDEX (project_id), INDEX (status), INDEX (meter) WHERE meter IS NOT NULL

school_stages(id PK, school_id FK→schools ON DELETE CASCADE,
              stage_key, done BOOL, completed_date DATE,
              completed_by FK→users, status_id DEFAULT 'not-started',
              UNIQUE(school_id, stage_key))
  INDEX (status_id)

contractors(id PK, name, category, cr, license, region,
            schedule INT, quality INT, hse INT, docs INT,
            trend_30d INT, trend_60d INT, trend_90d INT, trend_120d INT)

users(id PK, name, email UNIQUE, role, region, mobile,
      active BOOL, archived BOOL, temp_password, last_login TIMESTAMPTZ)
  INDEX (role), INDEX (active)

tasks(id PK, title, description, assignee_id FK→users ON DELETE CASCADE,
      created_by_id FK→users, created_at, due DATE, priority, status,
      project_id FK→projects ON DELETE CASCADE,
      school_id FK→schools ON DELETE CASCADE, stage_index INT)
  INDEX (assignee_id), INDEX (project_id), INDEX (school_id),
  INDEX (status), INDEX (due)

task_messages(id PK, task_id FK→tasks ON DELETE CASCADE,
              user_id FK→users, text, when TIMESTAMPTZ)
  INDEX (task_id)

school_chats(id PK, school_id FK→schools ON DELETE CASCADE,
             user_id FK→users, text, when TIMESTAMPTZ, mentions TEXT[])
  INDEX (school_id)

notifications(id PK, user_id FK→users ON DELETE CASCADE,
              kind, text, target_kind, target_id,
              when TIMESTAMPTZ DEFAULT now(), read BOOL DEFAULT false)
  INDEX (user_id), INDEX (read)

escalations(id PK, title, reason, urgency, project_id FK, school_id FK,
            task_id FK, from_user_id FK, status,
            currently_with_id FK, to_user_id FK, to_role,
            opened DATE, days_open INT, resolved_date DATE)
  INDEX (status), INDEX (from_user_id), INDEX (to_user_id)

escalation_chain(id PK, escalation_id FK ON DELETE CASCADE,
                 from_user_id FK, to_user_id FK, to_role, when DATE, action)

escalation_history(id PK, escalation_id FK ON DELETE CASCADE,
                   who FK→users, when DATE, action, note)

delivery_notes(id PK, project_id FK, school_id FK ON DELETE CASCADE,
               stage_key, delivery_date DATE, supplier, contractor,
               received_by, signature_data_url, notes, status,
               created_by_id FK→users, created_at, updated_at)
  INDEX (school_id), INDEX (project_id), INDEX (status)

delivery_note_items(id PK, delivery_note_id FK ON DELETE CASCADE,
                    description, quantity NUMERIC, unit, line_order INT)
  -- prefer relational over the current JSONB items[] for filterability

delivery_note_photos(id PK, delivery_note_id FK ON DELETE CASCADE,
                     path UNIQUE, url, bytes INT, width INT, height INT,
                     uploaded_at TIMESTAMPTZ)

school_stage_photos(id PK, school_id FK ON DELETE CASCADE,
                    stage_key, path, url, bytes INT, width INT, height INT,
                    uploaded_at TIMESTAMPTZ,
                    UNIQUE(school_id, stage_key, path))
  INDEX (school_id)

project_photos(id PK, project_id FK ON DELETE CASCADE,
               type CHECK IN ('cover','gallery'), path, url,
               bytes INT, width INT, height INT, uploaded_at TIMESTAMPTZ,
               UNIQUE(project_id, type, path))
  INDEX (project_id)

audit_log(id PK, timestamp TIMESTAMPTZ DEFAULT now(),
          actor_id FK→users, actor_name, actor_role,
          action, entity_type, entity_id, entity_label,
          before TEXT, after TEXT, summary TEXT)
  INDEX (timestamp DESC), INDEX (actor_id), INDEX (entity_type)
```

Plus the settings tables: `stage_statuses`, `lifecycle_stages`,
`school_stages_custom`, `custom_fields`, `materials_catalog`, `materials`,
`material_usage`, `financial_entries`, `milestone_templates`,
`milestone_entries`, `role_permissions(role, feature, allowed PK(role,feature))`,
`branding` (singleton), `notification_templates(event_id PK, subject, body, recipients)`.

**Total: 28 tables.** Three relational normalizations vs the current
in-memory shape: `task_messages`, `delivery_note_items`, `escalation_chain` /
`escalation_history`. (Current code embeds these as arrays inside the parent;
splitting them out matches Postgres idioms and lets RLS apply per-row.)

### 6e. RLS sketch per role

The seven roles map to a JWT claim `role` plus `user_id`. PMs need an extra
JOIN against their `projectIds` allowlist (currently a hardcoded array on
the user record).

| Table | VP | Manager | Ops Mgr | Pgm Mgr | PM | Mat Plan | Coord |
|---|---|---|---|---|---|---|---|
| `projects` | SELECT all; UPDATE/DELETE | SELECT/INSERT/UPDATE all; DELETE | SELECT all; UPDATE assigned | SELECT all; UPDATE assigned | **SELECT WHERE id IN user.projectIds** | SELECT all (read-only) | SELECT all (read-only) |
| `schools` | SELECT all; UPDATE | SELECT/INSERT/UPDATE/DELETE all | SELECT all; UPDATE all | SELECT all; UPDATE assigned | **SELECT WHERE project_id IN user.projectIds**; UPDATE same | SELECT assigned (material flow) | SELECT assigned |
| `school_stages` | SELECT all | SELECT/UPDATE all | SELECT/UPDATE all | SELECT all; UPDATE assigned | SELECT/UPDATE for own schools | SELECT/UPDATE material-related stages | SELECT |
| `tasks` | SELECT all; DELETE | SELECT/INSERT/UPDATE/DELETE all | SELECT all; UPDATE assigned | SELECT assigned + created | **SELECT WHERE assignee_id = auth.uid() OR created_by_id = auth.uid()** | SELECT assigned | SELECT assigned + created |
| `delivery_notes` | SELECT all; DELETE | SELECT/INSERT/UPDATE/DELETE all | SELECT all; UPDATE all | SELECT all; UPDATE assigned | SELECT/INSERT/UPDATE for own schools | **NO ACCESS** (matrix: hidden from sidebar; also block at RLS) | SELECT for own schools; UPDATE status only |
| `contractors` | SELECT all; UPDATE | SELECT/INSERT/UPDATE/DELETE all | SELECT all; UPDATE | SELECT all | SELECT for assigned projects | SELECT for assigned projects | SELECT for assigned projects |
| `users` | SELECT all | SELECT/INSERT/UPDATE all; archive | SELECT all | SELECT all | SELECT all | SELECT all | SELECT all |
| `escalations` | SELECT all; UPDATE/resolve | SELECT all; UPDATE/resolve | SELECT directed to me; UPDATE | SELECT created + team | **SELECT WHERE from_user_id = auth.uid()** | SELECT created | SELECT created |
| `financial_entries` | SELECT all; UPDATE | SELECT/INSERT/UPDATE all | NO ACCESS | NO ACCESS | NO ACCESS | NO ACCESS | NO ACCESS |
| `audit_log` | SELECT all | SELECT all | SELECT all | SELECT all (created by team) | NO ACCESS | NO ACCESS | NO ACCESS |
| `role_permissions` | SELECT all | SELECT/UPDATE (audited) | SELECT only | SELECT only | SELECT only | SELECT only | SELECT only |
| `*_photos` | inherits parent | inherits parent | inherits parent | inherits parent | inherits parent | inherits parent | inherits parent |
| `audit_log` writes | — | INSERT only via Postgres function (no direct INSERT) | same | same | same | same | same |

**Trickiest policies:**

1. **PM project scope.** PMs' `projectIds` is currently a JS array on the user
   record. Make it a join table `user_projects(user_id, project_id)` and
   write RLS as `project_id IN (SELECT project_id FROM user_projects WHERE
   user_id = auth.uid())`. Cascading to schools, tasks, escalations,
   delivery_notes via subquery on `project_id`.

2. **Material Planning vs Delivery Notes.** Sidebar already hides the item;
   add a hard RLS deny on `delivery_notes` for `role = 'material_planning'`
   so a direct URL also bounces. Defense in depth.

3. **Audit log is append-only via SECURITY DEFINER function.** Don't grant
   INSERT directly. Every mutator wraps its work in a Postgres function that
   `INSERT INTO audit_log` as the definer, regardless of caller's role.

### 6f. Migration order

| Phase | Day | Tables | Why this order |
|---|---|---|---|
| 1 | 1–2 | `users`, `role_permissions`, `stage_statuses`, `lifecycle_stages`, `school_stages_custom`, `materials_catalog`, `milestone_templates`, `branding`, `notification_templates` | Reference / settings tables. No FKs depend on business data. Seed and freeze. |
| 2 | 3 | `projects`, `contractors` | Business roots. 13 + 6 rows. FK targets for everything downstream. |
| 3 | 4 | `schools`, `school_stages` | 2,800+ schools, 50,000+ stage rows. Bulk insert from `data-schools.jsx` mapping. Build `(school_id, stage_key)` UNIQUE index. |
| 4 | 5 | `tasks`, `task_messages`, `school_chats`, `escalations`, `escalation_chain`, `escalation_history` | Operational data. Notifications stay client-side for R30 (regenerated on each session). |
| 5 | 6 | `delivery_notes`, `delivery_note_items`, `materials`, `material_usage`, `financial_entries`, `milestone_entries` | Transactional data. Includes new normalised items table for delivery notes. |
| 6 | 7 | `audit_log`, `*_photos` | Cap audit_log at 5,000 rows (matches in-memory cap). Photos start empty; old in-memory entries are not migrated (they only ever lived in the browser). |

**Rollback path.** Each phase ships behind a feature flag (`useSupabase.projects`,
`useSupabase.schools`, …). On the cutover for a given table, run dual-writes
for 24h: both the in-memory store **and** Supabase. Read still hits the
in-memory copy. On day 2, flip reads to Supabase; if median p99 latency stays
under 200 ms and no errors in 4 h, drop the in-memory writes for that table.
On any failure, flip the read flag back — the in-memory copy is still warm.

### 6g. Risks / behavior gaps when swapping

1. **Async mutators break optimistic UI.** Today `addDeliveryNote` returns
   the new note synchronously — the form's success state uses it. After R30,
   the server-assigned `id` arrives in a Promise. Mitigation: client-generated
   UUID (use `crypto.randomUUID()`), then reconcile if server returns a
   different id (it won't if we let the client mint).

2. **Audit log ordering on near-simultaneous writes.** Currently sorted by
   client-side `Date.now()`. In Postgres, two writes in the same ms could
   flip. Use `ORDER BY timestamp DESC, id DESC` and consider `gen_random_uuid()`
   as a tiebreaker.

3. **Derived state (projects.progress) recomputes in selectors.** Today every
   render recomputes from `schools[].stages[]`. With Supabase, this becomes
   an N+1 if naively done. Use a materialized view or trigger that updates
   `projects.progress` on `school_stages` UPDATE. Or use a Supabase RPC
   `get_project_with_progress(p_id)` that does the rollup server-side.

4. **Photo storage isn't transactional with the DB write.** If the blob
   uploads and then the row INSERT fails, you have an orphan. Mitigation:
   write the row first with status `pending_blob`, then upload, then update
   status to `ready`. A nightly job GCs `pending_blob` rows older than 1 h.

5. **Coordinator local-only edits.** Today coords pasted via EditCoordsModal
   are stored in memory only and disappear on reload. With Supabase, every
   edit persists — review whether Coordinators should have UPDATE on
   `schools.coords` (recommendation: yes, with an audit_log entry).

6. **MemoryImageStorage is browser-only.** Today images live in the tab's
   memory. Anyone refreshing loses them. After Supabase Storage wiring,
   they persist — but currently no one in the team has set up offline-queue
   handling, so a flaky network during upload silently drops the photo.
   Mitigation: IndexedDB upload queue with retry, surfaced as a status badge.

7. **Notification persistence.** Currently notifs reset on refresh. Once
   persisted, "unread" badges become permanent until a user clicks them.
   Add a nightly purge of `notifications` older than 30 days.

8. **`addUser` returns `tempPassword` in the response.** That's fine for
   admin-driven user creation in R30, but plan for a R31 step where the
   user's first login forces a password reset.

9. **`window.CONTRACTORS` direct mutation** (`store-r2.jsx:192-250`) — three
   contractor mutators today *also* mutate the `window.CONTRACTORS` global
   for backwards compatibility with pages that read it directly. After R30,
   the global stays as a cached snapshot but the source of truth is
   Supabase. Refactor those pages in R31 to call the hook.

10. **Validation duplicated client + server.** `validateSchool` (unique id,
    unique meter) needs to be backed by Postgres `UNIQUE` constraints —
    don't rely on the client check alone, but keep the client check for UX.

### 6h. What NOT to do in R30

- **No Supabase Realtime subscriptions.** Polling-on-focus is fine. Realtime
  adds debugging complexity (Postgres replication slots, connection limits)
  and we don't yet have a use case that needs sub-second updates.
- **No Edge Functions.** Business logic stays in the client (mutators). Edge
  functions are for things that *can't* run client-side — file conversion,
  email sending. Defer to R31.
- **No OAuth / SAML.** Keep the hardcoded `PEOPLE` seed → `users` table
  with `temp_password`. SSO integration is its own R31+ project.
- **No `pgvector` / full-text search on audit / escalation notes.** Plain
  `ILIKE` is enough for 5,000-row audit log.
- **No batch / bulk endpoints.** R30 is one row at a time. Bulk imports
  (the Excel upload pipeline) become a R31 server-side job.
- **No soft-deletes.** Use hard `DELETE` with `audit_log` capturing the
  `before` JSON. If recovery is ever needed, replay from audit.
- **No realtime collaborative editing.** Last-write-wins is acceptable.
  `updated_at` timestamps let you detect conflicts and warn the user.
- **No signature-pad replacement.** R29 stubbed `signatureDataUrl` as a
  field. Add a real canvas-based signature pad in R31, not now.
- **No server-side PDF generation.** Current `Print/Export PDF` opens a
  print-ready HTML window and uses the browser's Print-to-PDF. Keep that
  for R30; a server-rendered PDF (Puppeteer in an Edge Function) is R31.

---

## Summary

| Metric | Value |
|---|---|
| Code audit findings | **2 🔴**, **1 🟡** (Stage Insights gating, Storage tab reach, false-positive on canEscalateToVP) |
| New tests added | **67** (323 → 390) |
| Suite result | **390 / 0** |
| Per-role behavioral sweep | 7 roles documented, 2 mismatches vs spec (both already in §1 / §5) |
| R28 + R29 e2e scenarios | 11 / 11 wiring-verified (live click-through still recommended) |
| Pre-Supabase tables | 28 (incl. 3 normalisation splits) |
| Async-mutator call sites needing `await` | ~30 |
| Migration plan | 6 phases, 7 days, dual-write rollback per phase |

**Recommendation:** ship the two §1 fixes (Stage Insights gate, Storage tab
reach) as Round 29.6 — they're small enough to land as part of the
pre-Supabase tidy. Then proceed to R30 (Supabase wiring) with the migration
order in §6f.

Awaiting explicit go-ahead before starting R30.
