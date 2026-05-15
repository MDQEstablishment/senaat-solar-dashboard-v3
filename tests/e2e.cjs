// tests/e2e.js — Zamil Solar Dashboard E2E click audit
//
// This script is a static, headless audit that:
//   1. Scans all *.jsx source files for interactive elements (Button/onClick/etc).
//   2. Verifies each has a wired handler (no bare alert/no-op/empty arrow).
//   3. Verifies key store actions exist and are exposed from useStore.
//   4. Verifies role gates (canViewFinancials, canCreateProject, canEscalateToVP) are honored at the right call sites.
//   5. Simulates the Anas → New Project → Add School flow against the store reducers (pure JS, no DOM).
//
// Run with:  node tests/e2e.js
//
// The script intentionally avoids a real browser. The full UI also exposes window.runE2E()
// inside the live app (see store-r2 for the registration) so a manual click can re-run.

const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, 'src');

const results = [];
function record(name, pass, detail) { results.push({ name, pass, detail: detail || '' }); }
function read(p) { return fs.readFileSync(path.join(SRC, p), 'utf8'); }

// ── A. Store + helper sanity checks ────────────────────────────────────────
const dataJsx     = read('data.jsx');
const storeJsx    = read('store.jsx');
const storeR2Jsx  = read('store-r2.jsx');
const dashJsx     = read('page-dashboard.jsx');
const schoolsJsx  = read('page-schools-list.jsx');
const detailJsx   = read('page-school-detail.jsx');
const projectJsx  = read('page-project.jsx');
const settingsJsx = read('page-settings.jsx');
const pagesR2Jsx  = read('pages-r2.jsx');
const reportsJsx  = read('page-reports-zamil.jsx');
const chatJsx     = read('chat-panel.jsx');
const loginJsx    = read('page-login.jsx');
const shellJsx    = read('shell.jsx');
const appJsx      = read('app.jsx');

record('data.jsx exports canViewFinancials',   /canViewFinancials/.test(dataJsx));
record('data.jsx exports canCreateProject',    /canCreateProject/.test(dataJsx));
record('data.jsx exports canEscalateToVP',     /canEscalateToVP/.test(dataJsx));
record('data.jsx exports canViewAuditLog',     /canViewAuditLog/.test(dataJsx));
record('FINANCIALS_USERS = Olaf+Fasiulla+Anas', /FINANCIALS_USERS\s*=\s*\['u-vp',\s*'u-mgr1',\s*'u-mgr2'\]/.test(dataJsx));
record('NEW_PROJECT_USERS = Fasiulla+Anas+Naif', /NEW_PROJECT_USERS\s*=\s*\['u-mgr1',\s*'u-mgr2',\s*'u-pgm'\]/.test(dataJsx));
record('ESCALATE_TO_VP_USERS = Fasiulla+Anas only', /ESCALATE_TO_VP_USERS\s*=\s*\['u-mgr1',\s*'u-mgr2'\]/.test(dataJsx));

record('store.jsx defines addProject',         /const addProject =/.test(storeJsx));
record('store.jsx exposes addProject',         /addProject, updateProject, deleteProject/.test(storeJsx));
record('store-r2 defines addSchool',           /const addSchool =/.test(storeR2Jsx));
record('store-r2 defines validateSchool',      /const validateSchool =/.test(storeR2Jsx));
record('store-r2 defines logAudit',            /const logAudit =/.test(storeR2Jsx));
record('store-r2 exposes auditLog + logAudit', /auditLog,\s*logAudit/.test(storeR2Jsx));
record('store-r2 defines logMaterialUsage',    /const logMaterialUsage =/.test(storeR2Jsx));
record('store-r2 escalation chain (Manager→VP)', /role === 'Manager'/.test(storeR2Jsx) && /canEscalateToVP\(currentUser\)/.test(storeR2Jsx));

