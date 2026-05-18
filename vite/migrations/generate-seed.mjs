#!/usr/bin/env node
// R30 seed generator.
//
// Reads vite/src/data-schools.jsx + data.jsx + data-r2.jsx in the same order
// main.jsx imports them, sandboxed via vm.runInContext. Then emits:
//   - vite/migrations/r30_seed.sql   (idempotent INSERT-ON-CONFLICT script)
//   - vite/migrations/uuid-map.json  (the legacy-id → UUID map for reference)
//
// Run from repo root:
//   node vite/migrations/generate-seed.mjs
//
// Schema assumed (best-effort from the R30 brief — see vite/migrations/README.md
// for the column-name list and how to adjust if your live schema differs).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = join(__dirname, '..', '..');
const SRC  = join(REPO, 'vite', 'src');
const OUT_SQL = join(__dirname, 'r30_seed.sql');
const OUT_MAP = join(__dirname, 'uuid-map.json');

// Pre-generated stable UUIDs (kept in lock-step with vite/src/lib/db.js USER_UUID).
const USER_UUID = {
  'u-vp':    '4c8e3a5b-7d2f-4b91-8a3c-1f6e9d8c7b5a',
  'u-mgr1':  'a1b2c3d4-e5f6-4789-9abc-def012345678',
  'u-mgr2':  'b2c3d4e5-f6a7-4890-bcde-f01234567890',
  'u-op1':   'c3d4e5f6-a7b8-4901-cdef-012345678901',
  'u-op2':   'd4e5f6a7-b8c9-4012-def0-123456789012',
  'u-pgm':   'e5f6a7b8-c9d0-4123-ef01-234567890123',
  'u-mat':   'f6a7b8c9-d0e1-4234-f012-345678901234',
  'u-coord': '07a8b9c0-d1e2-4345-8012-456789012345',
  'u-pm1':   '18b9c0d1-e2f3-4456-9123-567890123456',
  'u-pm2':   '29c0d1e2-f3a4-4567-a234-678901234567',
  'u-pm3':   '3ad1e2f3-a4b5-4678-b345-789012345678',
  'u-pm4':   '4be2f3a4-b5c6-4789-c456-890123456789',
  'u-pm5':   '5cf3a4b5-c6d7-489a-d567-90123456789a',
  'u-pm6':   '6da4b5c6-d7e8-49ab-e678-a12345678901',
  'u-pm7':   '7eb5c6d7-e8f9-4abc-f789-b23456789012',
};
const uuid = (legacyId) => USER_UUID[legacyId] || null;

const ROLE_TO_ENUM = {
  'VP':                 'vp',
  'Manager':            'manager',
  'Operations Manager': 'operations_manager',
  'Program Manager':    'program_manager',
  'Project Manager':    'project_manager',
  'Material planning':  'material_planning',
  'Coordinator':        'coordinator',
};

// ── Load source files in main.jsx order ────────────────────────────────────
function loadSource(relPath) {
  const text = readFileSync(join(SRC, relPath), 'utf-8');
  // Strip ES imports / exports — vm.runInContext doesn't support ESM syntax.
  return text
    .replace(/^\s*import\s.*?;\s*$/gm, '')
    .replace(/^\s*export\s+/gm, '');
}

const ctx = {
  console,
  window: {},
  React: {
    createElement: () => null,
    Fragment: 'Fragment',
    useState: (v) => [typeof v === 'function' ? v() : v, () => {}],
    useEffect: () => {},
    useMemo:   (f) => f(),
    useRef:    () => ({ current: null }),
    useContext: () => ({}),
    createContext: () => ({}),
  },
  Math: Math, Date, JSON, Array, Object, String, Number, Boolean, RegExp, Error,
  parseInt, parseFloat, isNaN, isFinite, encodeURIComponent, decodeURIComponent,
  setTimeout: () => 0, clearTimeout: () => {},
};
vm.createContext(ctx);

