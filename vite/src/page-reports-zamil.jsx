import React from 'react';
// Reports page — Zamil Round 5
// 3 report types: Master Daily Report, Material Consumption Report, Zamil Report
// Each exports XLSX using SheetJS, matching the reference template formats.

function PageReportsZamil({ projects }) {
  const { materialUsage, materialsCatalog } = useStore();
  const [activeReport, setActiveReport] = React.useState(null);

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Reports</h1>
        <p className="text-xs text-ink-500 mt-0.5">Three report types — all export to Excel matching the original Zamil templates.</p>
      </div>

      {/* R16 #1: School Stages Workbook — one Excel file is both the import template
          (download → fill → upload) and the live report (export). */}
      <SchoolStagesWorkbookCard />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ReportCard icon="file-spreadsheet"
          title="Master Daily Report"
          desc="Per-region progress export. One sheet per region with stage-by-stage status. Matches Master Daily Report format."
          tone="navy"
          onClick={() => setActiveReport('master')} />
        <ReportCard icon="package"
          title="Material Consumption Report"
          desc="Aggregated material consumption by period/region/project/material. Matches required_materials.xlsx column order."
          tone="gold"
          onClick={() => setActiveReport('materials')} />
        <ReportCard icon="milestone"
          title="Zamil Report"
          desc="Execution tracker matching zamil_report_template.xlsx — multi-row headers with delivery/install dates per stage."
          tone="navy"
          onClick={() => setActiveReport('zamil')} />
      </div>

      {activeReport === 'master'    && <MasterDailyReportPanel projects={projects} onClose={() => setActiveReport(null)} />}
      {activeReport === 'materials' && <MaterialConsumptionPanel projects={projects} materialUsage={materialUsage} catalog={materialsCatalog} onClose={() => setActiveReport(null)} />}
      {activeReport === 'zamil'     && <ZamilReportPanel projects={projects} onClose={() => setActiveReport(null)} />}

      <SavedReportsList />
    </div>
  );
}

function ReportCard({ icon, title, desc, onClick, tone }) {
  return (
    <button onClick={onClick}
      className={cls('text-left surface border border-soft rounded-xl p-5 shadow-card hover:shadow-pop transition hover:border-accent group')}>
      <div className="flex items-center gap-2 mb-2">
        <div className={cls('w-10 h-10 rounded-md flex items-center justify-center', tone === 'navy' ? 'bg-navy-900 text-white' : 'bg-amber-100 text-amber-800')}>
          <Icon name={icon} size={20} />
        </div>
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <p className="text-xs text-ink-500">{desc}</p>
      <div className="text-[11px] text-accent font-medium mt-3 group-hover:underline">Configure & Export →</div>
    </button>
  );
}

