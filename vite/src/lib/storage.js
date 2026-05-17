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

const imageStorage = new MemoryImageStorage();
Object.assign(window, { MemoryImageStorage, imageStorage });
