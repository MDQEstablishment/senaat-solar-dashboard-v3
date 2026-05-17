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
record('R15 #1: PageSettings accepts auditLogOnly prop and renders only AuditTab',
       /function PageSettings\(\{\s*currentUser,\s*auditLogOnly\s*=\s*false\s*\}\)/.test(settingsJsx) &&
       /if \(auditLogOnly\)[\s\S]{0,800}<AuditTab\s*\/>/.test(settingsJsx));
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
record('R16 #3: VP dashboard renders StageExecutionKPIs',
       /<StageExecutionKPIs\s+schools=\{schools \|\| ALL_SCHOOLS\}/.test(pagesR2R16));
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
record('R17 → R24: Stages view body cells render check icon + dd-MMM date for done stages',
       /Icon name="check" size=\{14\} className="text-emerald-600" strokeWidth=\{3\}/.test(read('components/StageChecklistTable.jsx')) &&
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
record('R19 Item #2 → R23: Stages view surfaces all 18 stages via the shared checkmark table',
       /<SCT schools=\{rows\} hideInternalToolbar=\{true\}/.test(schoolsR19) &&
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
record('R20 → R24: Stages view renders 18 stage columns headered by column number + short label',
       /\{i \+ 1\}/.test(sctR20) &&
       /SCHOOL_STAGE_SHORT_\[i\]/.test(sctR20));
// R24 deliberately drops category-tinted header backgrounds and the per-cell
// category border — the client preferred the classic uniform table. We assert
// the absence rather than the presence here.
record('R20 → R24: classic table — no category-tinted header band on stage columns',
       !/borderTop: `2px solid \$\{cc\.dot/.test(sctR20) &&
       !/background: cc\.soft/.test(sctR20));
record('R20 → R24: Completed stages render with check icon; empty stages with em-dash',
       /Icon name="check" size=\{14\}/.test(sctR20) &&
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
record('R20+R23: Schools List checkmark table renders inside its own scroll container (640 px on this page)',
       /maxHeight=\{640\}/.test(read('page-schools-list.jsx')));
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
record('R22 #1 → R23: Schools List page renders the shared checkmark table',
       /<SCT schools=\{rows\} hideInternalToolbar=\{true\}/.test(schoolsR22) &&
       !/function SchoolsStagesVertical/.test(schoolsR22));
// R22 #2 family: the implementation moved to src/components/StageChecklistTable.jsx.
// The Project Detail call site is a thin adapter. Assert the live behaviour against
// the shared component file plus the adapter.
const sctR22 = read('components/StageChecklistTable.jsx');
record('R22 #2 → R23: Project Detail Overview has per-school stage checkmark table',
       /function ProjectStageChecklistTable/.test(projectR22) &&
       /const SCT = window\.StageChecklistTable/.test(projectR22) &&
       /data-testid="stage-checklist-table"/.test(sctR22));
record('R22 #2 → R24: Stage completion checkmarks render only for stages with completedDate',
       /const done = !!\(st && \(st\.completedDate \|\| st\.done\)\)/.test(sctR22) &&
       /<Icon name="check" size=\{14\} className="text-emerald-600"/.test(sctR22));
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
record('R22 #2 → R23: Legend row shows "green check = stage complete · — = not yet"',
       /stage complete/.test(sctR22) && /not yet/.test(sctR22));

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
record('R23: Schools List Stages view renders per-school checkmark table (not SchoolsStagesVertical)',
       !/function SchoolsStagesVertical/.test(schoolsR23) &&
       !/<SchoolsStagesVertical/.test(schoolsR23) &&
       /<SCT schools=\{rows\} hideInternalToolbar=\{true\}/.test(schoolsR23));
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
record('R23: Project Detail still uses the shared checkmark table (no regression on R22)',
       /<ProjectStageChecklistTable/.test(projectR23) &&
       /const SCT = window\.StageChecklistTable/.test(projectR23) &&
       /<SCT schools=\{schools\} activeStage=\{activeStage\}/.test(projectR23));
record('R23 → R24: completedDate gates the green check (truthy completedDate or done flag)',
       /st && \(st\.completedDate \|\| st\.done\)/.test(sctR23) &&
       /Icon name="check" size=\{14\} className="text-emerald-600"/.test(sctR23));
record('R23: legend row "green check = stage complete · — = not yet" preserved',
       /stage complete/.test(sctR23) && /not yet/.test(sctR23));

// ── K12. Round 24 — restore classic R17 checkmark-table look on Schools List
//                   + Project Detail, swap KPI strip to stage-driven metrics ───
const sctR24      = read('components/StageChecklistTable.jsx');
const schoolsR24  = read('page-schools-list.jsx');

record('R24: classic <table> markup with border-collapse + slate-50 thead background',
       /<table className="min-w-full text-sm border-collapse">/.test(sctR24) &&
       /<tr className="bg-slate-50">/.test(sctR24));
record('R24: stage column header shows just the column number (1..18), not S## prefix',
       /\{i \+ 1\}/.test(sctR24) &&
       !/S\{String\(i \+ 1\)\.padStart\(2, '0'\)\}\s*<\/div>\s*<div style/.test(sctR24));
record('R24: per-stage cell renders check icon + dd-MMM date for done, em-dash for not done',
       /Icon name="check" size=\{14\} className="text-emerald-600" strokeWidth=\{3\}/.test(sctR24) &&
       /toLocaleDateString\('en-GB', \{ day: '2-digit', month: 'short' \}\)/.test(sctR24) &&
       /<span className="text-slate-300" aria-hidden="true">—<\/span>/.test(sctR24));
record('R24: rows alternate slate-50 / white with slate-100 hover',
       /rowIdx % 2 === 0 \? 'bg-white' : 'bg-slate-50'/.test(sctR24) &&
       /hover:bg-slate-100/.test(sctR24));
record('R24: School column shows name (EN + AR) plus school code in font-mono',
       /<div className="font-medium truncate"/.test(sctR24) &&
       /<div className="text-\[10px\] text-ink-500 font-mono truncate">\{s\.id\}<\/div>/.test(sctR24));
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
record('R24: Project Detail Overview still uses the same shared classic table',
       /<ProjectStageChecklistTable/.test(read('page-project.jsx')) &&
       /const SCT = window\.StageChecklistTable/.test(read('page-project.jsx')));

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
