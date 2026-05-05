# SENAAT Solar Dashboard — Functional Requirements

**Project:** SENAAT Solar Projects Dashboard
**Owner:** MDQ
**Status:** Prototype built in Claude Design (Rounds 1 & 2). Continuing in Claude Code.
**Last updated:** 2026-05-04

---

## 0. Project context

A multi-program portfolio dashboard for managing solar PV projects across multiple Saudi regions. The system tracks 8 programs covering ~1,600 schools (assume 200 schools per region), each progressing through a 12-stage execution lifecycle. The dashboard serves four roles with distinct views, supports full client-owned configurability, and is intended for client demo before backend integration.

**Programs (8):** Northern Borders, Hail, Al Jouf, Jazan, Najran, King Saud University Campus, Riyadh Industrial Zone Buildings, Yanbu Logistics Hub.

**Total contract value:** ~SAR 2.51B (mock).

---

## 1. Roles and views

The role switcher in the top bar must produce four genuinely distinct, fully populated pages. Switching roles must change the page content visibly.

### 1.1 VP (Executive)
High-level only. No operational detail.

- **Dashboard** — portfolio KPIs only, financial summary, "Escalations Awaiting My Support" panel. No project list. Risk traffic-light card and Status column are explicitly removed at the user's request — VP should not see negative-tone risk indicators.
- **Programs** — clean list of programs only. Click a program → opens program detail with its project list. Click a project → opens project detail (read-only for VP).
- **Escalations** — sidebar item, shows queue of escalations awaiting VP action.

**Escalations Awaiting My Support panel** (VP Dashboard) — each row shows: title/description, originating Program Manager (name + photo), linked project/task, reason for escalation, currently waiting on (person/role), days open. Click row → escalation detail with full comment thread, history, and Resolve button. Pre-populate 4–6 sample escalations.

### 1.2 Program Manager (مدير المشاريع)
Portfolio view across all projects.

- **Dashboard** — portfolio KPIs, escalations I created, contractor performance summary
- **Projects** — list of projects, click → project detail
- **My Escalations** — sidebar, full history of escalations the PM raised
- **My Tasks** — task queue (see §4)
- **[Escalate]** button on any task, stage row, or project header → opens form (reason, urgency, attach context) → submitted escalations appear in VP's panel

### 1.3 Project Manager (مدير المشروع)
Single project deep dive. Must look and behave clearly differently from Program Manager view.

- One project header (contract, scope, dates)
- Full list of 200 schools for that project (see §2)
- Project-level financial detail
- RFIs / NCRs / Submittals for this project only
- Drill into any school → school detail page (see §3)
- [Escalate to VP] button on project header and school detail header

### 1.4 Site Engineer
Daily entry view.

- Today's assigned schools
- Quick stage update form
- Photo upload per stage

---

## 2. Schools list (per project)

Generate 200 mock school records per project (1,600 total) with realistic Saudi school names and cities.

**Columns:**
- School code | School name | City
- 12 execution stage columns, each shown as a checkmark + completion date:
  1. Surveyed
  2. SEC approvals
  3. Initial payment
  4. Final payment
  5. Fix1 delivered
  6. Fix1 installed
  7. Fix2 delivered
  8. Fix2 installed
  9. Energized
  10. COC signed
  11. Handed Over to Zamil
  12. Handed Over to Client
- Remark column — dropdown with these options ONLY: `Excluded | Access issue | Dismantled | Demolished | Closed`
- Last updated by / when

**Features:**
- Search and filter (by stage status, by remark, by city)
- Export to Excel button
- **[+ Add School]** button → form with all fields
- **[Import Schools]** button → upload dialog with downloadable Excel template
- Edit any school inline or via form (contractor, meter number, address, kW, custom fields)
- Delete school (soft-delete with restore in Recycle Bin)
- **Custom Fields:** Settings → Schools → Custom Fields. Client adds any extra field (text / number / date / dropdown / file). Custom fields appear in school create/edit forms and as optional list columns.
- Click any row → opens school detail page

---

## 3. School detail page

- School info (code, name, address, contractor, kW size)
- Stage timeline with date and responsible person per stage
- **Status per stage:** `Not Started | In Progress | Blocked | Done | Skipped` — free transitions in any direction with optional reason note. Status change history (who, when, from-to, reason). Custom statuses can be added in Settings → Statuses.
- Photo evidence per stage (upload button per stage)
- Snag / issue log
- **Right-side chat panel:**
  - PM, Project Engineer, Site Engineer, QA/QC can post messages
  - Typing `@` opens user picker
  - `@mention` sends notification to that user (appears in bell icon)
  - Pre-populate sample chat threads in 3–4 schools

