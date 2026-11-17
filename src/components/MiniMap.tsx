import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Compass, Maximize2, Minimize2 } from 'lucide-react';
import { useGameStore } from '../store';
import {
  FREE_ROAM_BEACONS,
  FREE_ROAM_BOUNDS,
  FREE_ROAM_BUILDINGS,
  FREE_ROAM_CITY_BLOCKS,
  FREE_ROAM_PYLONS,
  FREE_ROAM_ROADS,
  carTelemetry,
  getActiveFreeRoamBeacons,
  raceTelemetry,
} from '../utils/freeRoamWorld';
import { MAX_TRAFFIC_CARS, trafficVehicles } from '../utils/freeRoamTraffic';
import { getCustomCityBounds, getCustomCityObstacleObbs } from '../utils/collisionPhysics';
import { getBuiltRaceTrack } from '../utils/raceTracks';

const MAP_SIZE = 184;

function getCompassCardinal(rad: number): string {
  const deg = (((rad * 180) / Math.PI) % 360 + 360) % 360;
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(deg / 45) % 8];
}

export function MiniMap() {
  const view = useGameStore((s) => s.view);
  const activeTrackId = useGameStore((s) => s.activeTrackId);
  const carColor = useGameStore((s) => s.car.color);

  const [zoomMode, setZoomMode] = useState<'follow' | 'full'>(
    view === 'RACE' ? 'full' : 'follow',
  );
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const coordsRef = useRef<HTMLSpanElement | null>(null);
  const headingRef = useRef<HTMLSpanElement | null>(null);
  const trailRef = useRef<Array<{ x: number; z: number }>>([]);
  const carColorRef = useRef(carColor);

  const activeTrack = useMemo(
    () => (view === 'RACE' ? getBuiltRaceTrack(activeTrackId) : null),
    [view, activeTrackId],
  );

  useEffect(() => {
    carColorRef.current = carColor;
  }, [carColor]);

  // Default to full circuit view in RACE, follow radar in FREE_ROAM
  useEffect(() => {
    trailRef.current = [];
    setZoomMode(view === 'RACE' ? 'full' : 'follow');
  }, [view, activeTrackId]);

  // Press M to toggle Follow / Full overview
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'm' || e.key === 'M') {
        setZoomMode((prev) => (prev === 'follow' ? 'full' : 'follow'));
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = MAP_SIZE * dpr;
    canvas.height = MAP_SIZE * dpr;

    let rafId = 0;
    let lastTrailSampleTime = 0;
    let lastDomSync = 0;

    const renderFrame = (now: number) => {
      rafId = requestAnimationFrame(renderFrame);

      const { x, z, headingRad } = carTelemetry;

      if (view === 'FREE_ROAM' && now - lastTrailSampleTime > 80) {
        const trail = trailRef.current;
        const last = trail[trail.length - 1];
        if (!last || Math.hypot(x - last.x, z - last.z) >= 2.5) {
          trail.push({ x, z });
          if (trail.length > 90) trail.shift();
        }
        lastTrailSampleTime = now;
      }

      if (now - lastDomSync > 80) {
        if (coordsRef.current) {
          coordsRef.current.textContent = `${Math.round(x)}m, ${Math.round(-z)}m`;
        }
        if (headingRef.current) {
          headingRef.current.textContent = getCompassCardinal(headingRad);
        }
        lastDomSync = now;
      }

      ctx.save();
      ctx.scale(dpr, dpr);

      // Background
      ctx.fillStyle = '#090c12';
      ctx.fillRect(0, 0, MAP_SIZE, MAP_SIZE);

      const padding = 12;
      const drawSpan = MAP_SIZE - padding * 2;
      const freeRoamBounds = getCustomCityBounds() ?? FREE_ROAM_BOUNDS;
      const activeBounds = activeTrack ? activeTrack.bounds : freeRoamBounds;
      const fullWorldSpan = Math.max(activeBounds.width, activeBounds.depth);
      const worldSpan = zoomMode === 'full' ? fullWorldSpan : 180;
      const scale = drawSpan / worldSpan;

      const viewCenterX = zoomMode === 'full' ? activeBounds.centerX : x;
      const viewCenterZ = zoomMode === 'full' ? activeBounds.centerZ : z;

      const toPxX = (wx: number) => MAP_SIZE / 2 + (wx - viewCenterX) * scale;
      const toPxY = (wz: number) => MAP_SIZE / 2 + (wz - viewCenterZ) * scale;

      if (view === 'RACE' && activeTrack) {
        // Custom closed-circuit track ribbon outline
        const { samples } = activeTrack;
        ctx.beginPath();
        for (let i = 0; i < samples.length; i++) {
          const px = toPxX(samples[i].pos.x);
          const py = toPxY(samples[i].pos.z);
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = Math.max(5, activeTrack.roadWidth * scale);
        ctx.lineJoin = 'round';
        ctx.stroke();

        ctx.strokeStyle = 'rgba(249, 115, 22, 0.5)';
        ctx.lineWidth = 1.4;
        ctx.stroke();

        // Start/Finish marker perpendicular bar
        const s0 = samples[0];
        const halfW = (activeTrack.roadWidth * 0.55) * scale;
        const sx = toPxX(s0.pos.x);
        const sy = toPxY(s0.pos.z);
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(sx - s0.right.x * halfW, sy - s0.right.z * halfW);
        ctx.lineTo(sx + s0.right.x * halfW, sy + s0.right.z * halfW);
        ctx.stroke();

        // Render active AI Opponents (1 Boss in 1v1 Boss Battle, or 2 Rivals in standard race)
        for (let i = 0; i < raceTelemetry.activeBotCount; i++) {
          const bot = raceTelemetry.bots[i];
          const bx = toPxX(bot.x);
          const by = toPxY(bot.z);
          if (activeTrack.isBoss) {
            ctx.beginPath();
            ctx.arc(bx, by, 7.5, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(239, 68, 68, 0.7)';
            ctx.lineWidth = 1.5;
            ctx.stroke();
          }
          ctx.beginPath();
          ctx.arc(bx, by, activeTrack.isBoss ? 4.8 : 4.2, 0, Math.PI * 2);
          ctx.fillStyle = bot.color;
          ctx.fill();
          ctx.lineWidth = 1.3;
          ctx.strokeStyle = '#ffffff';
          ctx.stroke();
        }
      } else {
        // --- FREE ROAM GPS RADAR (Adapts to uploaded glTF city bounds or 1120x1120 procedural grid) ---
        const bLeft = toPxX(freeRoamBounds.minX);
        const bTop = toPxY(freeRoamBounds.minZ);
        const bWidth = freeRoamBounds.width * scale;
        const bHeight = freeRoamBounds.depth * scale;

        ctx.fillStyle = 'rgba(14, 18, 24, 0.92)';
        ctx.fillRect(bLeft, bTop, bWidth, bHeight);

        const customObbs = getCustomCityObstacleObbs();
        if (customObbs) {
          // Draw uploaded glTF city building footprints (skipping the 4 outer perimeter walls)
          const bldgCount = Math.max(0, customObbs.length - 4);
          for (let i = 0; i < bldgCount; i++) {
            const o = customObbs[i];
            const wPx = Math.max(2, o.halfW * 2 * scale);
            const hPx = Math.max(2, o.halfL * 2 * scale);
            const bx = toPxX(o.cx) - wPx / 2;
            const by = toPxY(o.cz) - hPx / 2;
            ctx.fillStyle = 'rgba(42, 52, 70, 0.92)';
            ctx.fillRect(bx, by, wPx, hPx);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
            ctx.lineWidth = 0.8;
            ctx.strokeRect(bx, by, wPx, hPx);
          }
        } else {
          // City District Blocks (grass suburbs/parks vs urban concrete)
          for (let i = 0; i < FREE_ROAM_CITY_BLOCKS.length; i++) {
            const blk = FREE_ROAM_CITY_BLOCKS[i];
            const wPx = blk.w * scale;
            const hPx = blk.d * scale;
            const bx = toPxX(blk.x) - wPx / 2;
            const by = toPxY(blk.z) - hPx / 2;
            ctx.fillStyle =
              blk.kind === 'grass'
                ? 'rgba(22, 60, 36, 0.55)'
                : blk.kind === 'industrial'
                ? 'rgba(28, 32, 42, 0.7)'
                : 'rgba(24, 28, 38, 0.75)';
            ctx.fillRect(bx, by, wPx, hPx);
          }

          // Dynamic Asphalt Road Grid Ribbons
          for (let i = 0; i < FREE_ROAM_ROADS.length; i++) {
            const r = FREE_ROAM_ROADS[i];
            ctx.fillStyle = r.isHighway ? 'rgba(55, 65, 81, 0.95)' : 'rgba(42, 50, 64, 0.92)';
            if (r.axis === 'z') {
              const rw = r.length * scale;
              const rh = Math.max(2.2, r.width * scale);
              ctx.fillRect(toPxX(-r.length / 2), toPxY(r.coord) - rh / 2, rw, rh);
            } else {
              const rw = Math.max(2.2, r.width * scale);
              const rh = r.length * scale;
              ctx.fillRect(toPxX(r.coord) - rw / 2, toPxY(-r.length / 2), rw, rh);
            }
          }

          // Yellow Grand Boulevard Centerlines
          ctx.save();
          ctx.strokeStyle = 'rgba(250, 204, 21, 0.65)';
          ctx.lineWidth = Math.max(1, 1.5 * scale);
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo(toPxX(0), toPxY(-489));
          ctx.lineTo(toPxX(0), toPxY(489));
          ctx.moveTo(toPxX(-489), toPxY(0));
          ctx.lineTo(toPxX(489), toPxY(0));
          ctx.stroke();
          ctx.restore();

          // City Buildings & Houses Footprints
          for (let i = 0; i < FREE_ROAM_BUILDINGS.length; i++) {
            const b = FREE_ROAM_BUILDINGS[i];
            const wPx = Math.max(1.8, b.size[0] * scale);
            const hPx = Math.max(1.8, b.size[2] * scale);
            const bx = toPxX(b.x) - wPx / 2;
            const by = toPxY(b.z) - hPx / 2;

            ctx.fillStyle =
              b.type === 'garage_hq'
                ? 'rgba(255, 153, 0, 0.35)'
                : b.type === 'dealership'
                ? 'rgba(0, 176, 255, 0.35)'
                : b.type === 'house'
                ? 'rgba(148, 163, 184, 0.68)'
                : 'rgba(38, 46, 62, 0.9)';
            ctx.fillRect(bx, by, wPx, hPx);

            ctx.strokeStyle =
              b.type === 'garage_hq'
                ? '#FF9900'
                : b.type === 'dealership'
                ? '#00B0FF'
                : 'rgba(255, 255, 255, 0.14)';
            ctx.lineWidth = 0.8;
            ctx.strokeRect(bx, by, wPx, hPx);
          }
        }

        // Outer City Perimeter Wall Border
        ctx.strokeStyle = 'rgba(249, 115, 22, 0.6)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(bLeft, bTop, bWidth, bHeight);

        // Interactive World Beacons (Garage, Car Lot, Street Race Events)
        const activeBeacons = getActiveFreeRoamBeacons();
        for (let i = 0; i < activeBeacons.length; i++) {
          const beacon = activeBeacons[i];
          const bx = toPxX(beacon.x);
          const by = toPxY(beacon.z);
          const rPx = Math.max(3.5, beacon.radius * scale);

          // Glowing radar beacon radius circle
          ctx.beginPath();
          ctx.arc(bx, by, rPx, 0, Math.PI * 2);
          ctx.strokeStyle = beacon.color;
          ctx.lineWidth = 1.4;
          ctx.stroke();

          // Icon Diamond / Badge
          ctx.beginPath();
          ctx.arc(bx, by, Math.max(2.5, 3.2), 0, Math.PI * 2);
          ctx.fillStyle = beacon.color;
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1;
          ctx.stroke();

          // Text label for Central Garage & Car Lot
          if (beacon.type === 'GARAGE' || beacon.type === 'CAR_LOT') {
            ctx.fillStyle = beacon.color;
            ctx.font = '700 8px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(beacon.type === 'GARAGE' ? 'GARAGE' : 'CAR LOT', bx, by - 6);
          }
        }

        // Slalom practice pylons
        ctx.fillStyle = '#f97316';
        for (let i = 0; i < FREE_ROAM_PYLONS.length; i++) {
          const p = FREE_ROAM_PYLONS[i];
          ctx.beginPath();
          ctx.arc(toPxX(p.x), toPxY(p.z), 1.5, 0, Math.PI * 2);
          ctx.fill();
        }

        // Driving breadcrumb trail
        const trail = trailRef.current;
        if (trail.length > 1) {
          ctx.beginPath();
          for (let i = 0; i < trail.length; i++) {
            const tx = toPxX(trail[i].x);
            const ty = toPxY(trail[i].z);
            if (i === 0) ctx.moveTo(tx, ty);
            else ctx.lineTo(tx, ty);
          }
          ctx.strokeStyle = 'rgba(255, 153, 0, 0.5)';
          ctx.lineWidth = 1.6;
          ctx.stroke();
        }

        // Active AI Traffic Car Blips
        const tLimit = Math.min(useGameStore.getState().trafficCount, MAX_TRAFFIC_CARS);
        const blipR = zoomMode === 'follow' ? 2.2 : 1.7;
        ctx.fillStyle = '#38bdf8';
        ctx.strokeStyle = '#090c12';
        ctx.lineWidth = 0.8;
        for (let i = 0; i < tLimit; i++) {
          const tv = trafficVehicles[i];
          if (!tv.active) continue;
          const tpx = toPxX(tv.x);
          const tpy = toPxY(tv.z);
          if (tpx < -4 || tpx > MAP_SIZE + 4 || tpy < -4 || tpy > MAP_SIZE + 4) continue;
          ctx.beginPath();
          ctx.arc(tpx, tpy, blipR, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
      }

      // Player car arrow + forward FOV cone
      const carPx = toPxX(x);
      const carPy = toPxY(z);

      ctx.save();
      ctx.translate(carPx, carPy);
      ctx.rotate(headingRad);

      const grad = ctx.createRadialGradient(0, 0, 2, 0, 0, 26);
      grad.addColorStop(0, 'rgba(249, 115, 22, 0.34)');
      grad.addColorStop(1, 'rgba(249, 115, 22, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, 26, -Math.PI / 2 - 0.42, -Math.PI / 2 + 0.42);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(0, -8);
      ctx.lineTo(5.6, 6);
      ctx.lineTo(0, 3.2);
      ctx.lineTo(-5.6, 6);
      ctx.closePath();
      ctx.fillStyle = carColorRef.current || '#f97316';
      ctx.fill();
      ctx.lineWidth = 1.6;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();

      ctx.restore();

      // North label pinned inside top border
      ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
      ctx.font = '700 9px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('N', MAP_SIZE / 2, 11);

      ctx.restore();
    };

    rafId = requestAnimationFrame(renderFrame);
    return () => cancelAnimationFrame(rafId);
  }, [zoomMode, view, activeTrack]);

  return (
    <div className="pointer-events-auto bg-zinc-950/90 border border-white/15 rounded-sm shadow-2xl overflow-hidden w-[198px]">
      <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-white/10 bg-black/50">
        <div className="flex items-center gap-1.5">
          <Compass className="w-3.5 h-3.5 text-orange-500" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-200">
            {view === 'RACE' ? 'Circuit Radar' : 'Free Roam Radar'}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setZoomMode((prev) => (prev === 'follow' ? 'full' : 'follow'))}
          title="Toggle Radar Zoom (M)"
          className="flex items-center gap-1 text-[10px] font-mono font-bold uppercase text-zinc-300 hover:text-orange-400 px-1.5 py-0.5 bg-zinc-900 border border-white/10 rounded-sm transition-colors"
        >
          {zoomMode === 'follow' ? (
            <>
              <Maximize2 className="w-2.5 h-2.5" />
              <span>Follow</span>
            </>
          ) : (
            <>
              <Minimize2 className="w-2.5 h-2.5" />
              <span>Full</span>
            </>
          )}
        </button>
      </div>

      <div className="p-1.5 bg-zinc-950 flex justify-center">
        <canvas
          ref={canvasRef}
          style={{ width: MAP_SIZE, height: MAP_SIZE }}
          className="block rounded-sm border border-white/10"
        />
      </div>

      <div className="flex items-center justify-between px-2.5 py-1.5 border-t border-white/10 bg-black/50 text-[10px] font-mono tabular-nums text-zinc-400">
        <span ref={coordsRef}>0m, 0m</span>
        <span className="text-orange-400 font-bold" ref={headingRef}>
          N
        </span>
      </div>
    </div>
  );
}
