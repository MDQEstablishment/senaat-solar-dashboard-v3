import React from 'react';
// R28 — Map preview slot that always renders.
//
// Exports (via window):
//   • parseCoords(str)            → { lat, lng } | null. Strict pattern: two decimals
//     separated by comma or whitespace. Single-number coords return null.
//   • SchoolMapPreview            single-school card. Falls back to region centroid when
//     coords don't parse, with an italic "Approximate" caption.
//   • ProjectMapPreview           project-level card showing all schools in the project
//     as an OSM bbox; if zero schools have valid coords, falls back to the project's
//     region centroid; if neither, shows the empty-state placeholder card.
//   • EditCoordsModal             two-input modal + "Paste from Google Maps" helper.
//     onSave receives `{ lat, lng }`; the caller updates the school's coords string.
//
// All three components ALWAYS render their card shell — the empty state IS one of the
// rendered branches. The client's brief: "Map widget always renders, even if no coords."
function parseCoords(str) {
  if (!str) return null;
  const m = String(str).match(/(-?\d+(?:\.\d+)?)\s*[,\s]\s*(-?\d+(?:\.\d+)?)/);
  if (!m) return null;
  const lat = parseFloat(m[1]);
  const lng = parseFloat(m[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

function _osmEmbedUrl({ lat, lng, span = 0.01 }) {
  const half = span / 2;
  return `https://www.openstreetmap.org/export/embed.html`
    + `?bbox=${lng - half},${lat - half},${lng + half},${lat + half}`
    + `&layer=mapnik&marker=${lat},${lng}`;
}
function _osmBboxEmbedUrl({ minLat, maxLat, minLng, maxLng, centerLat, centerLng }) {
  // Pad bbox by ~10% so pins aren't at the edge.
  const padLat = Math.max(0.005, (maxLat - minLat) * 0.1);
  const padLng = Math.max(0.005, (maxLng - minLng) * 0.1);
  return `https://www.openstreetmap.org/export/embed.html`
    + `?bbox=${minLng - padLng},${minLat - padLat},${maxLng + padLng},${maxLat + padLat}`
    + `&layer=mapnik&marker=${centerLat},${centerLng}`;
}
function _osmOpenInLink({ lat, lng, zoom = 14 }) {
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=${zoom}/${lat}/${lng}`;
}

// ── Single-school map ───────────────────────────────────────────────────────
function SchoolMapPreview({ school, onEdit, height = 220 }) {
  const REGION_CENTROIDS_ = window.REGION_CENTROIDS || {};
  const precise = school ? parseCoords(school.coords) : null;
  const regionCentroid = school && school.region ? REGION_CENTROIDS_[school.region] : null;
  return (
    <div data-testid="school-map-preview" className="mt-2">
      <div className="flex items-baseline justify-between">
        <div className="text-[10px] uppercase tracking-wider text-ink-500">Map preview</div>
        {!precise && onEdit && (
          <button type="button" onClick={onEdit}
            className="text-[11px] text-info underline hover:no-underline">
            {regionCentroid ? 'Add precise coordinates' : 'Add coordinates'}
          </button>
        )}
      </div>
      {precise ? (
        <>
          <iframe
            title="map"
            data-testid="school-map-iframe-precise"
            width="100%" height={height} frameBorder="0" scrolling="no"
            src={_osmEmbedUrl({ lat: precise.lat, lng: precise.lng })}
            className="rounded-md border border-soft" />
          <a className="text-[11px] text-info underline" target="_blank" rel="noopener noreferrer"
             href={_osmOpenInLink({ lat: precise.lat, lng: precise.lng, zoom: 17 })}>
            Open in OpenStreetMap →
          </a>
        </>
      ) : regionCentroid ? (
        <>
          <iframe
            title="map"
            data-testid="school-map-iframe-region"
            width="100%" height={height} frameBorder="0" scrolling="no"
            src={_osmEmbedUrl({ lat: regionCentroid.lat, lng: regionCentroid.lng, span: 0.5 })}
            className="rounded-md border border-soft" />
          <div className="text-[11px] text-ink-500 italic mt-1">
            Approximate — centred on {school?.region || 'region'}
          </div>
        </>
      ) : (
        <div data-testid="school-map-empty"
          className="rounded-md border border-dashed border-soft surface-2 flex flex-col items-center justify-center gap-2"
          style={{ height }}>
          <Icon name="map-pin" size={22} className="text-ink-300" />
          <div className="text-[11px] text-ink-500 italic">No coordinates yet for this school.</div>
          {onEdit && (
            <button type="button" onClick={onEdit}
              className="text-[11px] font-medium text-info underline hover:no-underline">
              Add coordinates
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Project-level map ───────────────────────────────────────────────────────
function ProjectMapPreview({ project, schools, onEditExample, height = 240 }) {
  const REGION_CENTROIDS_ = window.REGION_CENTROIDS || {};
  const pts = [];
  let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
  (schools || []).forEach(s => {
    const c = parseCoords(s.coords);
    if (!c) return;
    pts.push(c);
    if (c.lat < minLat) minLat = c.lat;
    if (c.lat > maxLat) maxLat = c.lat;
    if (c.lng < minLng) minLng = c.lng;
    if (c.lng > maxLng) maxLng = c.lng;
  });
  const totalSchools = (schools || []).length;
  const withCoords = pts.length;
  const regionCentroid = project && project.region ? REGION_CENTROIDS_[project.region] : null;
  const subtitle = `${withCoords.toLocaleString()} of ${totalSchools.toLocaleString()} schools have coordinates`;

  let body;
  if (pts.length === 0) {
    if (regionCentroid) {
      body = (
        <>
          <iframe
            title="project-region-map"
            data-testid="project-map-iframe-region"
            width="100%" height={height} frameBorder="0" scrolling="no"
            src={_osmEmbedUrl({ lat: regionCentroid.lat, lng: regionCentroid.lng, span: 0.5 })}
            className="rounded-md border border-soft" />
          <div className="text-[11px] text-ink-500 italic mt-1">
            Approximate — centred on {project.region} region. School pins will appear once any school has lat,lng coordinates.
          </div>
        </>
      );
    } else {
      body = (
        <div data-testid="project-map-empty"
          className="rounded-md border border-dashed border-soft surface-2 flex flex-col items-center justify-center gap-2"
          style={{ height }}>
          <Icon name="map-pin" size={28} className="text-ink-300" />
          <div className="text-xs text-ink-500 italic">No coordinates added yet for this project.</div>
          {onEditExample && (
            <button type="button" onClick={onEditExample}
              className="text-[11px] font-medium text-info underline hover:no-underline">
              Add coordinates
            </button>
          )}
        </div>
      );
    }
  } else if (pts.length === 1) {
    body = (
      <>
        <iframe
          title="project-single-map"
          data-testid="project-map-iframe-single"
          width="100%" height={height} frameBorder="0" scrolling="no"
          src={_osmEmbedUrl({ lat: pts[0].lat, lng: pts[0].lng })}
          className="rounded-md border border-soft" />
        <a className="text-[11px] text-info underline" target="_blank" rel="noopener noreferrer"
           href={_osmOpenInLink({ lat: pts[0].lat, lng: pts[0].lng, zoom: 16 })}>
          Open in OpenStreetMap →
        </a>
      </>
    );
  } else {
    const centerLat = (minLat + maxLat) / 2;
    const centerLng = (minLng + maxLng) / 2;
    body = (
      <>
        <iframe
          title="project-bbox-map"
          data-testid="project-map-iframe-bbox"
          width="100%" height={height} frameBorder="0" scrolling="no"
          src={_osmBboxEmbedUrl({ minLat, maxLat, minLng, maxLng, centerLat, centerLng })}
          className="rounded-md border border-soft" />
        <a className="text-[11px] text-info underline" target="_blank" rel="noopener noreferrer"
           href={_osmOpenInLink({ lat: centerLat, lng: centerLng, zoom: 11 })}>
          Open in OpenStreetMap →
        </a>
      </>
    );
  }

  return (
    <Card>
      <SectionTitle icon="map-pin" title="Project Locations" subtitle={subtitle} />
      <div data-testid="project-map-preview">{body}</div>
    </Card>
  );
}

// ── Edit-coords modal ────────────────────────────────────────────────────────
function EditCoordsModal({ open, school, onClose, onSave }) {
  const initial = school ? parseCoords(school.coords) : null;
  const [lat, setLat] = React.useState(initial ? String(initial.lat) : '');
  const [lng, setLng] = React.useState(initial ? String(initial.lng) : '');
  const [pasted, setPasted] = React.useState('');
  const [error, setError] = React.useState('');
  // Reset when modal re-opens for a different school
  React.useEffect(() => {
    if (!open) return;
    const next = school ? parseCoords(school.coords) : null;
    setLat(next ? String(next.lat) : '');
    setLng(next ? String(next.lng) : '');
    setPasted('');
    setError('');
  }, [open, school?.id]);

  const applyPasted = (str) => {
    setPasted(str);
    const parsed = parseCoords(str);
    if (parsed) {
      setLat(String(parsed.lat));
      setLng(String(parsed.lng));
      setError('');
    } else if (str.trim()) {
      setError('Could not read those coordinates. Expected "lat, lng" — for example 21.4225, 39.8262.');
    } else {
      setError('');
    }
  };

  const onSubmit = (e) => {
    e && e.preventDefault && e.preventDefault();
    const fLat = parseFloat(lat);
    const fLng = parseFloat(lng);
    if (!Number.isFinite(fLat) || !Number.isFinite(fLng)) {
      setError('Latitude and longitude must be numbers.');
      return;
    }
    if (fLat < -90 || fLat > 90)   { setError('Latitude must be between −90 and 90.'); return; }
    if (fLng < -180 || fLng > 180) { setError('Longitude must be between −180 and 180.'); return; }
    onSave && onSave({ lat: fLat, lng: fLng });
    onClose && onClose();
  };

  if (!open) return null;
  return (
    <Modal open={open} onClose={onClose} title={`Edit coordinates · ${school?.code || school?.id || ''}`} width="max-w-md">
      <form onSubmit={onSubmit} className="space-y-3">
        <div className="text-[11px] text-ink-500 bg-amber-50 border border-amber-200 rounded-md p-2.5">
          Saved locally for this session. Will sync to database after backend wiring.
        </div>
        <div>
          <label className="text-[11px] font-medium text-ink-700 mb-1 block">Paste from Google Maps</label>
          <input value={pasted} onChange={e => applyPasted(e.target.value)} type="text"
            placeholder="21.4225, 39.8262"
            data-testid="edit-coords-paste"
            className="w-full px-3 py-1.5 text-sm border border-ink-200 rounded-md focus:outline-none focus:ring-2 ring-accent" />
          <div className="text-[10px] text-ink-500 mt-1">Tip: right-click any spot in Google Maps → click the coordinates → it copies as "lat, lng".</div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-medium text-ink-700 mb-1 block">Latitude</label>
            <input value={lat} onChange={e => setLat(e.target.value)} type="number" step="0.000001"
              data-testid="edit-coords-lat"
              className="w-full px-3 py-1.5 text-sm border border-ink-200 rounded-md focus:outline-none focus:ring-2 ring-accent" />
          </div>
          <div>
            <label className="text-[11px] font-medium text-ink-700 mb-1 block">Longitude</label>
            <input value={lng} onChange={e => setLng(e.target.value)} type="number" step="0.000001"
              data-testid="edit-coords-lng"
              className="w-full px-3 py-1.5 text-sm border border-ink-200 rounded-md focus:outline-none focus:ring-2 ring-accent" />
          </div>
        </div>
        {error && <div className="text-[11px] text-red-700 bg-red-50 border border-red-200 rounded-md p-2">{error}</div>}
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" type="button" onClick={onClose}>Cancel</Button>
          <Button variant="accent" type="submit" icon="check">Save coordinates</Button>
        </div>
      </form>
    </Modal>
  );
}

Object.assign(window, {
  parseCoords,
  SchoolMapPreview, ProjectMapPreview, EditCoordsModal,
});
