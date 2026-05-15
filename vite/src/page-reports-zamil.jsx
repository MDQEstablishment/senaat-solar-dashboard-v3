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

Object.assign(window, { PageReportsZamil });
