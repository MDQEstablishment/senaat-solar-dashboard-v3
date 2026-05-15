// Seed data + helpers — Zamil Services Solar Programs (rebranded from SENAAT, Round 5)

const SAR = (n) => {
  if (n == null || isNaN(n)) return '—';
  if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (Math.abs(n) >= 1e3) return Math.round(n).toLocaleString('en-US');
  return Math.round(n).toString();
};
const SARfull = (n) => {
  if (n == null || isNaN(n)) return '—';
  return Math.round(n).toLocaleString('en-US');
};
const fmtDate = (d) => {
  if (!d) return '—';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return String(d);
  return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

// Stage model used per-school. Each stage is one of: not-started | in-progress | done
const STAGE_KEYS = ['foundation','mounting','module','earthing','cabletray','dccable','accable','coring','inverter','smdb','datalogger','energized','coc'];
const SCHOOL_STAGES = [
  'Foundation', 'PV Mounting', 'PV Module',
  'Earthing', 'Cable Tray', 'DC Cables', 'AC Cables', 'Coring', 'Inverter', 'SMDB', 'Data Logger',
  'Energized', 'COC Signed'
];
const STAGE_KEY_LABEL = STAGE_KEYS.reduce((a,k,i) => (a[k] = SCHOOL_STAGES[i], a), {});

const REMARKS = ['Active', 'Access issue', 'Excluded', 'Dismantled', 'Demolished', 'Closed'];
// Legacy 12-stage names for the "Stages view" toggle in the schools list
const LEGACY_SCHOOL_STAGES = [
  'Surveyed', 'SEC Approvals', 'Initial Payment', 'Final Payment',
  'Fix1 Delivered', 'Fix1 Installed', 'Fix2 Delivered', 'Fix2 Installed',
  'Energized', 'COC Signed', 'Handed Over to Zamil', 'Handed Over to Client',
];
const STATUS_VALUES = ['Not Started', 'In Progress', 'Completed'];

const PROJECT_STAGES = [
  { name: 'Project Awarding', sub: ['PO Signature', 'ESCO Sign Date', 'Tarsheed Sign Date'] },
  { name: 'Survey & Design', sub: ['Site visits', 'Design package', 'Internal review'] },
  { name: 'SEC Approval', sub: ['Submission', 'Authority review', 'Approval letter'] },
  { name: 'Bond Issue', sub: ['Performance bond', 'Advance payment bond'] },
  { name: 'Advance Payment', sub: ['Invoice', 'Receipt'] },
  { name: 'Material Procurement', sub: ['Material Planning', "Unpriced PO's", 'Vendor confirmation'] },
  { name: 'Mechanical Works', sub: ['Foundations', 'PV Mounting', 'PV Modules'] },
  { name: 'Electrical Works', sub: ['Cable trays', 'Cables', 'Inverter', 'SMDB'] },
  { name: 'Energization', sub: ['Meter swap', 'SEC switch-on'] },
  { name: 'Handover', sub: ['COC', 'Final docs'] },
];

const REGIONS = ['Dammam', 'Madinah', 'Qassim', 'Makkah', 'Al Jouf', 'Hail', 'Northern Borders', 'Najran', 'Jazan', 'Eastern', 'Riyadh'];

// ROLES (Round 5 — Site Engineer removed)
const ROLES = ['VP', 'Manager', 'Operations Manager', 'Program Manager', 'Project Manager', 'Material planning', 'Coordinator'];
const PROGRAM_MANAGER_GROUP = ['Manager', 'Operations Manager', 'Program Manager'];

// Round 6: per-user allowlists (by user.id) — name-based gating
const FINANCIALS_USERS     = ['u-vp', 'u-mgr1', 'u-mgr2'];               // Olaf, Fasiulla, Anas
const NEW_PROJECT_USERS    = ['u-mgr1', 'u-mgr2', 'u-pgm'];              // Fasiulla, Anas, Naif
const ESCALATE_TO_VP_USERS = ['u-mgr1', 'u-mgr2'];                       // Fasiulla, Anas (Managers only)
const AUDIT_LOG_USERS      = ['u-vp', 'u-mgr1', 'u-mgr2', 'u-op1', 'u-op2', 'u-pgm'];
// Round 10: Settings is Manager-only (by user.id, not by role)
const SETTINGS_USERS       = ['u-mgr1', 'u-mgr2'];                       // Fasiulla, Anas only
function canViewFinancials(u) { return !!u && FINANCIALS_USERS.indexOf(u.id) !== -1; }
function canCreateProject(u)  { return !!u && NEW_PROJECT_USERS.indexOf(u.id) !== -1; }
function canEscalateToVP(u)   { return !!u && ESCALATE_TO_VP_USERS.indexOf(u.id) !== -1; }
function canViewAuditLog(u)   { return !!u && AUDIT_LOG_USERS.indexOf(u.id) !== -1; }
function canViewSettings(u)   { return !!u && SETTINGS_USERS.indexOf(u.id) !== -1; }

// 15 real Zamil Services users
const PEOPLE = [
  { id: 'u-vp',    name: 'Olaf Heyns',          role: 'VP',                 region: 'Riyadh',  initials: 'OH', email: 'Olaf.Heyns@coolcare.com.sa' },
  { id: 'u-mgr1',  name: 'Fasiulla Baig',       role: 'Manager',            region: 'Riyadh',  initials: 'FB', email: 'fasi@coolcare.com.sa' },
  { id: 'u-mgr2',  name: 'Anas Alshahrani',     role: 'Manager',            region: 'Riyadh',  initials: 'AA', email: 'Anas.Alshahrani@coolcare.com.sa' },
  { id: 'u-op1',   name: 'Syed Farooq Ahmed',   role: 'Operations Manager', region: 'Riyadh',  initials: 'SF', email: 'Syed.Farooq@coolcare.com.sa' },
  { id: 'u-op2',   name: 'Syed Azam',           role: 'Operations Manager', region: 'Riyadh',  initials: 'SA', email: 'Syed.Azam@coolcare.com.sa' },
  { id: 'u-pgm',   name: 'Naif Alsalmah',       role: 'Program Manager',    region: 'Riyadh',  initials: 'NS', email: 'Naif.AlSalmah@coolcare.com.sa' },
  { id: 'u-mat',   name: 'Farhan Ansari',       role: 'Material planning',  region: 'Riyadh',  initials: 'FA', email: 'Farhan.Ansari@coolcare.com.sa' },
  { id: 'u-coord', name: 'Nojood Aljughaiman',  role: 'Coordinator',        region: 'Riyadh',  initials: 'NA', email: 'Nojood.Aljughaiman@coolcare.com.sa' },
  // Project Managers, each assigned to projectIds (multiple where applicable)
  { id: 'u-pm1',   name: 'Muhammad Rafique',    role: 'Project Manager',    region: 'Northern Borders', initials: 'MR', email: 'Muhammad.Rafique@coolcare.com.sa', projectIds: ['p-nb','p-hai','p-jof'] },
  { id: 'u-pm2',   name: 'Waleed Dawood',       role: 'Project Manager',    region: 'Jazan',            initials: 'WD', email: 'Waleed.Dawood@coolcare.com.sa',  projectIds: ['p-jaz'] },
  { id: 'u-pm3',   name: 'Nashir AlSagoor',     role: 'Project Manager',    region: 'Najran',           initials: 'NS', email: 'Nashir.AlSagoor@coolcare.com.sa', projectIds: ['p-naj'] },
  { id: 'u-pm4',   name: 'Shah Haji',           role: 'Project Manager',    region: 'Jazan',            initials: 'SH', email: 'Shah.Haji@coolcare.com.sa',      projectIds: ['p-jaz'] },
  { id: 'u-pm5',   name: 'Ali Hasanain',        role: 'Project Manager',    region: 'Makkah',           initials: 'AH', email: 'Ali.Hasnain@coolcare.com.sa',    projectIds: ['p-mak1','p-mak2','p-jed'] },
  { id: 'u-pm6',   name: 'Nasser Alhajri',      role: 'Project Manager',    region: 'Eastern',          initials: 'NH', email: 'Nasser.AlHajri@coolcare.com.sa', projectIds: ['p-has','p-dam'] },
  { id: 'u-pm7',   name: 'Sanif Anwar',         role: 'Project Manager',    region: 'Riyadh',           initials: 'SX', email: 'Sanif.Anwar.x@coolcare.com.sa',  projectIds: ['p-riy','p-qas','p-mad'] },
];

// 13 Zamil projects (from Master Daily Report sheets)
const PROJECTS = [
  { id: 'p-dam',  tag: 'Dammam-1',  name: 'Dammam Schools Solar Program',           region: 'Dammam',           city: 'Dammam',  status: 'On Track' },
  { id: 'p-mad',  tag: 'Madina-1',  name: 'Madina Schools Solar Program',           region: 'Madinah',          city: 'Madinah', status: 'On Track' },
  { id: 'p-qas',  tag: 'Qassim-1',  name: 'Qassim Schools Solar Program',           region: 'Qassim',           city: 'Buraydah',status: 'On Track' },
  { id: 'p-jed',  tag: 'Jeddah-1',  name: 'Jeddah Schools Solar Program',           region: 'Makkah',           city: 'Jeddah',  status: 'At Risk' },
  { id: 'p-mak1', tag: 'Makkah-1',  name: 'Makkah Schools Solar Program (Mk-1)',    region: 'Makkah',           city: 'Makkah',  status: 'On Track' },
  { id: 'p-jof',  tag: 'Al Jouf-1', name: 'Al Jouf Schools Solar Program',          region: 'Al Jouf',          city: 'Sakaka',  status: 'On Track' },
  { id: 'p-hai',  tag: 'Hail-1',    name: 'Hail Schools Solar Program',             region: 'Hail',             city: 'Hail',    status: 'On Track' },
  { id: 'p-nb',   tag: 'NB-1',      name: 'Northern Borders Schools Solar Program', region: 'Northern Borders', city: 'Arar',    status: 'On Track' },
  { id: 'p-naj',  tag: 'Najran-1',  name: 'Najran Schools Solar Program',           region: 'Najran',           city: 'Najran',  status: 'On Track' },
  { id: 'p-jaz',  tag: 'Jazan-1',   name: 'Jazan Schools Solar Program',            region: 'Jazan',            city: 'Jazan',   status: 'Delayed' },
  { id: 'p-has',  tag: 'Al Hasa-1', name: 'Al Hasa Schools Solar Program',          region: 'Eastern',          city: 'Al Hasa', status: 'On Track' },
  { id: 'p-riy',  tag: 'Riyadh-3',  name: 'Riyadh Schools Solar Program (R-3)',     region: 'Riyadh',           city: 'Riyadh',  status: 'On Track' },
  { id: 'p-mak2', tag: 'Makkah-2',  name: 'Makkah Schools Solar Program (Mk-2)',    region: 'Makkah',           city: 'Makkah',  status: 'On Track' },
];

// Assign PM/contract value/start/target/sites per project, computed from real schools
PROJECTS.forEach((p, idx) => {
  const pmPerson = PEOPLE.find(u => u.role === 'Project Manager' && u.projectIds && u.projectIds.includes(p.id));
  p.pmId = pmPerson ? pmPerson.id : null;
  p.type = 'School Program';
  p.value = 380_000_000 + idx * 12_000_000;
  p.start = '2025-' + String((idx % 12) + 1).padStart(2, '0') + '-10';
  p.target = '2026-' + String(((idx + 5) % 12) + 1).padStart(2, '0') + '-30';
});

// Contractors — generic stand-ins (Round 5 deemphasizes contractors; Program Manager edits these)
const CONTRACTORS = [
  { id: 'c1', name: 'Al-Bawani Construction', region: 'Hail',    activeSites: 84, schedule: 88, quality: 85, hse: 92, docs: 87, projects: ['p-hai','p-nb','p-jof'], trend: [80,82,86,88] },
  { id: 'c2', name: 'Saudi Solar Works',      region: 'Najran',  activeSites: 62, schedule: 78, quality: 82, hse: 80, docs: 75, projects: ['p-naj'], trend: [70,72,76,78] },
  { id: 'c3', name: 'Eastern Energy Co.',     region: 'Dammam',  activeSites: 95, schedule: 87, quality: 88, hse: 86, docs: 90, projects: ['p-dam','p-has'], trend: [80,82,86,88] },
  { id: 'c4', name: 'Jazan Power Solutions',  region: 'Jazan',   activeSites: 41, schedule: 65, quality: 72, hse: 70, docs: 62, projects: ['p-jaz'], trend: [72,68,65,65] },
  { id: 'c5', name: 'Makkah MEP Group',       region: 'Makkah',  activeSites: 73, schedule: 84, quality: 86, hse: 82, docs: 84, projects: ['p-mak1','p-mak2','p-jed'], trend: [78,80,82,84] },
  { id: 'c6', name: 'Riyadh Capital Solar',   region: 'Riyadh',  activeSites: 55, schedule: 88, quality: 90, hse: 88, docs: 91, projects: ['p-riy','p-qas','p-mad'], trend: [84,86,88,88] },
];
const CONTRACTOR_NAMES = CONTRACTORS.map(c => c.name);

// MATERIALS catalog — 45 from required_materials.xlsx
const MATERIALS_CATALOG = [
  {
    "no": 1,
    "name": "2C Shielded Cable (Belden)",
    "unit": "Meter",
    "ref": "Belden Cable",
    "category": "FIX_1"
  },
  {
    "no": 2,
    "name": "50*50 HDG (90 micron) Perforated Cable tray with 2mm Thickness 3M/Length",
    "unit": "Meter",
    "ref": "Cable Tray",
    "category": "FIX_1"
  },
  {
    "no": 3,
    "name": "DC Cable (Black)",
    "unit": "Meter",
    "ref": "Cables",
    "category": "FIX_1"
  },
  {
    "no": 4,
    "name": "DC Cable (Red)",
    "unit": "Meter",
    "ref": "Cables",
    "category": "FIX_1"
  },
  {
    "no": 5,
    "name": "Jinko Extension Cable",
    "unit": "EACH",
    "ref": "Cables",
    "category": "University"
  },
  {
    "no": 6,
    "name": "Riyadh Cables 1CX16 Sqmm Y/G",
    "unit": "Meter",
    "ref": "Cables",
    "category": "FIX_2"
  },
  {
    "no": 7,
    "name": "Riyadh Cables 4CX16 Sqmm CU , XLPE , PVC 90deg",
    "unit": "Meter",
    "ref": "Cables",
    "category": "FIX_2"
  },
  {
    "no": 8,
    "name": "Riyadh Cables 4CX25 Sqmm CU , XLPE , PVC 90deg",
    "unit": "Meter",
    "ref": "Cables",
    "category": "FIX_2"
  },
  {
    "no": 9,
    "name": "1'' EMT Pipe Elbow",
    "unit": "Meter",
    "ref": "Conduit",
    "category": "University"
  },
  {
    "no": 10,
    "name": "1.5\" Flexible conduit",
    "unit": "Meter",
    "ref": "Conduit",
    "category": "FIX_1"
  },
  {
    "no": 11,
    "name": "1/2'' EMT Pipe",
    "unit": "Meter",
    "ref": "Conduit",
    "category": "FIX_2"
  },
  {
    "no": 12,
    "name": "1/2\" Liquid Tight Conduit UV Rated",
    "unit": "Meter",
    "ref": "Conduit",
    "category": "FIX_1"
  },
  {
    "no": 13,
    "name": "3/4'' EMT Pipe",
    "unit": "Meter",
    "ref": "Conduit",
    "category": "University"
  },
  {
    "no": 14,
    "name": "10 Sqmm Earthing Cable for 12 KTL",
    "unit": "Meter",
    "ref": "Earthing",
    "category": "FIX_2"
  },
  {
    "no": 15,
    "name": "4 Sqmm Earthing cable",
    "unit": "Meter",
    "ref": "Earthing",
    "category": "FIX_1"
  },
  {
    "no": 16,
    "name": "6 Sqmm Earthing Cable (Y/G)",
    "unit": "Meter",
    "ref": "Earthing",
    "category": "FIX_1"
  },
  {
    "no": 17,
    "name": "Inverter 12 KTL 380 V",
    "unit": "EACH",
    "ref": "Equipment",
    "category": "FIX_2"
  },
  {
    "no": 18,
    "name": "Inverter 20 KTL 220 V",
    "unit": "EACH",
    "ref": "Equipment",
    "category": "FIX_2"
  },
  {
    "no": 19,
    "name": "Inverter 50 KTL",
    "unit": "EACH",
    "ref": "Equipment",
    "category": "FIX_2"
  },
  {
    "no": 20,
    "name": "Foundations (400*200*250mm L*W*H)",
    "unit": "EACH",
    "ref": "Foundation",
    "category": "FIX_1"
  },
  {
    "no": 21,
    "name": "CT 1000",
    "unit": "EACH",
    "ref": "Instrument",
    "category": "FIX_2"
  },
  {
    "no": 22,
    "name": "CT 1200",
    "unit": "EACH",
    "ref": "Instrument",
    "category": "FIX_2"
  },
  {
    "no": 23,
    "name": "CT 1250",
    "unit": "EACH",
    "ref": "Instrument",
    "category": "FIX_2"
  },
  {
    "no": 24,
    "name": "CT 1500",
    "unit": "EACH",
    "ref": "Instrument",
    "category": "FIX_2"
  },
  {
    "no": 25,
    "name": "CT 1600",
    "unit": "EACH",
    "ref": "Instrument",
    "category": "FIX_2"
  },
  {
    "no": 26,
    "name": "CT 1800",
    "unit": "EACH",
    "ref": "Instrument",
    "category": "FIX_2"
  },
  {
    "no": 27,
    "name": "CT 2000",
    "unit": "EACH",
    "ref": "Instrument",
    "category": "FIX_2"
  },
  {
    "no": 28,
    "name": "CT 2500",
    "unit": "EACH",
    "ref": "Instrument",
    "category": "FIX_2"
  },
  {
    "no": 29,
    "name": "CT 3000",
    "unit": "EACH",
    "ref": "Instrument",
    "category": "FIX_2"
  },
  {
    "no": 30,
    "name": "CT 400",
    "unit": "EACH",
    "ref": "Instrument",
    "category": "FIX_2"
  },
  {
    "no": 31,
    "name": "CT 600",
    "unit": "EACH",
    "ref": "Instrument",
    "category": "FIX_2"
  },
  {
    "no": 32,
    "name": "CT 800",
    "unit": "EACH",
    "ref": "Instrument",
    "category": "FIX_2"
  },
  {
    "no": 33,
    "name": "PV Panel (585Wp)",
    "unit": "EACH",
    "ref": "Module",
    "category": "FIX_1"
  },
  {
    "no": 34,
    "name": "PV Panel (620Wp)",
    "unit": "EACH",
    "ref": "Module",
    "category": "FIX_2"
  },
  {
    "no": 35,
    "name": "SMDB 32A",
    "unit": "EACH",
    "ref": "Protection",
    "category": "FIX_2"
  },
  {
    "no": 36,
    "name": "SMDB 63A",
    "unit": "EACH",
    "ref": "Protection",
    "category": "FIX_2"
  },
  {
    "no": 37,
    "name": "SMDB 1000A",
    "unit": "EACH",
    "ref": "Protection",
    "category": "University"
  },
  {
    "no": 38,
    "name": "SMDB 1250A",
    "unit": "EACH",
    "ref": "Protection",
    "category": "University"
  },
  {
    "no": 39,
    "name": "SMDB 125A",
    "unit": "EACH",
    "ref": "Protection",
    "category": "University"
  },
  {
    "no": 40,
    "name": "SMDB 1500A",
    "unit": "EACH",
    "ref": "Protection",
    "category": "University"
  },
  {
    "no": 41,
    "name": "SMDB 250A",
    "unit": "EACH",
    "ref": "Protection",
    "category": "University"
  },
  {
    "no": 42,
    "name": "SMDB 400A",
    "unit": "EACH",
    "ref": "Protection",
    "category": "University"
  },
  {
    "no": 43,
    "name": "SMDB 500A",
    "unit": "EACH",
    "ref": "Protection",
    "category": "University"
  },
  {
    "no": 44,
    "name": "SMDB 630A",
    "unit": "EACH",
    "ref": "Protection",
    "category": "University"
  },
  {
    "no": 45,
    "name": "SMDB 800A",
    "unit": "EACH",
    "ref": "Protection",
    "category": "University"
  }
];

// Compose ALL_SCHOOLS from the inlined ZAMIL_SCHOOLS dataset (data-schools.jsx loaded first)
const ALL_SCHOOLS = (typeof ZAMIL_SCHOOLS !== 'undefined' ? ZAMIL_SCHOOLS : []).map(s => {
  // Pre-assign a contractor per project (deterministic) so demos look realistic
  const projContractor = (CONTRACTORS.find(c => c.projects && c.projects.includes(s.projectId)) || {}).id || '';
  const stagesObj = s.stages || {};
  // Compute stage progress, last update, and "stages" array for compat with old code (12 booleans approx)
  const stageArr = STAGE_KEYS.map(k => {
    const v = stagesObj[k] || 'not-started';
    return {
      done: v === 'done',
      date: v === 'done' ? (s.installStart || s.survey || '2026-01-01') : null,
      by: v === 'done' ? 'u-pm1' : null,
      statusId: v === 'done' ? 'done' : (v === 'in-progress' ? 'in-progress' : 'not-started'),
    };
  });
  return {
    id: s.id,
    code: s.id,                                    // School ID acts as code
    projectId: s.projectId,
    name: s.nameEn || s.nameAr || s.id,
    nameAr: s.nameAr || '',
    nameEn: s.nameEn || '',
    level: s.level || 'Primary',
    gender: s.gender || 'Boys',
    region: s.region,
    city: s.city,
    coords: s.coords || '',
    meter: s.meter || '',
    account: s.account || '',
    survey: s.survey,
    installStart: s.installStart,
    address: (s.city || '') + (s.region ? ', ' + s.region : ''),
    type: s.level || 'Primary',
    kw: 100,                                      // default kWp (not in source)
    contractor: s.contractor || projContractor,
    photos: {},
    issues: [],
    remark: 'Active',
    status: s.status || 'Not Started',
    stages: stageArr,
    rawStages: stagesObj,                          // {key: status}
    lastUpdate: { by: null, when: null },
    materialUsage: [],                             // {materialNo, qty, date, by}
    deliveryNotes: [],                             // {id, name, date}
    photosList: [],                                // {id, name, date}
  };
});

// Compute project rollup metrics from schools
PROJECTS.forEach(p => {
  const ss = ALL_SCHOOLS.filter(s => s.projectId === p.id);
  p.sites = ss.length;
  const totalStages = ss.length * STAGE_KEYS.length;
  const doneStages = ss.reduce((a, s) => a + s.stages.filter(st => st.done).length, 0);
  p.progress = totalStages > 0 ? Math.round((doneStages / totalStages) * 100) : 0;
  // Distribution of "reached stage" per stage index
  const dist = STAGE_KEYS.map(() => 0);
  ss.forEach(s => {
    const reached = s.stages.filter(st => st.done).length;
    if (reached > 0) dist[reached - 1]++;
  });
  p.schoolDist = dist;
  p.currentStage = Math.min(STAGE_KEYS.length - 1, Math.max(0, Math.round(dist.indexOf(Math.max(...dist)))));
});

// Tasks (deterministic seed against new people + projects)
function makeRng(seed) {
  let s = seed;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 0xffffffff; };
}
function generateTasks() {
  const rng = makeRng(31337);
  const titles = [
    'Submit SEC approval package','Site survey verification','Inverter commissioning','Earthing test report',
    'Roof access coordination with principal','Order Fix2 cables','Submit MS/MOS for client approval',
    'Photo evidence upload — Fix1','Bond renewal','COC submission to authority','NCR closeout — torque records',
    'Material delivery inspection','Energization handover meeting','Update progress report','Snag list closeout',
    'Quality audit walk-through','Submit warranty documents','Coordinate with utility for meter swap',
    'Review subcontractor invoice','Permit-to-work renewal','String performance test','Inspect Fix1 mounting torque',
    'Update QA/QC log','Submit weekly progress to client','Approve material substitution request'
  ];
  const tasks = [];
  const assignablePM = PEOPLE.filter(p => p.role === 'Project Manager').map(p => p.id);
  const others = ['u-mat','u-coord','u-pgm'];
  for (let i = 0; i < 26; i++) {
    const proj = PROJECTS[Math.floor(rng() * PROJECTS.length)];
    const projSchools = ALL_SCHOOLS.filter(s => s.projectId === proj.id);
    const sch = rng() < 0.6 && projSchools.length ? projSchools[Math.floor(rng() * projSchools.length)] : null;
    const stage = rng() < 0.5 ? Math.floor(rng() * STAGE_KEYS.length) : null;
    const pool = rng() < 0.7 ? assignablePM : others;
    const assignee = pool[Math.floor(rng() * pool.length)];
    const today = new Date('2026-05-11').getTime();
    const dueOffset = Math.floor((rng() - 0.35) * 21);
    const due = new Date(today + dueOffset * 86400000).toISOString().slice(0, 10);
    const priority = rng() < 0.25 ? 'High' : rng() < 0.6 ? 'Medium' : 'Low';
    const created = new Date(today - Math.floor(rng() * 14) * 86400000).toISOString().slice(0, 10);
    const status = rng() < 0.15 ? 'Done' : rng() < 0.35 ? 'In Progress' : 'Open';
    tasks.push({
      id: 't' + (i + 1), title: titles[i % titles.length],
      description: 'Coordinate with the responsible team and update progress in the dashboard once the activity is complete. Attach all required documentation.',
      assigneeId: assignee, createdById: 'u-pgm', createdAt: created,
      due, priority, status,
      projectId: proj.id, schoolId: sch ? sch.id : null,
      stageIndex: stage, messages: [],
    });
  }
  return tasks;
}
const TASKS = generateTasks();