for (const f of ['data-schools.jsx', 'data.jsx', 'data-r2.jsx']) {
  vm.runInContext(loadSource(f), ctx, { filename: f });
}

const W = ctx.window;
const {
  PEOPLE, PROJECTS, ALL_SCHOOLS, CONTRACTORS, MATERIALS_CATALOG, TASKS,
  ESCALATIONS_DEFAULT, AUDIT_LOG_SEED, DELIVERY_NOTES_SEED, FINANCIAL_ENTRIES_DEFAULT,
} = W;

console.error(`Loaded: ${PEOPLE.length} people, ${PROJECTS.length} projects, ${ALL_SCHOOLS.length} schools, ${CONTRACTORS.length} contractors, ${ESCALATIONS_DEFAULT.length} escalations, ${AUDIT_LOG_SEED.length} audit entries, ${DELIVERY_NOTES_SEED.length} delivery notes, ${FINANCIAL_ENTRIES_DEFAULT.length} financial entries`);

// ── SQL emitters ───────────────────────────────────────────────────────────
const lit = (v) => {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : 'NULL';
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
  if (v instanceof Date) return `'${v.toISOString()}'`;
  // strings — dollar-quote with a tag that won't collide
  const s = String(v);
  let tag = 'q';
  while (s.includes('$' + tag + '$')) tag += 'q';
  return `$${tag}$${s}$${tag}$`;
};
const jsonb = (obj) => {
  const s = JSON.stringify(obj);
  let tag = 'j';
  while (s.includes('$' + tag + '$')) tag += 'j';
  return `$${tag}$${s}$${tag}$::jsonb`;
};
const date = (d) => d ? `'${String(d).slice(0,10)}'::date` : 'NULL';
const ts   = (d) => d ? `'${new Date(d).toISOString()}'::timestamptz` : 'NULL';
const arr  = (xs) => xs && xs.length ? `ARRAY[${xs.map(x => lit(x)).join(',')}]` : "'{}'";
const enumv = (v, mapping) => v && mapping[v] ? `'${mapping[v]}'` : 'NULL';

// PROJECT_STATUS enum mapping (in-memory uses spaced names; assume snake_case in DB)
const PROJECT_STATUS = { 'On Track':'on_track','At Risk':'at_risk','Delayed':'delayed','Complete':'complete' };
const PROJECT_TYPE   = { 'School Program':'school_program' };
const URGENCY        = { 'High':'high','Medium':'medium','Low':'low' };
const ESC_STATUS     = { 'Open':'open','Resolved':'resolved','Closed':'closed' };
const TASK_STATUS    = { 'Open':'open','In Progress':'in_progress','Blocked':'blocked','Done':'done' };
const DN_STATUS      = { 'received':'received','disputed':'disputed','draft':'draft','rejected':'rejected' };
const SCHOOL_REMARK  = { 'On Schedule':'on_schedule','Behind':'behind','Blocked':'blocked','Ahead':'ahead' };

// Strip non-Postgres-friendly chars from coords (sometimes "26.37 N" type strings)
const numOrNull = (v) => {
  if (v === null || v === undefined || v === '') return null;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
};

// ── Build SQL ──────────────────────────────────────────────────────────────
const out = [];
out.push(`-- R30 SEED — generated ${new Date().toISOString()} by vite/migrations/generate-seed.mjs`);
out.push(`-- Run in Supabase SQL editor (or via psql). Idempotent: ON CONFLICT DO NOTHING.`);
out.push(`-- Counts: ${PEOPLE.length} profiles · ${PROJECTS.length} projects · ${ALL_SCHOOLS.length} schools · ${CONTRACTORS.length} contractors · ${ESCALATIONS_DEFAULT.length} escalations · ${TASKS.length} tasks · ${DELIVERY_NOTES_SEED.length} delivery notes · ${AUDIT_LOG_SEED.length} audit entries · ${FINANCIAL_ENTRIES_DEFAULT.length} kpi/financial entries`);
out.push(`-- NOTE: profiles.id is FK to auth.users.id. This script inserts profile shells WITHOUT auth.users. To enable login: create matching auth.users rows via Supabase Dashboard → Authentication → Add User, setting User ID to the UUID printed in vite/migrations/uuid-map.json for each user (see README).`);
out.push(``);
out.push(`BEGIN;`);
out.push(``);

