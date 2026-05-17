// R29 — image compression utilities.
// Side-effect file. Exposes `window.IMAGE_LIMITS`, `window.compressImage`,
// `window.formatBytes`. Imported once from main.jsx and inlined in the
// Standalone bundle by SENAAT Solar Dashboard.html.
//
// Compression strategy:
//   • Validate MIME against IMAGE_LIMITS.acceptedMimes
//   • Validate raw input size against maxInputBytes (10 MB)
//   • Resize to fit IMAGE_LIMITS.maxDimension (1920 px) on the long edge
//     via offscreen canvas (image is read into an <img>, drawn into a
//     canvas at the target size, exported as JPEG)
//   • Iterate quality down (0.78 → 0.7 → 0.6 → 0.5 → 0.4) until the
//     resulting blob is <= IMAGE_LIMITS.maxOutputBytes (500 KB). If even
//     0.4 quality misses the target, return the smallest version anyway
//     and let the caller decide.
//
// The function returns { blob, dataUrl, width, height, originalBytes,
// compressedBytes, quality } so the UI can render a preview + before/after
// size badge without re-reading the file.
const IMAGE_LIMITS = {
  maxInputBytes:  10 * 1024 * 1024,
  maxOutputBytes: 500 * 1024,
  maxDimension:   1920,
  jpegQuality:    0.78,
  acceptedMimes:  ['image/jpeg', 'image/png', 'image/webp', 'image/heic'],
};

function formatBytes(n) {
  if (n == null || !Number.isFinite(n)) return '—';
  if (n < 1024) return n + ' B';
  if (n < 1024 * 1024) return (n / 1024).toFixed(0) + ' KB';
  return (n / 1024 / 1024).toFixed(1) + ' MB';
}

function _loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = (e) => { URL.revokeObjectURL(url); reject(e || new Error('Image decode failed')); };
    img.src = url;
  });
}

function _canvasToBlob(canvas, type, quality) {
  return new Promise((resolve) => {
    if (canvas.toBlob) {
      canvas.toBlob(b => resolve(b), type, quality);
    } else {
      // Fallback: dataURL → blob (older browsers; not expected in our target env).
      const dataUrl = canvas.toDataURL(type, quality);
      const bin = atob(dataUrl.split(',')[1]);
      const u8  = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
      resolve(new Blob([u8], { type }));
    }
  });
}

function _blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(r.error || new Error('FileReader failed'));
    r.readAsDataURL(blob);
  });
}

async function compressImage(file) {
  if (!file) throw new Error('No file provided');
  if (IMAGE_LIMITS.acceptedMimes.indexOf(file.type) === -1 && !/image\//.test(file.type || '')) {
    throw new Error('Unsupported file type. Accepted: JPEG, PNG, WebP, HEIC.');
  }
  if (file.size > IMAGE_LIMITS.maxInputBytes) {
    throw new Error(`File too large (${formatBytes(file.size)} > ${formatBytes(IMAGE_LIMITS.maxInputBytes)}).`);
  }
  const img = await _loadImage(file);
  // Resize so the long edge is <= maxDimension
  const longEdge = Math.max(img.naturalWidth, img.naturalHeight);
  const scale   = longEdge > IMAGE_LIMITS.maxDimension ? IMAGE_LIMITS.maxDimension / longEdge : 1;
  const width   = Math.round(img.naturalWidth * scale);
  const height  = Math.round(img.naturalHeight * scale);
  const canvas  = document.createElement('canvas');
  canvas.width  = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, width, height);

  const qualities = [IMAGE_LIMITS.jpegQuality, 0.7, 0.6, 0.5, 0.4];
  let blob = null;
  let usedQuality = IMAGE_LIMITS.jpegQuality;
  for (const q of qualities) {
    const b = await _canvasToBlob(canvas, 'image/jpeg', q);
    if (!b) continue;
    blob = b;
    usedQuality = q;
    if (b.size <= IMAGE_LIMITS.maxOutputBytes) break;
  }
  if (!blob) throw new Error('Compression failed (no blob produced).');
  const dataUrl = await _blobToDataUrl(blob);
  return {
    blob, dataUrl, width, height,
    originalBytes: file.size,
    compressedBytes: blob.size,
    quality: usedQuality,
    mime: 'image/jpeg',
  };
}

Object.assign(window, { IMAGE_LIMITS, compressImage, formatBytes });
