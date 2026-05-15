// Round 5 mock data: escalations, custom fields, milestones, financial entries
// Updated for Zamil hierarchy (no Site Engineer, no Recycle Bin)

const STAGE_STATUSES_DEFAULT = [
  { id: 'not-started', label: 'Not Started', color: '#94A3B8', terminal: false, builtin: true },
  { id: 'in-progress', label: 'In Progress', color: '#0284C7', terminal: false, builtin: true },
  { id: 'blocked',     label: 'Blocked',     color: '#DC2626', terminal: false, builtin: true },
  { id: 'done',        label: 'Done',        color: '#16A34A', terminal: true,  builtin: true },
  { id: 'skipped',     label: 'Skipped',     color: '#A78BFA', terminal: true,  builtin: true },
];

const LIFECYCLE_STAGES_DEFAULT = PROJECT_STAGES.map((s, i) => ({
  id: 'ls' + (i + 1), name: s.name, order: i,
  color: i < 3 ? '#13315C' : i < 6 ? '#2A5A9A' : i < 9 ? '#B8860B' : '#C8102E',
  criteria: 'Approval document signed and uploaded', archived: false,
}));

const CUSTOM_FIELDS_DEFAULT = {
  school: [
    { id: 'cf-s1', label: 'Roof Type',         type: 'dropdown', options: ['Concrete', 'Metal', 'Membrane'], required: false },
    { id: 'cf-s2', label: 'Inspection Date',   type: 'date',     required: false },
  ],
  material: [
    { id: 'cf-m1', label: 'Vendor',            type: 'text',     required: false },
    { id: 'cf-m2', label: 'Country of Origin', type: 'dropdown', options: ['China', 'Germany', 'KSA', 'India'], required: false },
  ],
};

const MILESTONE_TEMPLATES_DEFAULT = [
  { id: 'mt1', name: 'Schedule Adherence', weight: 30, fields: [
      { id: 'f1', label: 'Planned Date',  type: 'date' },
      { id: 'f2', label: 'Actual Date',   type: 'date' },
      { id: 'f3', label: 'Score (0-100)', type: 'number' },
      { id: 'f4', label: 'Evidence Doc',  type: 'file' },
    ] },
  { id: 'mt2', name: 'Quality Audit', weight: 30, fields: [
      { id: 'f1', label: 'Audit Date',   type: 'date' },
      { id: 'f2', label: 'NCRs Raised',  type: 'number' },
      { id: 'f3', label: 'Score (0-100)', type: 'number' },
      { id: 'f4', label: 'Audit Report', type: 'file' },
    ] },
  { id: 'mt3', name: 'Payment Received', weight: 20, fields: [
      { id: 'f1', label: 'Amount Paid',     type: 'number' },
      { id: 'f2', label: 'Date Paid',       type: 'date' },
      { id: 'f3', label: 'Next Payment Due',type: 'date' },
      { id: 'f4', label: 'Payment Doc',     type: 'file' },
    ] },
  { id: 'mt4', name: 'HSE Compliance', weight: 20, fields: [
      { id: 'f1', label: 'Inspection Date', type: 'date' },
      { id: 'f2', label: 'Incidents',       type: 'number' },
      { id: 'f3', label: 'Score (0-100)',   type: 'number' },
    ] },
];

const MILESTONE_ENTRIES_DEFAULT = (() => {
  const rng = makeRng(54321);
  const entries = [];
  CONTRACTORS.forEach(c => {
    MILESTONE_TEMPLATES_DEFAULT.forEach(mt => {
      const score = Math.round(60 + rng() * 35);
      const values = {};
      mt.fields.forEach(f => {
        if (f.label.includes('Score')) values[f.id] = score;
        else if (f.type === 'date')    values[f.id] = '2026-0' + (1 + Math.floor(rng() * 4)) + '-' + (10 + Math.floor(rng() * 18));
        else if (f.type === 'number')  values[f.id] = Math.floor(rng() * 5);
        else if (f.type === 'file')    values[f.id] = 'uploaded.pdf';
      });
      entries.push({ id: 'me-' + c.id + '-' + mt.id, contractorId: c.id, templateId: mt.id, values, when: '2026-04-15' });
    });
  });
  return entries;
})();