// ── profiles ────────────────────────────────────────────────────────────────
out.push(`-- ─── profiles (${PEOPLE.length}) ──────────────────────────────`);
out.push(`INSERT INTO profiles (id, full_name, email, role, region, mobile, archived) VALUES`);
const profileRows = PEOPLE.map(p => {
  const u = uuid(p.id);
  if (!u) throw new Error(`No UUID for user ${p.id}`);
  const role = ROLE_TO_ENUM[p.role];
  if (!role) throw new Error(`Unknown role ${p.role} for ${p.id}`);
  return `  ('${u}'::uuid, ${lit(p.name)}, ${lit(p.email)}, '${role}'::user_role, ${lit(p.region)}, ${lit(p.mobile || '')}, FALSE)`;
});
out.push(profileRows.join(',\n') + `\nON CONFLICT (id) DO NOTHING;`);
out.push(``);

// ── projects ────────────────────────────────────────────────────────────────
out.push(`-- ─── projects (${PROJECTS.length}) ──────────────────────────────`);
out.push(`INSERT INTO projects (id, tag, name, type, region, city, value, start_date, target_date, status, pm_id, progress) VALUES`);
const projectRows = PROJECTS.map(p => {
  const pmId = p.pmId ? uuid(p.pmId) : null;
  return `  (${lit(p.id)}, ${lit(p.tag)}, ${lit(p.name)}, ${enumv(p.type, PROJECT_TYPE)}::project_type, ${lit(p.region)}, ${lit(p.city)}, ${p.value || 0}, ${date(p.start)}, ${date(p.target)}, ${enumv(p.status, PROJECT_STATUS)}::project_status, ${pmId ? `'${pmId}'::uuid` : 'NULL'}, ${p.progress || 0})`;
});
out.push(projectRows.join(',\n') + `\nON CONFLICT (id) DO NOTHING;`);
out.push(``);

// ── contractors ─────────────────────────────────────────────────────────────
out.push(`-- ─── contractors (${CONTRACTORS.length}) ──────────────────────────────`);
out.push(`INSERT INTO contractors (id, name, region, schedule, quality, hse, docs, active_sites, projects, trend) VALUES`);
const contractorRows = CONTRACTORS.map(c => {
  return `  (${lit(c.id)}, ${lit(c.name)}, ${lit(c.region)}, ${c.schedule || 0}, ${c.quality || 0}, ${c.hse || 0}, ${c.docs || 0}, ${c.activeSites || 0}, ${arr(c.projects || [])}, ${arr(c.trend || [])})`;
});
out.push(contractorRows.join(',\n') + `\nON CONFLICT (id) DO NOTHING;`);
out.push(``);

// ── schools (large) ─────────────────────────────────────────────────────────
out.push(`-- ─── schools (${ALL_SCHOOLS.length}) ──────────────────────────────`);
out.push(`-- Schools are emitted in chunks of 500 rows to stay within Postgres statement limits.`);

