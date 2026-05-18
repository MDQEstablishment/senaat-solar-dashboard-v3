// R29 — image storage adapter. In-memory backend for the demo; the interface
// matches what Supabase Storage exposes so Round 30 can swap the implementation
// without touching call sites.
//
// API (all async, mirrors the Supabase Storage client surface):
//   upload(path, blob, dataUrl, meta?)  → { path, url, uploadedAt }
//   delete(path)                        → void
//   list(prefix)                        → [{ path, url, uploadedAt, bytes }]
//   estimatedBytes()                    → total bytes stored
//   imageCount()                        → number of objects
//   topPrefixes(depth, n)               → [{ prefix, bytes, count }]  for the Storage panel
//
// The `path` convention is documented in the spec:
//   projects/{pid}/cover.jpg
//   projects/{pid}/gallery/{photo_id}.jpg
//   projects/{pid}/schools/{sid}/stages/{stage_key}/{photo_id}.jpg
//   delivery-notes/{note_id}/{photo_id}.jpg
class MemoryImageStorage {
  constructor() { this.bucket = new Map(); }

  async upload(path, blob, dataUrl, meta) {
    const rec = {
      blob,
      dataUrl,
      bytes: (blob && blob.size) || 0,
      uploadedAt: Date.now(),
      meta: meta || null,
    };
    this.bucket.set(path, rec);
    return { path, url: dataUrl, uploadedAt: rec.uploadedAt, bytes: rec.bytes };
  }

  async delete(path) {
    this.bucket.delete(path);
  }

  async list(prefix) {
    const out = [];
    const pfx = prefix || '';
    for (const [path, v] of this.bucket.entries()) {
      if (path.startsWith(pfx)) {
        out.push({ path, url: v.dataUrl, uploadedAt: v.uploadedAt, bytes: v.bytes });
      }
    }
    out.sort((a, b) => b.uploadedAt - a.uploadedAt);
    return out;
  }

  estimatedBytes() {
    let n = 0;
    for (const v of this.bucket.values()) n += v.bytes || 0;
    return n;
  }

  imageCount() {
    return this.bucket.size;
  }

  // Group by the first `depth` path segments, return the top `n` by bytes.
  // Used by the Settings → Storage panel ("top 5 projects by storage").
  topPrefixes(depth = 2, n = 5) {
    const groups = new Map();
    for (const [path, v] of this.bucket.entries()) {
      const segments = path.split('/').slice(0, depth).join('/');
      const g = groups.get(segments) || { prefix: segments, bytes: 0, count: 0 };
      g.bytes += v.bytes || 0;
      g.count += 1;
      groups.set(segments, g);
    }
    return Array.from(groups.values())
      .sort((a, b) => b.bytes - a.bytes)
      .slice(0, n);
  }
}

// R30 — Supabase Storage adapter.
//
// Path convention preserved verbatim from MemoryImageStorage:
//   projects/{pid}/cover/{photo_id}.jpg
//   projects/{pid}/gallery/{photo_id}.jpg
//   projects/{pid}/schools/{sid}/stages/{stage_key}/{photo_id}.jpg
//   delivery-notes/{note_id}/{photo_id}.jpg
//
// list / estimatedBytes / imageCount walk the bucket recursively. For 10k+
// objects, swap this for a Postgres VIEW rollup on storage.objects (R31).
class SupabaseImageStorage {
  constructor(client, bucket = 'images') {
    this.client = client;
    this.bucket = bucket;
    this._listCache = null;
    this._listCacheAt = 0;
  }

  _bucketApi() { return this.client.storage.from(this.bucket); }

  async upload(path, blob, dataUrl, meta) {
    const contentType = (blob && blob.type) || 'image/jpeg';
    const { error } = await this._bucketApi().upload(path, blob, { contentType, upsert: true });
    if (error) throw error;
    const { data: pub } = this._bucketApi().getPublicUrl(path);
    const url = (pub && pub.publicUrl) || dataUrl || null;
    this._invalidate();
    return { path, url, uploadedAt: Date.now(), bytes: (blob && blob.size) || 0 };
  }

  async delete(path) {
    const { error } = await this._bucketApi().remove([path]);
    if (error) throw error;
    this._invalidate();
  }

  async list(prefix) {
    const pfx = (prefix || '').replace(/^\/+|\/+$/g, '');
    const out = [];
    await this._walk(pfx, out);
    return out;
  }

  async _walk(prefix, out) {
    const { data, error } = await this._bucketApi().list(prefix || '', { limit: 1000, sortBy: { column: 'name', order: 'asc' } });
    if (error) throw error;
    for (const it of (data || [])) {
      const full = prefix ? `${prefix}/${it.name}` : it.name;
      // Supabase list returns folders with metadata == null && id == null.
      if (it.id == null && it.metadata == null) {
        await this._walk(full, out);
      } else {
        const bytes = (it.metadata && it.metadata.size) || 0;
        const uploadedAt = it.updated_at ? new Date(it.updated_at).getTime() : Date.now();
        const { data: pub } = this._bucketApi().getPublicUrl(full);
        out.push({ path: full, url: (pub && pub.publicUrl) || null, uploadedAt, bytes });
      }
    }
  }

  _invalidate() { this._listCache = null; }

  async _allCached() {
    const fresh = Date.now() - this._listCacheAt < 10_000;
    if (fresh && this._listCache) return this._listCache;
    this._listCache = await this.list('');
    this._listCacheAt = Date.now();
    return this._listCache;
  }

  // Sync surface kept for compat with the Storage panel; returns cached values
  // and triggers a background refresh. Components listen for 'storage-refreshed'.
  estimatedBytes() {
    if (!this._listCache) { this._allCached().then(() => this._fireRefreshed()); return 0; }
    return this._listCache.reduce((a, b) => a + (b.bytes || 0), 0);
  }
  imageCount() {
    if (!this._listCache) { this._allCached().then(() => this._fireRefreshed()); return 0; }
    return this._listCache.length;
  }
  topPrefixes(depth = 2, n = 5) {
    if (!this._listCache) { this._allCached().then(() => this._fireRefreshed()); return []; }
    const groups = new Map();
    for (const it of this._listCache) {
      const seg = it.path.split('/').slice(0, depth).join('/');
      const g = groups.get(seg) || { prefix: seg, bytes: 0, count: 0 };
      g.bytes += it.bytes || 0;
      g.count += 1;
      groups.set(seg, g);
    }
    return Array.from(groups.values()).sort((a, b) => b.bytes - a.bytes).slice(0, n);
  }
  _fireRefreshed() {
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('storage-refreshed'));
  }
}

// Pick adapter at module load. USE_SUPABASE + supabase client must exist on window
// (set by lib/supabase.js which is imported BEFORE this file in main.jsx).
const __useSupabase = (typeof window !== 'undefined') && window.USE_SUPABASE && window.supabase;
const imageStorage = __useSupabase
  ? new SupabaseImageStorage(window.supabase, 'images')
  : new MemoryImageStorage();

Object.assign(window, { MemoryImageStorage, SupabaseImageStorage, imageStorage });
