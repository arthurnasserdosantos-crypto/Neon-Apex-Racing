import { LevelObject } from './geometryLevels';

export function drawLevelObject(
  ctx: CanvasRenderingContext2D,
  obj: LevelObject,
  objPxX: number,
  objPxY: number,
  objW: number,
  objH: number,
  now: number,
  options?: {
    isSelected?: boolean;
    isGhost?: boolean;
    isCollected?: boolean;
  },
) {
  if (obj.type === 'SECRET_COIN' && options?.isCollected) return;

  const isPortal =
    obj.type === 'GRAVITY_PORTAL_BLUE' ||
    obj.type === 'GRAVITY_PORTAL_YELLOW' ||
    obj.type === 'PORTAL_CUBE' ||
    obj.type === 'PORTAL_SHIP' ||
    obj.type === 'PORTAL_BALL' ||
    obj.type === 'PORTAL_WAVE';

  const effectiveH = isPortal && !obj.height ? objH * 2.2 : objH;
  const cx = objPxX + objW / 2;
  const cy = objPxY + objH - effectiveH / 2;
  const rotRad = ((obj.rotation || 0) * Math.PI) / 180;

  ctx.save();
  if (options?.isGhost) {
    ctx.globalAlpha = 0.55;
  }

  ctx.translate(cx, cy);
  if (rotRad !== 0) {
    ctx.rotate(rotRad);
  }

  const hw = objW / 2;
  const hh = effectiveH / 2;

  if (obj.type === 'SPIKE') {
    ctx.beginPath();
    ctx.moveTo(-hw, hh);
    ctx.lineTo(0, -hh);
    ctx.lineTo(hw, hh);
    ctx.closePath();

    ctx.fillStyle = '#0F172A';
    ctx.fill();
    ctx.strokeStyle = '#FF0055';
    ctx.lineWidth = 2.5;
    ctx.stroke();
  } else if (obj.type === 'HALF_SPIKE') {
    ctx.beginPath();
    ctx.moveTo(-hw, hh);
    ctx.lineTo(0, 0);
    ctx.lineTo(hw, hh);
    ctx.closePath();
    ctx.fillStyle = '#0F172A';
    ctx.fill();
    ctx.strokeStyle = '#FF0055';
    ctx.lineWidth = 2;
    ctx.stroke();
  } else if (obj.type === 'BLOCK' || obj.type === 'SLAB') {
    const drawH = obj.type === 'SLAB' ? hh : effectiveH;
    const topY = obj.type === 'SLAB' ? -drawH / 2 : -hh;
    ctx.fillStyle = '#141A28';
    ctx.fillRect(-hw, topY, objW, drawH);
    ctx.strokeStyle = '#00F0FF';
    ctx.lineWidth = 2;
    ctx.strokeRect(-hw, topY, objW, drawH);

    ctx.strokeStyle = 'rgba(0, 240, 255, 0.35)';
    ctx.lineWidth = 1;
    ctx.strokeRect(-hw + 4, topY + 4, objW - 8, Math.max(4, drawH - 8));
  } else if (obj.type === 'JUMP_PAD_YELLOW') {
    ctx.fillStyle = '#EAB308';
    ctx.fillRect(-hw + 2, hh - 8, objW - 4, 8);
    ctx.strokeStyle = '#FEF08A';
    ctx.lineWidth = 2;
    ctx.strokeRect(-hw + 2, hh - 8, objW - 4, 8);
  } else if (obj.type === 'JUMP_PAD_PINK') {
    ctx.fillStyle = '#EC4899';
    ctx.fillRect(-hw + 2, hh - 8, objW - 4, 8);
    ctx.strokeStyle = '#FBCFE8';
    ctx.lineWidth = 2;
    ctx.strokeRect(-hw + 2, hh - 8, objW - 4, 8);
  } else if (obj.type === 'JUMP_RING_YELLOW') {
    ctx.strokeStyle = '#EAB308';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, objW * 0.44, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(234, 179, 8, 0.25)';
    ctx.fill();
  } else if (obj.type === 'JUMP_RING_BLUE') {
    ctx.strokeStyle = '#00F0FF';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, objW * 0.44, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(0, 240, 255, 0.25)';
    ctx.fill();
  } else if (isPortal) {
    let fill = '#0088FF';
    let stroke = '#00F0FF';
    let label = 'G';
    if (obj.type === 'GRAVITY_PORTAL_YELLOW') {
      fill = '#EAB308';
      stroke = '#FEF08A';
      label = 'G';
    } else if (obj.type === 'PORTAL_CUBE') {
      fill = '#10B981';
      stroke = '#6EE7B7';
      label = 'C';
    } else if (obj.type === 'PORTAL_SHIP') {
      fill = '#EC4899';
      stroke = '#F9A8D4';
      label = 'S';
    } else if (obj.type === 'PORTAL_BALL') {
      fill = '#F97316';
      stroke = '#FDBA74';
      label = 'B';
    } else if (obj.type === 'PORTAL_WAVE') {
      fill = '#06B6D4';
      stroke = '#67E8F9';
      label = 'W';
    }

    // Outer elliptical portal frame
    ctx.fillStyle = `${fill}44`;
    ctx.beginPath();
    ctx.ellipse(0, 0, objW * 0.34, hh * 0.94, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 3;
    ctx.stroke();

    // Inner portal core band
    ctx.fillStyle = fill;
    ctx.fillRect(-objW * 0.14, -hh * 0.85, objW * 0.28, effectiveH * 0.85);

    // Mode emblem letter
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, 0, 0);
  } else if (obj.type === 'SECRET_COIN') {
    const pulseCoin = 1 + Math.sin(now * 0.006) * 0.12;
    ctx.fillStyle = '#F59E0B';
    ctx.beginPath();
    ctx.arc(0, 0, objW * 0.36 * pulseCoin, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#FEF3C7';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Inner star notch so rotation of coin is clearly visible
    ctx.fillStyle = '#FEF3C7';
    ctx.fillRect(-2, -objW * 0.2, 4, objW * 0.4);
  }

  if (options?.isSelected) {
    ctx.strokeStyle = '#FACC15';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 3]);
    ctx.strokeRect(-hw - 4, -hh - 4, objW + 8, effectiveH + 8);
    ctx.setLineDash([]);
    // Rotation direction indicator tick on top
    ctx.fillStyle = '#FACC15';
    ctx.beginPath();
    ctx.arc(0, -hh - 8, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}