const SCHOOL_CHUNK = 500;
for (let i = 0; i < ALL_SCHOOLS.length; i += SCHOOL_CHUNK) {
  const chunk = ALL_SCHOOLS.slice(i, i + SCHOOL_CHUNK);
  out.push(`INSERT INTO schools (id, project_id, name_ar, name_en, level, gender, region, city, coords, meter, account, kw, contractor, status, stages) VALUES`);
  const rows = chunk.map(s => {
    const kw = numOrNull(s.kw);
    return `  (${lit(s.id)}, ${lit(s.projectId)}, ${lit(s.nameAr || '')}, ${lit(s.nameEn || '')}, ${lit(s.level || '')}, ${lit(s.gender || '')}, ${lit(s.region || '')}, ${lit(s.city || '')}, ${lit(s.coords || '')}, ${lit(s.meter || '')}, ${lit(s.account || '')}, ${kw == null ? 'NULL' : kw}, ${lit(s.contractor || '')}, ${lit(s.status || 'In Progress')}, ${jsonb(s.stages || {})})`;
  });
  out.push(rows.join(',\n') + `\nON CONFLICT (id) DO NOTHING;`);
  out.push(``);
}

// ── tasks ───────────────────────────────────────────────────────────────────
out.push(`-- ─── tasks (${TASKS.length}) ──────────────────────────────`);
const tasksWithFk = TASKS.filter(t => t.assigneeId && uuid(t.assigneeId));
out.push(`INSERT INTO tasks (id, title, description, assignee_id, created_by_id, created_at, due_date, priority, status, project_id, school_id, stage_index) VALUES`);
const taskRows = tasksWithFk.map(t => {
  return `  (${lit(t.id)}, ${lit(t.title)}, ${lit(t.description || '')}, '${uuid(t.assigneeId)}'::uuid, ${t.createdById && uuid(t.createdById) ? `'${uuid(t.createdById)}'::uuid` : 'NULL'}, ${ts(t.createdAt || t.due)}, ${date(t.due)}, ${lit(t.priority || 'Medium')}, ${enumv(t.status || 'Open', TASK_STATUS)}::task_status, ${t.projectId ? lit(t.projectId) : 'NULL'}, ${t.schoolId ? lit(t.schoolId) : 'NULL'}, ${t.stageIndex == null ? 'NULL' : t.stageIndex})`;
});
out.push(taskRows.join(',\n') + `\nON CONFLICT (id) DO NOTHING;`);
out.push(``);

// task_messages (embedded in TASKS[].messages[])
let tmCount = 0;
const tmRows = [];
for (const t of tasksWithFk) {
  for (const m of (t.messages || [])) {
    if (!uuid(m.userId)) continue;
    tmRows.push(`  ('tm-${t.id}-${++tmCount}', ${lit(t.id)}, '${uuid(m.userId)}'::uuid, ${lit(m.text || '')}, ${ts(m.when)})`);
  }
}
if (tmRows.length) {
  out.push(`-- ─── task_messages (${tmRows.length}) ──────────────────────────────`);
  out.push(`INSERT INTO task_messages (id, task_id, user_id, text, created_at) VALUES`);
  out.push(tmRows.join(',\n') + `\nON CONFLICT (id) DO NOTHING;`);
  out.push(``);
}

// ── escalations + escalation_history ────────────────────────────────────────
out.push(`-- ─── escalations (${ESCALATIONS_DEFAULT.length}) ──────────────────────────────`);
out.push(`INSERT INTO escalations (id, title, reason, urgency, status, project_id, school_id, task_id, from_user_id, to_user_id, to_role, currently_with, opened_date, days_open, resolved_date) VALUES`);
const escRows = ESCALATIONS_DEFAULT.map(e => {
  const fromU = uuid(e.fromUserId);
  const toU   = uuid(e.toUserId);
  const curU  = e.currentlyWith ? uuid(e.currentlyWith) : null;
  return `  (${lit(e.id)}, ${lit(e.title)}, ${lit(e.reason || '')}, ${enumv(e.urgency, URGENCY)}::escalation_urgency, ${enumv(e.status, ESC_STATUS)}::escalation_status, ${e.projectId ? lit(e.projectId) : 'NULL'}, ${e.schoolId ? lit(e.schoolId) : 'NULL'}, ${e.taskId ? lit(e.taskId) : 'NULL'}, ${fromU ? `'${fromU}'::uuid` : 'NULL'}, ${toU ? `'${toU}'::uuid` : 'NULL'}, ${lit(e.toRole || '')}, ${curU ? `'${curU}'::uuid` : 'NULL'}, ${date(e.opened)}, ${e.daysOpen || 0}, ${date(e.resolvedDate)})`;
});
out.push(escRows.join(',\n') + `\nON CONFLICT (id) DO NOTHING;`);
out.push(``);