// Chats — seeded for 4 schools
const PRE_CHATS = (() => {
  const sample = ALL_SCHOOLS.slice(0, 4);
  const today = new Date('2026-05-11T10:00:00').getTime();
  const chats = {};
  if (sample[0]) chats[sample[0].id] = [
    { id: 'm1', userId: 'u-pm1', text: 'Earthing reading 0.4Ω — within spec.', when: new Date(today - 26 * 3600000).toISOString(), mentions: [] },
    { id: 'm2', userId: 'u-mat', text: '@u-pgm please review QA/QC log before energization.', when: new Date(today - 22 * 3600000).toISOString(), mentions: ['u-pgm'] },
    { id: 'm3', userId: 'u-pgm', text: 'Reviewed — torque records OK, signed off.', when: new Date(today - 20 * 3600000).toISOString(), mentions: [] },
  ];
  if (sample[1]) chats[sample[1].id] = [
    { id: 'm5', userId: 'u-pm2', text: 'Fix1 partly delivered, 2 pallets short on cable trays.', when: new Date(today - 30 * 3600000).toISOString(), mentions: [] },
    { id: 'm6', userId: 'u-mat', text: '@u-coord can you push the supplier on the missing pallets?', when: new Date(today - 28 * 3600000).toISOString(), mentions: ['u-coord'] },
  ];
  if (sample[2]) chats[sample[2].id] = [
    { id: 'm8', userId: 'u-pm5', text: 'Access blocked again — school caretaker not on-site.', when: new Date(today - 5 * 3600000).toISOString(), mentions: [] },
    { id: 'm9', userId: 'u-pgm', text: '@u-pm5 escalated to MoE focal point.', when: new Date(today - 4 * 3600000).toISOString(), mentions: ['u-pm5'] },
  ];
  if (sample[3]) chats[sample[3].id] = [
    { id: 'm10', userId: 'u-pm7', text: 'Survey draft uploaded. @u-pgm please confirm SEC submission window.', when: new Date(today - 8 * 3600000).toISOString(), mentions: ['u-pgm'] },
  ];
  return chats;
})();

