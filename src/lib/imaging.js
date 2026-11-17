// Downscale + 4:3 crop in the browser before upload, so the owner never ships 6 MB photos.
export function readFile(file) {
  return new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(fr.result);
    fr.onerror = rej;
    fr.readAsDataURL(file);
  });
}

function loadImage(src) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = src;
  });
}

// Crop to 4:3 around the focus point (0..100), then resize to `width`.
export async function makeImage(file, width, focusX = 50, focusY = 50, quality = 0.82) {
  const dataUrl = await readFile(file);
  const img = await loadImage(dataUrl);
  const ratio = 4 / 3;
  const srcRatio = img.width / img.height;
  let sw = img.width, sh = img.height;
  if (srcRatio > ratio) sw = Math.round(img.height * ratio); else sh = Math.round(img.width / ratio);
  const sx = Math.max(0, Math.min(img.width - sw, (img.width * focusX) / 100 - sw / 2));
  const sy = Math.max(0, Math.min(img.height - sh, (img.height * focusY) / 100 - sh / 2));
  const cw = width, ch = Math.round(width / ratio);
  const canvas = document.createElement('canvas');
  canvas.width = cw; canvas.height = ch;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, cw, ch);
  const out = canvas.toDataURL('image/jpeg', quality);
  return out.split(',')[1];
}

export function base64Of(dataUrl) { return String(dataUrl).split(',')[1] || ''; }