const FINANCIAL_ENTRIES_DEFAULT = (() => {
  const out = [];
  let id = 1;
  PROJECTS.forEach(p => {
    const milestones = [
      { name: 'Advance Payment', pct: 0.10, date: '2025-04-02', paid: true },
      { name: '2nd Payment',     pct: 0.20, date: '2025-08-12', paid: true },
      { name: '3rd Payment',     pct: 0.30, date: '2026-03-04', paid: p.progress > 50 },
      { name: 'Final Payment',   pct: 0.40, date: '2026-12-30', paid: false },
    ];
    milestones.forEach(m => {
      out.push({
        id: 'fe' + (id++), type: m.paid ? 'Receipt' : 'Receivable',
        projectId: p.id, contractorId: null,
        amount: Math.round(p.value * m.pct), date: m.date,
        relatedMilestone: m.name, notes: m.name + ' from client',
        document: m.paid ? p.id + '-' + m.name.replace(' ', '-') + '.pdf' : null,
        archived: false,
      });
    });
  });
  return out;
})();

// Sample escalations using new Zamil user IDs and hierarchy
const ESCALATIONS_DEFAULT = [
  {
    id: 'esc1', title: 'SEC approval delays blocking 32 schools in Jazan',
    fromUserId: 'u-pm2', toRole: 'VP', toUserId: 'u-vp',
    projectId: 'p-jaz', schoolId: null, taskId: null,
    reason: 'SEC has held our submission for 6 weeks. Need executive intervention.',
    urgency: 'High', status: 'Open', currentlyWith: 'u-vp',
    opened: '2026-04-22', daysOpen: 12,
    chain: [
      { fromUserId: 'u-pm2', toUserId: 'u-pgm', toRole: 'Program Manager', when: '2026-04-22', action: 'Escalated' },
      { fromUserId: 'u-pgm', toUserId: 'u-vp',  toRole: 'VP',              when: '2026-04-23', action: 'Forwarded' },
    ],
    history: [
      { who: 'u-pm2', when: '2026-04-22', action: 'Created',     note: 'Escalating — SEC stuck.' },
      { who: 'u-pgm', when: '2026-04-23', action: 'Forwarded',   note: 'Forwarded to VP — needs executive intervention with SEC.' },
      { who: 'u-vp',  when: '2026-04-25', action: 'Acknowledged',note: 'Reaching out to SEC director.' },
    ],
  },
  {
    id: 'esc2', title: 'Cash flow risk — Najran 3rd payment 30 days overdue',
    fromUserId: 'u-pgm', toRole: 'VP', toUserId: 'u-vp',
    projectId: 'p-naj', schoolId: null, taskId: null,
    reason: 'Client has not released 3rd payment. Subcontractor threatening to pull resources.',
    urgency: 'High', status: 'Open', currentlyWith: 'u-vp',
    opened: '2026-04-28', daysOpen: 6,
    chain: [{ fromUserId: 'u-pgm', toUserId: 'u-vp', toRole: 'VP', when: '2026-04-28', action: 'Escalated' }],
    history: [
      { who: 'u-pgm', when: '2026-04-28', action: 'Created',     note: 'Cash flow blocker.' },
      { who: 'u-vp',  when: '2026-04-30', action: 'Acknowledged',note: 'Coordinating with finance.' },
    ],
  },
  {
    id: 'esc3', title: 'Contractor performance — Jazan Power Solutions trending red',
    fromUserId: 'u-pm2', toRole: 'Program Manager', toUserId: 'u-pgm',
    projectId: 'p-jaz', schoolId: null, taskId: null,
    reason: 'Schedule and quality scores have dropped below 70 for 3 consecutive weeks.',
    urgency: 'Medium', status: 'Open', currentlyWith: 'u-pgm',
    opened: '2026-04-18', daysOpen: 16,
    chain: [{ fromUserId: 'u-pm2', toUserId: 'u-pgm', toRole: 'Program Manager', when: '2026-04-18', action: 'Escalated' }],
    history: [
      { who: 'u-pm2', when: '2026-04-18', action: 'Created', note: 'Need authorization to switch contractor scope.' },
    ],
  },
  {
    id: 'esc4', title: 'Material substitution approval — DC cables',
    fromUserId: 'u-pgm', toRole: 'VP', toUserId: 'u-vp',
    projectId: 'p-nb', schoolId: null, taskId: null,
    reason: 'Original spec cable unavailable. Vendor proposes equivalent KSA-made cable.',
    urgency: 'Medium', status: 'Open', currentlyWith: 'u-vp',
    opened: '2026-04-30', daysOpen: 4,
    chain: [{ fromUserId: 'u-pgm', toUserId: 'u-vp', toRole: 'VP', when: '2026-04-30', action: 'Escalated' }],
    history: [{ who: 'u-pgm', when: '2026-04-30', action: 'Created', note: 'Substitution dossier attached.' }],
  },
  {
    id: 'esc5', title: 'Access permissions — 8 schools blocked by Education Directorate',
    fromUserId: 'u-pm6', toRole: 'Program Manager', toUserId: 'u-pgm',
    projectId: 'p-has', schoolId: null, taskId: null,
    reason: 'Local directorate denying work crews access during exam season.',
    urgency: 'Low', status: 'Open', currentlyWith: 'u-pgm',
    opened: '2026-05-01', daysOpen: 3,
    chain: [{ fromUserId: 'u-pm6', toUserId: 'u-pgm', toRole: 'Program Manager', when: '2026-05-01', action: 'Escalated' }],
    history: [{ who: 'u-pm6', when: '2026-05-01', action: 'Created', note: 'Need MoE-level escalation.' }],
  },
  {
    id: 'esc6', title: 'NCR closeout dispute with QA/QC',
    fromUserId: 'u-pm1', toRole: 'VP', toUserId: 'u-vp',
    projectId: 'p-hai', schoolId: null, taskId: null,
    reason: 'QA/QC team disputing remedial action. Need executive arbitration.',
    urgency: 'Low', status: 'Resolved', currentlyWith: null, resolvedDate: '2026-04-20',
    opened: '2026-04-12', daysOpen: 8,
    chain: [
      { fromUserId: 'u-pm1', toUserId: 'u-pgm', toRole: 'Program Manager', when: '2026-04-12', action: 'Escalated' },
      { fromUserId: 'u-pgm', toUserId: 'u-vp',  toRole: 'VP',              when: '2026-04-13', action: 'Forwarded' },
    ],
    history: [
      { who: 'u-pm1', when: '2026-04-12', action: 'Created',   note: 'QA/QC blocking closeout.' },
      { who: 'u-pgm', when: '2026-04-13', action: 'Forwarded', note: 'Forwarded to VP.' },
      { who: 'u-vp',  when: '2026-04-15', action: 'Comment',   note: 'Reviewed both positions.' },
      { who: 'u-vp',  when: '2026-04-20', action: 'Resolved',  note: 'Approved remediation as acceptable.' },
    ],
  },
];

