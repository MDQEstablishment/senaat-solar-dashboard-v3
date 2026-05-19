import React from 'react';
// R29 — Reusable ImageUploader.
//
// Props:
//   path        path prefix for uploads, e.g. "projects/p-mad/gallery". Each
//               photo is written as `${path}/${photoId}.jpg`.
//   maxCount    maximum stored images (1 for cover, N for gallery/stage).
//   value       array of { path, url, uploadedAt, bytes } already uploaded.
//   onChange    (updatedArray) → void. Caller persists to store.
//   coverMode   true → square 16:9 banner preview; false → grid of thumbnails.
//   compact     true → smaller dropzone (for tight per-stage rows).
//   onError     optional (msg) → void. If absent we fall back to alert().
//
// Behavior:
//   1. File picker (single or multi) → for each file:
//      • Reject non-image MIME → onError
//      • Reject > IMAGE_LIMITS.maxInputBytes → onError
//      • compressImage(file) → preview card with original vs compressed badge
//      • User clicks Upload → imageStorage.upload(path/photoId, blob, dataUrl)
//      • Append to value, call onChange
//      • Enforce maxCount: hide Choose-file button when full
//   2. Each thumbnail has hover Delete button.
function ImageUploader({ path, maxCount = 5, value = [], onChange, coverMode = false, compact = false, onError }) {
  const fileRef = React.useRef(null);
  const [pending, setPending] = React.useState([]);   // [{ id, file, compressing, compressed, error }]
  const [uploading, setUploading] = React.useState(false);
  const [lightbox, setLightbox] = React.useState(null);

  const reportError = (msg) => {
    if (onError) onError(msg);
    else if (typeof alert === 'function') alert(msg);
    else console.error(msg);
  };

  const remaining = Math.max(0, maxCount - value.length);
  const canAddMore = remaining > 0;
  const nfmt = formatBytes; // window-global

  const onPick = (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;
    const slots = Math.max(0, maxCount - value.length - pending.length);
    if (slots === 0) { reportError(`Max ${maxCount} image${maxCount === 1 ? '' : 's'} reached.`); return; }
    const toProcess = files.slice(0, slots);
    if (files.length > slots) reportError(`Only ${slots} more allowed; ignored ${files.length - slots} file(s).`);
    const initial = toProcess.map((file, i) => ({
      id: `p-${Date.now()}-${i}`, file, compressing: true, compressed: null, error: null,
    }));
    setPending(prev => [...prev, ...initial]);

    initial.forEach(async (entry) => {
      try {
        const result = await compressImage(entry.file);
        setPending(prev => prev.map(p => p.id === entry.id
          ? { ...p, compressing: false, compressed: result }
          : p));
      } catch (err) {
        setPending(prev => prev.map(p => p.id === entry.id
          ? { ...p, compressing: false, error: err.message || String(err) }
          : p));
        reportError(err.message || String(err));
      }
    });
  };

  const cancelPending = (id) => {
    setPending(prev => prev.filter(p => p.id !== id));
  };

  const uploadOne = async (entry) => {
    if (!entry.compressed) return;
    setUploading(true);
    try {
      const photoId = `ph-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
      const fullPath = `${path.replace(/\/$/, '')}/${photoId}.jpg`;
      const meta = {
        width: entry.compressed.width,
        height: entry.compressed.height,
        originalBytes: entry.compressed.originalBytes,
        compressedBytes: entry.compressed.compressedBytes,
        quality: entry.compressed.quality,
      };
      const rec = await imageStorage.upload(fullPath, entry.compressed.blob, entry.compressed.dataUrl, meta);
      const next = [...value, { ...rec, ...meta }];
      onChange && onChange(next);
      setPending(prev => prev.filter(p => p.id !== entry.id));
    } catch (err) {
      reportError(err.message || String(err));
    } finally {
      setUploading(false);
    }
  };

  const uploadAll = async () => {
    const ready = pending.filter(p => p.compressed && !p.error);
    for (const p of ready) {
      // eslint-disable-next-line no-await-in-loop
      await uploadOne(p);
    }
  };

  // R31 — Photo delete gating: uploader OR Program Manager group can delete. Audit-logged.
  const removeUploaded = async (rec) => {
    const me = (typeof window !== 'undefined' && window.__currentUser) ? window.__currentUser : null;
    const role = me?.role;
    const isUploader = !!me && (rec.uploadedBy === me.id || rec.uploaded_by_id === me.id || rec.uploaded_by === me.id);
    const pgmGroup = (window.PROGRAM_MANAGER_GROUP || ['Manager','Operations Manager','Program Manager']);
    const isPgmPlus = !!role && (pgmGroup.indexOf(role) !== -1 || role === 'Admin');
    if (!isUploader && !isPgmPlus) {
      alert('You can only delete photos you uploaded. Ask a Program Manager or Manager if this needs removal.');
      return;
    }
    try { await imageStorage.delete(rec.path); } catch (e) { /* ignore */ }
    onChange && onChange(value.filter(v => v.path !== rec.path));
    // Audit log
    if (typeof window !== 'undefined' && window.useStore) {
      const store = (typeof window.__storeRef === 'object') ? window.__storeRef : null;
      if (store && typeof store.logAudit === 'function' && me) {
        try {
          store.logAudit({
            actorId: me.id, actorName: me.name, actorRole: me.role,
            action: 'DELETE', entityType: 'photo', entityId: rec.path,
            entityLabel: rec.path.split('/').pop() || rec.path,
            before: rec.url || rec.path, after: null,
            summary: `Deleted photo "${rec.path}"`,
          });
        } catch (_) {}
      }
    }
  };

  const dropzoneCls = cls(
    'rounded-md border-dashed border-2 border-soft text-center transition cursor-pointer hover:border-accent surface-2',
    compact ? 'p-2 text-[11px]' : 'p-5 text-xs'
  );

  return (
    <div data-testid="image-uploader" className="space-y-2">
      {canAddMore && pending.length === 0 && (
        <div className={dropzoneCls}
          onClick={() => fileRef.current?.click()}
          onDrop={e => { e.preventDefault(); fileRef.current && (fileRef.current.files = e.dataTransfer.files); onPick({ target: fileRef.current }); }}
          onDragOver={e => e.preventDefault()}>
          <Icon name="upload" size={compact ? 14 : 22} className="text-ink-400 inline-block" />
          <div className={compact ? 'mt-0.5' : 'mt-1.5 text-ink-700 font-medium'}>
            {compact ? 'Add photo' : 'Drag photo here or click to choose'}
          </div>
          {!compact && (
            <div className="text-[10px] text-ink-500 mt-0.5">
              Compressed to fit storage · max {nfmt(IMAGE_LIMITS.maxOutputBytes)} per image · up to {maxCount} image{maxCount === 1 ? '' : 's'}
            </div>
          )}
        </div>
      )}
      {!canAddMore && (
        <div className="text-[11px] text-ink-500 italic">Max {maxCount} image{maxCount === 1 ? '' : 's'} reached.</div>
      )}
      <input ref={fileRef} type="file" accept="image/*" multiple={maxCount > 1}
        className="hidden" onChange={onPick} aria-label="Choose images" data-testid="image-uploader-input" />

      {/* Pending previews */}
      {pending.length > 0 && (
        <div className="space-y-2">
          {pending.map(p => (
            <div key={p.id} className="border border-soft rounded-md p-2 surface flex gap-3 items-start">
              <div className="w-20 h-20 shrink-0 bg-ink-100 rounded overflow-hidden flex items-center justify-center">
                {p.compressed?.dataUrl
                  ? <img src={p.compressed.dataUrl} alt="" className="w-full h-full object-cover" />
                  : <Icon name="upload" size={20} className="text-ink-300" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium truncate" title={p.file.name}>{p.file.name}</div>
                {p.compressing && <div className="text-[11px] text-ink-500 italic">Compressing…</div>}
                {p.error && <div className="text-[11px] text-red-700">{p.error}</div>}
                {p.compressed && (
                  <>
                    <div className="text-[11px] text-ink-500 tnum">
                      <span data-testid="upload-preview-size">{nfmt(p.compressed.originalBytes)} → <span className="text-emerald-700 font-medium">{nfmt(p.compressed.compressedBytes)}</span></span>
                      <span className="ml-2 text-ink-400">{p.compressed.width}×{p.compressed.height}</span>
                      <span className="ml-2 text-ink-400">q{Math.round(p.compressed.quality * 100)}</span>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Button size="sm" variant="accent" icon="upload" disabled={uploading} onClick={() => uploadOne(p)}>Upload</Button>
                      <Button size="sm" variant="ghost" icon="x" onClick={() => cancelPending(p.id)}>Cancel</Button>
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
          {pending.filter(p => p.compressed).length > 1 && (
            <div className="text-right">
              <Button size="sm" variant="outline" icon="upload" disabled={uploading} onClick={uploadAll}>
                Upload all ({pending.filter(p => p.compressed).length})
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Uploaded */}
      {value.length > 0 && (
        coverMode ? (
          <div className="relative w-full rounded-md overflow-hidden border border-soft" style={{ aspectRatio: '16/9', background: '#F1F5F9' }}>
            <img src={value[0].url} alt="" className="w-full h-full object-cover cursor-pointer" onClick={() => setLightbox(value[0])} />
            <button type="button" onClick={() => removeUploaded(value[0])}
              className="absolute top-1.5 right-1.5 p-1 rounded bg-white/90 text-ink-700 hover:text-red-600 hover:bg-white border border-soft"
              aria-label="Remove cover">
              <Icon name="trash-2" size={13} />
            </button>
            <div className="absolute bottom-1.5 left-1.5 text-[10px] bg-white/80 px-1.5 py-0.5 rounded font-mono text-ink-700">
              {nfmt(value[0].bytes)}
            </div>
          </div>
        ) : (
          <div className={cls('grid gap-2', compact ? 'grid-cols-3' : 'grid-cols-2 md:grid-cols-4')}>
            {value.map(rec => (
              <div key={rec.path}
                className="group relative w-full rounded border border-soft overflow-hidden bg-ink-50"
                style={{ aspectRatio: '1/1' }}>
                <img src={rec.url} alt="" className="w-full h-full object-cover cursor-pointer"
                  onClick={() => setLightbox(rec)} />
                <button type="button" onClick={() => removeUploaded(rec)}
                  className="absolute top-1 right-1 p-1 rounded bg-white/90 text-ink-700 hover:text-red-600 hover:bg-white border border-soft opacity-0 group-hover:opacity-100 transition"
                  aria-label="Remove">
                  <Icon name="trash-2" size={12} />
                </button>
                <div className="absolute bottom-0 left-0 right-0 text-[9px] bg-black/55 text-white px-1.5 py-0.5 font-mono">
                  {nfmt(rec.bytes)}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)} role="dialog" aria-modal="true">
          <img src={lightbox.url} alt="" className="max-w-full max-h-full rounded shadow-pop"
            onClick={e => e.stopPropagation()} />
          <button type="button" onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 p-2 rounded bg-white text-ink-700 hover:text-red-600"
            aria-label="Close">
            <Icon name="x" size={16} />
          </button>
        </div>
      )}
    </div>
  );
}

Object.assign(window, { ImageUploader });