// Notifications
const SAMPLE_NOTIFS = [
  { id: 'n1', kind: 'mention',  text: 'Naif Alsalmah mentioned you in a school chat', target: { kind: 'school', id: ALL_SCHOOLS[0]?.id }, when: '12 min ago', read: false },
  { id: 'n2', kind: 'task',     text: 'New task assigned: ' + (TASKS[0]?.title || 'Submit report'), target: { kind: 'task', id: TASKS[0]?.id }, when: '32 min ago', read: false },
  { id: 'n3', kind: 'overdue',  text: 'Task overdue: ' + (TASKS[2]?.title || 'NCR closeout'), target: { kind: 'task', id: TASKS[2]?.id }, when: '1 hr ago', read: false },
  { id: 'n4', kind: 'stage',    text: 'Hail program advanced to "Material Procurement"', target: { kind: 'project', id: 'p-hai' }, when: '3 hr ago', read: true },
  { id: 'n5', kind: 'pay',      text: 'Payment received: SAR 82.4M — Hail 3rd milestone', target: { kind: 'project', id: 'p-hai' }, when: 'yesterday', read: true },
].filter(n => n.target && n.target.id);

// Financials (per project rollup)
const FIN = PROJECTS.map(p => {
  const invoiced = Math.round(p.value * (p.progress / 100) * 0.92);
  const received = Math.round(invoiced * 0.78);
  const outstanding = invoiced - received;
  const milestones = [
    { name: 'Advance Payment', due: '2025-03-15', received: '2025-04-02', amount: Math.round(p.value * 0.10), status: 'Paid' },
    { name: '2nd Payment',     due: '2025-08-01', received: '2025-08-12', amount: Math.round(p.value * 0.20), status: 'Paid' },
    { name: '3rd Payment',     due: '2026-02-15', received: p.progress > 50 ? '2026-03-04' : null, amount: Math.round(p.value * 0.30), status: p.progress > 50 ? 'Paid' : 'Due' },
    { name: 'Final Payment',   due: '2026-12-30', received: null, amount: Math.round(p.value * 0.40), status: 'Scheduled' },
  ];
  return { projectId: p.id, total: p.value, invoiced, received, outstanding, milestones };
});