---

## 4. Tasks system

- **[+ Add Task]** button visible on: project detail page, school detail page, any stage row
- **Task fields:** title, description, assignee (user picker), due date, priority, linked school (auto-filled when created from school page), linked stage
- In the Employees section, do NOT show employee list. Show ONLY the user's own tasks (their queue), with overdue tasks highlighted in red.
- Clicking a task opens a side panel with: task details, **[Send message]** and **[Send reminder]** buttons that notify the assignee
- Generate 20–30 mock tasks distributed across projects and users

---

## 5. Notifications (bell icon, top-right)

Shows:
- @mentions in any chat
- Tasks assigned to me
- Task reminders
- Stage status changes for projects/schools I follow
- Escalation updates

Click a notification → jumps to its source page. Pre-populate 5–8 sample notifications.

---

## 6. Project Execution Lifecycle (editable)

The 12 stages are NOT fixed — the client can edit. Place under Settings → Lifecycle and accessible from any lifecycle view.

- **[+ Add Stage]** button
- Edit any stage: name, order, color, completion criteria
- Delete stage with confirmation (soft-delete with restore)
- Drag-and-drop reordering
- Changes apply across all projects/schools using this lifecycle

---

## 7. Materials

- **[+ Add Material]** button
- **[Import Materials]** button with downloadable Excel template
- Edit / soft-delete materials
- Custom Fields support for materials (same pattern as schools)

---

## 8. Contractor Performance — client-defined milestones

Replace any hardcoded scoring. The client must configure their own milestones.

- **Settings → Contractors → Milestone Templates:** client defines milestone name, required fields per milestone (configurable: amount / date / document upload / dropdown / text), and weight in scoring formula
- **Example milestone:** "Payment Received" with fields `{amount paid, date paid, next payment due, document}`
- Per-contractor view: client enters values for each defined milestone over time
- Contractor performance score auto-calculates from milestones using configured weights
- Pre-seed 2–3 sample milestone templates

---

## 9. Financials — entries + auto-rollup

Single source of truth: a financial entries table. All KPIs derive from it.

- **[+ Add Entry]** button creates a financial entry: type (`Invoice | Payment | Receivable | Payable`), project, contractor (optional), amount, date, related stage or milestone, document upload, notes
- Edit / soft-delete entries
- **Auto-rollup rules:**
  - Adding a contractor payment in the Contractor section auto-creates a Financial entry
  - Adding a Financial entry tagged to a contractor shows up in that contractor's record
  - All financial KPIs on Dashboard, Program, and Project pages auto-recompute from the entries table — no separate manual KPI entry
- Each financial KPI has a "Sources" link showing which entries it sums
- Visible UI explanation: "All financial values are computed from the entries below. Add or edit entries to update KPIs."

---

## 10. Cross-cutting principle: client owns and edits everything

Every entity in the system supports:

- **Add** (manual or via Import with Excel template)
- **Edit** (inline or via form)
- **Delete** (soft-delete with restore from Recycle Bin)
- **Custom Fields** (configured in Settings, appear in create/edit forms and as optional columns)
- **Audit log** entries (who/when/what)

**Recycle Bin** — sidebar item. Lists all soft-deleted records grouped by entity type. Restore or permanently delete.

**Hardcoded lists are wrong.** Lifecycles, statuses, contractor scoring milestones, document types, KPIs — all client-configurable.

---

## 11. Mock data manifest

- 8 projects (the 8 named programs)
- 1,600 schools (200 per project) with Saudi school names + cities
- Mixed stage progress: some complete, some in progress, some with Remarks set
- 4–5 mock employees with different roles (so role switcher demonstrates real difference)
- 20–30 mock tasks
- Sample chat threads in 3–4 schools
- 5–8 sample notifications
- 4–6 sample escalations (some open, some resolved)
- 2–3 milestone templates (contractor scoring)
- Financial entries seeded so all KPIs roll up to plausible numbers

---

## 12. Out of scope (handled later)

- Real database (Supabase/Firebase)
- Authentication and SSO
- Real chat persistence
- File storage backend (photos, documents)
- Excel import parsing
- Email notifications
- Mobile-native app

These are post-demo work, after the client signs off on the prototype.
