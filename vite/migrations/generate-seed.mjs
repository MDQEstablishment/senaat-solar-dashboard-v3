#!/usr/bin/env node
// R30 seed generator — patched in R30.1 to match the LIVE schema (queried via
// Supabase MCP after R30.0's first apply failed on profiles.region).
//
// Reads vite/src/data-schools.jsx + data.jsx + data-r2.jsx in the same order
// main.jsx imports them, sandboxed via vm.runInContext. Then emits:
//   - vite/migrations/r30_seed.sql   (idempotent INSERT-ON-CONFLICT script)
//   - vite/migrations/uuid-map.json  (the legacy-id → UUID map for reference)
//
// Run from repo root:
//   node vite/migrations/generate-seed.mjs
//
// Live schema authority: see Round 30.1 operator message. Key deltas from R30.0:
//   profiles.region          → default_regions text[]
//   projects.value           → contract_value
//   projects.pm_id           → assigned_pm_id
//   projects.type            → project_type
//   projects.progress        → overall_progress
//   projects                 + name_ar, currency, schools_count, cover_path, description
//   schools.level + gender   → level_gender
//   schools.meter            → sec_meter
//   schools.account          → account_no
//   schools.contractor       → contractor_name
//   schools.kw               (dropped — no live column)
//   schools.status           → remark (school_remark enum)
//   schools                  + current_stage_key (NULL — derived in-app)
//   contractors              total reshape (company_name, default_regions[], kpi_score)
//   tasks.assignee_id        → assigned_to_id
//   tasks                    drop priority/reason/urgency/escalation_urgency/task_id/stage_index
//   task_messages            id bigserial; user_id→author_id; text→body
//   escalations              from_user_id→raised_by_id; to_role→raised_to_role;
//                            currentlyWith→currently_with_id (+ assigned_to_id);
//                            opened_date→created_at; resolved_date→resolved_at;
//                            reason→description; drop to_user_id + task_id
//   escalation_history       id bigserial; who→from_user_id; when→created_at
//   delivery_notes           signature_data_url→signature_path; rejected→disputed
//   delivery_note_items      id bigserial; line_order→position
//   audit_log                actor_*→user_*; entity_label dropped;
//                            before+after folded into payload jsonb
//   kpis                     OMITTED (live table is KPI DEFINITIONS, not financial
//                            entries — see R30.1 operator note Q4 Option A)
//   app_settings             + updated_by NULL, updated_at NOW()
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
  PEOPLE, PROJECTS, ALL_SCHOOLS, CONTRACTORS, TASKS,
  ESCALATIONS_DEFAULT, AUDIT_LOG_SEED, DELIVERY_NOTES_SEED,
} = W;

console.error(`Loaded: ${PEOPLE.length} people, ${PROJECTS.length} projects, ${ALL_SCHOOLS.length} schools, ${CONTRACTORS.length} contractors, ${ESCALATIONS_DEFAULT.length} escalations, ${AUDIT_LOG_SEED.length} audit entries, ${DELIVERY_NOTES_SEED.length} delivery notes (kpis omitted in R30.1 — see header)`);