const histRows = [];
let hCount = 0;
for (const e of ESCALATIONS_DEFAULT) {
  for (const h of (e.history || [])) {
    histRows.push(`  ('eh-${e.id}-${++hCount}', ${lit(e.id)}, ${uuid(h.who) ? `'${uuid(h.who)}'::uuid` : 'NULL'}, ${date(h.when)}, ${lit(h.action || '')}, ${lit(h.note || '')})`);
  }
}
if (histRows.length) {
  out.push(`-- ─── escalation_history (${histRows.length}) ──────────────────────────────`);
  out.push(`INSERT INTO escalation_history (id, escalation_id, who, when_date, action, note) VALUES`);
  out.push(histRows.join(',\n') + `\nON CONFLICT (id) DO NOTHING;`);
  out.push(``);
}

// ── delivery_notes + items ──────────────────────────────────────────────────
out.push(`-- ─── delivery_notes (${DELIVERY_NOTES_SEED.length}) ──────────────────────────────`);
out.push(`INSERT INTO delivery_notes (id, project_id, school_id, stage_key, delivery_date, supplier, contractor, received_by, signature_data_url, notes, status, created_by_id, created_at) VALUES`);
const dnRows = DELIVERY_NOTES_SEED.map(n => {
  const by = n.createdBy ? uuid(n.createdBy) : null;
  return `  (${lit(n.id)}, ${n.projectId ? lit(n.projectId) : 'NULL'}, ${n.schoolId ? lit(n.schoolId) : 'NULL'}, ${lit(n.stageKey || '')}, ${date(n.deliveryDate)}, ${lit(n.supplier || '')}, ${lit(n.contractor || '')}, ${lit(n.receivedBy || '')}, ${lit(n.signatureDataUrl)}, ${lit(n.notes || '')}, ${enumv(n.status, DN_STATUS)}::delivery_note_status, ${by ? `'${by}'::uuid` : 'NULL'}, ${ts(n.createdAt)})`;
});
out.push(dnRows.join(',\n') + `\nON CONFLICT (id) DO NOTHING;`);
out.push(``);

const dniRows = [];
let dniCount = 0;
for (const n of DELIVERY_NOTES_SEED) {
  (n.items || []).forEach((it, idx) => {
    dniRows.push(`  ('${n.id}-i${++dniCount}', ${lit(n.id)}, ${lit(it.description || '')}, ${it.quantity == null || it.quantity === '' ? 'NULL' : Number(it.quantity)}, ${lit(it.unit || '')}, ${idx})`);
  });
}
if (dniRows.length) {
  out.push(`-- ─── delivery_note_items (${dniRows.length}) ──────────────────────────────`);
  out.push(`INSERT INTO delivery_note_items (id, delivery_note_id, description, quantity, unit, line_order) VALUES`);
  out.push(dniRows.join(',\n') + `\nON CONFLICT (id) DO NOTHING;`);
  out.push(``);
}