// ─────── Audit Log seed (Round 6) ─────────
// 100 pre-populated entries spread over the last 30 days, using the 15 real users.
const AUDIT_LOG_SEED = (() => {
  const rng = makeRng(98765);
  const actors = PEOPLE.map(p => ({ id: p.id, name: p.name, role: p.role }));
  const sampleSchools = ALL_SCHOOLS && ALL_SCHOOLS.length > 0
    ? [ALL_SCHOOLS[0], ALL_SCHOOLS[100], ALL_SCHOOLS[500], ALL_SCHOOLS[800], ALL_SCHOOLS[1200], ALL_SCHOOLS[1800], ALL_SCHOOLS[2400]].filter(Boolean)
    : [];
  const stageNames = SCHOOL_STAGES;
  const contractorNames = CONTRACTORS.map(c => c.name);
  const matNames = (typeof MATERIALS_CATALOG !== 'undefined' && MATERIALS_CATALOG.length) ? MATERIALS_CATALOG : [{ name: 'DC Cable' }, { name: 'Inverter' }];

  const TEMPLATES = [
    () => {
      const a = actors[Math.floor(rng() * actors.length)];
      const sch = sampleSchools[Math.floor(rng() * sampleSchools.length)] || {};
      const stage = stageNames[Math.floor(rng() * stageNames.length)];
      const stsTo = ['In Progress','Done','Blocked'][Math.floor(rng() * 3)];
      return { actor: a, action: 'UPDATE', entityType: 'school_stage', entityId: sch.id, entityLabel: sch.id + ' · ' + (sch.nameEn || ''), before: 'Not Started', after: stsTo, summary: `Stage "${stage}" → ${stsTo} on ${sch.id}` };
    },
    () => {
      const a = actors[Math.floor(rng() * actors.length)];
      const sch = sampleSchools[Math.floor(rng() * sampleSchools.length)] || {};
      const c = contractorNames[Math.floor(rng() * contractorNames.length)];
      return { actor: a, action: 'UPDATE', entityType: 'school', entityId: sch.id, entityLabel: sch.id + ' · ' + (sch.nameEn || ''), before: 'Unassigned', after: c, summary: `Contractor changed on ${sch.id} → ${c}` };
    },
    () => {
      const a = actors[Math.floor(rng() * actors.length)];
      const sch = sampleSchools[Math.floor(rng() * sampleSchools.length)] || {};
      const mat = matNames[Math.floor(rng() * matNames.length)];
      const qty = 20 + Math.floor(rng() * 480);
      return { actor: a, action: 'CREATE', entityType: 'material_usage', entityId: 'mu-' + Math.floor(rng() * 1e6), entityLabel: mat.name, summary: `Logged ${qty} ${mat.unit || 'EACH'} of ${mat.name} on ${sch.id}` };
    },
    () => {
      const a = actors[Math.floor(rng() * actors.length)];
      const titles = ['SEC approval blocking 32 schools','Cash flow risk','Contractor performance trending red','Material substitution approval','Access permissions blocked'];
      const t = titles[Math.floor(rng() * titles.length)];
      return { actor: a, action: 'CREATE', entityType: 'escalation', entityId: 'esc-' + Math.floor(rng() * 1e6), entityLabel: t, summary: `Escalation raised: "${t}"` };
    },
    () => {
      const a = actors[Math.floor(rng() * actors.length)];
      return { actor: a, action: 'LOGIN', entityType: 'session', entityId: a.id, entityLabel: a.name, summary: `${a.name} signed in` };
    },
    () => {
      const a = actors[Math.floor(rng() * actors.length)];
      return { actor: a, action: 'LOGOUT', entityType: 'session', entityId: a.id, entityLabel: a.name, summary: `${a.name} signed out` };
    },
    () => {
      const a = actors[Math.floor(rng() * actors.length)];
      const titles = ['Submit SEC approval package','Site survey verification','Earthing test report','Update progress report','Submit warranty documents'];
      const t = titles[Math.floor(rng() * titles.length)];
      const status = rng() < 0.4 ? 'Done' : 'In Progress';
      return { actor: a, action: 'UPDATE', entityType: 'task', entityId: 't-' + Math.floor(rng() * 1e6), entityLabel: t, before: 'Open', after: status, summary: `Task "${t}" → ${status}` };
    },
    () => {
      const a = actors[Math.floor(rng() * actors.length)];
      const ttype = ['Master Daily Report','Material Consumption Report','Zamil Report'][Math.floor(rng() * 3)];
      return { actor: a, action: 'EXPORT', entityType: 'report', entityId: 'rep-' + Math.floor(rng() * 1e6), entityLabel: ttype, summary: `Exported ${ttype}` };
    },
    () => {
      const a = actors[Math.floor(rng() * actors.length)];
      const sch = sampleSchools[Math.floor(rng() * sampleSchools.length)] || {};
      return { actor: a, action: 'UPDATE', entityType: 'school', entityId: sch.id, entityLabel: sch.id + ' · ' + (sch.nameEn || ''), before: 'Not Started', after: 'In Progress', summary: `Status of ${sch.id} → In Progress` };
    },
    () => {
      const a = actors[Math.floor(rng() * actors.length)];
      const lc = ['Project Awarding','Survey & Design','SEC Approval','Material Procurement'][Math.floor(rng() * 4)];
      return { actor: a, action: 'UPDATE', entityType: 'lifecycle_stage', entityId: 'ls-' + Math.floor(rng() * 100), entityLabel: lc, summary: `Lifecycle stage "${lc}" renamed/updated` };
    },
    () => {
      const a = actors[Math.floor(rng() * actors.length)];
      const sch = sampleSchools[Math.floor(rng() * sampleSchools.length)] || {};
      return { actor: a, action: 'CREATE', entityType: 'school_photo', entityId: sch.id, entityLabel: sch.id, summary: `Uploaded photo evidence for ${sch.id}` };
    },
    () => {
      const a = actors[Math.floor(rng() * actors.length)];
      const sch = sampleSchools[Math.floor(rng() * sampleSchools.length)] || {};
      return { actor: a, action: 'CREATE', entityType: 'delivery_note', entityId: sch.id, entityLabel: sch.id, summary: `Delivery note PDF uploaded for ${sch.id}` };
    },
  ];

  const list = [];
  const now = new Date('2026-05-11T18:00:00').getTime();
  for (let i = 0; i < 110; i++) {
    const offsetMin = Math.floor(rng() * 30 * 24 * 60); // last 30 days
    const ts = new Date(now - offsetMin * 60000).toISOString();
    const tpl = TEMPLATES[Math.floor(rng() * TEMPLATES.length)];
    const entry = tpl();
    list.push({
      id: 'au-seed-' + i,
      timestamp: ts,
      actorId: entry.actor.id,
      actorName: entry.actor.name,
      actorRole: entry.actor.role,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      entityLabel: entry.entityLabel,
      before: entry.before || null,
      after:  entry.after  || null,
      summary: entry.summary,
    });
  }
  // Sort newest first
  list.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
  return list;
})();

Object.assign(window, {
  STAGE_STATUSES_DEFAULT, LIFECYCLE_STAGES_DEFAULT, CUSTOM_FIELDS_DEFAULT,
  MILESTONE_TEMPLATES_DEFAULT, MILESTONE_ENTRIES_DEFAULT,
  FINANCIAL_ENTRIES_DEFAULT, ESCALATIONS_DEFAULT, AUDIT_LOG_SEED,
});