// ── SQL emitters ───────────────────────────────────────────────────────────
const lit = (v) => {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : 'NULL';
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
  if (v instanceof Date) return `'${v.toISOString()}'`;
  const s = String(v);
  if (s === '') return 'NULL';
  let tag = 'q';
  while (s.includes('$' + tag + '$')) tag += 'q';
  return `$${tag}$${s}$${tag}$`;
};
const litStr = (v) => {
  // Like lit() but keeps empty strings as '' instead of NULL (for columns where '' is semantically meaningful).
  if (v === null || v === undefined) return 'NULL';
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
const ts   = (d) => {
  if (!d) return 'NULL';
  // Accept either ISO timestamps or YYYY-MM-DD dates (which become midnight UTC).
  const s = String(d);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return `'${s}T00:00:00Z'::timestamptz`;
  const dt = new Date(d);
  return Number.isFinite(dt.getTime()) ? `'${dt.toISOString()}'::timestamptz` : 'NULL';
};
const arr = (xs) => xs && xs.length ? `ARRAY[${xs.map(x => lit(x)).join(',')}]::text[]` : `'{}'::text[]`;
const uuidLit = (legacyId) => {
  const u = uuid(legacyId);
  return u ? `'${u}'::uuid` : 'NULL';
};

// ── Enum mappings (live values from R30.1 operator message Q1) ─────────────
const PROJECT_STATUS = {
  'On Track':'on_track','At Risk':'at_risk','Delayed':'delayed',
  'Complete':'completed','Completed':'completed','On Hold':'on_hold',
};
const TASK_STATUS = {
  'Open':'todo','To Do':'todo','Todo':'todo',
  'In Progress':'in_progress','Blocked':'blocked','Done':'done',
};
const ESC_STATUS = {
  'Open':'open','In Progress':'in_progress','Resolved':'resolved','Closed':'closed',
};
const URGENCY = {
  'Low':'low','Medium':'medium','High':'high','Critical':'critical',
};
const DN_STATUS = {
  'draft':'draft','received':'received','disputed':'disputed',
  'verified':'verified','rejected':'disputed',  // Q3: legacy rejected → disputed
};
const SCHOOL_REMARK = {
  'On Schedule':'active','Ahead':'active',
  'Behind':'delayed','Blocked':'blocked',
  // legacy 'In Progress' (the default) and anything else → 'active'
};
const enumLit = (v, mapping, fallback, enumType) => {
  const mapped = (v && mapping[v]) || fallback;
  return mapped ? `'${mapped}'::${enumType}` : 'NULL';
};

// ── Coords parser (Q6: parse + collapse to "<lat>,<lng>", NULL on failure) ─
function parseCoords(raw) {
  if (raw === null || raw === undefined) return null;
  const s = String(raw).trim();
  if (!s) return null;
  // Strip directional letters (case-insensitive) and squash whitespace.
  const cleaned = s.replace(/[NSEWnsew]/g, '').replace(/\s+/g, ' ').trim();
  // Split on comma or whitespace.
  const parts = cleaned.split(/[\s,]+/).filter(Boolean);
  if (parts.length !== 2) return null;
  const lat = parseFloat(parts[0]);
  const lng = parseFloat(parts[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return `${lat},${lng}`;
}

// ── level_gender concat ────────────────────────────────────────────────────
function levelGender(level, gender) {
  const l = (level || '').trim();
  const g = (gender || '').trim();
  if (l && g) return `${l} / ${g}`;
  if (l) return l;
  if (g) return g;
  return null;
}

// ── Build SQL ──────────────────────────────────────────────────────────────
const out = [];
out.push(`-- R30 SEED — generated ${new Date().toISOString()} by vite/migrations/generate-seed.mjs`);
out.push(`-- Run in Supabase SQL editor (or via psql). Idempotent: ON CONFLICT DO NOTHING.`);
out.push(`-- Counts: ${PEOPLE.length} profiles · ${PROJECTS.length} projects · ${ALL_SCHOOLS.length} schools · ${CONTRACTORS.length} contractors · ${ESCALATIONS_DEFAULT.length} escalations · ${TASKS.length} tasks · ${DELIVERY_NOTES_SEED.length} delivery notes · ${AUDIT_LOG_SEED.length} audit entries · kpis OMITTED (R30.1 Q4-A)`);
out.push(`-- NOTE: profiles.id is FK to auth.users.id. This script inserts profile shells WITHOUT auth.users. To enable login: create matching auth.users rows via Supabase Dashboard → Authentication → Add User, setting User ID to the UUID printed in vite/migrations/uuid-map.json for each user (see README).`);
out.push(``);
out.push(`BEGIN;`);
out.push(``);

// ── profiles ────────────────────────────────────────────────────────────────
out.push(`-- ─── profiles (${PEOPLE.length}) ──────────────────────────────`);
out.push(`INSERT INTO profiles (id, full_name, email, role, mobile, default_regions, archived) VALUES`);
const profileRows = PEOPLE.map(p => {
  const u = uuid(p.id);
  if (!u) throw new Error(`No UUID for user ${p.id}`);
  const role = ROLE_TO_ENUM[p.role];
  if (!role) throw new Error(`Unknown role ${p.role} for ${p.id}`);
  const regions = p.region ? [p.region] : [];
  return `  ('${u}'::uuid, ${litStr(p.name)}, ${litStr(p.email)}, '${role}'::user_role, ${lit(p.mobile)}, ${arr(regions)}, FALSE)`;
});
out.push(profileRows.join(',\n') + `\nON CONFLICT (id) DO NOTHING;`);
out.push(``);

// ── projects ────────────────────────────────────────────────────────────────
// schools_count is computed from ALL_SCHOOLS (Q5).
const schoolsPerProject = new Map();
for (const s of ALL_SCHOOLS) {
  schoolsPerProject.set(s.projectId, (schoolsPerProject.get(s.projectId) || 0) + 1);
}
out.push(`-- ─── projects (${PROJECTS.length}) ──────────────────────────────`);
out.push(`INSERT INTO projects (id, name, name_ar, region, city, contract_value, currency, start_date, target_date, schools_count, assigned_pm_id, project_type, status, overall_progress, cover_path, description) VALUES`);
const projectRows = PROJECTS.map(p => {
  const count = schoolsPerProject.get(p.id) || 0;
  return `  (${litStr(p.id)}, ${litStr(p.name)}, NULL, ${litStr(p.region)}, ${lit(p.city)}, ${p.value || 0}, 'SAR', ${date(p.start)}, ${date(p.target)}, ${count}, ${uuidLit(p.pmId)}, 'school'::project_type, ${enumLit(p.status, PROJECT_STATUS, 'on_track', 'project_status')}, ${p.progress || 0}, NULL, NULL)`;
});
out.push(projectRows.join(',\n') + `\nON CONFLICT (id) DO NOTHING;`);
out.push(``);

// ── contractors ─────────────────────────────────────────────────────────────
out.push(`-- ─── contractors (${CONTRACTORS.length}) ──────────────────────────────`);
out.push(`-- Legacy fields (schedule/quality/hse/docs) collapsed into kpi_score = round(mean, 1).`);
out.push(`-- region → default_regions[]. activeSites/projects/trend dropped (no live columns).`);
out.push(`INSERT INTO contractors (id, company_name, default_regions, kpi_score, archived) VALUES`);
const contractorRows = CONTRACTORS.map(c => {
  const scores = [c.schedule, c.quality, c.hse, c.docs].filter(v => typeof v === 'number');
  const mean = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  const kpiScore = Math.round(mean * 10) / 10;
  const regions = c.region ? [c.region] : [];
  return `  (${litStr(c.id)}, ${litStr(c.name)}, ${arr(regions)}, ${kpiScore}, FALSE)`;
});
out.push(contractorRows.join(',\n') + `\nON CONFLICT (id) DO NOTHING;`);
out.push(``);

// ── schools (large, chunked) ────────────────────────────────────────────────
out.push(`-- ─── schools (${ALL_SCHOOLS.length}) ──────────────────────────────`);
out.push(`-- Schools emitted in chunks of 500 rows. coords parsed to "<lat>,<lng>" or NULL on failure (Q6).`);
let parsedCoords = 0, nulledCoords = 0;
const SCHOOL_CHUNK = 500;
for (let i = 0; i < ALL_SCHOOLS.length; i += SCHOOL_CHUNK) {
  const chunk = ALL_SCHOOLS.slice(i, i + SCHOOL_CHUNK);
  out.push(`INSERT INTO schools (id, project_id, name_en, name_ar, city, region, level_gender, sec_meter, account_no, contractor_name, coords, current_stage_key, remark, stages) VALUES`);
  const rows = chunk.map(s => {
    const coords = parseCoords(s.coords);
    if (coords) parsedCoords++; else if (s.coords) nulledCoords++;
    return `  (${litStr(s.id)}, ${litStr(s.projectId)}, ${lit(s.nameEn)}, ${lit(s.nameAr)}, ${lit(s.city)}, ${lit(s.region)}, ${lit(levelGender(s.level, s.gender))}, ${lit(s.meter)}, ${lit(s.account)}, ${lit(s.contractor)}, ${lit(coords)}, NULL, ${enumLit(s.status, SCHOOL_REMARK, 'active', 'school_remark')}, ${jsonb(s.stages || {})})`;
  });
  out.push(rows.join(',\n') + `\nON CONFLICT (id) DO NOTHING;`);
  out.push(``);
}
console.error(`Schools coords: ${parsedCoords} parsed, ${nulledCoords} unparseable→NULL, ${ALL_SCHOOLS.length - parsedCoords - nulledCoords} originally empty.`);

// ── tasks ───────────────────────────────────────────────────────────────────
out.push(`-- ─── tasks (${TASKS.length}) ──────────────────────────────`);
const tasksWithFk = TASKS.filter(t => t.assigneeId && uuid(t.assigneeId));
out.push(`INSERT INTO tasks (id, title, description, project_id, school_id, assigned_to_id, created_by_id, status, due_date, created_at) VALUES`);
const taskRows = tasksWithFk.map(t => {
  return `  (${litStr(t.id)}, ${litStr(t.title)}, ${lit(t.description)}, ${lit(t.projectId)}, ${lit(t.schoolId)}, ${uuidLit(t.assigneeId)}, ${uuidLit(t.createdById)}, ${enumLit(t.status, TASK_STATUS, 'todo', 'task_status')}, ${date(t.due)}, ${ts(t.createdAt || t.due)})`;
});
out.push(taskRows.join(',\n') + `\nON CONFLICT (id) DO NOTHING;`);
out.push(``);

// ── task_messages (id bigserial — omit from column list) ────────────────────
const tmRows = [];
for (const t of tasksWithFk) {
  for (const m of (t.messages || [])) {
    if (!uuid(m.userId)) continue;
    tmRows.push(`  (${litStr(t.id)}, ${uuidLit(m.userId)}, ${lit(m.text)}, ${ts(m.when)})`);
  }
}
if (tmRows.length) {
  out.push(`-- ─── task_messages (${tmRows.length}) ──────────────────────────────`);
  out.push(`-- Not idempotent on re-run (id is bigserial); safe because TASKS source has no messages today.`);
  out.push(`INSERT INTO task_messages (task_id, author_id, body, created_at) VALUES`);
  out.push(tmRows.join(',\n') + `;`);
  out.push(``);
}

// ── escalations ─────────────────────────────────────────────────────────────
out.push(`-- ─── escalations (${ESCALATIONS_DEFAULT.length}) ──────────────────────────────`);
out.push(`INSERT INTO escalations (id, title, description, project_id, school_id, status, urgency, raised_by_id, raised_to_role, currently_with_id, assigned_to_id, days_open, created_at, resolved_at, updated_at) VALUES`);
const escRows = ESCALATIONS_DEFAULT.map(e => {
  const curWithUuid = e.currentlyWith ? uuid(e.currentlyWith) : null;
  const raisedRole = ROLE_TO_ENUM[e.toRole];
  const raisedRoleLit = raisedRole ? `'${raisedRole}'::user_role` : 'NULL';
  const createdAt = ts(e.opened);
  return `  (${litStr(e.id)}, ${litStr(e.title)}, ${lit(e.reason)}, ${lit(e.projectId)}, ${lit(e.schoolId)}, ${enumLit(e.status, ESC_STATUS, 'open', 'escalation_status')}, ${enumLit(e.urgency, URGENCY, 'medium', 'escalation_urgency')}, ${uuidLit(e.fromUserId)}, ${raisedRoleLit}, ${curWithUuid ? `'${curWithUuid}'::uuid` : 'NULL'}, ${curWithUuid ? `'${curWithUuid}'::uuid` : 'NULL'}, ${e.daysOpen || 0}, ${createdAt}, ${ts(e.resolvedDate)}, ${createdAt})`;
});
out.push(escRows.join(',\n') + `\nON CONFLICT (id) DO NOTHING;`);
out.push(``);

// ── escalation_history (id bigserial — omit from column list) ───────────────
const histRows = [];
for (const e of ESCALATIONS_DEFAULT) {
  for (const h of (e.history || [])) {
    histRows.push(`  (${litStr(e.id)}, ${uuidLit(h.who)}, NULL, ${lit(h.action)}, ${lit(h.note)}, ${ts(h.when)})`);
  }
}
if (histRows.length) {
  out.push(`-- ─── escalation_history (${histRows.length}) ──────────────────────────────`);
  out.push(`-- Not idempotent on re-run (id is bigserial); safe because escalations are seeded once.`);
  out.push(`INSERT INTO escalation_history (escalation_id, from_user_id, to_user_id, action, note, created_at) VALUES`);
  out.push(histRows.join(',\n') + `;`);
  out.push(``);
}

// ── delivery_notes ──────────────────────────────────────────────────────────
out.push(`-- ─── delivery_notes (${DELIVERY_NOTES_SEED.length}) ──────────────────────────────`);
out.push(`-- Legacy 'rejected' status mapped to 'disputed' (Q3).`);
out.push(`INSERT INTO delivery_notes (id, project_id, school_id, stage_key, delivery_date, supplier, contractor, received_by, signature_path, notes, status, created_by_id, created_at, updated_at) VALUES`);
const dnRows = DELIVERY_NOTES_SEED.map(n => {
  const createdAt = ts(n.createdAt);
  return `  (${litStr(n.id)}, ${lit(n.projectId)}, ${lit(n.schoolId)}, ${lit(n.stageKey)}, ${date(n.deliveryDate)}, ${lit(n.supplier)}, ${lit(n.contractor)}, ${lit(n.receivedBy)}, ${lit(n.signatureDataUrl)}, ${lit(n.notes)}, ${enumLit(n.status, DN_STATUS, 'draft', 'delivery_note_status')}, ${uuidLit(n.createdBy)}, ${createdAt}, ${createdAt})`;
});
out.push(dnRows.join(',\n') + `\nON CONFLICT (id) DO NOTHING;`);
out.push(``);

// ── delivery_note_items (id bigserial — omit from column list) ──────────────
const dniRows = [];
for (const n of DELIVERY_NOTES_SEED) {
  (n.items || []).forEach((it, idx) => {
    const qty = (it.quantity == null || it.quantity === '') ? 'NULL' : Number(it.quantity);
    dniRows.push(`  (${litStr(n.id)}, ${lit(it.description)}, ${qty}, ${lit(it.unit)}, ${idx})`);
  });
}
if (dniRows.length) {
  out.push(`-- ─── delivery_note_items (${dniRows.length}) ──────────────────────────────`);
  out.push(`-- Not idempotent on re-run (id is bigserial); rely on idempotency of parent delivery_notes (ON CONFLICT DO NOTHING). Re-running after a successful first apply would create duplicates — manual cleanup required if needed.`);
  out.push(`INSERT INTO delivery_note_items (delivery_note_id, description, quantity, unit, position) VALUES`);
  out.push(dniRows.join(',\n') + `;`);
  out.push(``);
}

// ── audit_log (id bigserial — omit from column list) ────────────────────────
out.push(`-- ─── audit_log (${AUDIT_LOG_SEED.length}) ──────────────────────────────`);
out.push(`-- Append-only in production. before/after folded into payload jsonb. id is bigserial; safe because seed runs once at bootstrap.`);
out.push(`INSERT INTO audit_log (entity_type, entity_id, action, user_id, user_name, user_role, payload, summary, created_at) VALUES`);
const auditRows = AUDIT_LOG_SEED.slice(0, 500).map(a => {
  const actorId = a.actor ? uuid(a.actor.id) : null;
  const role = ROLE_TO_ENUM[a.actor?.role] || a.actor?.role || '';
  const payload = { before: a.before ?? null, after: a.after ?? null, entityLabel: a.entityLabel ?? null };
  return `  (${lit(a.entityType)}, ${lit(a.entityId)}, ${lit(a.action)}, ${actorId ? `'${actorId}'::uuid` : 'NULL'}, ${lit(a.actor?.name)}, ${lit(role)}, ${jsonb(payload)}, ${lit(a.summary)}, ${ts(a.timestamp)})`;
});
out.push(auditRows.join(',\n') + `;`);
out.push(``);

// ── app_settings ────────────────────────────────────────────────────────────
out.push(`-- ─── app_settings ──────────────────────────────`);
out.push(`-- updated_by NULL on seed (no user attribution); updated_at = NOW().`);
out.push(`INSERT INTO app_settings (key, value, updated_by, updated_at) VALUES`);
const settings = [
  ['theme.colors',   { accent: 'gold', darkMode: false }],
  ['theme.logo',     { dataUrl: null, name: null }],
  ['stage.statuses', W.STAGE_STATUSES_DEFAULT || []],
  ['lifecycle.stages', W.LIFECYCLE_STAGES_DEFAULT || []],
  ['custom.fields', W.CUSTOM_FIELDS_DEFAULT || {}],
  ['milestone.templates', W.MILESTONE_TEMPLATES_DEFAULT || []],
];
out.push(settings.map(([k, v]) => `  (${lit(k)}, ${jsonb(v)}, NULL, NOW())`).join(',\n') + `\nON CONFLICT (key) DO NOTHING;`);
out.push(``);

// ── kpis: OMITTED (R30.1 Q4 Option A) ──────────────────────────────────────
out.push(`-- kpis: NO INSERT in R30.1 — live table holds KPI definitions, not financial entries.`);
out.push(`-- 52 legacy FINANCIAL_ENTRIES_DEFAULT rows deferred to R30.2 (separate financial_entries table TBD).`);
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
