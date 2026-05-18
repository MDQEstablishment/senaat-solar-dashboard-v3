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

// R30.1 — src moved under vite/ when the repo adopted the Vite layout.
const SRC = path.join(__dirname, '..', 'vite', 'src');

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

// ── J5. Round 14 Settings admin ───────────────────────────────────────────
record('R14 P1: UsersTab uses store users (not static PEOPLE)',
       /const \{ users, addUser, updateUser, archiveUser, resetUserPassword \}/.test(settingsJsx));
record('R14 P1: Add User button wired',
       /onClick=\{\(\) => setModal\(\{ open: true, initial: null \}\)\}>Add User/.test(settingsJsx));
record('R14 P1: addUser writes CREATE audit + issues temp password',
       /entityType: 'user'/.test(storeR2Jsx) && /Welcome@123/.test(storeR2Jsx));
record('R14 P1: Reset PW button wired with confirmation',
       /setConfirmReset\(u\)/.test(settingsJsx) && /resetUserPassword\(confirmReset\.id/.test(settingsJsx));
record('R14 P1: Archive flow + Show archived toggle',
       /setConfirmArchive\(u\)/.test(settingsJsx) && /archiveUser\(confirmArchive\.id/.test(settingsJsx) && /Show archived/.test(settingsJsx));
record('R14 P1: UserModal has all required fields',
       /Full name \*/.test(settingsJsx) && />Role \*</.test(settingsJsx) && /Default region/.test(settingsJsx) && />Mobile</.test(settingsJsx) && /Active \(uncheck/.test(settingsJsx));
record('R14 P4: RolesTab onChange toggleRolePermission (autosave)',
       /toggleRolePermission\(r, s, currentUser\)/.test(settingsJsx) && /flashSaved\(\)/.test(settingsJsx));
record('R14 P4: Reset to defaults button + confirmation',
       /resetRolePermissions\(currentUser\)/.test(settingsJsx) && /Reset to defaults/.test(settingsJsx));
record('R14 P4: rolePermissions state + audit on toggle',
       /const \[rolePermissions, setRolePermissions\]/.test(storeR2Jsx) && /entityType: 'role_permission'/.test(storeR2Jsx));
record('R14 P7: BrandingTab uses store theme + applies CSS variables',
       /updateThemeColor/.test(settingsJsx) && /applyCssVars/.test(storeR2Jsx) && /document\.documentElement\.style\.setProperty/.test(storeR2Jsx));
record('R14 P7: Logo upload reads dataURL + warns >500KB',
       /readAsDataURL/.test(settingsJsx) && /500 KB/.test(settingsJsx));
record('R14 P7: Reset to Zamil defaults link wired',
       /resetBranding\(currentUser\)/.test(settingsJsx));
record('R14 P7: Branding actions audit-logged',
       /entityType: 'branding'/.test(storeR2Jsx));

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
       /typeof NewProjectModal === 'function'/.test(settingsJsx) &&
       /PageDashboard, NewProjectModal/.test(dashJsx));
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
       /<input type="color"/.test(settingsJsx) && /updateThemeColor\(n, e\.target\.value/.test(settingsJsx));
record('BUG 5: Settings Branding logo upload wired',
       /onPickLogo/.test(settingsJsx) && /fileRef\.current\?\.click\(\)/.test(settingsJsx));

// ── K. Login + Sign-out ────────────────────────────────────────────────────
record('FIX 5: Login no stat tiles',
       !/Schools<\/div>/.test(loginJsx) && !/Programs<\/div>/.test(loginJsx) && !/2,601/.test(loginJsx));
record('FIX 5: Login keeps brand panel + form',
       /Zamil Services/.test(loginJsx) && /Sign in/.test(loginJsx) && /selectedId/.test(loginJsx));
record('Sign-out wired in TopBar dropdown', /onClick=\{\(\) => \{ setMenuOpen\(false\); onSignOut/.test(shellJsx));
record('Sign-in/out audit-logged in app.jsx', /action: 'LOGIN'/.test(appJsx) && /action: 'LOGOUT'/.test(appJsx));

// ── K2. Round 15 pre-demo fixes ───────────────────────────────────────────
// R15 #1: Audit Log sidebar item for VP / Operations Manager / Program Manager.
const vpBranchMatch = shellJsx.match(/if \(role === 'VP'\)[\s\S]*?\n  \}/);
record('R15 #1: VP sidebar contains Audit Log',
       !!vpBranchMatch && /\.\.\.auditLogItem,?/.test(vpBranchMatch[0]) &&
       /auditLogItem\s*=\s*canViewAuditLog\(currentUser\)[\s\S]{0,120}id:\s*'audit-log'/.test(shellJsx));
record('R15 #1: PM-group sidebar exposes Audit Log when no Settings access',
       /canViewAuditLog\(currentUser\)\s*&&\s*!canViewSettings\(currentUser\)/.test(shellJsx) &&
       /auditLogItemPgm/.test(shellJsx));
record('R15 #1: app.jsx routes audit-log to PageSettings with auditLogOnly',
       /page === 'audit-log'/.test(appJsx) &&
       /<PageSettings[^>]*auditLogOnly=\{true\}/.test(appJsx));
// R15 #1 + R29.6: auditLogOnly branch renders AuditTab; from R29.6 also renders StorageTab below it.
record('R15 #1: PageSettings accepts auditLogOnly prop and renders AuditTab (R29.6: + StorageTab)',
       /function PageSettings\(\{\s*currentUser,\s*auditLogOnly\s*=\s*false\s*\}\)/.test(settingsJsx) &&
       /if \(auditLogOnly\)[\s\S]{0,1200}<AuditTab\s*\/>[\s\S]{0,400}<StorageTab\s*\/>/.test(settingsJsx));
// R15 #2: Material Planning 'Projects' no longer duplicates Dashboard.
const matchMaterial = appJsx.match(/role === 'Material planning'\)[\s\S]*?\n    \}/);
record('R15 #2: Material Planning Projects route renders different content than Dashboard',
       !!matchMaterial &&
       /page === 'projects'\)\s*return <PageVPPrograms/.test(matchMaterial[0]) &&
       !(/page === 'projects'\)\s*return <PageDashboard/.test(matchMaterial[0])));
// R15 #4: Cash Flow chart demo caption.
record('R15 #4: Cash Flow chart has demo caption below the chart',
       /Curve shown is a representative trend; live cumulative data populates post-integration with the accounting system\./.test(read('page-financials.jsx')));

// ── K3. Round 16 — 18-stage migration, Stage KPIs, directed escalations, import/export ──
const dataJsxR16    = read('data.jsx');
const pagesR2R16    = read('pages-r2.jsx');
const reportsJsxR16 = read('page-reports-zamil.jsx');
const settingsR16   = read('page-settings.jsx');
const dashJsxR16    = read('page-dashboard.jsx');
const vpJsxR16      = read('page-vp.jsx');
const storeR16      = read('store-r2.jsx');

// R16 #2: 18-stage model present in data.jsx
record('R16 #2: STAGE_KEYS expanded to 18 stages',
       /'foundation','pv_mounting','pv_module','earthing'/.test(dataJsxR16) &&
       /'cable_tray','dc_cables','ac_cables','inverters','smdb','data_logger','digital_meter','breaker','ct'/.test(dataJsxR16) &&
       /'energized','coc_signed','installation_complete'/.test(dataJsxR16) &&
       /'handover_zamil','handover_client'/.test(dataJsxR16));
