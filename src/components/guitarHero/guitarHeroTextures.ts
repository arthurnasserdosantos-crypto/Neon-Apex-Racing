import * as THREE from 'three';

const cache = new Map<string, THREE.CanvasTexture>();

export function createFretboardTexture(maxAniso = 8): THREE.CanvasTexture {
  const key = 'gh_fretboard_rosewood';
  const existing = cache.get(key);
  if (existing) return existing;

  const w = 512;
  const h = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  // Rich dark roasted rosewood gradient
  const grad = ctx.createLinearGradient(0, 0, w, 0);
  grad.addColorStop(0, '#130A08');
  grad.addColorStop(0.15, '#241410');
  grad.addColorStop(0.5, '#2D1A15');
  grad.addColorStop(0.85, '#241410');
  grad.addColorStop(1, '#130A08');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Fine vertical wood grain streaks
  for (let i = 0; i < 160; i++) {
    const gx = ((i * 73) % w);
    const alpha = 0.04 + (i % 5) * 0.015;
    ctx.fillStyle = i % 2 === 0 ? `rgba(255,205,170,${alpha})` : `rgba(8,4,3,${alpha * 2})`;
    ctx.fillRect(gx, 0, 2 + (i % 3), h);
  }

  // 5 String Lanes separated by brushed dark dividers + thin luminous string rails
  const laneCount = 5;
  const laneW = w / laneCount;
  for (let i = 1; i < laneCount; i++) {
    const x = i * laneW;
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(x - 2, 0, 4, h);
  }

  // 5 Steel Guitar Strings running along lane centers
  for (let i = 0; i < laneCount; i++) {
    const cx = (i + 0.5) * laneW;
    const stringThick = 5 - i * 0.55; // thicker low-E to thinner high-B string
    const strGrad = ctx.createLinearGradient(cx - stringThick, 0, cx + stringThick, 0);
    strGrad.addColorStop(0, 'rgba(148,163,184,0.18)');
    strGrad.addColorStop(0.5, 'rgba(241,245,249,0.75)');
    strGrad.addColorStop(1, 'rgba(100,116,139,0.18)');
    ctx.fillStyle = strGrad;
    ctx.fillRect(cx - stringThick * 0.5, 0, stringThick, h);
  }

  // Mother-of-pearl trapezoid fret inlays (2 per texture repeat cycle)
  const inlayYs = [h * 0.25, h * 0.75];
  inlayYs.forEach((iy) => {
    const iw = 132;
    const ih = 46;
    const pearl = ctx.createLinearGradient(w / 2 - iw / 2, iy - ih / 2, w / 2 + iw / 2, iy + ih / 2);
    pearl.addColorStop(0, 'rgba(226, 232, 240, 0.26)');
    pearl.addColorStop(0.5, 'rgba(248, 250, 252, 0.42)');
    pearl.addColorStop(1, 'rgba(186, 230, 253, 0.24)');
    ctx.fillStyle = pearl;
    ctx.beginPath();
    ctx.moveTo(w / 2 - iw * 0.5, iy - ih * 0.5);
    ctx.lineTo(w / 2 + iw * 0.5, iy - ih * 0.5);
    ctx.lineTo(w / 2 + iw * 0.4, iy + ih * 0.5);
    ctx.lineTo(w / 2 - iw * 0.4, iy + ih * 0.5);
    ctx.closePath();
    ctx.fill();
  });

  // Brushed Nickel-Silver Fret Bars across horizontal ticks
  const fretSteps = 4;
  for (let f = 0; f < fretSteps; f++) {
    const fy = (f / fretSteps) * h;
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(0, fy + 4, w, 5);
    const barGrad = ctx.createLinearGradient(0, fy - 4, 0, fy + 5);
    barGrad.addColorStop(0, '#475569');
    barGrad.addColorStop(0.45, '#F8FAFC');
    barGrad.addColorStop(1, '#334155');
    ctx.fillStyle = barGrad;
    ctx.fillRect(0, fy, w, 6);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 5.5);
  tex.anisotropy = maxAniso;
  cache.set(key, tex);
  return tex;
}

export function createAmpGrillTexture(maxAniso = 4): THREE.CanvasTexture {
  const key = 'gh_amp_grill';
  const existing = cache.get(key);
  if (existing) return existing;

  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#0F1115';
  ctx.fillRect(0, 0, size, size);

  // Woven speaker cloth crosshatch
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.16)';
  ctx.lineWidth = 2;
  for (let i = 0; i < size; i += 8) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, size);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(size, i);
    ctx.stroke();
  }

  // 2x2 speaker cone silhouettes behind cloth
  const centers = [
    [68, 68],
    [188, 68],
    [68, 188],
    [188, 188],
  ];
  for (const [cx, cy] of centers) {
    const rg = ctx.createRadialGradient(cx, cy, 6, cx, cy, 48);
    rg.addColorStop(0, '#020617');
    rg.addColorStop(0.35, '#1E293B');
    rg.addColorStop(0.85, '#0F172A');
    rg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.arc(cx, cy, 48, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  cache.set(key, tex);
  return tex;
}

export function createFlameGlowTexture(): THREE.CanvasTexture {
  const key = 'gh_flame_glow';
  const existing = cache.get(key);
  if (existing) return existing;

  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createRadialGradient(size / 2, size / 2, 4, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.35, 'rgba(253,224,71,0.85)');
  grad.addColorStop(0.7, 'rgba(249,115,22,0.35)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  cache.set(key, tex);
  return tex;
}
