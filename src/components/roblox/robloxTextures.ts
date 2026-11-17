import * as THREE from 'three';

const textureCache = new Map<string, THREE.CanvasTexture>();

export type RobloxFaceStyle = 'classic' | 'happy' | 'cool' | 'robot';

export function createStudTexture(
  baseHex: string,
  repeatX = 1,
  repeatY = 1,
  maxAniso = 4,
): THREE.CanvasTexture {
  const key = `stud_${baseHex}_${repeatX}_${repeatY}`;
  const existing = textureCache.get(key);
  if (existing) return existing;

  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, size, size);

  // Subtle plastic bevel border
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 3;
  ctx.strokeRect(1.5, 1.5, size - 3, size - 3);

  // Classic 2x2 stud circles on each tile
  const centers = [size * 0.25, size * 0.75];
  for (const cx of centers) {
    for (const cy of centers) {
      // Stud drop shadow
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.beginPath();
      ctx.arc(cx + 2, cy + 3, 18, 0, Math.PI * 2);
      ctx.fill();

      // Stud body
      ctx.fillStyle = baseHex;
      ctx.beginPath();
      ctx.arc(cx, cy, 18, 0, Math.PI * 2);
      ctx.fill();

      // Top rim highlight
      ctx.strokeStyle = 'rgba(255,255,255,0.28)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(cx, cy, 17, Math.PI * 0.9, Math.PI * 1.95);
      ctx.stroke();

      // Inner stud ring
      ctx.strokeStyle = 'rgba(0,0,0,0.14)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, cy, 14, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = maxAniso;
  textureCache.set(key, tex);
  return tex;
}

export function createSpawnPadTexture(maxAniso = 4): THREE.CanvasTexture {
  const key = 'spawn_pad_decal';
  const existing = textureCache.get(key);
  if (existing) return existing;

  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#334155';
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = '#94A3B8';
  ctx.lineWidth = 8;
  ctx.strokeRect(8, 8, size - 16, size - 16);

  // Iconic sunburst / spawn ring
  ctx.translate(size / 2, size / 2);
  ctx.fillStyle = '#F8FAFC';
  for (let i = 0; i < 8; i++) {
    ctx.save();
    ctx.rotate((i * Math.PI) / 4);
    ctx.beginPath();
    ctx.moveTo(0, -90);
    ctx.lineTo(14, -46);
    ctx.lineTo(-14, -46);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  ctx.beginPath();
  ctx.arc(0, 0, 40, 0, Math.PI * 2);
  ctx.fillStyle = '#38BDF8';
  ctx.fill();
  ctx.lineWidth = 7;
  ctx.strokeStyle = '#F8FAFC';
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  textureCache.set(key, tex);
  return tex;
}

export function createFaceTexture(
  style: RobloxFaceStyle,
  skinHex: string,
  maxAniso = 4,
): THREE.CanvasTexture {
  const key = `face_${style}_${skinHex}`;
  const existing = textureCache.get(key);
  if (existing) return existing;

  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = skinHex;
  ctx.fillRect(0, 0, size, size);

  if (style === 'classic') {
    // Classic smiling face
    ctx.fillStyle = '#111827';
    ctx.beginPath();
    ctx.ellipse(92, 108, 12, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(164, 108, 12, 18, 0, 0, Math.PI * 2);
    ctx.fill();

    // Eye catchlights
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(96, 102, 4, 0, Math.PI * 2);
    ctx.arc(168, 102, 4, 0, Math.PI * 2);
    ctx.fill();

    // Curved smile
    ctx.strokeStyle = '#111827';
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(128, 134, 42, 0.2 * Math.PI, 0.8 * Math.PI);
    ctx.stroke();
  } else if (style === 'happy') {
    // Rosy cheeks + wide grin + curved happy eyes
    ctx.fillStyle = 'rgba(244, 63, 94, 0.35)';
    ctx.beginPath();
    ctx.ellipse(72, 140, 18, 10, 0, 0, Math.PI * 2);
    ctx.ellipse(184, 140, 18, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#111827';
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(92, 114, 14, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(164, 114, 14, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();

    // Open grin
    ctx.fillStyle = '#111827';
    ctx.beginPath();
    ctx.arc(128, 142, 38, 0, Math.PI);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(102, 143, 52, 12);
  } else if (style === 'cool') {
    // Cool shades + smirk
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(54, 88, 66, 36);
    ctx.fillRect(136, 88, 66, 36);
    ctx.fillRect(114, 98, 28, 10);
    // Specular diagonal glare on lenses
    ctx.fillStyle = 'rgba(56, 189, 248, 0.65)';
    ctx.beginPath();
    ctx.moveTo(64, 92);
    ctx.lineTo(84, 92);
    ctx.lineTo(72, 120);
    ctx.lineTo(58, 120);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(146, 92);
    ctx.lineTo(166, 92);
    ctx.lineTo(154, 120);
    ctx.lineTo(140, 120);
    ctx.closePath();
    ctx.fill();

    // Confident smirk
    ctx.strokeStyle = '#111827';
    ctx.lineWidth = 9;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(96, 162);
    ctx.quadraticCurveTo(136, 174, 166, 148);
    ctx.stroke();
  } else {
    // Robot visor face
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(46, 82, 164, 52);
    ctx.fillStyle = '#00F0FF';
    ctx.fillRect(66, 100, 44, 14);
    ctx.fillRect(146, 100, 44, 14);
    ctx.fillStyle = '#334155';
    ctx.fillRect(88, 154, 80, 22);
    ctx.fillStyle = '#38BDF8';
    for (let x = 96; x < 164; x += 16) {
      ctx.fillRect(x, 158, 8, 14);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  textureCache.set(key, tex);
  return tex;
}

export function createShirtTexture(
  shirtHex: string,
  stripeHex: string,
  maxAniso = 4,
): THREE.CanvasTexture {
  const key = `shirt_${shirtHex}_${stripeHex}`;
  const existing = textureCache.get(key);
  if (existing) return existing;

  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = shirtHex;
  ctx.fillRect(0, 0, size, size);

  // Subtle fabric weave
  ctx.fillStyle = 'rgba(255,255,255,0.04)';
  for (let y = 0; y < size; y += 8) {
    ctx.fillRect(0, y, size, 2);
  }

  // Diagonal chest stripe + Roblox-style tilted square emblem
  ctx.fillStyle = stripeHex;
  ctx.fillRect(0, 170, size, 32);

  ctx.save();
  ctx.translate(size / 2, 102);
  ctx.rotate(-0.22);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(-34, -34, 68, 68);
  ctx.fillStyle = shirtHex;
  ctx.fillRect(-12, -12, 24, 24);
  ctx.restore();

  // Collar cutout
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.beginPath();
  ctx.arc(size / 2, 12, 34, 0, Math.PI);
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  textureCache.set(key, tex);
  return tex;
}

export function createCheckerTexture(maxAniso = 4): THREE.CanvasTexture {
  const key = 'checker_finish';
  const existing = textureCache.get(key);
  if (existing) return existing;

  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const cells = 4;
  const step = size / cells;
  for (let y = 0; y < cells; y++) {
    for (let x = 0; x < cells; x++) {
      ctx.fillStyle = (x + y) % 2 === 0 ? '#F8FAFC' : '#0F172A';
      ctx.fillRect(x * step, y * step, step, step);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 1);
  tex.anisotropy = maxAniso;
  textureCache.set(key, tex);
  return tex;
}