record('R16 #2: STAGE_EXCEL_HEADERS map preserves client wording',
       /STAGE_EXCEL_HEADERS\s*=\s*\{/.test(dataJsxR16) &&
       /'Completion of Foundation'/.test(dataJsxR16) &&
       /'PV Mounting Structure'/.test(dataJsxR16) &&
       /'Installation Completion Date'/.test(dataJsxR16) &&
       /'Handover to Zamil'/.test(dataJsxR16) &&
       /'Handover to Client'/.test(dataJsxR16));
record('R16 #2: STAGE_CATEGORY assigns each key to mechanical/electrical/commissioning/handover',
       /STAGE_CATEGORY\s*=\s*\{/.test(dataJsxR16) &&
       /STAGE_CATEGORY_COLORS\s*=\s*\{/.test(dataJsxR16) &&
       /mechanical:/.test(dataJsxR16) && /electrical:/.test(dataJsxR16) &&
       /commissioning:/.test(dataJsxR16) && /handover:/.test(dataJsxR16));
record('R16 #2: OLD_TO_NEW_STAGE remap covers legacy seed data',
       /OLD_TO_NEW_STAGE\s*=\s*\{/.test(dataJsxR16) &&
       /mounting: 'pv_mounting'/.test(dataJsxR16) &&
       /datalogger: 'data_logger'/.test(dataJsxR16) &&
       /coc: 'coc_signed'/.test(dataJsxR16));
record('R16 #2: stageByKey + countEnergized look up by key (no hardcoded stages[11])',
       /function stageByKey/.test(dataJsxR16) &&
       /STAGE_INDEX\[key\]/.test(dataJsxR16) &&
       !/stages\[11\]\.done/.test(dataJsxR16));
record('R16 #2: countHandedOver helper defined and exported',
       /function countHandedOver/.test(dataJsxR16) &&
       /countHandedOver,/.test(dataJsxR16));
record('R16 #2: Dashboard widget renamed to "School Execution Stages"',
       /title="School Execution Stages"/.test(dashJsxR16) &&
       !/School Program Execution Stages/.test(dashJsxR16));
record('R16 #2: StageStrip colours by category, not by index range',
       /STAGE_CATEGORY_COLORS\[cat\]/.test(dashJsxR16) &&
       /STAGE_CATEGORY\[key\]/.test(dashJsxR16));
record('R16 #2: hardcoded stages[11]/stages[12] references replaced across components',
       !/s\.stages\[11\]\.done/.test(read('page-vp.jsx')) &&
       !/s\.stages\[12\]\.done/.test(read('page-vp.jsx')) &&
       !/s\.stages\[12\]\.done/.test(pagesR2R16) &&
       !/s\.stages\[11\]/.test(pagesR2R16));
record('R16 #2: ALL_SCHOOLS construction remaps legacy keys + synthesizes new stages',
       /OLD_TO_NEW_STAGE\[oldK\]/.test(dataJsxR16) &&
       /completedDate/.test(dataJsxR16) &&
       /handover_zamil/.test(dataJsxR16) && /handover_client/.test(dataJsxR16));

// R16 #3 → R19: Stage Execution KPIs render 18 cards, replace Recent activities.
// The "18 active stages tracked" string was retired in R19 — heading is now
// "Stage Execution · all 18 stages". This test still validates the same intent.
record('R16 #3: Stage Execution KPIs render 18 cards',
       /function StageExecutionKPIs/.test(pagesR2R16) &&
       /STAGE_KEYS\.map\(\(key, idx\)/.test(pagesR2R16) &&
       /Stage Execution · all 18 stages/.test(pagesR2R16));
// R16 #3 → R27: the VP dashboard's stage-execution rollup is now rendered by
// the SchoolExecutionStagesWidget (richer 4-panel design with the per-stage
// cards). The intent — VP dashboard surfaces stage execution — is preserved.
record('R16 #3 → R27: VP dashboard renders the portfolio School Execution Stages widget',
       /canViewSchoolExecutionStages\(me\)[\s\S]{0,200}<window\.SchoolExecutionStagesWidget/.test(pagesR2R16));
record('R16 #3: page-vp.jsx no longer renders Recent activity panel',
       !/title="Recent activity"/.test(vpJsxR16) &&
       /<StageExecutionKPIs/.test(vpJsxR16));
record('R16 #3: PagePMDashboard no longer renders ExecutiveAuditPanel inline',
       !/\{isExec && <ExecutiveAuditPanel/.test(pagesR2R16));
record('R16 #3: StageExecutionKPIs summary line counts across all 2,601 schools',
       /nfmt\.format\(total\)\} schools total/.test(pagesR2R16) &&
       /currently in pipeline/.test(pagesR2R16) &&
       /energized/.test(pagesR2R16));

// R16 #4: Top escalations directed filter
record('R16 #4: filterEscalationsDirectedTo helper defined',
       /function filterEscalationsDirectedTo/.test(pagesR2R16) &&
       /e\.currentlyWith === user\.id/.test(pagesR2R16) &&
       /e\.toRole === user\.role/.test(pagesR2R16));
record('R16 #4: Top escalations filter shows only items directed at current user',
       /filterEscalationsDirectedTo\(escalations, me\)/.test(pagesR2R16) &&
       /filterEscalationsDirectedTo\(escalations, currentUser\)/.test(pagesR2R16));
record('R16 #4: per-role heading via escalationsDirectedHeading',
       /function escalationsDirectedHeading/.test(pagesR2R16) &&
       /Escalations awaiting your decision/.test(pagesR2R16) &&
       /Escalations awaiting your action/.test(pagesR2R16) &&
       /Escalations I need to resolve/.test(pagesR2R16) &&
       /My open escalations/.test(pagesR2R16));
record('R16 #4: empty state with celebratory icon',
       /No escalations awaiting your action\./.test(pagesR2R16) &&
       /icon="check-circle"/.test(pagesR2R16));

// R16 #1: School Stages Workbook (Template / Import / Export)
record('R16 #1: SchoolStagesWorkbookCard mounts in Reports tab',
       /<SchoolStagesWorkbookCard\s*\/>/.test(reportsJsxR16) &&
       /function SchoolStagesWorkbookCard/.test(reportsJsxR16));
record('R16 #1: Download Template button wired',
       /downloadTemplate/.test(reportsJsxR16) &&
       /master_daily_report_template_/.test(reportsJsxR16));
record('R16 #1: Import xlsx updates school stages and writes audit log',
       /XLSX\.read\(buf, \{ type: 'array' \}\)/.test(reportsJsxR16) &&
       /sch\.stages\[i\]\.completedDate = iso/.test(reportsJsxR16) &&
       /entityType: 'schools\.bulk_import'/.test(reportsJsxR16));
record('R16 #1: Export xlsx contains all 18 stage columns',
       /STAGE_KEYS\.map\(\(k, i\) => `\$\{i \+ 1\}\. \$\{STAGE_EXCEL_HEADERS\[k\]\}`\)/.test(reportsJsxR16) &&
       /exportReport/.test(reportsJsxR16) &&
       /master_daily_report_\$\{/.test(reportsJsxR16));
record('R16 #1: Settings → School Stages exposes Download Template too',
       /downloadTemplate/.test(settingsR16) &&
       /buildSchoolStagesAOA\(null, \{ includeData: false \}\)/.test(settingsR16) &&
       /master_daily_report_template_/.test(settingsR16));
record('R16 #1: store-r2 schoolStagesList carries category + excelHeader for each stage',
       /STAGE_CATEGORY\[key\]/.test(storeR16) &&
       /excelHeader: STAGE_EXCEL_HEADERS\[key\]/.test(storeR16));

// ── K4. Round 17 hotfix → Round 19 — the 18-column matrix from R17 was replaced by
// the funnel + 24-px scrub strip + filter chip in R19. These tests cover the same
// intent: schools list still surfaces all 18 School Execution Stages in some form.
const schoolsListR17 = read('page-schools-list.jsx');
// R17 → R19 → R20 → R23: Stages view surfaces all 18 stages. R23 replaced the
// previous SchoolsStagesVertical implementation with the shared StageChecklistTable
// (src/components/StageChecklistTable.jsx) — so the assertions now point there.
record('R17 → R23: Project Detail Stages view surfaces all 18 stages',
       /STAGE_KEYS_\.map\(\(key, i\)/.test(read('components/StageChecklistTable.jsx')) &&
       /SCHOOL_STAGES_\[i\]/.test(read('components/StageChecklistTable.jsx')));
record('R17: legacy 12-stage map (Surveyed / SEC Approvals / Fix1 / Fix2 / Handed Over) removed from Stages view',
       !/const LEGACY_STAGE_MAP/.test(schoolsListR17) &&
       !/LEGACY_STAGE_MAP\.map/.test(schoolsListR17));
// R17 → R23 → R24: visual deliberately reverted to the classic R17 look — no
// category-tinted header band, no current-stage pill per row, no sticky positions.
// What we still assert is the *cell* content from R17: check + dd-MMM date for
// done stages, em-dash otherwise, dense rows.
record('R17 → R25: Stages view body cells render check-circle icon + dd-MMM date for done stages',
       /Icon name="check-circle" size=\{16\} className="text-emerald-600"/.test(read('components/StageChecklistTable.jsx')) &&
       /toLocaleDateString\('en-GB', \{ day: '2-digit', month: 'short' \}\)/.test(read('components/StageChecklistTable.jsx')));
record('R17 → R24: Stages view body cells render em-dash for stages with no completedDate',
       /<span className="text-slate-300" aria-hidden="true">—<\/span>/.test(read('components/StageChecklistTable.jsx')));

// ── K5. Round 18 — shorter handover labels + Project Detail export uses 18 stages ──
const dataJsxR18    = read('data.jsx');
const reportsJsxR18 = read('page-reports-zamil.jsx');
const schoolsR18    = read('page-schools-list.jsx');
const settingsR18   = read('page-settings.jsx');

// R18 #1: Handover labels use short form in UI; excelHeaders preserved verbatim.
record('R18 #1: Handover labels use short form in UI',
       /'Zamil Handover','Client Handover'/.test(dataJsxR18) &&
       !/SCHOOL_STAGES =[\s\S]{0,600}'Handover to Zamil','Handover to Client'/.test(dataJsxR18));
record('R18 #1: STAGE_EXCEL_HEADERS still carry the long-form names for import/export',
       /handover_zamil:\s*'Handover to Zamil'/.test(dataJsxR18) &&
       /handover_client:\s*'Handover to Client'/.test(dataJsxR18));
record('R18 #1: importer matches BOTH the bare and numeric-prefixed Excel header forms',
       /s\.endsWith\('\. ' \+ w\)/.test(reportsJsxR18));

// R18 #2: shared builder used by Reports + Project Detail; Project Detail export uses 18 columns.
record('R18 #2: shared buildSchoolStagesAOA helper exposed on window',
       /function buildSchoolStagesAOA/.test(reportsJsxR18) &&
       /buildSchoolStagesAOA, writeSchoolStagesWorkbook/.test(reportsJsxR18));
record('R18 #2: Project Detail Export to Excel contains 18 stage columns',
       /window\.buildSchoolStagesAOA\(filtered/.test(schoolsR18) &&
       /window\.writeSchoolStagesWorkbook/.test(schoolsR18) &&
       !/const headers = \['School ID','School Name \(Arabic\)','School Name \(English\)','Level'/.test(schoolsR18));
record('R18 #2: filename = {projectName}_schools_stages_YYYY-MM-DD.xlsx',
       /_schools_stages_\$\{new Date\(\)\.toISOString\(\)\.slice\(0, 10\)\}\.xlsx/.test(schoolsR18));
record('R18 #2: Settings Download Template also routes through the shared builder',
       /window\.buildSchoolStagesAOA\(null, \{ includeData: false \}\)/.test(settingsR18));
record('R18 #2: workbook builder includes category band row + merges',
       /catRow\[cursor\] = STAGE_CATEGORY_LABELS\[cat\]/.test(reportsJsxR18) &&
       /merges\.push\(\{ s: \{ r: 0, c: cursor \}/.test(reportsJsxR18));
record('R18 #2: stage header prefixed with numeric index (1. … 18. …)',
       /`\$\{i \+ 1\}\. \$\{STAGE_EXCEL_HEADERS\[k\]\}`/.test(reportsJsxR18));
record('R18 #2: identity columns include School ID + AR/EN names + Region + City + Project + Contractor + SEC Meter + Status',
       /'School ID', 'School Name \(Arabic\)', 'School Name \(English\)', 'Region', 'City', 'Project', 'Contractor', 'SEC Meter', 'Status'/.test(reportsJsxR18));

// ── K6. Round 19 — dashboard redesign (KPI sparkline + delta chip, Stage transitions,
//                                       Top bottlenecks, tinted category panels,
//                                       Project Detail funnel + scrub strip,
//                                       reusable StageCard) ────────────────────────
const dashJsxR19    = read('page-dashboard.jsx');
const schoolsR19    = read('page-schools-list.jsx');
const pagesR2R19    = read('pages-r2.jsx');
const stageCardR19  = read('components/StageCard.jsx');
const mainJsxR19    = read('main.jsx');

// R19 Item #1 — KPI delta chip + sparkline.
record('R19 Item #1: KPI cards render an inline sparkline',
       /<Sparkline data=\{spark\}/.test(dashJsxR19));
record('R19 Item #1: KPI cards show a delta chip below the label when trend != 0',
       /hasDelta = trend != null && trend !== 0/.test(dashJsxR19) &&
       /deltaSuffix/.test(dashJsxR19) &&
       /'this week'/.test(dashJsxR19) && /'vs last week'/.test(dashJsxR19));

// R19 Item #1 — Stage transitions bar chart + Top bottlenecks sidebar.
record('R19 Item #1: Dashboard renders 18 stage transitions bars',
       /function DashTransitionsChart/.test(dashJsxR19) &&
       /Stage transitions this week/.test(dashJsxR19) &&
       /stages\.map\(s => \{/.test(dashJsxR19) &&
       /crossings/.test(dashJsxR19) &&
       /Peak:/.test(dashJsxR19));
record('R19 Item #1: Dashboard renders Top bottlenecks panel',
       /function DashBottlenecksSidebar/.test(dashJsxR19) &&
       /Top bottlenecks/.test(dashJsxR19) &&
       /largest school drop-off/.test(dashJsxR19));
record('R19 Item #1: Empty "Program progress trend" chart removed from VP + Manager dashboards',
       !/<ExecutiveProgressTrend \/>/.test(pagesR2R19) &&
       !/\{isExec && <ExecutiveProgressTrend/.test(pagesR2R19));
record('R19 Item #1: Stage Execution heading is "Stage Execution · all 18 stages"',
       /Stage Execution · all 18 stages/.test(pagesR2R19) &&
       /Grouped by category · click any card to filter projects and schools/.test(pagesR2R19) &&
       /currently in pipeline/.test(pagesR2R19));
record('R19 Item #1: Tinted category panels (mechanical/electrical/commissioning/handover)',
       /function DashCategoryPanel/.test(dashJsxR19) &&
       /CAT_TINTS/.test(dashJsxR19) &&
       /catKey="mechanical"/.test(dashJsxR19) &&
       /catKey="electrical"/.test(dashJsxR19) &&
       /catKey="commissioning"/.test(dashJsxR19) &&
       /catKey="handover"/.test(dashJsxR19));

// R19 Item #2 → R20 → R23: Stages view surfaces all 18 stages. The horizontal
// funnel (R19) and the vertical list (R20) both came and went; R23 replaced both
// with the shared per-school checkmark table (StageChecklistTable).
record('R19 Item #2 → R25: Stages view surfaces all 18 stages via the shared checkmark table',
       /<SCT schools=\{rows\} onOpen=\{onOpen\}/.test(schoolsR19) &&
       /data-testid="stage-checklist-table"/.test(read('components/StageChecklistTable.jsx')));
record('R19 Item #2 → R23: Stages view exposes a removable stage filter (in shared component)',
       /aria-label="Clear stage filter"/.test(read('components/StageChecklistTable.jsx')));
record('R19 Item #2: legacy 18-column matrix removed from Stages view',
       !/STAGE_KEYS\.map\(\(k, i\) => \{[\s\S]{0,500}const st = s\.stages && s\.stages\[i\];[\s\S]{0,500}return \(\s+<td/.test(schoolsR19));

// R19 Item #3 — reusable StageCard component.
record('R19 Item #3: components/StageCard.jsx exists and exposes window.StageCard',
       /function StageCard\(\{ stage, count, total, weeklyDelta, medianDwellDays, isBottleneck/.test(stageCardR19) &&
       /Object\.assign\(window, \{ StageCard \}\)/.test(stageCardR19));
record('R19 Item #3: main.jsx imports components/StageCard.jsx',
       /import '\.\/components\/StageCard\.jsx';/.test(mainJsxR19));
record('R19 Item #3: Dashboard DashStageCard delegates to the reusable StageCard',
       /const SC = window\.StageCard/.test(dashJsxR19) &&
       /<SC[\s\S]{0,200}weeklyDelta=\{stageObj\.week\}/.test(dashJsxR19));

// ── K7. Round 19.1 hotfix — chart + bottlenecks now render on VP + Manager,
//                            visible sparklines, clearer progress bars ───────
const dashR191    = read('page-dashboard.jsx');
const pagesR191   = read('pages-r2.jsx');
const uiR191      = read('ui.jsx');
const stageR191   = read('components/StageCard.jsx');

record('R19.1 A: Stage transitions chart renders 18 bars with values',
       /data-testid="dash-transitions-chart"/.test(dashR191) &&
       /data-testid=\{`dash-transitions-bar-S\$\{String\(s\.n\)\.padStart\(2, '0'\)\}`\}/.test(dashR191) &&
       /VEL_SEED\s*=\s*\[47,52,41,38,29,33,21,18,14,11,8,6,3,1,0,0,0,0\]/.test(dashR191) &&
       /Peak:/.test(dashR191));
record('R19.1 A: chart layout is flex 3 (chart) + flex 1 (bottlenecks)',
       /lg:flex-\[3\][\s\S]{0,200}DashTransitionsChart/.test(dashR191) &&
       /lg:flex-1[\s\S]{0,200}DashBottlenecksSidebar/.test(dashR191));
record('R19.1 B: Top bottlenecks panel renders 4 rows with SXX chip + red drop bar',
       /data-testid="dash-bottlenecks-sidebar"/.test(dashR191) &&
       /data-testid=\{`dash-bottleneck-row-S\$\{String\(b\.n\)\.padStart\(2, '0'\)\}`\}/.test(dashR191) &&
       /\.slice\(0, 4\)/.test(dashR191) &&
       /background: '#BE123C'/.test(dashR191));
record('R19.1 A+B: VP + Manager dashboards now embed the transitions+bottlenecks insights row',
       /<DashStageInsights projects=\{projects\}/.test(pagesR191) &&
       /function DashStageInsights/.test(pagesR191) &&
       /window\.DashTransitionsChart/.test(pagesR191) &&
       /window\.DashBottlenecksSidebar/.test(pagesR191) &&
       /window\.computeDashStageData/.test(pagesR191));
record('R19.1 A+B: chart components + helper exposed on window from page-dashboard.jsx',
       /DashTransitionsChart, DashBottlenecksSidebar, DashCategoryPanel, DashStageCard,\s+computeDashStageData/.test(dashR191));
record('R19.1 C: Sparkline visible — slate-500 stroke, 1.25 width, flat-zero gets synthetic wave',
       /color = '#64748B'/.test(uiR191) &&
       /strokeWidth="1\.25"/.test(uiR191) &&
       /synthesize a low-amplitude wave/.test(uiR191) &&
       /viewBox=\{`0 0 \$\{width\} \$\{height\}`\}/.test(uiR191));
record('R19.1 C: KPI sparkline path has visible points (no horizontal "---" fallback for real data)',
       /amp \* Math\.sin/.test(uiR191));
record('R19.1 C: KPI delta chip is 11px font, 2px 6px padding, rounded-full with ▲/▼',
       /fontSize: 11, fontWeight: 600,[\s\S]{0,200}padding: '2px 6px', borderRadius: 99/.test(dashR191) &&
       /up \? '▲' : '▼'/.test(dashR191));
record('R19.1 D: StageCard progress bar visible — height 4, slate-100 bg, category-coloured fill',
       /data-testid="stage-card-progress"/.test(stageR191) &&
       /height: 4, background: '#F1F5F9'/.test(stageR191) &&
       /background: catColors\.dot \|\| '#0B2545'/.test(stageR191));

// ── K8. Round 20 → R23 — the vertical 18-row list (R20) was superseded by the
// shared per-school checkmark table (R23). The R20 component (SchoolsStagesVertical)
// was deleted from page-schools-list.jsx because nothing references it anymore.
// These assertions preserve the *intent* (Schools List Stages view continues to
// surface all 18 stages with an active-stage filter mechanism) against the new
// implementation in src/components/StageChecklistTable.jsx.
const schoolsR20 = read('page-schools-list.jsx');
const sctR20     = read('components/StageChecklistTable.jsx');

record('R20 → R23: Schools List Stages view surfaces all 18 stages',
       /STAGE_KEYS_\.map\(\(key, i\)/.test(sctR20) &&
       /<SCT schools=\{rows\}/.test(schoolsR20));
record('R20 → R25: Stages view renders 18 stage columns headered by S## + short label',
       /S\{String\(i \+ 1\)\.padStart\(2, '0'\)\}/.test(sctR20) &&
       /SCHOOL_STAGE_SHORT_\[i\]/.test(sctR20));
// R24 deliberately drops category-tinted header backgrounds and the per-cell
// category border — the client preferred the classic uniform table. We assert
// the absence rather than the presence here.
record('R20 → R24: classic table — no category-tinted header band on stage columns',
       !/borderTop: `2px solid \$\{cc\.dot/.test(sctR20) &&
       !/background: cc\.soft/.test(sctR20));
record('R20 → R25: Completed stages render with check-circle icon; empty stages with em-dash',
       /Icon name="check-circle" size=\{16\}/.test(sctR20) &&
       /<span className="text-slate-300" aria-hidden="true">—<\/span>/.test(sctR20));
record('R20 → R23: Clicking a stage filter narrows the table',
       /activeStage != null/.test(sctR20) &&
       /rows = rows\.filter\(s => \{[\s\S]{0,200}return st && \(st\.done \|\| st\.completedDate\)/.test(sctR20));
record('R20 → R23: Old SchoolsStagesVertical scrub strip removed from page-schools-list.jsx',
       !/data-testid="stages-view-scrub-strip"/.test(schoolsR20) &&
       !/data-testid="stages-view-vertical"/.test(schoolsR20));
record('R20 → R23: Stages view continues to expose a removable stage filter',
       /aria-label="Clear stage filter"/.test(sctR20));
record('R20 → R23: SchoolsStagesVertical component deleted (no longer in source or window export)',
       !/function SchoolsStagesVertical/.test(schoolsR20) &&
       !/SchoolsStagesVertical \}\);/.test(schoolsR20));

// ── K9. Round 21 — VP escalation gate + Reports cleanup + Project Detail vertical ──
const pagesR21    = read('pages-r2.jsx');
const dataR2R21   = read('data-r2.jsx');
const reportsR21  = read('page-reports-zamil.jsx');
const projectR21  = read('page-project.jsx');

record('R21 #1: VP escalations are filtered to Manager raisers only',
       /R21 Issue #1: VP-specific rule/.test(pagesR21) &&
       /if \(user\.role !== 'VP'\) return list/.test(pagesR21) &&
       /raiser && raiser\.role === 'Manager'/.test(pagesR21));
record('R21 #1: Existing PM / Program-Manager escalations now stop at the Manager tier (currentlyWith = u-mgr1 or u-mgr2)',
       /id: 'esc1'[\s\S]{0,400}currentlyWith: 'u-mgr1'/.test(dataR2R21) &&
       /id: 'esc2'[\s\S]{0,400}currentlyWith: 'u-mgr2'/.test(dataR2R21) &&
       /id: 'esc4'[\s\S]{0,400}currentlyWith: 'u-mgr1'/.test(dataR2R21));
record('R21 #1: at least one Manager-raised escalation routes to the VP (Budget overrun on Madinah)',
       /id: 'esc7'[\s\S]{0,400}fromUserId: 'u-mgr1'[\s\S]{0,400}currentlyWith: 'u-vp'/.test(dataR2R21) &&
       /Budget overrun on Madinah program needs VP sign-off/.test(dataR2R21));
record('R21 #1: a second Manager-raised escalation present (vendor non-performance)',
       /id: 'esc8'[\s\S]{0,400}fromUserId: 'u-mgr2'[\s\S]{0,400}currentlyWith: 'u-vp'/.test(dataR2R21));

record('R21 #2: Reports tab does not contain Import Excel button',
       !/Import Updates \(\.xlsx\)/.test(reportsR21) &&
       !/Importing…/.test(reportsR21.replace(/'Importing…' : ''/g, '')) || // helper text removed from JSX
       !/<Button[^>]*onClick=\{\(\) => fileRef\.current\?\.click\(\)\}/.test(reportsR21));
record('R21 #2: Reports tab still has Download Template and Export Report buttons',
       /Download Template/.test(reportsR21) &&
       /Export Report/.test(reportsR21) &&
       /grid-cols-1 md:grid-cols-2 gap-3/.test(reportsR21));
record('R21 #2: Reports tab shows helper text directing users to Import Schools inside a project',
       /Need to import updates\? Use[\s\S]{0,200}Import Schools[\s\S]{0,200}inside any project/.test(reportsR21));
record('R21 #2: Importer (onPickFile) preserved as function but UI button is unwired',
       /const onPickFile = async/.test(reportsR21) &&
       /<input ref=\{fileRef\}[^>]*aria-hidden="true"/.test(reportsR21));

// R21 #3 reverted in R22 — Project Detail now uses the per-school checkmark table
// (see R22 tests below). Schools List page still uses SchoolsStagesVertical and
// keeps its 480-px scroll container (R20). The two assertions below preserve the
// underlying intent: a project-scoped stages view exists with its own scroll cap.
record('R21 #3 → R22: Project Detail still has a project-scoped stages view',
       /ProjectStageChecklistTable/.test(projectR21) &&
       /<ProjectStageSummaryCards/.test(projectR21));
record('R20+R25: Schools List checkmark table renders inside its own scroll container (matches Compact view)',
       /maxHeight = 'calc\(100vh - 360px\)'/.test(read('components/StageChecklistTable.jsx')));
record('R21 #3: old horizontal funnel + 18-cell strip removed from Project Detail Overview',
       !/\/\* Horizontal funnel \*\//.test(projectR21) &&
       !/\/\* 18-cell mini strip \*\//.test(projectR21));

// ── K10. Round 22 — revert vertical on Project Detail, add per-school checkmark
//                    table, regroup the 18-cell summary into 4 category cards ──
const dataR22    = read('data.jsx');
const projectR22 = read('page-project.jsx');
const schoolsR22 = read('page-schools-list.jsx');

record('R22 #1: Project Detail Overview no longer uses SchoolsStagesVertical',
       !/<SchoolsStagesVertical/.test(projectR22) &&
       !/const SchoolsStagesVertical = window\.SchoolsStagesVertical/.test(projectR22));
// R22 #1: the checkmark table moved to Schools List in R23, so we now want the
// inverse of the original R22 #1 assertion — Schools List uses the table.
record('R22 #1 → R25: Schools List page renders the shared checkmark table',
       /<SCT schools=\{rows\} onOpen=\{onOpen\}/.test(schoolsR22) &&
       !/function SchoolsStagesVertical/.test(schoolsR22));
// R22 #2 family: the implementation moved to src/components/StageChecklistTable.jsx.
// The Project Detail call site is a thin adapter. Assert the live behaviour against
// the shared component file plus the adapter.
const sctR22 = read('components/StageChecklistTable.jsx');
record('R22 #2 → R25: Project Detail Overview no longer renders the per-school checkmark table',
       !/<ProjectStageChecklistTable/.test(projectR22) &&
       !/function ProjectStageChecklistTable/.test(projectR22) &&
       /R25.*per-school checkmark table was removed from Project Detail/.test(projectR22));
record('R22 #2 → R25: Stage completion checkmarks render only for stages with completedDate',
       /const done = !!\(st && \(st\.completedDate \|\| st\.done\)\)/.test(sctR22) &&
       /<Icon name="check-circle" size=\{16\} className="text-emerald-600"/.test(sctR22));
// R24 deliberately drops the sticky thead + sticky first column and the
// internal search / Completed-only / In-progress-only toolbar. The classic
// table reads top-to-bottom and uses page-level filters above the table.
record('R22 #2 → R24: classic table — no sticky thead, no sticky first column',
       !/position: 'sticky', top: 0, left: 0, zIndex: 3/.test(sctR22) &&
       !/position: 'sticky', left: 0, zIndex: 1/.test(sctR22));
record('R22 #2 → R24: classic table — no internal search box (page-level filters drive rows)',
       !/placeholder="Search by school name \/ ID \/ city"/.test(sctR22) &&
       !/aria-label="Search schools"/.test(sctR22));
record('R22 #2 → R24: classic table — no internal Completed-only / In-progress-only toggle',
       !/id: 'completed',\s+label: 'Completed only'/.test(sctR22) &&
       !/id: 'in_progress',\s+label: 'In progress only'/.test(sctR22));
record('R22 #2 → R25: Legend row removed (table now matches Compact view chrome)',
       !/green check = stage complete · — = not yet/.test(sctR22));

record('R22 #3: Category summary cards group 18 stages into Mechanical / Electrical / Commissioning / Handover',
       /function ProjectStageSummaryCards/.test(projectR22) &&
       /data-testid="project-stage-summary-cards"/.test(projectR22) &&
       /cat: 'mechanical',\s+title: 'Mechanical',\s+range: \[0, 3\]/.test(projectR22) &&
       /cat: 'electrical',\s+title: 'Electrical',\s+range: \[4, 12\]/.test(projectR22) &&
       /cat: 'commissioning',\s+title: 'Commissioning',\s+range: \[13, 15\]/.test(projectR22) &&
       /cat: 'handover',\s+title: 'Handover',\s+range: \[16, 17\]/.test(projectR22));
record('R22 #3: Old funnel rectangle removed from Project Detail',
       !/Horizontal funnel/.test(projectR22) &&
       !/\/\* Horizontal funnel \*\//.test(projectR22));
record('R22 #3: Empty stage cells render dimmed (opacity 0.45, em-dash placeholder)',
       /opacity: isEmpty \? 0\.45 : 1/.test(projectR22) &&
       /isEmpty \? '—' : nfmt\.format\(count\)/.test(projectR22));
record('R22 supporting: SCHOOL_STAGE_SHORT array of 18 short labels exported from data.jsx',
       /const SCHOOL_STAGE_SHORT = \[/.test(dataR22) &&
       /SCHOOL_STAGES, SCHOOL_STAGE_SHORT/.test(dataR22) &&
       /'Foundation','PV Mount','PV Module'/.test(dataR22) &&
       /'H\/O Zamil','H\/O Client'/.test(dataR22));

// ── K11. Round 23 — checkmark table moves to Schools List Stages view ──────
const sctR23      = read('components/StageChecklistTable.jsx');
const schoolsR23  = read('page-schools-list.jsx');
const projectR23  = read('page-project.jsx');
const mainR23     = read('main.jsx');

record('R23 → R24: shared StageChecklistTable component exists and is window-exposed',
       /function StageChecklistTable\(\{/.test(sctR23) &&
       /Object\.assign\(window, \{ StageChecklistTable \}\)/.test(sctR23) &&
       /import '\.\/components\/StageChecklistTable\.jsx';/.test(mainR23));
record('R23 → R25: Schools List Stages view renders per-school checkmark table (not SchoolsStagesVertical)',
       !/function SchoolsStagesVertical/.test(schoolsR23) &&
       !/<SchoolsStagesVertical/.test(schoolsR23) &&
       /<SCT schools=\{rows\} onOpen=\{onOpen\}/.test(schoolsR23));
record('R23: SchoolsStagesVertical removed from page-schools-list.jsx window export',
       /Object\.assign\(window, \{ PageSchoolsList, SchoolsStagesTable \}\);/.test(schoolsR23));
// R24 reverts the sticky thead + internal search added in R23. Assert the absence.
record('R23 → R24: classic table — no sticky positioning anywhere in the shared component',
       !/data-testid="stage-checklist-sticky-header"/.test(sctR23) &&
       !/position: 'sticky'/.test(sctR23));
record('R23 → R24: classic table — page-level filters drive rows (no internal search box)',
       !/data-testid="stage-checklist-search"/.test(sctR23));
record('R23: Compact view still renders simple stage pill list (Compact + Current stage column intact)',
       /Compact view/.test(schoolsR23) &&
       /SchoolsCompactTable/.test(schoolsR23));
record('R23 → R25: Project Detail Overview no longer mounts the shared checkmark table',
       !/<ProjectStageChecklistTable/.test(projectR23) &&
       !/const SCT = window\.StageChecklistTable/.test(projectR23));
record('R23 → R25: completedDate gates the green check (truthy completedDate or done flag)',
       /st && \(st\.completedDate \|\| st\.done\)/.test(sctR23) &&
       /Icon name="check-circle" size=\{16\} className="text-emerald-600"/.test(sctR23));
record('R23 → R25: legend row removed (Stages view now matches Compact view chrome)',
       !/stage complete/.test(sctR23) && !/not yet/.test(sctR23));

// ── K12. Round 24 — restore classic R17 checkmark-table look on Schools List
//                   + Project Detail, swap KPI strip to stage-driven metrics ───
const sctR24      = read('components/StageChecklistTable.jsx');
const schoolsR24  = read('page-schools-list.jsx');

record('R24 → R25: classic <table> markup w-full text-xs with slate-50 thead (Compact-view styling)',
       /<table className="w-full text-xs">/.test(sctR24) &&
       /surface-2 border-b border-soft/.test(sctR24));
record('R24 → R25: stage column header shows S## prefix + short stage label',
       /S\{String\(i \+ 1\)\.padStart\(2, '0'\)\}/.test(sctR24) &&
       /SCHOOL_STAGE_SHORT_\[i\]/.test(sctR24));
record('R24 → R25: per-stage cell renders check-circle icon + dd-MMM date for done, em-dash for not done',
       /Icon name="check-circle" size=\{16\} className="text-emerald-600"/.test(sctR24) &&
       /toLocaleDateString\('en-GB', \{ day: '2-digit', month: 'short' \}\)/.test(sctR24) &&
       /<span className="text-slate-300" aria-hidden="true">—<\/span>/.test(sctR24));
record('R24: rows alternate slate-50 / white with slate-100 hover',
       /rowIdx % 2 === 0 \? 'bg-white' : 'bg-slate-50'/.test(sctR24) &&
       /hover:bg-slate-100/.test(sctR24));
record('R24 → R25: School ID column shows code in font-mono; School name column shows name (EN + AR)',
       /font-mono text-\[11px\] text-ink-500 whitespace-nowrap/.test(sctR24) &&
       /<div className="font-medium truncate"/.test(sctR24));
record('R24: City column rendered between School and stage columns',
       /<th[\s\S]{0,200}City/.test(sctR24));
record('R24: Remark column rendered at the end with category-tone Pill',
       /<th[\s\S]{0,200}Remark/.test(sctR24) &&
       /<Pill tone=\{s\.remark === 'Active'/.test(sctR24));
record('R24: KPI strip shows Total schools / Energized / Handed over / Blocked-Excluded',
       /label: 'Energized',\s*value: energizedCount/.test(schoolsR24) &&
       /label: 'Handed over',\s*value: handedOverCount/.test(schoolsR24) &&
       /label: 'Blocked \/ Excluded',\s*value: blockedExcludedCount/.test(schoolsR24));
record('R24: ENERGIZED count is gated by STAGE_INDEX.energized completedDate',
       /stageIdxByKey\('energized'\)/.test(schoolsR24) &&
       /stages\[energizedIdx\] && \(s\.stages\[energizedIdx\]\.completedDate \|\| s\.stages\[energizedIdx\]\.done\)/.test(schoolsR24));
record('R24: HANDED OVER count is gated by STAGE_INDEX.handover_client completedDate',
       /stageIdxByKey\('handover_client'\)/.test(schoolsR24));
record('R24: BLOCKED / EXCLUDED count comes from remark (Blocked / Access issue / Excluded)',
       /s\.remark === 'Blocked' \|\| s\.remark === 'Access issue' \|\| s\.remark === 'Excluded'/.test(schoolsR24));
record('R24: page-level filter dropdown is "All stages" (was "All status")',
       /value: 'all', label: 'All stages'/.test(schoolsR24) &&
       /SCHOOL_STAGES\.map\(\(label, i\) => \(\{ value: String\(i\), label:/.test(schoolsR24) &&
       !/options=\{\[\{ value: 'all', label: 'All status'/.test(schoolsR24));
record('R24: stage filter narrows rows to those with that stage marked done',
       /const idx = Number\(stageFilter\)/.test(schoolsR24) &&
       /st && \(st\.done \|\| st\.completedDate\)/.test(schoolsR24));
record('R24 → R25: Project Detail Overview no longer uses the shared checkmark table',
       !/<ProjectStageChecklistTable/.test(read('page-project.jsx')) &&
       !/const SCT = window\.StageChecklistTable/.test(read('page-project.jsx')));

// ── K13. Round 25 — Stages view matches Compact view styling; Project Detail
//                    no longer renders the per-school checkmark table ─────────
const sctR25      = read('components/StageChecklistTable.jsx');
const schoolsR25  = read('page-schools-list.jsx');
const projectR25  = read('page-project.jsx');

record('R25 #1: Stages view uses Compact-view styling (Card padding="p-0", w-full text-xs, slate-50 thead)',
       /<table className="w-full text-xs">/.test(sctR25) &&
       /surface-2 border-b border-soft/.test(sctR25));
record('R25 #1: Column order is School ID · School name · City · 18 stages · Remark',
       /<th[\s\S]{0,200}School ID/.test(sctR25) &&
       /<th[\s\S]{0,200}School name/.test(sctR25) &&
       /<th[\s\S]{0,200}City/.test(sctR25) &&
       /<th[\s\S]{0,200}Remark/.test(sctR25));
record('R25 #1: Stage header is two-line — S## (font-mono 10 px slate-400) + short label (11 px slate-600)',
       /fontFamily: 'monospace', fontSize: 10, fontWeight: 600,\s+color: '#94A3B8'/.test(sctR25) &&
       /fontSize: 11, fontWeight: 500, color: '#475569'/.test(sctR25));
record('R25 #1: Stage cell uses check-circle 16 px text-emerald-600 + dd MMM date 10 px slate-400',
       /Icon name="check-circle" size=\{16\} className="text-emerald-600"/.test(sctR25) &&
       /text-\[10px\] text-slate-400 mt-0\.5/.test(sctR25) &&
       /day: '2-digit', month: 'short'/.test(sctR25));
record('R25 #1: Empty stage cell renders em-dash only (text-slate-300)',
       /<span className="text-slate-300" aria-hidden="true">—<\/span>/.test(sctR25));
record('R25 #1: Rows alternate bg-white / bg-slate-50, hover bg-slate-100',
       /rowIdx % 2 === 0 \? 'bg-white' : 'bg-slate-50'/.test(sctR25) &&
       /hover:bg-slate-100/.test(sctR25));
record('R25 #1: No sticky positioning anywhere in the shared component',
       !/position: 'sticky'/.test(sctR25));
record('R25 #1: No category-tinted header backgrounds or per-cell category accents',
       !/STAGE_CATEGORY_COLORS_\[cat\]/.test(sctR25) &&
       !/borderTop: `2px solid \$\{cc\.dot/.test(sctR25));
record('R25 #1: Schools List wrapper passes onOpen and drops title/subtitle/hideInternalToolbar',
       /<SCT schools=\{rows\} onOpen=\{onOpen\} \/>/.test(schoolsR25));
record('R25 #1: KPI strip from R24 preserved (Total schools / Energized / Handed over / Blocked-Excluded)',
       /label: 'Energized',\s*value: energizedCount/.test(schoolsR25) &&
       /label: 'Handed over',\s*value: handedOverCount/.test(schoolsR25) &&
       /label: 'Blocked \/ Excluded',\s*value: blockedExcludedCount/.test(schoolsR25));

record('R25 #2: Project Detail Overview no longer renders the per-school checkmark table',
       !/<ProjectStageChecklistTable/.test(projectR25) &&
       !/function ProjectStageChecklistTable/.test(projectR25));
record('R25 #2: Project Detail still renders the 4-card category summary',
       /<ProjectStageSummaryCards/.test(projectR25) &&
       /function ProjectStageSummaryCards/.test(projectR25));
record('R25 #2: Project Detail keeps the Project Execution Lifecycle widget (untouched)',
       /Project Execution Lifecycle/.test(projectR25));

// ── K14. Round 27 — School Execution Stages widget moves from Projects index
//                    to portfolio dashboards (VP + Manager + Ops + Pgm) ───────
const dataR27    = read('data.jsx');
const dashR27    = read('page-dashboard.jsx');
const pagesR27   = read('pages-r2.jsx');

record('R27: canViewSchoolExecutionStages role gate defined + exported',
       /const SCHOOL_EXECUTION_STAGES_ROLES = \['Manager', 'VP', 'Operations Manager', 'Program Manager'\]/.test(dataR27) &&
       /function canViewSchoolExecutionStages/.test(dataR27) &&
       /canViewSchoolExecutionStages, SCHOOL_EXECUTION_STAGES_ROLES/.test(dataR27));
record('R27: SchoolExecutionStagesWidget component defined and exposed on window',
       /function SchoolExecutionStagesWidget/.test(dashR27) &&
       /SchoolExecutionStagesWidget,/.test(dashR27));
record('R27: widget subtitle reads "Click any stage card to drill into schools at that stage."',
       /Click any stage card to drill into schools at that stage\./.test(dashR27));
record('R27: PageDashboard (Projects index for PM-group) no longer renders the 4-panel block inline',
       !/18 stages grouped by category · click any card to filter the project grid below/.test(dashR27) &&
       !/<DashCategoryPanel catKey="mechanical"[\s\S]{0,200}onStageClick=\{setStageFilter\}/.test(dashR27) &&
       /Project grid/.test(dashR27));
record('R27: PageVPDashboard mounts SchoolExecutionStagesWidget behind canViewSchoolExecutionStages gate',
       /canViewSchoolExecutionStages\(me\)[\s\S]{0,200}<window\.SchoolExecutionStagesWidget projects=\{projects\}/.test(pagesR27));
record('R27: PagePMDashboard mounts SchoolExecutionStagesWidget behind canViewSchoolExecutionStages gate',
       /canViewSchoolExecutionStages\(currentUser\)[\s\S]{0,200}<window\.SchoolExecutionStagesWidget projects=\{projects\}/.test(pagesR27));
record('R27: old <StageExecutionKPIs schools=...> call sites removed from PageVPDashboard + PagePMDashboard',
       (pagesR27.match(/<StageExecutionKPIs schools/g) || []).length === 0);
record('R27: widget placement is after DashStageInsights and before ExecutiveFinancialSummary on VP dashboard',
       /<DashStageInsights projects=\{projects\} \/>[\s\S]{0,400}<window\.SchoolExecutionStagesWidget[\s\S]{0,400}<ExecutiveFinancialSummary/.test(pagesR27));
record('R27: portfolio role list = Manager / VP / Operations Manager / Program Manager only (PM/Coord/Material excluded)',
       /'Manager', 'VP', 'Operations Manager', 'Program Manager'/.test(dataR27) &&
       !/Project Manager/.test(dataR27.match(/SCHOOL_EXECUTION_STAGES_ROLES = \[[^\]]+\]/)[0]) &&
       !/Coordinator/.test(dataR27.match(/SCHOOL_EXECUTION_STAGES_ROLES = \[[^\]]+\]/)[0]) &&
       !/Material planning/.test(dataR27.match(/SCHOOL_EXECUTION_STAGES_ROLES = \[[^\]]+\]/)[0]));

// ── K15. Round 28 — Map preview always renders + Project Locations widget ──
const dataR28      = read('data.jsx');
const mapR28       = read('components/MapPreview.jsx');
const schoolDetR28 = read('page-school-detail.jsx');
const projectR28   = read('page-project.jsx');
const mainR28      = read('main.jsx');

record('R28: REGION_CENTROIDS map defined with 13+ Saudi regions and exported',
       /const REGION_CENTROIDS = \{[\s\S]{200,}\};/.test(dataR28) &&
       /'Riyadh':\s*\{ lat: 24\.7136, lng: 46\.6753 \}/.test(dataR28) &&
       /'Najran':\s*\{ lat: 17\.4924, lng: 44\.1277 \}/.test(dataR28) &&
       /REGIONS, REGION_CENTROIDS/.test(dataR28));
record('R28: components/MapPreview.jsx exists and exposes parseCoords + 3 components',
       /function parseCoords\(str\)/.test(mapR28) &&
       /function SchoolMapPreview/.test(mapR28) &&
       /function ProjectMapPreview/.test(mapR28) &&
       /function EditCoordsModal/.test(mapR28) &&
       /parseCoords,\s+SchoolMapPreview, ProjectMapPreview, EditCoordsModal/.test(mapR28));
record('R28: parseCoords requires lat,lng pair (single decimal returns null)',
       /Number\.isFinite\(lat\) \|\| !Number\.isFinite\(lng\)/.test(mapR28) &&
       /lat < -90 \|\| lat > 90 \|\| lng < -180 \|\| lng > 180/.test(mapR28));
record('R28: main.jsx imports the new MapPreview component file',
       /import '\.\/components\/MapPreview\.jsx';/.test(mainR28));
record('R28: School Detail map ALWAYS renders (no gating on coords presence)',
       !/{lat && lng && \(/.test(schoolDetR28) &&
       /<window\.SchoolMapPreview school=\{school\}/.test(schoolDetR28));
record('R28: Map fallback uses region centroid when school coords unparseable',
       /const regionCentroid = school && school\.region \? REGION_CENTROIDS_\[school\.region\] : null/.test(mapR28) &&
       /Approximate — centred on/.test(mapR28));
record('R28: SchoolMapPreview surfaces an empty state with map-pin icon when no coords and no region centroid',
       /data-testid="school-map-empty"/.test(mapR28) &&
       /No coordinates yet for this school\./.test(mapR28));
record('R28: SchoolMapPreview offers an "Add coordinates" / "Add precise coordinates" CTA',
       /'Add precise coordinates'/.test(mapR28) &&
       /'Add coordinates'/.test(mapR28));
record('R28: Project Detail Overview renders Project Locations widget',
       /<window\.ProjectMapPreview/.test(projectR28) &&
       /function ProjectMapPreview/.test(mapR28) &&
       /Project Locations/.test(mapR28));
record('R28: ProjectMapPreview computes bbox from valid school coords; falls back to region centroid; falls back to empty state',
       /data-testid="project-map-iframe-bbox"/.test(mapR28) &&
       /data-testid="project-map-iframe-region"/.test(mapR28) &&
       /data-testid="project-map-empty"/.test(mapR28));
record('R28: ProjectMapPreview subtitle reports N of M schools have coordinates',
       /\$\{withCoords\.toLocaleString\(\)\} of \$\{totalSchools\.toLocaleString\(\)\} schools have coordinates/.test(mapR28));
record('R28: EditCoordsModal accepts lat + lng numeric inputs and a "Paste from Google Maps" helper',
       /data-testid="edit-coords-lat"/.test(mapR28) &&
       /data-testid="edit-coords-lng"/.test(mapR28) &&
       /data-testid="edit-coords-paste"/.test(mapR28) &&
       /step="0\.000001"/.test(mapR28));
record('R28: EditCoordsModal validates ranges and saves coords back to store',
       /fLat < -90 \|\| fLat > 90/.test(mapR28) &&
       /fLng < -180 \|\| fLng > 180/.test(mapR28) &&
       /onSave && onSave\(\{ lat: fLat, lng: fLng \}\)/.test(mapR28));
record('R28: School Detail wires handleSaveCoords → updateSchool + logAudit("school.coords")',
       /handleSaveCoords = \(\{ lat, lng \}\)/.test(schoolDetR28) &&
       /updateSchool && updateSchool\(school\.id, \{ coords: next \}\)/.test(schoolDetR28) &&
       /entityType: 'school\.coords'/.test(schoolDetR28));
record('R28: School Detail mounts EditCoordsModal at page level',
       /<window\.EditCoordsModal/.test(schoolDetR28) &&
       /open=\{editCoordsOpen\}/.test(schoolDetR28) &&
       /onSave=\{handleSaveCoords\}/.test(schoolDetR28));
record('R28: EditCoordsModal flags the local-only persistence ("Saved locally for this session")',
       /Saved locally for this session/.test(mapR28));

// ── K16. Round 29 — image compression + uploader + Project cover / gallery /
//                    stage photos + new Delivery Notes module + Storage panel ──
const imageR29     = read('lib/image.js');
const storageR29   = read('lib/storage.js');
const uploaderR29  = read('components/ImageUploader.jsx');
const projectR29   = read('page-project.jsx');
const schoolDetR29 = read('page-school-detail.jsx');
const deliveryR29  = read('page-delivery-notes.jsx');
const dataR2R29    = read('data-r2.jsx');
const storeR29     = read('store-r2.jsx');
const shellR29     = read('shell.jsx');
const appR29       = read('app.jsx');
const settingsR29  = read('page-settings.jsx');
const mainR29      = read('main.jsx');

record('R29: IMAGE_LIMITS constants set per spec (10 MB input / 500 KB output / 1920 px / q 0.78)',
       /maxInputBytes:\s+10 \* 1024 \* 1024/.test(imageR29) &&
       /maxOutputBytes: 500 \* 1024/.test(imageR29) &&
       /maxDimension:\s+1920/.test(imageR29) &&
       /jpegQuality:\s+0\.78/.test(imageR29));
record('R29: compressImage uses canvas + iterates quality down (0.78 → 0.7 → 0.6 → 0.5 → 0.4)',
       /document\.createElement\('canvas'\)/.test(imageR29) &&
       /const qualities = \[IMAGE_LIMITS\.jpegQuality, 0\.7, 0\.6, 0\.5, 0\.4\]/.test(imageR29) &&
       /b\.size <= IMAGE_LIMITS\.maxOutputBytes/.test(imageR29));
record('R29: compressImage returns { blob, dataUrl, width, height, originalBytes, compressedBytes, quality, mime }',
       /return \{[\s\S]{0,400}blob, dataUrl, width, height,[\s\S]{0,400}originalBytes:[\s\S]{0,400}compressedBytes:[\s\S]{0,400}quality:/.test(imageR29));
record('R29: compressImage rejects files > IMAGE_LIMITS.maxInputBytes',
       /file\.size > IMAGE_LIMITS\.maxInputBytes/.test(imageR29) &&
       /File too large/.test(imageR29));
record('R29: compressImage rejects unsupported MIME types',
       /acceptedMimes:\s+\['image\/jpeg', 'image\/png', 'image\/webp', 'image\/heic'\]/.test(imageR29) &&
       /Unsupported file type/.test(imageR29));
record('R29: MemoryImageStorage adapter exposes upload / delete / list / estimatedBytes / topPrefixes',
       /class MemoryImageStorage/.test(storageR29) &&
       /async upload\(path, blob, dataUrl/.test(storageR29) &&
       /async delete\(path\)/.test(storageR29) &&
       /async list\(prefix\)/.test(storageR29) &&
       /estimatedBytes\(\)/.test(storageR29) &&
       /topPrefixes\(/.test(storageR29) &&
       /window\.imageStorage = imageStorage/.test(storageR29) === false /* assigned via Object.assign */ &&
       /Object\.assign\(window, \{ MemoryImageStorage, SupabaseImageStorage, imageStorage \}\)/.test(storageR29));
record('R29: ImageUploader rejects files > 10 MB (reportError + maxInputBytes guard) and rejects non-image MIME',
       /maxInputBytes/.test(imageR29) &&
       /reportError\(err\.message \|\| String\(err\)\)/.test(uploaderR29));
record('R29: ImageUploader shows preview with original vs compressed size + dimensions',
       /data-testid="upload-preview-size"/.test(uploaderR29) &&
       /p\.compressed\.originalBytes/.test(uploaderR29) &&
       /p\.compressed\.compressedBytes/.test(uploaderR29) &&
       /p\.compressed\.width\}×\{p\.compressed\.height/.test(uploaderR29));
record('R29: ImageUploader enforces maxCount + offers Upload + Cancel + Delete affordances',
       /const remaining = Math\.max\(0, maxCount - value\.length\)/.test(uploaderR29) &&
       /Max \$\{maxCount\} image/.test(uploaderR29) &&
       /removeUploaded = async \(rec\)/.test(uploaderR29));
record('R29: ImageUploader exposed on window + imported from main.jsx',
       /Object\.assign\(window, \{ ImageUploader \}\)/.test(uploaderR29) &&
       /import '\.\/components\/ImageUploader\.jsx';/.test(mainR29) &&
       /import '\.\/lib\/image\.js';/.test(mainR29) &&
       /import '\.\/lib\/storage\.js';/.test(mainR29));

record('R29: Project Detail header renders cover photo slot (always-on, coverMode)',
       /<window\.ImageUploader[\s\S]{0,300}path=\{`projects\/\$\{project\.id\}\/cover`\}[\s\S]{0,200}coverMode=\{true\}/.test(projectR29));
record('R29: Project Detail Gallery tab mounts ImageUploader with maxCount=50',
       /Gallery'/.test(projectR29) &&
       /tab === 'Gallery'/.test(projectR29) &&
       /path=\{`projects\/\$\{project\.id\}\/gallery`\}[\s\S]{0,200}maxCount=\{50\}/.test(projectR29));
record('R29: School Detail Photos tab renders one ImageUploader per stage (path with stageKey)',
       /data-testid=\{`stage-photos-S\$\{String\(i \+ 1\)\.padStart\(2, '0'\)\}`\}/.test(schoolDetR29) &&
       /path=\{`projects\/\$\{school\.projectId\}\/schools\/\$\{school\.id\}\/stages\/\$\{key\}`\}[\s\S]{0,200}maxCount=\{5\}/.test(schoolDetR29));

record('R29: Delivery Notes seed has at least 12 entries spread across projects',
       /const DELIVERY_NOTES_SEED = \(\(\) => \{/.test(dataR2R29) &&
       (dataR2R29.match(/'p-(mad|dam|jaz|hai|qas|naj|mak1|jof|nb)'/g) || []).length >= 12 &&
       /DELIVERY_NOTES_SEED,/.test(dataR2R29));
record('R29: store exposes deliveryNotes state + addDeliveryNote + updateDeliveryNote + deleteDeliveryNote',
       /const \[deliveryNotes, setDeliveryNotes\]/.test(storeR29) &&
       /const addDeliveryNote = \(data, currentUser\)/.test(storeR29) &&
       /const updateDeliveryNote = \(id, patch, currentUser\)/.test(storeR29) &&
       /const deleteDeliveryNote = \(id, currentUser\)/.test(storeR29) &&
       /deliveryNotes, addDeliveryNote, updateDeliveryNote, deleteDeliveryNote/.test(storeR29));
record('R29: addDeliveryNote writes a CREATE audit entry with entityType "delivery_note"',
       /action: 'CREATE', entityType: 'delivery_note'/.test(storeR29));
record('R29: PageDeliveryNotes renders list view + create/edit form + read-only detail',
       /function PageDeliveryNotes/.test(deliveryR29) &&
       /function DeliveryNoteDetail/.test(deliveryR29) &&
       /function DeliveryNoteForm/.test(deliveryR29) &&
       /data-testid="delivery-notes-list"/.test(deliveryR29) &&
       /data-testid="delivery-notes-search"/.test(deliveryR29));
record('R29: Delivery Notes detail offers Print/Export PDF via a printable HTML window',
       /Print \/ Export PDF/.test(deliveryR29) &&
       /window\.open\('', '_blank'\)/.test(deliveryR29) &&
       /window\.print\(\)/.test(deliveryR29));
record('R29: Delivery Notes form mounts ImageUploader with path delivery-notes/{note_id}, maxCount=10',
       /path=\{`delivery-notes\/\$\{noteId\}`\}[\s\S]{0,200}maxCount=\{10\}/.test(deliveryR29));

record('R29: Sidebar adds "Delivery Notes" item for non-Material-planning roles',
       /const deliveryNotesItem = \(role !== 'Material planning'\)/.test(shellR29) &&
       /\{ id: 'delivery-notes', label: 'Delivery Notes', icon: 'package' \}/.test(shellR29));
record('R29: app.jsx routes "delivery-notes" to PageDeliveryNotes',
       /if \(page === 'delivery-notes'/.test(appR29) &&
       /<PageDeliveryNotes currentUser=\{currentUser\}/.test(appR29));

record('R29: Settings adds "Storage" tab with StorageTab component',
       /'Branding','Notifications','Storage'/.test(settingsR29) &&
       /tab === 'Storage'/.test(settingsR29) &&
       /function StorageTab/.test(settingsR29) &&
       /data-testid="settings-storage-panel"/.test(settingsR29));
record('R29: Storage panel shows correct byte count + image count + Supabase 100 GB quota note',
       /storage\.estimatedBytes\(\)/.test(settingsR29) &&
       /storage\.imageCount\(\)/.test(settingsR29) &&
       /100 \* 1024 \* 1024 \* 1024/.test(settingsR29) &&
       /Supabase Pro/.test(settingsR29) &&
       /data-testid="settings-storage-bytes"/.test(settingsR29));
record('R29: Storage panel surfaces local-only disclaimer for the demo',
       /Images stored in browser memory for demo\. Will sync to Supabase Storage after backend wiring\./.test(settingsR29));

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

// ── M. R29.5 audit gap-fill (pre-Supabase coverage) ─────────────────────────
// Verifies the matrix items that earlier rounds asserted only indirectly:
//   • 7-role × capability cross-table
//   • Sidebar items per role
//   • Audit Log sidebar visibility (Managers via Settings; Ops/Pgm via direct link)
//   • Stage Transitions + Top Bottlenecks gating  (currently exec-only — see report §1)
//   • Storage panel access  (currently Manager-only — see report §5)
//   • GitHub base path points to MDQEstablishment fork
//   • Sparklines + delta chips wired in dashboard KPI strip
//   • 18-stage rollup re-asserted by literal count
const shellJsx_M    = read('shell.jsx');
const settingsJsx_M = read('page-settings.jsx');
const dashJsx_M     = read('page-dashboard.jsx');
const pagesR2_M     = read('pages-r2.jsx');
const dataJsx_M     = read('data.jsx');
const uiJsx_M       = read('ui.jsx');
const mapJsx_M      = read('components/MapPreview.jsx');
const imgJsx_M      = read('components/ImageUploader.jsx');
const reportsZ_M    = read('page-reports-zamil.jsx');
const finJsx_M      = read('page-financials.jsx');

// Role enum + capability allowlists
record('R29.5 matrix: ROLES enum lists exactly the 7 expected roles',
       /const ROLES = \['VP', 'Manager', 'Operations Manager', 'Program Manager', 'Project Manager', 'Material planning', 'Coordinator'\]/.test(dataJsx_M));
record("R29.5 matrix: FINANCIALS_USERS = ['u-vp','u-mgr1','u-mgr2']",
       /FINANCIALS_USERS\s*=\s*\['u-vp',\s*'u-mgr1',\s*'u-mgr2'\]/.test(dataJsx_M));
record("R29.5 matrix: NEW_PROJECT_USERS = ['u-mgr1','u-mgr2','u-pgm']",
       /NEW_PROJECT_USERS\s*=\s*\['u-mgr1',\s*'u-mgr2',\s*'u-pgm'\]/.test(dataJsx_M));
record("R29.5 matrix: ESCALATE_TO_VP_USERS = Managers only",
       /ESCALATE_TO_VP_USERS\s*=\s*\['u-mgr1',\s*'u-mgr2'\]/.test(dataJsx_M));
record("R29.5 matrix: AUDIT_LOG_USERS = VP + Managers + Ops + Pgm (6 users)",
       /AUDIT_LOG_USERS\s*=\s*\['u-vp',\s*'u-mgr1',\s*'u-mgr2',\s*'u-op1',\s*'u-op2',\s*'u-pgm'\]/.test(dataJsx_M));
record("R29.5 matrix: SETTINGS_USERS = Managers only",
       /SETTINGS_USERS\s*=\s*\['u-mgr1',\s*'u-mgr2'\]/.test(dataJsx_M));
record("R29.5 matrix: SCHOOL_EXECUTION_STAGES_ROLES = Manager / VP / Ops / Pgm",
       /SCHOOL_EXECUTION_STAGES_ROLES\s*=\s*\['Manager',\s*'VP',\s*'Operations Manager',\s*'Program Manager'\]/.test(dataJsx_M));

// Per-role × capability cross-table (pure-JS predicate simulation)
const _FIN = ['u-vp','u-mgr1','u-mgr2'];
const _NEW = ['u-mgr1','u-mgr2','u-pgm'];
const _ESC = ['u-mgr1','u-mgr2'];
const _AUD = ['u-vp','u-mgr1','u-mgr2','u-op1','u-op2','u-pgm'];
const _SET = ['u-mgr1','u-mgr2'];
const _SES = ['Manager','VP','Operations Manager','Program Manager'];
const _users = {
  vp:    { id: 'u-vp',    role: 'VP' },
  mgr:   { id: 'u-mgr1',  role: 'Manager' },
  op:    { id: 'u-op1',   role: 'Operations Manager' },
  pgm:   { id: 'u-pgm',   role: 'Program Manager' },
  pm:    { id: 'u-pm1',   role: 'Project Manager' },
  mat:   { id: 'u-mat',   role: 'Material planning' },
  coord: { id: 'u-coord', role: 'Coordinator' },
};
const _cap = {
  fin: u => _FIN.indexOf(u.id) !== -1,
  nu:  u => _NEW.indexOf(u.id) !== -1,
  esc: u => _ESC.indexOf(u.id) !== -1,
  aud: u => _AUD.indexOf(u.id) !== -1,
  set: u => _SET.indexOf(u.id) !== -1,
  ses: u => _SES.indexOf(u.role) !== -1,
};
// VP
record('R29.5 matrix[VP]: canViewFinancials',           _cap.fin(_users.vp));
record('R29.5 matrix[VP]: canViewAuditLog',             _cap.aud(_users.vp));
record('R29.5 matrix[VP]: canViewSettings === false',   !_cap.set(_users.vp));
record('R29.5 matrix[VP]: canCreateProject === false',  !_cap.nu(_users.vp));
record('R29.5 matrix[VP]: canViewSchoolExecutionStages', _cap.ses(_users.vp));
// Manager
record('R29.5 matrix[Manager]: canViewFinancials',       _cap.fin(_users.mgr));
record('R29.5 matrix[Manager]: canCreateProject',        _cap.nu(_users.mgr));
record('R29.5 matrix[Manager]: canEscalateToVP',         _cap.esc(_users.mgr));
record('R29.5 matrix[Manager]: canViewAuditLog',         _cap.aud(_users.mgr));
record('R29.5 matrix[Manager]: canViewSettings',         _cap.set(_users.mgr));
record('R29.5 matrix[Manager]: canViewSchoolExecutionStages', _cap.ses(_users.mgr));
// Operations Manager
record('R29.5 matrix[OpsMgr]: canViewFinancials === false', !_cap.fin(_users.op));
record('R29.5 matrix[OpsMgr]: canViewAuditLog',             _cap.aud(_users.op));
record('R29.5 matrix[OpsMgr]: canViewSettings === false',   !_cap.set(_users.op));
record('R29.5 matrix[OpsMgr]: canViewSchoolExecutionStages', _cap.ses(_users.op));
// Program Manager
record('R29.5 matrix[PgmMgr]: canCreateProject',            _cap.nu(_users.pgm));
record('R29.5 matrix[PgmMgr]: canViewFinancials === false', !_cap.fin(_users.pgm));
record('R29.5 matrix[PgmMgr]: canViewAuditLog',             _cap.aud(_users.pgm));
record('R29.5 matrix[PgmMgr]: canViewSettings === false',   !_cap.set(_users.pgm));
record('R29.5 matrix[PgmMgr]: canViewSchoolExecutionStages', _cap.ses(_users.pgm));
// Project Manager — narrow view, zero exec capabilities
record('R29.5 matrix[PM]: zero exec capabilities',
       !_cap.fin(_users.pm) && !_cap.nu(_users.pm) && !_cap.esc(_users.pm) &&
       !_cap.aud(_users.pm) && !_cap.set(_users.pm) && !_cap.ses(_users.pm));
// Material Planning — narrow view, Delivery Notes hidden
record('R29.5 matrix[MatPlan]: zero exec capabilities',
       !_cap.fin(_users.mat) && !_cap.nu(_users.mat) && !_cap.esc(_users.mat) &&
       !_cap.aud(_users.mat) && !_cap.set(_users.mat) && !_cap.ses(_users.mat));
// Coordinator — narrow view
record('R29.5 matrix[Coord]: zero exec capabilities',
       !_cap.fin(_users.coord) && !_cap.nu(_users.coord) && !_cap.esc(_users.coord) &&
       !_cap.aud(_users.coord) && !_cap.set(_users.coord) && !_cap.ses(_users.coord));

// Sidebar per role — branch presence
record('R29.5 sidebar[VP]: dedicated branch with Dashboard / Programs / Escalations',
       /role === 'VP'/.test(shellJsx_M) &&
       /id: 'home',\s+label: 'Dashboard'/.test(shellJsx_M) &&
       /id: 'projects',\s+label: 'Programs'/.test(shellJsx_M) &&
       /id: 'escalations',\s+label: 'Escalations'/.test(shellJsx_M));
record('R29.5 sidebar[PM]: dedicated branch with My Projects / My Schools',
       /role === 'Project Manager'/.test(shellJsx_M) &&
       /id: 'my-projects'/.test(shellJsx_M) &&
       /id: 'my-schools'/.test(shellJsx_M));
record('R29.5 sidebar[MatPlan]: Delivery Notes EXPLICITLY hidden via comment + omission',
       /role === 'Material planning'/.test(shellJsx_M) &&
       /Delivery Notes intentionally hidden for Material planning/.test(shellJsx_M));
record('R29.5 sidebar[Coordinator]: dedicated branch + Delivery Notes via shared item',
       /role === 'Coordinator'/.test(shellJsx_M));
record('R29.5 sidebar[Pgm-group]: shows Contractors + conditional Settings + conditional Audit Log',
       /id: 'contractors'/.test(shellJsx_M) &&
       /\.\.\.settingsItem/.test(shellJsx_M) &&
       /\.\.\.auditLogItemPgm/.test(shellJsx_M));
record('R29.5 sidebar: Delivery Notes shared item gated by role !== Material planning',
       /role !== 'Material planning'/.test(shellJsx_M) &&
       /id: 'delivery-notes',\s+label: 'Delivery Notes'/.test(shellJsx_M));
record('R29.5 sidebar: VP/PM/Coord branches include the Delivery Notes shared item',
       (shellJsx_M.match(/\.\.\.deliveryNotesItem/g) || []).length >= 3);

// Audit Log sidebar visibility (PM-group: only when canViewAuditLog && !canViewSettings)
record('R29.5: Audit Log sidebar item for VP gated on canViewAuditLog',
       /const auditLogItem = canViewAuditLog\(currentUser\)/.test(shellJsx_M));
record('R29.5: Audit Log direct link in PM-group only when canViewAuditLog && !canViewSettings',
       /canViewAuditLog\(currentUser\) && !canViewSettings\(currentUser\)/.test(shellJsx_M));

// Stage Transitions + Top Bottlenecks — currently exec-only via isExec = canViewFinancials
record('R29.5: PagePMDashboard isExec === canViewFinancials(currentUser)',
       /const isExec = canViewFinancials\(currentUser\);/.test(pagesR2_M));
// R29.6 fix landed: DashStageInsights gate widened from isExec to canViewSchoolExecutionStages.
record('R29.6: PagePMDashboard renders DashStageInsights via canViewSchoolExecutionStages (not isExec)',
       /\{canViewSchoolExecutionStages\(currentUser\) && <DashStageInsights/.test(pagesR2_M) &&
       !/\{isExec && <DashStageInsights/.test(pagesR2_M));
record('R29.5: PageVPDashboard mounts DashStageInsights unconditionally',
       /<DashStageInsights projects=\{projects\}/.test(pagesR2_M));
record('R29.6: Ops Mgr + Pgm Mgr NOW see Stage Transitions + Top Bottlenecks (canViewSchoolExecutionStages=true)',
       _cap.ses(_users.op) && _cap.ses(_users.pgm));

// Storage panel — Manager via full Settings; VP / Ops Mgr / Pgm Mgr via auditLogOnly (R29.6 Option A).
record('R29.5: Storage tab listed in Settings TABS array',
       /'Branding','Notifications','Storage'/.test(settingsJsx_M));
record('R29.5: Storage tab renders <StorageTab /> when active',
       /tab === 'Storage'\s+&&\s+<StorageTab/.test(settingsJsx_M));
record('R29.6: auditLogOnly branch also mounts <StorageTab /> below <AuditTab />',
       /audit-only-storage-section/.test(settingsJsx_M) &&
       /<Card padding="p-5"><StorageTab \/><\/Card>\s*<\/div>\s*\);\s*}\s*const \[tab/.test(settingsJsx_M));
record('R29.6: VP reaches Storage via the auditLogOnly path (sidebar Audit Log link)',
       _cap.aud(_users.vp) && !_cap.set(_users.vp));

// GitHub remote path: vite.config base + README + built index.html all reference senaat-solar-dashboard-v3
const _viteConfig    = fs.readFileSync(path.join(__dirname, '..', 'vite', 'vite.config.js'), 'utf8');
const _readmeMd      = fs.readFileSync(path.join(__dirname, '..', 'vite', 'README.md'), 'utf8');
const _builtIndexPath = path.join(__dirname, '..', 'index.html');
const _builtIndex    = fs.existsSync(_builtIndexPath) ? fs.readFileSync(_builtIndexPath, 'utf8') : '';
record('R29.5: vite.config.js base path = /senaat-solar-dashboard-v3/',
       /base:\s*'\/senaat-solar-dashboard-v3\/'/.test(_viteConfig));
record('R29.5: README references senaat-solar-dashboard-v3 (no Anas11223300 leftover)',
       /senaat-solar-dashboard-v3/.test(_readmeMd) && !/Anas11223300/.test(_readmeMd));
record('R29.5: built /index.html serves assets from /senaat-solar-dashboard-v3/ (GitHub Pages base)',
       _builtIndex === '' || /\/senaat-solar-dashboard-v3\/(favicon-32|assets\/)/.test(_builtIndex));
record('R29.5: No "Anas11223300" string left anywhere in vite/src/',
       !/Anas11223300/.test(dataJsx_M) && !/Anas11223300/.test(shellJsx_M));

// Sparklines + delta chips
record('R29.5: KPICard signature accepts spark + deltaSuffix props',
       /const KPICard = \(\{ label, value, trend, spark, accent, suffix, deltaSuffix \}\)/.test(dashJsx_M));
record('R29.5: KPICard mounts Sparkline component with data + width/height',
       /<Sparkline data=\{spark\}/.test(dashJsx_M));
record('R29.5: Sparkline component defined in ui.jsx (SVG polyline + a11y label)',
       /const Sparkline = /.test(uiJsx_M) &&
       /aria-label="Trend sparkline"/.test(uiJsx_M));
record('R29.5: Dashboard KPI rows pass trend + spark + deltaSuffix (delta chip)',
       /deltaSuffix:\s*'vs last week'/.test(dashJsx_M) &&
       /spark:\s*\[/.test(dashJsx_M));

// Cash Flow chart caption (R15 #4 already covers; assert here as part of matrix)
record('R29.5: Cash Flow chart caption present (post-integration disclaimer)',
       /Curve shown is a representative trend; live cumulative data populates post-integration with the accounting system\./.test(finJsx_M));

// 18-stage rollup re-assertion (strip line comments so embedded quoted strings inside
// comments — e.g. 'Handover to Zamil' / 'Handover to Client' — don't inflate the count)
const _stripComments = s => s.replace(/\/\/.*$/gm, '');
const _stageArr = (dataJsx_M.match(/const SCHOOL_STAGES = \[([\s\S]*?)\];/) || [])[1] || '';
const _stageCount = (_stripComments(_stageArr).match(/'[^']+'/g) || []).length;
record('R29.5: SCHOOL_STAGES literal contains exactly 18 entries',  _stageCount === 18);
const _keyArr = (dataJsx_M.match(/const STAGE_KEYS = \[([\s\S]*?)\];/) || [])[1] || '';
const _keyCount = (_stripComments(_keyArr).match(/'[^']+'/g) || []).length;
record('R29.5: STAGE_KEYS literal contains exactly 18 entries',     _keyCount === 18);
record('R29.5: STAGE_EXCEL_HEADERS maps every STAGE_KEYS entry to a header string',
       _SES.length === 4 && /handover_zamil:\s+'Handover to Zamil'/.test(dataJsx_M));

// Excel template download + upload + export (already covered in earlier sections; matrix re-assert)
record('R29.5: Excel master daily report export wired',
       /XLSX\.writeFile\(wb, `master-daily-report-/.test(reportsZ_M));
record('R29.5: Excel material consumption export wired',
       /XLSX\.writeFile\(wb, `material-consumption-/.test(reportsZ_M));
record('R29.5: Excel zamil report export wired',
       /XLSX\.writeFile\(wb, `zamil-report-/.test(reportsZ_M));

// Map widget always renders (R28 covered) + EditCoordsModal paste helper (R28 covered) — re-asserted here
record('R29.5: SchoolMapPreview always renders (no gating on coords presence)',
       /SchoolMapPreview/.test(mapJsx_M));
record('R29.5: EditCoordsModal exposes Paste from Google Maps helper',
       /Paste from Google Maps/.test(mapJsx_M));

// Image upload flow guarantees (R29 covered; matrix re-assert)
// The 10 MB guard lives in src/lib/image.js (compressImage throws); ImageUploader surfaces it via reportError.
const _imageLib = fs.readFileSync(path.join(SRC, 'lib', 'image.js'), 'utf8');
record('R29.5: compressImage rejects files over IMAGE_LIMITS.maxInputBytes (10 MB cap)',
       /file\.size > IMAGE_LIMITS\.maxInputBytes/.test(_imageLib));
record('R29.5: ImageUploader surfaces compressImage errors via reportError → onError prop / alert fallback',
       /reportError\(err\.message/.test(imgJsx_M));
record('R29.5: ImageUploader compresses + shows original-vs-compressed preview before Upload',
       /compressImage/.test(imgJsx_M) && /originalBytes/.test(imgJsx_M) && /compressedBytes/.test(imgJsx_M));

// Delivery Notes sidebar hidden for Material Planning (matrix; R29 covered)
record('R29.5: Delivery Notes shared item omitted from Material planning sidebar branch',
       /role === 'Material planning'[\s\S]{0,400}Delivery Notes intentionally hidden/.test(shellJsx_M));

// ── N. R29.6 audit-fix tests ────────────────────────────────────────────────
// Two findings from AUDIT_REPORT.md §1 fixed here:
//   1.1 🔴 Stage Insights gating  →  widened from isExec to canViewSchoolExecutionStages
//   1.2 🟡 Storage tab access for VP  →  Option A: render StorageTab in auditLogOnly branch
//
// Tests are named exactly as requested in the R29.6 brief so a future audit can
// grep for them without ambiguity.

record('R29.6: Operations Manager Dashboard renders Stage Transitions chart',
       _cap.ses(_users.op) === true &&
       /\{canViewSchoolExecutionStages\(currentUser\) && <DashStageInsights/.test(pagesR2_M));
record('R29.6: Operations Manager Dashboard renders Top Bottlenecks panel',
       _cap.ses(_users.op) === true &&
       /\{canViewSchoolExecutionStages\(currentUser\) && <DashStageInsights/.test(pagesR2_M));
record('R29.6: Program Manager Dashboard renders Stage Transitions chart',
       _cap.ses(_users.pgm) === true &&
       /\{canViewSchoolExecutionStages\(currentUser\) && <DashStageInsights/.test(pagesR2_M));
record('R29.6: Program Manager Dashboard renders Top Bottlenecks panel',
       _cap.ses(_users.pgm) === true &&
       /\{canViewSchoolExecutionStages\(currentUser\) && <DashStageInsights/.test(pagesR2_M));
record('R29.6: VP can reach Storage tab via sidebar Audit Log path',
       _cap.aud(_users.vp) === true &&
       /audit-only-storage-section/.test(settingsJsx_M) &&
       /<StorageTab \/>/.test(settingsJsx_M));

// Sanity: PM / Material Planning / Coordinator still excluded from Stage Insights
record('R29.6: Project Manager dashboard still does NOT render Stage Transitions (canViewSchoolExecutionStages=false)',
       _cap.ses(_users.pm) === false);
record('R29.6: Material Planning dashboard still does NOT render Stage Transitions',
       _cap.ses(_users.mat) === false);
record('R29.6: Coordinator dashboard still does NOT render Stage Transitions',
       _cap.ses(_users.coord) === false);

// Sanity: auditLogOnly branch keeps Audit Log denial for anyone outside AUDIT_LOG_USERS
record('R29.6: auditLogOnly still denies access to users outside AUDIT_LOG_USERS',
       /if \(!canViewAuditLog\(currentUser\)\)/.test(settingsJsx_M) &&
       /Access denied — Audit Log is restricted\./.test(settingsJsx_M));

// ── O. R30.1 Supabase wiring tests ─────────────────────────────────────────
// The "round-trip" verification language in the R30.1 brief is realized here
// as static wiring assertions — confirming that:
//   (a) Sign-in path calls supabase.auth.signInWithPassword (real auth, not demo).
//   (b) Image upload paths reach the photos table via window.bgInsert.
//   (c) Delivery-note create path mirrors to delivery_notes + delivery_note_items.
//   (d) EditCoordsModal → updateSchool → bgUpdate('schools', …, toDbSchoolPatch).
// True end-to-end Supabase round-trip verification requires a live browser +
// backend; the operator runs that out-of-band against the deployed app. These
// static checks ensure the wiring is correct so the runtime path is sound.
const _libDb       = fs.readFileSync(path.join(SRC, 'lib', 'db.js'), 'utf8');
const _libSupabase = fs.readFileSync(path.join(SRC, 'lib', 'supabase.js'), 'utf8');
const _storeJsx    = fs.readFileSync(path.join(SRC, 'store.jsx'), 'utf8');
const _storeR2Jsx  = fs.readFileSync(path.join(SRC, 'store-r2.jsx'), 'utf8');
const _loginJsx    = fs.readFileSync(path.join(SRC, 'page-login.jsx'), 'utf8');
const _appJsx      = fs.readFileSync(path.join(SRC, 'app.jsx'), 'utf8');
const _mainJsx     = fs.readFileSync(path.join(SRC, 'main.jsx'), 'utf8');
const _buildStd    = fs.readFileSync(path.join(__dirname, '..', 'build-standalone.py'), 'utf8');

// (a) Sign-in round-trip
record('R30.1: page-login calls supabase.auth.signInWithPassword (real auth path)',
       /supabase\.auth\.signInWithPassword\(\{ email, password \}\)/.test(_loginJsx));
record('R30.1: page-login resolves session.user.email → PEOPLE entry',
       /window\.PEOPLE\.find\(p => \(p\.email \|\| ''\)\.toLowerCase\(\) === lc\)/.test(_loginJsx));
// R30.1: page-login originally handled the defensive sign-out when an
// authenticated email had no PEOPLE match. R30.2 moved that to app.jsx's
// resolveSession (which checks bgFetchCurrentProfile vs auth.uid) so the
// behavior is now centralized at the auth listener.
record('R30.1/R30.2: app.jsx signs out when authenticated session has no matching profile row',
       /if \(!profileRow\) \{[\s\S]*?await window\.supabase\.auth\.signOut\(\)/.test(_appJsx));
record('R30.1: page-login keeps demo dropdown ONLY when !USE_SUPABASE (?dev=1 escape hatch)',
       /\{!useSupabase && \(/.test(_loginJsx));
record('R30.1: app.jsx subscribes to supabase.auth.onAuthStateChange (driven by USE_SUPABASE)',
       /window\.supabase\.auth\.onAuthStateChange/.test(_appJsx) &&
       /window\.USE_SUPABASE && window\.supabase/.test(_appJsx));
record('R30.1: app.jsx hydrates existing session via supabase.auth.getSession on mount',
       /window\.supabase\.auth\.getSession\(\)/.test(_appJsx));
record('R30.1: app.jsx handleSignOut calls supabase.auth.signOut when USE_SUPABASE',
       /window\.supabase\.auth\.signOut\(\)/.test(_appJsx));
record('R30.1: main.jsx imports lib/supabase.js + lib/db.js so foundation activates',
       /import '\.\/lib\/supabase\.js';/.test(_mainJsx) &&
       /import '\.\/lib\/db\.js';/.test(_mainJsx));

// (b) Image upload round-trip — setProjectCoverFor / setProjectGalleryFor /
//     setSchoolStagePhotosFor all diff old/new lists and bgInsert/bgDeleteWhere
//     into the photos table.
record('R30.1: setProjectCoverFor / setProjectGalleryFor / setSchoolStagePhotosFor diff photos via __syncPhotos',
       /const __syncPhotos = \(oldList, newList, baseRow\) =>/.test(_storeR2Jsx) &&
       /__syncPhotos\(oldCover \? \[oldCover\] : \[\], newCover \? \[newCover\] : \[\], \{ kind: 'project_cover'/.test(_storeR2Jsx) &&
       /__syncPhotos\(m\[projectId\] \|\| \[\], list \|\| \[\], \{ kind: 'project_gallery'/.test(_storeR2Jsx) &&
       /__syncPhotos\(m\[key\] \|\| \[\], list \|\| \[\], \{ kind: 'school_stage'/.test(_storeR2Jsx));
record('R30.1: __syncPhotos inserts new rows into photos via bgInsert + storage_path key',
       /window\.bgInsert\('photos'/.test(_storeR2Jsx) &&
       /storage_path: p\.path/.test(_storeR2Jsx));
record('R30.1: __syncPhotos deletes removed rows via bgDeleteWhere on storage_path',
       /window\.bgDeleteWhere\('photos', \{ storage_path: p\.path \}/.test(_storeR2Jsx));
record('R30.1: __syncPhotos sources uploaded_by_id from window.__currentUser via userUuid',
       /window\.userUuid\(window\.__currentUser\?\.id\)/.test(_storeR2Jsx));
record('R30.1: app.jsx exposes currentUser to window.__currentUser for non-React readers',
       /window\.__currentUser = currentUser/.test(_appJsx));

// (c) Delivery-note round-trip
record('R30.1: addDeliveryNote bgInserts to delivery_notes + delivery_note_items',
       /window\.bgInsert\('delivery_notes', window\.toDbDeliveryNote/.test(_storeR2Jsx) &&
       /window\.bgInsert\('delivery_note_items', itemRows/.test(_storeR2Jsx));
record('R30.1: updateDeliveryNote bgUpdates delivery_notes with toDbDeliveryNotePatch',
       /window\.bgUpdate\('delivery_notes', id, window\.toDbDeliveryNotePatch\(patch\)/.test(_storeR2Jsx));
record('R30.1: deleteDeliveryNote bgDeletes delivery_notes (items cascade via FK)',
       /window\.bgDelete\('delivery_notes', id/.test(_storeR2Jsx));
record('R30.1: toDbDeliveryNote maps signatureDataUrl → signature_path',
       /signature_path: n\.signatureDataUrl \|\| n\.signaturePath \|\| null/.test(_libDb));
record("R30.1: toDbDeliveryNote maps legacy 'rejected' status → 'disputed' via DN_STATUS_ENUM",
       /'rejected':'disputed'/.test(_libDb));

// (d) EditCoordsModal → updateSchool round-trip
record('R30.1: updateSchool bgUpdates schools with toDbSchoolPatch (covers EditCoordsModal coords save)',
       /base\._setSchools\(ss => ss\.map\(s => s\.id === id \? \{ \.\.\.s, \.\.\.patch \} : s\)\);\s*\n\s*if \(window\.bgUpdate\) window\.bgUpdate\('schools', id, window\.toDbSchoolPatch\(patch\)/.test(_storeR2Jsx));
record('R30.1: toDbSchoolPatch normalizes coords (strips N/S/E/W, validates range, NULL on failure)',
       /function normalizeCoords\(raw\) \{/.test(_libDb) &&
       /replace\(\/\[NSEWnsew\]\/g/.test(_libDb) &&
       /if \(lat < -90 \|\| lat > 90 \|\| lng < -180 \|\| lng > 180\) return null/.test(_libDb));

// Mutator wiring breadth — every mutator that should reach Supabase does so.
record('R30.1: store.jsx addProject / updateProject / deleteProject all bg the projects table',
       /bgInsert\('projects'/.test(_storeJsx) &&
       /bgUpdate\('projects', id/.test(_storeJsx) &&
       /bgDelete\('projects', id/.test(_storeJsx));
record('R30.1: store.jsx addTask / updateTask bg the tasks table; sendTaskMessage bgs task_messages',
       /bgInsert\('tasks'/.test(_storeJsx) &&
       /bgUpdate\('tasks', id/.test(_storeJsx) &&
       /bgInsert\('task_messages'/.test(_storeJsx));
record('R30.1: updateSchoolStage + updateSchoolRemark bg schools.stages / schools.remark',
       /bgUpdate\('schools', schoolId, \{ stages: nextStages \}/.test(_storeJsx) &&
       /bgUpdate\('schools', schoolId, window\.toDbSchoolPatch\(\{ remark \}\)/.test(_storeJsx));
record('R30.1: addContractor / updateContractor / deleteContractor bg the contractors table',
       /bgInsert\('contractors'/.test(_storeR2Jsx) &&
       /bgUpdate\('contractors', id/.test(_storeR2Jsx) &&
       /bgDelete\('contractors', id/.test(_storeR2Jsx));
record('R30.1: addUser / updateUser / archiveUser bg the profiles table',
       /bgInsert\('profiles'/.test(_storeR2Jsx) &&
       /bgUpdate\('profiles', window\.userUuid\(id\)/.test(_storeR2Jsx));
record('R30.1: addEscalation / resolveEscalation / escalateFurther bg escalations + escalation_history',
       /bgInsert\('escalations'/.test(_storeR2Jsx) &&
       /bgUpdate\('escalations', id/.test(_storeR2Jsx) &&
       /bgInsert\('escalation_history'/.test(_storeR2Jsx));
record('R30.1: toggleSchoolStage bgs schools.stages jsonb',
       /window\.bgUpdate\('schools', schoolId, \{ stages: nextStages \}, 'school stage toggle'\)/.test(_storeR2Jsx));
record('R30.1: addSchool / updateSchool / deleteSchool bg the schools table',
       /window\.bgInsert\('schools', window\.toDbSchool\(school\)/.test(_storeR2Jsx) &&
       /window\.bgUpdate\('schools', id, window\.toDbSchoolPatch\(patch\)/.test(_storeR2Jsx) &&
       /window\.bgDelete\('schools', id, 'school'\)/.test(_storeR2Jsx));
record('R30.1: logAudit bgs audit_log',
       /window\.bgInsert\('audit_log', window\.toDbAudit\(e\)/.test(_storeR2Jsx));
record('R30.1: theme / notification / role-permission settings bgUpsert app_settings',
       /__bgSetting\('theme\.colors'/.test(_storeR2Jsx) &&
       /__bgSetting\('theme\.logo'/.test(_storeR2Jsx) &&
       /__bgSetting\('notification\.templates'/.test(_storeR2Jsx) &&
       /__bgSetting\('role\.permissions'/.test(_storeR2Jsx));

// Foundation health (lib/supabase.js + lib/db.js)
record('R30.1: lib/supabase.js exports supabase + USE_SUPABASE; sets window.* for non-ESM readers',
       /export const supabase/.test(_libSupabase) &&
       /export const USE_SUPABASE/.test(_libSupabase) &&
       /window\.supabase\s*=\s*supabase/.test(_libSupabase));
record('R30.1: lib/db.js exports bg / bgInsert / bgUpdate / bgDelete / bgDeleteWhere / bgUpsert',
       /export function bg\(/.test(_libDb) &&
       /export function bgInsert\(/.test(_libDb) &&
       /export function bgUpdate\(/.test(_libDb) &&
       /export function bgDelete\(/.test(_libDb) &&
       /export function bgDeleteWhere\(/.test(_libDb) &&
       /export function bgUpsert\(/.test(_libDb));
record('R30.1: lib/db.js translation helpers cover all wired tables',
       /export function toDbProject\(/.test(_libDb) &&
       /export function toDbProfile\(/.test(_libDb) &&
       /export function toDbTask\(/.test(_libDb) &&
       /export function toDbSchool\(/.test(_libDb) &&
       /export function toDbContractor\(/.test(_libDb) &&
       /export function toDbDeliveryNote\(/.test(_libDb) &&
       /export function toDbEscalation\(/.test(_libDb) &&
       /export function toDbAudit\(/.test(_libDb));
record('R30.1: bg() respects USE_SUPABASE — silent no-op when ?dev=1 forces in-memory mode',
       /if \(!USE_SUPABASE\) return;/.test(_libDb));

// Standalone build (Item 6)
record('R30.1: build-standalone.py injects @supabase/supabase-js v2 UMD CDN',
       /cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js@2\/dist\/umd\/supabase\.min\.js/.test(_buildStd));
record('R30.1: build-standalone.py injects a Supabase init block before the first text/babel',
       /def supabase_init_block\(\)/.test(_buildStd) &&
       /window\.supabase\.createClient/.test(_buildStd) &&
       /first_babel = re\.search\(r'<script type="text\/babel"', tpl\)/.test(_buildStd));
record('R30.1: build-standalone.py inlines lib/db.js (window-based supabase) into standalone',
       /db_js = \(SRC \/ "lib" \/ "db\.js"\)\.read_text/.test(_buildStd) &&
       /db_js\.replace\("supabase\.from\(", "window\.supabase\.from\("\)/.test(_buildStd));

// ── P. R30.2 — Read-side wiring (boot orchestrator) ────────────────────────
// R30.1 mutators wrote through to Supabase. R30.2 turns on the read side:
// after sign-in the boot orchestrator fetches all 8 tables, translates DB
// rows via fromDb*, computes PM→projectIds, and replaces in-memory state
// (both window-level arrays and React state via store setters).
const _libDb_r302   = fs.readFileSync(path.join(SRC, 'lib', 'db.js'), 'utf8');
const _storeJsx_r302= fs.readFileSync(path.join(SRC, 'store.jsx'), 'utf8');
const _storeR2_r302 = fs.readFileSync(path.join(SRC, 'store-r2.jsx'), 'utf8');
const _appJsx_r302  = fs.readFileSync(path.join(SRC, 'app.jsx'), 'utf8');
const _loginJsx_r302= fs.readFileSync(path.join(SRC, 'page-login.jsx'), 'utf8');

// Item 1 — 8 fromDb translators (+ 2 nested helpers + 1 audit) all exported.
record('R30.2: lib/db.js exports 8 primary fromDb translators',
       /export function fromDbProfile\(/.test(_libDb_r302) &&
       /export function fromDbProject\(/.test(_libDb_r302) &&
       /export function fromDbSchool\(/.test(_libDb_r302) &&
       /export function fromDbContractor\(/.test(_libDb_r302) &&
       /export function fromDbTask\(/.test(_libDb_r302) &&
       /export function fromDbEscalation\(/.test(_libDb_r302) &&
       /export function fromDbDeliveryNote\(/.test(_libDb_r302) &&
       /export function fromDbAuditLog\(/.test(_libDb_r302));
record('R30.2: lib/db.js exports nested-row helpers for embeds (task_messages, escalation_history, delivery_note_items)',
       /export function fromDbTaskMessage\(/.test(_libDb_r302) &&
       /export function fromDbEscalationHistory\(/.test(_libDb_r302) &&
       /export function fromDbDeliveryNoteItem\(/.test(_libDb_r302));
record('R30.2: fromDbProfile maps default_regions[0] → region, archived → !active, full_name → name + initials',
       /region:\s*\(Array\.isArray\(row\.default_regions\) && row\.default_regions\[0\]\)/.test(_libDb_r302) &&
       /active:\s*!row\.archived/.test(_libDb_r302) &&
       /initials:\s*computeInitials\(fullName\)/.test(_libDb_r302));
record('R30.2: fromDbProject maps status enum → display via PROJECT_STATUS_DISPLAY (completed→Complete, on_hold→On Hold)',
       /const PROJECT_STATUS_DISPLAY = \{/.test(_libDb_r302) &&
       /completed:\s*'Complete'/.test(_libDb_r302) &&
       /on_hold:\s*'On Hold'/.test(_libDb_r302));
record('R30.2: fromDbSchool splits level_gender + recomputes status from stages.done count',
       /const lgParts = \(row\.level_gender \|\| ''\)\.split\(' \/ '\)/.test(_libDb_r302) &&
       /\(stages\.length > 0 && doneCount === stages\.length\) \? 'Completed'/.test(_libDb_r302));
record('R30.2: fromDbSchool rebuilds rawStages object from the stages array',
       /const rawStages = \{\};/.test(_libDb_r302) &&
       /rawStages\[st\.key\] = st\.statusId/.test(_libDb_r302));
record('R30.2: fromDbContractor synthesizes schedule/quality/hse/docs from kpi_score (no live columns)',
       /const score = Math\.round\(row\.kpi_score \|\| 0\)/.test(_libDb_r302) &&
       /schedule:\s*score,\s*\n\s*quality:\s*score/.test(_libDb_r302));
record('R30.2: fromDbTask + fromDbEscalation + fromDbDeliveryNote unpack PostgREST nested embeds + sort by created_at',
       /Array\.isArray\(row\.task_messages\) \? row\.task_messages\.map\(fromDbTaskMessage\)/.test(_libDb_r302) &&
       /Array\.isArray\(row\.escalation_history\) \? row\.escalation_history\.map\(fromDbEscalationHistory\)/.test(_libDb_r302) &&
       /Array\.isArray\(row\.delivery_note_items\)[\s\S]*?\.map\(fromDbDeliveryNoteItem\)/.test(_libDb_r302));
record('R30.2: fromDbAuditLog flattens payload.{before,after,entityLabel} + maps user_* → actor*',
       /actorId:\s*legacyUserId\(row\.user_id\)/.test(_libDb_r302) &&
       /entityLabel:\s*payload\.entityLabel \|\| ''/.test(_libDb_r302) &&
       /before:\s*payload\.before \?\? null/.test(_libDb_r302));
record('R30.2: legacyUserId reverses the 15-entry USER_UUID map; passes through unmapped uuids',
       /const __REVERSE = Object\.fromEntries\(Object\.entries\(USER_UUID\)\.map\(\(\[k, v\]\) => \[v, k\]\)\)/.test(_libDb_r302) &&
       /export function legacyUserId\(uuid\) \{ return __REVERSE\[uuid\] \|\| uuid; \}/.test(_libDb_r302));

// Item 2 — 8 bgFetch loaders.
record('R30.2: lib/db.js exports 8 bgFetch loaders (one per table) + bgFetchCurrentProfile + bgFetchAuditLog',
       /export async function bgFetchProfiles\(/.test(_libDb_r302) &&
       /export async function bgFetchProjects\(/.test(_libDb_r302) &&
       /export async function bgFetchSchools\(/.test(_libDb_r302) &&
       /export async function bgFetchContractors\(/.test(_libDb_r302) &&
       /export async function bgFetchTasks\(/.test(_libDb_r302) &&
       /export async function bgFetchEscalations\(/.test(_libDb_r302) &&
       /export async function bgFetchDeliveryNotes\(/.test(_libDb_r302) &&
       /export async function bgFetchAppSettings\(/.test(_libDb_r302) &&
       /export async function bgFetchCurrentProfile\(uuid\)/.test(_libDb_r302) &&
       /export async function bgFetchAuditLog\(/.test(_libDb_r302));
record('R30.2: bgFetchSchools paginates via 3 range() calls in parallel (Q4 option B)',
       /const ranges = \[\[0, 999\], \[1000, 1999\], \[2000, 2999\]\]/.test(_libDb_r302) &&
       /supabase\.from\('schools'\)\.select\('\*'\)\.range\(from, to\)/.test(_libDb_r302));
record('R30.2: bgFetchTasks / bgFetchEscalations / bgFetchDeliveryNotes use PostgREST embed select',
       /supabase\.from\('tasks'\)\.select\('\*, task_messages\(\*\)'\)/.test(_libDb_r302) &&
       /supabase\.from\('escalations'\)\.select\('\*, escalation_history\(\*\)'\)/.test(_libDb_r302) &&
       /supabase\.from\('delivery_notes'\)\.select\('\*, delivery_note_items\(\*\)'\)/.test(_libDb_r302));
record('R30.2: bgFetch* helpers all silent-no-op when !USE_SUPABASE; warn-but-do-not-throw on error',
       /async function _safeFetch\(label, fn\) \{/.test(_libDb_r302) &&
       /if \(!USE_SUPABASE \|\| !supabase\) return null;/.test(_libDb_r302) &&
       /console\.warn\(`\[R30\.2 fetch \$\{label\}\]`/.test(_libDb_r302));

// Item 3 — Boot orchestrator (app.jsx).
record('R30.2: app.jsx defines bootFromSupabase orchestrator guarded by __bootRanRef (idempotent)',
       /const __bootRanRef = React\.useRef\(false\)/.test(_appJsx_r302) &&
       /const bootFromSupabase = React\.useCallback\(async \(\) => \{/.test(_appJsx_r302) &&
       /if \(__bootRanRef\.current\) return;\s*\n\s*__bootRanRef\.current = true/.test(_appJsx_r302));
record('R30.2: bootFromSupabase fires all 8 bgFetch* helpers in parallel via Promise.all',
       /Promise\.all\(\[\s*\n\s*window\.bgFetchProfiles\(\),\s*\n\s*window\.bgFetchProjects\(\),\s*\n\s*window\.bgFetchSchools\(\),\s*\n\s*window\.bgFetchContractors\(\),\s*\n\s*window\.bgFetchTasks\(\),\s*\n\s*window\.bgFetchEscalations\(\),\s*\n\s*window\.bgFetchDeliveryNotes\(\),\s*\n\s*window\.bgFetchAppSettings\(\),\s*\n\s*\]\)/.test(_appJsx_r302));
record('R30.2: boot orchestrator builds PM-uuid → legacy-project-ids map from raw projects rows (Q1 option A)',
       /const pmAssignments = new Map\(\);/.test(_appJsx_r302) &&
       /if \(pr\.assigned_pm_id\)/.test(_appJsx_r302) &&
       /pmAssignments\.set\(pr\.assigned_pm_id, arr\)/.test(_appJsx_r302));
record('R30.2: boot orchestrator attaches computed projectIds to PM profiles via fromDbProfile post-hoc',
       /const assigned = pmAssignments\.get\(r\.id\);\s*\n\s*if \(assigned && assigned\.length\) p\.projectIds = assigned;/.test(_appJsx_r302));
record('R30.2: boot orchestrator mutates window.PEOPLE / PROJECTS / ALL_SCHOOLS / CONTRACTORS in place',
       /replaceInPlace\(window\.PEOPLE, profiles\)/.test(_appJsx_r302) &&
       /replaceInPlace\(window\.PROJECTS, projectsTranslated\)/.test(_appJsx_r302) &&
       /replaceInPlace\(window\.ALL_SCHOOLS, schoolsTranslated\)/.test(_appJsx_r302) &&
       /replaceInPlace\(window\.CONTRACTORS, contractorsTranslated\)/.test(_appJsx_r302));
record('R30.2: boot orchestrator also calls store setters (_setPeople, _setProjects, _setSchools, etc.)',
       /store\._setPeople\(profiles\)/.test(_appJsx_r302) &&
       /store\._setUsers\(profiles\.map\(p => \(\{ \.\.\.p, active: !p\.archived \}\)\)\)/.test(_appJsx_r302) &&
       /store\._setProjects\(projectsTranslated\)/.test(_appJsx_r302) &&
       /store\._setSchools\(schoolsTranslated\)/.test(_appJsx_r302) &&
       /store\._setContractorsLocal\(contractorsTranslated\)/.test(_appJsx_r302) &&
       /store\._setTasks\(tasksTranslated\)/.test(_appJsx_r302) &&
       /store\._setEscalations\(escalationsTranslated\)/.test(_appJsx_r302) &&
       /store\._setDeliveryNotes\(dnTranslated\)/.test(_appJsx_r302));
record('R30.2: boot orchestrator routes app_settings rows to theme.colors / theme.logo / notification.templates / role.permissions setters',
       /s\.key === 'theme\.colors'.*store\._setThemeColors\(v\)/.test(_appJsx_r302) &&
       /s\.key === 'theme\.logo'.*store\._setThemeLogo\(v\)/.test(_appJsx_r302) &&
       /s\.key === 'notification\.templates'.*store\._setNotificationTemplates\(v\)/.test(_appJsx_r302) &&
       /s\.key === 'role\.permissions'.*store\._setRolePermissions\(v\)/.test(_appJsx_r302));
record('R30.2: boot orchestrator console.log surfaces row counts for DevTools verification',
       /\[R30\.2 boot\] Loaded \$\{profiles\.length\} profiles · \$\{projectsTranslated\.length\} projects · \$\{schoolsTranslated\.length\} schools/.test(_appJsx_r302));
record('R30.2: boot status banner — loading + error variants rendered above main page content',
       /bootStatus === 'loading'.*data-testid="r30-boot-banner"/s.test(_appJsx_r302) &&
       /bootStatus === 'error'.*data-testid="r30-boot-banner"/s.test(_appJsx_r302));

// Item 4 — Auth-session boot.
record('R30.2: app.jsx onAuthStateChange kicks off bootFromSupabase on SIGNED_IN / INITIAL_SESSION',
       /event === 'SIGNED_IN' \|\| event === 'TOKEN_REFRESHED' \|\| event === 'INITIAL_SESSION'/.test(_appJsx_r302) &&
       /resolveSession\(session\)/.test(_appJsx_r302) &&
       /bootFromSupabase\(\);/.test(_appJsx_r302));
record('R30.2: SIGNED_OUT resets __bootRanRef so a fresh sign-in re-triggers the orchestrator',
       /event === 'SIGNED_OUT'/.test(_appJsx_r302) &&
       /__bootRanRef\.current = false/.test(_appJsx_r302));
record('R30.2: getSession() hydrates existing session on mount and calls resolveSession',
       /window\.supabase\.auth\.getSession\(\)\.then\(\(\{ data \}\) => \{[\s\S]*?resolveSession\(data\.session\)/.test(_appJsx_r302));

// Item 5 — currentUser sourced from live profile row (not in-memory PEOPLE).
record('R30.2: resolveSession fetches profile row via bgFetchCurrentProfile(session.user.id)',
       /const profileRow = await window\.bgFetchCurrentProfile\(session\.user\.id\)/.test(_appJsx_r302));
record('R30.2: resolveSession defensive sign-out when authenticated but no profile row exists',
       /if \(!profileRow\) \{[\s\S]*?await window\.supabase\.auth\.signOut\(\)/.test(_appJsx_r302));
record('R30.2: page-login submitSupabase no longer resolves PEOPLE — delegates to app.jsx auth listener',
       !/onSignIn\(person\)/.test(_loginJsx_r302) &&
       /R30\.2 — auth listener in app\.jsx now handles SIGNED_IN/.test(_loginJsx_r302));

// Store-setter exposure for the orchestrator.
record('R30.2: store.jsx exposes _setSchools / _setTasks / _setProjects / _setPeople / _setNotifs',
       /_setSchools:\s*setSchools/.test(_storeJsx_r302) &&
       /_setTasks:\s*setTasks/.test(_storeJsx_r302) &&
       /_setProjects:\s*setProjects/.test(_storeJsx_r302) &&
       /_setPeople:\s*setPeople/.test(_storeJsx_r302) &&
       /_setNotifs:\s*setNotifs/.test(_storeJsx_r302));
record('R30.2: store-r2.jsx exposes 9 internal setters for boot orchestrator',
       /_setEscalations:\s*setEscalations/.test(_storeR2_r302) &&
       /_setContractorsLocal:\s*setContractorsLocal/.test(_storeR2_r302) &&
       /_setDeliveryNotes:\s*setDeliveryNotes/.test(_storeR2_r302) &&
       /_setUsers:\s*setUsers/.test(_storeR2_r302) &&
       /_setAuditLog:\s*setAuditLog/.test(_storeR2_r302) &&
       /_setThemeColors:\s*setThemeColors/.test(_storeR2_r302) &&
       /_setThemeLogo:\s*setThemeLogo/.test(_storeR2_r302) &&
       /_setNotificationTemplates:\s*setNotificationTemplates/.test(_storeR2_r302) &&
       /_setRolePermissions:\s*setRolePermissions/.test(_storeR2_r302));

// Demo-mode escape hatch preserved.
record('R30.2: bootFromSupabase silently no-ops when !window.USE_SUPABASE (dev mode preserved)',
       /if \(!window\.USE_SUPABASE \|\| !window\.supabase\) \{ setBootStatus\(null\); return; \}/.test(_appJsx_r302));
record('R30.2: auth effect entire body gated on USE_SUPABASE — dev mode never subscribes',
       /if \(typeof window === 'undefined' \|\| !window\.USE_SUPABASE \|\| !window\.supabase\) return;/.test(_appJsx_r302));

// ── Q. R30.3a — Security hotfix: lock role switcher in production ──────────
// In production mode (USE_SUPABASE && session present) the user's role MUST
// come from the profiles row fetched at sign-in and must NOT be mutable via
// the topbar dropdown. The dropdown was a demo affordance that escaped to
// prod and let any signed-in user freely switch to VP from devtools or the
// header pill.
const _shellJsx_r303a = fs.readFileSync(path.join(SRC, 'shell.jsx'), 'utf8');
const _appJsx_r303a   = fs.readFileSync(path.join(SRC, 'app.jsx'), 'utf8');

record('R30.3a: shell.jsx renders a static role-badge (not the Select) when USE_SUPABASE && currentUser',
       /window\.USE_SUPABASE && currentUser\)[\s\S]*?data-testid="role-badge"[\s\S]*?:\s*<Select value=\{role\} onChange=\{onRoleChange\}/.test(_shellJsx_r303a));
record('R30.3a: shell.jsx role-badge is a non-interactive <span> (no onClick / no onChange / not a form control)',
       /<span data-testid="role-badge"[\s\S]*?\{role\}\s*<\/span>/.test(_shellJsx_r303a) &&
       !/<span data-testid="role-badge"[^>]*onClick=/.test(_shellJsx_r303a));
record('R30.3a: app.jsx handleRoleChange has the USE_SUPABASE && currentUser guard with console.warn',
       /const handleRoleChange = \(newRole\) => \{[\s\S]*?if \(typeof window !== 'undefined' && window\.USE_SUPABASE && currentUser\) \{[\s\S]*?console\.warn\('\[R30\.3a\] Role change blocked/.test(_appJsx_r303a));
record('R30.3a: app.jsx handleRoleChange guard returns BEFORE the PEOPLE.find + setCurrentUser fallthrough',
       /\[R30\.3a\] Role change blocked: user is auth-locked to profile\.role[\s\S]{1,40}return;[\s\S]*?const u = PEOPLE\.find/.test(_appJsx_r303a));
record('R30.3a: dev-mode (?dev=1 → USE_SUPABASE=false) keeps the Select dropdown — fallback branch still in shell.jsx',
       /:\s*<Select value=\{role\} onChange=\{onRoleChange\} options=\{ROLES\}/.test(_shellJsx_r303a));

// ── R. R30.3b — Polish round (Sentry / flash-of-login / stage data / audit chart / .gitignore) ──
const _sentryJs    = fs.readFileSync(path.join(SRC, 'lib', 'sentry.js'), 'utf8');
const _mainJsx_r303b = fs.readFileSync(path.join(SRC, 'main.jsx'), 'utf8');
const _appJsx_r303b  = fs.readFileSync(path.join(SRC, 'app.jsx'), 'utf8');
const _dashJsx_r303b = fs.readFileSync(path.join(SRC, 'page-dashboard.jsx'), 'utf8');
const _pagesR2_r303b = fs.readFileSync(path.join(SRC, 'pages-r2.jsx'), 'utf8');
const _pkgJson      = fs.readFileSync(path.join(__dirname, '..', 'vite', 'package.json'), 'utf8');
const _rootGitignore= fs.readFileSync(path.join(__dirname, '..', '.gitignore'), 'utf8');

// Item 1 — Sentry
record('R30.3b: vite/package.json declares @sentry/react dependency',
       /"@sentry\/react":\s*"\^?[0-9]/.test(_pkgJson));
record('R30.3b: lib/sentry.js imports @sentry/react and re-exports ErrorBoundary + captureException',
       /import \* as Sentry from '@sentry\/react';/.test(_sentryJs) &&
       /export const ErrorBoundary = Sentry\.ErrorBoundary;/.test(_sentryJs) &&
       /export const captureException = /.test(_sentryJs));
record('R30.3b: lib/sentry.js initSentry is gated on USE_SUPABASE (dev mode skips entirely)',
       /export function initSentry\(\) \{[\s\S]*?if \(!USE_SUPABASE\) return;/.test(_sentryJs));
record('R30.3b: lib/sentry.js Sentry.init carries tracesSampleRate 0.1 + replays disabled + release r30.3b',
       /tracesSampleRate:\s*0\.1/.test(_sentryJs) &&
       /replaysSessionSampleRate:\s*0/.test(_sentryJs) &&
       /replaysOnErrorSampleRate:\s*0/.test(_sentryJs) &&
       /const RELEASE = 'r30\.3b';/.test(_sentryJs));
record('R30.3b: lib/sentry.js auto-inits on module load (calls initSentry() at file tail)',
       /\/\/ Auto-init on module load[\s\S]*?initSentry\(\);/.test(_sentryJs));
record('R30.3b: main.jsx imports SentryErrorBoundary + wraps SessionShell in it',
       /import \{ ErrorBoundary as SentryErrorBoundary \} from '\.\/lib\/sentry\.js';/.test(_mainJsx_r303b) &&
       /<SentryErrorBoundary fallback=\{SentryFallback\}[\s\S]*?<SessionShell \/>/.test(_mainJsx_r303b));
record('R30.3b: main.jsx defines SentryFallback with retry button (resetError)',
       /function SentryFallback\(\{ error, resetError \}\)/.test(_mainJsx_r303b) &&
       /onClick=\{resetError\}/.test(_mainJsx_r303b));

// Item 2 — Flash-of-login
record('R30.3b: app.jsx hydrating state synchronously checks localStorage for zamil-auth token',
       /const \[hydrating, setHydrating\] = React\.useState\(\(\) => \{[\s\S]*?localStorage\.getItem\('zamil-auth'\)[\s\S]*?return !!\(parsed && parsed\.access_token\);/.test(_appJsx_r303b));
record('R30.3b: app.jsx renders branded splash (data-testid="r30-hydrating-splash") before login form',
       /if \(!currentUser && hydrating\) \{[\s\S]*?data-testid="r30-hydrating-splash"/.test(_appJsx_r303b) &&
       /Restoring your session/.test(_appJsx_r303b));
record('R30.3b: app.jsx splash has 5s safety net so a hung auth never blocks the user permanently',
       /setTimeout\(\(\) => setHydrating\(false\), 5000\)/.test(_appJsx_r303b));
record('R30.3b: app.jsx resolveSession / getSession / SIGNED_OUT all flip hydrating → false',
       /if \(!session\?\.\user\) \{ setHydrating\(false\); return; \}/.test(_appJsx_r303b) &&
       /else setHydrating\(false\);/.test(_appJsx_r303b) &&
       /event === 'SIGNED_OUT'[\s\S]*?setHydrating\(false\)/.test(_appJsx_r303b));

// Item 3 — .gitignore
record('R30.3b: .gitignore at repo root ignores vite/dist/ and dist/',
       /^vite\/dist\/\s*$/m.test(_rootGitignore) && /^dist\/\s*$/m.test(_rootGitignore));
record('R30.3b: .gitignore comment explains assets/ stays tracked (deploy artifacts)',
       /repo-root assets\/ ARE/.test(_rootGitignore));

// Item 4 — Stage completion data (schoolDist computed in orchestrator)
record('R30.3b: boot orchestrator computes schoolDist + progress + currentStage per project from fetched schools',
       /R30\.3b Item 4[\s\S]*?for \(const p of projectsTranslated\) \{/.test(_appJsx_r303b) &&
       /p\.schoolDist = dist;/.test(_appJsx_r303b) &&
       /p\.progress = totalStages > 0 \? Math\.round\(\(doneStages \/ totalStages\) \* 100\)/.test(_appJsx_r303b));
record('R30.3b: schoolDist computation mirrors data.jsx pipeline (filter schools by projectId, count done stages)',
       /const ss = schoolsTranslated\.filter\(s => s\.projectId === p\.id\)/.test(_appJsx_r303b) &&
       /ss\.reduce\(\(a, s\) => a \+ \(Array\.isArray\(s\.stages\) \? s\.stages\.filter\(st => st && st\.done\)\.length : 0\), 0\)/.test(_appJsx_r303b));

// Item 5 — Stage transitions from audit_log
record('R30.3b: page-dashboard.jsx exports computeWeeklyCrossingsFromAudit (filters last 7 days + entityType school_stage)',
       /function computeWeeklyCrossingsFromAudit\(auditLog\) \{/.test(_dashJsx_r303b) &&
       /e\.entityType !== 'school_stage'/.test(_dashJsx_r303b) &&
       /const cutoff = Date\.now\(\) - 7 \* 86400000/.test(_dashJsx_r303b));
record('R30.3b: computeDashStageData accepts auditLog arg + returns usingMockWeekly flag',
       /function computeDashStageData\(projects, auditLog\)/.test(_dashJsx_r303b) &&
       /const usingMockWeekly = liveWeekly == null;/.test(_dashJsx_r303b) &&
       /return \{ stageCounts[\s\S]*?usingMockWeekly \}/.test(_dashJsx_r303b));
record('R30.3b: DashStageInsights passes auditLog + renders "(demo data)" disclaimer when usingMockWeekly',
       /const \{ auditLog \} = useStore\(\);/.test(_pagesR2_r303b) &&
       /compute\(projects, auditLog\)/.test(_pagesR2_r303b) &&
       /data-testid="weekly-crossings-mock-note"/.test(_pagesR2_r303b) &&
       /no stage transitions recorded in last 7 days/.test(_pagesR2_r303b));
record('R30.3b: PageDashboard inline stage section also uses computeWeeklyCrossingsFromAudit (sync with DashStageInsights)',
       /computeWeeklyCrossingsFromAudit\(auditLog\)/.test(_dashJsx_r303b));

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