const FIN_CURVE = (() => {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  let cumI = 0, cumR = 0;
  return months.map((m, i) => {
    cumI += 90 + Math.round(Math.sin(i / 2) * 30) + i * 15;
    cumR += 70 + Math.round(Math.sin(i / 2 + 0.6) * 25) + i * 13;
    return { month: m, invoiced: cumI, received: cumR };
  });
})();

// Materials usage list (per-school consumption)
const MATERIALS_USAGE = []; // {id, schoolId, materialNo, qty, unit, date, by}

// Old MATERIALS array kept for backwards compat (warehouse inventory style)
const MATERIALS = MATERIALS_CATALOG.slice(0, 20).map((m, i) => ({
  id: 'mat-' + (i + 1), fix: m.category === 'FIX_2' ? 'Fix2' : (m.category === 'University' ? 'Fix2' : 'Fix1'),
  item: m.name, projectId: PROJECTS[i % PROJECTS.length].id,
  planned: 1000 + i * 100, ordered: 900 + i * 90, dWh: 800 + i * 80, dSite: 700 + i * 70, installed: 600 + i * 60,
  status: 'Installing', archived: false, materialNo: m.no, unit: m.unit,
}));

const REPORT_TYPES = ['Master Daily Report', 'Material Consumption Report', 'Zamil Report'];
const SAVED_REPORTS = [
  { id: 'r1', type: 'Master Daily Report',        project: 'All Projects',  by: 'Naif Alsalmah',  date: '2026-04-30', formats: ['xlsx'] },
  { id: 'r2', type: 'Material Consumption Report', project: 'Hail-1',       by: 'Farhan Ansari',   date: '2026-04-28', formats: ['xlsx'] },
  { id: 'r3', type: 'Zamil Report',                project: 'Hail-1',       by: 'Naif Alsalmah',   date: '2026-04-27', formats: ['xlsx'] },
];

