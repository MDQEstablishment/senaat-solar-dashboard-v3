# SENAAT Solar Dashboard — Handoff to Claude Code

**From:** Claude (Cowork session, 2026-05-04)
**To:** Claude Code
**Project owner:** MDQ
**Workspace:** `C:\Users\alqm8\OneDrive - MDQES\Documents\Claude\Projects\SENAAT`

---

## 0. What this is

The user (MDQ) built a full prototype of the SENAAT Solar Dashboard in **Claude Design** across two iteration rounds. They hit the Claude Design daily usage limit before finishing every requirement. They want **Claude Code to take over from here** — finish the gaps, refactor the prototype into a maintainable structure, and prepare it for client demo, then later for backend integration.

Read `REQUIREMENTS.md` (in this same folder) first — it contains the complete functional spec compiled from both rounds of prompts.

---

## 1. Current state of the prototype

**What exists:**
- A single-file HTML React app rendered at `SENAAT_Solar_Dashboard.html` (downloaded by the user from Claude Design's preview to their **Downloads folder** — they need to move it into this workspace).
- Title: "SENAAT Solar Projects Dashboard"
- Stack: React 18 (CDN), Tailwind (CDN), inline `<script type="text/babel">` blocks. ~1.68 MB single file.
- State management: a custom store named `useStoreR2` backed by mock data in `data-r2.jsx` (inlined as a script block in the HTML).
- Key React patterns observed in the source: `StoreCtx`, `StoreProvider`, `useStore`.
- Sidebar nav (Program Manager view): Dashboard, Projects, My Tasks, **My Escalations**, Materials, Financials, Contractors, Reports, Settings, **Recycle Bin**.

**What Claude Design reported as built (from its own status notes in the session):**

Round 1 (eight role-aware sections wired up end-to-end):
- VP / Executive view — portfolio KPIs, financial health, risk traffic-light, programs table only [risk light to be removed in next pass — see §3]
- Program Manager view — full dashboard, all projects, materials, contractors, financials, reports
- Project Manager view — single-project deep-dive, 200 schools list, project tasks
- Site Engineer view — today's schools with Mark done / Photo / Task buttons
- Schools list (200 per project, 1,600 total) with 12 stage columns, Remarks dropdown, search/filters, CSV export
- School detail page — stage timeline with photo upload + chat panel with @mention picker (4 schools pre-seeded)
- Tasks creation from project header, school header, or any stage row
- My Tasks queue replacing Employees list (overdue highlighted red, Send message / Send reminder / Mark done)
- Notifications bell — live mentions, task assignments, overdue alerts, stage updates, payments — clicking jumps to source

Round 2 additions:
- VP Dashboard now shows Portfolio KPIs, Financial Summary (auto-rolled from financial entries), Escalations Awaiting My Support panel
- Programs is its own page (read-only program list); Escalations sidebar item
- Program Manager: Dashboard ≠ Projects (distinct portfolio dashboard, contractor performance grid auto-scored from milestone entries, My Escalations summary)
- Escalate to VP button in PM header; My Escalations sidebar with full history threads; Recycle Bin sidebar
- Project Manager / Site Engineer: Escalate buttons on project header and school detail header; My Escalations in PM sidebar
- Escalation thread: full activity log (Created → Acknowledged → Comments → Resolved), urgency, days open, currently-with avatar, comment + Resolve actions
- Foundation for editable lifecycle, custom statuses, custom fields, milestone templates, financial entries, soft-delete recycle bin — **wired into the store** (`useStoreR2` backed by `data-r2.jsx` mocks). The Recycle Bin page is wired.

---

## 2. Known gaps (Claude Design did not finish these)

These were promised in the Round 2 prompt but the agent's own closing note said: *"Full Settings UI editors for the rest can be added next round if you want them surfaced."* Translation: the data layer supports them, but the user-facing edit UI is missing for several. Verify each below and complete what's missing.

1. **Settings UI editors not all surfaced:**
   - Lifecycle stage editor (add / edit / delete / reorder stages)
   - Custom status editor (add status types, set colors)
   - Custom Fields editor for Schools
   - Custom Fields editor for Materials
   - Milestone Templates editor for contractor scoring (with field configurator and weight)

2. **Imports:**
   - [Import Schools] button with downloadable Excel template
   - [Import Materials] button with downloadable Excel template

3. **VP Dashboard cleanup:**
   - Confirm the Risk traffic-light card was removed
   - Confirm the Status column was removed from the table

4. **Cross-section auto-rollup:**
   - Verify: a contractor payment added in Contractor section auto-creates a Financial entry
   - Verify: each financial KPI shows a "Sources" link listing the entries it sums
   - Verify: the explanatory UI text is present on the Financials page

5. **Verifier said "checking now" at end of Round 2** — its final pass may not have completed before the limit hit. Run the requirements as a checklist against the actual UI.

---

## 3. Recommended Claude Code work plan

### Phase 1 — Stabilize what exists
1. Open `SENAAT_Solar_Dashboard.html` (after the user moves it into this folder).
2. Read it end-to-end. Identify the React component boundaries — they are likely separated into `<script type="text/babel">` blocks per concern (data, store, header, sidebar, dashboard, projects, schools, school-detail, financials, contractors, materials, tasks, escalations, notifications, settings, recycle-bin).
3. Verify the prototype runs by opening the HTML in a browser. Note any console errors.

### Phase 2 — Refactor to maintainable structure
Recommended structure:
```
SENAAT/
├── index.html                  (boot file: CDN imports + root mount)
├── src/
│   ├── data/
│   │   └── mockData.js         (was data-r2.jsx)
│   ├── store/
│   │   └── useStore.js         (was useStoreR2)
│   ├── components/
│   │   ├── layout/             (header, sidebar, role-switcher)
│   │   ├── common/             (table, modal, dropdown, file-uploader)
│   │   └── chat/               (chat panel, mention picker)
│   ├── pages/
│   │   ├── vp/                 (Dashboard, Programs, ProgramDetail, Escalations)
│   │   ├── pm/                 (Dashboard, Projects, MyEscalations, MyTasks)
│   │   ├── project-manager/    (ProjectDetail, SchoolsList, SchoolDetail)
│   │   ├── site-engineer/      (TodayQueue, StageUpdate)
│   │   ├── financials/
│   │   ├── contractors/
│   │   ├── materials/
│   │   ├── reports/
│   │   ├── settings/           (Lifecycle, Statuses, CustomFields, MilestoneTemplates, Branding, Notifications)
│   │   └── recycle-bin/
│   └── utils/
│       └── excelTemplate.js    (template builders for Import buttons)
├── public/
│   └── (logos, sample images for chat)
├── REQUIREMENTS.md             (already in workspace)
├── HANDOFF.md                  (this file)
└── README.md                   (Claude Code generates after refactor)
```

Use a build setup the user can run locally — Vite + React + TypeScript is the senior-default. Tailwind already in use; keep it.

### Phase 3 — Close the gaps from §2
Implement the missing Settings UI editors and Import buttons. Verify the auto-rollup behavior matches the spec. Wire any visible mismatches.

### Phase 4 — Prepare for client demo
- README explaining how to run locally
- A 5-minute demo script: which role to switch to, which screens to click, what to highlight per role
- A "known limitations" list for the client meeting (no real DB, no real auth, mock data only)

### Phase 5 (later, after client signoff) — Backend integration
- Replace mock store with Supabase or Firebase
- Real authentication with role-based access enforcement
- Real chat with persistence
- File storage for photos and documents
- Excel import parsing (server-side or browser-based with `xlsx` library)
- Email/SMS notifications

The user explicitly stated this phase is **after** they meet the client. Do not jump ahead.

---

## 4. Important context, constraints, and user preferences

- **Language:** the user (MDQ) writes in Gulf Arabic in conversation but wants formal deliverables (UI labels, code comments, documentation, error messages) in English. Internal conversational replies in Arabic. Keep the dashboard UI English-default with clear hooks for bilingual support later.
- **Region:** Saudi Arabia. Saudi school names, Saudi cities, SAR currency, Saudi Building Code references where relevant.
- **Client autonomy is the design philosophy** — the client takes over the system after handover. Hardcoded lists, fixed lifecycles, read-only entities are a design failure. Wherever data appears, the client must be able to add / edit / delete / import / configure.
- **Skill behind this work:** the user invoked the `renewable-energy-pm-advisor` skill. Read it at `C:\Users\alqm8\AppData\Roaming\Claude\local-agent-mode-sessions\skills-plugin\da5093cc-1fd7-42ea-a386-0a6799f7bbe1\69258259-d6ea-470b-b720-0b042e9c4cac\skills\renewable-energy-pm-advisor\SKILL.md` — it has principles you should keep applying (multi-department reality, photos as evidence, closeout starts at kickoff, Saudi context, deliverables wear the client's identity).
- **Branding:** the prototype uses a generic SENAAT-themed palette right now. Before the client meeting, ask MDQ which client this is for so you can apply real brand colors, logo, and typography. Refer to the branding section in the skill's reference library.
- **Demo over polish:** the user prioritizes seeing every feature working over having any feature polished. No empty states. Every button does something. Every link goes somewhere populated.

---

## 5. The exact prompts that were sent to Claude Design

### Round 1 prompt
*Sent on 2026-05-04. Goal: build the role views, schools list, school detail with chat, tasks, notifications.*

```
SENAAT Solar Dashboard — Required Fixes & Additions
This is a client-demo prototype. Build the FULL working UI with rich mock data.
No real backend needed. Do NOT consider the design complete until every section
below is fully implemented end-to-end. No placeholder pages. No empty states.
Every button must do something visible. Every link must open a populated page.

1. ROLE-BASED VIEWS — four genuinely distinct views (VP / Program Manager /
   Project Manager / Site Engineer). The role switcher must actually change
   page content.
2. ALL SCHOOLS LIST under each project — 200 mock schools per project (1,600
   total) with 12 execution stage columns and a Remark dropdown
   (Excluded | Access issue | Dismantled | Demolished | Closed). Search,
   filter, Excel export.
3. SCHOOL DETAIL PAGE — info, timeline, photo evidence, snag log, right-side
   chat panel with @mention and notifications. Pre-populate sample chat
   threads in 3-4 schools.
4. TASKS SYSTEM — [+ Add Task] on project / school / stage. Employees section
   shows ONLY the user's tasks queue (not employee list), overdue red,
   message/reminder buttons.
5. NOTIFICATIONS BELL — @mentions, task assignments, reminders, stage changes.
6. MOCK DATA — 1,600 schools, mixed progress, 4-5 employees with roles, 20-30
   tasks, sample chats, 5-8 notifications.
7. COMPLETION STANDARD — all 4 role views reachable and visibly different;
   school list under every project; school detail with chat works; task
   creation works; Employees section is tasks queue; bell is live.
```

### Round 2 prompt
*Sent on 2026-05-04. Goal: client-owned editability across the system, escalations, lifecycle/status flexibility.*

```
ROUND 2 — Continue from Round 1. Do NOT undo any Round 1 work.

THEME: CLIENT MUST OWN AND EDIT EVERYTHING.
The client takes over after handover. Wherever data is shown, the client must
be able to ADD, EDIT, DELETE (soft-delete with restore), and IMPORT.

A. VP VIEW
   A1. Dashboard ≠ Programs page. Dashboard = high-level KPIs, financial
       summary, Escalations Awaiting My Support panel.
   A2. REMOVE: Risk traffic-light card; Status column from the table.
   A3. ADD: "Escalations Awaiting My Support" panel — title, originating PM,
       linked project/task, reason, currently waiting on, days open, click
       → escalation detail with comment thread + Resolve. Pre-populate 4-6.

B. PROGRAM MANAGER VIEW
   B1. Dashboard ≠ Projects page. Distinct content.
   B2. ESCALATION feature — [Escalate] button on any task / stage / project
       → form (reason, urgency, context) → appears in VP panel. PM has "My
       Escalations" page with status, who it's with, days open.
   B3. Project Execution Lifecycle — make EDITABLE (add/edit/delete/reorder
       stages). Settings → Lifecycle.
   B4. Stage Timeline — flexible status (Not Started / In Progress / Blocked /
       Done / Skipped + custom). Free transitions with reason note. History.
   B5. Schools — full CRUD + Import (Excel template) + Custom Fields in
       Settings → Schools.
   B6. Materials — full CRUD + Import + Custom Fields.
   B7. Contractor Performance — client-defined milestones in Settings →
       Contractors → Milestone Templates. Configurable fields + weights.
       Pre-seed 2-3 templates.
   B8. Financials — entries table with [+ Add Entry], auto-rollup so
       contractor payments auto-create Financial entries and KPIs auto-
       recompute. Each KPI has a "Sources" link.

C. IMPLEMENTATION
   - Mock data only, in-memory CRUD
   - Every list = Add / Edit / Delete / Import buttons
   - Every entity supports Custom Fields in Settings
   - Cross-section data flow visible

D. DO NOT TOUCH the Round 1 work. Only ADD/FIX listed items.
```

---

## 6. First message to send Claude Code

When you start your Claude Code session in this folder, send something like:

> I have a SENAAT Solar Dashboard prototype built in Claude Design that I need to continue here. The full requirements are in `REQUIREMENTS.md`. The current state, what's done, what's missing, and the recommended work plan are in `HANDOFF.md`. Read both, then read `SENAAT_Solar_Dashboard.html` (the prototype) end-to-end, and propose a Phase 1 / Phase 2 plan before changing any code.

That gives Claude Code the context it needs without you having to re-explain anything.