// ── kpis (financial entries) ────────────────────────────────────────────────
out.push(`-- ─── kpis / financial_entries (${FINANCIAL_ENTRIES_DEFAULT.length}) ──────────────────────────────`);
out.push(`-- The "kpis" table in the R30 schema rolls up both project KPIs and financial entries.`);
out.push(`-- We seed each FINANCIAL_ENTRIES_DEFAULT row as a kpi of type='financial_entry'.`);
out.push(`INSERT INTO kpis (id, type, project_id, amount, kpi_date, related_milestone, notes, document_path) VALUES`);
const kpiRows = FINANCIAL_ENTRIES_DEFAULT.map(fe => {
  return `  (${lit(fe.id)}, ${lit(fe.type)}, ${lit(fe.projectId)}, ${fe.amount || 0}, ${date(fe.date)}, ${lit(fe.relatedMilestone || '')}, ${lit(fe.notes || '')}, ${lit(fe.document || null)})`;
});
out.push(kpiRows.join(',\n') + `\nON CONFLICT (id) DO NOTHING;`);
out.push(``);

// ── audit_log ───────────────────────────────────────────────────────────────
out.push(`-- ─── audit_log (${AUDIT_LOG_SEED.length}) ──────────────────────────────`);
out.push(`-- Append-only in production (no UPDATE/DELETE policies). ON CONFLICT keeps re-runs safe.`);
out.push(`INSERT INTO audit_log (id, timestamp, actor_id, actor_name, actor_role, action, entity_type, entity_id, entity_label, before_state, after_state, summary) VALUES`);
const auditRows = AUDIT_LOG_SEED.slice(0, 500).map((a, i) => {  // cap at 500 — the seed pads to ~100 anyway
  const actorId = a.actor ? uuid(a.actor.id) : null;
  return `  (${lit(a.id || ('au-seed-' + i))}, ${ts(a.timestamp)}, ${actorId ? `'${actorId}'::uuid` : 'NULL'}, ${lit(a.actor?.name || '')}, ${lit(ROLE_TO_ENUM[a.actor?.role] || a.actor?.role || '')}, ${lit(a.action || '')}, ${lit(a.entityType || '')}, ${lit(a.entityId || '')}, ${lit(a.entityLabel || '')}, ${lit(a.before || null)}, ${lit(a.after || null)}, ${lit(a.summary || '')})`;
});
out.push(auditRows.join(',\n') + `\nON CONFLICT (id) DO NOTHING;`);
out.push(``);

// ── app_settings ────────────────────────────────────────────────────────────
out.push(`-- ─── app_settings (singleton key/value config) ──────────────────────────────`);
out.push(`-- Theme + notification templates + role permissions live as JSONB values keyed by name.`);
out.push(`INSERT INTO app_settings (key, value) VALUES`);
const settings = [
  ['theme.colors',   { accent: 'gold', darkMode: false }],
  ['theme.logo',     { dataUrl: null, name: null }],
  ['stage.statuses', W.STAGE_STATUSES_DEFAULT || []],
  ['lifecycle.stages', W.LIFECYCLE_STAGES_DEFAULT || []],
  ['custom.fields', W.CUSTOM_FIELDS_DEFAULT || {}],
  ['milestone.templates', W.MILESTONE_TEMPLATES_DEFAULT || []],
];
out.push(settings.map(([k, v]) => `  (${lit(k)}, ${jsonb(v)})`).join(',\n') + `\nON CONFLICT (key) DO NOTHING;`);
out.push(``);

out.push(`COMMIT;`);
out.push(``);
out.push(`-- ── End of R30 seed ──────────────────────────────────────────────`);

// ── Write outputs ──────────────────────────────────────────────────────────
mkdirSync(dirname(OUT_SQL), { recursive: true });
writeFileSync(OUT_SQL, out.join('\n'), 'utf-8');
writeFileSync(OUT_MAP, JSON.stringify({
  generatedAt: new Date().toISOString(),
  users: PEOPLE.map(p => ({ legacyId: p.id, uuid: uuid(p.id), name: p.name, email: p.email, role: p.role, roleEnum: ROLE_TO_ENUM[p.role] })),
}, null, 2), 'utf-8');

console.error(`Wrote ${OUT_SQL} (${out.join('\n').length.toLocaleString()} chars)`);
console.error(`Wrote ${OUT_MAP}`);