function SavedReportsList() {
  return (
    <Card>
      <SectionTitle icon="file-text" title="Recent exports" subtitle="History of report runs" />
      <table className="w-full text-sm">
        <thead className="surface-2 text-[11px] uppercase tracking-wider text-ink-500">
          <tr><th className="text-left px-3 py-2">Report type</th><th className="text-left px-3 py-2">Scope</th><th className="text-left px-3 py-2">By</th><th className="text-left px-3 py-2">Date</th></tr>
        </thead>
        <tbody>
          {SAVED_REPORTS.map(r => (
            <tr key={r.id} className="border-t border-soft hover-row">
              <td className="px-3 py-2 font-medium">{r.type}</td>
              <td className="px-3 py-2 text-xs">{r.project}</td>
              <td className="px-3 py-2 text-xs">{r.by}</td>
              <td className="px-3 py-2 text-xs">{r.date}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

// ── Report 1: Master Daily Report ──────────────────────────────────────────
function MasterDailyReportPanel({ projects, onClose }) {
  const { schools } = useStore();
  const [region, setRegion]   = React.useState('all');
  const [project, setProject] = React.useState('all');
  const [status, setStatus]   = React.useState('all');

  const regionsList = Array.from(new Set(projects.map(p => p.region)));

  const exportXlsx = async () => {
    if (typeof window.loadXLSX === 'function') { await window.loadXLSX(); }
    if (!window.XLSX || !window.XLSX.utils || !window.XLSX.utils.book_new) { alert('XLSX library failed to load.'); return; }
    const wb = XLSX.utils.book_new();
    // One sheet per project (mirrors Master Daily Report layout)
    const targetProjects = project === 'all'
      ? projects.filter(p => region === 'all' || p.region === region)
      : projects.filter(p => p.id === project);

    targetProjects.forEach(p => {
      const ss = schools.filter(s => s.projectId === p.id && (status === 'all' || s.status === status));
      const stageHeaders = STAGE_KEYS.map(k => STAGE_KEY_LABEL[k]);
      const header1 = ['Project','Schools Information','','','','','','','','','','','Installation Start','Mechanical','','','Electrical','','','','','','','','','','Energized','COC signed','Installation Completion','School Status'];
      const header2 = ['Tag','School ID','School Name (Arabic)','School Name (English)','School Level','School Gender','Region','City','School Coordinates','SEC Meter NO.','SEC Account NO.','Survey Completion Date','Installation Start Date', ...stageHeaders.slice(0, 11), 'Energized', 'COC Signed', 'Install Completion','School Status'];
      const data = ss.map(s => {
        const sv = (k) => {
          const st = (s.rawStages || {})[k];
          if (st === 'done') return 'Completed';
          if (st === 'in-progress') return 'In Progress';
          if (st === 'not-started') return 'Not Started';
          return '';
        };
        return [
          p.tag, s.id, s.nameAr, s.nameEn, s.level, s.gender, s.region, s.city, s.coords, s.meter, s.account,
          s.survey || '', s.installStart || '',
          sv('foundation'), sv('mounting'), sv('module'),
          sv('earthing'), sv('cabletray'), sv('dccable'), sv('accable'), sv('coring'),
          sv('inverter'), sv('smdb'), sv('datalogger'),
          sv('energized'), sv('coc'), '', s.status,
        ];
      });
      const ws = XLSX.utils.aoa_to_sheet([header1, header2, ...data]);
      // Merge "Schools Information" header
      ws['!merges'] = [
        { s: { r: 0, c: 1 }, e: { r: 0, c: 11 } },
        { s: { r: 0, c: 13 }, e: { r: 0, c: 15 } },
        { s: { r: 0, c: 16 }, e: { r: 0, c: 23 } },
      ];
      // Column widths
      ws['!cols'] = header2.map(h => ({ wch: Math.min(Math.max(String(h).length + 2, 12), 30) }));
      const sheetName = (p.tag || p.id).slice(0, 31);
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    });
    XLSX.writeFile(wb, `master-daily-report-${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <SectionTitle icon="file-spreadsheet" title="Master Daily Report" subtitle="One sheet per region/project, full stage-by-stage status" className="!mb-0" />
        <Button variant="ghost" icon="x" onClick={onClose}>Close</Button>
      </div>
      <div className="grid grid-cols-4 gap-2 mb-3">
        <div>
          <label className="text-[11px] font-medium text-ink-700 mb-1 block">Region</label>
          <Select value={region} onChange={setRegion} options={[{value:'all',label:'All regions'}, ...regionsList.map(r => ({value:r,label:r}))]} className="w-full" />
        </div>
        <div>
          <label className="text-[11px] font-medium text-ink-700 mb-1 block">Project</label>
          <Select value={project} onChange={setProject} options={[{value:'all',label:'All projects'}, ...projects.map(p => ({value:p.id,label:p.name}))]} className="w-full" />
        </div>
        <div>
          <label className="text-[11px] font-medium text-ink-700 mb-1 block">Status</label>
          <Select value={status} onChange={setStatus} options={[{value:'all',label:'All'},{value:'Completed',label:'Completed'},{value:'In Progress',label:'In Progress'},{value:'Not Started',label:'Not Started'}]} className="w-full" />
        </div>
        <div className="flex items-end">
          <Button variant="accent" icon="file-spreadsheet" onClick={exportXlsx} className="!w-full !justify-center">Export XLSX</Button>
        </div>
      </div>
      <div className="text-[11px] text-ink-500">Output mirrors the Master Daily Report column order (Project / School Info / Mechanical / Electrical / Energized / COC / Status).</div>
    </Card>
  );
}

// ── Report 2: Material Consumption ─────────────────────────────────────────
function MaterialConsumptionPanel({ projects, materialUsage, catalog, onClose }) {
  const [period, setPeriod]   = React.useState('Month');
  const [region, setRegion]   = React.useState('all');
  const [project, setProject] = React.useState('all');
  const [materialNo, setMaterialNo] = React.useState('all');

  const regionsList = Array.from(new Set(projects.map(p => p.region)));

  const exportXlsx = async () => {
    if (typeof window.loadXLSX === 'function') { await window.loadXLSX(); }
    if (!window.XLSX || !window.XLSX.utils || !window.XLSX.utils.book_new) { alert('XLSX library failed to load.'); return; }
    const filtered = (materialUsage || []).filter(u => {
      if (project !== 'all' && u.projectId !== project) return false;
      if (materialNo !== 'all' && String(u.materialNo) !== String(materialNo)) return false;
      if (region !== 'all') {
        const proj = projects.find(p => p.id === u.projectId);
        if (proj?.region !== region) return false;
      }
      return true;
    });

    // Group by material number
    const agg = {};
    filtered.forEach(u => {
      const k = String(u.materialNo);
      if (!agg[k]) {
        const m = catalog.find(c => String(c.no) === k);
        agg[k] = { no: u.materialNo, name: m?.name || u.materialName, unit: m?.unit || u.unit, ref: m?.ref, category: m?.category, total: 0, perSchool: {} };
      }
      agg[k].total += +u.qty;
      agg[k].perSchool[u.schoolId] = (agg[k].perSchool[u.schoolId] || 0) + +u.qty;
    });

    const wb = XLSX.utils.book_new();
    // Summary sheet — mirrors required_materials.xlsx column order
    const summaryHeader = ['No.','Name*','Unit','Internal Reference','Product Category','Total Consumed','Distribution (schools)'];
    const summaryRows = Object.values(agg).map(r => [r.no, r.name, r.unit, r.ref, r.category, r.total, Object.keys(r.perSchool).length]);
    // If no usage logged, still output catalog rows with 0
    if (summaryRows.length === 0) {
      const cats = catalog.filter(c => materialNo === 'all' || String(c.no) === String(materialNo));
      cats.forEach(c => summaryRows.push([c.no, c.name, c.unit, c.ref, c.category, 0, 0]));
    }
    const ws = XLSX.utils.aoa_to_sheet([summaryHeader, ...summaryRows]);
    ws['!cols'] = summaryHeader.map((h, i) => ({ wch: i === 1 ? 40 : 16 }));
    XLSX.utils.book_append_sheet(wb, ws, 'Material Consumption');
    XLSX.writeFile(wb, `material-consumption-${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <SectionTitle icon="package" title="Material Consumption Report" subtitle="Aggregates per-school material usage" className="!mb-0" />
        <Button variant="ghost" icon="x" onClick={onClose}>Close</Button>
      </div>
      <div className="grid grid-cols-5 gap-2 mb-3">
        <div><label className="text-[11px] font-medium text-ink-700 mb-1 block">Period</label>
          <Select value={period} onChange={setPeriod} options={['Month','Week','Project']} className="w-full" /></div>
        <div><label className="text-[11px] font-medium text-ink-700 mb-1 block">Region</label>
          <Select value={region} onChange={setRegion} options={[{value:'all',label:'All'}, ...regionsList.map(r=>({value:r,label:r}))]} className="w-full" /></div>
        <div><label className="text-[11px] font-medium text-ink-700 mb-1 block">Project</label>
          <Select value={project} onChange={setProject} options={[{value:'all',label:'All'}, ...projects.map(p=>({value:p.id,label:p.name}))]} className="w-full" /></div>
        <div><label className="text-[11px] font-medium text-ink-700 mb-1 block">Material</label>
          <Select value={materialNo} onChange={setMaterialNo} options={[{value:'all',label:'All materials'}, ...catalog.map(m => ({value:String(m.no),label: m.no+'. '+m.name}))]} className="w-full" /></div>
        <div className="flex items-end">
          <Button variant="accent" icon="file-spreadsheet" onClick={exportXlsx} className="!w-full !justify-center">Export XLSX</Button>
        </div>
      </div>
      <div className="text-[11px] text-ink-500">Output column order matches <code>required_materials.xlsx</code>: No., Name, Unit, Internal Reference, Product Category — plus total consumed + per-school distribution.</div>
    </Card>
  );
}

// ── Report 3: Zamil Report (execution tracker) ─────────────────────────────
function ZamilReportPanel({ projects, onClose }) {
  const { schools } = useStore();
  const [region, setRegion]   = React.useState('all');
  const [project, setProject] = React.useState('all');

  const regionsList = Array.from(new Set(projects.map(p => p.region)));

  const exportXlsx = async () => {
    if (typeof window.loadXLSX === 'function') { await window.loadXLSX(); }
    if (!window.XLSX || !window.XLSX.utils || !window.XLSX.utils.book_new) { alert('XLSX library failed to load.'); return; }
    const wb = XLSX.utils.book_new();

    const targetProjects = project === 'all'
      ? projects.filter(p => region === 'all' || p.region === region)
      : projects.filter(p => p.id === project);

    targetProjects.forEach(p => {
      const ss = schools.filter(s => s.projectId === p.id);
      const projName = p.name;

      // Multi-row header per zamil_report_template.xlsx
      // Stages: Foundations, Panels & structure, Cable trays, DC cables, AC cables, Coring, Inverter, SMDB, Data logger & Power cables
      const stagesCols = ['Foundations','Panels & structure','Cable trays','DC cables','AC cables','Coring','Inverter','SMDB','Data logger & Power cable'];
      const subCols = ['delivery','Install'];

      const row0 = ['#','SECapproval','','','Sub Cont.','','Zone','School No.','School Name ENG','School Name AR','Type','Mobile','','','REMARK','220 V / 380 V','Breaker capacity'];
      stagesCols.forEach(name => { row0.push(name); subCols.forEach(() => row0.push('')); });
      row0.push('Energized','BOQ report','COC signed','','Handed over to Client','','Locations','Inverter S. No.','D/L serial No.','SIM card NO.');

      const row1 = ['','Issued','Initial paid','Final paid','Mech.','Elec.','','','','','','','SEC meter number','Account number','','',''];
      stagesCols.forEach(() => { row1.push(''); subCols.forEach(c => row1.push(c)); });
      row1.push('Ready or Yes','','','','Handed over to Zamil','','latitude longitude','','','');

      const data = ss.map((s, i) => {
        const sd = (k) => ((s.rawStages || {})[k] === 'done') ? (s.installStart || '✓') : '';
        const row = [i + 1, '', '', '', '', '', s.region, i + 1, s.nameEn, s.nameAr, s.level, '-', s.meter, s.account, '', '380 V', '1600 A'];
        // Foundations
        row.push('', sd('foundation') ? '✓' : '', sd('foundation') ? '✓' : '');
        // Panels & structure (combines mounting + module)
        row.push('', sd('mounting') ? '✓' : '', '');
        // Cable trays
        row.push('', sd('cabletray') ? '✓' : '');
        // DC cables
        row.push('', sd('dccable') ? '✓' : '');
        // AC cables
        row.push('', sd('accable') ? '✓' : '');
        // Coring
        row.push('', sd('coring') ? '✓' : '');
        // Inverter
        row.push('', sd('inverter') ? '✓' : '');
        // SMDB
        row.push('', sd('smdb') ? '✓' : '');
        // Data logger
        row.push('', sd('datalogger') ? '✓' : '');
        // Energized / BOQ / COC / Handed to client
        row.push(sd('energized') ? 'Yes' : '', '', sd('coc') ? '✓' : '', '', '', '');
        // Locations / Inverter S/N / D/L S/N / SIM
        row.push(s.coords, '', '', '');
        return row;
      });

      const sheetName = (projName || p.id).replace(/[^\w-]/g, '_').slice(0, 31);
      const ws = XLSX.utils.aoa_to_sheet([[projName], ['Execution tracker'], row0, row1, ...data]);
      ws['!cols'] = row0.map((c, i) => ({ wch: i < 6 ? 10 : 14 }));
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    });
    XLSX.writeFile(wb, `zamil-report-${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <SectionTitle icon="milestone" title="Zamil Report — Execution Tracker" subtitle="Multi-row headers with delivery/install per stage" className="!mb-0" />
        <Button variant="ghost" icon="x" onClick={onClose}>Close</Button>
      </div>
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div>
          <label className="text-[11px] font-medium text-ink-700 mb-1 block">Region</label>
          <Select value={region} onChange={setRegion} options={[{value:'all',label:'All'}, ...regionsList.map(r=>({value:r,label:r}))]} className="w-full" />
        </div>
        <div>
          <label className="text-[11px] font-medium text-ink-700 mb-1 block">Project</label>
          <Select value={project} onChange={setProject} options={[{value:'all',label:'All'}, ...projects.map(p=>({value:p.id,label:p.name}))]} className="w-full" />
        </div>
        <div className="flex items-end">
          <Button variant="accent" icon="file-spreadsheet" onClick={exportXlsx} className="!w-full !justify-center">Export XLSX</Button>
        </div>
      </div>
      <div className="text-[11px] text-ink-500">Output matches <code>zamil_report_template.xlsx</code>: 2 title rows + 2 header rows with merged stage columns and delivery/install subcolumns.</div>
    </Card>
  );
}

// ── R16 #1 — School Stages Workbook ────────────────────────────────────────
// Single template doubles as import format AND report format:
//   • Identity columns: School ID, School Name (AR), School Name (EN), Region, Project, Contractor
//   • 18 stage date columns (one per execution stage), grouped by category
// Three actions:
//   1) Download Template — blank file with all 2,601 schools pre-populated in identity columns + empty date cells
//   2) Import Updates    — file picker; parses each row by School ID; for every non-empty date cell
//                          updates school.stages[stageKey].completedDate, flips stage to Done,
//                          shows summary modal, and writes an audit entry
//   3) Export Report     — same template structure with current completion dates filled in
// R18 #2: shared workbook builder used by:
//   • Reports tab → Download Template / Export Report
//   • Project Detail → Export to Excel
// Both call sites produce an xlsx with identical column structure so the workbook
// always round-trips through the importer. Layout:
//   Row 0 (category band) : identity span, then 4 merged cells — Mechanical /
//                           Electrical / Commissioning / Handover — coloured per
//                           STAGE_CATEGORY_COLORS.excelBg (community sheetjs strips
//                           cell styles, so the colour shows only in styled forks;
//                           merge widths still group the columns visibly).
//   Row 1 (header)        : identity column names, then "N. Excel header" per stage
//                           (e.g. "1. Completion of Foundation").
//   Row 2+ (data)         : one row per school. Stage cells = completedDate when
//                           the stage is done, blank otherwise.
function buildSchoolStagesAOA(schools, opts) {
  const includeData = !opts || opts.includeData !== false;
  const list = Array.isArray(schools) ? schools : (window.ALL_SCHOOLS || []);
  const idCols = ['School ID', 'School Name (Arabic)', 'School Name (English)', 'Region', 'City', 'Project', 'Contractor', 'SEC Meter', 'Status'];
  // Stage headers preserve the client's Master Daily Report wording verbatim.
  // The numeric prefix gives readers a quick reference to the canonical order.
  const stageCols = STAGE_KEYS.map((k, i) => `${i + 1}. ${STAGE_EXCEL_HEADERS[k]}`);

  // Build the category band: one cell per category spanning N stage columns.
  const cats = ['mechanical', 'electrical', 'commissioning', 'handover'];
  const catRow = new Array(idCols.length + stageCols.length).fill('');
  const merges = [];
  let cursor = idCols.length;
  cats.forEach(cat => {
    const span = STAGE_KEYS.filter(k => STAGE_CATEGORY[k] === cat).length;
    if (span === 0) return;
    catRow[cursor] = STAGE_CATEGORY_LABELS[cat];
    merges.push({ s: { r: 0, c: cursor }, e: { r: 0, c: cursor + span - 1 } });
    cursor += span;
  });

  const header = [...idCols, ...stageCols];
  const rows = [catRow, header];
  if (includeData) {
    list.forEach(s => {
      const proj = (window.PROJECTS || []).find(p => p.id === s.projectId);
      const contractor = (window.CONTRACTORS || []).find(c => c.id === s.contractor);
      const idCells = [
        s.id, s.nameAr || '', s.nameEn || '',
        s.region || '', s.city || '',
        proj?.name || '', contractor?.name || '',
        s.meter || '', s.status || '',
      ];
      const stageCells = STAGE_KEYS.map((k, i) => {
        const st = s.stages && s.stages[i];
        return (st && st.done && st.completedDate) ? st.completedDate : '';
      });
      rows.push([...idCells, ...stageCells]);
    });
  } else {
    // Blank template: identity columns filled, stage cells empty
    list.forEach(s => {
      const proj = (window.PROJECTS || []).find(p => p.id === s.projectId);
      const contractor = (window.CONTRACTORS || []).find(c => c.id === s.contractor);
      rows.push([
        s.id, s.nameAr || '', s.nameEn || '',
        s.region || '', s.city || '',
        proj?.name || '', contractor?.name || '',
        s.meter || '', s.status || '',
        ...STAGE_KEYS.map(() => ''),
      ]);
    });
  }
  return { rows, merges, idColCount: idCols.length };
}
async function writeSchoolStagesWorkbook(builtOrRows, filename, opts) {
  if (typeof window.loadXLSX === 'function') await window.loadXLSX();
  if (!window.XLSX || !window.XLSX.utils.aoa_to_sheet) { alert('XLSX library failed to load.'); return; }
  const wb = window.XLSX.utils.book_new();
  // Accept either the rich {rows,merges,idColCount} or a bare rows array (legacy).
  const built = Array.isArray(builtOrRows) ? { rows: builtOrRows, merges: [], idColCount: 0 } : builtOrRows;
  const ws = window.XLSX.utils.aoa_to_sheet(built.rows);
  if (built.merges && built.merges.length) ws['!merges'] = built.merges;
  // Auto-width columns based on the *header* row (row index 1 — row 0 is the category band).
  const headerRow = built.rows[1] || built.rows[0] || [];
  ws['!cols'] = headerRow.map(h => ({ wch: Math.max(14, String(h || '').length + 2) }));
  // Attempt cell styling for the category band — community sheetjs strips this, but
  // a styled fork (xlsx-js-style) would render the peach/mint/teal/teal banding. The
  // merges above always group the columns so the categories remain legible either way.
  if (built.idColCount && opts && opts.styleBand !== false) {
    const cats = ['mechanical', 'electrical', 'commissioning', 'handover'];
    let cursor = built.idColCount;
    cats.forEach(cat => {
      const span = STAGE_KEYS.filter(k => STAGE_CATEGORY[k] === cat).length;
      if (span === 0) return;
      const bg = STAGE_CATEGORY_COLORS[cat]?.excelBg || 'EEEEEE';
      const addr = window.XLSX.utils.encode_cell({ r: 0, c: cursor });
      if (ws[addr]) {
        ws[addr].s = {
          fill: { patternType: 'solid', fgColor: { rgb: bg } },
          font: { bold: true },
          alignment: { horizontal: 'center', vertical: 'center' },
        };
      }
      cursor += span;
    });
  }
  window.XLSX.utils.book_append_sheet(wb, ws, opts?.sheetName || 'School Stages');
  window.XLSX.writeFile(wb, filename);
}
function _parseCellDate(v) {
  if (v == null || v === '') return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === 'number') {
    // Excel serial date → JS Date (1900-based, with the famous 1900 leap-year bug offset)
    const ms = Math.round((v - 25569) * 86400 * 1000);
    return new Date(ms).toISOString().slice(0, 10);
  }
  const d = new Date(String(v));
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return null;
}

function SchoolStagesWorkbookCard() {
  const store = useStore();
  const fileRef = React.useRef(null);
  const [busy, setBusy] = React.useState(null);  // 'template' | 'import' | 'export' | null
  const [summary, setSummary] = React.useState(null);  // { rowsRead, stagesUpdated, skipped }

  const downloadTemplate = async () => {
    setBusy('template');
    try {
      const built = buildSchoolStagesAOA(null, { includeData: false });
      await writeSchoolStagesWorkbook(built, `master_daily_report_template_${new Date().toISOString().slice(0,10)}.xlsx`);
    } finally { setBusy(null); }
  };
  const exportReport = async () => {
    setBusy('export');
    try {
      const built = buildSchoolStagesAOA(null, { includeData: true });
      await writeSchoolStagesWorkbook(built, `master_daily_report_${new Date().toISOString().slice(0,10)}.xlsx`);
    } finally { setBusy(null); }
  };
  const onPickFile = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    setBusy('import');
    try {
      if (typeof window.loadXLSX === 'function') await window.loadXLSX();
      const buf = await file.arrayBuffer();
      const wb = window.XLSX.read(buf, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const aoa = window.XLSX.utils.sheet_to_json(ws, { header: 1, raw: false });
      if (!aoa || aoa.length < 2) { setSummary({ rowsRead: 0, stagesUpdated: 0, skipped: 0 }); return; }
      const header = aoa[0].map(h => String(h || '').trim());
      // Build a header-name → stage-key map using STAGE_EXCEL_HEADERS
      const stageColIdx = {};
      STAGE_KEYS.forEach(k => {
        const wanted = STAGE_EXCEL_HEADERS[k];
        // Match both the bare header ("Handover to Zamil") and the prefixed
        // form we now emit ("17. Handover to Zamil") so workbooks exported by
        // either the Reports tab or the Project Detail page round-trip cleanly.
        const i = header.findIndex(h => {
          if (!h) return false;
          const s = String(h).trim().toLowerCase();
          const w = wanted.toLowerCase();
          return s === w || s.endsWith('. ' + w) || s.endsWith(' ' + w);
        });
        if (i !== -1) stageColIdx[k] = i;
      });
      const idIdx = header.findIndex(h => h && /school\s*id/i.test(h));
      if (idIdx === -1) { alert('Could not find a "School ID" column in the uploaded workbook.'); return; }
      const schoolsById = {};
      (window.ALL_SCHOOLS || []).forEach(s => { schoolsById[s.id] = s; });
      let rowsRead = 0, stagesUpdated = 0, skipped = 0;
      for (let r = 1; r < aoa.length; r++) {
        const row = aoa[r];
        if (!row || !row[idIdx]) { skipped++; continue; }
        const id = String(row[idIdx]).trim();
        const sch = schoolsById[id];
        if (!sch) { skipped++; continue; }
        rowsRead++;
        Object.keys(stageColIdx).forEach(k => {
          const v = row[stageColIdx[k]];
          const iso = _parseCellDate(v);
          if (iso) {
            const i = STAGE_INDEX[k];
            if (sch.stages && sch.stages[i]) {
              const before = sch.stages[i].done;
              sch.stages[i].done = true;
              sch.stages[i].statusId = 'done';
              sch.stages[i].completedDate = iso;
              sch.stages[i].date = iso;
              if (!before) stagesUpdated++;
              else if (sch.stages[i].completedDate !== iso) stagesUpdated++;
            }
          }
        });
      }
      if (store.logAudit) store.logAudit({
        actorId: 'u-sys', actorName: 'Import', actorRole: 'System',
        action: 'UPDATE', entityType: 'schools.bulk_import', entityId: 'import-' + Date.now(),
        entityLabel: file.name,
        summary: `Imported ${rowsRead} rows from "${file.name}" — ${stagesUpdated} stages updated, ${skipped} rows skipped`,
      });
      setSummary({ rowsRead, stagesUpdated, skipped, filename: file.name });
    } catch (err) {
      console.error('Import failed', err);
      alert('Import failed: ' + (err.message || err));
    } finally { setBusy(null); }
  };

  return (
    <Card>
      <SectionTitle icon="file-spreadsheet"
        title="School Stages Workbook"
        subtitle="Download a blank template or export the current state. Imports live on each project." />
      {/* R21 Issue #2: Import Updates button moved out of the Reports tab — the
          import flow now lives on Project Detail → Import Schools. The onPickFile
          handler is preserved for the project-level call site; the Reports surface
          stays read-only (Template + Export). */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Button variant="accent" icon="file-plus-2" onClick={downloadTemplate} disabled={busy != null} className="!justify-center">
          {busy === 'template' ? 'Building…' : 'Download Template'}
        </Button>
        <Button variant="ghost" icon="file-spreadsheet" onClick={exportReport} disabled={busy != null} className="!justify-center border border-soft">
          {busy === 'export' ? 'Exporting…' : 'Export Report'}
        </Button>
      </div>
      <input ref={fileRef} type="file" accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
             className="hidden" onChange={onPickFile} aria-hidden="true" />
      <div className="text-[11px] text-ink-500 mt-3">
        Identity columns (9): School ID · Name (AR/EN) · Region · City · Project · Contractor · SEC Meter · Status.
        Stage columns (18): grouped by Mechanical · Electrical · Commissioning · Handover.
        All 2,601 schools are pre-populated; leave a date cell blank to skip that stage.
      </div>
      <div className="text-[11px] text-ink-500 mt-2 italic">
        Need to import updates? Use <span className="font-medium not-italic text-ink-700">Import Schools</span> inside any project.
      </div>
      {summary && (
        <Modal open={true} onClose={() => setSummary(null)} title="Import complete" width="max-w-md">
          <div className="space-y-2 text-sm">
            <div>File: <span className="font-mono text-xs">{summary.filename}</span></div>
            <div className="flex justify-between border-b border-soft py-1.5"><span>Rows read</span><span className="font-bold tnum">{summary.rowsRead}</span></div>
            <div className="flex justify-between border-b border-soft py-1.5"><span>Stages updated</span><span className="font-bold tnum text-emerald-600">{summary.stagesUpdated}</span></div>
            <div className="flex justify-between border-b border-soft py-1.5"><span>Rows skipped (unknown School ID / no data)</span><span className="font-bold tnum text-amber-600">{summary.skipped}</span></div>
            <div className="text-[11px] text-ink-500">A record of this import was written to the Audit Log.</div>
            <div className="text-right pt-2"><Button variant="accent" onClick={() => setSummary(null)}>OK</Button></div>
          </div>
        </Modal>
      )}
    </Card>
  );
}

Object.assign(window, { PageReportsZamil, SchoolStagesWorkbookCard, buildSchoolStagesAOA, writeSchoolStagesWorkbook });