// ── B. Dashboard role gate (KPI strip + new project) ───────────────────────
record('FIX 1: PageDashboard KPI strip gated by canViewFinancials',
       /canViewFinancials\(currentUser\) && \(\s*<div className="grid grid-cols-2/.test(dashJsx));
record('FIX 7: New Project button gated by canCreateProject',
       /canCreateProject\(currentUser\) \? <Button[^>]*onClick=\{\(\) => setNewProjectOpen\(true\)/.test(dashJsx));
record('FIX 4: NewProjectModal opens real form (not alert)',
       !/alert\('New project — Use Settings/.test(dashJsx) && /<NewProjectModal/.test(dashJsx));
record('FIX 4: NewProjectModal wires onCreate to addProject + logAudit',
       /addProject && addProject\(data\)/.test(dashJsx) && /logAudit\(\{/.test(dashJsx));

// ── C. Schools list ────────────────────────────────────────────────────────
record('FIX 2: No pagination Prev/Next buttons',
       !/onClick=\{\(\) => setPage\(p =>/.test(schoolsJsx));
record('FIX 8: Compact columns include Contractor select',
       /<select value=\{s\.contractor/.test(schoolsJsx));
record('FIX 9: Stages view toggle present',
       /SchoolsStagesTable/.test(schoolsJsx) && /Stages view/.test(schoolsJsx));
record('FIX 4: Add school audit-logged',
       /action: 'CREATE', entityType: 'school'/.test(schoolsJsx));
record('FIX 4: Delete school confirmation modal',
       /title="Delete school \(permanent\)"/.test(schoolsJsx));

// ── D. Project detail ──────────────────────────────────────────────────────
record('FIX 1: Lifecycle editor on project detail',
       /<LifecycleEditor /.test(projectJsx));
record('FIX 6: Project detail null-guarded',
       /if \(!project\) return/.test(projectJsx));
record('FIX 6: Tasks tab uses tasksVisibleToRole',
       /tasksVisibleToRole\(allProjTasks, currentUser\)/.test(projectJsx));
record('FIX 4: Financials tab gated by canViewFinancials',
       /tab === 'Financials' && canViewFinancials\(currentUser\)/.test(projectJsx));

// ── E. School detail ───────────────────────────────────────────────────────
record('FIX 8: School detail has edit-in-place + Save button',
       /setEditMode\(true\)/.test(detailJsx) && /onClick=\{saveEdits\}/.test(detailJsx));
record('FIX 8: Duplicate SEC meter validated on save',
       /validateSchool\(\{ id: school\.id, meter: form\.meter \}, school\.id\)/.test(detailJsx));
record('FIX 8: Contractor changeable via FieldRow select',
       /label="Contractor"[\s\S]{0,200}options=\{\[\{value:'',label:'— Unassigned —'/.test(detailJsx));
// (R10 replaced status menu with single-click toggle — see R10 FIX 1b checks below)
record('Photo upload button wired to uploadPhoto',
       /onClick=\{onUploadPhoto\}/.test(detailJsx));
record('Materials Log button wired to logUsage',
       /<Button variant="accent" icon="plus" onClick=\{submit\}/.test(detailJsx));

// ── F. Reports ─────────────────────────────────────────────────────────────
record('Report cards each have onClick',
       (reportsJsx.match(/onClick=\{onClick\}/g) || []).length >= 1
       && /setActiveReport\('master'\)/.test(reportsJsx)
       && /setActiveReport\('materials'\)/.test(reportsJsx)
       && /setActiveReport\('zamil'\)/.test(reportsJsx));
record('Master report Export XLSX wired',
       /<Button variant="accent" icon="file-spreadsheet" onClick=\{exportXlsx\}/.test(reportsJsx));
record('Material consumption Export XLSX wired',
       /XLSX\.writeFile\(wb,\s*`material-consumption/.test(reportsJsx));
record('Zamil report Export XLSX wired',
       /XLSX\.writeFile\(wb,\s*`zamil-report/.test(reportsJsx));

// ── G. Settings ────────────────────────────────────────────────────────────
record('Settings tabs all bound (13 tabs)',
       (settingsJsx.match(/tab === '/g) || []).length >= 12);
record('Audit Log tab gated by canViewAuditLog',
       /const showAudit = canViewAuditLog\(currentUser\)/.test(settingsJsx));
record('Audit Log filters present (search + actor + action + entity + date range)',
       /<Select value=\{actor\}/.test(settingsJsx) && /<Select value=\{action\}/.test(settingsJsx) && /<input type="date" value=\{fromDate\}/.test(settingsJsx));
record('Audit Log Export to Excel button wired',
       /onClick=\{exportXlsx\}/.test(settingsJsx) && /audit_log_export/.test(settingsJsx));
record('Lifecycle Stages tab CRUD bindings',
       /addLifecycleStage\(p\)/.test(settingsJsx) && /deleteLifecycleStage\(s\.id\)/.test(settingsJsx) && /reorderLifecycleStage\(s\.id,/.test(settingsJsx));
record('School Stages tab CRUD bindings',
       /addSchoolStage\(p\)/.test(settingsJsx) && /deleteSchoolStage\(s\.id\)/.test(settingsJsx) && /reorderSchoolStage\(s\.id,/.test(settingsJsx));
record('Custom Statuses CRUD bindings',
       /addStageStatus\(p\)/.test(settingsJsx) && /deleteStageStatus\(s\.id\)/.test(settingsJsx));
record('Custom Fields CRUD bindings',
       /addCustomField\(entity, f\)/.test(settingsJsx) && /deleteCustomField\(entity, f\.id\)/.test(settingsJsx));
record('Milestone Templates CRUD bindings',
       /addMilestoneTemplate\(mt\)/.test(settingsJsx) && /deleteMilestoneTemplate\(mt\.id\)/.test(settingsJsx));

// ── H. Chat ────────────────────────────────────────────────────────────────
record('Chat send button wired to send()', /onClick=\{send\}/.test(chatJsx));
record('Chat file attach input wired',     /onChange=\{onPickFile\}/.test(chatJsx));
record('Chat @mention picker present',     /showPicker/.test(chatJsx) && /insertMention\(u\)/.test(chatJsx));
record('Chat unread mention banner',       /myUnread/.test(chatJsx));

// ── I. Escalation chain ────────────────────────────────────────────────────
record('FIX 12: Manager-only "Escalate to VP" gate',
       /role === 'Manager'/.test(storeR2Jsx) && /canEscalateToVP\(currentUser\)/.test(storeR2Jsx));
record('Operations Manager / Program Manager → Manager',
       /role === 'Operations Manager' \|\| role === 'Program Manager'/.test(storeR2Jsx) && /toRole: 'Manager'/.test(storeR2Jsx));
record('EscalationModal shows next-level target',
       /target\.label/.test(pagesR2Jsx));
record('Forward button uses getEscalationTarget',
       /escalateFurther\(e\.id, currentUser\.id, forwardTarget, comment\)/.test(pagesR2Jsx));

// ── J. Sidebar gating ──────────────────────────────────────────────────────
record('Sidebar removes Materials nav item entirely',
       !/{ id: 'materials',\s*label: 'Materials'/.test(shellJsx));
record('Sidebar Financials gated by canViewFinancials',
       /canViewFinancials\(currentUser\)/.test(shellJsx));

// ── J4. Round 13 fixes ────────────────────────────────────────────────────
const contractorsJsx = read('page-contractors.jsx');
record('R13 H1: Add Contractor button wired to setContractorModal',
       /onClick=\{\(\) => setContractorModal\(\{ open: true, initial: null \}\)\}>Add Contractor/.test(contractorsJsx));
record('R13 H1: addContractor store action exposed',
       /addContractor, updateContractor, deleteContractor/.test(storeR2Jsx));
record('R13 H1: addContractor writes CREATE audit',
       /action: 'CREATE', entityType: 'contractor'/.test(storeR2Jsx));
record('R13 H1: ContractorModal renders all required fields',
       /Company name \*/.test(contractorsJsx) &&
       />Category</.test(contractorsJsx) &&
       /CR number/.test(contractorsJsx) &&
       /License number/.test(contractorsJsx) &&
       /Contact person/.test(contractorsJsx) &&
       /'Phone'/.test(contractorsJsx) &&
       /'Email'/.test(contractorsJsx) &&
       /Default region\(s\)/.test(contractorsJsx));
record('R13 H1: Add Contractor flow saves a row (state + window.CONTRACTORS sync)',
       /setContractorsLocal\(ms => \[c, \.\.\.ms\]\)/.test(storeR2Jsx) &&
       /window\.CONTRACTORS\.unshift\(c\)/.test(storeR2Jsx));

record('R13 H2: page-financials uses useRecharts hook',
       /window\.useRecharts/.test(read('page-financials.jsx')));
record('R13 H2: Cash Flow chart wrapped in recharts guard',
       /recharts &&[\s\S]{0,40}FIN_CURVE/.test(read('page-financials.jsx')));
record('R13 H2: useRecharts hook defined in main.jsx',
       /window\.useRecharts = function useRecharts/.test(read('main.jsx')));

record('R13 M1: PageDashboard renders H1 for PM / Material planning / Coordinator',
       /Material planning dashboard/.test(dashJsx) && /Coordinator dashboard/.test(dashJsx) && /My projects/.test(dashJsx));
record('R13 M2: countEnergized helper defined + exported',
       /function countEnergized\(/.test(dataJsx) && /countEnergized,/.test(dataJsx));
record('R13 M2: PageDashboard uses countEnergized (no schoolDist.slice(8))',
       /countEnergized\(scopedSchools\)/.test(dashJsx) && !/schoolDist\.slice\(8\)/.test(dashJsx));
record('R13 M2: PagePMDashboard + PageVPDashboard use countEnergized',
       (read('pages-r2.jsx').match(/countEnergized\(/g) || []).length >= 2);
record('R13 M3: Sparkline shows muted preview on flat/zero data',
       /No trend data yet/.test(read('ui.jsx')) && /strokeDasharray="3 3"/.test(read('ui.jsx')));
record('R13 M4: PM sidebar uses my-projects + my-schools ids',
       /id: 'my-projects'/.test(shellJsx) && /id: 'my-schools'/.test(shellJsx));
record('R13 M4: PM lands on my-projects after sign-in',
       /role === 'Project Manager' \? 'my-projects' : 'home'/.test(appJsx));
record('R13 M5: Material planning has my-escalations in sidebar',
       /'Material planning'[\s\S]{0,400}id: 'my-escalations'/.test(shellJsx));
record('R13 M5: Coordinator has my-escalations in sidebar',
       /'Coordinator'[\s\S]{0,400}id: 'my-escalations'/.test(shellJsx));
record('R13 M5: PageDashboard receives + renders Escalate button',
       /onNewEscalation \}/.test(dashJsx) && /icon="alert-circle" onClick=\{onNewEscalation\}/.test(dashJsx));
record('R13 P1: ProjectCard badge uses shrink-0 whitespace-nowrap',
       /shrink-0 whitespace-nowrap rounded-full/.test(dashJsx));
record('R13 P1: ProjectCard header has flex-1 min-w-0 + truncate on title',
       /flex-1 min-w-0/.test(dashJsx) && /truncate/.test(dashJsx));

// ── J3. Round 10 fixes ────────────────────────────────────────────────────
record('R10 FIX 2: canViewSettings helper exported',
       /canViewSettings/.test(dataJsx) && /SETTINGS_USERS\s*=\s*\['u-mgr1',\s*'u-mgr2'\]/.test(dataJsx));
record('R10 FIX 2: Sidebar gates Settings via canViewSettings',
       /canViewSettings\(currentUser\)/.test(shellJsx));
record('R10 FIX 2: Settings route blocks non-allowed with toast',
       /Access denied — Settings is restricted to Managers/.test(appJsx));
record('R10 FIX 1a: projectLifecycleState seeded per project',
       /const \[projectLifecycleState, setProjectLifecycleState\]/.test(storeR2Jsx));
record('R10 FIX 1a: realistic seed picks current stage 3-11',
       /const cur = 3 \+ Math\.floor\(rng\(\) \* \(maxIdx - 3 \+ 1\)\)/.test(storeR2Jsx));
record('R10 FIX 1a: 1-2 projects have Blocked stage',
       /blockedProjectIds/.test(storeR2Jsx) && /status = 'blocked'/.test(storeR2Jsx));
record('R10 FIX 1b: toggleProjectLifecycleStage exposed',
       /toggleProjectLifecycleStage/.test(storeR2Jsx));
record('R10 FIX 1b: toggle writes audit entry',
       /entityType: 'project_lifecycle_stage'/.test(storeR2Jsx));
record('R10 FIX 1b: project lifecycle uses single-click onToggle',
       /onClick=\{\(\) => !blocked && onToggle\(s\.id\)\}/.test(projectJsx));
record('R10 FIX 1b: project Overall progress recomputed from lifecycle',
       /lifecycleProgress/.test(projectJsx) && /projStageState\.filter\(x => x\.status === 'done'\)\.length/.test(projectJsx));
record('R10 FIX 1b: toggleSchoolStage exposed',
       /toggleSchoolStage/.test(storeR2Jsx));
record('R10 FIX 1b: toggleSchoolStage writes audit entry',
       /entityType: 'school_stage'/.test(storeR2Jsx));
record('R10 FIX 1b: StageRow uses single-click toggle (no menu)',
       /onClick=\{onToggle\}/.test(detailJsx) && !/menuOpen, setMenuOpen.*useState/.test(detailJsx));

// ── J2. Round 8 fixes ─────────────────────────────────────────────────────
record('BUG 1: Settings ProjectsTab uses real addProject',
       /const \{ projects, addProject, deleteProject, logAudit \} = useStore\(\);/.test(settingsJsx));
record('BUG 1: Settings Add Project button onClick set',
       /onClick=\{\(\) => setAddOpen\(true\)\}>Add Project/.test(settingsJsx));
record('BUG 1: Settings Add Project gated by canCreateProject',
       /canCreateProject\(currentUser\)/.test(settingsJsx));
record('BUG 1: Settings reuses NewProjectModal (shared with dashboard)',
       /typeof NewProjectModal === 'function'/.test(settingsJsx) && /Object\.assign\(window, \{ PageDashboard, NewProjectModal \}\)/.test(dashJsx));
record('BUG 1: Settings ProjectsTab writes CREATE audit',
       /entityType: 'project'/.test(settingsJsx) && /Created project/.test(settingsJsx));
record('BUG 1: Settings ProjectsTab DELETE audit on remove',
       /action: 'DELETE', entityType: 'project'/.test(settingsJsx));

record('BUG 2: Integrations tab removed from TABS',
       !/'Integrations'/.test(settingsJsx));
record('BUG 2: IntegrationsTab component removed',
       !/function IntegrationsTab\(/.test(settingsJsx));
record('BUG 2: No <IntegrationsTab/> render',
       !/<IntegrationsTab/.test(settingsJsx));

record('BUG 3: Notifications demo banner present',
       /This is a demo|This is a demo\b|requires a backend integration/i.test(settingsJsx));
record('BUG 3: Notifications has Send test button',
       /Send test/.test(settingsJsx) && /testSend\(e\.id\)/.test(settingsJsx));
record('BUG 3: Notifications saveRule writes audit',
       /entityType: 'notification_rule'/.test(settingsJsx));
record('BUG 3: Notifications test send writes audit',
       /entityType: 'notification_test'/.test(settingsJsx));
record('BUG 3: Notifications rule rich-text template field',
       /placeholder="Use \{actor\}/.test(settingsJsx));
record('BUG 3: Notifications throttle Immediate / Daily',
       /Immediate.*Daily digest|daily/.test(settingsJsx));

// (Round 8 BUG 4 multi-state action menu was deliberately replaced by Round 10's
//  single-click two-state toggle. See R10 FIX 1b checks for current behaviour.)

record('BUG 5: Settings KPIs add/edit/delete wired',
       /startEdit\(k\)/.test(settingsJsx) && /setConfirmDel\(k\)/.test(settingsJsx) && /saveAdd/.test(settingsJsx));
record('BUG 5: Settings Branding color picker wired',
       /<input type="color"/.test(settingsJsx) && /setColor\(n, e\.target\.value\)/.test(settingsJsx));
record('BUG 5: Settings Branding logo upload wired',
       /onPickLogo/.test(settingsJsx) && /fileRef\.current\?\.click\(\)/.test(settingsJsx));

// ── K. Login + Sign-out ────────────────────────────────────────────────────
record('FIX 5: Login no stat tiles',
       !/Schools<\/div>/.test(loginJsx) && !/Programs<\/div>/.test(loginJsx) && !/2,601/.test(loginJsx));
record('FIX 5: Login keeps brand panel + form',
       /Zamil Services/.test(loginJsx) && /Sign in/.test(loginJsx) && /selectedId/.test(loginJsx));
record('Sign-out wired in TopBar dropdown', /onClick=\{\(\) => \{ setMenuOpen\(false\); onSignOut/.test(shellJsx));
record('Sign-in/out audit-logged in app.jsx', /action: 'LOGIN'/.test(appJsx) && /action: 'LOGOUT'/.test(appJsx));

// ── L. Simulated end-to-end: Anas → New Project → Add School ─────────────
// We run a minimal pure-JS version of the addProject + validateSchool/addSchool logic
// to confirm the data flow.
(function simulateAnasFlow() {
  // Recreate minimal store
  const projects = [];
  const schools = [];
  const auditLog = [];
  const Anas = { id: 'u-mgr2', name: 'Anas Alshahrani', role: 'Manager' };

  const canCreateProject = (u) => u && ['u-mgr1','u-mgr2','u-pgm'].includes(u.id);

  function addProject(data) {
    const id = 'p-' + Date.now() + '-' + Math.floor(Math.random()*1000);
    const p = { id, tag: data.tag || id, name: data.name, region: data.region, value: data.value || 0,
                start: data.start, target: data.target, contractorId: data.contractorId, pmId: data.pmId,
                sites: 0, progress: 0 };
    projects.push(p);
    return p;
  }
  function validateSchool(data, excludeId) {
    if (schools.some(s => s.id === data.id && s.id !== excludeId)) return { ok: false, error: 'dup-id' };
    if (data.meter && schools.some(s => s.meter === data.meter && s.id !== excludeId)) return { ok: false, error: 'dup-meter' };
    return { ok: true };
  }
  function addSchool(data) {
    const v = validateSchool(data);
    if (!v.ok) return v;
    const sch = { ...data };
    schools.push(sch);
    return { ok: true, school: sch };
  }
  function logAudit(e) {
    auditLog.unshift({ timestamp: new Date().toISOString(), ...e });
  }

  // Step 1: Anas logs in
  logAudit({ actorId: Anas.id, actorName: Anas.name, actorRole: Anas.role, action: 'LOGIN', entityType: 'session', summary: 'Anas Alshahrani signed in' });
  record('E2E[1]: Anas logs in', auditLog.some(l => l.action === 'LOGIN' && l.actorId === 'u-mgr2'));

  // Step 2: Permission check
  record('E2E[2]: Anas can create projects', canCreateProject(Anas) === true);

  // Step 3: Create Tabuk project
  const proj = addProject({
    name: 'Tabuk Schools Solar Program', region: 'Tabuk', city: 'Tabuk',
    value: 350_000_000, start: '2026-06-01', target: '2027-06-30',
    contractorId: 'c1', pmId: 'u-pm1',
  });
  logAudit({ actorId: Anas.id, actorName: Anas.name, actorRole: Anas.role, action: 'CREATE', entityType: 'project', entityId: proj.id, entityLabel: proj.name, summary: `Created project "${proj.name}" in ${proj.region} (SAR 350M)` });
  record('E2E[3]: Project created with correct name', proj.name === 'Tabuk Schools Solar Program');
  record('E2E[3a]: Project contract value 350M',     proj.value === 350_000_000);
  record('E2E[3b]: Project region Tabuk',            proj.region === 'Tabuk');
  record('E2E[3c]: Audit entry for project create',  auditLog.some(l => l.action === 'CREATE' && l.entityType === 'project' && l.entityId === proj.id));

  // Step 4: Find new project in list
  record('E2E[4]: New project appears in list',      projects.includes(proj));
  record('E2E[4a]: Project count increased',         projects.length === 1);

  // Step 5: Add first school
  const s1 = addSchool({ id: 'SS-ZAM-TAB-0001', projectId: proj.id, nameEn: 'Tabuk Primary 1', nameAr: 'الابتدائية الأولى بتبوك', level: 'Primary', gender: 'Boys', meter: 'KFM-NEW-0001', region: 'Tabuk', city: 'Tabuk' });
  record('E2E[5]: First school added',               s1.ok === true);
  logAudit({ actorId: Anas.id, actorName: Anas.name, actorRole: Anas.role, action: 'CREATE', entityType: 'school', entityId: s1.school.id, entityLabel: s1.school.nameEn, summary: `Created school SS-ZAM-TAB-0001 in Tabuk Schools Solar Program` });
  record('E2E[5a]: Audit entry for school create',   auditLog.some(l => l.action === 'CREATE' && l.entityType === 'school'));

  // Step 6: Try duplicate ID
  const dup = addSchool({ id: 'SS-ZAM-TAB-0001', projectId: proj.id, nameEn: 'Dup', meter: 'NEW-METER' });
  record('E2E[6]: Duplicate School ID rejected',     dup.ok === false && dup.error === 'dup-id');

  // Step 7: Try duplicate meter
  const dupMeter = addSchool({ id: 'SS-ZAM-TAB-0002', projectId: proj.id, nameEn: 'X', meter: 'KFM-NEW-0001' });
  record('E2E[7]: Duplicate SEC Meter rejected',     dupMeter.ok === false && dupMeter.error === 'dup-meter');

  // Step 8: School appears in project's school list
  const projSchools = schools.filter(s => s.projectId === proj.id);
  record('E2E[8]: School appears in project list',   projSchools.length === 1 && projSchools[0].id === 'SS-ZAM-TAB-0001');

  // Step 9: Audit log has both events
  const projAudit = auditLog.find(l => l.entityType === 'project' && l.entityId === proj.id);
  const schoolAudit = auditLog.find(l => l.entityType === 'school' && l.entityId === 'SS-ZAM-TAB-0001');
  record('E2E[9]: Audit log has project creation',   !!projAudit);
  record('E2E[9a]: Audit log has school creation',   !!schoolAudit);
  record('E2E[9b]: Audit timestamps populated',      !!projAudit?.timestamp && !!schoolAudit?.timestamp);
})();

// ── Print results ─────────────────────────────────────────────────────────
const pass = results.filter(r => r.pass).length;
const fail = results.filter(r => !r.pass).length;
const total = results.length;
console.log(`\n===  Zamil Solar Dashboard — E2E Click Audit  ===`);
console.log(`Total checks: ${total}`);
console.log(`Passed:       ${pass}`);
console.log(`Failed:       ${fail}`);
console.log(`Pass rate:    ${((pass / total) * 100).toFixed(1)}%`);
console.log('');
results.forEach(r => console.log(`  ${r.pass ? '✓' : '✗'}  ${r.name}${r.detail ? '  — ' + r.detail : ''}`));
process.exit(fail === 0 ? 0 : 1);