const ACTIVITY = [
  { who: 'Naif Alsalmah',   what: 'updated KPI threshold for Schedule Score',    when: '2h ago' },
  { who: 'Farhan Ansari',   what: 'logged material consumption: DC Cables 320m', when: '4h ago' },
  { who: 'Nojood Aljughaiman', what: 'imported 200 schools to Jeddah-1',         when: '1d ago' },
  { who: 'System',          what: 'auto-advanced 12 schools to "Energized" — Hail', when: '1d ago' },
];

Object.assign(window, {
  SAR, SARfull, fmtDate,
  SCHOOL_STAGES, STAGE_KEYS, STAGE_KEY_LABEL, LEGACY_SCHOOL_STAGES,
  REMARKS, STATUS_VALUES, PROJECT_STAGES, REGIONS, ROLES, PROGRAM_MANAGER_GROUP,
  FINANCIALS_USERS, NEW_PROJECT_USERS, ESCALATE_TO_VP_USERS, AUDIT_LOG_USERS, SETTINGS_USERS,
  canViewFinancials, canCreateProject, canEscalateToVP, canViewAuditLog, canViewSettings,
  PEOPLE, PROJECTS, ALL_SCHOOLS, CONTRACTORS, CONTRACTOR_NAMES,
  MATERIALS, MATERIALS_CATALOG, MATERIALS_USAGE,
  FIN, FIN_CURVE,
  TASKS, PRE_CHATS, SAMPLE_NOTIFS, REPORT_TYPES, SAVED_REPORTS, ACTIVITY,
  makeRng,
});
